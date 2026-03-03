/**
 * Builds a route string, appending prefill_params as query parameters if present.
 */
export function buildRoute(action: { route?: string; prefill_params?: Record<string, string> }): string {
  const route = action.route || "/explore";
  if (!action.prefill_params || Object.keys(action.prefill_params).length === 0) {
    return route;
  }
  const separator = route.includes("?") ? "&" : "?";
  const params = Object.entries(action.prefill_params)
    .map(([k, v]) => `prefill_${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return `${route}${separator}${params}`;
}
