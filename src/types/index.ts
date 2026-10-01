export interface Shop {
  id: string;
  name: string;
  slug?: string;
  location: string;
  ownerId: string;
  phone?: string;
  whatsappNumber?: string;
  description?: string;
  salesTotal?: number;
  lat?: number;
  lon?: number;
  imageUrl?: string;
  coverImage?: string;
  isPublic?: boolean;
  isWholesaleSupplier?: boolean;
  operatingHours?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  /** Whether the shop sells new or second-hand (mitumba) products */
  productCondition?: "new" | "secondhand" | "both";
  categories?: string[]; // Legacy - kept for backwards compatibility
  businessCategories?: string[]; // Broad industries (e.g. "Electronics", "Fashion")
  productCategories?: string[]; // Specific product types (e.g. "phones", "laptops")
  followerCount?: number;
  
  // SaaS Onboarding Fields (Step 1 & Wizard)
  businessTypes?: string[];
  salesChannels?: string[];
  country?: string;
  region?: string;
  district?: string;
  address?: string;
  currency?: string;
  language?: string;
  timezone?: string;
  slogan?: string;
  website?: string;
  tiktokUrl?: string;
  setupStatus?: "pending" | "completed";
  setupProgress?: number;
  
  // New Business Config Fields
  businessModel?: string[];
  productTypes?: string[];
  keepsStock?: boolean;
  trackInventory?: boolean;
  businessType?: string;
  sellingChannels?: string[];
  verificationStatus?: "unverified" | "pending" | "verified" | "rejected";
  
  // Universal Shop Configuration Fields
  email?: string;
  shopTypes?: string[]; // "retail", "wholesale", "distributor", etc
  customerTypes?: string[]; // "individual", "business"
  pricingModels?: string[]; // "standard", "quantity", "promotional", etc
  inventoryModel?: string; // "stock-based", "order-based", etc
  stockLocations?: string[]; // "shop", "warehouse", etc
  fulfillmentMethods?: string[]; // "pickup", "local-delivery", "nationwide", etc
  serviceCoverage?: string[]; // "local", "city", "nationwide", etc
  productCapabilities?: {
    hasVariants?: boolean;
    sellsByQuantity?: boolean;
    sellsByWeight?: boolean;
    sellsByLength?: boolean;
    sellsByVolume?: boolean;
    sellsSetsOrPackages?: boolean;
  };
  // Storefront configuration, public-readable (see PublicShopSerializer).
  onlineStore?: ShopSettings["onlineStore"];
  storePolicies?: ShopSettings["storePolicies"];
  /**
   * Write-only legal block: the shops adapter flattens it onto the backend's
   * `tin_number` / `vrn_number` / `license_number` / `registration_number`
   * columns, so it is never returned on reads.
   */
  legal?: {
    tin?: string;
    vrn?: string;
    licenseNumber?: string;
    registrationNumber?: string;
  };
}

export interface ShopSettings {
  shopId: string;
  businessInfo?: {
    tin?: string;
    vat?: string;
    registrationNumber?: string;
    licenseNumber?: string;
  };
  pricing?: {
    retail: boolean;
    wholesale: boolean;
    corporate: boolean;
    reseller: boolean;
    distributor: boolean;
  };
  inventory?: {
    trackInventory: boolean;
    lowStockAlerts: boolean;
    negativeStockPolicy: "allow" | "prevent" | "warn";
    barcodeSupport: boolean;
    skuGeneration: "auto" | "manual";
  };
  customers?: {
    enableCredit: boolean;
    requirePhoneForCredit: boolean;
    defaultCustomerType: string;
    allowGuestCustomers: boolean;
  };
  payments?: {
    cash: boolean;
    mpesa: boolean;
    airtelMoney: boolean;
    tigoPesa: boolean;
    halopesa: boolean;
    bankTransfer: boolean;
    card: boolean;
  };
  onlineStore?: {
    enabled: boolean;
    pickupAvailable: boolean;
    deliveryAvailable: boolean;
    storeUrl?: string;
    shippingAreas?: string[];
    themeColor?: string;
    bannerUrl?: string;
    logoUrl?: string;
    isOffline?: boolean;
    layout?: "grid" | "list";
  };
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    tiktok?: string;
    whatsapp?: string;
  };
  payoutDetails?: {
    provider: "mpesa" | "airtel" | "tigo" | "bank" | "none";
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
    branchCode?: string;
  };
  storePolicies?: {
    returnsPolicy?: string;
    shippingPolicy?: string;
    termsOfService?: string;
  };
  aiMarketing?: {
    enabled: boolean;
    tone: "professional" | "fun" | "urgent" | "storytelling" | string;
    musicVibe: "random" | "upbeat" | "chill" | "electronic" | string;
  };
}

export interface PricingRecord {
  type: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  category?: string; // Legacy
  categories?: string[]; // Legacy
  marketplaceCategoryId?: string;
  merchantCategoryId?: string;
  condition?: "new" | "used" | "refurbished" | "rental" | "digital" | "service";
  attributes?: Record<string, string>;
  variants?: ProductVariant[];
  buyingPrice: number;
  sellingPrice: number;
  prices?: PricingRecord[];
  wholesalePrice?: number; // Bulk purchase discount price
  moq?: number; // Minimum Order Quantity
  supplier: string;
  shopId: string;
  branchId?: string; // Target branch (optional for business-level products)
  sku?: string;
  barcode?: string;
  brand?: string;
  description?: string;
  unit?: string;
  weight?: string;
  size?: string;
  color?: string;
  expiryDate?: string;
  imageUrl?: string;
  imageUrls?: string[];
  publishToFacebook?: boolean;
  publishToDirectory?: boolean;
  publishToDeliveryApp?: boolean;
  rating?: number;
  reviewCount?: number;
  status?: "active" | "inactive" | "discontinued";
  tags?: string[];
  warranty?: string;
  discount?: number;
  taxRate?: number;
  storeLocation?: string;
  createdAt?: string | number | { toDate: () => Date };
  updatedAt?: string | number | { toDate: () => Date };
  sourceProductId?: string; // For B2B imports
  supplierShopId?: string; // The platform shop ID of the supplier
  /** Storefront reads only: aggregated branch stock, served by the public API. */
  stock?: number;
  minStock?: number;
}

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  totalPrice: number;
  buyingPrice?: number;
  paymentMethod: string;
  date: string;
  shopId: string;
  shopName?: string;
  branchId?: string; // The branch where the sale occurred
  customerName?: string;
  customerPhone?: string;
  customerId?: string; // Links this sale to a specific customer
  notes?: string;
  status?: "completed" | "draft";
  createdBy?: string;
  createdByName?: string;
  items?: OrderItem[]; // Support for multi-item sales
  shiftId?: string; // Links this sale to a specific shift
  /** Buyer business for POS deliveries: stages a pending manifest on their account. */
  buyerShopId?: string;
}

/** Daily summary stored at shops/{shopId}/sales_days/{YYYY-MM-DD} */
export interface DailySalesSummary {
  date: string;
  totalSales: number;
  transactions: number;
  profit: number; // Gross Profit
  totalExpenses?: number;
  netProfit?: number; // Gross Profit - Expenses
}

export interface Expense {
  id: string;
  shopId: string;
  branchId?: string; // The branch that incurred the expense
  category: string;
  description: string;
  amount: number;
  date: string;
  paymentMethod: string;
  reference?: string;
  notes?: string;
  shiftId?: string; // Links this expense to a specific shift
  paidTo?: string; // Who the money was paid to
  isRecurring?: boolean; // Repeats every period
}

export interface Supplier {
  id: string;
  shopId: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  products: string;
  notes: string;
  ownerId: string;
  platformShopId?: string | null; // If the supplier is another Twende Duka shop
}

export interface BusinessProfile {
  companyName: string;
  tin: string;
  vrn?: string;
  creditLimit?: number;
  creditBalance?: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  category?: "wholesale" | "corporate" | "reseller";
  approvedAt?: string;
}

export interface CorporateProfile {
  companyId: string;
  companyName: string;
  tin: string;
  vrn?: string;
  departmentId: string;
  role: "buyer" | "approver" | "admin";
  creditLimit?: number;
  creditBalance?: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  approvedAt?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  phone?: string;
  createdAt?: string | number | { toDate: () => Date }; // Timestamp or ISO string
  accountType?: "merchant" | "staff" | "customer" | "unassigned"; // New Google users choose a workspace after sign-in
  roles?: Array<"customer" | "merchant" | "staff" | "admin">;
  capabilities?: {
    canShop: boolean;
    canManageBusiness: boolean;
    canBuyForBusiness: boolean;
  };
  businessProfile?: BusinessProfile; // Business account info for wholesale customers
  corporateProfile?: CorporateProfile; // Corporate profile mapping
  defaultWorkspace?: "merchant" | "customer" | "ask"; // Preference for dual-role users
  isStaff?: boolean; // Platform admin flag (Django is_staff); gates the admin area
}

export function hasMerchantCapability(user: UserProfile | null): boolean {
  if (!user) return false;
  if (user.capabilities?.canManageBusiness) return true;
  return user.accountType === "merchant" || !user.accountType;
}

export function hasStaffCapability(user: UserProfile | null, roles: UserRole[]): boolean {
  if (!user) return false;
  if (user.capabilities?.canManageBusiness || user.roles?.includes("staff")) return true;
  if (hasMerchantCapability(user)) return true;
  return user.accountType === "staff" || roles.length > 0;
}

export function hasCustomerCapability(user: UserProfile | null): boolean {
  if (!user) return false;
  return user.accountType === "customer";
}

export interface UserRole {
  id: string;
  userId: string;
  shopId: string;
  role: "owner" | "attendant" | "manager";
  assignedBranches?: string[];
  assignedAt?: string | number | { toDate: () => Date };
}

export interface Invitation {
  id: string;
  email: string;
  shopId: string;
  role: "owner" | "attendant" | "manager";
  status: "pending" | "accepted" | "declined";
  createdAt: string | number | { toDate: () => Date };
  updatedAt: string | number | { toDate: () => Date };
  invitedBy: string;
  shopName?: string;
}

export type AppRole = "owner" | "attendant" | "manager";

export interface Stock {
  id: string;
  productId: string;
  shopId: string;
  branchId?: string; // The branch holding this stock
  quantity: number;
  minStock: number;
  location?: string;
  allocatedQty?: number; // Stock reserved for pending online orders
  lastUpdated: string | number | { toDate: () => Date }; // Timestamp or ISO string
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  shopId: string;
  branchId?: string; // The branch where movement occurred
  type: "in" | "out" | "transfer" | "sale" | "adjustment";
  quantity: number;
  previousQty?: number;
  newQty?: number;
  reason?: string;
  date?: string | number | { toDate: () => Date };
  userId: string;
  userName?: string;
}

export interface CommercialSettings {
  priceTier: "retail" | "wholesale" | "distributor" | "contract";
  creditEnabled: boolean;
  creditLimit: number;
  paymentTerms: "Cash" | "7 Days" | "30 Days";
  minimumOrderQuantity?: number;
}

export interface Customer {
  id: string;
  shopId: string;
  name: string; // The primary name used for the customer (could be personal or business)
  customerType?: "retail" | "wholesale" | "corporate" | "reseller" | "distributor";
  businessName?: string;
  contactPerson?: string;
  registrationNumber?: string;
  commercialSettings?: CommercialSettings;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  totalPurchases?: number;
  totalSpent?: number;
  /** Credit this customer still owes; the API column backing the AR balances. */
  outstandingBalance?: number;
  lastPurchaseDate?: string;
  createdAt?: string | number | { toDate: () => Date }; // Timestamp or ISO string
  updatedAt?: string | number | { toDate: () => Date }; // Timestamp or ISO string
  userId?: string; // Reference to linked platform customer user account
  linkedAt?: string | number | { toDate: () => Date } | any; // Timestamp of when the user account was linked
}

export interface Branch {
  id: string;
  shopId: string;
  name: string;
  location?: string;
  phone?: string;
  managerId?: string;
  managerName?: string;
  isActive?: boolean;
  type?: "Storefront" | "Warehouse" | "Ghost Kitchen" | "Office" | string;
  timezone?: string;
  operatingHours?: string;
  features?: {
    acceptsPOS?: boolean;
    handlesDelivery?: boolean;
    isFulfillmentCenter?: boolean;
  };
  createdAt?: string | number | { toDate: () => Date }; // Timestamp or ISO string
}

export interface StockTransfer {
  id: string;
  shopId: string;
  fromBranchId: string;
  toBranchId: string;
  productId: string;
  productName: string;
  quantity: number;
  status: "pending" | "completed" | "cancelled";
  notes?: string;
  createdBy: string;
  createdByName?: string;
  createdAt?: string | number | { toDate: () => Date };
  completedAt?: string | number | { toDate: () => Date };
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  pickedQty?: number;
  price: number;
  subtotal: number;
}

export interface FulfillmentDetails {
  packedBy?: string;
  packNotes?: string;
  deliveryMethod?: "pickup" | "merchant" | "third_party";
  driverName?: string;
  driverPhone?: string;
  vehicleDetails?: string;
  trackingNumber?: string;
  deliveryNotes?: string;
  dispatchedAt?: string | number | { toDate: () => Date };
  inTransitAt?: string | number | { toDate: () => Date };
  deliveredAt?: string | number | { toDate: () => Date };
  stockCheckedAt?: string | number | { toDate: () => Date };
}

export interface Order {
  id: string;
  shopId: string;
  branchId?: string; // The branch fulfilling the order
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  totalAmount: number;
  /**
   * Fulfillment lifecycle (in order):
   * draft (quotation) -> pending -> confirmed -> allocated (inventory checked) -> picking ->
   * packed -> ready_for_delivery -> out_for_delivery (dispatched) -> in_transit -> delivered -> completed
   */
  status: "draft" | "pending" | "confirmed" | "allocated" | "picking" | "packed" | "ready_for_delivery" | "out_for_delivery" | "in_transit" | "delivered" | "completed" | "cancelled" | "paid";
  /** Where the order came from: public storefront (outside customer) vs created inside the app by the merchant */
  source?: "public_storefront" | "in_app" | "wishlist";
  approvalStatus?: "approved" | "rejected" | "pending_approval";
  fulfillment?: FulfillmentDetails;
  paymentMethod?: string;
  customerName?: string;
  customerPhone?: string;
  customerId?: string | null;
  customerType?: string;
  customerPoNumber?: string;
  requiredDeliveryDate?: string;
  salespersonId?: string;
  internalNotes?: string;
  notes?: string;
  profitEstimate?: number;
  documents?: { type: string, url: string, generatedAt: string }[];
  createdBy?: string;
  createdByName?: string;
  createdAt?: string | number | { toDate: () => Date };
  paidAt?: string | number | { toDate: () => Date };
  idempotencyKey?: string;
}

export interface FacebookConnection {
  pageId: string;
  pageName: string;
  pageAccessToken: string; // Encrypted in Store
  userToken: string; // Encrypted in Store
  connectedBy: string;
  updatedAt: any;
}

export interface FacebookPostLog {
  id: string;
  productId: string;
  type: "facebook";
  action: "post";
  status: "success" | "failure";
  facebookPostId?: string;
  error?: any;
  createdAt: any;
}

export interface Shift {
  id: string;
  shopId: string;
  status: "OPEN" | "CLOSED";
  openedBy: string;
  openedByName?: string;
  openedAt: string | number | { toDate: () => Date };
  openingCash: number;
  closedBy?: string;
  closedByName?: string;
  closedAt?: string | number | { toDate: () => Date };
  cashSalesTotal: number;
  cashExpensesTotal: number;
  expectedClosingCash: number;
  actualClosingCash?: number;
  cashLeftForNextDay?: number;
  cashSubmittedToOwner?: number;
  discrepancy?: number;
  notes?: string;
  ownerApprovalStatus?: "PENDING" | "APPROVED" | "DISPUTED";
}

// B2B Connected Commerce Foundation Types

export interface B2BConnection {
  id: string;
  supplierShopId: string;
  buyerShopId: string;
  status: "pending" | "approved" | "rejected";
  creditLimit?: number;
  paymentType?: "CASH" | "CREDIT";
  creditDays?: number;
  pricingTier?: "wholesale" | "corporate" | "reseller";
  createdAt: string | number | { toDate: () => Date };
  updatedAt: string | number | { toDate: () => Date };
}

export interface B2BTimelineEvent {
  status: string; // e.g., 'created', 'approved', 'shipped', 'received'
  description: string;
  timestamp: string | number | { toDate: () => Date };
  actorId?: string;
}

export interface B2BPurchaseOrderItem {
  productId: string;
  sourceProductId?: string; // The ID of the product in the supplier's catalog
  productName: string;
  expectedQty: number;
  receivedQty?: number;
  buyingPrice: number;
  discountAmount?: number;
  taxAmount?: number;
  subtotal: number;
}

export interface B2BPurchaseOrder {
  id: string;
  buyerShopId: string;
  supplierShopId: string;
  supplierName: string; // Snapshotted at order time
  status: "draft" | "submitted" | "supplier_reviewing" | "approved" | "rejected" | "cancelled" | "awaiting_shipment" | "partially_received" | "completed" | "closed_short";
  items: B2BPurchaseOrderItem[];
  subtotal?: number;
  discountAmount?: number;
  taxAmount?: number;
  shippingCost?: number;
  totalAmount: number;
  currency?: string;
  paymentTerms?: string;
  notes?: string;
  timeline?: B2BTimelineEvent[];
  createdAt: string | number | { toDate: () => Date };
  updatedAt: string | number | { toDate: () => Date };
}

export interface B2BShipmentItem {
  productId: string;
  sourceProductId?: string;
  productName: string;
  shippedQty: number;
}

export interface B2BShipment {
  id: string;
  poId: string;
  supplierShopId: string;
  buyerShopId: string;
  status: "preparing" | "packed" | "dispatched" | "in_transit" | "delivered" | "cancelled";
  dispatchDate?: string;
  expectedArrivalDate?: string;
  carrier?: string;
  driverName?: string;
  vehicleNumber?: string;
  trackingNumber?: string;
  supplierNotes?: string;
  timeline?: B2BTimelineEvent[];
  items: B2BShipmentItem[];
  createdAt: string | number | { toDate: () => Date };
  updatedAt: string | number | { toDate: () => Date };
}

export interface GRNItem {
  productId: string; // The buyer's local product ID
  productName?: string; // Snapshot from the shipment line, when known
  expectedQty: number;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  unitCost: number; // Final confirmed buying price
}

export interface GRN {
  id: string;
  poId: string; // Link to the original B2B PO
  shipmentId?: string; // Link to the shipment if applicable
  shopId: string; // The buyer's shop
  supplierId: string; // Link to the Supplier (could be B2B platformShopId or manual supplier)
  supplierName: string;
  items: GRNItem[];
  status: "pending_review" | "completed";
  notes?: string;
  createdAt: string | number | { toDate: () => Date };
  completedAt?: string | number | { toDate: () => Date };
}

export interface B2BSupplierBalance {
  id: string; // buyerShopId_supplierShopId
  supplierShopId: string;
  buyerShopId: string;
  totalPurchases: number;
  receivedGoodsValue: number;
  outstandingBalance: number;
  paidAmount: number;
  updatedAt: string | number | { toDate: () => Date };
}

export interface ProductCostHistory {
  id: string;
  productId: string;
  shopId: string;
  supplierId: string;
  unitCost: number;
  sourceDocument: string; // e.g. GRN ID
  date: string | number | { toDate: () => Date };
}

export interface B2BSupplierInvoice {
  id: string;
  supplierShopId: string;
  buyerShopId: string;
  purchaseOrderId: string;
  grnIds: string[];
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  attachmentUrl?: string;
  status: "draft" | "submitted" | "under_review" | "approved" | "rejected" | "paid";
  createdAt: string | number | { toDate: () => Date };
  updatedAt: string | number | { toDate: () => Date };
}

export interface B2BSupplierPayment {
  id: string;
  supplierShopId: string;
  buyerShopId: string;
  amount: number;
  method: "Cash" | "Bank" | "Mobile Money";
  reference?: string;
  invoiceIds?: string[];
  date: string | number | { toDate: () => Date };
  notes?: string;
  createdAt: string | number | { toDate: () => Date };
}

export interface CustomerBalance {
  id: string; // shopId_customerId
  shopId: string;
  customerId: string;
  totalPurchases: number;
  outstandingBalance: number;
  paidAmount: number;
  updatedAt: string | number | { toDate: () => Date };
}

export interface CustomerInvoice {
  id: string;
  shopId: string;
  customerId: string;
  orderId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  status: "draft" | "submitted" | "approved" | "paid" | "cancelled" | "pending" | "overdue";
  createdAt: string | number | { toDate: () => Date };
  updatedAt: string | number | { toDate: () => Date };
}

export interface CustomerPayment {
  id: string;
  shopId: string;
  customerId: string;
  amount: number;
  method: "Cash" | "Bank" | "Mobile Money";
  reference?: string;
  invoiceIds?: string[];
  date: string | number | { toDate: () => Date };
  notes?: string;
  createdAt: string | number | { toDate: () => Date };
}

// Catalog Redesign Types

export interface MarketplaceCategory {
  id: string;
  name: string;
  parentId?: string;
  slug: string;
  icon?: string;
  image?: string;
  description?: string;
  status: "active" | "inactive";
  sortOrder?: number;
}

export interface MerchantCategory {
  id: string;
  shopId: string;
  name: string;
  parentId?: string;
  slug: string;
  description?: string;
  sortOrder?: number;
  rating?: number;
  reviewCount?: number;
  status?: "active" | "inactive";
}

export interface ProductVariant {
  id: string;
  sku: string;
  name: string;
  buyingPrice?: number;
  sellingPrice: number;
  attributes: Record<string, string>;
}

export interface DiscountCode {
  id: string;
  shopId: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  usedCount: number;
  status: "active" | "expired" | "disabled";
  startDate?: string;
  expiryDate?: string;
  createdAt: string | number | { toDate: () => Date };
}

export interface Campaign {
  id?: string;
  shopId: string;
  name: string;
  source: string;
  platform: string;
  status: "running" | "completed" | "draft";
  reach: string | number;
  engagement?: number | string;
  spend?: number;
  revenue?: number;
  roi?: number;
  startDate?: string;
  /** Stays `any`: the UI still probes the legacy `{seconds}` timestamp shape. */
  createdAt?: any;
  audienceFilter?: "all" | "recent" | "dormant" | "vip";
  promoCodeId?: string;
  channel?: "sms" | "whatsapp" | "email";
}

// Twende Duka — AI inventory intake (staging before the live product tables)

export interface IntakeDraft {
  id: string;
  batchId: string;
  nameEn: string;
  nameSw: string;
  unit: string;
  quantity: number;
  buyingPrice: number;
  sellingPrice: number;
  categoryName: string;
  aiConfidenceScore: number;
  traItemCode: string;
  taxRatePercent: number;
  appliedProductId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IntakeSource {
  kind: "qr" | "image" | "url";
  ref?: string;
  name?: string;
  contentType?: string;
}

export interface IntakeBatch {
  id: string;
  shopId: string;
  status: "pending" | "processing" | "completed" | "failed" | "applied";
  sourceType: "qr" | "image" | "url";
  engineUsed: "qr" | "ai" | "";
  sources: IntakeSource[];
  sourceNote?: string;
  errorMessage?: string;
  itemCount: number;
  drafts: IntakeDraft[];
  createdById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IntakeApplySummary {
  created: number;
  updated: number;
  skipped: number;
}

// Twende Duka — B2B wholesaler -> retailer stock transfers

export interface B2BTransferItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  /** Snapshot at dispatch; drives the one-tap auto-match for sale deliveries. */
  barcode: string;
  unit: string;
  quantity: number;
  unitCost: number;
  receivedProductId?: string | null;
  /** Buyer's chosen landing product (set via the map endpoint before receive). */
  mappedProductId?: string | null;
  mappedProductName?: string;
  /** Read-only prefill for the mapping UI; only sent to buyers on pending lines. */
  suggestedProductId?: string | null;
  suggestedProductName?: string;
}

export interface B2BTransfer {
  id: string;
  fromShopId: string;
  toShopId: string;
  fromBranchId: string;
  toBranchId?: string | null;
  status: "pending" | "completed" | "cancelled";
  /** "sale" manifests (POS deliveries) accept in one tap; "manual" need mapping. */
  source: "manual" | "sale";
  reference: string;
  note: string;
  createdById?: string;
  completedById?: string;
  completedAt?: string | null;
  items: B2BTransferItem[];
  lineCount: number;
  totalQuantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface B2BTransferInputItem {
  productId: string;
  quantity: number;
  unitCost?: number;
}

export interface B2BTransferInput {
  fromShopId: string;
  toShopId: string;
  fromBranchId: string;
  toBranchId?: string;
  note?: string;
  reference?: string;
  items: B2BTransferInputItem[];
}
