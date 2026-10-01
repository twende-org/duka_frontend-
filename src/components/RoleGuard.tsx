import { Navigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { navigationGroups } from "@/config/navigation";

interface RoleGuardProps {
  path: string;
  children: React.ReactNode;
}

/**
 * Redirects to /app if the user's capabilities cannot access the given path.
 */
export default function RoleGuard({ path, children }: RoleGuardProps) {
  const { role, permissions } = useUserRole();

  // If no role yet (shops not loaded), show children (Dashboard will handle empty state)
  if (!role) return <>{children}</>;

  // Find if this path requires a specific permission from navigation config
  let requiredPermission: any = null;
  for (const group of navigationGroups) {
    const match = group.items.find((item) => item.path === path);
    if (match) {
      requiredPermission = match.requiredPermission;
      break;
    }
  }

  // If permission is required and user doesn't have it, deny access
  if (requiredPermission && !permissions[requiredPermission]) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
