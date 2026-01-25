import React, { ReactNode, ErrorInfo } from 'react';
import { toast } from 'sonner';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    toast.error("An unexpected error occurred", {
      description: error.message || "Please try again later.",
      duration: 5000,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-full flex items-center justify-center bg-bg p-6">
          <div className="max-w-md w-full bg-bg-2 border border-border rounded-2xl p-8 shadow-xl space-y-6 text-center">
            <div className="flex justify-center">
              <div className="p-4 bg-red/10 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-12 w-12 text-red"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-font-1">Something went wrong</h1>
              <p className="text-font-2">
                An unexpected error occurred. Please try reloading the application.
              </p>
            </div>

            {this.state.error && (
              <div className="flex items-start gap-3 p-4 bg-red/5 border border-red/10 rounded-lg text-left overflow-auto max-h-40">
                <pre className="text-xs text-red/90 font-medium break-all whitespace-pre-wrap">
                  {this.state.error.toString()}
                </pre>
              </div>
            )}

            <div className="pt-4">
              <button 
                onClick={() => window.location.reload()} 
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Reload Application
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
