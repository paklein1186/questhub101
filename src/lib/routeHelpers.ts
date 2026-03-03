/**
 * Builds a route string, appending prefill_params as query parameters if present.
 */
export function buildRoute(action: { route: string; prefill_params?: Record<string, string> }): string {
  if (!action.prefill_params || Object.keys(action.prefill_params).length === 0) {
    return action.route;
  }
  const separator = action.route.includes("?") ? "&" : "?";
  const params = Object.entries(action.prefill_params)
    .map(([k, v]) => `prefill_${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return `${action.route}${separator}${params}`;
}
