import type { AppRole } from "@/types";
import {
  fetchActivityLogs,
  writeActivityLog,
  type ActivityLogRow,
} from "./api/domains/telemetry";

export interface ActivityLog {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  role: AppRole | null;
  shopId: string;
  action: string;
  category: "sale" | "product" | "expense" | "supplier" | "shop" | "user" | "auth";
  details: string;
  metadata?: Record<string, any>;
  createdAt: any;
}

function toActivityLog(row: ActivityLogRow): ActivityLog {
  return {
    id: row.id,
    userId: row.userId,
    userEmail: row.userEmail,
    userName: row.userName,
    role: (row.role || null) as AppRole | null,
    shopId: row.shopId,
    action: row.action,
    category: row.category as ActivityLog["category"],
    details: row.details,
    metadata: row.metadata,
    createdAt: row.createdAt,
  };
}

/**
 * Log a user activity. Silently fails to avoid blocking main operations.
 * The actor's identity is stamped from the JWT server-side; the extra
 * ``userId``/``userEmail``/``userName`` params are kept so existing call sites
 * (``useActivityLogger``) do not change shape.
 */
export async function logActivity(params: {
  userId: string;
  userEmail: string;
  userName: string;
  role: AppRole | null;
  shopId: string;
  action: string;
  category: ActivityLog["category"];
  details: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    await writeActivityLog({
      role: params.role ?? "",
      shopId: params.shopId,
      action: params.action,
      category: params.category,
      details: params.details,
      metadata: params.metadata,
    });
  } catch (err) {
    console.warn("Activity log failed:", err);
  }
}

/** Activity logs for a shop, newest first (server-ordered). */
export async function getActivityLogs(
  shopId: string,
  maxResults = 50
): Promise<ActivityLog[]> {
  const rows = await fetchActivityLogs({ shopId, maxResults });
  return rows.map(toActivityLog);
}

/** Activity logs for a specific user, newest first. */
export async function getUserActivityLogs(
  userId: string,
  maxResults = 50
): Promise<ActivityLog[]> {
  const rows = await fetchActivityLogs({ userId, maxResults });
  return rows.map(toActivityLog);
}

/** All activity logs across the platform (Admin only), newest first. */
export async function getAllActivityLogs(maxResults = 100): Promise<ActivityLog[]> {
  const rows = await fetchActivityLogs({ maxResults });
  return rows.map(toActivityLog);
}
