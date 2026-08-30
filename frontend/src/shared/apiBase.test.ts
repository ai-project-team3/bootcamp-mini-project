import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveApiBase } from "./apiBase";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("finding the backend", () => {
  it("uses the same origin, which the dev server proxies to the API", () => {
    expect(resolveApiBase()).toBe("");
  });

  it("takes an explicit base when the backend is somewhere else", () => {
    vi.stubEnv("VITE_API_BASE", "https://api.example.com");

    expect(resolveApiBase()).toBe("https://api.example.com");
  });

  it("does not leave a trailing slash to double up on the path", () => {
    vi.stubEnv("VITE_API_BASE", "https://api.example.com/");

    expect(resolveApiBase()).toBe("https://api.example.com");
  });
});
