import { useCallback } from "react";
import { useAppSelector } from "@/store/hooks";
import { useUserRole } from "./useUserRole";
import { logActivity, type ActivityLog } from "@/lib/activityLog";

/**
 * Hook that returns a simple log function pre-filled with current user/role info.
 */
export function useActivityLogger() {
  const user = useAppSelector((s) => s.auth.user);
  const currentShopId = useAppSelector((s) => s.shops.currentShopId);
  const { role } = useUserRole();

  const log = useCallback(
    (params: {
      action: string;
      category: ActivityLog["category"];
      details: string;
      metadata?: Record<string, any>;
    }) => {
      if (!user || !currentShopId) return;
      logActivity({
        userId: user.id,
        userEmail: user.email,
        userName: user.displayName,
        role,
        shopId: currentShopId,
        ...params,
      });
    },
    [user, currentShopId, role]
  );

  return { log };
}
