using Microsoft.AspNetCore.Mvc;
using RedisCachingApi.DTOs;
using RedisCachingApi.Models;
using RedisCachingApi.Services;

namespace RedisCachingApi.Controllers;

/// <summary>
/// CRUD API for Products demonstrating Redis caching strategies.
/// Each endpoint documents which caching strategy it exercises.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class ProductsController : ControllerBase
{
    private readonly IProductService _service;
    private readonly ILogger<ProductsController> _logger;

    public ProductsController(IProductService service, ILogger<ProductsController> logger)
    {
        _service = service;
        _logger = logger;
    }

    /// <summary>
    /// Get all products using Cache-Aside strategy.
    /// First call hits DB and populates Redis. Subsequent calls return cached data.
    /// Cache expires after 10 min (absolute) or 2 min of inactivity (sliding).
    /// </summary>
    /// <returns>List of all products</returns>
    /// <response code="200">Returns the list of products</response>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<Product>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<Product>>> GetAll()
    {
        var products = await _service.GetAllCacheAsideAsync();
        return Ok(products);
    }

    /// <summary>
    /// Get a single product by ID using Hybrid Caching (L1 MemoryCache → L2 Redis → DB).
    /// </summary>
    /// <param name="id">Product ID</param>
    /// <returns>The requested product</returns>
    /// <response code="200">Product found</response>
    /// <response code="404">Product not found</response>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(Product), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<Product>> GetById(int id)
    {
        var product = await _service.GetByIdCacheAsideAsync(id);
        return product is null ? NotFound() : Ok(product);
    }

    /// <summary>
    /// Create a new product using Write-Through strategy.
    /// Writes to DB and Redis synchronously, then broadcasts via SignalR.
    /// </summary>
    /// <param name="dto">Product creation data</param>
    /// <returns>Created product with assigned ID</returns>
    /// <response code="201">Product created successfully</response>
    /// <response code="400">Invalid request data</response>
    [HttpPost]
    [ProducesResponseType(typeof(Product), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<Product>> Create([FromBody] CreateProductDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name) || dto.Price <= 0)
            return BadRequest("Name and a positive Price are required.");

        var product = await _service.CreateWriteThroughAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = product.Id }, product);
    }

    /// <summary>
    /// Create a product using Write-Behind strategy.
    /// Updates Redis immediately; DB write is queued and processed asynchronously.
    /// </summary>
    /// <param name="dto">Product creation data</param>
    /// <returns>Cached product (DB write pending)</returns>
    /// <response code="202">Product accepted and cached; DB write queued</response>
    [HttpPost("write-behind")]
    [ProducesResponseType(typeof(Product), StatusCodes.Status202Accepted)]
    public async Task<ActionResult<Product>> CreateWriteBehind([FromBody] CreateProductDto dto)
    {
        var product = await _service.CreateWriteBehindAsync(dto);
        return Accepted(product);
    }

    /// <summary>
    /// Update a product using Write-Through strategy.
    /// Updates DB and Redis cache in a single synchronous operation.
    /// </summary>
    /// <param name="id">Product ID to update</param>
    /// <param name="dto">Updated product data</param>
    /// <response code="200">Product updated</response>
    /// <response code="404">Product not found</response>
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(Product), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<Product>> Update(int id, [FromBody] UpdateProductDto dto)
    {
        var product = await _service.UpdateWriteThroughAsync(id, dto);
        return product is null ? NotFound() : Ok(product);
    }

    /// <summary>
    /// Delete a product and remove it from all cache layers (Redis + MemoryCache).
    /// </summary>
    /// <param name="id">Product ID to delete</param>
    /// <response code="204">Product deleted</response>
    /// <response code="404">Product not found</response>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _service.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }
}
