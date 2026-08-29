/**
 * Where the backend lives.
 *
 * Same origin by default — `vite.config.js` proxies /demo, /mafia and /marble
 * to the API, exactly as it does the rest of the app (`src/api/client.js`).
 * That is what lets one address be enough: several people play on their own
 * phones around one table, and a second port would mean a second address to
 * share, CORS to keep in step, and invite links built from
 * `window.location.origin` pointing somewhere the API is not.
 *
 * `VITE_API_BASE` overrides it when the backend really is somewhere else.
 */
export function resolveApiBase(): string {
  const configured = import.meta.env?.VITE_API_BASE;
  return configured ? configured.replace(/\/$/, "") : "";
}

export const API_BASE = resolveApiBase();
