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
      // You can render any custom fallback UI
      // We will rely on the global modal, but you could have a simple fallback here too.
      // For now, we render nothing and let the global handler deal with it.
      // Or, we could show a generic error message.
      return null; 
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
