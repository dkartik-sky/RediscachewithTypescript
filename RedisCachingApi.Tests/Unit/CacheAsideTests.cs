using FluentAssertions;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using RedisCachingApi.Data;
using RedisCachingApi.Hubs;
using RedisCachingApi.Models;
using RedisCachingApi.Services;

namespace RedisCachingApi.Tests.Unit;

/// <summary>
/// Test matrix:
/// | Test                              | Covers                                     |
/// |-----------------------------------|--------------------------------------------|
/// | GetById_CacheMiss_LoadsFromDb     | Cache-Aside: miss path → DB → Redis set    |
/// | GetById_CacheHit_SkipsDb          | Cache-Aside: hit path → no DB call         |
/// | GetAll_CacheMiss_PopulatesRedis   | Cache-Aside: list miss → DB → Redis set    |
/// | GetAll_CacheHit_ReturnsFromRedis  | Cache-Aside: list hit → no DB call         |
/// </summary>
public class CacheAsideTests
{
    private readonly Mock<IProductRepository> _repoMock = new();
    private readonly Mock<ICacheService> _cacheMock = new();
    private readonly Mock<IHubContext<ProductHub>> _hubMock = new();
    private readonly IMemoryCache _memCache = new MemoryCache(new MemoryCacheOptions());

    private ProductService CreateSut() => new(
        _repoMock.Object,
        _cacheMock.Object,
        _memCache,
        _hubMock.Object,
        NullLogger<ProductService>.Instance);

    [Fact]
    public async Task GetById_CacheMiss_LoadsFromDbAndPopulatesCache()
    {
        var product = new Product { Id = 1, Name = "Laptop", Price = 999m, Category = "Electronics", StockQuantity = 10 };

        _cacheMock.Setup(c => c.GetAsync<Product>("products:1")).ReturnsAsync((Product?)null);
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(product);
        _cacheMock.Setup(c => c.SetAsync(
            "products:1", product,
            It.IsAny<TimeSpan?>(), It.IsAny<TimeSpan?>()))
            .Returns(Task.CompletedTask);

        var sut = CreateSut();
        var result = await sut.GetByIdCacheAsideAsync(1);

        result.Should().BeEquivalentTo(product);
        _repoMock.Verify(r => r.GetByIdAsync(1), Times.Once);
        _cacheMock.Verify(c => c.SetAsync(
            "products:1", product,
            It.IsAny<TimeSpan?>(), It.IsAny<TimeSpan?>()), Times.Once);
    }

    [Fact]
    public async Task GetById_CacheHit_SkipsDbCall()
    {
        var product = new Product { Id = 1, Name = "Laptop", Price = 999m, Category = "Electronics", StockQuantity = 10 };

        // Warm the L1 memory cache directly so the service short-circuits
        _memCache.Set("products:1", product, TimeSpan.FromSeconds(30));

        var sut = CreateSut();
        var result = await sut.GetByIdCacheAsideAsync(1);

        result.Should().BeEquivalentTo(product);
        _repoMock.Verify(r => r.GetByIdAsync(It.IsAny<int>()), Times.Never);
        _cacheMock.Verify(c => c.GetAsync<Product>(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task GetAll_CacheMiss_PopulatesRedis()
    {
        var products = new List<Product>
        {
            new() { Id = 1, Name = "A", Price = 1m, Category = "X", StockQuantity = 1 },
            new() { Id = 2, Name = "B", Price = 2m, Category = "Y", StockQuantity = 2 }
        };

        _cacheMock.Setup(c => c.GetAsync<List<Product>>("products:all")).ReturnsAsync((List<Product>?)null);
        _repoMock.Setup(r => r.GetAllAsync()).ReturnsAsync(products);

        var sut = CreateSut();
        var result = await sut.GetAllCacheAsideAsync();

        result.Should().BeEquivalentTo(products);
        _cacheMock.Verify(c => c.SetAsync(
            "products:all", It.IsAny<List<Product>>(),
            It.IsAny<TimeSpan?>(), It.IsAny<TimeSpan?>()), Times.Once);
    }

    [Fact]
    public async Task GetAll_CacheHit_ReturnsFromRedisWithoutDbCall()
    {
        var products = new List<Product>
        {
            new() { Id = 1, Name = "A", Price = 1m, Category = "X", StockQuantity = 1 }
        };

        _cacheMock.Setup(c => c.GetAsync<List<Product>>("products:all")).ReturnsAsync(products);

        var sut = CreateSut();
        var result = await sut.GetAllCacheAsideAsync();

        result.Should().BeEquivalentTo(products);
        _repoMock.Verify(r => r.GetAllAsync(), Times.Never);
    }
}
