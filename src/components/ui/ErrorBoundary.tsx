'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  label?: string;
}

interface State {
  error: Error | null;
  retryCount: number;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, retryCount: 0 };

  static getDerivedStateFromError(error: Error): State {
    return { error, retryCount: 0 };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.label ?? 'unknown'}]`, error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-full w-full gap-2 p-4 text-center bg-neutral-900">
          <span className="text-red-400 text-sm font-medium">
            {this.props.label ?? 'Component'} crashed
          </span>
          <span className="text-neutral-500 text-xs max-w-xs truncate">
            {this.state.error.message}
          </span>
          <button
            className="mt-2 px-3 py-1 text-xs bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded transition-colors"
            onClick={() => this.setState((s) => ({ error: null, retryCount: s.retryCount + 1 }))}
          >
            Retry
          </button>
        </div>
      );
    }
    // `contents` makes this div invisible to layout so children participate
    // directly in the parent flex/grid, preserving the original layout.
    // The key forces a full remount when retry is clicked.
    return <div key={this.state.retryCount} style={{ display: 'contents' }}>{this.props.children}</div>;
  }
}
