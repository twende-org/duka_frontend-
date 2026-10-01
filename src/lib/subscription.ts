import { fetchMeOnApi } from "./api/domains/auth";
import {
  deletePlatformUser,
  grantPlatformAdmin,
  listPlatformUsers,
  updatePlatformUser,
  type PlatformUser,
} from "./api/domains/platformUsers";
import {
  confirmSubscriptionOnApi,
  fetchSubscription,
  listSubscriptions,
  saveSubscription,
  type SubscriptionPatch,
  type SubscriptionRow,
} from "./api/domains/subscriptions";

export type PlanTier = "free" | "basic" | "business" | "enterprise";
export type SubscriptionStatus = "active" | "pending" | "expired" | "cancelled";

export interface Subscription {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  plan: PlanTier;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  paymentMethod?: string;
  paymentReference?: string;
  amount: number;
  createdAt?: any;
  updatedAt?: any;
  confirmedBy?: string;
  confirmedAt?: any;
}

export const PLAN_LIMITS: Record<PlanTier, { maxShops: number; maxProducts: number; maxStaff: number; price: number }> = {
  free: { maxShops: 1, maxProducts: 20, maxStaff: 1, price: 0 },
  basic: { maxShops: 1, maxProducts: 50, maxStaff: 3, price: 9900 },
  business: { maxShops: 5, maxProducts: 999999, maxStaff: 10, price: 29900 },
  enterprise: { maxShops: 999999, maxProducts: 999999, maxStaff: 999999, price: 79900 },
};

export type { PlatformUser };

function toSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    userId: row.userId,
    userEmail: row.userEmail,
    userName: row.userName,
    plan: (row.plan || "free") as PlanTier,
    status: (row.status || "pending") as SubscriptionStatus,
    startDate: row.startDate,
    endDate: row.endDate,
    paymentMethod: row.paymentMethod,
    paymentReference: row.paymentReference,
    amount: row.amount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    confirmedBy: row.confirmedBy,
    confirmedAt: row.confirmedAt,
  };
}

/** Only the writable plan columns; ids and timestamps are server-owned. */
function toPatch(data: Partial<Subscription>): SubscriptionPatch {
  const patch: SubscriptionPatch = {};
  if (data.userEmail !== undefined) patch.userEmail = data.userEmail;
  if (data.userName !== undefined) patch.userName = data.userName;
  if (data.plan !== undefined) patch.plan = data.plan;
  if (data.status !== undefined) patch.status = data.status;
  if (data.startDate !== undefined) patch.startDate = data.startDate;
  if (data.endDate !== undefined) patch.endDate = data.endDate;
  if (data.paymentMethod !== undefined) patch.paymentMethod = data.paymentMethod;
  if (data.paymentReference !== undefined) patch.paymentReference = data.paymentReference;
  if (data.amount !== undefined) patch.amount = data.amount;
  return patch;
}

/** The caller's plan row, or null when they are on the implicit free tier. */
export async function getUserSubscription(userId: string): Promise<Subscription | null> {
  const row = await fetchSubscription(userId);
  return row ? toSubscription(row) : null;
}

/** Upsert the plan row (the legacy ``setDoc`` created it when missing). */
export async function createSubscription(userId: string, data: Omit<Subscription, "id">): Promise<void> {
  await saveSubscription(userId, toPatch(data), false);
}

export async function updateSubscription(subId: string, data: Partial<Subscription>): Promise<void> {
  await saveSubscription(subId, toPatch(data), true);
}

/** Staff activation; ``adminId`` is stamped from the token server-side. */
export async function confirmSubscription(subId: string, adminId: string): Promise<void> {
  void adminId;
  await confirmSubscriptionOnApi(subId);
}

export async function getAllSubscriptions(): Promise<Subscription[]> {
  const rows = await listSubscriptions();
  return rows.map(toSubscription);
}

export async function getAllUsers(): Promise<PlatformUser[]> {
  return listPlatformUsers();
}

/**
 * Platform-admin check, now answered by Django: the legacy
 * ``admins/{uid}`` marker is the ``is_staff`` flag on the signed-in user.
 * ``userId`` is kept so the existing call sites keep their signatures; the
 * token identifies the caller, so the argument is ignored.
 */
export async function isSystemAdmin(userId: string): Promise<boolean> {
  void userId;
  const me = await fetchMeOnApi();
  return Boolean(me.isStaff);
}

/** Grant the platform-admin flag (the legacy ``admins/{uid}`` marker). */
export async function setSystemAdmin(userId: string, email: string): Promise<void> {
  void email;
  await grantPlatformAdmin(userId, true);
}

export async function setUserStatus(userId: string, isSuspended: boolean): Promise<void> {
  await updatePlatformUser(userId, { isSuspended });
}

/** Merge only ``businessProfile.status``, the legacy dot-path write. */
export async function updateUserBusinessStatus(userId: string, status: "PENDING" | "APPROVED" | "REJECTED"): Promise<void> {
  await updatePlatformUser(userId, { businessProfile: { status } });
}

/** Delete the account; roles, subscription and wishlist cascade server-side. */
export async function deleteUserAccount(userId: string): Promise<void> {
  await deletePlatformUser(userId);
}
