using System.Reflection;
using RedisCachingApi.Data;
using RedisCachingApi.Hubs;
using RedisCachingApi.Services;

var builder = WebApplication.CreateBuilder(args);

// ── Controllers + Swagger ──────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new()
    {
        Title = "Redis Caching Demo API",
        Version = "v1",
        Description = """
            Demonstrates Redis caching strategies with a .NET Core 10 Web API:
            - Cache-Aside (Lazy Loading)
            - Read-Through
            - Write-Through
            - Write-Behind (Write-Back)
            - Hybrid Multi-Layer (L1 MemoryCache + L2 Redis)

            Real-time updates are pushed to the React SPA via SignalR at /hubs/products.
            """
    });

    // Include XML comments for Swagger documentation
    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
        c.IncludeXmlComments(xmlPath);
});

// ── Redis distributed cache ────────────────────────────────────────────────
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379";
    options.InstanceName = "RedisCachingDemo_";
});

// ── L1 in-process memory cache (Hybrid strategy) ──────────────────────────
builder.Services.AddMemoryCache();

// ── SignalR (WebSockets) ───────────────────────────────────────────────────
builder.Services.AddSignalR();

// ── Application services ───────────────────────────────────────────────────
builder.Services.AddSingleton<IProductRepository, InMemoryProductRepository>();
builder.Services.AddScoped<ICacheService, RedisCacheService>();
builder.Services.AddScoped<IProductService, ProductService>();

// ── CORS: allow React SPA ─────────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactSpa", policy =>
        policy.WithOrigins(
                builder.Configuration["AllowedOrigins"] ?? "http://localhost:5174"
              )
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials()); // required for SignalR
});

// ── Kestrel: use port 5168 to avoid conflicts ──────────────────────────────
builder.WebHost.UseUrls("http://localhost:5168", "https://localhost:7168");

var app = builder.Build();

// ── Middleware pipeline ────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Redis Caching Demo API v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseCors("ReactSpa");
// HTTPS redirect comes after CORS so preflight OPTIONS requests are not redirected before headers are applied
if (!app.Environment.IsDevelopment())
    app.UseHttpsRedirection();
app.UseAuthorization();

app.MapControllers();
app.MapHub<ProductHub>("/hubs/products");

app.Run();

// Expose Program for integration tests
public partial class Program { }
