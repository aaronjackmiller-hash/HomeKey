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
    console.error('App error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h2>Something went wrong</h2>
          <p style={{ color: '#666' }}>An unexpected error occurred. Please refresh the page.</p>
          {this.state.error && (
            <p style={{ color: '#999', fontSize: '0.85em' }}>{this.state.error.message}</p>
          )}
          <button
            onClick={() => window.location.reload()}
            aria-label="Reload page"
            style={{ marginTop: '16px', padding: '10px 20px' }}
          >
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
