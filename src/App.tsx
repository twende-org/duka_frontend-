import { Provider } from "react-redux";
import { store } from "@/store";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { lazy, Suspense } from "react";
import { I18nProvider } from "@/lib/i18n";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { ThemeProvider } from "@/components/theme-provider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

import AuthProvider from "@/components/AuthProvider";
import AuthGuard from "@/components/AuthGuard";
import ErrorBoundary from "@/components/ErrorBoundary";
import AppLayout from "@/components/layout/AppLayout";
import RoleGuard from "@/components/RoleGuard";
import OrganizationSchema from "@/components/seo/OrganizationSchema";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import RedirectIfAuth from "@/components/RedirectIfAuth";
import PostLoginRedirect from "@/components/PostLoginRedirect";
import { FullPageLoader } from "@/components/common/Loader";

// Pages (lazy-loaded for optimization)
const Landing = lazy(() => import("@/pages/Landing"));
const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const BusinessSetupWizard = lazy(() => import("@/pages/BusinessSetupWizard"));
const ShopSetupWizard = lazy(() => import("@/pages/ShopSetupWizard"));

// SEO landing pages (lazy)
const DukaPosSystem = lazy(() => import("@/pages/seo/DukaPosSystem"));
const TwendeDigital = lazy(() => import("@/pages/seo/TwendeDigital"));
const TwendeDuka = lazy(() => import("@/pages/seo/TwendeDuka"));
const PublicWholesaleDirectory = lazy(() => import("@/pages/PublicWholesaleDirectory"));

// Shop directory (lazy)
const ShopDirectory = lazy(() => import("@/pages/ShopDirectory"));
const PlatformVision = lazy(() => import("@/pages/PlatformVision"));
const ShopDetail = lazy(() => import("@/pages/ShopDetail"));
const WorkspaceSelector = lazy(() => import("@/pages/WorkspaceSelector"));

// Lazy-loaded protected pages
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Shops = lazy(() => import("@/pages/Shops"));
const Products = lazy(() => import("@/pages/Products"));
const Sales = lazy(() => import("@/pages/Sales"));
const Orders = lazy(() => import("@/pages/Orders"));
const B2BOrders = lazy(() => import("@/pages/B2BOrders"));
const Fulfillment = lazy(() => import("@/pages/Fulfillment"));
const Expenses = lazy(() => import("@/pages/Expenses"));
const Reports = lazy(() => import("@/pages/Reports"));
const CommandCenter = lazy(() => import("@/pages/CommandCenter"));
const Inventory = lazy(() => import("@/pages/Inventory"));
const InventoryIntake = lazy(() => import("@/pages/InventoryIntake"));
const StockTransfers = lazy(() => import("@/pages/StockTransfers"));
const Suppliers = lazy(() => import("@/pages/Suppliers"));
const DiscoverSuppliers = lazy(() => import("@/pages/DiscoverSuppliers").then(m => ({ default: m.DiscoverSuppliers })));
const UserManagement = lazy(() => import("@/pages/UserManagement"));
const Marketing = lazy(() => import("@/pages/Marketing"));
const Social = lazy(() => import("@/pages/Social"));
const Customers = lazy(() => import("@/pages/Customers"));
const Branches = lazy(() => import("@/pages/Branches"));
const Profile = lazy(() => import("@/pages/Profile"));
const Purchases = lazy(() => import("@/pages/Purchases"));
const AccountsPayable = lazy(() => import("@/pages/AccountsPayable"));
const AccountsReceivable = lazy(() => import("@/pages/AccountsReceivable"));
const OnlineStore = lazy(() => import("@/pages/OnlineStore"));
const SettingsPage = lazy(() => import("@/pages/Settings"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const CustomerLayout = lazy(() => import("@/components/layout/CustomerLayout"));
const CustomerHome = lazy(() => import("@/pages/customer/CustomerHome"));
const CustomerOrders = lazy(() => import("@/pages/customer/CustomerOrders"));
const CustomerInvoices = lazy(() => import("@/pages/customer/CustomerInvoices"));
const CustomerReceipts = lazy(() => import("@/pages/customer/CustomerReceipts"));
const CustomerWishlist = lazy(() => import("@/pages/customer/CustomerWishlist"));
const CustomerAddresses = lazy(() => import("@/pages/customer/CustomerAddresses"));
const CustomerProfile = lazy(() => import("@/pages/customer/CustomerProfile"));
const CorporateDashboard = lazy(() => import("@/pages/customer/corporate/CorporateDashboard"));
const CorporateDepartments = lazy(() => import("@/pages/customer/corporate/CorporateDepartments"));
const CorporateBuyers = lazy(() => import("@/pages/customer/corporate/CorporateBuyers"));
//commented
// Admin pages (lazy)
const AdminLogin = lazy(() => import("@/pages/admin/AdminLogin"));
const AdminLayout = lazy(() => import("@/pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));
const AdminPayments = lazy(() => import("@/pages/admin/AdminPayments"));
const AdminShops = lazy(() => import("@/pages/admin/AdminShops"));
const AdminActivity = lazy(() => import("@/pages/admin/AdminActivity"));
const AdminErrors = lazy(() => import("@/pages/admin/AdminErrors"));
const AdminAnnouncements = lazy(() => import("@/pages/admin/AdminAnnouncements"));
const AdminSupport = lazy(() => import("@/pages/admin/AdminSupport"));
const AdminWholesale = lazy(() => import("@/pages/admin/AdminWholesale"));

const LoadingFallback = () => <FullPageLoader label="Inapakia" />;

// Helper component for legacy shop redirects with dynamic params
const ShopRedirect = () => {
  const { shopId } = useParams();
  return <Navigate to={`/shop/${shopId}`} replace />;
};

const ProtectedRoutes = () => (
  <AppLayout>
    <Routes>
      <Route index element={<Dashboard />} />
      <Route path="shops" element={<RoleGuard path="/dashboard/shops"><Shops /></RoleGuard>} />
      <Route path="products" element={<RoleGuard path="/dashboard/products"><Products /></RoleGuard>} />
      <Route path="sales" element={<RoleGuard path="/dashboard/sales"><Sales /></RoleGuard>} />
      <Route path="orders" element={<RoleGuard path="/dashboard/orders"><Orders /></RoleGuard>} />
      <Route path="fulfillment" element={<RoleGuard path="/dashboard/fulfillment"><Fulfillment /></RoleGuard>} />
      <Route path="expenses" element={<RoleGuard path="/dashboard/expenses"><Expenses /></RoleGuard>} />
      <Route path="reports" element={<RoleGuard path="/dashboard/reports"><Reports /></RoleGuard>} />
      <Route path="command-center" element={<RoleGuard path="/dashboard/command-center"><CommandCenter /></RoleGuard>} />
      <Route path="inventory" element={<RoleGuard path="/dashboard/inventory"><Inventory /></RoleGuard>} />
      <Route path="intake" element={<RoleGuard path="/dashboard/intake"><InventoryIntake /></RoleGuard>} />
      <Route path="transfers" element={<RoleGuard path="/dashboard/transfers"><StockTransfers /></RoleGuard>} />
      <Route path="purchases" element={<RoleGuard path="/dashboard/purchases"><Purchases /></RoleGuard>} />
      <Route path="accounts-payable" element={<RoleGuard path="/dashboard/accounts-payable"><AccountsPayable /></RoleGuard>} />
      <Route path="accounts-receivable" element={<RoleGuard path="/dashboard/accounts-receivable"><AccountsReceivable /></RoleGuard>} />
      <Route path="b2b-orders" element={<RoleGuard path="/dashboard/b2b-orders"><B2BOrders /></RoleGuard>} />
      <Route path="suppliers" element={<RoleGuard path="/dashboard/suppliers"><Suppliers /></RoleGuard>} />
      <Route path="discover-suppliers" element={<RoleGuard path="/dashboard/discover-suppliers"><DiscoverSuppliers /></RoleGuard>} />
      <Route path="users" element={<RoleGuard path="/dashboard/users"><UserManagement /></RoleGuard>} />
      <Route path="customers" element={<RoleGuard path="/dashboard/customers"><Customers /></RoleGuard>} />
      <Route path="branches" element={<RoleGuard path="/dashboard/branches"><Branches /></RoleGuard>} />
      <Route path="store" element={<RoleGuard path="/dashboard/store"><OnlineStore /></RoleGuard>} />
      <Route path="marketing" element={<RoleGuard path="/dashboard/marketing"><Marketing /></RoleGuard>} />
      <Route path="social" element={<RoleGuard path="/dashboard/social"><Social /></RoleGuard>} />
      <Route path="settings" element={<RoleGuard path="/dashboard/settings"><SettingsPage /></RoleGuard>} />
      <Route path="profile" element={<Profile />} />
      {/* Legacy Redirects within protected area */}
      <Route path="maduka" element={<Navigate to="/dashboard/shops" replace />} />
      <Route path="bidhaa" element={<Navigate to="/dashboard/products" replace />} />
      <Route path="mauzo" element={<Navigate to="/dashboard/sales" replace />} />
      <Route path="oda" element={<Navigate to="/dashboard/orders" replace />} />
      <Route path="stoo" element={<Navigate to="/dashboard/inventory" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </AppLayout>
);

const CustomerRoutes = () => (
  <CustomerLayout>
    <Routes>
      <Route index element={<CustomerHome />} />
      <Route path="home" element={<CustomerHome />} />
      <Route path="orders" element={<CustomerOrders />} />
      <Route path="invoices" element={<CustomerInvoices />} />
      <Route path="receipts" element={<CustomerReceipts />} />
      <Route path="wishlist" element={<CustomerWishlist />} />
      <Route path="addresses" element={<CustomerAddresses />} />
      <Route path="profile" element={<CustomerProfile />} />
      <Route path="corporate" element={<CorporateDashboard />} />
      <Route path="corporate/departments" element={<CorporateDepartments />} />
      <Route path="corporate/buyers" element={<CorporateBuyers />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </CustomerLayout>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
  <HelmetProvider>
    <Provider store={store}>
      <ThemeProvider defaultTheme="system" enableSystem attribute="class">
        <I18nProvider>
          <TooltipProvider>
            <OrganizationSchema />
            <Toaster />
            <Sonner />
            <PWAInstallPrompt />
            <BrowserRouter>
            <AuthProvider>
              <ErrorBoundary>
                <Suspense fallback={<LoadingFallback />}>
                  <Routes>
                    {/* Public Pages */}
                    <Route path="/" element={<ShopDirectory />} />
                    <Route path="/explore" element={<PlatformVision />} />
                    <Route path="/wholesale" element={<PublicWholesaleDirectory />} />
                    
                    {/* Legacy /nyumbani -> root */}
                    <Route path="/nyumbani" element={<Navigate to="/" replace />} />

                    <Route path="/login" element={<RedirectIfAuth><Login /></RedirectIfAuth>} />
                    <Route path="/register" element={<RedirectIfAuth><Register /></RedirectIfAuth>} />
                    
                    <Route
                      path="/workspace-selector"
                      element={
                        <AuthGuard fallback={<Navigate to="/login" replace />}>
                          <ErrorBoundary>
                            <WorkspaceSelector />
                          </ErrorBoundary>
                        </AuthGuard>
                      }
                    />

                    {/* Storefront Detail */}
                    <Route path="/shop/:identifier" element={<ShopDetail />} />
                    <Route path="/shop/:identifier/product/:productSlug" element={<ShopDetail />} />
                    <Route path="/store/:identifier" element={<ShopDetail />} />
                    
                    {/* Legacy /maduka/:id -> /shop/:id */}
                    <Route path="/maduka/:shopId" element={<ShopRedirect />} />
                    <Route path="/maduka" element={<Navigate to="/" replace />} />

                    {/* SEO landing pages */}
                    <Route path="/duka-pos-system" element={<DukaPosSystem />} />
                    <Route path="/twendedigital" element={<TwendeDigital />} />
                    <Route path="/twende-duka" element={<TwendeDuka />} />

                    {/* Protected Merchant Dashboard */}
                    <Route
                      path="/dashboard/*"
                      element={
                        <AuthGuard fallback={<Navigate to="/login" replace />}>
                          <ErrorBoundary>
                            <ProtectedRoutes />
                          </ErrorBoundary>
                        </AuthGuard>
                      }
                    />

                    {/* Customer Portal Workspace */}
                    <Route
                      path="/customer/*"
                      element={
                        <AuthGuard fallback={<Navigate to="/login" replace />}>
                          <ErrorBoundary>
                            <CustomerRoutes />
                          </ErrorBoundary>
                        </AuthGuard>
                      }
                    />

                    {/* Merchant Onboarding */}
                    <Route
                      path="/onboarding"
                      element={
                        <AuthGuard fallback={<Navigate to="/login" replace />}>
                          <ErrorBoundary>
                            <Onboarding />
                          </ErrorBoundary>
                        </AuthGuard>
                      }
                    />
                    <Route
                      path="/setup-business"
                      element={
                        <AuthGuard fallback={<Navigate to="/login" replace />}>
                          <ErrorBoundary>
                            <BusinessSetupWizard />
                          </ErrorBoundary>
                        </AuthGuard>
                      }
                    />
                    <Route
                      path="/shop-setup"
                      element={
                        <AuthGuard fallback={<Navigate to="/login" replace />}>
                          <ErrorBoundary>
                            <ShopSetupWizard />
                          </ErrorBoundary>
                        </AuthGuard>
                      }
                    />

                    {/* Legacy /app/* -> Redirect landing resolver */}
                    <Route path="/app/*" element={<PostLoginRedirect />} />

                    {/* Admin Portal Login */}
                    <Route
                      path="/admin/login"
                      element={
                        <RedirectIfAuth>
                          <ErrorBoundary>
                            <AdminLogin />
                          </ErrorBoundary>
                        </RedirectIfAuth>
                      }
                    />

                    {/* Admin Panel */}
                    <Route
                      path="/admin"
                      element={
                        <AuthGuard fallback={<Navigate to="/admin/login" replace />}>
                          <ErrorBoundary>
                            <AdminLayout />
                          </ErrorBoundary>
                        </AuthGuard>
                      }
                    >
                      <Route index element={<AdminDashboard />} />
                      <Route path="users" element={<AdminUsers />} />
                      <Route path="payments" element={<AdminPayments />} />
                      <Route path="shops" element={<AdminShops />} />
                      <Route path="activity" element={<AdminActivity />} />
                      <Route path="errors" element={<AdminErrors />} />
                      <Route path="announcements" element={<AdminAnnouncements />} />
                      <Route path="support" element={<AdminSupport />} />
                      <Route path="wholesale" element={<AdminWholesale />} />
                    </Route>

                    {/* Catch-all fallback */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
              <MobileBottomNav />
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </I18nProvider>
      </ThemeProvider>
    </Provider>
  </HelmetProvider>
  </QueryClientProvider>
);

export default App;
