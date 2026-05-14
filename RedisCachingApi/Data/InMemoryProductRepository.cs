using RedisCachingApi.Models;

namespace RedisCachingApi.Data;

/// <summary>
/// Simulates a database using an in-memory store.
/// In production this would be EF Core / SQL Server / etc.
/// </summary>
public class InMemoryProductRepository : IProductRepository
{
    private readonly List<Product> _products = new()
    {
        new() { Id = 1, Name = "Laptop Pro",       Price = 1299.99m, Category = "Electronics", StockQuantity = 50,  LastUpdated = DateTime.UtcNow },
        new() { Id = 2, Name = "Wireless Mouse",   Price = 29.99m,  Category = "Electronics", StockQuantity = 200, LastUpdated = DateTime.UtcNow },
        new() { Id = 3, Name = "Desk Chair",       Price = 299.99m, Category = "Furniture",   StockQuantity = 30,  LastUpdated = DateTime.UtcNow },
        new() { Id = 4, Name = "Coffee Maker",     Price = 79.99m,  Category = "Appliances",  StockQuantity = 75,  LastUpdated = DateTime.UtcNow },
        new() { Id = 5, Name = "Standing Desk",    Price = 499.99m, Category = "Furniture",   StockQuantity = 20,  LastUpdated = DateTime.UtcNow },
    };
    private int _nextId = 6;
    private readonly SemaphoreSlim _lock = new(1, 1);

    public async Task<IEnumerable<Product>> GetAllAsync()
    {
        await Task.Delay(10); // simulate DB latency
        return _products.ToList();
    }

    public async Task<Product?> GetByIdAsync(int id)
    {
        await Task.Delay(5);
        return _products.FirstOrDefault(p => p.Id == id);
    }

    public async Task<Product> CreateAsync(Product product)
    {
        await _lock.WaitAsync();
        try
        {
            product.Id = _nextId++;
            product.LastUpdated = DateTime.UtcNow;
            _products.Add(product);
            return product;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<Product?> UpdateAsync(int id, Product product)
    {
        await _lock.WaitAsync();
        try
        {
            var existing = _products.FirstOrDefault(p => p.Id == id);
            if (existing is null) return null;

            existing.Name = product.Name;
            existing.Price = product.Price;
            existing.Category = product.Category;
            existing.StockQuantity = product.StockQuantity;
            existing.LastUpdated = DateTime.UtcNow;
            return existing;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<bool> DeleteAsync(int id)
    {
        await _lock.WaitAsync();
        try
        {
            var product = _products.FirstOrDefault(p => p.Id == id);
            if (product is null) return false;
            _products.Remove(product);
            return true;
        }
        finally
        {
            _lock.Release();
        }
    }
}
