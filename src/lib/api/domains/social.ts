/**
 * Social domain adapter for the strangler-fig cutover.
 *
 * `FacebookConnect.tsx` talks to three backend surfaces that used to be one
 * stored document plus two serverless calls:
 *   - the page picker session parked by the OAuth callback,
 *   - the "save the selected page" handoff,
 *   - the connected-integration reads/updates (auto-reply switch, disconnect).
 *
 * `Products.tsx` adds the manual publish surface on top:
 *   - the `postProductToFacebook` callable, now a plain authenticated POST.
 *
 * This module mirrors the Cloud Function contracts exactly, because the
 * components render their payloads as-is: the session read is a bare array of
 * `{id, name, category}`, the save call answers `{success, instagramLinked}`,
 * and posting answers `{success, facebookPostId, instagramPostId}`.
 *
 * Tokens never travel through this module. The session endpoint strips the
 * per-page access tokens and both the save and post endpoints keep the
 * encrypted page/user tokens server-side, so everything below operates on
 * page identity only.
 */
import { getApiClient } from "../index";
import { unwrapList } from "../client";
import { getApiBaseUrl, runtimeEnv } from "../config";

const SOCIAL_INTEGRATIONS_PATH = "/api/v1/social-integrations/";
const SOCIAL_LOGS_PATH = "/api/v1/social-logs/";
const FACEBOOK_SESSIONS_PATH = "/api/v1/social/facebook/sessions/";
const FACEBOOK_CONNECTIONS_PATH = "/api/v1/social/facebook/connections";
const FACEBOOK_POSTS_PATH = "/api/v1/social/facebook/posts";
const FACEBOOK_CALLBACK_PATH = "/api/v1/social/facebook/callback";

/** DRF's max_page_size; a shop has a handful of integrations, not pages. */
const MAX_PAGE_SIZE = 200;

export interface FacebookPage {
  id: string;
  name: string;
  category: string;
  /**
   * Only the legacy manual/env-token helper surfaces this (it reads Graph
   * directly from the browser); the secure session path strips it.
   */
  access_token?: string;
}

export interface FacebookConnection {
  /** Django row id, used by the disconnect and auto-reply calls. */
  id: string;
  pageId?: string;
  pageName?: string;
  instagramId?: string;
  autoReplyEnabled: boolean;
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

export function toFacebookPage(raw: unknown): FacebookPage {
  const row = isRecord(raw) ? raw : {};
  return {
    id: stringOr(row.id),
    name: stringOr(row.name),
    category: stringOr(row.category),
    access_token: optionalString(row.access_token),
  };
}

export function toFacebookConnection(raw: unknown): FacebookConnection {
  const row = isRecord(raw) ? raw : {};
  return {
    id: stringOr(row.id),
    pageId: optionalString(row.pageId),
    pageName: optionalString(row.pageName),
    instagramId: optionalString(row.instagramId),
    autoReplyEnabled: row.autoReplyEnabled === true,
  };
}

/**
 * The shop's facebook row, connected or not. The legacy store kept it only
 * while connected (disconnect deleted it), so "row exists" is not enough:
 * callers decide what an unconnected row means for them.
 */
async function findFacebookRow(shopId: string): Promise<Record<string, unknown> | null> {
  const body = await getApiClient().get<unknown>(SOCIAL_INTEGRATIONS_PATH, {
    query: { shopId, page_size: MAX_PAGE_SIZE },
  });
  for (const entry of unwrapList<unknown>(body)) {
    if (isRecord(entry) && entry.platform === "facebook") return entry;
  }
  return null;
}

/** The connected page, or null when not connected. */
export async function fetchFacebookConnection(shopId: string): Promise<FacebookConnection | null> {
  const row = await findFacebookRow(shopId);
  if (!row || row.isConnected !== true) return null;
  return toFacebookConnection(row);
}

/** Mirror of `deleteDoc(...)`: a missing document was already a success. */
export async function disconnectFacebookPage(shopId: string): Promise<void> {
  const row = await findFacebookRow(shopId);
  if (!row) return;
  await getApiClient().del(`${SOCIAL_INTEGRATIONS_PATH}${encodeURIComponent(stringOr(row.id))}/`);
}

/** Mirror of `updateDoc(..., {autoReplyEnabled})`, including its not-found failure. */
export async function setFacebookAutoReply(shopId: string, enabled: boolean): Promise<void> {
  const row = await findFacebookRow(shopId);
  if (!row) throw new Error("Facebook is not connected for this shop.");
  await getApiClient().patch(`${SOCIAL_INTEGRATIONS_PATH}${encodeURIComponent(stringOr(row.id))}/`, {
    autoReplyEnabled: enabled,
  });
}

/** Mirror of `getFacebookPagesSession({sessionId})`: a bare page array. */
export async function fetchFacebookSessionPages(sessionId: string): Promise<FacebookPage[]> {
  const body = await getApiClient().get<unknown>(
    `${FACEBOOK_SESSIONS_PATH}${encodeURIComponent(sessionId)}`
  );
  return unwrapList<unknown>(body).map(toFacebookPage);
}

export interface FacebookSaveResult {
  success: boolean;
  instagramLinked: boolean;
}

/** Mirror of `saveFacebookConnection({shopId, pageId, sessionId})`. */
export async function saveFacebookConnection(
  shopId: string,
  pageId: string,
  sessionId: string
): Promise<FacebookSaveResult> {
  const body = await getApiClient().post<unknown>(FACEBOOK_CONNECTIONS_PATH, {
    shopId,
    pageId,
    sessionId,
  });
  const row = isRecord(body) ? body : {};
  return { success: row.success === true, instagramLinked: row.instagramLinked === true };
}

export interface FacebookPostResult {
  success: boolean;
  /** Null for text-only posts and when only Instagram accepted the media. */
  facebookPostId?: string;
  /** Null when no Instagram business account is linked or Instagram failed. */
  instagramPostId?: string;
}

/**
 * Mirror of `postProductToFacebook({shopId, productId, message, includeImage})`.
 *
 * The callable resolved with `{success: true, facebookPostId, instagramPostId}`
 * even when a platform id was null, and only rejected on real failures — Django
 * maps those to `FacebookNotConnected` / `ProductNotFound` / posting errors, so
 * callers keep treating a rejected promise as the failure signal.
 */
export async function postProductToFacebook(
  shopId: string,
  productId: string,
  includeImage: boolean,
  message?: string
): Promise<FacebookPostResult> {
  const body = await getApiClient().post<unknown>(FACEBOOK_POSTS_PATH, {
    shopId,
    productId,
    includeImage,
    ...(message === undefined ? {} : { message }),
  });
  const row = isRecord(body) ? body : {};
  return {
    success: row.success === true,
    facebookPostId: optionalString(row.facebookPostId),
    instagramPostId: optionalString(row.instagramPostId),
  };
}

/**
 * OAuth redirect target for the Django callback. Facebook requires an absolute
 * URL: derive it from the API base when one is configured, otherwise from the
 * page origin (the API is served from the same origin).
 */
export function getFacebookCallbackUrl(): string {
  const configured = runtimeEnv("VITE_FACEBOOK_REDIRECT_URI");
  if (typeof configured === "string" && configured.trim()) return configured.trim();
  const base = getApiBaseUrl();
  if (/^https?:\/\//i.test(base)) return `${base}${FACEBOOK_CALLBACK_PATH}`;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}${FACEBOOK_CALLBACK_PATH}`;
}

/** One row of the post/reply outcome log the social dashboard renders. */
export interface SocialLogRow {
  id: string;
  /** "social_post" | "ai_reply" (open-ended server-side). */
  type: string;
  /** "post" | "reply". */
  action: string;
  /** "success" | "failure". */
  status: string;
  facebookPostId?: string;
  instagramPostId?: string;
  error?: string;
  productIds?: string[];
  videoFallbackReason?: string;
  instagramError?: string;
  /** ISO timestamp; the legacy ``social_logs`` doc used a timestamp object. */
  createdAt?: string;
}

export function fromApiSocialLog(raw: unknown): SocialLogRow {
  const row = isRecord(raw) ? raw : {};
  return {
    id: stringOr(row.id ?? row.logId ?? row.log_id),
    type: stringOr(row.type),
    action: stringOr(row.action),
    status: stringOr(row.status),
    facebookPostId: optionalString(row.facebookPostId),
    instagramPostId: optionalString(row.instagramPostId),
    error: optionalString(row.error),
    productIds: Array.isArray(row.productIds) ? (row.productIds as string[]) : undefined,
    videoFallbackReason: optionalString(row.videoFallbackReason),
    instagramError: optionalString(row.instagramError),
    createdAt: optionalString(row.createdAt ?? row.created_at),
  };
}

/**
 * The shop's newest log rows. The endpoint is read-only and serves
 * ``-created_at`` order, so no client-side sort is needed.
 */
export async function fetchSocialLogs(shopId: string, maxLogs = 20): Promise<SocialLogRow[]> {
  const pageSize = Math.min(Math.max(Math.trunc(maxLogs) || 20, 1), MAX_PAGE_SIZE);
  const body = await getApiClient().get<unknown>(SOCIAL_LOGS_PATH, {
    query: { shop_id: shopId, page_size: pageSize },
  });
  return unwrapList<unknown>(body).slice(0, pageSize).map(fromApiSocialLog);
}
