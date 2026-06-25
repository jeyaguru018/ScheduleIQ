import React from "react";

/**
 * ErrorBoundary — Catches JavaScript errors in any child component tree.
 *
 * Without this, a single rendering error in one view crashes the entire app.
 * With this, only the affected component shows an error UI while the rest of
 * the app (sidebar, header, navigation) remains fully functional.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // In production this would send to Sentry, Datadog, etc.
    console.error("[ErrorBoundary] Component crashed:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center bg-surface-variant/30 p-8">
          <div className="max-w-md w-full bg-surface rounded-2xl shadow-lg border border-outline-variant p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-50 rounded-full flex items-center justify-center">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-on-surface mb-2">Something went wrong</h2>
            <p className="text-sm text-outline mb-6">
              This view encountered an unexpected error. Your data is safe — try refreshing or navigating away.
            </p>
            {import.meta.env.DEV && (
              <pre className="text-xs text-left bg-red-50 text-red-700 p-3 rounded-lg mb-6 overflow-auto max-h-40 border border-red-200">
                {this.state.error?.message}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              className="px-6 py-2 bg-[#1e1a8a] text-white font-bold rounded-lg hover:bg-[#1e1a8a]/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
