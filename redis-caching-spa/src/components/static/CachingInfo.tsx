/**
 * CachingInfo.tsx
 *
 * React Feature #11 – Code Splitting / Lazy Loading
 * This component is lazy-loaded from App.tsx (heavy static content).
 *
 * React Feature #6 – useMemo: memoises the strategies array so the
 * expensive object creation only happens once.
 */

import { useMemo } from 'react';
import { StrategyCard, type Strategy } from './StrategyCard';

export default function CachingInfo() {
  // React Feature #6 – useMemo
  const strategies = useMemo<Strategy[]>(
    () => [
      {
        name: 'Cache-Aside (Lazy Loading)',
        emoji: '🔍',
        summary:
          'The application checks the cache first. On a miss it loads from the DB and populates the cache. The cache is never pre-populated; it fills on demand.',
        flow: [
          'App checks Redis for the key',
          'MISS → query the database',
          'Store result in Redis with TTL',
          'HIT → return cached value directly',
        ],
        pros: ['Simple to implement', 'Cache only holds data that is actually requested'],
        cons: ['Cold-start latency on first request', 'Stale data window between DB change and TTL expiry'],
        endpoint: 'GET /api/products  &  GET /api/products/{id}',
      },
      {
        name: 'Read-Through',
        emoji: '📖',
        summary:
          'A cache proxy sits between the app and DB. The app always reads from the cache; the cache fetches from the DB automatically on a miss and returns the result.',
        flow: [
          'App reads from cache layer',
          'Cache layer checks backing store',
          'Miss → cache fetches DB, stores result, returns to app',
          'Hit → cache returns directly',
        ],
        pros: ['App code is decoupled from DB', 'Transparent to the caller'],
        cons: ['Extra abstraction layer', 'First read is always slow'],
        endpoint: 'Same as Cache-Aside but abstracted via ICacheService',
      },
      {
        name: 'Write-Through',
        emoji: '✏️',
        summary:
          'Every write goes through the cache layer which writes to the DB and cache synchronously. Guarantees cache-DB consistency at the cost of slightly slower writes.',
        flow: [
          'App writes to cache service',
          'Cache service writes to DB',
          'Cache service writes to Redis',
          'Both succeed before returning',
        ],
        pros: ['Cache always consistent with DB', 'No stale reads after a write'],
        cons: ['Higher write latency (two sequential writes)', 'Writes populate cache even for rarely-read data'],
        endpoint: 'POST /api/products  &  PUT /api/products/{id}',
      },
      {
        name: 'Write-Behind (Write-Back)',
        emoji: '⏩',
        summary:
          'Writes update Redis immediately and return to the caller. A background worker drains a queue and persists to the DB asynchronously. Maximum throughput, small crash risk.',
        flow: [
          'App writes to Redis (fast)',
          'Returns success immediately',
          'Background channel receives write job',
          'Worker persists to DB asynchronously',
        ],
        pros: ['Minimal write latency', 'Absorbs write bursts'],
        cons: ['Data loss risk if cache crashes before flush', 'Eventual consistency only'],
        endpoint: 'POST /api/products/write-behind',
      },
      {
        name: 'Hybrid Multi-Layer (L1 + L2)',
        emoji: '🏗️',
        summary:
          'Two-tier caching: L1 is an in-process IMemoryCache (microsecond access), L2 is Redis (millisecond). The app checks L1 → L2 → DB in order, populating higher layers on miss.',
        flow: [
          'Check L1 IMemoryCache (30 s TTL)',
          'Miss → Check L2 Redis (10 min TTL)',
          'Populate L1 from Redis hit',
          'Miss → Load from DB, populate L2 then L1',
        ],
        pros: ['Lowest read latency for hot data', 'Redis offloads DB; L1 offloads Redis'],
        cons: ['Two eviction policies to manage', 'L1 is per-instance (not shared across pods)'],
        endpoint: 'GET /api/products/{id}',
      },
    ],
    []
  );

  return (
    <section className="caching-info" aria-label="Redis Caching Strategies">
      {/* ── What is Redis ─────────────────────────────────────────── */}
      <div className="info-hero">
        <h1>🔴 Redis Caching Demo</h1>
        <p className="info-lead">
          <strong>Redis</strong> (Remote Dictionary Server) is an open-source, in-memory data
          structure store used as a database, cache, and message broker. Because it keeps all
          data in RAM, reads and writes complete in <em>sub-millisecond</em> time — orders of
          magnitude faster than a relational database.
        </p>
        <div className="info-why">
          <h2>Why is caching needed?</h2>
          <ul>
            <li>🚀 <strong>Performance</strong> — serve repeated reads without hitting a slow DB</li>
            <li>💰 <strong>Cost</strong> — fewer DB queries = lower cloud DB costs</li>
            <li>🛡️ <strong>Resilience</strong> — cache absorbs traffic spikes that would overload a DB</li>
            <li>📈 <strong>Scalability</strong> — horizontal API instances all share one Redis cluster</li>
          </ul>
        </div>

        {/* Data flow diagram */}
        <div className="data-flow">
          <h2>Data Flow</h2>
          <div className="flow-diagram">
            <div className="flow-node">⚛️ React SPA</div>
            <div className="flow-arrow">⟷ HTTP / WebSocket</div>
            <div className="flow-node">.NET Core API</div>
            <div className="flow-arrow">⟷ IDistributedCache</div>
            <div className="flow-node">🔴 Redis</div>
            <div className="flow-arrow">⟷ (cache miss)</div>
            <div className="flow-node">🗄️ Database</div>
          </div>
          <p className="flow-note">
            SignalR pushes real-time change events from the API to all connected SPAs
            so the dashboard auto-refreshes without polling.
          </p>
        </div>
      </div>

      {/* ── Strategy cards ────────────────────────────────────────── */}
      <h2 className="strategies-heading">Caching Strategies Implemented</h2>
      <div className="strategies-grid">
        {strategies.map((s) => (
          <StrategyCard key={s.name} strategy={s} />
        ))}
      </div>
    </section>
  );
}
