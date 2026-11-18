import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error) {
    console.error('Application error caught by ErrorBoundary:', error);
  }

  render() {
    if (this.state.hasError) {
      let readableMessage = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message);
        if (parsed && typeof parsed.error === 'string') {
          readableMessage = `${parsed.operationType?.toUpperCase() || 'FIRESTORE'} error on ${parsed.path || 'database'}: ${parsed.error}`;
        }
      } catch {
        // Keep raw error message
      }

      return (
        <div className="min-h-screen bg-[#08090d] text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white/[0.03] border border-white/[0.1] rounded-2xl p-8 space-y-5">
            <h1 className="text-xl font-semibold text-white">Unable to complete request</h1>
            <p className="text-sm text-slate-300 leading-relaxed break-words">
              {readableMessage}
            </p>
            <div>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="liquid-glass-btn liquid-glass-btn-accent px-5 py-2.5 text-sm"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
