import { Navigate, useLocation } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";

/**
 * Redirects authenticated users to /app dashboard or returnTo URL.
 * Renders children for unauthenticated visitors.
 */
export default function RedirectIfAuth({ children }: { children: React.ReactNode }) {
  const user = useAppSelector((s) => s.auth.user);
  const location = useLocation();
  
  if (user) {
    const searchParams = new URLSearchParams(location.search);
    const returnTo = searchParams.get("returnTo");
    return <Navigate to={returnTo || "/app"} replace />;
  }
  return <>{children}</>;
}
