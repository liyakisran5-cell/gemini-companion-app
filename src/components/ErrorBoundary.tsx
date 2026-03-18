import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[NovaMind] App crash:", error, errorInfo);
  }

  handleReload = async () => {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) await reg.unregister();
      const names = await caches.keys();
      for (const name of names) await caches.delete(name);
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100dvh",
          background: "#1a1a1e",
          color: "#fff",
          fontFamily: "system-ui, sans-serif",
          padding: "24px",
          textAlign: "center",
          gap: "16px",
        }}>
          <div style={{ fontSize: "48px" }}>⚠️</div>
          <h2 style={{ margin: 0, fontSize: "20px", color: "#d4940a" }}>Something went wrong</h2>
          <p style={{ margin: 0, fontSize: "14px", color: "#999", maxWidth: "320px" }}>
            The app encountered an error. Tap below to reload with a fresh start.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: "12px 32px",
              background: "#d4940a",
              color: "#000",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
