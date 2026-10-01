import { ApiError, apiErrorFromResponse } from "./errors";
import { coerceMoneyFields } from "./money";

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  /** JSON-serializable request body. Omit for GET/DELETE. */
  body?: unknown;
  /** Query params. undefined/null/"" are skipped; arrays repeat the key. */
  query?: Record<string, string | number | boolean | undefined | null | (string | number)[]>;
  /** Set false for public endpoints (no Authorization header, no refresh). */
  auth?: boolean;
  signal?: AbortSignal;
  /**
   * Unwrap DRF's {count, next, previous, results} envelope. Note the legacy
   * callers return plain arrays, so only pass this for list endpoints.
   */
  unwrapList?: boolean;
}

export interface ApiClientOptions {
  baseUrl: string;
  /** Resolve a DRF access token; null means "not signed in". */
  getAccessToken?: () => Promise<string | null>;
  /** Exchange a refresh token for a new access token; null means failure. */
  refreshAccessToken?: () => Promise<string | null>;
  fetchImpl?: typeof fetch;
}

export interface ApiClient {
  request<T>(path: string, options?: ApiRequestOptions): Promise<T>;
  get<T>(path: string, options?: Omit<ApiRequestOptions, "method" | "body">): Promise<T>;
  post<T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, "method" | "body">): Promise<T>;
  patch<T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, "method" | "body">): Promise<T>;
  put<T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, "method" | "body">): Promise<T>;
  del<T>(path: string, options?: Omit<ApiRequestOptions, "method" | "body">): Promise<T>;
}

export function buildQueryString(query?: ApiRequestOptions["query"]): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, String(item));
    } else {
      params.append(key, String(value));
    }
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

export function buildUrl(baseUrl: string, path: string, query?: ApiRequestOptions["query"]): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}${buildQueryString(query)}`;
}

/** Paths must be relative: an absolute URL would leak the JWT to another host. */
function assertRelativePath(path: string): void {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path) || path.startsWith("//")) {
    throw new Error(`API path must be relative, got "${path}"`);
  }
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const fetchImpl = options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

  async function readBody(response: Response): Promise<unknown> {
    if (response.status === 204) return null;
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  async function send(
    path: string,
    requestOptions: ApiRequestOptions,
    token: string | null
  ): Promise<Response> {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    // FormData must keep the browser's multipart boundary in Content-Type.
    const isFormData =
      typeof FormData !== "undefined" && requestOptions.body instanceof FormData;
    if (requestOptions.body !== undefined && !isFormData) {
      headers["Content-Type"] = "application/json";
    }

    return fetchImpl(buildUrl(options.baseUrl, path, requestOptions.query), {
      method: requestOptions.method ?? "GET",
      headers,
      body:
        requestOptions.body === undefined
          ? undefined
          : isFormData
            ? (requestOptions.body as FormData)
            : JSON.stringify(requestOptions.body),
      signal: requestOptions.signal,
    });
  }

  async function request<T>(path: string, requestOptions: ApiRequestOptions = {}): Promise<T> {
    assertRelativePath(path);
    const useAuth = requestOptions.auth !== false;

    let token: string | null = null;
    if (useAuth && options.getAccessToken) {
      try {
        token = await options.getAccessToken();
      } catch (error) {
        // The token exchange is itself an HTTP call, so a throw here is a
        // transport problem rather than a rejected request.
        throw new ApiError("Could not authenticate the request", {
          isNetworkError: true,
          detail: [(error as Error)?.message || "Could not obtain an access token"],
        });
      }
    }

    let response: Response;
    try {
      response = await send(path, requestOptions, token);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError("Network request failed", {
        isNetworkError: true,
        detail: [(error as Error)?.message || "Network request failed"],
      });
    }

    // An expired/unknown access token is retried once with a fresh one; if the
    // refresh also fails the 401 is reported so the caller can re-authenticate.
    if (response.status === 401 && useAuth && options.refreshAccessToken) {
      const refreshed = await options.refreshAccessToken();
      if (refreshed) {
        try {
          response = await send(path, requestOptions, refreshed);
        } catch (error) {
          throw new ApiError("Network request failed", {
            isNetworkError: true,
            detail: [(error as Error)?.message || "Network request failed"],
          });
        }
      }
    }

    const body = await readBody(response);
    if (!response.ok) {
      throw apiErrorFromResponse(response.status, body);
    }

    const payload = requestOptions.unwrapList ? unwrapList(body) : body;
    return coerceMoneyFields(payload as T);
  }

  return {
    request,
    get: (path, opts) => request(path, { ...opts, method: "GET" }),
    post: (path, body, opts) => request(path, { ...opts, method: "POST", body }),
    patch: (path, body, opts) => request(path, { ...opts, method: "PATCH", body }),
    put: (path, body, opts) => request(path, { ...opts, method: "PUT", body }),
    del: (path, opts) => request(path, { ...opts, method: "DELETE" }),
  };
}

/** Accept either a DRF page or a bare array; both come back as an array. */
export function unwrapList<T>(body: unknown): T[] {
  if (Array.isArray(body)) return body as T[];
  if (body && typeof body === "object") {
    const results = (body as { results?: unknown }).results;
    if (Array.isArray(results)) return results as T[];
  }
  return [];
}
