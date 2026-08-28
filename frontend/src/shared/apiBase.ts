/**
 * Where the backend lives.
 *
 * The games are played by several people on their own phones around one table,
 * so the page is usually opened over the LAN (e.g. http://192.168.0.5:5173) —
 * not on localhost. Hardcoding "localhost" would make every device call itself
 * and fail. Default to the host that served the page, on the API port, and let
 * `VITE_API_BASE` override it for a real deployment.
 */
const API_PORT = "8000";

export function resolveApiBase(): string {
  const configured = import.meta.env?.VITE_API_BASE;
  if (configured) return configured.replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location?.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:${API_PORT}`;
  }
  return `http://localhost:${API_PORT}`;
}

export const API_BASE = resolveApiBase();
