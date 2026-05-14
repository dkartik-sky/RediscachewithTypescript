using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;

namespace RedisCachingApi.Services;

public class RedisCacheService : ICacheService
{
    private readonly IDistributedCache _cache;
    private readonly ILogger<RedisCacheService> _logger;

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public RedisCacheService(IDistributedCache cache, ILogger<RedisCacheService> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    public async Task<T?> GetAsync<T>(string key)
    {
        var data = await _cache.GetStringAsync(key);
        if (data is null)
        {
            _logger.LogDebug("Cache MISS for key: {Key}", key);
            return default;
        }

        _logger.LogDebug("Cache HIT for key: {Key}", key);
        return JsonSerializer.Deserialize<T>(data, _jsonOptions);
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? absoluteExpiration = null, TimeSpan? slidingExpiration = null)
    {
        var options = new DistributedCacheEntryOptions();

        // Default: 10-minute absolute expiration
        options.AbsoluteExpirationRelativeToNow = absoluteExpiration ?? TimeSpan.FromMinutes(10);

        // Sliding expiration resets TTL on each access (2 min default if specified)
        if (slidingExpiration.HasValue)
            options.SlidingExpiration = slidingExpiration.Value;

        var json = JsonSerializer.Serialize(value, _jsonOptions);
        await _cache.SetStringAsync(key, json, options);
        _logger.LogDebug("Cache SET for key: {Key}", key);
    }

    public async Task RemoveAsync(string key)
    {
        await _cache.RemoveAsync(key);
        _logger.LogDebug("Cache REMOVE for key: {Key}", key);
    }

    public async Task<bool> ExistsAsync(string key)
    {
        var data = await _cache.GetStringAsync(key);
        return data is not null;
    }
}
