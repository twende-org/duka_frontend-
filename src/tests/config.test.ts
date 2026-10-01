import { describe, expect, it, afterEach, beforeEach, vi } from "vitest";
import { getApiBaseUrl, runtimeEnv } from "@/lib/api/config";

describe("getApiBaseUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.stubGlobal("window", globalThis.window);
  });

  it("trims and drops trailing slashes", () => {
    vi.stubEnv("VITE_API_BASE_URL", " http://127.0.0.1:8000/ ");
    expect(getApiBaseUrl()).toBe("http://127.0.0.1:8000");
  });

  it("defaults to same-origin when unset", () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    expect(getApiBaseUrl()).toBe("");
  });
});

describe("runtimeEnv", () => {
  beforeEach(() => {
    vi.stubGlobal("window", globalThis.window);
    window.__APP_CONFIG__ = undefined;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    window.__APP_CONFIG__ = undefined;
  });

  it("prefers the runtime config.js value over import.meta.env", () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://from-build");
    window.__APP_CONFIG__ = { VITE_API_BASE_URL: "http://from-env" };
    expect(runtimeEnv("VITE_API_BASE_URL")).toBe("http://from-env");
    expect(getApiBaseUrl()).toBe("http://from-env");
  });

  it("falls back to import.meta.env when config.js has no entry", () => {
    vi.stubEnv("VITE_APP_URL", "https://duka.example");
    expect(runtimeEnv("VITE_APP_URL")).toBe("https://duka.example");
  });

  it("treats an empty runtime value as absent and uses the build value", () => {
    vi.stubEnv("VITE_APP_URL", "https://duka.example");
    window.__APP_CONFIG__ = { VITE_APP_URL: "" };
    expect(runtimeEnv("VITE_APP_URL")).toBe("https://duka.example");
  });
});
