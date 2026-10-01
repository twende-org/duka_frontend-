import {
  LayoutDashboard, Receipt, ShoppingBag, Users,
  Package, Boxes, Truck, Building2, Globe, Megaphone, Share2,
  ReceiptText, BarChart3, Bot, Store, GitBranch, UserCog, Settings,
  TrendingUp, Sparkles, LucideIcon
} from "lucide-react";
import type { ThemeVariant } from "@/lib/theme";
import type { RolePermissions } from "@/lib/permissions";

export interface NavItemConfig {
  id: string;
  labelKey: string;
  defaultLabel: string;
  path: string;
  icon: LucideIcon;
  requiredPermission?: keyof RolePermissions;
  badgeKey?: string;
  requiresShop?: boolean;
}

export interface NavGroupConfig {
  id: string;
  titleKey: string;
  defaultTitle: string;
  icon: LucideIcon;
  variant: ThemeVariant;
  items: NavItemConfig[];
}

export const navigationGroups: NavGroupConfig[] = [
  {
    id: "overview",
    titleKey: "group.overview",
    defaultTitle: "Muhtasari",
    icon: LayoutDashboard,
    variant: "primary",
    items: [
      {
        id: "dashboard",
        labelKey: "nav.dashboard",
        defaultLabel: "Dashibodi",
        path: "/dashboard",
        icon: LayoutDashboard,
        requiresShop: false,
      },
    ],
  },
  {
    id: "sales_commerce",
    titleKey: "group.salesCommerce",
    defaultTitle: "Uza Biashara",
    icon: Receipt,
    variant: "success",
    items: [
      {
        id: "sales",
        labelKey: "nav.sales",
        defaultLabel: "Mauzo (POS)",
        path: "/dashboard/sales",
        icon: Receipt,
        requiredPermission: "canAddSale",
        requiresShop: true,
      },
      {
        id: "orders",
        labelKey: "nav.orders",
        defaultLabel: "Oda (Orders)",
        path: "/dashboard/orders",
        icon: ShoppingBag,
        requiresShop: true,
      },
      {
        id: "fulfillment",
        labelKey: "nav.fulfillment",
        defaultLabel: "Fulfillment & Delivery",
        path: "/dashboard/fulfillment",
        icon: Truck,
        requiresShop: true,
      },
      {
        id: "customers",
        labelKey: "nav.customers",
        defaultLabel: "Wateja",
        path: "/dashboard/customers",
        icon: Users,
        requiresShop: true,
      },
    ],
  },
  {
    id: "inventory_supply",
    titleKey: "group.inventorySupply",
    defaultTitle: "Bidhaa & Stoo",
    icon: Boxes,
    variant: "warning",
    items: [
      {
        id: "products",
        labelKey: "nav.products",
        defaultLabel: "Bidhaa",
        path: "/dashboard/products",
        icon: Package,
        requiresShop: true,
      },
      {
        id: "inventory",
        labelKey: "nav.inventory",
        defaultLabel: "Stoo & Stock",
        path: "/dashboard/inventory",
        icon: Boxes,
        requiresShop: true,
      },
      {
        id: "purchases",
        labelKey: "nav.purchases",
        defaultLabel: "Manunuzi (Purchases)",
        path: "/dashboard/purchases",
        icon: Truck,
        requiredPermission: "canAdjustInventory",
        requiresShop: true,
      },
      {
        id: "b2b_orders",
        labelKey: "nav.b2bOrders",
        defaultLabel: "B2B Orders (Incoming)",
        path: "/dashboard/b2b-orders",
        icon: Truck,
        requiredPermission: "canAddSupplier",
        requiresShop: true,
      },
      {
        id: "suppliers",
        labelKey: "nav.suppliers",
        defaultLabel: "Wasambazaji (Suppliers)",
        path: "/dashboard/suppliers",
        icon: Building2,
        requiredPermission: "canAddSupplier",
        requiresShop: true,
      },
    ],
  },
  {
    id: "growth_marketing",
    titleKey: "group.growthMarketing",
    defaultTitle: "Kukuza Biashara",
    icon: TrendingUp,
    variant: "accent",
    items: [
      {
        id: "store",
        labelKey: "nav.store",
        defaultLabel: "Duka la Mtandaoni",
        path: "/dashboard/store",
        icon: Globe,
        requiredPermission: "canAccessStore",
        requiresShop: true,
      },
      {
        id: "marketing",
        labelKey: "nav.marketing",
        defaultLabel: "Kampeni za Masoko",
        path: "/dashboard/marketing",
        icon: Megaphone,
        requiredPermission: "canAccessMarketing",
        requiresShop: true,
      },
      {
        id: "social",
        labelKey: "nav.social",
        defaultLabel: "Akaunti za Kijamii",
        path: "/dashboard/social",
        icon: Share2,
        requiredPermission: "canAccessMarketing",
        requiresShop: true,
      },
    ],
  },
  {
    id: "finance_analytics",
    titleKey: "group.financeAnalytics",
    defaultTitle: "Fedha na Uchambuzi",
    icon: BarChart3,
    variant: "info",
    items: [
      {
        id: "accounts_receivable",
        labelKey: "nav.accountsReceivable",
        defaultLabel: "Accounts Receivable",
        path: "/dashboard/accounts-receivable",
        icon: ReceiptText,
        requiredPermission: "canAccessFinance",
        requiresShop: true,
      },
      {
        id: "accounts_payable",
        labelKey: "nav.accountsPayable",
        defaultLabel: "Accounts Payable",
        path: "/dashboard/accounts-payable",
        icon: ReceiptText,
        requiredPermission: "canAccessFinance",
        requiresShop: true,
      },
      {
        id: "expenses",
        labelKey: "nav.expenses",
        defaultLabel: "Matumizi",
        path: "/dashboard/expenses",
        icon: ReceiptText,
        requiredPermission: "canAccessFinance",
        requiresShop: true,
      },
      {
        id: "reports",
        labelKey: "nav.reports",
        defaultLabel: "Ripoti Za Biashara",
        path: "/dashboard/reports",
        icon: BarChart3,
        requiredPermission: "canAccessFinance",
        requiresShop: true,
      },
    ],
  },
  {
    id: "ai_intelligence",
    titleKey: "group.aiIntelligence",
    defaultTitle: "AI Business Intelligence",
    icon: Sparkles,
    variant: "primary",
    items: [
      {
        id: "command_center",
        labelKey: "nav.commandCenter",
        defaultLabel: "Command Center",
        path: "/dashboard/command-center",
        icon: BarChart3,
        requiresShop: true,
      },
    ],
  },
  {
    id: "management",
    titleKey: "group.management",
    defaultTitle: "Usimamizi",
    icon: Settings,
    variant: "muted",
    items: [
      {
        id: "shops",
        labelKey: "nav.shops",
        defaultLabel: "Maduka Yangu",
        path: "/dashboard/shops",
        icon: Store,
        requiredPermission: "canManageShops",
        requiresShop: false,
      },
      {
        id: "branches",
        labelKey: "nav.branches",
        defaultLabel: "Matawi ya Biashara",
        path: "/dashboard/branches",
        icon: GitBranch,
        requiredPermission: "canAccessBranches",
        requiresShop: true,
      },
      {
        id: "users",
        labelKey: "nav.users",
        defaultLabel: "Wafanyakazi",
        path: "/dashboard/users",
        icon: UserCog,
        requiredPermission: "canManageUsers",
        requiresShop: true,
      },
      {
        id: "settings",
        labelKey: "nav.settings",
        defaultLabel: "Mipangilio",
        path: "/dashboard/settings",
        icon: Settings,
        requiresShop: false,
      },
    ],
  },
];
