/**
 * Shops, branches, staff roles and invitations adapter.
 *
 * These four collections used to live in the legacy backend; Django now owns them:
 *
 *   GET/POST/PATCH/DELETE /api/v1/shops/{id}/           -> shops (caller-scoped)
 *   GET/POST/PATCH/DELETE /api/v1/branches/{id}/        -> branches
 *   GET/POST/DELETE       /api/v1/user-roles/{id}/      -> staff roles
 *   GET/POST/DELETE       /api/v1/invitations/{id}/     -> invitations
 *   POST                  /api/v1/invitations/{id}/accept/ | /decline/
 *   GET/POST              /api/v1/stock-transfers/{id}/ (+ /complete/, /cancel/)
 *
 * Every id in and out is the app-visible id: the legacy document id
 * when the row came from the legacy backend, otherwise the Django uuid. Shop rows answer
 * with ``legacyId`` when they have one, so ``Shop.id`` stays the value the rest
 * of the dashboard (roles, branches, invitations) keys on.
 */
import type { Branch, Invitation, Shop, StockTransfer } from "@/types";
import { getApiClient, unwrapList } from "../index";

const SHOPS_PATH = "/api/v1/shops/";
const BRANCHES_PATH = "/api/v1/branches/";
const STOCK_TRANSFERS_PATH = "/api/v1/stock-transfers/";
const USER_ROLES_PATH = "/api/v1/user-roles/";
const INVITATIONS_PATH = "/api/v1/invitations/";

/** DRF's max_page_size; matches the legacy 200-row page. */
const MAX_PAGE_SIZE = 200;
const MAX_PAGES = 100;

export interface ShopMemberRole {
  id: string;
  userId: string;
  shopId: string;
  role: "owner" | "attendant" | "manager";
  email?: string;
  displayName?: string;
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

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === "string");
}

function optionalObject(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
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

function resourcePath(base: string, id: string): string {
  return `${base}${encodeURIComponent(id)}/`;
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

// ---- Shops ----

export function fromApiShop(raw: unknown): Shop {
  const row = isRecord(raw) ? raw : {};
  return {
    id: optionalString(row.legacyId ?? row.legacy_id) ?? stringOr(row.id),
    name: stringOr(row.name),
    slug: optionalString(row.slug),
    location: stringOr(row.location),
    ownerId: stringOr(row.ownerId ?? row.owner_id),
    phone: optionalString(row.phone),
    whatsappNumber: optionalString(row.whatsappNumber ?? row.whatsapp),
    description: optionalString(row.description),
    lat: optionalNumber(row.lat),
    lon: optionalNumber(row.lon),
    imageUrl: optionalString(row.imageUrl),
    coverImage: optionalString(row.coverImage),
    isPublic: Boolean(row.isPublic ?? row.is_public),
    isWholesaleSupplier: Boolean(row.isWholesaleSupplier ?? row.is_wholesale_supplier),
    operatingHours: optionalString(row.operatingHours ?? row.operating_hours),
    facebookUrl: optionalString(row.facebookUrl),
    instagramUrl: optionalString(row.instagramUrl),
    tiktokUrl: optionalString(row.tiktokUrl),
    productCondition: optionalString(row.productCondition) as Shop["productCondition"],
    categories: stringArray(row.categories ?? row.productCategories),
    businessCategories: stringArray(row.businessCategories),
    productCategories: stringArray(row.productCategories ?? row.categories),
    followerCount: optionalNumber(row.followerCount ?? row.follower_count),
    salesTotal: optionalNumber(row.salesTotal),
    salesChannels: stringArray(row.salesChannels),
    country: optionalString(row.country),
    region: optionalString(row.region),
    district: optionalString(row.district),
    address: optionalString(row.address),
    currency: optionalString(row.currency),
    language: optionalString(row.language),
    timezone: optionalString(row.timezone),
    slogan: optionalString(row.slogan),
    website: optionalString(row.website),
    setupStatus: optionalString(row.setupStatus) as Shop["setupStatus"],
    setupProgress: optionalNumber(row.setupProgress),
    keepsStock: Boolean(row.keepsStock ?? row.keeps_stock),
    trackInventory: Boolean(row.trackInventory ?? row.track_inventory),
    businessType: optionalString(row.businessType),
    verificationStatus: optionalString(row.verificationStatus) as Shop["verificationStatus"],
    email: optionalString(row.email),
    shopTypes: stringArray(row.shopTypes),
    customerTypes: stringArray(row.customerTypes),
    pricingModels: stringArray(row.pricingModels),
    inventoryModel: optionalString(row.inventoryModel),
    stockLocations: stringArray(row.stockLocations),
    fulfillmentMethods: stringArray(row.fulfillmentMethods),
    serviceCoverage: stringArray(row.serviceCoverage),
    productCapabilities: optionalObject(row.productCapabilities) as Shop["productCapabilities"],
  };
}

/**
 * Translate a shop patch to the serializer's field names.
 *
 * Everything else is passed through: the serializer declares the camelCase
 * aliases (``whatsappNumber``, ``categories``) alongside the model fields, so
 * only the onboarding wizard's nested ``legal`` block needs flattening.
 */
function shopWritePayload(data: Partial<Shop>): Record<string, unknown> {
  const { legal, ...rest } = data;
  const payload: Record<string, unknown> = { ...rest };
  if (legal) {
    if (legal.tin !== undefined) payload.tin_number = legal.tin;
    if (legal.vrn !== undefined) payload.vrn_number = legal.vrn;
    if (legal.licenseNumber !== undefined) payload.license_number = legal.licenseNumber;
    if (legal.registrationNumber !== undefined) payload.registration_number = legal.registrationNumber;
  }
  return payload;
}

/**
 * Shops the caller can access (owned OR assigned via a role). The backend
 * scopes the queryset, so the legacy ``userId`` argument is no longer needed.
 */
export async function getShops(_userId?: string): Promise<Shop[]> {
  const rows = await fetchAll<unknown>(SHOPS_PATH, { page_size: MAX_PAGE_SIZE });
  return rows.map(fromApiShop);
}

/** Every shop in the directory; only staff/superusers see more than their own. */
export async function getAllShopsAdmin(): Promise<Shop[]> {
  const rows = await fetchAll<unknown>(SHOPS_PATH, { page_size: MAX_PAGE_SIZE });
  return rows.map(fromApiShop);
}

/** Create the shop: the backend also seeds the owner role and the main branch. */
export async function addShop(data: Omit<Shop, "id">): Promise<string> {
  const created = await getApiClient().post<unknown>(SHOPS_PATH, shopWritePayload(data));
  return fromApiShop(created).id;
}

export async function updateShop(id: string, data: Partial<Shop>): Promise<Shop> {
  return fromApiShop(
    await getApiClient().patch<unknown>(resourcePath(SHOPS_PATH, id), shopWritePayload(data))
  );
}

export async function deleteShop(id: string): Promise<void> {
  await getApiClient().del<unknown>(resourcePath(SHOPS_PATH, id));
}

// ---- Branches ----

export function fromApiBranch(raw: unknown): Branch {
  const row = isRecord(raw) ? raw : {};
  return {
    id: optionalString(row.legacyId ?? row.legacy_id) ?? stringOr(row.id),
    shopId: stringOr(row.shopId ?? row.shop),
    name: stringOr(row.name),
    location: optionalString(row.location),
    phone: optionalString(row.phone),
    managerId: optionalString(row.managerId ?? row.manager),
    managerName: optionalString(row.managerName),
    isActive: Boolean(row.isActive ?? row.is_active),
    type: optionalString(row.type ?? row.branch_type),
    timezone: optionalString(row.timezone),
    operatingHours: optionalString(row.operatingHours ?? row.operating_hours),
    features: optionalObject(row.features) as Branch["features"],
    createdAt: optionalString(row.createdAt ?? row.created_at),
  };
}

export async function getBranches(shopId: string): Promise<Branch[]> {
  const rows = await fetchAll<unknown>(BRANCHES_PATH, { shop_id: shopId, page_size: MAX_PAGE_SIZE });
  return rows.map(fromApiBranch);
}

export async function addBranch(data: Omit<Branch, "id">): Promise<string> {
  const created = await getApiClient().post<unknown>(BRANCHES_PATH, data);
  return fromApiBranch(created).id;
}

export async function updateBranch(id: string, data: Partial<Branch>): Promise<Branch> {
  return fromApiBranch(await getApiClient().patch<unknown>(resourcePath(BRANCHES_PATH, id), data));
}

export async function deleteBranch(id: string): Promise<void> {
  await getApiClient().del<unknown>(resourcePath(BRANCHES_PATH, id));
}

// ---- Stock Transfers ----

export function fromApiStockTransfer(raw: unknown): StockTransfer {
  const row = isRecord(raw) ? raw : {};
  return {
    id: optionalString(row.legacyId ?? row.legacy_id) ?? stringOr(row.id),
    shopId: stringOr(row.shopId ?? row.shop),
    fromBranchId: stringOr(row.fromBranchId ?? row.from_branch),
    toBranchId: stringOr(row.toBranchId ?? row.to_branch),
    productId: stringOr(row.productId ?? row.product),
    productName: stringOr(row.productName),
    quantity: optionalNumber(row.quantity) ?? 0,
    status: stringOr(row.status, "pending") as StockTransfer["status"],
    notes: optionalString(row.notes),
    createdBy: stringOr(row.createdBy ?? row.created_by),
    createdByName: optionalString(row.createdByName),
    createdAt: optionalString(row.createdAt ?? row.created_at),
    completedAt: optionalString(row.completedAt ?? row.completed_at),
  };
}

export async function getStockTransfers(shopId: string): Promise<StockTransfer[]> {
  const rows = await fetchAll<unknown>(STOCK_TRANSFERS_PATH, { shop_id: shopId, page_size: MAX_PAGE_SIZE });
  return rows.map(fromApiStockTransfer);
}

export async function addStockTransfer(data: Omit<StockTransfer, "id">): Promise<string> {
  const created = await getApiClient().post<unknown>(STOCK_TRANSFERS_PATH, data);
  return fromApiStockTransfer(created).id;
}

/** Completing moves the stock server-side (from-branch out, to-branch in). */
export async function completeStockTransfer(id: string): Promise<StockTransfer> {
  return fromApiStockTransfer(
    await getApiClient().post<unknown>(`${resourcePath(STOCK_TRANSFERS_PATH, id)}complete/`)
  );
}

export async function cancelStockTransfer(id: string): Promise<StockTransfer> {
  return fromApiStockTransfer(
    await getApiClient().post<unknown>(`${resourcePath(STOCK_TRANSFERS_PATH, id)}cancel/`)
  );
}

// ---- Staff roles ----

export function fromApiShopMemberRole(raw: unknown): ShopMemberRole {
  const row = isRecord(raw) ? raw : {};
  return {
    id: stringOr(row.id),
    userId: stringOr(row.userId ?? row.user_id),
    shopId: stringOr(row.shopId ?? row.shop_id),
    role: stringOr(row.role, "attendant") as ShopMemberRole["role"],
    email: optionalString(row.email),
    displayName: optionalString(row.displayName),
  };
}

/** The (id, role) rows behind the staff page's product/order attribution. */
export async function getShopUsers(shopId: string): Promise<ShopMemberRole[]> {
  const rows = await fetchAll<unknown>(USER_ROLES_PATH, { shop_id: shopId, page_size: MAX_PAGE_SIZE });
  return rows.map(fromApiShopMemberRole);
}

/** Assignment is an upsert server-side, mirroring the legacy composite write. */
export async function assignUserRole(
  userId: string,
  shopId: string,
  role: "owner" | "attendant" | "manager"
): Promise<ShopMemberRole> {
  return fromApiShopMemberRole(
    await getApiClient().post<unknown>(USER_ROLES_PATH, { userId, shopId, role })
  );
}

/** The legacy signature resolves the row itself, so both ids are needed. */
export async function removeUserRole(userId: string, shopId: string): Promise<void> {
  const rows = await fetchAll<unknown>(USER_ROLES_PATH, {
    shop_id: shopId,
    user_id: userId,
    page_size: MAX_PAGE_SIZE,
  });
  const roles = rows.map(fromApiShopMemberRole);
  const target = roles.find((row) => row.userId === userId) ?? roles[0];
  if (!target) return;
  await getApiClient().del<unknown>(resourcePath(USER_ROLES_PATH, target.id));
}

// ---- Invitations ----

export function fromApiInvitation(raw: unknown): Invitation {
  const row = isRecord(raw) ? raw : {};
  return {
    id: optionalString(row.legacyId ?? row.legacy_id) ?? stringOr(row.id),
    email: stringOr(row.email),
    shopId: stringOr(row.shopId ?? row.shop),
    role: stringOr(row.role, "attendant") as Invitation["role"],
    status: stringOr(row.status, "pending") as Invitation["status"],
    createdAt: stringOr(row.createdAt ?? row.created_at),
    updatedAt: stringOr(row.updatedAt ?? row.updated_at),
    invitedBy: stringOr(row.invitedBy ?? row.invited_by),
    shopName: optionalString(row.shopName),
  };
}

/** The shop's pending invitations (inviting staff is an owner/manager action). */
export async function getShopInvitations(shopId: string): Promise<Invitation[]> {
  const rows = await fetchAll<unknown>(INVITATIONS_PATH, {
    shop_id: shopId,
    status: "pending",
    page_size: MAX_PAGE_SIZE,
  });
  return rows.map(fromApiInvitation);
}

/**
 * The caller's own pending invitations. The legacy ``email`` argument is
 * ignored: the backend scopes ``?mine=true`` to the authenticated user.
 */
export async function getInvitationsByEmail(_email?: string): Promise<Invitation[]> {
  const rows = await fetchAll<unknown>(INVITATIONS_PATH, {
    mine: "true",
    status: "pending",
    page_size: MAX_PAGE_SIZE,
  });
  return rows.map(fromApiInvitation);
}

export async function sendInvitation(
  data: Omit<Invitation, "id" | "status" | "createdAt" | "updatedAt">
): Promise<string> {
  const created = await getApiClient().post<unknown>(INVITATIONS_PATH, {
    shopId: data.shopId,
    email: data.email,
    role: data.role,
  });
  return fromApiInvitation(created).id;
}

/** Withdraw a pending invitation (hard delete, as the legacy helper did). */
export async function cancelInvitation(invitationId: string): Promise<void> {
  await getApiClient().del<unknown>(resourcePath(INVITATIONS_PATH, invitationId));
}

/** Accept as the invitee: the backend creates the role in the same transaction. */
export async function acceptInvitation(
  invitationId: string,
  _userId?: string
): Promise<Invitation> {
  return fromApiInvitation(
    await getApiClient().post<unknown>(`${resourcePath(INVITATIONS_PATH, invitationId)}accept/`)
  );
}

export async function declineInvitation(invitationId: string): Promise<Invitation> {
  return fromApiInvitation(
    await getApiClient().post<unknown>(`${resourcePath(INVITATIONS_PATH, invitationId)}decline/`)
  );
}
