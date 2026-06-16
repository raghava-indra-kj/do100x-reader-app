import { Component, type ReactNode } from "react";

/** Props for the error boundary wrapper. */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/** Internal state tracking render failures. */
interface ErrorBoundaryState {
  hasError: boolean;
}

/** Catches render errors within the markdown tree. */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[md-view] render error:", error);
  }

  render() {
    if (this.state.hasError) {
      return <pre className="md-error-fallback">{this.props.fallback}</pre>;
    }
    return this.props.children;
  }
}
