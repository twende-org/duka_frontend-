import { useMemo } from "react";
import { useAppSelector } from "@/store/hooks";
import { useProducts } from "./useProducts";
import { useOrders } from "./useOrders";
import { useSummariesRange } from "./useSales";
import { useCustomerBalances } from "./useCustomerAR";
import { useBuyerSupplierBalances } from "./useB2BFinance";
import { startOfDay, startOfWeek, startOfMonth, format, subDays } from "date-fns";

export function useBusinessIntelligence(shopId: string | undefined) {
  // 1. Get dates
  const today = new Date();
  const thirtyDaysAgo = subDays(today, 30);
  
  const todayStr = format(today, "yyyy-MM-dd");
  const startDateStr = format(thirtyDaysAgo, "yyyy-MM-dd");
  const endDateStr = format(today, "yyyy-MM-dd");

  const startOfWeekStr = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const startOfMonthStr = format(startOfMonth(today), "yyyy-MM-dd");

  // 2. Fetch data
  const { data: products = [], isLoading: loadingProducts } = useProducts(shopId);
  const inventory = useAppSelector((s) => s.inventory.inventory);
  const { data: orders = [], isLoading: loadingOrders } = useOrders(shopId);
  const { data: summaries = [], isLoading: loadingSummaries } = useSummariesRange(shopId, startDateStr, endDateStr);
  const { data: customerBalances = [], isLoading: loadingCustomerBalances } = useCustomerBalances(shopId);
  const { data: supplierBalances = [], isLoading: loadingSupplierBalances } = useBuyerSupplierBalances(shopId || null);

  // 3. Aggregate Sales
  const sales = useMemo(() => {
    let todaySales = 0;
    let weekSales = 0;
    let monthSales = 0;
    let revenue = 0;
    let expenses = 0;

    summaries.forEach((s) => {
      // Month
      if (s.date >= startOfMonthStr) {
        monthSales += s.totalSales;
      }
      // Week
      if (s.date >= startOfWeekStr) {
        weekSales += s.totalSales;
      }
      // Today
      if (s.date === todayStr) {
        todaySales += s.totalSales;
      }

      // Total revenue/expenses in the last 30 days
      revenue += s.totalSales;
      expenses += (s.totalExpenses || 0);
    });

    return {
      today: todaySales,
      week: weekSales,
      month: monthSales,
      revenue,
      expenses,
    };
  }, [summaries, startOfMonthStr, startOfWeekStr, todayStr]);

  // 4. Aggregate Orders
  const orderStats = useMemo(() => {
    const pending = orders.filter((o) => o.status === "pending").length;
    const processing = orders.filter((o) => ["confirmed", "picking", "packed", "ready_for_delivery", "out_for_delivery"].includes(o.status)).length;
    const completed = orders.filter((o) => o.status === "completed" || o.status === "delivered").length;
    return { pending, processing, completed };
  }, [orders]);

  // 5. Aggregate Finance
  const finance = useMemo(() => {
    const customerDebt = customerBalances.reduce((acc, b) => acc + b.outstandingBalance, 0);
    const supplierDebt = supplierBalances.reduce((acc, b) => acc + b.outstandingBalance, 0);
    return { customerDebt, supplierDebt };
  }, [customerBalances, supplierBalances]);

  // 6. Aggregate Product Intelligence
  const productInt = useMemo(() => {
    let inventoryValue = 0;
    let lowStockAlerts = 0;
    
    // In a real app we'd get sales volume per product over 30 days.
    // For now we simulate by sorting by total inventory value or mock sales.
    const enriched = products.map((p) => {
      const stock = inventory.find((i) => i.productId === p.id);
      const qty = stock?.quantity || 0;
      const minStock = stock?.minStock || 5;
      
      inventoryValue += (qty * p.buyingPrice);
      if (qty <= minStock) {
        lowStockAlerts += 1;
      }
      return { ...p, qty, minStock };
    });

    return {
      inventoryValue,
      lowStockAlerts,
      totalProducts: products.length,
      bestSellers: enriched.slice(0, 5), // Simplified
      slowMovers: enriched.slice(-5), // Simplified
    };
  }, [products, inventory]);

  // 7. Aggregate Customer Intelligence
  const customerInt = useMemo(() => {
    const topCustomers = [...customerBalances].sort((a, b) => b.totalPurchases - a.totalPurchases).slice(0, 5);
    return {
      totalCustomers: customerBalances.length,
      topCustomers,
      outstandingBalances: finance.customerDebt,
    };
  }, [customerBalances, finance.customerDebt]);

  // 8. Aggregate Supplier Intelligence
  const supplierInt = useMemo(() => {
    const purchaseVolume = supplierBalances.reduce((acc, b) => acc + b.totalPurchases, 0);
    return {
      totalSuppliers: supplierBalances.length,
      purchaseVolume,
      outstandingPayments: finance.supplierDebt,
    };
  }, [supplierBalances, finance.supplierDebt]);

  const isLoading = loadingProducts || loadingOrders || loadingSummaries || loadingCustomerBalances || loadingSupplierBalances;

  return {
    sales,
    orderStats,
    finance,
    productInt,
    customerInt,
    supplierInt,
    isLoading,
    
    // AI Export Payload
    aiPayload: {
      sales,
      orderStats,
      finance,
      productInt: {
        inventoryValue: productInt.inventoryValue,
        lowStockAlerts: productInt.lowStockAlerts,
      },
      customerInt: {
        totalCustomers: customerInt.totalCustomers,
        outstandingBalances: customerInt.outstandingBalances,
      },
      supplierInt: {
        totalSuppliers: supplierInt.totalSuppliers,
        purchaseVolume: supplierInt.purchaseVolume,
        outstandingPayments: supplierInt.outstandingPayments,
      }
    }
  };
}
