import { useMemo } from "react";
import { useAppSelector } from "@/store/hooks";
import { getPermissions, type RolePermissions } from "@/lib/permissions";
import type { AppRole } from "@/types";

export type UserRolePermissions = RolePermissions;

/**
 * Returns the user's role for the currently selected shop,
 * plus the resolved permissions object.
 */
export function useUserRole() {
  const roles = useAppSelector((s) => s.auth.roles);
  const currentShopId = useAppSelector((s) => s.shops.currentShopId);
  const user = useAppSelector((s) => s.auth.user);

  const match = useMemo(() => {
    if (!currentShopId || !roles.length) return null;
    return roles.find((r) => r.shopId === currentShopId) ?? null;
  }, [roles, currentShopId]);

  const currentRole = match?.role ?? null;

  const permissions: RolePermissions = useMemo(
    () => getPermissions(currentRole),
    [currentRole]
  );

  return { role: currentRole, permissions, userId: user?.id ?? null, roleRecord: match };
}
