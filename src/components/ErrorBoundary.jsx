import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    // You could also log the error to an external service here
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
