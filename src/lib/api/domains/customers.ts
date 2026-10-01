/**
 * Customers / accounts-receivable domain adapter for the strangler-fig cutover.
 *
 * The pages and hooks keep calling the same functions they always did
 * (`Customers.tsx`, `useCustomerAR.ts`, `SaleCart.tsx`, the order wizards), so
 * this module translates:
 *   - DRF customer rows to the app's `Customer` shape, with the legacy
 *     document id (``legacyId``) kept as the visible id when present,
 *   - the legacy `customer_balances` documents, which have no Django column,
 *     to a derivation over `Customer.outstanding_balance` plus the sum of that
 *     customer's payments,
 *   - the legacy invoice document to the app's `CustomerInvoice`, deriving
 *     the presentation-only fields (number, currency, line-item split) Django
 *     does not store,
 *   - the wizard's `commercialSettings.creditLimit` to the backend's
 *     `credit_limit` column, which its credit checks read.
 */
import type { Customer, CustomerBalance, CustomerInvoice, CustomerPayment } from "@/types";
import { getApiClient } from "../index";
import { unwrapList } from "../client";

const CUSTOMERS_PATH = "/api/v1/customers/";
const INVOICES_PATH = "/api/v1/customer-invoices/";
const PAYMENTS_PATH = "/api/v1/customer-payments/";

/** DRF's max_page_size; the "fetch everything" contract needs the biggest page. */
const MAX_PAGE_SIZE = 200;
/** Safety net for a misbehaving `next` link: 100 * 200 rows is far past any shop. */
const MAX_PAGES = 100;

interface DrfPage<T> {
  next?: string | null;
  results?: T[];
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
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function optionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = numberOr(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** A foreign-key id, whether the serializer inlined it or sent the app-visible id. */
function refId(value: unknown): string {
  if (isRecord(value)) return stringOr(value.legacyId) || stringOr(value.id);
  return stringOr(value);
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
async function fetchAll<T>(path: string, query: Record<string, string | number>): Promise<T[]> {
  const client = getApiClient();
  const collected: T[] = [];
  let nextPath: string | null = path;
  let nextQuery: Record<string, string | number> | undefined = query;
  for (let page = 0; nextPath && page < MAX_PAGES; page += 1) {
    const body = await client.get<DrfPage<T>>(nextPath, nextQuery ? { query: nextQuery } : undefined);
    collected.push(...unwrapList<T>(body));
    nextPath = body?.next ? relativePath(body.next) : null;
    nextQuery = undefined;
  }
  return collected;
}

const CUSTOMER_TYPES = ["retail", "wholesale", "corporate", "reseller", "distributor"] as const;

function toCustomerType(value: unknown): Customer["customerType"] {
  return typeof value === "string" && (CUSTOMER_TYPES as readonly string[]).includes(value)
    ? (value as Customer["customerType"])
    : undefined;
}

/**
 * `commercial_settings` is a JSON column with an empty-dict default, but the
 * credit checks in `SaleCart`/`CreateOrderWizard` read
 * `commercialSettings.creditEnabled` and `.creditLimit` directly, and
 * `CustomerWizard` round-trips the whole object. An empty dict therefore maps
 * back to "no settings" (what the legacy backend returned for a missing field), and the
 * `credit_limit` column fills in the limit the wizard stores inside the JSON.
 */
function toCommercialSettings(value: unknown, creditLimit: number | undefined): Customer["commercialSettings"] {
  if (!isRecord(value) || Object.keys(value).length === 0) {
    if (creditLimit === undefined) return undefined;
    return { creditLimit } as Customer["commercialSettings"];
  }
  const settings = { ...value } as unknown as Customer["commercialSettings"];
  if (settings && settings.creditLimit === undefined && creditLimit !== undefined) {
    settings.creditLimit = creditLimit;
  }
  return settings;
}

export function fromApiCustomer(raw: unknown): Customer {
  const row = isRecord(raw) ? raw : {};
  const creditLimit = optionalNumber(row.creditLimit);
  return {
    // Imported rows keep their document id as the app-visible id; sale and
    // order rows still point at that id.
    id: stringOr(row.legacyId) || stringOr(row.id),
    shopId: refId(row.shopId),
    name: stringOr(row.name),
    customerType: toCustomerType(row.customerType),
    businessName: optionalString(row.businessName),
    contactPerson: optionalString(row.contactPerson),
    registrationNumber: optionalString(row.registrationNumber),
    commercialSettings: toCommercialSettings(row.commercialSettings, creditLimit),
    phone: optionalString(row.phone),
    email: optionalString(row.email),
    address: optionalString(row.address),
    notes: optionalString(row.notes),
    totalPurchases: optionalNumber(row.totalPurchases),
    totalSpent: optionalNumber(row.totalSpent),
    outstandingBalance: optionalNumber(row.outstandingBalance),
    lastPurchaseDate: optionalString(row.lastPurchaseDate),
    createdAt: row.createdAt as Customer["createdAt"],
    updatedAt: (row.updatedAt ?? row.createdAt) as Customer["updatedAt"],
    userId: optionalString(row.userId),
    linkedAt: row.linkedAt as Customer["linkedAt"],
  };
}

const PAYMENT_METHODS = ["Cash", "Bank", "Mobile Money"] as const;

function toPaymentMethod(value: unknown): CustomerPayment["method"] {
  return typeof value === "string" && (PAYMENT_METHODS as readonly string[]).includes(value)
    ? (value as CustomerPayment["method"])
    : "Cash";
}

const INVOICE_STATUSES = ["draft", "submitted", "approved", "paid", "cancelled", "pending", "overdue"];

function toInvoiceStatus(value: unknown): CustomerInvoice["status"] {
  return typeof value === "string" && INVOICE_STATUSES.includes(value)
    ? (value as CustomerInvoice["status"])
    : "pending";
}

export function fromApiCustomerInvoice(raw: unknown): CustomerInvoice {
  const row = isRecord(raw) ? raw : {};
  const id = stringOr(row.id);
  const amountDue = numberOr(row.amountDue);
  return {
    id,
    shopId: refId(row.shopId),
    customerId: refId(row.customerId),
    orderId: stringOr(refId(row.orderId)),
    // Django keeps no number, currency or tax/discount split; the UI prints
    // these, so they are derived from the columns that do exist.
    invoiceNumber: `INV-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`,
    invoiceDate: stringOr(row.createdAt),
    dueDate: stringOr(row.dueDate),
    currency: "TZS",
    subtotal: amountDue,
    taxAmount: 0,
    discountAmount: 0,
    totalAmount: amountDue,
    status: toInvoiceStatus(row.status),
    createdAt: row.createdAt as CustomerInvoice["createdAt"],
    updatedAt: (row.updatedAt ?? row.createdAt) as CustomerInvoice["updatedAt"],
  };
}

export function fromApiCustomerPayment(raw: unknown): CustomerPayment {
  const row = isRecord(raw) ? raw : {};
  const invoiceIds = Array.isArray(row.invoiceIds) ? row.invoiceIds.map(refId).filter(Boolean) : [];
  return {
    id: stringOr(row.id),
    shopId: refId(row.shopId),
    customerId: refId(row.customerId),
    amount: numberOr(row.amount),
    method: toPaymentMethod(row.method),
    reference: optionalString(row.reference),
    invoiceIds: invoiceIds.length ? invoiceIds : undefined,
    date: stringOr(row.date),
    notes: optionalString(row.notes),
    createdAt: (row.createdAt ?? row.date) as CustomerPayment["createdAt"],
  };
}

/**
 * The legacy backend kept a balance document per customer with credit activity; the
 * Django columns only know the outstanding debt, so the money already collected
 * is summed from that customer's payments and total purchases are reconstructed
 * as outstanding + collected.
 */
export function fromApiCustomerBalance(customer: Customer, paidAmount: number): CustomerBalance {
  const outstandingBalance = numberOr(customer.outstandingBalance);
  return {
    id: `${customer.shopId}_${customer.id}`,
    shopId: customer.shopId,
    customerId: customer.id,
    totalPurchases: outstandingBalance + paidAmount,
    outstandingBalance,
    paidAmount,
    updatedAt: (customer.updatedAt ?? customer.createdAt) as CustomerBalance["updatedAt"],
  };
}

/** Only the fields the wizard and POS actually send, in the backend's aliases. */
function customerPayload(data: Partial<Customer>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.shopId !== undefined) payload.shopId = data.shopId;
  if (data.customerType !== undefined) payload.customerType = data.customerType;
  if (data.businessName !== undefined) payload.businessName = data.businessName ?? "";
  if (data.contactPerson !== undefined) payload.contactPerson = data.contactPerson ?? "";
  if (data.registrationNumber !== undefined) payload.registrationNumber = data.registrationNumber ?? "";
  if (data.commercialSettings !== undefined) {
    payload.commercialSettings = data.commercialSettings;
    // The backend's credit check reads the column, the UI reads the JSON.
    const limit = optionalNumber(data.commercialSettings?.creditLimit);
    if (limit !== undefined) payload.creditLimit = limit;
  }
  if (data.phone !== undefined) payload.phone = data.phone ?? "";
  if (data.email !== undefined) payload.email = data.email ?? "";
  if (data.address !== undefined) payload.address = data.address ?? "";
  if (data.notes !== undefined) payload.notes = data.notes ?? "";
  return payload;
}

export async function getCustomers(shopId: string): Promise<Customer[]> {
  const rows = await fetchAll<unknown>(CUSTOMERS_PATH, { shop_id: shopId, page_size: MAX_PAGE_SIZE });
  return rows.map(fromApiCustomer);
}

export async function addCustomer(data: Omit<Customer, "id">): Promise<string> {
  const body = await getApiClient().post<unknown>(CUSTOMERS_PATH, customerPayload(data));
  return fromApiCustomer(body).id;
}

export async function updateCustomer(id: string, data: Partial<Customer>): Promise<void> {
  // `shopId` rides along on every wizard save; the backend ignores it and the
  // row keeps its shop.
  await getApiClient().patch<unknown>(`${CUSTOMERS_PATH}${encodeURIComponent(id)}/`, customerPayload(data));
}

export async function deleteCustomer(id: string): Promise<void> {
  await getApiClient().del<unknown>(`${CUSTOMERS_PATH}${encodeURIComponent(id)}/`);
}

export async function getCustomerInvoices(shopId: string): Promise<CustomerInvoice[]> {
  const rows = await fetchAll<unknown>(INVOICES_PATH, { shop_id: shopId, page_size: MAX_PAGE_SIZE });
  return rows.map(fromApiCustomerInvoice);
}

export async function getCustomerPayments(shopId: string): Promise<CustomerPayment[]> {
  const rows = await fetchAll<unknown>(PAYMENTS_PATH, { shop_id: shopId, page_size: MAX_PAGE_SIZE });
  return rows.map(fromApiCustomerPayment);
}

export async function getCustomerBalances(shopId: string): Promise<CustomerBalance[]> {
  const [customers, payments] = await Promise.all([getCustomers(shopId), getCustomerPayments(shopId)]);

  const paidByCustomer = new Map<string, number>();
  for (const payment of payments) {
    paidByCustomer.set(payment.customerId, (paidByCustomer.get(payment.customerId) ?? 0) + numberOr(payment.amount));
  }

  return customers
    .map((customer) => fromApiCustomerBalance(customer, paidByCustomer.get(customer.id) ?? 0))
    // As before, only customers with credit activity have a balance row.
    .filter((balance) => balance.outstandingBalance > 0 || balance.paidAmount > 0);
}

export async function createCustomerInvoice(
  shopId: string,
  customerId: string,
  orderId: string,
  invoiceData: Omit<CustomerInvoice, "id" | "shopId" | "customerId" | "orderId" | "status" | "createdAt" | "updatedAt">
): Promise<string> {
  const payload: Record<string, unknown> = {
    shopId,
    customerId,
    amountDue: numberOr(invoiceData.totalAmount),
  };
  if (invoiceData.dueDate) payload.dueDate = invoiceData.dueDate;
  if (orderId) payload.orderId = orderId;
  const body = await getApiClient().post<unknown>(INVOICES_PATH, payload);
  return stringOr((body as Record<string, unknown> | null)?.id);
}

export async function processCustomerPayment(
  shopId: string,
  customerId: string,
  paymentData: Omit<CustomerPayment, "id" | "shopId" | "customerId" | "createdAt">
): Promise<string> {
  const payload: Record<string, unknown> = {
    amount: numberOr(paymentData.amount),
    method: paymentData.method,
    reference: paymentData.reference ?? "",
    notes: paymentData.notes ?? "",
  };
  const invoiceIds = (paymentData.invoiceIds ?? []).filter(Boolean);
  if (invoiceIds.length) payload.invoiceIds = invoiceIds;
  // The backend stamps the payment with today's date; `paymentData.date` was
  // only ever displayed through `createdAt`, which the server sets.
  const body = await getApiClient().post<unknown>(
    `${CUSTOMERS_PATH}${encodeURIComponent(customerId)}/record_payment/`,
    payload
  );
  return stringOr((body as Record<string, unknown> | null)?.id);
}
