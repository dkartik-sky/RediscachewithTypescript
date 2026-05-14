/**
 * ErrorBoundary.tsx
 *
 * React Feature #12 – Error Boundaries
 *
 * Class component (required by React) that catches rendering errors
 * in the dynamic dashboard section and shows a fallback UI.
 * Without this, a single render error would crash the whole page.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="error-boundary">
            <h3>Something went wrong in the dashboard.</h3>
            <p>{this.state.error?.message}</p>
            <button onClick={() => this.setState({ hasError: false, error: null })}>
              Retry
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
