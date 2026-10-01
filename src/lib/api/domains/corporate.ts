/**
 * Corporate procurement domain adapter (legacy ``companies/{id}`` subcollections).
 *
 * `CorporateDashboard` / `CorporateDepartments` / `CorporateBuyers` and the
 * storefront's corporate-PO checkout used to call the legacy data layer; Django
 * now owns the data:
 *
 *   GET    /api/v1/corporate/departments/        -> company departments
 *   POST   /api/v1/corporate/departments/        -> create (role ``admin``)
 *   GET    /api/v1/corporate/buyers/             -> colleagues in the company
 *   GET    /api/v1/corporate/purchase-orders/    -> company POs
 *   POST   /api/v1/corporate/purchase-orders/    -> file a PO (pending approval)
 *   POST   /api/v1/corporate/purchase-orders/{id}/approve/
 *   POST   /api/v1/corporate/purchase-orders/{id}/reject/
 *
 * The company is derived server-side from the caller's ``corporateProfile``, so
 * the old ``companyId`` argument is gone from every signature: a member can
 * never read or write another company's rows. The legacy backend returned every
 * matching document in one go, so the ``get*`` functions walk DRF's page links
 * to keep that contract.
 *
 * ``budget``/``spent`` are DRF decimals answered as strings and are not in the
 * shared money allowlist, so they are coerced here; the UI calls
 * ``.toLocaleString()`` on them, which would throw on a string.
 */
import { getApiClient, unwrapList } from "../index";

const DEPARTMENTS_PATH = "/api/v1/corporate/departments/";
const BUYERS_PATH = "/api/v1/corporate/buyers/";
const PURCHASE_ORDERS_PATH = "/api/v1/corporate/purchase-orders/";

/** DRF's max_page_size; matches the legacy "fetch everything" reads. */
const MAX_PAGE_SIZE = 200;
const MAX_PAGES = 100;

export interface CorporateDepartment {
  id: string;
  companyId?: string;
  name: string;
  budget: number;
  spent: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CorporateDepartmentInput {
  name: string;
  budget: number;
}

export interface CorporateBuyer {
  id: string;
  email: string;
  displayName: string;
  phone?: string;
  corporateProfile?: {
    companyId?: string;
    companyName?: string;
    role?: string;
    creditLimit?: number;
    creditBalance?: number;
    status?: string;
  };
}

export interface CorporatePurchaseOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface CorporatePurchaseOrder {
  id: string;
  companyId?: string;
  shopId?: string;
  shopName?: string;
  buyerId?: string;
  buyerName?: string;
  buyerPhone?: string;
  departmentId?: string;
  departmentName?: string;
  items: CorporatePurchaseOrderItem[];
  totalAmount: number;
  approvalStatus: string;
  approverId?: string;
  approvedAt?: string;
  rejectedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CorporatePurchaseOrderInput {
  shopId?: string;
  shopName?: string;
  buyerId?: string;
  buyerName?: string;
  buyerPhone?: string;
  departmentId?: string;
  departmentName?: string;
  items: CorporatePurchaseOrderItem[];
  totalAmount: number;
}

interface DrfPage<T> {
  next?: string | null;
  results?: T[];
  count?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringOr(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function numberOr(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function fromApiCorporateDepartment(raw: unknown): CorporateDepartment {
  const row = isRecord(raw) ? raw : {};
  return {
    id: stringOr(row.id),
    companyId: optionalString(row.companyId),
    name: stringOr(row.name),
    budget: numberOr(row.budget),
    spent: numberOr(row.spent),
    createdAt: optionalString(row.createdAt),
    updatedAt: optionalString(row.updatedAt),
  };
}

export function fromApiCorporateBuyer(raw: unknown): CorporateBuyer {
  const row = isRecord(raw) ? raw : {};
  const profile = row.corporateProfile;
  return {
    id: stringOr(row.id),
    email: stringOr(row.email),
    displayName: stringOr(row.displayName ?? row.display_name),
    phone: optionalString(row.phone),
    corporateProfile: isRecord(profile)
      ? {
          companyId: optionalString(profile.companyId),
          companyName: optionalString(profile.companyName),
          role: optionalString(profile.role),
          creditLimit: profile.creditLimit === undefined ? undefined : numberOr(profile.creditLimit),
          creditBalance:
            profile.creditBalance === undefined ? undefined : numberOr(profile.creditBalance),
          status: optionalString(profile.status),
        }
      : undefined,
  };
}

export function fromApiCorporatePurchaseOrderItem(raw: unknown): CorporatePurchaseOrderItem {
  const row = isRecord(raw) ? raw : {};
  return {
    productId: stringOr(row.productId),
    productName: stringOr(row.productName),
    quantity: numberOr(row.quantity),
    price: numberOr(row.price),
    subtotal: numberOr(row.subtotal),
  };
}

export function fromApiCorporatePurchaseOrder(raw: unknown): CorporatePurchaseOrder {
  const row = isRecord(raw) ? raw : {};
  const items = Array.isArray(row.items) ? row.items.map(fromApiCorporatePurchaseOrderItem) : [];
  return {
    id: stringOr(row.id),
    companyId: optionalString(row.companyId),
    shopId: optionalString(row.shopId),
    shopName: optionalString(row.shopName),
    buyerId: optionalString(row.buyerId),
    buyerName: optionalString(row.buyerName),
    buyerPhone: optionalString(row.buyerPhone),
    departmentId: optionalString(row.departmentId),
    departmentName: optionalString(row.departmentName),
    items,
    totalAmount: numberOr(row.totalAmount),
    approvalStatus: stringOr(row.approvalStatus, "pending_approval"),
    approverId: optionalString(row.approverId),
    approvedAt: optionalString(row.approvedAt),
    rejectedAt: optionalString(row.rejectedAt),
    createdAt: optionalString(row.createdAt),
    updatedAt: optionalString(row.updatedAt),
  };
}

/** DRF's `next` is absolute; the client only accepts relative paths. */
function relativePath(target: string): string {
  if (target.startsWith("/")) return target;
  try {
    const url = new URL(target, "http://localhost");
    return `${url.pathname}${url.search}`;
  } catch {
    return target;
  }
}

/** Walk DRF's page links to honour the old "returned everything" contract. */
async function fetchAll(path: string): Promise<unknown[]> {
  const client = getApiClient();
  const collected: unknown[] = [];
  let nextPath: string | null = path;
  let nextQuery: Record<string, string | number> | undefined = { page_size: MAX_PAGE_SIZE };
  for (let page = 0; nextPath && page < MAX_PAGES; page += 1) {
    const body = await client.get<DrfPage<unknown>>(
      nextPath,
      nextQuery ? { query: nextQuery } : undefined
    );
    collected.push(...unwrapList<unknown>(body));
    nextPath = body?.next ? relativePath(body.next) : null;
    nextQuery = undefined;
  }
  return collected;
}

/** The caller's company departments, newest first server-side. */
export async function getCorporateDepartments(): Promise<CorporateDepartment[]> {
  const rows = await fetchAll(DEPARTMENTS_PATH);
  return rows.map(fromApiCorporateDepartment);
}

/** Create a department; only company admins may (the backend enforces the role). */
export async function addCorporateDepartment(
  input: CorporateDepartmentInput
): Promise<CorporateDepartment> {
  return fromApiCorporateDepartment(
    await getApiClient().post<unknown>(DEPARTMENTS_PATH, {
      name: input.name,
      budget: input.budget,
    })
  );
}

/** The caller's colleagues (members whose ``corporateProfile.companyId`` matches). */
export async function getCorporateBuyers(): Promise<CorporateBuyer[]> {
  const rows = await fetchAll(BUYERS_PATH);
  return rows.map(fromApiCorporateBuyer);
}

/** The caller's company purchase orders, newest first server-side. */
export async function getPurchaseOrders(): Promise<CorporatePurchaseOrder[]> {
  const rows = await fetchAll(PURCHASE_ORDERS_PATH);
  return rows.map(fromApiCorporatePurchaseOrder);
}

/** File a PO; the server stamps ``companyId``, the buyer (token) and ``pending_approval``. */
export async function createPurchaseOrder(
  input: CorporatePurchaseOrderInput
): Promise<CorporatePurchaseOrder> {
  return fromApiCorporatePurchaseOrder(
    await getApiClient().post<unknown>(PURCHASE_ORDERS_PATH, input)
  );
}

/** Approve a PO; the backend allows only ``approver``/``admin`` roles. */
export async function approvePurchaseOrder(
  poId: string,
  approverId?: string
): Promise<CorporatePurchaseOrder> {
  return fromApiCorporatePurchaseOrder(
    await getApiClient().post<unknown>(
      `${PURCHASE_ORDERS_PATH}${encodeURIComponent(poId)}/approve/`,
      approverId ? { approverId } : {}
    )
  );
}

/** Reject a PO; the backend allows only ``approver``/``admin`` roles. */
export async function rejectPurchaseOrder(poId: string): Promise<CorporatePurchaseOrder> {
  return fromApiCorporatePurchaseOrder(
    await getApiClient().post<unknown>(
      `${PURCHASE_ORDERS_PATH}${encodeURIComponent(poId)}/reject/`,
      {}
    )
  );
}
