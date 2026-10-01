import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchShops } from "@/store/shopsSlice";
import { isSystemAdmin } from "@/lib/subscription";
import { FullPageLoader } from "@/components/common/Loader";

export default function PostLoginRedirect() {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const roles = useAppSelector((s) => s.auth.roles);
  const { shops, currentShopId, loading: shopsLoading } = useAppSelector((s) => s.shops);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user?.id) {
      Promise.all([
        dispatch(fetchShops(user.id))
          .unwrap()
          .catch((err) => console.warn("Failed to load shops for redirect:", err)),
        isSystemAdmin(user.id)
          .then(setIsAdmin)
          .catch((err) => console.warn("Failed to check admin status:", err))
      ]).finally(() => {
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [user?.id, dispatch]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (loading || shopsLoading) {
    return (
      <FullPageLoader label="Inatafuta njia" />
    );
  }

  const hasTestMode = localStorage.getItem("admin_test_mode") !== null;
  const hasActiveShop = shops.length > 0;
  // The current shop (first by default) is what the dashboard will open on, so
  // it decides whether the merchant still owes the setup wizard. Landing on the
  // dashboard here would only flash the panel before AppLayout bounces to setup.
  const currentShop = shops.find((s) => s.id === currentShopId) ?? shops[0];
  const merchantLanding = !hasActiveShop
    ? "/onboarding"
    : currentShop?.setupStatus === "completed"
      ? "/dashboard"
      : "/setup-business";
  const ownsShop = hasActiveShop && roles.some((r) => r.role === "owner");
  const belongsToShop = hasActiveShop && roles.some((r) => r.role === "manager" || r.role === "attendant");

  const hasMerchantRole = hasActiveShop || user.roles?.includes("merchant") || user.roles?.includes("staff") || user.capabilities?.canManageBusiness || user.accountType === "merchant" || roles.length > 0;
  const hasCustomerRole = user.roles?.includes("customer") || user.capabilities?.canShop || user.accountType === "customer";

  let basePath = "/explore";
  
  if (hasTestMode) {
    basePath = "/dashboard";
  } else if (isAdmin) {
    basePath = "/admin";
  } else if (user.defaultWorkspace === "ask" || user.accountType === "unassigned" || (hasMerchantRole && hasCustomerRole && !user.defaultWorkspace)) {
    basePath = "/workspace-selector";
  } else if (user.defaultWorkspace === "customer") {
    basePath = "/customer/home";
  } else if (user.defaultWorkspace === "merchant") {
    basePath = merchantLanding;
  } else if (hasMerchantRole && !hasCustomerRole) {
    basePath = merchantLanding;
  } else if (hasCustomerRole && !hasMerchantRole) {
    basePath = "/customer/home";
  } else {
    // Fallback based on accountType if everything else fails
    if (user.accountType === "merchant") {
      basePath = merchantLanding;
    } else {
      basePath = "/customer/home";
    }
  }

  // Extract legacy subpaths (e.g. wasifu)
  const subpath = location.pathname.replace(/^\/app\/?/, "");

  if (subpath === "wasifu" || subpath === "profile") {
    // If user lands on a dashboard or is an admin, show dashboard profile
    if (basePath === "/dashboard" || isAdmin) {
      return <Navigate to="/dashboard/profile" replace />;
    }
    // A merchant who still owes setup goes there first — the dashboard profile
    // would only bounce the user to the same wizard.
    if (basePath === "/setup-business") {
      return <Navigate to="/setup-business" replace />;
    }
    // Otherwise, show customer profile
    return <Navigate to="/customer/profile" replace />;
  }

  return <Navigate to={basePath} replace />;
}
