'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((props: { error: Error; resetErrorBoundary: () => void }) => ReactNode);
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Reusable Error Boundary tailored for query failures and component tree errors.
 * Provides a user-friendly UI and a direct retry mechanism to re-trigger TanStack queries.
 */
export class QueryErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[QueryErrorBoundary] Caught rendering or data-fetching error:', error, errorInfo);
  }

  public resetErrorBoundary = () => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError && this.state.error) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback({
          error: this.state.error,
          resetErrorBoundary: this.resetErrorBoundary,
        });
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#12141A] border border-red-200 dark:border-red-900/40 shadow-sm text-center my-4 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-base font-black text-zinc-900 dark:text-white">
            Unable to Load Data
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 mb-3 leading-relaxed">
            A network or rendering error occurred while loading this section. Please check your connection and try again.
          </p>
          {this.state.error.message && (
            <p className="text-[11px] font-mono text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-2 rounded-lg mb-4 break-words">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={this.resetErrorBoundary}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F5132] hover:bg-[#0B3D26] text-white text-xs font-bold rounded-xl shadow transition-all active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry Fetch
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default QueryErrorBoundary;
