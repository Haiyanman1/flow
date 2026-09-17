import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Flow crashed:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 bg-void px-8 text-center">
          <p className="text-lg text-ink">Something went wrong.</p>
          <p className="max-w-sm text-sm text-ink-faint">{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="mt-2 rounded-lg bg-focus px-4 py-2 text-sm font-medium text-[#14100b] hover:brightness-110 transition-all"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
