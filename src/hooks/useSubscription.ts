import { useState, useEffect } from "react";
import { useAppSelector } from "@/store/hooks";
import { useProducts } from "@/hooks/useProducts";
import { getUserSubscription, PLAN_LIMITS, type Subscription, type PlanTier } from "@/lib/subscription";

export function useSubscription() {
  const user = useAppSelector((s) => s.auth.user);
  const shops = useAppSelector((s) => s.shops.shops);
  const currentShopId = useAppSelector((s) => s.shops.currentShopId);
  const { data: products = [] } = useProducts(currentShopId);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    getUserSubscription(user.id)
      .then((sub) => {
        // Default to free tier if no subscription
        if (!sub) {
          setSubscription({
            id: user.id,
            userId: user.id,
            userEmail: user.email,
            userName: user.displayName,
            plan: "free",
            status: "active",
            startDate: new Date().toISOString().split("T")[0],
            endDate: "2099-12-31",
            amount: 0,
          });
        } else {
          setSubscription(sub);
        }
      })
      .catch(() => setSubscription(null))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const plan: PlanTier = subscription?.plan || "free";
  const limits = PLAN_LIMITS[plan];
  const isActive = subscription?.status === "active";
  
  const canAddShop = shops.length < limits.maxShops;
  const canAddProduct = products.length < limits.maxProducts;
  const shopCount = shops.length;
  const productCount = products.length;

  return {
    subscription,
    plan,
    limits,
    isActive,
    canAddShop,
    canAddProduct,
    shopCount,
    productCount,
    loading,
    refresh: async () => {
      if (!user?.id) return;
      const sub = await getUserSubscription(user.id);
      setSubscription(sub);
    },
  };
}
