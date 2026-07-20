import { Component, ErrorInfo, ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="home-page">
          <div className="state-panel" role="alert">
            <h1>页面加载失败</h1>
            <p>应用界面遇到错误，请重新启动后再试。</p>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
