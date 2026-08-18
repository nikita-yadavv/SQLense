import { Component } from "react";

/**
 * ErrorBoundary — catches rendering errors anywhere in the subtree
 * and shows a friendly fallback UI instead of crashing the whole app.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="empty-state" style={{ padding: "80px 20px" }}>
          <div className="empty-state-icon">💥</div>
          <h3>Something went wrong</h3>
          <p>{this.state.error?.message || "An unexpected rendering error occurred."}</p>
          <button
            className="btn btn-primary"
            style={{ marginTop: "16px" }}
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
