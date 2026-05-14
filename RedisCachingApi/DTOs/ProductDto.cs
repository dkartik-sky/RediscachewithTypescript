namespace RedisCachingApi.DTOs;

public record CreateProductDto(
    string Name,
    decimal Price,
    string Category,
    int StockQuantity
);

public record UpdateProductDto(
    string Name,
    decimal Price,
    string Category,
    int StockQuantity
);
