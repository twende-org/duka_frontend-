import { useCallback } from "react";
import { useAppSelector } from "@/store/hooks";
import { logErrorEvent, type ErrorCategory } from "@/lib/errorLogger";

/**
 * Hook that returns logError() pre-filled with current user + shop context.
 * Mirrors the existing useActivityLogger pattern.
 */
export function useErrorLogger() {
  const user = useAppSelector((s) => s.auth.user);
  const currentShopId = useAppSelector((s) => s.shops.currentShopId);

  const logError = useCallback(
    (params: {
      action: string;
      errorMessage: string;
      category: ErrorCategory;
      errorCode?: string;
    }) => {
      logErrorEvent({
        ...params,
        userId: user?.id,
        userEmail: user?.email,
        userName: user?.displayName,
        shopId: currentShopId || undefined,
        route: typeof window !== "undefined" ? window.location.pathname : "unknown",
      });
    },
    [user, currentShopId]
  );

  return { logError };
}
