/**
 * App.tsx
 *
 * React Feature #14 – StrictMode wraps the whole app (in main.tsx).
 * React Feature #11 – React.lazy + Suspense: CachingInfo (heavy static section)
 *                      is lazy-loaded so the dashboard renders immediately.
 * React Feature #10 – Suspense: shows a fallback while CachingInfo is loading.
 * React Feature #12 – ErrorBoundary: wraps the dashboard to catch render errors.
 * React Feature #15 – DevTools-friendly: clear component hierarchy with descriptive names.
 */

import { lazy, Suspense } from 'react';
import { ProductsProvider } from './context/ProductsContext';
import { Dashboard } from './components/dashboard/Dashboard';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './index.css';

// React Feature #11 – Code splitting: lazy load the heavy static content
const CachingInfo = lazy(() => import('./components/static/CachingInfo'));

function App() {
  return (
    <div className="app">
      {/* ── TOP HALF: Static educational content ──────────────────── */}
      {/* React Feature #10 – Suspense */}
      <Suspense
        fallback={
          <div className="section-loading">
            📚 Loading caching documentation…
          </div>
        }
      >
        <CachingInfo />
      </Suspense>

      <hr className="section-divider" />

      {/* ── BOTTOM HALF: Dynamic dashboard ────────────────────────── */}
      {/* React Feature #9 – Context API provides in-memory product store */}
      <ProductsProvider>
        {/* React Feature #12 – Error Boundary protects the dashboard */}
        <ErrorBoundary>
          <Dashboard />
        </ErrorBoundary>
      </ProductsProvider>
    </div>
  );
}

export default App;
