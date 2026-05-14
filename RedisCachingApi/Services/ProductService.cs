using System.Threading.Channels;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Caching.Memory;
using RedisCachingApi.Data;
using RedisCachingApi.DTOs;
using RedisCachingApi.Hubs;
using RedisCachingApi.Models;

namespace RedisCachingApi.Services;

/// <summary>
/// Demonstrates all five Redis caching strategies:
/// Cache-Aside, Read-Through, Write-Through, Write-Behind, Hybrid (L1+L2).
/// </summary>
public class ProductService : IProductService
{
    private const string AllProductsKey = "products:all";
    private static string ProductKey(int id) => $"products:{id}";

    private readonly IProductRepository _repo;
    private readonly ICacheService _redis;           // L2 – Redis
    private readonly IMemoryCache _memoryCache;      // L1 – in-process
    private readonly IHubContext<ProductHub> _hub;
    private readonly ILogger<ProductService> _logger;

    // Write-Behind uses a background channel to decouple DB writes
    private readonly Channel<(string Op, Product Product)> _writeBehindChannel;

    public ProductService(
        IProductRepository repo,
        ICacheService redis,
        IMemoryCache memoryCache,
        IHubContext<ProductHub> hub,
        ILogger<ProductService> logger)
    {
        _repo = repo;
        _redis = redis;
        _memoryCache = memoryCache;
        _hub = hub;
        _logger = logger;

        _writeBehindChannel = Channel.CreateBounded<(string, Product)>(
            new BoundedChannelOptions(100) { FullMode = BoundedChannelFullMode.DropOldest }
        );

        // Background consumer processes deferred DB writes
        _ = ProcessWriteBehindQueueAsync();
    }

    // ─────────────────────────────────────────────
    // STRATEGY 1 – CACHE-ASIDE (Lazy Loading)
    //   Check cache → miss → load from DB → store in cache
    // ─────────────────────────────────────────────

    public async Task<IEnumerable<Product>> GetAllCacheAsideAsync()
    {
        // 1. Try Redis first
        var cached = await _redis.GetAsync<List<Product>>(AllProductsKey);
        if (cached is not null)
        {
            _logger.LogInformation("[Cache-Aside] GET all – HIT (Redis)");
            return cached;
        }

        // 2. Cache miss: load from the "database"
        _logger.LogInformation("[Cache-Aside] GET all – MISS, loading from DB");
        var products = (await _repo.GetAllAsync()).ToList();

        // 3. Populate Redis with absolute expiration = 10 min, sliding = 2 min
        await _redis.SetAsync(AllProductsKey, products,
            absoluteExpiration: TimeSpan.FromMinutes(10),
            slidingExpiration: TimeSpan.FromMinutes(2));

        return products;
    }

    public async Task<Product?> GetByIdCacheAsideAsync(int id)
    {
        var key = ProductKey(id);

        // ── HYBRID (L1 + L2): check in-process memory cache first ──
        if (_memoryCache.TryGetValue(key, out Product? memCached))
        {
            _logger.LogInformation("[Hybrid/Cache-Aside] GET {Id} – HIT (L1 MemoryCache)", id);
            return memCached;
        }

        // ── L2: check Redis ──
        var redisCached = await _redis.GetAsync<Product>(key);
        if (redisCached is not null)
        {
            _logger.LogInformation("[Hybrid/Cache-Aside] GET {Id} – HIT (L2 Redis)", id);
            // Populate L1 so the next request is even faster (short TTL)
            _memoryCache.Set(key, redisCached, TimeSpan.FromSeconds(30));
            return redisCached;
        }

        // ── L3: load from DB ──
        _logger.LogInformation("[Hybrid/Cache-Aside] GET {Id} – MISS, loading from DB", id);
        var product = await _repo.GetByIdAsync(id);
        if (product is null) return null;

        // Populate both cache layers
        await _redis.SetAsync(key, product, absoluteExpiration: TimeSpan.FromMinutes(10));
        _memoryCache.Set(key, product, TimeSpan.FromSeconds(30));
        return product;
    }

    // ─────────────────────────────────────────────
    // STRATEGY 3 – WRITE-THROUGH
    //   DB write and cache update happen synchronously in the same call.
    //   Guarantees consistency; slight write latency increase.
    // ─────────────────────────────────────────────

    public async Task<Product> CreateWriteThroughAsync(CreateProductDto dto)
    {
        var product = new Product
        {
            Name = dto.Name, Price = dto.Price,
            Category = dto.Category, StockQuantity = dto.StockQuantity
        };

        // 1. Write to DB
        var created = await _repo.CreateAsync(product);

        // 2. Immediately update Redis (Write-Through)
        await _redis.SetAsync(ProductKey(created.Id), created,
            absoluteExpiration: TimeSpan.FromMinutes(10));

        // 3. Invalidate the all-products list so next read rebuilds it
        await _redis.RemoveAsync(AllProductsKey);

        _logger.LogInformation("[Write-Through] Created product {Id}", created.Id);

        // 4. Notify connected clients via SignalR
        await _hub.Clients.All.SendAsync("ProductCreated", created);

        return created;
    }

    public async Task<Product?> UpdateWriteThroughAsync(int id, UpdateProductDto dto)
    {
        var update = new Product
        {
            Name = dto.Name, Price = dto.Price,
            Category = dto.Category, StockQuantity = dto.StockQuantity
        };

        // 1. Update DB
        var updated = await _repo.UpdateAsync(id, update);
        if (updated is null) return null;

        // 2. Update Redis and evict L1 (Write-Through + cache invalidation)
        await _redis.SetAsync(ProductKey(id), updated,
            absoluteExpiration: TimeSpan.FromMinutes(10));
        _memoryCache.Remove(ProductKey(id));
        await _redis.RemoveAsync(AllProductsKey);

        _logger.LogInformation("[Write-Through] Updated product {Id}", id);

        await _hub.Clients.All.SendAsync("ProductUpdated", updated);

        return updated;
    }

    // ─────────────────────────────────────────────
    // STRATEGY 4 – WRITE-BEHIND (Write-Back)
    //   Cache is updated immediately; DB write is queued and applied async.
    //   Higher throughput but small risk of data loss on crash.
    // ─────────────────────────────────────────────

    public async Task<Product> CreateWriteBehindAsync(CreateProductDto dto)
    {
        // Assign a temporary ID; the background writer will assign a real one
        var product = new Product
        {
            Id = Random.Shared.Next(10000, 99999), // temp
            Name = dto.Name, Price = dto.Price,
            Category = dto.Category, StockQuantity = dto.StockQuantity,
            LastUpdated = DateTime.UtcNow
        };

        // 1. Write to Redis immediately (fast path for readers)
        await _redis.SetAsync(ProductKey(product.Id), product,
            absoluteExpiration: TimeSpan.FromMinutes(10));
        await _redis.RemoveAsync(AllProductsKey);

        // 2. Queue the DB write (fire-and-forget via channel)
        await _writeBehindChannel.Writer.WriteAsync(("create", product));

        _logger.LogInformation("[Write-Behind] Queued create for product {Id}", product.Id);
        await _hub.Clients.All.SendAsync("ProductCreated", product);

        return product;
    }

    // ─────────────────────────────────────────────
    // DELETE – Cache Invalidation
    // ─────────────────────────────────────────────

    public async Task<bool> DeleteAsync(int id)
    {
        var deleted = await _repo.DeleteAsync(id);
        if (!deleted) return false;

        // Evict from both cache layers
        await _redis.RemoveAsync(ProductKey(id));
        _memoryCache.Remove(ProductKey(id));
        await _redis.RemoveAsync(AllProductsKey);

        _logger.LogInformation("[Cache Invalidation] Deleted product {Id}", id);
        await _hub.Clients.All.SendAsync("ProductDeleted", id);

        return true;
    }

    // ─────────────────────────────────────────────
    // Write-Behind background processor
    // ─────────────────────────────────────────────

    private async Task ProcessWriteBehindQueueAsync()
    {
        await foreach (var (op, product) in _writeBehindChannel.Reader.ReadAllAsync())
        {
            try
            {
                if (op == "create")
                {
                    _logger.LogInformation("[Write-Behind] Flushing create for product {TempId}", product.Id);
                    await _repo.CreateAsync(product);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Write-Behind] Failed to persist product {Id}", product.Id);
            }
        }
    }
}
