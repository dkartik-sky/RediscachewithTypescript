# Redis Caching Demo — React SPA + .NET Core 10 Web API

A complete, test-ready reference application demonstrating five Redis caching strategies end-to-end with a React SPA frontend, SignalR real-time updates, and Swagger documentation.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  React SPA  (http://localhost:5174)                              │
│  ┌────────────────┐    ┌────────────────────────────────────┐   │
│  │  Static Section│    │   Dynamic Dashboard                │   │
│  │  (CachingInfo) │    │   ProductsContext (useReducer)     │   │
│  │  Lazy loaded   │    │   ← WebSocket / SignalR updates    │   │
│  └────────────────┘    └────────────────────────────────────┘   │
└──────────────────────┬────────────────────┬────────────────────┘
                       │ HTTP / REST         │ WebSocket (SignalR)
┌──────────────────────▼────────────────────▼────────────────────┐
│  .NET Core 10 Web API  (http://localhost:5168)                  │
│  ProductsController → ProductService → ICacheService            │
│              ↓ (cache miss)              ↓ (all writes)         │
│         InMemoryProductRepository    RedisCacheService          │
└──────────────────────────────────────────┬──────────────────────┘
                                           │ StackExchange.Redis
                                     ┌─────▼──────┐
                                     │   Redis     │
                                     │ localhost:  │
                                     │   6379      │
                                     └────────────┘
```

---

## Prerequisites

| Tool          | Version  |
|---------------|----------|
| .NET SDK      | 10.x     |
| Node.js       | 20+      |
| Docker        | any      |
| npm           | 9+       |

---

## Quick Start

### 1 — Start Redis (Docker)

```bash
docker run -d --name redis-demo -p 6379:6379 redis:7-alpine
```

Verify it is running:
```bash
docker exec -it redis-demo redis-cli ping
# PONG
```

### 2 — Start the .NET API

```bash
cd RedisCachingApi
dotnet run
```

- API: http://localhost:5168
- Swagger UI: http://localhost:5168/swagger
- SignalR Hub: http://localhost:5168/hubs/products

### 3 — Start the React SPA

```bash
cd redis-caching-spa
npm install
npm run dev
```

- SPA: http://localhost:5174

---

## Caching Strategies — How They Work

### 1. Cache-Aside (Lazy Loading)
`GET /api/products` and `GET /api/products/{id}`

The application checks Redis first. On a miss it queries the repository (simulated DB) and stores the result in Redis with:
- **Absolute expiration**: 10 minutes (hard cap)
- **Sliding expiration**: 2 minutes (resets on each access)

```
Request → Redis (HIT → return) | (MISS → DB → Redis → return)
```

### 2. Hybrid Multi-Layer (L1 + L2)
`GET /api/products/{id}`

Two-tier caching stacked on top of Cache-Aside:
- **L1** — `IMemoryCache` (in-process, 30 s TTL, sub-millisecond)
- **L2** — Redis (shared across instances, 10 min TTL)
- **L3** — Repository (DB fallback)

### 3. Write-Through
`POST /api/products` and `PUT /api/products/{id}`

Every write updates the DB **and** Redis synchronously in a single operation. Guarantees the cache is always consistent. The all-products list key is evicted so the next `GET /api/products` rebuilds from DB.

### 4. Write-Behind (Write-Back)
`POST /api/products/write-behind`

The cache is updated immediately and the response returned. A background `Channel<T>` consumer flushes the write to the DB asynchronously. Maximises write throughput at the cost of eventual consistency.

### 5. Cache Invalidation on Delete
`DELETE /api/products/{id}`

Both L1 (MemoryCache) and L2 (Redis) entries are evicted atomically. The all-products list key is also removed.

---

## Swagger — Sample Requests

Open **http://localhost:5168/swagger** and try:

**Create a product (Write-Through)**
```json
POST /api/products
{
  "name": "Mechanical Keyboard",
  "price": 149.99,
  "category": "Electronics",
  "stockQuantity": 25
}
```

**Update a product**
```json
PUT /api/products/1
{
  "name": "Laptop Pro Max",
  "price": 1499.99,
  "category": "Electronics",
  "stockQuantity": 40
}
```

**Watch the SPA dashboard auto-update** via SignalR whenever you create/update/delete through Swagger.

---

## React Features Used

| # | Feature | Where |
|---|---------|-------|
| 1 | JSX | All components |
| 2 | Functional Components | All UI components |
| 3 | useState / useEffect | ProductForm, ProductList, Dashboard |
| 4 | useContext | useProductsContext hook |
| 5 | useReducer | ProductsContext reducer |
| 6 | useMemo | ProductList (filtered list), CachingInfo (strategies array) |
| 7 | useCallback | useProducts, ProductCard, Dashboard |
| 8 | Custom Hooks | useProducts, useProductHub, useNotification |
| 9 | Context API | ProductsProvider — global in-memory product store |
| 10 | Suspense | App.tsx wrapping lazy CachingInfo |
| 11 | Code Splitting / React.lazy | CachingInfo loaded asynchronously |
| 12 | Error Boundaries | ErrorBoundary wraps Dashboard |
| 13 | Portals | Modal, NotificationContainer |
| 14 | StrictMode | main.tsx |
| 15 | DevTools-friendly structure | Descriptive names, clear component hierarchy |

---

## Running Tests

### Backend (.NET)

```bash
cd RedisCachingApi.Tests
dotnet test
```

**Test matrix:**

| Test Class | Tests | Covers |
|---|---|---|
| `CacheAsideTests` | 4 | Cache hit/miss, list caching |
| `WriteThroughTests` | 5 | Write-through, update, delete, invalidation |
| `ProductsControllerTests` | 9 | CRUD endpoints, validation, Swagger |

Integration tests use `WebApplicationFactory` with `AddDistributedMemoryCache()` — no Redis or Docker required.

### Frontend (React)

```bash
cd redis-caching-spa
npm test          # single run
npm run test:watch  # interactive watch mode
```

**Test matrix:**

| Test File | Tests | Covers |
|---|---|---|
| `ProductsContext.test.tsx` | 7 | Reducer branches, WebSocket dispatch |
| `ProductList.test.tsx` | 6 | Rendering, search/filter (useMemo) |
| `ProductForm.test.tsx` | 6 | Form state, validation, submission |

---

## Project Structure

```
REdisCachewithReact/
├── RedisCachingApi/
│   ├── Controllers/ProductsController.cs  ← CRUD + Swagger annotations
│   ├── Hubs/ProductHub.cs                 ← SignalR hub
│   ├── Services/
│   │   ├── ICacheService.cs / RedisCacheService.cs  ← Redis abstraction
│   │   ├── IProductService.cs / ProductService.cs   ← All 5 strategies
│   ├── Data/
│   │   ├── IProductRepository.cs
│   │   └── InMemoryProductRepository.cs  ← Simulated DB
│   ├── Models/Product.cs
│   ├── DTOs/ProductDto.cs
│   └── Program.cs
│
├── RedisCachingApi.Tests/
│   ├── Unit/CacheAsideTests.cs
│   ├── Unit/WriteThroughTests.cs
│   └── Integration/ProductsControllerTests.cs
│
└── redis-caching-spa/
    └── src/
        ├── types/index.ts              ← Shared types
        ├── services/apiClient.ts       ← Axios HTTP client
        ├── services/signalRClient.ts   ← SignalR connection
        ├── context/ProductsContext.tsx ← Global state (useReducer)
        ├── hooks/
        │   ├── useProducts.ts          ← CRUD actions
        │   ├── useProductHub.ts        ← SignalR subscriptions
        │   └── useNotification.ts      ← Toast notifications
        └── components/
            ├── static/CachingInfo.tsx  ← Educational top section
            ├── dashboard/Dashboard.tsx ← Live CRUD bottom section
            └── common/                 ← ErrorBoundary, Modal, Notification
```

---

## Cache Expiration Reference

| Key pattern | Strategy | Absolute TTL | Sliding TTL |
|---|---|---|---|
| `products:all` | Cache-Aside | 10 min | 2 min |
| `products:{id}` | Hybrid L2 | 10 min | — |
| `products:{id}` | Hybrid L1 | — | 30 sec |

Redis instance name prefix: `RedisCachingDemo_`

---

## Configuration

**API** — `RedisCachingApi/appsettings.json`
```json
{
  "ConnectionStrings": { "Redis": "localhost:6379" },
  "AllowedOrigins": "http://localhost:5174"
}
```

**SPA** — `redis-caching-spa/.env`
```
VITE_API_URL=http://localhost:5168
```
