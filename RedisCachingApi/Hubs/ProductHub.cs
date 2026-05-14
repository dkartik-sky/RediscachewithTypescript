using Microsoft.AspNetCore.SignalR;

namespace RedisCachingApi.Hubs;

/// <summary>
/// SignalR hub that pushes real-time product change events to all connected React clients.
/// Events: ProductCreated, ProductUpdated, ProductDeleted.
/// </summary>
public class ProductHub : Hub
{
    private readonly ILogger<ProductHub> _logger;

    public ProductHub(ILogger<ProductHub> logger) => _logger = logger;

    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation("Client connected: {ConnectionId}", Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("Client disconnected: {ConnectionId}", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }
}
