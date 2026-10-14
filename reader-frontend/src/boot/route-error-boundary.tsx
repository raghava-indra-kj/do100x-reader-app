import { Component, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

class PageErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="min-h-screen flex items-center justify-center bg-[var(--color-surface-canvas)] text-[var(--color-text-strong)] p-6">
        <section role="alert" className="max-w-md space-y-4">
          <h1 className="text-xl font-semibold">This page couldn’t load</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            A connection problem or an app update may have interrupted loading.
            Reload the page to try again.
          </p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-md bg-[var(--color-brand)] text-white px-4 py-2 text-sm"
            >
              Reload page
            </button>
            <a href="/" className="text-sm underline">
              Go to home
            </a>
          </div>
        </section>
      </main>
    );
  }
}

/** Recover a failed lazy route without silently reloading and losing a draft. */
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <PageErrorBoundary key={location.pathname}>{children}</PageErrorBoundary>
  );
}
