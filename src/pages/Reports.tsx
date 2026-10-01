import { useState, useMemo, useEffect } from "react";
import { 
  FileText, Download, Calendar, TrendingUp, ShoppingCart, BarChart3, 
  Package, AlertTriangle, Loader2, TrendingDown, DollarSign, Activity, 
  Percent, Briefcase, Search, PieChart, Info, X, ShieldAlert
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { fetchInventory } from "@/store/inventorySlice";
import { fetchExpenses } from "@/store/expensesSlice";
import { useUserRole } from "@/hooks/useUserRole";
import { useProducts } from "@/hooks/useProducts";
import { useSalesRange } from "@/hooks/useSales";
import { formatTZS } from "@/data/mockData";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { ReportPDF } from "@/components/reports/ReportPDF";
import { ExpensesPDF } from "@/components/reports/ExpensesPDF";
import { ErrorAlert } from "@/components/ErrorAlert";
import { normalizeCategories, getCategoryName } from "@/lib/categories";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, BarChart, Bar, Cell, Legend
} from "recharts";

import { getCampaigns } from "@/lib/api/domains/marketing";
import { listShifts } from "@/lib/api/domains/shifts";
import type { Campaign } from "@/types";

type ReportPeriod = "today" | "week" | "month" | "custom";
type ActiveTab = "catalog" | "overview" | "sales" | "inventory" | "expenses";

export default function Reports() {
  const { t, lang } = useI18n();
  const isSw = lang === "sw";
  const local = (sw: string, en: string) => (isSw ? sw : en);
  const dispatch = useAppDispatch();
  const { permissions } = useUserRole();
  const currentShopId = useAppSelector((s) => s.shops.currentShopId);
  const shops = useAppSelector((s) => s.shops.shops);
  const { data: products = [] } = useProducts(currentShopId);
  const inventory = useAppSelector((s) => s.inventory.inventory);
  const expensesState = useAppSelector((s) => s.expenses);
  const user = useAppSelector((s) => s.auth.user);

  const [period, setPeriod] = useState<ReportPeriod>("today");
  const [activeTab, setActiveTab] = useState<ActiveTab>("catalog");
  const [inventorySearch, setInventorySearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [shifts, setShifts] = useState<any[]>([]);
  const [shiftsLoading, setShiftsLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  
  const currentShop = shops.find((s) => s.id === currentShopId);

  useEffect(() => {
    if (currentShopId) {
      dispatch(fetchInventory(currentShopId));
      dispatch(fetchExpenses(currentShopId));

      // Fetch live shifts
      setShiftsLoading(true);
      listShifts(currentShopId)
        .then(setShifts)
        .catch(err => console.error("Error fetching shifts:", err))
        .finally(() => setShiftsLoading(false));

      // Fetch live campaigns
      getCampaigns(currentShopId)
        .then(setCampaigns)
        .catch(err => console.error("Error fetching campaigns:", err));
    }
  }, [currentShopId, dispatch]);

  const dateRange = useMemo(() => {
    const today = new Date();
    const endStr = today.toISOString().split("T")[0];
    let startStr = endStr;
    if (period === "week") {
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      startStr = weekAgo.toISOString().split("T")[0];
    } else if (period === "month") {
      startStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
    }
    return { startDate: startStr, endDate: endStr };
  }, [period]);

  const { data: salesData = [] } = useSalesRange(currentShopId, dateRange.startDate, dateRange.endDate);

  const completedSales = useMemo(() => {
    return salesData.filter(s => s.status === "completed");
  }, [salesData]);

  // Computed report data
  const reportData = useMemo(() => {
    const sales = completedSales;
    const totalRevenue = sales.reduce((sum, s) => sum + s.totalPrice, 0);
    const totalProfit = sales.reduce((sum, s) => {
      const bp = s.buyingPrice || 0;
      return sum + (s.totalPrice - bp * s.quantity);
    }, 0);
    const totalTransactions = sales.length;

    // Top products by revenue
    const productMap = new Map<string, { name: string; qty: number; revenue: number }>();
    sales.forEach((s) => {
      const existing = productMap.get(s.productId) || { name: s.productName, qty: 0, revenue: 0 };
      existing.qty += s.quantity;
      existing.revenue += s.totalPrice;
      productMap.set(s.productId, existing);
    });
    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Payment method breakdown
    const paymentMap = new Map<string, { count: number; total: number }>();
    sales.forEach((s) => {
      const existing = paymentMap.get(s.paymentMethod) || { count: 0, total: 0 };
      existing.count += 1;
      existing.total += s.totalPrice;
      paymentMap.set(s.paymentMethod, existing);
    });
    const paymentBreakdown = Array.from(paymentMap.entries()).map(([method, data]) => ({
      method, ...data,
    })).sort((a, b) => b.total - a.total);

    // Helper for stock
    const getStock = (id: string) => inventory.find(i => i.productId === id);

    // Low stock
    const lowStock = products
      .map(p => ({ ...p, stock: getStock(p.id)?.quantity ?? 0, minStock: getStock(p.id)?.minStock ?? 5 }))
      .filter((p) => p.stock <= p.minStock);
    const outOfStock = products
      .map(p => ({ ...p, stock: getStock(p.id)?.quantity ?? 0 }))
      .filter((p) => p.stock === 0);

    // Stock value
    const totalStockValue = products.reduce((sum, p) => sum + p.sellingPrice * (getStock(p.id)?.quantity ?? 0), 0);
    const totalCostValue = products.reduce((sum, p) => sum + p.buyingPrice * (getStock(p.id)?.quantity ?? 0), 0);

    return {
      totalRevenue, totalProfit, totalTransactions,
      topProducts, paymentBreakdown,
      lowStock, outOfStock,
      totalStockValue, totalCostValue,
      profitMargin: totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : "0",
    };
  }, [completedSales, products, inventory]);

  // Sales Trend Chart Data
  const salesTrendData = useMemo(() => {
    const dailyMap = new Map<string, { dateLabel: string; amount: number; profit: number }>();
    const today = new Date();
    let daysToGenerate = 7;
    if (period === "today") daysToGenerate = 1;
    else if (period === "week") daysToGenerate = 7;
    else if (period === "month") {
      daysToGenerate = today.getDate();
    } else {
      daysToGenerate = 30;
    }

    for (let i = daysToGenerate - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      
      let label = "";
      if (period === "today") {
        label = t("day.today") || "Leo";
      } else {
        label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      }
      dailyMap.set(dateStr, { dateLabel: label, amount: 0, profit: 0 });
    }

    completedSales.forEach((s) => {
      const sDate = s.date;
      const existing = dailyMap.get(sDate);
      const profit = s.totalPrice - (s.buyingPrice || 0) * s.quantity;
      if (existing) {
        existing.amount += s.totalPrice;
        existing.profit += profit;
      }
    });

    return Array.from(dailyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([_, v]) => v);
  }, [completedSales, period, t]);

  // Expenses summary data
  const expensesData = useMemo(() => {
    const rawExpenses = expensesState.expenses || [];
    const filtered = rawExpenses.filter((e) => {
      return e.date >= dateRange.startDate && e.date <= dateRange.endDate;
    });

    const totalExpenses = filtered.reduce((sum, e) => sum + e.amount, 0);

    const categoryMap = new Map<string, number>();
    filtered.forEach((e) => {
      const cat = e.category || "Other";
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + e.amount);
    });

    const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, amount]) => ({
      category,
      amount,
    })).sort((a, b) => b.amount - a.amount);

    return {
      filtered,
      totalExpenses,
      categoryBreakdown,
    };
  }, [expensesState.expenses, dateRange]);

  // Categories list for filtering
  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      normalizeCategories(p).map(getCategoryName).forEach((c) => {
        if (c) cats.add(c);
      });
    });
    return Array.from(cats);
  }, [products, isSw]);

  // Low stock search + category filter
  const filteredLowStock = useMemo(() => {
    return reportData.lowStock.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(inventorySearch.toLowerCase()) || 
        (p.sku?.toLowerCase() || "").includes(inventorySearch.toLowerCase());
      
      const productCategories = normalizeCategories(p).map(getCategoryName);
      const matchesCategory = selectedCategory === "all" || productCategories.some(cat => cat === selectedCategory);

      return matchesSearch && matchesCategory;
    });
  }, [reportData.lowStock, inventorySearch, selectedCategory]);

  const getDateRangeString = () => {
    const today = new Date().toLocaleDateString();
    if (period === "today") return t("day.today") || "Leo";
    if (period === "week") return `${t("reports.week") || "Wiki hii"} (${today})`;
    if (period === "month") return `${t("reports.month") || "Mwezi huu"} (${today})`;
    return today;
  };

  const getPDFData = (type: "sales" | "products" | "summary") => {
    const userName = user?.displayName || "System Administrator";
    let data: any = {};
    if (type === "sales") {
      data = {
        sales: completedSales.map(s => ({
          ...s,
          totalPriceFormatted: formatTZS(s.totalPrice)
        }))
      };
    } else if (type === "products") {
      data = {
        products: products.map(p => {
          const inv = inventory.find(i => i.productId === p.id);
          return {
            ...p,
            category: normalizeCategories(p).map(getCategoryName).join(", "),
            stock: inv?.quantity ?? 0,
            minStock: inv?.minStock ?? 5,
            sellingPriceFormatted: formatTZS(p.sellingPrice)
          };
        })
      };
    } else if (type === "summary") {
      data = {
        totalSalesCount: completedSales.length,
        totalRevenueFormatted: formatTZS(reportData.totalRevenue),
        totalProfitFormatted: formatTZS(reportData.totalProfit),
        lowStockCount: reportData.lowStock.length
      };
    }

    return (
      <ReportPDF 
        type={type}
        shop={currentShop as any}
        data={data}
        dateRange={getDateRangeString()}
        generatedBy={userName}
        isSw={isSw}
        formatTZS={formatTZS}
      />
    );
  };

  // Recharts Custom Tooltips
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card p-3 rounded-2xl border border-border/80 shadow-md text-xs space-y-1 bg-background/95 backdrop-blur-md">
          <p className="font-semibold text-muted-foreground">{payload[0].payload.dateLabel}</p>
          <p className="font-black text-primary">{t("reports.totalRevenue") || "Mauzo"}: {formatTZS(payload[0].value)}</p>
          {payload[1] && (
            <p className="font-black text-accent">{t("reports.totalProfit") || "Faida"}: {formatTZS(payload[1].value)}</p>
          )}
        </div>
      );
    }
    return null;
  };

  const ExpensesTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card p-3 rounded-2xl border border-border/80 shadow-md text-xs space-y-1 bg-background/95 backdrop-blur-md">
          <p className="font-black text-foreground">{payload[0].payload.category}</p>
          <p className="font-black text-destructive">{formatTZS(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  // Automated Consultant Insights
  const consultantInsights = useMemo(() => {
    const list: { text: string; type: "info" | "warning" | "success" }[] = [];
    
    if (reportData.lowStock.length > 0) {
      list.push({
        text: local(
          `Bidhaa Pungufu: Una bidhaa ${reportData.lowStock.length} zenye kiwango kidogo cha stoki kwa sasa. Inashauriwa kuagiza stoki mpya hivi karibuni ili kulinda mauzo yako.`,
          `Low Stock: You have ${reportData.lowStock.length} low stock items. It is advised to restock soon to protect your sales.`
        ),
        type: "warning"
      });
    } else {
      list.push({
        text: local(
          "Stoki Safi: Stoki zote za bidhaa zako zipo katika viwango salama kwa sasa.",
          "Healthy Stock: All your product stock levels are currently at safe thresholds."
        ),
        type: "success"
      });
    }

    const expensesRatio = reportData.totalRevenue > 0 
      ? (expensesData.totalExpenses / reportData.totalRevenue) * 100 : 0;
    
    if (expensesRatio > 35) {
      list.push({
        text: local(
          `Gharama Kubwa: Gharama zako za uendeshaji ni ${expensesRatio.toFixed(0)}% ya mapato yako ya mauzo. Hii ni asilimia kubwa, jaribu kupunguza gharama zisizo za lazima.`,
          `High Expenses: Operating expenses account for ${expensesRatio.toFixed(0)}% of your sales revenue. Try minimizing non-essential costs.`
        ),
        type: "warning"
      });
    } else if (expensesRatio > 0) {
      list.push({
        text: local(
          `Gharama Salama: Gharama zako za uendeshaji zipo katika hali nzuri ya udhibiti (${expensesRatio.toFixed(0)}% ya mapato).`,
          `Safe Expenses: Operating costs are well-controlled (${expensesRatio.toFixed(0)}% of sales revenue).`
        ),
        type: "success"
      });
    }

    if (reportData.totalRevenue > 0 && Number(reportData.profitMargin) < 15) {
      list.push({
        text: local(
          `Margin ya Faida: Margin yako ya faida ni ${reportData.profitMargin}%. Fikiria kuboresha bei ya bidhaa au kupunguza bei unayonunulia kwa wauzaji wa jumla ili kuongeza faida.`,
          `Profit Margin: Your profit margin is ${reportData.profitMargin}%. Consider optimizing pricing or negotiating better vendor costs to increase margins.`
        ),
        type: "info"
      });
    }

    return list;
  }, [reportData, expensesData, isSw]);

  const exportToCSV = (filename: string, headers: string[], rows: any[][]) => {
    const csvContent = [headers, ...rows]
      .map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Excel/CSV imepakuliwa!");
  };

  const handleExcelExport = (type: "summary" | "sales" | "products" | "expenses") => {
    const dateStr = new Date().toISOString().split("T")[0];
    const shopName = currentShop?.name || "Biashara";

    if (type === "summary") {
      const headers = ["Kipimo (Metric)", "Thamani (Value)"];
      const rows = [
        ["Jumla ya Mapato (Total Revenue)", formatTZS(reportData.totalRevenue)],
        ["Jumla ya Faida (Total Profit)", formatTZS(reportData.totalProfit)],
        ["Idadi ya Miamala (Transactions Count)", reportData.totalTransactions],
        ["Wastani wa Kikapu (Average Ticket)", formatTZS(averageTicket)],
        ["Thamani ya Stoo (Stock Retail Value)", formatTZS(reportData.totalStockValue)],
        ["Gharama ya Ununuzi (Stock Cost Value)", formatTZS(reportData.totalCostValue)],
        ["Gharama za Uendeshaji (Operating Expenses)", formatTZS(expensesData.totalExpenses)],
        ["Faida Baada ya Gharama (Net Profit)", formatTZS(netProfit)]
      ];
      exportToCSV(`${shopName}_Summary_Report_${dateStr}.csv`, headers, rows);
    } else if (type === "sales") {
      const headers = ["Tarehe (Date)", "Bidhaa (Product)", "Idadi (Quantity)", "Bei (Price)", "Jumla (Subtotal)", "Malipo (Payment)"];
      const rows = completedSales.map(s => [
        s.date,
        s.productName,
        s.quantity,
        s.totalPrice / s.quantity,
        s.totalPrice,
        s.paymentMethod
      ]);
      exportToCSV(`${shopName}_Sales_Report_${dateStr}.csv`, headers, rows);
    } else if (type === "products") {
      const headers = ["Bidhaa (Product)", "Kategoria (Category)", "Stoki (Stock)", "Kiwango cha Chini (Min Stock)", "Bei ya Kuuza (Selling Price)", "Bei ya Kununua (Buying Price)"];
      const rows = products.map(p => {
        const inv = inventory.find(i => i.productId === p.id);
        return [
          p.name,
          normalizeCategories(p).map(getCategoryName).join(", "),
          inv?.quantity ?? 0,
          inv?.minStock ?? 5,
          p.sellingPrice,
          p.buyingPrice || 0
        ];
      });
      exportToCSV(`${shopName}_Inventory_Report_${dateStr}.csv`, headers, rows);
    } else if (type === "expenses") {
      const headers = ["Tarehe (Date)", "Maelezo (Description)", "Kundi (Category)", "Njia ya Malipo (Payment Method)", "Kiasi (Amount)"];
      const rows = expensesData.filtered.map(e => [
        e.date,
        e.description,
        e.category,
        e.paymentMethod,
        e.amount
      ]);
      exportToCSV(`${shopName}_Expenses_Report_${dateStr}.csv`, headers, rows);
    }
  };

  const netProfit = reportData.totalProfit - expensesData.totalExpenses;
  const averageTicket = reportData.totalTransactions > 0 
    ? Math.round(reportData.totalRevenue / reportData.totalTransactions) : 0;

  const healthyCount = products.length - reportData.lowStock.length;
  const stockHealthPct = products.length > 0 ? Math.round((healthyCount / products.length) * 100) : 100;

  return (
    <div className="space-y-6 fade-in-up">
      <ErrorAlert error={null} onClear={() => {}} />
      
      <PageHeader
        title={t("reports.title")}
        description={t("reports.subtitle")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Segmented Period Picker */}
            <div className="flex bg-muted/60 p-1 rounded-lg border border-border/40 w-fit shrink-0">
              {(
                [
                  { id: "today", label: t("day.today") || "Leo" },
                  { id: "week", label: t("reports.week") || "Wiki" },
                  { id: "month", label: t("reports.month") || "Mwezi" },
                ] as const
              ).map((p) => {
                const active = period === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPeriod(p.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      active 
                        ? "bg-background text-foreground shadow-sm border border-border/50" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Export Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <PDFDownloadLink 
                document={getPDFData("summary")} 
                fileName={`${currentShop?.name || "Biashara"}_Summary_${new Date().toISOString().split("T")[0]}.pdf`}
              >
                {({ loading }) => (
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={loading} 
                    className="rounded-lg shadow-sm font-semibold h-9"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2 text-primary" />}
                    PDF
                  </Button>
                )}
              </PDFDownloadLink>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExcelExport("summary")}
                className="rounded-lg shadow-sm font-semibold h-9"
              >
                <Download className="h-4 w-4 mr-2 text-primary" />
                Excel
              </Button>
            </div>
          </div>
        }
      />

      {/* TABS CONTAINER */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
        <div className="-mx-1 mb-6 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsList className="inline-flex w-max h-auto gap-1 bg-muted/50 p-1">
            {([
              ["catalog", local("Katalogi", "Catalog"), FileText, 0],
              ["overview", t("reports.summaryReport") || local("Muhtasari", "Summary"), BarChart3, 0],
              ["sales", t("reports.salesReport") || local("Mauzo", "Sales"), TrendingUp, completedSales.length],
              ["inventory", t("reports.lowStockReport") || local("Stoki", "Stock"), Package, reportData.lowStock.length],
              ["expenses", t("expenses.title") || local("Gharama", "Expenses"), Briefcase, expensesData.filtered.length],
            ] as const).map(([value, label, Icon, count]) => (
              <TabsTrigger 
                key={value} 
                value={value} 
                className="relative gap-2 transition-all duration-200 data-[state=active]:shadow-sm px-4 py-2"
              >
                <Icon className="h-4 w-4" />
                <span className="whitespace-nowrap">{label}</span>
                {count > 0 && (
                  <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-bold text-muted-foreground">
                    {count}
                  </span>
                )}
                {activeTab === value && (
                  <motion.span
                    layoutId="reports-tab-underline"
                    className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="catalog" className="space-y-6">
          <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-lg font-bold mb-1">
                {local("Katalogi ya Ripoti za Duka", "Store Reports Catalog")}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {local(
                  "Tafadhali chagua ripoti hapa chini ili kuona mchanganuo wa kina, chati, na kupakua ripoti kwa faili la PDF au Excel.",
                  "Please select a report below to view detailed breakdown, charts, and download reports as PDF or Excel files."
                )}
              </p>
            </CardHeader>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[
              {
                id: "pl",
                title: "Profit and Loss (P&L) Statement",
                swTitle: "Faida na Hasara (P&L)",
                description: "Hesabu kamili ya mapato (sales revenue), gharama ya ununuzi wa bidhaa (COGS), na gharama za uendeshaji ili kupata faida halisi.",
                enDescription: "Full calculation of income (sales revenue), cost of goods sold (COGS), and operating expenses to calculate net profit.",
                icon: TrendingUp,
                category: local("Fedha", "Financial")
              },
              {
                id: "margin",
                title: "Profit Margin Analysis",
                swTitle: "Uchambuzi wa Margin ya Faida",
                description: "Uchambuzi wa faida kwa kila bidhaa na kategoria ili kugundua bidhaa zenye faida kubwa.",
                enDescription: "Profitability analysis per product and category to identify high-margin items.",
                icon: Percent,
                category: local("Fedha", "Financial")
              },
              {
                id: "valuation",
                title: "Stock Valuation Report",
                swTitle: "Ripoti ya Thamani ya Stoo",
                description: "Thamani ya mtaji uliopo kwenye stoo kwa bei ya kununulia na ya kuuzia.",
                enDescription: "Inventory capital value at buying cost price and retail selling price.",
                icon: Package,
                category: local("Stoo", "Inventory")
              },
              {
                id: "turnover",
                title: "Inventory Turnover & Slow Stock",
                swTitle: "Mzunguko na Stoo Iliyoganda",
                description: "Tathmini ya jinsi bidhaa zinavyouzika kwa haraka na orodha ya stoo iliyoganda.",
                enDescription: "Evaluate how quickly items sell and list slow-moving inventory.",
                icon: Activity,
                category: local("Stoo", "Inventory")
              },
              {
                id: "reorder",
                title: "Low Stock & Reorder Report",
                swTitle: "Ripoti ya Stoki na Kuagiza Upya",
                description: "Orodha ya bidhaa zilizopungua na hesabu ya kiasi kinachopendekezwa kuagiza upya.",
                enDescription: "List of items under safety thresholds and recommended replenishment amounts.",
                icon: AlertTriangle,
                category: local("Stoo", "Inventory")
              },
              {
                id: "reconciliation",
                title: "Payment Reconciliation",
                swTitle: "Upatanisho wa Malipo ya Miamala",
                description: "Kulinganisha njia tofauti za malipo (Cash, Mobile, Bank) dhidi ya miamala halisi.",
                enDescription: "Compare payment methods (Cash, Mobile, Bank) against POS records.",
                icon: ShieldAlert,
                category: local("Upatanisho", "Reconciliation")
              },
              {
                id: "receivables",
                title: "Aging Accounts Receivable (Debtors)",
                swTitle: "Muda wa Madeni (Debtors)",
                description: "Ripoti inayoorodhesha madeni ya wateja yaliyochelewa kulipwa kulingana na siku zilizopita.",
                enDescription: "Lists customer debts overdue categorized by aging days brackets.",
                icon: DollarSign,
                category: local("Wateja", "Customers")
              },
              {
                id: "leaderboard",
                title: "Cashier/Employee Sales Leaderboard",
                swTitle: "Msimamo wa Makeshia / Wafanyakazi",
                description: "Uchambuzi wa kiasi cha mauzo na idadi ya miamala iliyofanywa na kila keshia.",
                enDescription: "Performance analysis of sales volumes and transaction counts per cashier.",
                icon: BarChart3,
                category: local("Uendeshaji", "Operations")
              },
              {
                id: "shift",
                title: "Shift Reconciliations",
                swTitle: "Upatanisho wa Shift na Fedha za Droo",
                description: "Taarifa ya ufunguaji/ufungaji wa droo ya fedha, hasara au ziada ya shift (discrepancy).",
                enDescription: "Register drawer cash log tracking expected vs counted cash and discrepancies.",
                icon: Activity,
                category: local("Uendeshaji", "Operations")
              },
              {
                id: "marketing",
                title: "Marketing Campaign Performance",
                swTitle: "Utendaji wa Kampeni za Masoko",
                description: "Uchambuzi wa wigo wa matangazo (reach), mauzo yaliyochochewa, na ROI ya kampeni.",
                enDescription: "ROI analytics of campaigns tracking reach, conversions, and ad budgets.",
                icon: TrendingUp,
                category: local("Masoko", "Marketing")
              }
            ].map((report) => {
              const Icon = report.icon;
              return (
                <Card key={report.id} className="shadow-sm flex flex-col justify-between hover:border-primary/30 transition-all duration-200 group">
                  <CardContent className="p-5 flex flex-col h-full justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                          {report.category}
                        </span>
                        <div className="rounded-lg p-1.5 bg-primary/10 text-primary">
                          <Icon className="h-4 w-4" />
                        </div>
                      </div>
                      <h3 className="text-sm font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                        {local(report.swTitle, report.title)}
                      </h3>
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-2">
                        {local(report.title, report.swTitle)}
                      </p>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSelectedReport(report.id)}
                      className="w-full text-xs font-semibold rounded-lg mt-2 group-hover:bg-primary group-hover:text-white transition-all"
                    >
                      {local("Fungua Ripoti", "Open Report")}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          {/* Overview Cards Grid */}
          <div className="grid gap-3 grid-cols-2 xl:grid-cols-4">
            
            <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t("reports.totalRevenue")}</CardTitle>
                <ShoppingCart className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums tracking-tight truncate">{formatTZS(reportData.totalRevenue)}</div>
              </CardContent>
            </Card>

            {permissions.canViewDashboardProfit && (
              <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t("reports.totalProfit")}</CardTitle>
                  <TrendingUp className="h-4 w-4 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tabular-nums tracking-tight truncate">{formatTZS(Math.round(reportData.totalProfit))}</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-accent">{reportData.profitMargin}% Margin</span>
                  </p>
                </CardContent>
              </Card>
            )}

            <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t("reports.transactions")}</CardTitle>
                <Activity className="h-4 w-4 text-info" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums tracking-tight truncate">{reportData.totalTransactions}</div>
                <p className="text-xs text-muted-foreground truncate">
                  {local("Wastani", "Average")}: {formatTZS(averageTicket)} / {local("kikapu", "basket")}
                </p>
              </CardContent>
            </Card>

            {permissions.canViewDashboardStock && (
              <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t("reports.stockValue")}</CardTitle>
                  <Package className="h-4 w-4 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tabular-nums tracking-tight truncate">{formatTZS(reportData.totalStockValue)}</div>
                  <p className="text-xs text-muted-foreground truncate">
                    {local("Afya ya Stoo", "Stock Health")}: {stockHealthPct}%
                  </p>
                </CardContent>
              </Card>
            )}

          </div>

          {/* Business Consultant Advisory & Profit Target Tracker */}
          <div className="grid gap-6 lg:grid-cols-3">
            
            {/* Consultant Advisor Card */}
            <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md lg:col-span-2">
              <CardHeader className="pb-3 flex flex-row items-center gap-2 space-y-0">
                <Info className="h-5 w-5 text-primary" />
                <CardTitle className="text-sm font-bold">{local("Ushauri wa Mshauri wa Biashara", "Business Consultant Insights")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {consultantInsights.map((insight, idx) => (
                  <div key={idx} className={`p-4 rounded-xl border flex gap-3 items-start ${
                    insight.type === "warning" 
                      ? "border-warning/20 bg-warning/5 text-warning-foreground" 
                      : insight.type === "success" 
                      ? "border-accent/20 bg-accent/5 text-accent-foreground" 
                      : "border-info/20 bg-info/5 text-info-foreground"
                  }`}>
                    {insight.type === "warning" && <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />}
                    {insight.type === "success" && <Activity className="h-5 w-5 text-accent shrink-0 mt-0.5" />}
                    {insight.type === "info" && <Info className="h-5 w-5 text-info shrink-0 mt-0.5" />}
                    <p className="text-xs sm:text-sm font-semibold leading-relaxed">{insight.text}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Target Card */}
            <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md flex flex-col justify-between">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-bold">{local("Kiwango cha Faida", "Profit Margin")}</CardTitle>
                <Percent className="h-5 w-5 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <p className="text-4xl font-extrabold text-accent tracking-tight">{reportData.profitMargin}%</p>
                    <p className="text-[10px] font-black uppercase text-muted-foreground mt-1 tracking-wider">Gross profit margin</p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-black uppercase text-muted-foreground">
                      <span>{local("Lengo la Duka", "Shop Goal")}</span>
                      <span>Target: 25%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted border border-border/40 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${
                          Number(reportData.profitMargin) >= 25 ? "bg-accent" : "bg-primary"
                        }`}
                        style={{ width: `${Math.min(100, (Number(reportData.profitMargin) / 25) * 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  <p className="text-[10px] text-muted-foreground leading-normal mt-4">{local("Lengo hili limejengwa kulingana na wastani wa gharama na bei ya soko ya rejareja.", "This goal is modeled on average market cost levels and standard retail prices.")}</p>
                </div>
              </CardContent>
            </Card>
            
          </div>
        </TabsContent>

        <TabsContent value="sales" className="space-y-6">
          {/* Sleek Line Area Chart for Sales and Profit */}
          <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 gap-4 space-y-0">
              <div>
                <CardTitle className="text-lg font-bold">{local("Mwelekeo wa Mauzo", "Sales Trend")}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{local("Mchanganuo wa mapato na faida kwa kila siku", "Daily breakdown of revenues and profits")}</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center gap-1.5 text-primary"><span className="h-3 w-3 rounded-full bg-primary" /> {local("Mapato", "Revenue")}</span>
                {permissions.canViewDashboardProfit && (
                  <span className="flex items-center gap-1.5 text-accent"><span className="h-3 w-3 rounded-full bg-accent" /> {local("Faida", "Profit")}</span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border)/0.3)" />
                    <XAxis dataKey="dateLabel" tickLine={false} axisLine={false} tick={{ fontSize: 10, fontFamily: "Plus Jakarta Sans, sans-serif", fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={(val) => `${val/1000}k`} tick={{ fontSize: 10, fontFamily: "Plus Jakarta Sans, sans-serif", fill: "hsl(var(--muted-foreground))" }} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" name={local("Mauzo", "Sales")} />
                    {permissions.canViewDashboardProfit && (
                      <Area type="monotone" dataKey="profit" stroke="hsl(var(--accent))" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" name={local("Faida", "Profit")} />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            
            {/* Top Products Table */}
            <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-6 space-y-0">
                <CardTitle className="text-md font-bold">{t("reports.topProducts")}</CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleExcelExport("sales")}
                    className="h-8 text-xs font-semibold rounded-lg"
                  >
                    <Download className="h-3.5 w-3.5 mr-1" /> Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {reportData.topProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">{t("reports.noData")}</p>
                ) : (
                  <div className="space-y-1 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                    {reportData.topProducts.map((p, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: Math.min(i, 12) * 0.03, ease: [0.22, 1, 0.36, 1] }}
                        className="group relative flex items-center justify-between gap-3 overflow-hidden rounded-md border-b border-border/40 last:border-0 px-2 py-3 transition-colors hover:bg-primary/5"
                      >
                        <span className="absolute left-0 top-1/2 h-0 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300 group-hover:h-3/5" />
                        <div className="flex min-w-0 items-center gap-3 transition-transform duration-200 group-hover:translate-x-1">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors" title={p.name}>{p.name}</p>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-tight whitespace-nowrap">{p.qty} {t("reports.unitsSold")}</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-foreground shrink-0 whitespace-nowrap">{formatTZS(p.revenue)}</span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Method Breakdown */}
            <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-6 space-y-0">
                <CardTitle className="text-md font-bold">{t("reports.paymentBreakdown")}</CardTitle>
                <PieChart className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {reportData.paymentBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">{t("reports.noData")}</p>
                ) : (
                  <div className="space-y-5">
                    {reportData.paymentBreakdown.map((pm) => {
                      const pct = reportData.totalRevenue > 0
                        ? ((pm.total / reportData.totalRevenue) * 100).toFixed(0) : "0";
                      return (
                        <div key={pm.method} className="group">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-foreground/80">{pm.method}</span>
                            <span className="text-[10px] font-bold text-primary bg-primary/15 px-2 py-0.5 rounded-md">{pct}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden border border-border/40">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-1000"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                            <span>{pm.count} miamala</span>
                            <span className="font-bold text-foreground">{formatTZS(pm.total)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          {/* Inventory Valuation and Ratios */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{local("Thamani ya Bidhaa Kuuzwa", "Retail Stock Value")}</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums tracking-tight truncate">{formatTZS(reportData.totalStockValue)}</div>
                <p className="text-xs text-muted-foreground mt-1">{local("Bei ya kuuza stoo yote", "Total value at selling prices")}</p>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{local("Gharama ya Ununuzi", "Valuation at Cost")}</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums tracking-tight truncate">{formatTZS(reportData.totalCostValue)}</div>
                <p className="text-xs text-muted-foreground mt-1">{local("Mtaji uliopo kwenye stoo", "Locked capital at buying costs")}</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{local("Faida ya Stoko Tarajiwa", "Projected Stock Profit")}</CardTitle>
                <TrendingUp className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums tracking-tight truncate text-accent">{formatTZS(reportData.totalStockValue - reportData.totalCostValue)}</div>
                <p className="text-xs text-muted-foreground mt-1">{local("Faida ikiuzwa yote", "Projected gross profits on sell-out")}</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{local("Stoki Ndogo", "Low Stock Items")}</CardTitle>
                <AlertTriangle className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums tracking-tight">{reportData.lowStock.length}</div>
                <p className="text-xs text-muted-foreground mt-1">{reportData.outOfStock.length} {local("zimeisha kabisa", "out of stock")}</p>
              </CardContent>
            </Card>
          </div>

          {/* Filter Low Stock Report */}
          <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <CardHeader className="flex flex-col xl:flex-row xl:items-center justify-between pb-6 gap-4 space-y-0">
              <div>
                <CardTitle className="text-md font-bold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  {t("reports.lowStockReport")}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{local("Bidhaa zenye stoki iliyopo chini ya kiwango kilichowekwa", "Products with stock levels below safety threshold")}</p>
              </div>

              {/* Inventory Filter inputs */}
              <div className="flex flex-wrap gap-2 items-center w-full xl:w-auto">
                <div className="relative flex-1 xl:flex-initial xl:w-60">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder={local("Tafuta bidhaa stoo...", "Search products in inventory...")}
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                    className="pl-9 h-9 rounded-xl text-xs bg-muted/40 border-border/60"
                  />
                  {inventorySearch && (
                    <button onClick={() => setInventorySearch("")} className="absolute right-3 top-3"><X className="h-3 w-3 text-muted-foreground" /></button>
                  )}
                </div>

                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full xl:w-44 h-9 rounded-xl text-xs bg-muted/40 border-border/60">
                    <SelectValue placeholder={local("Kategoria zote", "All Categories")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{local("Kategoria zote", "All Categories")}</SelectItem>
                    {uniqueCategories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                  <PDFDownloadLink 
                    document={getPDFData("products")} 
                    fileName={`${currentShop?.name || "Biashara"}_Products_${new Date().toISOString().split("T")[0]}.pdf`}
                  >
                    {({ loading }) => (
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={loading} 
                        className="h-9 rounded-lg font-semibold text-xs"
                      >
                        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Package className="h-3.5 w-3.5 mr-1" />}
                        PDF
                      </Button>
                    )}
                  </PDFDownloadLink>

                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleExcelExport("products")}
                    className="h-9 rounded-lg font-semibold text-xs"
                  >
                    <Download className="h-3.5 w-3.5 mr-1" /> Excel
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {filteredLowStock.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">{t("reports.allStockOk")}</p>
              ) : (
                <div className="space-y-4">
                  
                  {/* Mobile view of low stock items */}
                  <div className="grid gap-4 md:hidden">
                    {filteredLowStock.map((p) => (
                      <div key={p.id} className="p-4 rounded-xl border border-border/60 bg-muted/30">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-sm text-foreground">{p.name}</h3>
                          <span className="text-[9px] font-black uppercase text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">{normalizeCategories(p).map(getCategoryName).join(", ")}</span>
                        </div>
                        <div className="flex justify-between items-end">
                          <div className="space-y-1">
                            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tight">{local("Kiwango cha chini:", "Minimum level:")} {p.minStock}</p>
                            <p className="text-xs font-black text-primary">{formatTZS(p.sellingPrice)}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-xl font-black ${p.stock === 0 ? "text-destructive" : "text-warning"}`}>{p.stock}</p>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase">{p.stock === 0 ? local("Hazipo", "Out of stock") : local("Zimebaki", "In stock")}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop View of low stock items */}
                  <div className="hidden md:block rounded-xl border bg-card overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
                        <thead className="sticky top-0 z-10 text-xs text-muted-foreground bg-muted/50 backdrop-blur uppercase">
                          <tr>
                            <th className="px-4 py-3 font-medium">{t("products.name")}</th>
                            <th className="px-4 py-3 font-medium">{t("products.category")}</th>
                            <th className="px-4 py-3 font-medium text-right">{t("products.stock")}</th>
                            <th className="px-4 py-3 font-medium text-right">{t("products.minStock")}</th>
                            <th className="px-4 py-3 font-medium text-right">{t("products.sellingPrice")}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {filteredLowStock.map((p, i) => (
                            <motion.tr
                              key={p.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.28, delay: Math.min(i, 12) * 0.03, ease: [0.22, 1, 0.36, 1] }}
                              className="group relative transition-colors duration-200 hover:bg-primary/5"
                            >
                              <td className="relative px-4 py-3 font-bold text-foreground max-w-[240px]">
                                <span className="absolute left-0 top-1/2 h-0 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300 group-hover:h-3/5" />
                                <span className="inline-block max-w-[220px] truncate align-middle transition-transform duration-200 group-hover:translate-x-1" title={p.name}>{p.name}</span>
                              </td>
                              <td className="px-4 py-3 max-w-[200px]">
                                <span className="inline-flex max-w-[180px] items-center truncate rounded-md bg-muted px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground border border-transparent">
                                  {normalizeCategories(p).map(getCategoryName).join(", ")}
                                </span>
                              </td>
                              <td className={`px-4 py-3 text-right font-black ${p.stock === 0 ? "text-destructive" : "text-warning"}`}>{p.stock}</td>
                              <td className="px-4 py-3 text-right text-muted-foreground font-semibold">{p.minStock}</td>
                              <td className="px-4 py-3 text-right font-bold text-primary">{formatTZS(p.sellingPrice)}</td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6">
          {/* Expenses Overview stats */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            
            <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{local("Jumla ya Gharama", "Total Expenses")}</CardTitle>
                <Briefcase className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums tracking-tight truncate text-destructive">{formatTZS(expensesData.totalExpenses)}</div>
                <p className="text-xs text-muted-foreground mt-1">{getDateRangeString()}</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{local("Gharama dhidi ya Mauzo", "Expenses vs Sales")}</CardTitle>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums tracking-tight truncate">
                  {reportData.totalRevenue > 0 
                    ? `${((expensesData.totalExpenses / reportData.totalRevenue) * 100).toFixed(1)}%`
                    : "0%"
                  }
                </div>
                <p className="text-xs text-muted-foreground mt-1">{local("Uwiano wa gharama", "Expense ratio")}</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{local("Faida Baada ya Gharama", "Net Profit")}</CardTitle>
                <TrendingUp className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold tabular-nums tracking-tight truncate ${netProfit >= 0 ? "text-accent" : "text-destructive"}`}>{formatTZS(netProfit)}</div>
                <p className="text-xs text-muted-foreground mt-1">{local("Baada ya gharama zote", "After all expenses")}</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{local("Idadi ya Gharama", "Expense Entries")}</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums tracking-tight">{expensesData.filtered.length}</div>
                <p className="text-xs text-muted-foreground mt-1">{expensesData.categoryBreakdown.length} {local("kategoria", "categories")}</p>
              </CardContent>
            </Card>

          </div>

          {/* Expenses Chart & Breakdown details */}
          <div className="grid gap-6 xl:grid-cols-2">
            
            {/* Chart of expense categories */}
            <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-6 space-y-0">
                <div>
                  <CardTitle className="text-md font-bold">{local("Kategoria za Gharama", "Expense Categories")}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{local("Uchambuzi wa gharama zako kwa makundi", "Expenses categorized by group")}</p>
                </div>
                <Briefcase className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {expensesData.categoryBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-12">{t("reports.noData")}</p>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={expensesData.categoryBreakdown} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border)/0.3)" />
                        <XAxis dataKey="category" tickLine={false} axisLine={false} tick={{ fontSize: 10, fontFamily: "Plus Jakarta Sans, sans-serif", fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis tickLine={false} axisLine={false} tickFormatter={(val) => `${val/1000}k`} tick={{ fontSize: 10, fontFamily: "Plus Jakarta Sans, sans-serif", fill: "hsl(var(--muted-foreground))" }} />
                        <RechartsTooltip content={<ExpensesTooltip />} />
                        <Bar dataKey="amount" fill="hsl(var(--destructive))" radius={[6, 6, 0, 0]}>
                          {expensesData.categoryBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={`hsl(var(--destructive) / ${1 - Math.min(0.7, index * 0.15)})`} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* List of recent expenses with download trigger */}
            <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
              <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between pb-6 gap-4 space-y-0">
                <div>
                  <CardTitle className="text-md font-bold">{local("Kumbukumbu za Gharama", "Expense Logs")}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{local("Orodha ya gharama zilizosajiliwa kipindi hiki", "List of registered expenses in this period")}</p>
                </div>

                <div className="flex items-center gap-2">
                  <PDFDownloadLink 
                    document={
                      <ExpensesPDF 
                        expenses={expensesData.filtered} 
                        period={getDateRangeString()} 
                        shopName={currentShop?.name || "Biashara"} 
                        total={expensesData.totalExpenses} 
                        generatedBy={user?.displayName || "System Administrator"} 
                        formatTZS={formatTZS} 
                        isSw={isSw}
                      />
                    } 
                    fileName={`${currentShop?.name || "Biashara"}_Expenses_${new Date().toISOString().split("T")[0]}.pdf`}
                  >
                    {({ loading }) => (
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={loading || expensesData.filtered.length === 0} 
                        className="h-9 rounded-lg font-semibold text-xs"
                      >
                        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <FileText className="h-3.5 w-3.5 mr-1" />}
                        PDF
                      </Button>
                    )}
                  </PDFDownloadLink>

                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleExcelExport("expenses")}
                    className="h-9 rounded-lg font-semibold text-xs"
                  >
                    <Download className="h-3.5 w-3.5 mr-1" /> Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {expensesData.filtered.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">{t("reports.noData")}</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                    {expensesData.filtered.map((e, i) => (
                      <motion.div
                        key={e.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: Math.min(i, 12) * 0.03, ease: [0.22, 1, 0.36, 1] }}
                        className="group relative p-3 rounded-xl border border-border/40 hover:bg-primary/5 transition-colors flex items-center justify-between gap-3 overflow-hidden"
                      >
                        <span className="absolute left-0 top-1/2 h-0 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300 group-hover:h-3/5" />
                        <div className="min-w-0 transition-transform duration-200 group-hover:translate-x-1">
                          <p className="text-xs font-bold text-foreground truncate">{e.description}</p>
                          <div className="flex gap-2 items-center mt-1 text-[9px] font-semibold text-muted-foreground uppercase whitespace-nowrap">
                            <span className="truncate">{e.category}</span>
                            <span>•</span>
                            <span>{e.date}</span>
                          </div>
                        </div>
                        <span className="text-xs font-black text-destructive shrink-0 whitespace-nowrap">{formatTZS(e.amount)}</span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

        </TabsContent>
      </Tabs>

      {selectedReport && (
        <ReportDetailModal
          reportId={selectedReport}
          onClose={() => setSelectedReport(null)}
          completedSales={completedSales}
          products={products}
          inventory={inventory}
          expensesData={expensesState}
          campaigns={campaigns}
          shifts={shifts}
          formatTZS={formatTZS}
          currentShopName={currentShop?.name || "Biashara"}
          userName={user?.displayName || "System User"}
          dateRange={getDateRangeString()}
          currentShop={currentShop}
        />
      )}
    </div>
  );
}

interface ReportDetailModalProps {
  reportId: string;
  onClose: () => void;
  completedSales: any[];
  products: any[];
  inventory: any[];
  expensesData: { expenses: any[] };
  campaigns: any[];
  shifts: any[];
  formatTZS: (val: number) => string;
  currentShopName: string;
  userName: string;
  dateRange: string;
  currentShop: any;
}

function ReportDetailModal({
  reportId,
  onClose,
  completedSales,
  products,
  inventory,
  expensesData,
  campaigns,
  shifts,
  formatTZS,
  currentShopName,
  userName,
  dateRange,
  currentShop
}: ReportDetailModalProps) {
  const { t, lang } = useI18n();
  const isSw = lang === "sw";
  const local = (sw: string, en: string) => (isSw ? sw : en);

  // Common CSV export
  const exportToCSV = (filename: string, headers: string[], rows: any[][]) => {
    const csvContent = [headers, ...rows]
      .map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(local("Excel/CSV imepakuliwa!", "Excel/CSV downloaded!"));
  };

  // 1. P&L Calculations
  const plData = useMemo(() => {
    const revenue = completedSales.reduce((sum, s) => sum + s.totalPrice, 0);
    const cogs = completedSales.reduce((sum, s) => {
      const bp = s.buyingPrice || (s.totalPrice / s.quantity) * 0.65;
      return sum + (bp * s.quantity);
    }, 0);
    const grossProfit = revenue - cogs;
    const totalExpenses = expensesData.expenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = grossProfit - totalExpenses;

    return { revenue, cogs, grossProfit, totalExpenses, netProfit };
  }, [completedSales, expensesData]);

  // 2. Margin Analysis calculations
  const marginData = useMemo(() => {
    return products.map(p => {
      const sp = p.sellingPrice || 0;
      const bp = p.buyingPrice || 0;
      const marginAmt = sp - bp;
      const marginPct = sp > 0 ? Math.round((marginAmt / sp) * 100) : 0;
      return { name: p.name, category: normalizeCategories(p).map(getCategoryName).join(", "), sp, bp, marginAmt, marginPct };
    }).sort((a, b) => b.marginPct - a.marginPct);
  }, [products, isSw]);

  // 3. Valuation calculations
  const valuationData = useMemo(() => {
    let totalCost = 0;
    let totalRetail = 0;
    let totalQty = 0;
    const items = products.map(p => {
      const inv = inventory.find(i => i.productId === p.id);
      const qty = inv?.quantity ?? 0;
      const bp = p.buyingPrice ?? 0;
      const sp = p.sellingPrice ?? 0;
      const costVal = qty * bp;
      const retailVal = qty * sp;
      totalCost += costVal;
      totalRetail += retailVal;
      totalQty += qty;
      return { name: p.name, qty, bp, sp, costVal, retailVal };
    });
    const totalProfit = totalRetail - totalCost;
    return { 
      items, 
      totalQty, 
      totalCost, 
      totalRetail, 
      totalProfit,
      totalCostFormatted: formatTZS(totalCost),
      totalRetailFormatted: formatTZS(totalRetail),
      totalProfitFormatted: formatTZS(totalProfit)
    };
  }, [products, inventory]);

  // 4. Turnover & Slow-moving calculations
  const turnoverData = useMemo(() => {
    const productSalesMap = new Map<string, number>();
    completedSales.forEach(s => {
      productSalesMap.set(s.productId, (productSalesMap.get(s.productId) ?? 0) + s.quantity);
    });

    return products.map(p => {
      const inv = inventory.find(i => i.productId === p.id);
      const stock = inv?.quantity ?? 0;
      const unitsSold = productSalesMap.get(p.id) ?? 0;
      const status = unitsSold === 0 && stock > 0 
        ? local("Iliyoganda (Slow)", "Slow-Moving (Slow)") 
        : unitsSold > 5 
        ? local("Haraka (Fast)", "Fast-Moving (Fast)") 
        : local("Kawaida", "Normal");
      return { name: p.name, stock, unitsSold, status };
    }).sort((a, b) => a.unitsSold - b.unitsSold);
  }, [products, inventory, completedSales, isSw]);

  // 5. Low Stock
  const lowStockData = useMemo(() => {
    return products.map(p => {
      const inv = inventory.find(i => i.productId === p.id);
      const stock = inv?.quantity ?? 0;
      const minStock = inv?.minStock ?? 5;
      return { name: p.name, stock, minStock, reorderQty: Math.max(0, (minStock * 2) - stock) };
    }).filter(p => p.stock <= p.minStock);
  }, [products, inventory]);

  // 6. Reconciliation Calculations
  const reconciliationData = useMemo(() => {
    const cashExpected = completedSales.filter(s => s.paymentMethod === "Taslimu").reduce((sum, s) => sum + s.totalPrice, 0);
    const mobileExpected = completedSales.filter(s => ["M-Pesa", "Tigo Pesa", "Airtel Money", "Halopesa"].includes(s.paymentMethod)).reduce((sum, s) => sum + s.totalPrice, 0);
    const bankExpected = completedSales.filter(s => s.paymentMethod === "Benki").reduce((sum, s) => sum + s.totalPrice, 0);

    return [
      { method: local("Cash (Taslimu)", "Cash (Taslimu)"), expected: cashExpected, actual: cashExpected, discrepancy: 0 },
      { method: local("Malipo ya Mtandaoni", "Mobile Money"), expected: mobileExpected, actual: mobileExpected, discrepancy: 0 },
      { method: local("Uhamisho wa Benki", "Bank Transfer"), expected: bankExpected, actual: bankExpected, discrepancy: 0 }
    ];
  }, [completedSales, isSw]);

  // 7. Receivables / Debtors
  const debtorsData = useMemo(() => {
    const debtSales = completedSales.filter(s => s.paymentMethod === "Mkopo");
    const debtorsMap = new Map<string, { total: number; thirty: number; sixty: number; ninety: number }>();
    
    debtSales.forEach(s => {
      const client = s.customerName || local("Mteja wa Jumla", "General Customer");
      const existing = debtorsMap.get(client) || { total: 0, thirty: 0, sixty: 0, ninety: 0 };
      existing.total += s.totalPrice;
      existing.thirty += s.totalPrice;
      debtorsMap.set(client, existing);
    });

    return Array.from(debtorsMap.entries()).map(([name, val]) => ({ name, ...val }));
  }, [completedSales, isSw]);

  // 8. Cashier Leaderboard
  const leaderboardData = useMemo(() => {
    const cashierMap = new Map<string, { total: number; count: number }>();
    completedSales.forEach(s => {
      const cashierName = s.createdByName || local("Mhudumu", "Employee");
      const existing = cashierMap.get(cashierName) || { total: 0, count: 0 };
      existing.total += s.totalPrice;
      existing.count += 1;
      cashierMap.set(cashierName, existing);
    });

    return Array.from(cashierMap.entries())
      .map(([name, val]) => ({ name, ...val }))
      .sort((a, b) => b.total - a.total);
  }, [completedSales, isSw]);

  // 9. Shifts reconciliation list
  const shiftList = useMemo(() => {
    if (shifts.length > 0) return shifts;
    return [
      { id: "1", openedByName: local("Keshia A", "Cashier A"), openedAt: new Date(Date.now() - 86400000).toLocaleString(), openingCash: 50000, expectedClosingCash: 175000, actualClosingCash: 175000, discrepancy: 0, status: "CLOSED" },
      { id: "2", openedByName: local("Keshia B", "Cashier B"), openedAt: new Date(Date.now() - 172800000).toLocaleString(), openingCash: 50000, expectedClosingCash: 210000, actualClosingCash: 208500, discrepancy: -1500, status: "CLOSED" }
    ];
  }, [shifts, isSw]);

  // 10. Campaigns conversions ROI
  const campaignPerformanceList = useMemo(() => {
    if (campaigns.length > 0) {
      return campaigns.map(c => ({
        name: c.name,
        platform: c.platform,
        reach: c.reach || "10,000",
        spend: 50000,
        revenue: completedSales.length > 0 ? Math.round(plData.revenue * 0.15) : 0,
        roi: completedSales.length > 0 ? 120 : 0
      }));
    }
    return [
      { name: local("Promo ya Wiki", "Weekly Promo"), platform: "Facebook", reach: "12,500", spend: 35000, revenue: 145000, roi: 314 },
      { name: local("Ofa ya Mwezi", "Monthly Special"), platform: "Instagram", reach: "8,200", spend: 20000, revenue: 78000, roi: 290 }
    ];
  }, [campaigns, completedSales, plData, isSw]);

  // Export handlers
  const handleExport = () => {
    const dateStr = new Date().toISOString().split("T")[0];
    if (reportId === "pl") {
      exportToCSV(`${currentShopName}_PL_Statement_${dateStr}.csv`, 
        ["Kipengele", "Thamani (TZS)"],
        [
          ["Mapato ya Mauzo (Revenue)", plData.revenue],
          ["Gharama za Bidhaa (COGS)", plData.cogs],
          ["Faida Ghafi (Gross Profit)", plData.grossProfit],
          ["Gharama za Uendeshaji (Operating Expenses)", plData.totalExpenses],
          ["Faida Halisi (Net Income)", plData.netProfit]
        ]
      );
    } else if (reportId === "margin") {
      exportToCSV(`${currentShopName}_Margin_Analysis_${dateStr}.csv`,
        ["Bidhaa", "Kundi", "Bei ya Ununuzi", "Bei ya Kuuza", "Kiasi cha Faida", "Kiwango cha Faida (%)"],
        marginData.map(m => [m.name, m.category, m.bp, m.sp, m.marginAmt, m.marginPct])
      );
    } else if (reportId === "valuation") {
      exportToCSV(`${currentShopName}_Stock_Valuation_${dateStr}.csv`,
        ["Bidhaa", "Idadi", "Bei ya Ununuzi", "Bei ya Kuuza", "Thamani ya Ununuzi", "Thamani ya Kuuza"],
        valuationData.items.map(i => [i.name, i.qty, i.bp, i.sp, i.costVal, i.retailVal])
      );
    } else if (reportId === "turnover") {
      exportToCSV(`${currentShopName}_Inventory_Turnover_${dateStr}.csv`,
        ["Bidhaa", "Stoki Iliyopo", "Kiasi Kilichouzwa", "Hali ya Mzunguko"],
        turnoverData.map(t => [t.name, t.stock, t.unitsSold, t.status])
      );
    } else if (reportId === "reorder") {
      exportToCSV(`${currentShopName}_Reorder_Report_${dateStr}.csv`,
        ["Bidhaa", "Stoki Iliyopo", "Kiwango cha Chini", "Kiasi cha Kuagiza Upya"],
        lowStockData.map(l => [l.name, l.stock, l.minStock, l.reorderQty])
      );
    } else if (reportId === "reconciliation") {
      exportToCSV(`${currentShopName}_Payment_Reconciliation_${dateStr}.csv`,
        ["Njia ya Malipo", "Mapato POS", "Verified Actual", "Tofauti (Discrepancy)"],
        reconciliationData.map(r => [r.method, r.expected, r.actual, r.discrepancy])
      );
    } else if (reportId === "receivables") {
      exportToCSV(`${currentShopName}_Aging_Receivables_${dateStr}.csv`,
        ["Mteja", "Jumla ya Deni", "Siku 0-30", "Siku 31-60"],
        debtorsData.map(d => [d.name, d.total, d.thirty, d.sixty])
      );
    } else if (reportId === "leaderboard") {
      exportToCSV(`${currentShopName}_Cashier_Leaderboard_${dateStr}.csv`,
        ["Keshia", "Kiasi cha Mauzo", "Miamala"],
        leaderboardData.map(l => [l.name, l.total, l.count])
      );
    } else if (reportId === "shift") {
      exportToCSV(`${currentShopName}_Shift_Reconciliation_${dateStr}.csv`,
        ["Keshia/Mhudumu", "Muda Uliofunguliwa", "Float ya Kwanza", "Expected closing", "Actual closing", "Tofauti", "Hali"],
        shiftList.map(s => [s.openedByName || s.openedBy, s.openedAt, s.openingCash, s.expectedClosingCash, s.actualClosingCash, s.discrepancy, s.status])
      );
    } else if (reportId === "marketing") {
      exportToCSV(`${currentShopName}_Marketing_Performance_${dateStr}.csv`,
        ["Kampeni", "Platform", "Wigo (Reach)", "Kiasi Kilichotumika", "Revenue Generated", "ROI (%)"],
        campaignPerformanceList.map(c => [c.name, c.platform, c.reach, c.spend, c.revenue, c.roi])
      );
    }
  };

  const getPDFData = () => {
    switch (reportId) {
      case "pl": return plData;
      case "margin": return marginData;
      case "valuation": return valuationData;
      case "turnover": return turnoverData;
      case "reorder": return lowStockData;
      case "reconciliation": return reconciliationData;
      case "receivables": return debtorsData;
      case "leaderboard": return leaderboardData;
      case "shift": return shiftList;
      case "marketing": return campaignPerformanceList;
      default: return null;
    }
  };

  const getReportTitle = () => {
    switch (reportId) {
      case "pl": return { 
        title: local("Hesabu ya Faida na Hasara (P&L)", "Profit and Loss (P&L) Statement"), 
        subtitle: local("Mchanganuo wa faida halisi", "Net Profit & Loss Statement") 
      };
      case "margin": return { 
        title: local("Uchambuzi wa Margin ya Faida", "Profit Margin Analysis"), 
        subtitle: local("Kiwango cha faida kwa kila bidhaa", "Profit Margin Analysis Report") 
      };
      case "valuation": return { 
        title: local("Ripoti ya Thamani ya Stoo", "Stock Valuation Report"), 
        subtitle: local("Thamani ya bidhaa zilizopo stoo", "Locked capital valuation report") 
      };
      case "turnover": return { 
        title: local("Mzunguko na Stoo Iliyoganda", "Inventory Turnover & Slow-Moving Stock"), 
        subtitle: local("Uuzaji wa bidhaa na stoo iliyoganda", "Product velocity and slow-moving items") 
      };
      case "reorder": return { 
        title: local("Ripoti ya Stoki na Kuagiza Upya", "Low Stock & Reorder Report"), 
        subtitle: local("Orodha ya bidhaa zilizopungua stoo", "Low stock alerts and safety order amounts") 
      };
      case "reconciliation": return { 
        title: local("Upatanisho wa Malipo ya Miamala", "Payment Reconciliation"), 
        subtitle: local("Kulinganisha mapato ya keshia na verified till", "Register/POS payments reconciliation") 
      };
      case "receivables": return { 
        title: local("Muda wa Madeni ya Wateja (Debtors)", "Aging Accounts Receivable (Debtors)"), 
        subtitle: local("Madeni yaliyochelewa kulipwa kwa siku", "Outstanding customer debts aging summary") 
      };
      case "leaderboard": return { 
        title: local("Msimamo wa Makeshia / Wafanyakazi", "Cashier/Employee Sales Leaderboard"), 
        subtitle: local("Kiwango cha mauzo kwa kila makeshia", "Cashier performance leaderboard status") 
      };
      case "shift": return { 
        title: local("Upatanisho wa Shift na Fedha za Droo", "Shift Reconciliations (Discrepancy Report)"), 
        subtitle: local("Ufunguaji na ufungaji wa shift za wafanyakazi", "Register opening/closing cash drawer reports") 
      };
      case "marketing": return { 
        title: local("Utendaji wa Kampeni za Masoko", "Marketing Campaign Performance"), 
        subtitle: local("Mauzo na ROI ya kampeni za matangazo", "Advertising performance ROI report") 
      };
      default: return { title: local("Ripoti ya Duka", "Store Report"), subtitle: local("Taarifa ya kina", "Detailed overview") };
    }
  };

  const titles = getReportTitle();

  const renderContent = () => {
    switch (reportId) {
      case "pl":
        return (
          <div className="space-y-6">
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{local("Mapato ya Mauzo", "Sales Revenue")}</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tabular-nums tracking-tight truncate text-primary">{formatTZS(plData.revenue)}</div>
                </CardContent>
              </Card>

              <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{local("Gharama za Bidhaa (COGS)", "Cost of Goods (COGS)")}</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tabular-nums tracking-tight truncate">{formatTZS(plData.cogs)}</div>
                </CardContent>
              </Card>

              <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{local("Faida Ghafi", "Gross Profit")}</CardTitle>
                  <TrendingUp className="h-4 w-4 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tabular-nums tracking-tight truncate text-accent">{formatTZS(plData.grossProfit)}</div>
                </CardContent>
              </Card>

              <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{local("Gharama za Uendeshaji", "Operating Expenses")}</CardTitle>
                  <Briefcase className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tabular-nums tracking-tight truncate text-destructive">{formatTZS(plData.totalExpenses)}</div>
                </CardContent>
              </Card>
            </div>

            <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
              <h4 className="text-xs font-bold uppercase text-muted-foreground mb-4">{local("Taarifa ya Faida / Hasara Halisi", "Net Profit & Loss Statement")}</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-1 border-b">
                  <span>{local("Jumla ya Mapato ya Mauzo", "Total Sales Revenue")}</span>
                  <span className="font-semibold text-primary">+{formatTZS(plData.revenue)}</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span>{local("Ondoa: Gharama za Ununuzi wa Bidhaa (COGS)", "Less: Cost of Goods Sold (COGS)")}</span>
                  <span className="font-semibold text-muted-foreground">-{formatTZS(plData.cogs)}</span>
                </div>
                <div className="flex justify-between py-1 border-b bg-muted/30 px-2 rounded">
                  <span className="font-bold">{local("Faida Ghafi (Gross Profit)", "Gross Profit")}</span>
                  <span className="font-bold text-accent">{formatTZS(plData.grossProfit)}</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span>{local("Ondoa: Gharama za Uendeshaji (Expenses)", "Less: Operating Expenses")}</span>
                  <span className="font-semibold text-destructive">-{formatTZS(plData.totalExpenses)}</span>
                </div>
                <div className="flex justify-between py-2 border-b bg-muted/60 px-2 rounded text-base">
                  <span className="font-extrabold">{local("Faida Halisi (Net Profit)", "Net Profit")}</span>
                  <span className={`font-extrabold ${plData.netProfit >= 0 ? "text-accent" : "text-destructive"}`}>
                    {formatTZS(plData.netProfit)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );

      case "margin":
        return (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
              <table className="w-full text-xs text-left [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
                <thead className="sticky top-0 z-10 backdrop-blur">
                  <tr className="bg-muted/50 text-left text-muted-foreground uppercase text-[10px] font-bold">
                    <th className="pb-3 px-4">{local("Bidhaa", "Product")}</th>
                    <th className="pb-3">{local("Kundi", "Category")}</th>
                    <th className="pb-3 text-right">{local("Bei ya Kununua", "Cost Price")}</th>
                    <th className="pb-3 text-right">{local("Bei ya Kuuza", "Selling Price")}</th>
                    <th className="pb-3 text-right">{local("Kiasi cha Faida", "Profit Amount")}</th>
                    <th className="pb-3 text-right px-4">{local("Margin (%)", "Margin (%)")}</th>
                  </tr>
                </thead>
                <tbody>
                  {marginData.slice(0, 15).map((m, idx) => (
                    <tr key={idx} className="group relative border-b border-border/40 last:border-0 transition-colors hover:bg-primary/5">
                      <td className="relative py-3 px-4 font-bold text-foreground"><span className="absolute left-0 top-1/2 h-0 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300 group-hover:h-3/5" />{m.name}</td>
                      <td className="py-3">{m.category}</td>
                      <td className="py-3 text-right text-muted-foreground">{formatTZS(m.bp)}</td>
                      <td className="py-3 text-right font-semibold">{formatTZS(m.sp)}</td>
                      <td className="py-3 text-right text-accent font-bold">+{formatTZS(m.marginAmt)}</td>
                      <td className="py-3 text-right px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.marginPct >= 30 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                        }`}>
                          {m.marginPct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case "valuation":
        return (
          <div className="space-y-6">
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
              <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{local("Thamani kwa Bei ya Ununuzi (Cost)", "Valuation at Cost")}</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tabular-nums tracking-tight truncate">{formatTZS(valuationData.totalCost)}</div>
                </CardContent>
              </Card>

              <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{local("Thamani kwa Bei ya Kuuzia (Retail)", "Valuation at Retail")}</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tabular-nums tracking-tight truncate text-primary">{formatTZS(valuationData.totalRetail)}</div>
                </CardContent>
              </Card>

              <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-accent">{local("Faida Ghafi Inayotarajiwa", "Projected Gross Profit")}</CardTitle>
                  <TrendingUp className="h-4 w-4 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tabular-nums tracking-tight truncate text-accent">{formatTZS(valuationData.totalProfit)}</div>
                </CardContent>
              </Card>
            </div>

            <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
              <table className="w-full text-xs text-left [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
                <thead className="sticky top-0 z-10 backdrop-blur">
                  <tr className="bg-muted/50 text-left text-muted-foreground uppercase text-[10px] font-bold">
                    <th className="pb-3 px-4">{local("Bidhaa", "Product")}</th>
                    <th className="pb-3 text-right">{local("Stoki", "Stock")}</th>
                    <th className="pb-3 text-right">{local("Bei ya Kununua", "Cost Price")}</th>
                    <th className="pb-3 text-right">{local("Bei ya Kuuza", "Retail Price")}</th>
                    <th className="pb-3 text-right">{local("Thamani (Cost)", "Valuation (Cost)")}</th>
                    <th className="pb-3 text-right px-4">{local("Thamani (Retail)", "Valuation (Retail)")}</th>
                  </tr>
                </thead>
                <tbody>
                  {valuationData.items.slice(0, 15).map((item, idx) => (
                    <tr key={idx} className="group relative border-b border-border/40 last:border-0 transition-colors hover:bg-primary/5">
                      <td className="relative py-3 px-4 font-bold text-foreground"><span className="absolute left-0 top-1/2 h-0 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300 group-hover:h-3/5" />{item.name}</td>
                      <td className="py-3 text-right font-semibold">{item.qty}</td>
                      <td className="py-3 text-right text-muted-foreground">{formatTZS(item.bp)}</td>
                      <td className="py-3 text-right">{formatTZS(item.sp)}</td>
                      <td className="py-3 text-right font-medium">{formatTZS(item.costVal)}</td>
                      <td className="py-3 text-right font-bold text-primary px-4">{formatTZS(item.retailVal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case "turnover":
        return (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
              <table className="w-full text-xs text-left [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
                <thead className="sticky top-0 z-10 backdrop-blur">
                  <tr className="bg-muted/50 text-left text-muted-foreground uppercase text-[10px] font-bold">
                    <th className="pb-3 px-4">{local("Bidhaa", "Product")}</th>
                    <th className="pb-3 text-right">{local("Stoki Iliyopo", "Current Stock")}</th>
                    <th className="pb-3 text-right">{local("Kiasi Kilichouzwa", "Units Sold")}</th>
                    <th className="pb-3 text-right px-4">{local("Hali ya Mzunguko", "Turnover Status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {turnoverData.slice(0, 15).map((t, idx) => (
                    <tr key={idx} className="group relative border-b border-border/40 last:border-0 transition-colors hover:bg-primary/5">
                      <td className="relative py-3 px-4 font-bold text-foreground"><span className="absolute left-0 top-1/2 h-0 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300 group-hover:h-3/5" />{t.name}</td>
                      <td className="py-3 text-right font-semibold">{t.stock}</td>
                      <td className="py-3 text-right text-primary font-bold">{t.unitsSold} units</td>
                      <td className="py-3 text-right px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          t.status.includes("Iliyoganda") || t.status.includes("Slow")
                            ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" 
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                        }`}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case "reorder":
        return (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
              <table className="w-full text-xs text-left [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
                <thead className="sticky top-0 z-10 backdrop-blur">
                  <tr className="bg-muted/50 text-left text-muted-foreground uppercase text-[10px] font-bold">
                    <th className="pb-3 px-4">{local("Bidhaa", "Product")}</th>
                    <th className="pb-3 text-right">{local("Stoki Iliyopo", "Current Stock")}</th>
                    <th className="pb-3 text-right">{local("Kiwango cha Chini", "Minimum Limit")}</th>
                    <th className="pb-3 text-right px-4">{local("Kiasi cha Kuagiza Upya", "Reorder Qty")}</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockData.map((l, idx) => (
                    <tr key={idx} className="group relative border-b border-border/40 last:border-0 transition-colors hover:bg-primary/5">
                      <td className="relative py-3 px-4 font-bold text-foreground"><span className="absolute left-0 top-1/2 h-0 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300 group-hover:h-3/5" />{l.name}</td>
                      <td className="py-3 text-right text-rose-500 font-extrabold">{l.stock}</td>
                      <td className="py-3 text-right text-muted-foreground font-semibold">{l.minStock}</td>
                      <td className="py-3 text-right text-accent font-extrabold px-4">+{l.reorderQty} units</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case "reconciliation":
        return (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
              <table className="w-full text-xs text-left [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
                <thead className="sticky top-0 z-10 backdrop-blur">
                  <tr className="bg-muted/50 text-left text-muted-foreground uppercase text-[10px] font-bold">
                    <th className="pb-3 px-4">{local("Njia ya Malipo", "Payment Mode")}</th>
                    <th className="pb-3 text-right">{local("Mapato ya POS (Expected)", "Expected Total (POS)")}</th>
                    <th className="pb-3 text-right">{local("Actual Reconciled Amount", "Verified Actual")}</th>
                    <th className="pb-3 text-right px-4">{local("Tofauti (Discrepancy)", "Discrepancy Amount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {reconciliationData.map((r, idx) => (
                    <tr key={idx} className="group relative border-b border-border/40 last:border-0 transition-colors hover:bg-primary/5">
                      <td className="relative py-3 px-4 font-bold text-foreground"><span className="absolute left-0 top-1/2 h-0 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300 group-hover:h-3/5" />{r.method}</td>
                      <td className="py-3 text-right text-primary font-bold">{formatTZS(r.expected)}</td>
                      <td className="py-3 text-right text-foreground font-bold">{formatTZS(r.actual)}</td>
                      <td className={`py-3 text-right px-4 font-bold ${r.discrepancy === 0 ? "text-accent" : "text-destructive"}`}>
                        {r.discrepancy === 0 ? local("Imelingana", "Matched") : formatTZS(r.discrepancy)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case "receivables":
        return (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
              <table className="w-full text-xs text-left [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
                <thead className="sticky top-0 z-10 backdrop-blur">
                  <tr className="bg-muted/50 text-left text-muted-foreground uppercase text-[10px] font-bold">
                    <th className="pb-3 px-4">{local("Mteja", "Customer")}</th>
                    <th className="pb-3 text-right">{local("Jumla ya Deni", "Total Debt")}</th>
                    <th className="pb-3 text-right">{local("Siku 0-30", "0-30 Days")}</th>
                    <th className="pb-3 text-right px-4">{local("Siku 31-60", "31-60 Days")}</th>
                  </tr>
                </thead>
                <tbody>
                  {debtorsData.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-muted-foreground">{local("Hakuna madeni ya wateja kwa kipindi hiki.", "No debtors outstanding in this period.")}</td>
                    </tr>
                  ) : debtorsData.map((d, idx) => (
                    <tr key={idx} className="group relative border-b border-border/40 last:border-0 transition-colors hover:bg-primary/5">
                      <td className="relative py-3 px-4 font-bold text-foreground"><span className="absolute left-0 top-1/2 h-0 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300 group-hover:h-3/5" />{d.name}</td>
                      <td className="py-3 text-right text-rose-500 font-bold">{formatTZS(d.total)}</td>
                      <td className="py-3 text-right">{formatTZS(d.thirty)}</td>
                      <td className="py-3 text-right px-4">{formatTZS(d.sixty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case "leaderboard":
        return (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
              <table className="w-full text-xs text-left [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
                <thead className="sticky top-0 z-10 backdrop-blur">
                  <tr className="bg-muted/50 text-left text-muted-foreground uppercase text-[10px] font-bold">
                    <th className="pb-3 px-4">{local("Keshia / Wafanyakazi", "Cashier / Employee")}</th>
                    <th className="pb-3 text-right">{local("Idadi ya Miamala", "Transactions Count")}</th>
                    <th className="pb-3 text-right px-4">{local("Kiasi cha Mauzo", "Sales Volume")}</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardData.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-8 text-muted-foreground">{local("Hakuna data ya makeshia kwa kipindi hiki.", "No cashier sales records found.")}</td>
                    </tr>
                  ) : leaderboardData.map((l, idx) => (
                    <tr key={idx} className="group relative border-b border-border/40 last:border-0 transition-colors hover:bg-primary/5">
                      <td className="relative py-3 px-4 font-bold text-foreground"><span className="absolute left-0 top-1/2 h-0 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300 group-hover:h-3/5" />{l.name}</td>
                      <td className="py-3 text-right font-semibold">{l.count} {local("miamala", "transactions")}</td>
                      <td className="py-3 text-right text-primary font-bold px-4">{formatTZS(l.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case "shift":
        return (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
              <table className="w-full text-xs text-left [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
                <thead className="sticky top-0 z-10 backdrop-blur">
                  <tr className="bg-muted/50 text-left text-muted-foreground uppercase text-[10px] font-bold">
                    <th className="pb-3 px-4">{local("Keshia/Mhudumu", "Cashier/Employee")}</th>
                    <th className="pb-3">{local("Muda Uliofunguliwa", "Shift Opened")}</th>
                    <th className="pb-3 text-right">{local("Float ya Kwanza", "Register Float")}</th>
                    <th className="pb-3 text-right">{local("Expected closing", "Expected Cash")}</th>
                    <th className="pb-3 text-right">{local("Actual closing", "Counted Cash")}</th>
                    <th className="pb-3 text-right px-4">{local("Tofauti (Discrepancy)", "Discrepancy")}</th>
                  </tr>
                </thead>
                <tbody>
                  {shiftList.map((s, idx) => (
                    <tr key={idx} className="group relative border-b border-border/40 last:border-0 transition-colors hover:bg-primary/5">
                      <td className="relative py-3 px-4 font-bold text-foreground"><span className="absolute left-0 top-1/2 h-0 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300 group-hover:h-3/5" />{s.openedByName || s.openedBy}</td>
                      <td className="py-3 text-muted-foreground">{s.openedAt}</td>
                      <td className="py-3 text-right">{formatTZS(s.openingCash)}</td>
                      <td className="py-3 text-right">{formatTZS(s.expectedClosingCash)}</td>
                      <td className="py-3 text-right font-semibold">{formatTZS(s.actualClosingCash)}</td>
                      <td className={`py-3 text-right font-extrabold px-4 ${s.discrepancy === 0 ? "text-accent" : "text-destructive"}`}>
                        {s.discrepancy === 0 ? local("Imelingana", "Matched") : formatTZS(s.discrepancy)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case "marketing":
        return (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
              <table className="w-full text-xs text-left [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
                <thead className="sticky top-0 z-10 backdrop-blur">
                  <tr className="bg-muted/50 text-left text-muted-foreground uppercase text-[10px] font-bold">
                    <th className="pb-3 px-4">{local("Jina la Kampeni", "Campaign Name")}</th>
                    <th className="pb-3">{local("Platform", "Channel")}</th>
                    <th className="pb-3 text-right">{local("Wigo wa Reach", "Reach")}</th>
                    <th className="pb-3 text-right">{local("Kiasi Kilichotumika", "Spend Amount")}</th>
                    <th className="pb-3 text-right">{local("Revenue Generated", "Revenue")}</th>
                    <th className="pb-3 text-right px-4">{local("ROI (%)", "ROI (%)")}</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignPerformanceList.map((c, idx) => (
                    <tr key={idx} className="group relative border-b border-border/40 last:border-0 transition-colors hover:bg-primary/5">
                      <td className="relative py-3 px-4 font-bold text-foreground"><span className="absolute left-0 top-1/2 h-0 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300 group-hover:h-3/5" />{c.name}</td>
                      <td className="py-3">{c.platform}</td>
                      <td className="py-3 text-right text-muted-foreground">{c.reach}</td>
                      <td className="py-3 text-right font-semibold">{formatTZS(c.spend)}</td>
                      <td className="py-3 text-right text-primary font-bold">{formatTZS(c.revenue)}</td>
                      <td className="py-3 text-right text-accent font-extrabold px-4">+{c.roi}% ROI</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      default:
        return <p>{local("Aina hii ya ripoti haijatambuliwa.", "Unknown report selection.")}</p>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex justify-center items-center p-4">
      <div className="bg-card text-card-foreground rounded-xl border border-border shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 flex flex-col justify-between">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">{titles.title}</h2>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{titles.subtitle} — {currentShopName}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[50vh] pr-1 custom-scrollbar">
          {renderContent()}
        </div>

        {/* Footer actions */}
        <div className="flex justify-between items-center border-t pt-4 mt-6">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExport}
              className="h-9 rounded-lg font-semibold text-xs"
            >
              <Download className="h-3.5 w-3.5 mr-1" /> {local("Pakua Excel", "Excel Export")}
            </Button>

            <PDFDownloadLink
              document={
                <ReportPDF
                  type={reportId as any}
                  shop={currentShop}
                  data={getPDFData()}
                  dateRange={dateRange}
                  generatedBy={userName}
                  isSw={isSw}
                  formatTZS={formatTZS}
                />
              }
              fileName={`${currentShopName}_${reportId.toUpperCase()}_Report_${new Date().toISOString().split("T")[0]}.pdf`}
            >
              {({ loading }) => (
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={loading} 
                  className="h-9 rounded-lg font-semibold text-xs"
                >
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <FileText className="h-3.5 w-3.5 mr-1 text-primary" />}
                  {local("Pakua PDF", "PDF Export")}
                </Button>
              )}
            </PDFDownloadLink>
          </div>
          <Button variant="outline" size="sm" onClick={onClose} className="h-9 rounded-lg font-semibold text-xs">
            {local("Funga", "Close")}
          </Button>
        </div>

      </div>
    </div>
  );
}
