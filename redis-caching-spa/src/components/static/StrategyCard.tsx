/**
 * StrategyCard.tsx
 *
 * React Feature #1 – JSX: declarative UI for a single caching strategy card.
 * React Feature #2 – Functional Components: stateless, props-only.
 */

interface Strategy {
  name: string;
  emoji: string;
  summary: string;
  flow: string[];
  pros: string[];
  cons: string[];
  endpoint?: string;
}

export function StrategyCard({ strategy }: { strategy: Strategy }) {
  return (
    <article className="strategy-card">
      <h3>
        {strategy.emoji} {strategy.name}
      </h3>
      <p className="strategy-summary">{strategy.summary}</p>

      <div className="strategy-flow">
        <strong>Flow:</strong>
        <ol>
          {strategy.flow.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>

      <div className="strategy-grid">
        <div>
          <strong>✅ Pros</strong>
          <ul>
            {strategy.pros.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </div>
        <div>
          <strong>⚠️ Cons</strong>
          <ul>
            {strategy.cons.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      </div>

      {strategy.endpoint && (
        <code className="strategy-endpoint">API endpoint: {strategy.endpoint}</code>
      )}
    </article>
  );
}

export type { Strategy };
