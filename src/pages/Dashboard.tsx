import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useProducts } from "@/hooks/useProducts";
import { fetchInventory } from "@/store/inventorySlice";
import { useTodaySummary, useSalesByDate, useSummariesRange } from "@/hooks/useSales";
import { useOrders } from "@/hooks/useOrders";
import { useUserRole } from "@/hooks/useUserRole";
import { getActivityLogs, type ActivityLog } from "@/lib/activityLog";
import { getShopAnalytics, type ShopAnalytics } from "@/lib/analytics";
import { useI18n } from "@/lib/i18n";
import { ErrorAlert } from "@/components/ErrorAlert";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { DollarSign } from "lucide-react";

// Subcomponents
import { BusinessHealthCard } from "@/components/dashboard/BusinessHealthCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { IncomingTransfersCard } from "@/components/dashboard/IncomingTransfersCard";
import { AIBusinessCoach } from "@/components/dashboard/AIBusinessCoach";
import { OperationsOverview } from "@/components/dashboard/OperationsOverview";
import { SalesAnalytics } from "@/components/dashboard/SalesAnalytics";
import { MarketingAnalytics } from "@/components/dashboard/MarketingAnalytics";
import { ProductInsights } from "@/components/dashboard/ProductInsights";
import { CustomerInsights } from "@/components/dashboard/CustomerInsights";
import { RecentActivity } from "@/components/dashboard/RecentActivity";

export default function Dashboard() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { permissions, role } = useUserRole();
  const { t } = useI18n();

  const currentShopId = useAppSelector((s) => s.shops.currentShopId);
  const shops = useAppSelector((s) => s.shops.shops);
  const currentShop = shops.find(s => s.id === currentShopId);
  const user = useAppSelector((s) => s.auth.user);
  const inventory = useAppSelector((s) => s.inventory.inventory);

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [traffic, setTraffic] = useState<ShopAnalytics | null>(null);
  const [timeRange, setTimeRange] = useState<7 | 30 | 90>(7);

  const dateStr = new Date().toISOString().split("T")[0];

  // Data Queries
  const { data: products = [] } = useProducts(currentShopId);
  const { data: todaySummary } = useTodaySummary(currentShopId);
  const { data: recentSales = [] } = useSalesByDate(currentShopId, dateStr);
  const { data: orders = [] } = useOrders(currentShopId);

  const rangeDates = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (timeRange - 1));
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };
  }, [timeRange]);

  const { data: rangeSummaries = [] } = useSummariesRange(
    currentShopId,
    rangeDates.startDate,
    rangeDates.endDate
  );

  useEffect(() => {
    if (!currentShopId) return;
    dispatch(fetchInventory(currentShopId));
    getShopAnalytics(currentShopId, 7).then(setTraffic).catch(console.error);
  }, [currentShopId, dispatch]);

  useEffect(() => {
    if (!currentShopId || !permissions.canViewRecentActivity) return;
    setLogsLoading(true);
    getActivityLogs(currentShopId, 20)
      .then(setActivityLogs)
      .catch((err) => console.warn("Activity logs failed:", err))
      .finally(() => setLogsLoading(false));
  }, [currentShopId, permissions.canViewRecentActivity]);

  const getProductStock = (id: string) => inventory.find((i) => i.productId === id);

  const lowStockProducts = useMemo(() => 
    products
      .map((p) => ({
        ...p,
        stock: getProductStock(p.id)?.quantity ?? 0,
        minStock: getProductStock(p.id)?.minStock ?? 5,
      }))
      .filter((p) => p.stock <= p.minStock),
  [products, inventory]);

  const todayRevenue = todaySummary?.totalSales || 0;
  const todayGrossProfit = todaySummary?.profit || 0;
  const todayExpenses = todaySummary?.totalExpenses || 0;
  const todayNetProfit = todaySummary?.netProfit ?? todayGrossProfit;

  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const yesterdaySummary = rangeSummaries.find((s) => s.date === yesterdayStr);
  const yesterdayRevenue = yesterdaySummary?.totalSales || 0;
  const yesterdayNetProfit = yesterdaySummary?.netProfit || yesterdaySummary?.profit || 0;

  const pendingOrders = useMemo(() => orders.filter((o) => o.status === "pending"), [orders]);

  if (!currentShopId) {
    return (
      <div className="space-y-6 pb-12 min-h-[80vh] flex flex-col items-center justify-center">
        <ErrorAlert error={null} onClear={() => {}} />
        <div className="bg-card rounded-2xl border p-12 text-center fade-in-up shadow-sm max-w-md w-full">
          <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 text-primary">
            <DollarSign className="h-10 w-10" />
          </div>
          <h2 className="text-xl font-extrabold text-foreground mb-2">{t("dashboard.addShopFirst")}</h2>
          <p className="text-muted-foreground max-w-sm mx-auto mb-6 text-sm">
            {t("layout.completeOnboardingFirst" as any)}
          </p>
          <Button onClick={() => navigate("/dashboard/shops")} className="rounded-xl bg-primary h-11 px-8 font-extrabold shadow-sm w-full">
            {t("shops.add")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 min-h-screen">
      <ErrorAlert error={null} onClear={() => {}} />

      {/* 1. Business Health Hero Section */}
      <BusinessHealthCard
        userName={user?.displayName}
        shopName={currentShop?.name}
        todayRevenue={todayRevenue}
        todayNetProfit={todayNetProfit}
        todayExpenses={todayExpenses}
        yesterdayRevenue={yesterdayRevenue}
        yesterdayNetProfit={yesterdayNetProfit}
        pendingOrdersCount={pendingOrders.length}
        lowStockCount={lowStockProducts.length}
        permissions={permissions}
      />

      {/* 2. Quick Business Actions */}
      <QuickActions permissions={permissions} />

      {/* 2b. Incoming B2B stock transfers awaiting confirmation */}
      <IncomingTransfersCard shopId={currentShopId} />

      {/* 3. AI Business Assistant Section */}
      {permissions.canViewDashboardProfit && <AIBusinessCoach shopId={currentShopId} />}

      {/* 4. Today's Operations Section */}
      <OperationsOverview
        orders={orders}
        products={products}
        inventory={inventory}
      />

      {/* 5. Sales Performance Analytics & 6. Marketing Section Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className={permissions.canAccessMarketing ? "xl:col-span-2" : "xl:col-span-3"}>
          <SalesAnalytics
            rangeSummaries={rangeSummaries}
            timeRange={timeRange}
            setTimeRange={setTimeRange}
            permissions={permissions}
          />
        </div>
        {permissions.canAccessMarketing && (
          <div>
            <MarketingAnalytics traffic={traffic} />
          </div>
        )}
      </div>

      {/* 7. Product Intelligence Section & 8. Customer Overview Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ProductInsights
          products={products}
          inventory={inventory}
          recentSales={recentSales}
        />
        <CustomerInsights
          shopId={currentShopId}
          orders={orders}
        />
      </div>

      {/* 9. Recent Activity Section */}
      <RecentActivity
        activityLogs={activityLogs}
        logsLoading={logsLoading}
      />
    </div>
  );
}
