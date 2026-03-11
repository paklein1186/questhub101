import { Component, type ErrorInfo, type ReactNode } from "react";
import { ServerCrash, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

interface Props {
  children: ReactNode;
  /** Optional fallback UI. When omitted, a default crash screen is shown. */
  fallback?: ReactNode;
  /** Optional label for log context (e.g. "AdminPanel", "QuestDetail") */
  label?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Generic React Error Boundary.
 *
 * Catches render-time errors in its subtree and shows a recovery UI
 * instead of a white screen. Also logs the error via the centralized logger.
 *
 * Usage:
 *   <ErrorBoundary label="QuestDetail">
 *     <QuestDetail />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const label = this.props.label ?? "ErrorBoundary";
    logger.error(`[${label}] Uncaught render error:`, error, errorInfo.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center max-w-md px-6">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <ServerCrash className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="mb-2 text-2xl font-bold font-display">Something went wrong</h2>
            <p className="mb-2 text-muted-foreground">
              An unexpected error occurred. You can try refreshing this section.
            </p>
            {this.state.error && (
              <p className="mb-4 text-xs text-muted-foreground/60 font-mono break-all">
                {this.state.error.message}
              </p>
            )}
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={this.handleRetry}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
              <Button variant="default" onClick={() => window.location.assign("/")}>
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
