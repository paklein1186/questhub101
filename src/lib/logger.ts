/**
 * Centralized logger for changethegame.
 *
 * - In development: all levels are printed.
 * - In production: only warn and error are printed.
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.debug("[MyComponent]", "some detail", value);
 *   logger.error("[MyHook] Fetch failed:", error);
 */

type LogFn = (...args: unknown[]) => void;

interface Logger {
  debug: LogFn;
  info: LogFn;
  warn: LogFn;
  error: LogFn;
}

const noop: LogFn = () => {};

const isDev = import.meta.env.DEV;

export const logger: Logger = {
  // eslint-disable-next-line no-console
  debug: isDev ? console.log.bind(console) : noop,
  // eslint-disable-next-line no-console
  info: isDev ? console.info.bind(console) : noop,
  // eslint-disable-next-line no-console
  warn: console.warn.bind(console),
  // eslint-disable-next-line no-console
  error: console.error.bind(console),
};
