/**
 * Monitoring & Error Tracking for changethegame.
 *
 * This module provides a thin abstraction over Sentry (or any future provider).
 * In development, errors are only logged. In production, they are reported.
 *
 * Setup:
 *   1. Install: bun add @sentry/react
 *   2. Set VITE_SENTRY_DSN in your .env
 *   3. Call initMonitoring() in main.tsx before React renders
 *
 * Usage:
 *   import { captureError, setMonitoringUser } from "@/lib/monitoring";
 *   captureError(error, { context: "QuestDetail" });
 *   setMonitoringUser({ id: user.id, email: user.email });
 */

interface MonitoringUser {
  id: string;
  email?: string;
  name?: string;
}

interface ErrorContext {
  context?: string;
  extra?: Record<string, unknown>;
}

let _initialized = false;

// eslint-disable-next-line no-console
const _devLog = console.log.bind(console);

/**
 * Initialize monitoring. Call once at app startup.
 * Fails silently if Sentry is not installed or DSN is missing.
 */
export async function initMonitoring(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    if (import.meta.env.DEV) {
      _devLog("[Monitoring] No VITE_SENTRY_DSN set — running without error tracking.");
    }
    return;
  }

  try {
    // @ts-ignore — @sentry/react is an optional dependency
    const Sentry = await import("@sentry/react");
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      // Only sample 10% of transactions in production to control costs
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
      // Don't send PII by default
      sendDefaultPii: false,
      // Filter out noisy errors
      beforeSend(event: Record<string, unknown>) {
        // Drop ResizeObserver errors (browser noise)
        const exception = event.exception as { values?: Array<{ value?: string }> } | undefined;
        if (exception?.values?.some((e) => e.value?.includes("ResizeObserver"))) {
          return null;
        }
        return event;
      },
    });
    _initialized = true;
  } catch {
    // Sentry not installed — that's OK, monitoring is optional
  }
}

/**
 * Capture an error and report it to the monitoring provider.
 */
export function captureError(error: unknown, ctx?: ErrorContext): void {
  if (!_initialized) return;

  try {
    // @ts-ignore — @sentry/react is an optional dependency
    import("@sentry/react").then((Sentry: Record<string, Function>) => {
      Sentry.withScope((scope: Record<string, Function>) => {
        if (ctx?.context) scope.setTag("context", ctx.context);
        if (ctx?.extra) scope.setExtras(ctx.extra);
        if (error instanceof Error) {
          Sentry.captureException(error);
        } else {
          Sentry.captureMessage(String(error), "error");
        }
      });
    });
  } catch {
    // silently ignore
  }
}

/**
 * Set the current user for error reports.
 */
export function setMonitoringUser(user: MonitoringUser | null): void {
  if (!_initialized) return;

  try {
    // @ts-ignore — @sentry/react is an optional dependency
    import("@sentry/react").then((Sentry: Record<string, Function>) => {
      Sentry.setUser(user ? { id: user.id, email: user.email, username: user.name } : null);
    });
  } catch {
    // silently ignore
  }
}

/**
 * Report Web Vitals (LCP, FID, CLS, TTFB, INP) if available.
 * Call once after app mount.
 */
export function reportWebVitals(): void {
  if (typeof window === "undefined") return;

  try {
    // @ts-ignore — web-vitals is an optional dependency
    import("web-vitals").then((mod: Record<string, Function>) => {
      const report = (metric: { name: string; value: number }) => {
        if (import.meta.env.DEV) {
          _devLog(`[WebVital] ${metric.name}: ${metric.value.toFixed(2)}`);
        }
        // Forward to Sentry if available
        if (_initialized) {
          // @ts-ignore — @sentry/react is an optional dependency
          import("@sentry/react").then((Sentry: Record<string, Function>) => {
            Sentry.setMeasurement(metric.name, metric.value, "millisecond");
          });
        }
      };
      mod.onCLS(report);
      mod.onFID(report);
      mod.onLCP(report);
      mod.onTTFB(report);
      mod.onINP(report);
    });
  } catch {
    // web-vitals not installed — that's OK
  }
}
