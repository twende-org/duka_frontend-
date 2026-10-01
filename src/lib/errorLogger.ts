import { fetchErrorEvents, writeErrorEvent } from "./api/domains/telemetry";

export type ErrorCategory = "auth" | "database" | "crash" | "404" | "manual" | "permission" | "network";

export interface ErrorEventData {
  id?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  shopId?: string;
  action: string;
  errorMessage: string;
  errorCode?: string;
  route?: string;
  category: ErrorCategory;
  createdAt?: any;
}

/**
 * Fire-and-forget error logger. NEVER throws. Always silent.
 * Safe to call from ErrorBoundary, Login, NotFound — any context.
 */
export function logErrorEvent(event: Omit<ErrorEventData, "id" | "createdAt">): void {
  try {
    writeErrorEvent({
      ...event,
      route: event.route || (typeof window !== "undefined" ? window.location.pathname : "unknown"),
    }).catch(() => {}); // fully silent
  } catch (err) {
    console.warn("Failed to log error event:", err);
  }
}

/** Staff-only read of the crash reports, newest first. */
export async function getAllErrorEvents(limitCount = 300): Promise<ErrorEventData[]> {
  try {
    const rows = await fetchErrorEvents(limitCount);
    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      userEmail: row.userEmail,
      userName: row.userName,
      shopId: row.shopId,
      action: row.action,
      errorMessage: row.errorMessage,
      errorCode: row.errorCode,
      route: row.route,
      category: row.category as ErrorCategory,
      createdAt: row.createdAt,
    }));
  } catch {
    return [];
  }
}
