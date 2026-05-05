import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center w-full h-full bg-bg-dark text-text-dark p-8">
          <h2 className="text-xl font-bold mb-4 text-red-400">
            Something went wrong
          </h2>
          <pre className="text-sm text-text-secondary bg-surface-dark p-4 rounded max-w-2xl overflow-auto mb-4">
            {this.state.error?.message}
          </pre>
          <button
            onClick={this.handleReload}
            className="px-4 py-2 bg-accent-primary text-white rounded hover:opacity-90"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
