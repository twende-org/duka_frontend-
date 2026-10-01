import type { AppRole } from "@/types";

/** Granular permissions per role */
export interface RolePermissions {
  canViewDashboardProfit: boolean;
  canViewDashboardStock: boolean;
  // Products
  canAddProduct: boolean;
  canEditProduct: boolean;
  canDeleteProduct: boolean;
  // Inventory
  canAdjustInventory: boolean;
  // Sales
  canAddSale: boolean;
  canDeleteSale: boolean;
  canConfirmDraft: boolean;
  canEditDraft: boolean;
  canDeleteDraft: boolean;
  // Expenses
  canAddExpense: boolean;
  canEditExpense: boolean;
  canDeleteExpense: boolean;
  // Suppliers
  canAddSupplier: boolean;
  canEditSupplier: boolean;
  canDeleteSupplier: boolean;
  // Shops
  canManageShops: boolean;
  // Users
  canManageUsers: boolean;
  
  // Navigation Module Access Capabilities
  canAccessMarketing: boolean;
  canAccessFinance: boolean;
  canAccessStore: boolean;
  canAccessBranches: boolean;
  canViewRecentActivity: boolean;
}

export const rolePermissions: Record<AppRole, RolePermissions> = {
  owner: {
    canViewDashboardProfit: true,
    canViewDashboardStock: true,
    canAddProduct: true,
    canEditProduct: true,
    canDeleteProduct: true,
    canAdjustInventory: true,
    canAddSale: true,
    canDeleteSale: true,
    canConfirmDraft: true,
    canEditDraft: true,
    canDeleteDraft: true,
    canAddExpense: true,
    canEditExpense: true,
    canDeleteExpense: true,
    canAddSupplier: true,
    canEditSupplier: true,
    canDeleteSupplier: true,
    canManageShops: true,
    canManageUsers: true,
    canAccessMarketing: true,
    canAccessFinance: true,
    canAccessStore: true,
    canAccessBranches: true,
    canViewRecentActivity: true,
  },
  manager: {
    canViewDashboardProfit: true,
    canViewDashboardStock: true,
    canAddProduct: true,
    canEditProduct: true,
    canDeleteProduct: false,
    canAdjustInventory: true,
    canAddSale: true,
    canDeleteSale: false,
    canConfirmDraft: true,
    canEditDraft: true,
    canDeleteDraft: true,
    canAddExpense: true,
    canEditExpense: true,
    canDeleteExpense: false,
    canAddSupplier: true,
    canEditSupplier: true,
    canDeleteSupplier: false,
    canManageShops: false,
    canManageUsers: false,
    canAccessMarketing: true,
    canAccessFinance: true,
    canAccessStore: true,
    canAccessBranches: true,
    canViewRecentActivity: false,
  },
  attendant: {
    canViewDashboardProfit: false,
    canViewDashboardStock: false,
    canAddProduct: false,
    canEditProduct: false,
    canDeleteProduct: false,
    canAdjustInventory: false,
    canAddSale: true,
    canDeleteSale: false,
    canConfirmDraft: false,
    canEditDraft: true,
    canDeleteDraft: false,
    canAddExpense: false,
    canEditExpense: false,
    canDeleteExpense: false,
    canAddSupplier: false,
    canEditSupplier: false,
    canDeleteSupplier: false,
    canManageShops: false,
    canManageUsers: false,
    canAccessMarketing: false,
    canAccessFinance: false,
    canAccessStore: false,
    canAccessBranches: false,
    canViewRecentActivity: false,
  },
};

export function getPermissions(role: AppRole | null): RolePermissions {
  if (!role) return rolePermissions.attendant; // most restrictive fallback
  return rolePermissions[role];
}
