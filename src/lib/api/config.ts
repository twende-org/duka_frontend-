/**
 * Configuration for the Django DRF backend.
 */

declare global {
  interface Window {
    __APP_CONFIG__?: Record<string, string>;
  }
}

/**
 * Read a VITE_* variable with runtime precedence: nginx serves /config.js
 * (generated from the container's environment at startup), so a deployed
 * image can be reconfigured without rebuilding. Falls back to the build-time
 * import.meta.env value, which is what local dev uses.
 */
export function runtimeEnv(key: string): string | undefined {
  const injected =
    typeof window !== "undefined" ? window.__APP_CONFIG__?.[key] : undefined;
  if (typeof injected === "string" && injected.length > 0) return injected;
  const raw = import.meta.env?.[key];
  return typeof raw === "string" ? raw : undefined;
}

/** Base URL of the DRF API, without a trailing slash. Empty = same origin. */
export function getApiBaseUrl(): string {
  const raw = runtimeEnv("VITE_API_BASE_URL");
  if (typeof raw !== "string") return "";
  return raw.trim().replace(/\/+$/, "");
}
