namespace RedisCachingApi.Services;

/// <summary>
/// Abstraction over IDistributedCache with typed get/set helpers.
/// </summary>
public interface ICacheService
{
    Task<T?> GetAsync<T>(string key);
    Task SetAsync<T>(string key, T value, TimeSpan? absoluteExpiration = null, TimeSpan? slidingExpiration = null);
    Task RemoveAsync(string key);
    Task<bool> ExistsAsync(string key);
}
