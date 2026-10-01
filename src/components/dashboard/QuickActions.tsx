import { useNavigate } from "react-router-dom";
import { 
  ShoppingCart, Plus, ShoppingBag, Truck, Megaphone, DollarSign 
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { THEME_COLORS } from "@/lib/theme";
import type { UserRolePermissions } from "@/hooks/useUserRole";

interface QuickActionsProps {
  permissions: UserRolePermissions;
}

export function QuickActions({ permissions }: QuickActionsProps) {
  const navigate = useNavigate();
  const { t } = useI18n();

  const actions = [
    {
      id: "sell",
      label: t("dashboard.recordSale" as any) || "Sell Product",
      desc: t("dashboard.qa.recordSaleDesc" as any) || "Record a new sale",
      icon: ShoppingCart,
      variant: "info" as const,
      path: "/dashboard/sales",
      visible: true,
    },
    {
      id: "add_product",
      label: t("dashboard.addProduct" as any) || "Add Product",
      desc: t("dashboard.qa.addProductDesc" as any) || "Create inventory item",
      icon: Plus,
      variant: "success" as const,
      path: "/dashboard/products",
      visible: permissions.canAddProduct,
    },
    {
      id: "orders",
      label: t("dashboard.viewOrders" as any) || "View Orders",
      desc: t("dashboard.qa.viewOrdersDesc" as any) || "Process customer orders",
      icon: ShoppingBag,
      variant: "warning" as const,
      path: "/dashboard/orders",
      visible: true,
    },
    {
      id: "purchase_stock",
      label: t("dashboard.qa.purchaseStock" as any) || "Purchase Stock",
      desc: t("dashboard.qa.purchaseStockDesc" as any) || "Manage suppliers & restock",
      icon: Truck,
      variant: "primary" as const,
      path: "/dashboard/suppliers",
      visible: permissions.canAddSupplier,
    },
    {
      id: "promote",
      label: t("dashboard.qa.promote" as any) || "Promote Product",
      desc: t("dashboard.qa.promoteDesc" as any) || "Social & online ads",
      icon: Megaphone,
      variant: "accent" as const,
      path: "/dashboard/marketing",
      visible: permissions.canAccessMarketing,
    },
    {
      id: "expense",
      label: t("expenses.record" as any) || "Record Expense",
      desc: t("dashboard.qa.expenseDesc" as any) || "Log shop operating costs",
      icon: DollarSign,
      variant: "danger" as const,
      path: "/dashboard/expenses",
      visible: permissions.canAccessFinance,
    },
  ].filter((a) => a.visible);

  return (
    <div className="space-y-3 fade-in-up">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground tracking-tight">
          {t("dashboard.quickActions")}
        </h2>
        <span className="text-xs text-muted-foreground">{t("dashboard.qa.subtitle" as any) || "One-click business shortcuts"}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {actions.map((action) => {
          const colors = THEME_COLORS[action.variant];
          return (
            <button
              key={action.id}
              onClick={() => navigate(action.path)}
              className={`flex flex-col items-center justify-center text-center p-4 rounded-2xl border transition-all duration-200 shadow-2xs active:scale-95 group ${colors.bg} ${colors.text} ${colors.border} ${colors.hoverBg}`}
            >
              <div className={`p-3 rounded-xl shadow-2xs mb-2 group-hover:scale-110 transition-transform ${colors.fill}`}>
                <action.icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-extrabold tracking-tight leading-tight line-clamp-1 group-hover:text-foreground transition-colors">
                {action.label}
              </span>
              <span className="text-[10px] text-muted-foreground group-hover:text-foreground/80 font-medium mt-0.5 line-clamp-1 transition-colors">
                {action.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
