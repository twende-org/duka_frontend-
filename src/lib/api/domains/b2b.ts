/**
 * B2B finance domain adapter for the strangler-fig cutover.
 *
 * `useB2BOrders`/`useB2BFinance` and the purchase dialogs keep calling the same
 * functions they called on the legacy backend, so this module translates:
 *   - DRF purchase-order/shipment/GRN rows to the app's `B2BPurchaseOrder`,
 *     `B2BShipment` and `GRN` shapes (the timeline the service appends is a
 *     JSON column, so it round-trips unchanged),
 *   - DRF supplier balance/invoice/payment rows to `B2BSupplierBalance`,
 *     `B2BSupplierInvoice` and `B2BSupplierPayment`,
 *   - the camelCase payloads the dialogs send to the camelCase aliases the DRF
 *     input serializers accept.
 *
 * The legacy backend returned every matching document in one go; the `get*` functions
 * keep that contract by walking DRF's `next` links.
 */
import type {
  B2BPurchaseOrder,
  B2BPurchaseOrderItem,
  B2BShipment,
  B2BShipmentItem,
  B2BSupplierBalance,
  B2BSupplierInvoice,
  B2BSupplierPayment,
  B2BTimelineEvent,
  GRN,
  GRNItem,
} from "@/types";
import { getApiClient } from "../index";
import { unwrapList } from "../client";

const ORDERS_PATH = "/api/v1/purchases/orders/";
const SHIPMENTS_PATH = "/api/v1/purchases/shipments/";
const GRNS_PATH = "/api/v1/purchases/grns/";
const BALANCES_PATH = "/api/v1/b2b/supplier-balances/";
const INVOICES_PATH = "/api/v1/b2b/supplier-invoices/";
const PAYMENTS_PATH = "/api/v1/b2b/supplier-payments/";

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
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function optionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  return numberOr(value);
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
    const body = nextQuery
      ? await client.get<DrfPage<T>>(nextPath, { query: nextQuery })
      : await client.get<DrfPage<T>>(nextPath);
    collected.push(...unwrapList<T>(body));
    nextPath = body?.next ? relativePath(body.next) : null;
    nextQuery = undefined;
  }
  return collected;
}

function fromApiTimeline(raw: unknown): B2BTimelineEvent[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isRecord).map((row) => ({
    status: stringOr(row.status),
    description: stringOr(row.description),
    timestamp: stringOr(row.timestamp),
    actorId: optionalString(row.actorId),
  }));
}

export function fromApiB2BOrderItem(raw: unknown): B2BPurchaseOrderItem {
  const row = isRecord(raw) ? raw : {};
  return {
    productId: stringOr(row.productId),
    sourceProductId: optionalString(row.sourceProductId),
    productName: stringOr(row.productName),
    expectedQty: numberOr(row.expectedQty),
    receivedQty: optionalNumber(row.receivedQty),
    buyingPrice: numberOr(row.buyingPrice),
    discountAmount: optionalNumber(row.discountAmount),
    taxAmount: optionalNumber(row.taxAmount),
    subtotal: numberOr(row.subtotal),
  };
}

export function fromApiB2BOrder(raw: unknown): B2BPurchaseOrder {
  const row = isRecord(raw) ? raw : {};
  return {
    id: stringOr(row.id),
    buyerShopId: refId(row.buyerShopId),
    supplierShopId: refId(row.supplierShopId),
    supplierName: stringOr(row.supplierName),
    status: stringOr(row.status, "draft") as B2BPurchaseOrder["status"],
    items: Array.isArray(row.items) ? row.items.map(fromApiB2BOrderItem) : [],
    subtotal: optionalNumber(row.subtotal),
    discountAmount: optionalNumber(row.discountAmount),
    taxAmount: optionalNumber(row.taxAmount),
    shippingCost: optionalNumber(row.shippingCost),
    totalAmount: numberOr(row.totalAmount),
    currency: optionalString(row.currency),
    paymentTerms: optionalString(row.paymentTerms),
    notes: optionalString(row.notes),
    timeline: fromApiTimeline(row.timeline),
    createdAt: stringOr(row.createdAt),
    updatedAt: stringOr(row.updatedAt),
  };
}

export function fromApiShipmentItem(raw: unknown): B2BShipmentItem {
  const row = isRecord(raw) ? raw : {};
  return {
    productId: stringOr(row.productId),
    sourceProductId: optionalString(row.sourceProductId),
    productName: stringOr(row.productName),
    shippedQty: numberOr(row.shippedQty),
  };
}

export function fromApiShipment(raw: unknown): B2BShipment {
  const row = isRecord(raw) ? raw : {};
  return {
    id: stringOr(row.id),
    poId: refId(row.poId),
    supplierShopId: refId(row.supplierShopId),
    buyerShopId: refId(row.buyerShopId),
    status: stringOr(row.status, "preparing") as B2BShipment["status"],
    dispatchDate: optionalString(row.dispatchDate),
    expectedArrivalDate: optionalString(row.expectedArrivalDate),
    carrier: optionalString(row.carrier),
    driverName: optionalString(row.driverName),
    vehicleNumber: optionalString(row.vehicleNumber),
    trackingNumber: optionalString(row.trackingNumber),
    supplierNotes: optionalString(row.supplierNotes),
    timeline: fromApiTimeline(row.timeline),
    items: Array.isArray(row.items) ? row.items.map(fromApiShipmentItem) : [],
    createdAt: stringOr(row.createdAt),
    updatedAt: stringOr(row.updatedAt),
  };
}

export function fromApiGRNItem(raw: unknown): GRNItem {
  const row = isRecord(raw) ? raw : {};
  return {
    productId: stringOr(row.productId),
    expectedQty: numberOr(row.expectedQty),
    receivedQty: numberOr(row.receivedQty),
    acceptedQty: numberOr(row.acceptedQty),
    rejectedQty: numberOr(row.rejectedQty),
    unitCost: numberOr(row.unitCost),
  };
}

export function fromApiGRN(raw: unknown): GRN {
  const row = isRecord(raw) ? raw : {};
  return {
    id: stringOr(row.id),
    poId: refId(row.poId),
    shipmentId: optionalString(row.shipmentId),
    shopId: refId(row.shopId),
    supplierId: refId(row.supplierId),
    supplierName: stringOr(row.supplierName),
    items: Array.isArray(row.items) ? row.items.map(fromApiGRNItem) : [],
    status: stringOr(row.status, "completed") as GRN["status"],
    notes: optionalString(row.notes),
    createdAt: stringOr(row.createdAt),
    completedAt: optionalString(row.completedAt),
  };
}

export function fromApiSupplierBalance(raw: unknown): B2BSupplierBalance {
  const row = isRecord(raw) ? raw : {};
  return {
    id: stringOr(row.id),
    supplierShopId: refId(row.supplierShopId),
    buyerShopId: refId(row.buyerShopId),
    totalPurchases: numberOr(row.totalPurchases),
    receivedGoodsValue: numberOr(row.receivedGoodsValue),
    outstandingBalance: numberOr(row.outstandingBalance),
    paidAmount: numberOr(row.paidAmount),
    updatedAt: stringOr(row.updatedAt),
  };
}

export function fromApiSupplierInvoice(raw: unknown): B2BSupplierInvoice {
  const row = isRecord(raw) ? raw : {};
  return {
    id: stringOr(row.id),
    supplierShopId: refId(row.supplierShopId),
    buyerShopId: refId(row.buyerShopId),
    purchaseOrderId: refId(row.purchaseOrderId),
    grnIds: Array.isArray(row.grnIds) ? row.grnIds.map((value) => String(value)) : [],
    invoiceNumber: stringOr(row.invoiceNumber),
    invoiceDate: stringOr(row.invoiceDate),
    dueDate: stringOr(row.dueDate),
    currency: stringOr(row.currency, "TZS"),
    subtotal: numberOr(row.subtotal),
    taxAmount: numberOr(row.taxAmount),
    discountAmount: numberOr(row.discountAmount),
    totalAmount: numberOr(row.totalAmount),
    attachmentUrl: optionalString(row.attachmentUrl),
    status: stringOr(row.status, "draft") as B2BSupplierInvoice["status"],
    createdAt: stringOr(row.createdAt),
    updatedAt: stringOr(row.updatedAt),
  };
}

export function fromApiSupplierPayment(raw: unknown): B2BSupplierPayment {
  const row = isRecord(raw) ? raw : {};
  return {
    id: stringOr(row.id),
    supplierShopId: refId(row.supplierShopId),
    buyerShopId: refId(row.buyerShopId),
    amount: numberOr(row.amount),
    method: stringOr(row.method, "Cash") as B2BSupplierPayment["method"],
    reference: optionalString(row.reference),
    invoiceIds: Array.isArray(row.invoiceIds) ? row.invoiceIds.map((value) => String(value)) : undefined,
    date: stringOr(row.date),
    notes: optionalString(row.notes),
    createdAt: stringOr(row.createdAt),
  };
}

/** The camelCase aliases `normalize_item` accepts for an order line. */
function orderItemPayload(item: B2BPurchaseOrderItem): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    productId: item.productId,
    productName: item.productName,
    expectedQty: item.expectedQty,
    buyingPrice: item.buyingPrice,
  };
  if (item.sourceProductId !== undefined) payload.sourceProductId = item.sourceProductId;
  if (item.receivedQty !== undefined) payload.receivedQty = item.receivedQty;
  if (item.discountAmount !== undefined) payload.discountAmount = item.discountAmount;
  if (item.taxAmount !== undefined) payload.taxAmount = item.taxAmount;
  return payload;
}

/** `subtotal` is not writable: the backend totals the lines itself. */
function orderPayload(data: Omit<B2BPurchaseOrder, "id" | "createdAt" | "updatedAt">): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    buyerShopId: data.buyerShopId,
    supplierShopId: data.supplierShopId,
    items: data.items.map(orderItemPayload),
  };
  if (data.supplierName !== undefined) payload.supplierName = data.supplierName;
  if (data.status !== undefined) payload.status = data.status;
  if (data.currency !== undefined) payload.currency = data.currency;
  if (data.paymentTerms !== undefined) payload.paymentTerms = data.paymentTerms ?? "";
  if (data.taxAmount !== undefined) payload.taxAmount = data.taxAmount;
  if (data.discountAmount !== undefined) payload.discountAmount = data.discountAmount;
  if (data.shippingCost !== undefined) payload.shippingCost = data.shippingCost;
  if (data.notes !== undefined) payload.notes = data.notes;
  return payload;
}

export async function getBuyerB2BOrders(buyerShopId: string): Promise<B2BPurchaseOrder[]> {
  const rows = await fetchAll<unknown>(ORDERS_PATH, {
    shop_id: buyerShopId,
    role: "buyer",
    page_size: MAX_PAGE_SIZE,
  });
  return rows.map(fromApiB2BOrder);
}

export async function getSupplierB2BOrders(supplierShopId: string): Promise<B2BPurchaseOrder[]> {
  const rows = await fetchAll<unknown>(ORDERS_PATH, {
    shop_id: supplierShopId,
    role: "supplier",
    page_size: MAX_PAGE_SIZE,
  });
  return rows.map(fromApiB2BOrder);
}

export async function createB2BPurchaseOrder(
  data: Omit<B2BPurchaseOrder, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const body = await getApiClient().post<unknown>(ORDERS_PATH, orderPayload(data));
  return fromApiB2BOrder(body).id;
}

/** `notes` is only sent when defined: the backend treats "" as a rewrite, absent as "leave it". */
export async function updateB2BOrderStatus(
  poId: string,
  status: B2BPurchaseOrder["status"],
  notes?: string
): Promise<void> {
  const body: Record<string, unknown> = { status };
  if (notes !== undefined) body.notes = notes;
  await getApiClient().post<unknown>(`${ORDERS_PATH}${encodeURIComponent(poId)}/update_status/`, body);
}

export async function getShipmentsForPO(poId: string): Promise<B2BShipment[]> {
  const rows = await fetchAll<unknown>(SHIPMENTS_PATH, { po_id: poId, page_size: MAX_PAGE_SIZE });
  return rows.map(fromApiShipment);
}

export async function createB2BShipment(
  data: Omit<B2BShipment, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const payload: Record<string, unknown> = {
    poId: data.poId,
    supplierShopId: data.supplierShopId,
    items: data.items.map((item) => {
      const line: Record<string, unknown> = {
        productId: item.productId,
        productName: item.productName,
        shippedQty: item.shippedQty,
      };
      if (item.sourceProductId !== undefined) line.sourceProductId = item.sourceProductId;
      return line;
    }),
  };
  if (data.status !== undefined) payload.status = data.status;
  if (data.carrier !== undefined) payload.carrier = data.carrier;
  if (data.driverName !== undefined) payload.driverName = data.driverName;
  if (data.vehicleNumber !== undefined) payload.vehicleNumber = data.vehicleNumber;
  if (data.trackingNumber !== undefined) payload.trackingNumber = data.trackingNumber;
  if (data.supplierNotes !== undefined) payload.supplierNotes = data.supplierNotes;
  const body = await getApiClient().post<unknown>(SHIPMENTS_PATH, payload);
  return fromApiShipment(body).id;
}

export async function updateB2BShipmentStatus(
  shipmentId: string,
  status: B2BShipment["status"],
  notes?: string
): Promise<void> {
  const body: Record<string, unknown> = { status };
  if (notes !== undefined) body.notes = notes;
  await getApiClient().post<unknown>(
    `${SHIPMENTS_PATH}${encodeURIComponent(shipmentId)}/update_status/`,
    body
  );
}

export async function getGRNsForPO(poId: string): Promise<GRN[]> {
  const rows = await fetchAll<unknown>(GRNS_PATH, { po_id: poId, page_size: MAX_PAGE_SIZE });
  return rows.map(fromApiGRN);
}

/** The backend derives the actor from the JWT and the supplier from the PO. */
export async function processGRNTransaction(
  grnData: Omit<GRN, "id" | "createdAt" | "completedAt">
): Promise<string> {
  const payload: Record<string, unknown> = {
    poId: grnData.poId,
    shopId: grnData.shopId,
    items: grnData.items.map((item) => {
      const line: Record<string, unknown> = {
        productId: item.productId,
        expectedQty: item.expectedQty,
        receivedQty: item.receivedQty,
        acceptedQty: item.acceptedQty,
        rejectedQty: item.rejectedQty,
        unitCost: item.unitCost,
      };
      if (item.productName) line.productName = item.productName;
      return line;
    }),
  };
  if (grnData.shipmentId !== undefined) payload.shipmentId = grnData.shipmentId;
  if (grnData.supplierId !== undefined) payload.supplierId = grnData.supplierId;
  if (grnData.notes !== undefined) payload.notes = grnData.notes;
  const body = await getApiClient().post<unknown>(`${ORDERS_PATH}process_grn/`, payload);
  return fromApiGRN(body).id;
}

export async function getBuyerSupplierBalances(buyerShopId: string): Promise<B2BSupplierBalance[]> {
  const rows = await fetchAll<unknown>(BALANCES_PATH, {
    buyer_shop_id: buyerShopId,
    page_size: MAX_PAGE_SIZE,
  });
  return rows.map(fromApiSupplierBalance);
}

export async function getBuyerInvoices(buyerShopId: string): Promise<B2BSupplierInvoice[]> {
  const rows = await fetchAll<unknown>(INVOICES_PATH, {
    buyer_shop_id: buyerShopId,
    page_size: MAX_PAGE_SIZE,
  });
  return rows.map(fromApiSupplierInvoice);
}

export async function getBuyerPayments(buyerShopId: string): Promise<B2BSupplierPayment[]> {
  const rows = await fetchAll<unknown>(PAYMENTS_PATH, {
    buyer_shop_id: buyerShopId,
    page_size: MAX_PAGE_SIZE,
  });
  return rows.map(fromApiSupplierPayment);
}

export async function createB2BSupplierInvoice(
  data: Omit<B2BSupplierInvoice, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const payload: Record<string, unknown> = {
    buyerShopId: data.buyerShopId,
    supplierShopId: data.supplierShopId,
    invoiceNumber: data.invoiceNumber,
    grnIds: data.grnIds,
    invoiceDate: data.invoiceDate,
    dueDate: data.dueDate,
    currency: data.currency,
    subtotal: data.subtotal,
    taxAmount: data.taxAmount,
    discountAmount: data.discountAmount,
    totalAmount: data.totalAmount,
    status: data.status,
  };
  if (data.purchaseOrderId) payload.purchaseOrderId = data.purchaseOrderId;
  if (data.attachmentUrl !== undefined) payload.attachmentUrl = data.attachmentUrl;
  const body = await getApiClient().post<unknown>(INVOICES_PATH, payload);
  return fromApiSupplierInvoice(body).id;
}

export async function updateB2BSupplierInvoiceStatus(
  invoiceId: string,
  status: B2BSupplierInvoice["status"],
  notes?: string
): Promise<void> {
  const body: Record<string, unknown> = { status };
  if (notes !== undefined) body.notes = notes;
  await getApiClient().post<unknown>(
    `${INVOICES_PATH}${encodeURIComponent(invoiceId)}/update_status/`,
    body
  );
}

export async function processSupplierPayment(
  paymentData: Omit<B2BSupplierPayment, "id" | "createdAt">,
  allowOverpayment = false
): Promise<string> {
  const payload: Record<string, unknown> = {
    buyerShopId: paymentData.buyerShopId,
    supplierShopId: paymentData.supplierShopId,
    amount: paymentData.amount,
    method: paymentData.method,
    allowOverpayment,
  };
  if (paymentData.reference !== undefined) payload.reference = paymentData.reference;
  if (paymentData.notes !== undefined) payload.notes = paymentData.notes;
  if (paymentData.invoiceIds !== undefined) payload.invoiceIds = paymentData.invoiceIds;
  if (paymentData.date !== undefined) payload.date = paymentData.date;
  const body = await getApiClient().post<unknown>(PAYMENTS_PATH, payload);
  return fromApiSupplierPayment(body).id;
}
