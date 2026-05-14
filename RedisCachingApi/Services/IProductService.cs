using RedisCachingApi.DTOs;
using RedisCachingApi.Models;

namespace RedisCachingApi.Services;

public interface IProductService
{
    // Cache-Aside: caller controls cache check → miss → load → populate
    Task<IEnumerable<Product>> GetAllCacheAsideAsync();
    Task<Product?> GetByIdCacheAsideAsync(int id);

    // Write-Through: writes to DB and cache synchronously
    Task<Product> CreateWriteThroughAsync(CreateProductDto dto);
    Task<Product?> UpdateWriteThroughAsync(int id, UpdateProductDto dto);

    // Write-Behind: writes to cache immediately, DB update queued async
    Task<Product> CreateWriteBehindAsync(CreateProductDto dto);

    // Delete with cache invalidation
    Task<bool> DeleteAsync(int id);
}
