using FluentAssertions;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using RedisCachingApi.Data;
using RedisCachingApi.DTOs;
using RedisCachingApi.Hubs;
using RedisCachingApi.Models;
using RedisCachingApi.Services;

namespace RedisCachingApi.Tests.Unit;

/// <summary>
/// Test matrix:
/// | Test                                        | Covers                                      |
/// |---------------------------------------------|---------------------------------------------|
/// | Create_WritesDbAndCache                     | Write-Through: both DB and cache updated    |
/// | Create_InvalidatesAllProductsCache          | Write-Through: list cache is evicted        |
/// | Update_UpdatesCacheAndEvictsMemCache        | Write-Through update: cache layers updated  |
/// | Delete_RemovesFromAllCacheLayers            | Cache Invalidation on delete                |
/// | Update_NotFound_ReturnNull                  | Write-Through: missing resource handled     |
/// </summary>
public class WriteThroughTests
{
    private readonly Mock<IProductRepository> _repoMock = new();
    private readonly Mock<ICacheService> _cacheMock = new();
    private readonly Mock<IHubContext<ProductHub>> _hubMock = new();
    private readonly IMemoryCache _memCache = new MemoryCache(new MemoryCacheOptions());

    public WriteThroughTests()
    {
        // Default hub setup – clients broadcast succeeds
        var clientsMock = new Mock<IHubClients>();
        var clientProxyMock = new Mock<IClientProxy>();
        clientsMock.Setup(c => c.All).Returns(clientProxyMock.Object);
        _hubMock.Setup(h => h.Clients).Returns(clientsMock.Object);
    }

    private ProductService CreateSut() => new(
        _repoMock.Object,
        _cacheMock.Object,
        _memCache,
        _hubMock.Object,
        NullLogger<ProductService>.Instance);

    [Fact]
    public async Task Create_WritesDbAndCache()
    {
        var dto = new CreateProductDto("Widget", 9.99m, "Misc", 100);
        var created = new Product { Id = 10, Name = "Widget", Price = 9.99m, Category = "Misc", StockQuantity = 100 };

        _repoMock.Setup(r => r.CreateAsync(It.IsAny<Product>())).ReturnsAsync(created);

        var sut = CreateSut();
        var result = await sut.CreateWriteThroughAsync(dto);

        result.Should().BeEquivalentTo(created);
        // Verify Redis was updated with the new product (Write-Through)
        _cacheMock.Verify(c => c.SetAsync(
            "products:10", created,
            It.IsAny<TimeSpan?>(), It.IsAny<TimeSpan?>()), Times.Once);
    }

    [Fact]
    public async Task Create_InvalidatesAllProductsListCache()
    {
        var dto = new CreateProductDto("Widget", 9.99m, "Misc", 100);
        var created = new Product { Id = 11, Name = "Widget", Price = 9.99m, Category = "Misc", StockQuantity = 100 };
        _repoMock.Setup(r => r.CreateAsync(It.IsAny<Product>())).ReturnsAsync(created);

        var sut = CreateSut();
        await sut.CreateWriteThroughAsync(dto);

        // The list cache must be evicted so next GET /products hits DB
        _cacheMock.Verify(c => c.RemoveAsync("products:all"), Times.Once);
    }

    [Fact]
    public async Task Update_UpdatesCacheAndEvictsMemoryCache()
    {
        var dto = new UpdateProductDto("Widget v2", 19.99m, "Misc", 50);
        var updated = new Product { Id = 5, Name = "Widget v2", Price = 19.99m, Category = "Misc", StockQuantity = 50 };

        // Seed L1 so we can verify eviction
        _memCache.Set("products:5", new Product { Id = 5, Name = "Widget", Price = 9.99m, Category = "Misc", StockQuantity = 100 },
            TimeSpan.FromMinutes(1));

        _repoMock.Setup(r => r.UpdateAsync(5, It.IsAny<Product>())).ReturnsAsync(updated);

        var sut = CreateSut();
        var result = await sut.UpdateWriteThroughAsync(5, dto);

        result.Should().BeEquivalentTo(updated);
        _cacheMock.Verify(c => c.SetAsync("products:5", updated, It.IsAny<TimeSpan?>(), It.IsAny<TimeSpan?>()), Times.Once);
        _memCache.TryGetValue("products:5", out _).Should().BeFalse("L1 cache must be evicted on write-through update");
    }

    [Fact]
    public async Task Delete_RemovesFromAllCacheLayers()
    {
        _repoMock.Setup(r => r.DeleteAsync(3)).ReturnsAsync(true);
        _memCache.Set("products:3", new Product { Id = 3 }, TimeSpan.FromMinutes(1));

        var sut = CreateSut();
        var result = await sut.DeleteAsync(3);

        result.Should().BeTrue();
        _cacheMock.Verify(c => c.RemoveAsync("products:3"), Times.Once);
        _cacheMock.Verify(c => c.RemoveAsync("products:all"), Times.Once);
        _memCache.TryGetValue("products:3", out _).Should().BeFalse();
    }

    [Fact]
    public async Task Update_NotFound_ReturnsNull()
    {
        _repoMock.Setup(r => r.UpdateAsync(99, It.IsAny<Product>())).ReturnsAsync((Product?)null);

        var sut = CreateSut();
        var result = await sut.UpdateWriteThroughAsync(99, new UpdateProductDto("X", 1m, "Y", 1));

        result.Should().BeNull();
        _cacheMock.Verify(c => c.SetAsync(It.IsAny<string>(), It.IsAny<Product>(),
            It.IsAny<TimeSpan?>(), It.IsAny<TimeSpan?>()), Times.Never);
    }
}
