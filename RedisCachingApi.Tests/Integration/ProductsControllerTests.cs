using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using RedisCachingApi.DTOs;
using RedisCachingApi.Models;

namespace RedisCachingApi.Tests.Integration;

/// <summary>
/// Integration tests that spin up the full ASP.NET pipeline with:
/// - InMemory distributed cache (substitutes Redis so no Docker needed)
/// - InMemory product repository (already the default)
///
/// Test matrix:
/// | Test                              | Covers                              |
/// |-----------------------------------|-------------------------------------|
/// | GetAll_Returns200WithProducts     | GET /api/products happy path        |
/// | GetById_Returns200                | GET /api/products/{id} found        |
/// | GetById_Returns404                | GET /api/products/{id} not found    |
/// | Create_Returns201AndLocation      | POST /api/products                  |
/// | Update_Returns200                 | PUT /api/products/{id}              |
/// | Delete_Returns204                 | DELETE /api/products/{id}           |
/// | SwaggerEndpoint_IsAvailable       | Swagger JSON is served              |
/// </summary>
public class ProductsControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public ProductsControllerTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.WithWebHostBuilder(builder =>
        {
            // Force Development so UseSwagger() and UseSwaggerUI() are registered
            builder.UseEnvironment("Development");

            builder.ConfigureServices(services =>
            {
                // AddDistributedMemoryCache uses TryAdd internally — it is a no-op
                // if IDistributedCache is already registered (which Redis does with
                // a plain Add, not TryAdd). Remove Redis first so the in-memory
                // implementation actually takes effect and nothing tries to connect
                // to a Redis server that doesn't exist in CI.
                services.RemoveAll<IDistributedCache>();
                services.AddDistributedMemoryCache();
            });
        }).CreateClient();
    }

    [Fact]
    public async Task GetAll_Returns200WithSeedProducts()
    {
        var response = await _client.GetAsync("/api/products");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var products = await response.Content.ReadFromJsonAsync<List<JsonElement>>();
        products.Should().NotBeNull().And.HaveCountGreaterThan(0);
    }

    [Fact]
    public async Task GetById_KnownId_Returns200()
    {
        var response = await _client.GetAsync("/api/products/1");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("\"id\"");
    }

    [Fact]
    public async Task GetById_UnknownId_Returns404()
    {
        var response = await _client.GetAsync("/api/products/99999");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Create_ValidProduct_Returns201WithLocation()
    {
        var dto = new CreateProductDto("Test Widget", 49.99m, "Gadgets", 10);

        var response = await _client.PostAsJsonAsync("/api/products", dto);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        response.Headers.Location.Should().NotBeNull();

        var product = await response.Content.ReadFromJsonAsync<JsonElement>();
        product.GetProperty("name").GetString().Should().Be("Test Widget");
        product.GetProperty("price").GetDecimal().Should().Be(49.99m);
    }

    [Fact]
    public async Task Create_MissingName_Returns400()
    {
        var dto = new CreateProductDto("", 10m, "X", 1);

        var response = await _client.PostAsJsonAsync("/api/products", dto);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Update_ExistingProduct_Returns200()
    {
        var dto = new UpdateProductDto("Updated Name", 999m, "Electronics", 5);

        var response = await _client.PutAsJsonAsync("/api/products/1", dto);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var product = await response.Content.ReadFromJsonAsync<JsonElement>();
        product.GetProperty("name").GetString().Should().Be("Updated Name");
    }

    [Fact]
    public async Task Update_NonExistentProduct_Returns404()
    {
        var dto = new UpdateProductDto("X", 1m, "Y", 1);

        var response = await _client.PutAsJsonAsync("/api/products/99999", dto);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Delete_ExistingProduct_Returns204()
    {
        // Create first so we have a known ID to delete
        var created = await _client.PostAsJsonAsync("/api/products",
            new CreateProductDto("ToDelete", 1m, "Temp", 1));
        var product = await created.Content.ReadFromJsonAsync<JsonElement>();
        int id = product.GetProperty("id").GetInt32();

        var response = await _client.DeleteAsync($"/api/products/{id}");

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task SwaggerEndpoint_IsAvailable()
    {
        var response = await _client.GetAsync("/swagger/v1/swagger.json");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await response.Content.ReadAsStringAsync();
        json.Should().Contain("Redis Caching Demo API");
    }
}
