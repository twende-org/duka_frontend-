/**
 * Error shape shared by the whole API bridge.
 *
 * Every failure — HTTP status, validation, network — surfaces as an ApiError so
 * callers can `catch (e) { toast.error(e.detail.join(" ")) }` regardless of
 * which backend answered.
 */
export class ApiError extends Error {
  readonly status: number;
  /** Human-readable messages, always a non-empty array. */
  readonly detail: string[];
  /** DRF error code when the backend provided one (e.g. "not_found"). */
  readonly code?: string;
  /** Raw parsed response body, for callers that need field-level errors. */
  readonly data: unknown;
  /** True when the request never reached the server (offline, DNS, CORS). */
  readonly isNetworkError: boolean;

  constructor(
    message: string,
    options: {
      status?: number;
      detail?: string[];
      code?: string;
      data?: unknown;
      isNetworkError?: boolean;
    } = {}
  ) {
    super(message);
    this.name = "ApiError";
    this.status = options.status ?? 0;
    this.detail = options.detail?.length ? options.detail : [message];
    this.code = options.code;
    this.data = options.data;
    this.isNetworkError = options.isNetworkError ?? false;
  }
}

/** True for the 401/403 family, so callers can tell "log in again" apart. */
export function isAuthError(error: unknown): error is ApiError {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

/**
 * Flatten a DRF error body into a list of messages.
 *
 * DRF answers in several shapes: {"detail": "..."}, {"detail": [...]},
 * {"field": ["..."]} and the bare ["..."] produced when a service-level
 * ValidationError escapes. Field errors are prefixed with the field name.
 */
export function normalizeErrorDetail(body: unknown): string[] {
  if (body == null) return [];
  if (typeof body === "string") return body.trim() ? [body] : [];
  if (Array.isArray(body)) {
    return body.flatMap((item) => normalizeErrorDetail(item));
  }
  if (typeof body === "object") {
    const record = body as Record<string, unknown>;
    const detail = record.detail;
    if (detail != null) {
      const messages = normalizeErrorDetail(detail);
      if (messages.length) return messages;
    }
    return Object.entries(record).flatMap(([field, value]) =>
      normalizeErrorDetail(value).map((message) => {
        // List-serializer errors arrive keyed by index; the index is noise.
        if (/^\d+$/.test(field) || field === "non_field_errors") return message;
        return `${field}: ${message}`;
      })
    );
  }
  return [];
}

/** Build an ApiError from a response status and already-parsed body. */
export function apiErrorFromResponse(status: number, body: unknown): ApiError {
  const messages = normalizeErrorDetail(body);
  const fallback = `Request failed with status ${status}`;
  const record = (body ?? {}) as Record<string, unknown>;
  return new ApiError(messages[0] ?? fallback, {
    status,
    detail: messages.length ? messages : [fallback],
    code: typeof record.code === "string" ? record.code : undefined,
    data: body,
  });
}
