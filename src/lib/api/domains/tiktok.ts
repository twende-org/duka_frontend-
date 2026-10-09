/**
 * TikTok domain adapter, mirroring the Facebook surface in `domains/social.ts`.
 *
 * `TikTokConnect.tsx` talks to the same three backend surfaces the Meta flow
 * uses: the account session parked by the OAuth callback, the "save the
 * account" handoff, and the connected-integration reads/deletes. `Products.tsx`
 * adds the manual publish surface (`postProductToTikTok`).
 *
 * Contracts mirrored from the backend (`apps/social/tiktok.py` + the views):
 * the session read is a bare `{openId, username, displayName, avatarUrl}`
 * object, the save call answers `{success, username}`, and posting answers
 * `{success, publishId}`. Tokens never travel through this module.
 */
import { getApiClient } from "../index";
import { unwrapList } from "../client";
import { getApiBaseUrl, runtimeEnv } from "../config";

const SOCIAL_INTEGRATIONS_PATH = "/api/v1/social-integrations/";
const TIKTOK_SESSIONS_PATH = "/api/v1/social/tiktok/sessions/";
const TIKTOK_CONNECTIONS_PATH = "/api/v1/social/tiktok/connections";
const TIKTOK_POSTS_PATH = "/api/v1/social/tiktok/posts";
const TIKTOK_CALLBACK_PATH = "/api/v1/social/tiktok/callback";

/** DRF's max_page_size; a shop has a handful of integrations, not pages. */
const MAX_PAGE_SIZE = 200;

export interface TikTokAccount {
  openId: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface TikTokConnection {
  /** Django row id, used by the disconnect call. */
  id: string;
  openId?: string;
  username?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringOr(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function toTikTokAccount(raw: unknown): TikTokAccount {
  const row = isRecord(raw) ? raw : {};
  return {
    openId: stringOr(row.openId),
    username: optionalString(row.username),
    displayName: optionalString(row.displayName),
    avatarUrl: optionalString(row.avatarUrl),
  };
}

export function toTikTokConnection(raw: unknown): TikTokConnection {
  const row = isRecord(raw) ? raw : {};
  return {
    id: stringOr(row.id),
    openId: optionalString(row.pageId),
    username: optionalString(row.pageName),
  };
}

/**
 * The shop's tiktok row, connected or not. The legacy store kept it only
 * while connected (disconnect deleted it), so "row exists" is not enough:
 * callers decide what an unconnected row means for them.
 */
async function findTikTokRow(shopId: string): Promise<Record<string, unknown> | null> {
  const body = await getApiClient().get<unknown>(SOCIAL_INTEGRATIONS_PATH, {
    query: { shopId, page_size: MAX_PAGE_SIZE },
  });
  for (const entry of unwrapList<unknown>(body)) {
    if (isRecord(entry) && entry.platform === "tiktok") return entry;
  }
  return null;
}

/** The connected account, or null when not connected. */
export async function fetchTikTokConnection(shopId: string): Promise<TikTokConnection | null> {
  const row = await findTikTokRow(shopId);
  if (!row || row.isConnected !== true) return null;
  return toTikTokConnection(row);
}

/** Mirror of `deleteDoc(...)`: a missing document was already a success. */
export async function disconnectTikTok(shopId: string): Promise<void> {
  const row = await findTikTokRow(shopId);
  if (!row) return;
  await getApiClient().del(`${SOCIAL_INTEGRATIONS_PATH}${encodeURIComponent(stringOr(row.id))}/`);
}

/** The sanitized account blob parked by the OAuth callback. */
export async function fetchTikTokSessionUser(sessionId: string): Promise<TikTokAccount> {
  const body = await getApiClient().get<unknown>(
    `${TIKTOK_SESSIONS_PATH}${encodeURIComponent(sessionId)}`
  );
  return toTikTokAccount(body);
}

export interface TikTokSaveResult {
  success: boolean;
  username?: string;
}

/**
 * Posting capabilities of the connected TikTok account, straight from
 * ``post/publish/creator_info/query/`` via the backend proxy. The publish
 * dialog drives every user-visible control from this blob (privacy options,
 * disabled interactions, max video duration) so the UI matches what the
 * account can actually do.
 */
export interface TikTokCreatorInfo {
  username: string;
  avatarUrl?: string;
  privacyLevelOptions: string[];
  commentDisabled: boolean;
  duetDisabled: boolean;
  stitchDisabled: boolean;
  maxVideoPostDurationSec: number;
}

const TIKTOK_CREATOR_INFO_PATH = "/api/v1/social/tiktok/creator-info";

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

export function toTikTokCreatorInfo(raw: unknown): TikTokCreatorInfo {
  const row = isRecord(raw) ? raw : {};
  const maxDuration = row.maxVideoPostDurationSec;
  return {
    username: stringOr(row.username),
    avatarUrl: optionalString(row.avatarUrl),
    privacyLevelOptions: toStringArray(row.privacyLevelOptions),
    commentDisabled: row.commentDisabled === true,
    duetDisabled: row.duetDisabled === true,
    stitchDisabled: row.stitchDisabled === true,
    maxVideoPostDurationSec: typeof maxDuration === "number" ? maxDuration : 0,
  };
}

/** The connected account's posting capabilities; a rejected promise means
 *  the caller should stop and offer "try again later" instead of letting the
 *  user configure a post that cannot be published. */
export async function fetchTikTokCreatorInfo(shopId: string): Promise<TikTokCreatorInfo> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  try {
    const body = await getApiClient().get<unknown>(TIKTOK_CREATOR_INFO_PATH, {
      query: { shopId },
      signal: controller.signal,
    });
    return toTikTokCreatorInfo(body);
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Mirror of `saveTikTokConnection({shopId, sessionId})`. */
export async function saveTikTokConnection(
  shopId: string,
  sessionId: string
): Promise<TikTokSaveResult> {
  const body = await getApiClient().post<unknown>(TIKTOK_CONNECTIONS_PATH, {
    shopId,
    sessionId,
  });
  const row = isRecord(body) ? body : {};
  return { success: row.success === true, username: optionalString(row.username) };
}

export interface TikTokPostResult {
  success: boolean;
  publishId?: string;
}

/**
 * The user's pre-publish choices from the TikTok sheet. Every field is
 * optional so older callers keep working; the backend only forwards what it
 * receives (Content Sharing Guidelines forbid the client presetting these).
 */
export interface TikTokPostOptions {
  postFormat?: "reel" | "photo";
  privacyLevel?: "PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "SELF_ONLY";
  disableComment?: boolean;
  disableDuet?: boolean;
  disableStitch?: boolean;
  brandContent?: boolean;
  brandOrganic?: boolean;
}

/**
 * Mirror of the TikTok posting callable: publishes one product as a video.
 * A rejected promise is the failure signal (Django maps to 400/404/502).
 */
export async function postProductToTikTok(
  shopId: string,
  productId: string,
  message?: string,
  options?: TikTokPostOptions
): Promise<TikTokPostResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);
  try {
    const body = await getApiClient().post<unknown>(TIKTOK_POSTS_PATH, {
      shopId,
      productId,
      ...(message === undefined ? {} : { message }),
      ...(options?.postFormat ? { postFormat: options.postFormat } : {}),
      ...(options?.privacyLevel ? { privacyLevel: options.privacyLevel } : {}),
      ...(options?.disableComment === undefined ? {} : { disableComment: options.disableComment }),
      ...(options?.disableDuet === undefined ? {} : { disableDuet: options.disableDuet }),
      ...(options?.disableStitch === undefined ? {} : { disableStitch: options.disableStitch }),
      ...(options?.brandContent === undefined ? {} : { brandContent: options.brandContent }),
      ...(options?.brandOrganic === undefined ? {} : { brandOrganic: options.brandOrganic }),
    }, { signal: controller.signal });
    const row = isRecord(body) ? body : {};
    return { success: row.success === true, publishId: optionalString(row.publishId) };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * OAuth redirect target for the Django callback. TikTok requires an absolute
 * URL registered on the app: derive it from the API base when one is
 * configured, otherwise from the page origin (the API is served from the same
 * origin). `VITE_TIKTOK_REDIRECT_URI` overrides both for local dev.
 */
export function getTikTokCallbackUrl(): string {
  const configured = runtimeEnv("VITE_TIKTOK_REDIRECT_URI");
  if (typeof configured === "string" && configured.trim()) return configured.trim();
  const base = getApiBaseUrl();
  if (/^https?:\/\//i.test(base)) return `${base}${TIKTOK_CALLBACK_PATH}`;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}${TIKTOK_CALLBACK_PATH}`;
}

/** The TikTok client key (a.k.a. app id) the authorize dialog signs with. */
export function getTikTokClientKey(): string {
  return (runtimeEnv("VITE_TIKTOK_CLIENT_KEY") || "").trim();
}
