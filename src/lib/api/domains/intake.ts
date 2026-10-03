/**
 * Twende Duka AI intake domain adapter (staging area).
 *
 * The review workspace (`InventoryIntake.tsx`) talks to this module, never to
 * the client directly. Batches carry their drafts inline; the adapter keeps
 * the app-facing shape camelCased and defensively normalized like the other
 * domains.
 */
import type { IntakeApplySummary, IntakeBatch, IntakeDraft, IntakeQuota, IntakeSource } from "@/types";
import { getApiClient } from "../index";
import { unwrapList } from "../client";

const BATCHES_PATH = "/api/v1/inventory/intake/";
const DRAFTS_PATH = "/api/v1/inventory/intake-drafts/";
const QUOTA_PATH = "/api/v1/inventory/intake/quota/";

const MAX_PAGE_SIZE = 200;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringOr(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function numberOr(value: unknown, fallback = 0): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

const BATCH_STATUSES = new Set(["pending", "processing", "completed", "failed", "applied"]);
const SOURCE_TYPES = new Set(["qr", "image", "url"]);

export function fromApiIntakeDraft(raw: unknown): IntakeDraft {
  const row = isRecord(raw) ? raw : {};
  return {
    id: stringOr(row.id),
    batchId: stringOr(row.batchId ?? row.batch),
    nameEn: stringOr(row.nameEn),
    nameSw: stringOr(row.nameSw),
    unit: stringOr(row.unit) || "pcs",
    quantity: numberOr(row.quantity),
    buyingPrice: numberOr(row.buyingPrice),
    sellingPrice: numberOr(row.sellingPrice),
    categoryName: stringOr(row.categoryName),
    aiConfidenceScore: numberOr(row.aiConfidenceScore),
    traItemCode: stringOr(row.traItemCode),
    taxRatePercent: numberOr(row.taxRatePercent, 18),
    appliedProductId: typeof row.appliedProductId === "string" ? row.appliedProductId : null,
    createdAt: stringOr(row.createdAt),
    updatedAt: stringOr(row.updatedAt),
  };
}

export function fromApiIntakeBatch(raw: unknown): IntakeBatch {
  const row = isRecord(raw) ? raw : {};
  const rawSources = Array.isArray(row.sources) ? row.sources : [];
  return {
    id: stringOr(row.id),
    shopId: stringOr(row.shopId ?? row.shop),
    status: BATCH_STATUSES.has(stringOr(row.status)) ? (row.status as IntakeBatch["status"]) : "pending",
    sourceType: SOURCE_TYPES.has(stringOr(row.sourceType)) ? (row.sourceType as IntakeBatch["sourceType"]) : "image",
    engineUsed: stringOr(row.engineUsed) as IntakeBatch["engineUsed"],
    sources: rawSources
      .filter(isRecord)
      .map((source) => ({
        kind: SOURCE_TYPES.has(stringOr(source.kind)) ? (source.kind as IntakeSource["kind"]) : "image",
        ref: stringOr(source.ref) || undefined,
        name: stringOr(source.name) || undefined,
        contentType: stringOr(source.contentType) || undefined,
      })),
    sourceNote: stringOr(row.sourceNote) || undefined,
    errorMessage: stringOr(row.errorMessage) || undefined,
    itemCount: numberOr(row.itemCount),
    drafts: Array.isArray(row.drafts) ? row.drafts.map(fromApiIntakeDraft) : [],
    createdById: stringOr(row.createdById) || undefined,
    createdAt: stringOr(row.createdAt),
    updatedAt: stringOr(row.updatedAt),
  };
}

function relativePath(target: string): string {
  if (target.startsWith("/")) return target;
  try {
    const url = new URL(target, "http://localhost");
    return `${url.pathname}${url.search}`;
  } catch {
    return target;
  }
}

async function fetchAllBatches(query: Record<string, string | number>): Promise<IntakeBatch[]> {
  const client = getApiClient();
  const collected: IntakeBatch[] = [];
  let nextPath: string | null = BATCHES_PATH;
  let nextQuery: Record<string, string | number> | undefined = query;
  for (let page = 0; nextPath && page < 20; page += 1) {
    const body = await client.get<unknown>(nextPath, nextQuery ? { query: nextQuery } : undefined);
    collected.push(...unwrapList<unknown>(body).map(fromApiIntakeBatch));
    const next = isRecord(body) && typeof body.next === "string" ? body.next : null;
    nextPath = next ? relativePath(next) : null;
    nextQuery = undefined;
  }
  return collected;
}

export function getIntakeBatches(shopId: string): Promise<IntakeBatch[]> {
  return fetchAllBatches({ shop_id: shopId, page_size: MAX_PAGE_SIZE });
}

export function getIntakeBatch(batchId: string): Promise<IntakeBatch> {
  return getApiClient()
    .get<unknown>(`${BATCHES_PATH}${encodeURIComponent(batchId)}/`)
    .then(fromApiIntakeBatch);
}

function fromApiIntakeQuota(raw: unknown): IntakeQuota {
  const row = isRecord(raw) ? raw : {};
  const limit = row.aiIntakeMonthlyLimit ?? row.limit;
  const remaining = row.remaining;
  return {
    limit: limit == null ? null : numberOr(limit),
    used: numberOr(row.used),
    remaining: remaining == null ? null : numberOr(remaining),
  };
}

/** Monthly AI photo allowance for one shop (null limit/remaining = unlimited). */
export function getIntakeQuota(shopId: string): Promise<IntakeQuota> {
  return getApiClient()
    .get<unknown>(QUOTA_PATH, { query: { shop_id: shopId } })
    .then(fromApiIntakeQuota);
}

export interface CreateIntakeBatchInput {
  shopId: string;
  note?: string;
  /** Compressed data URLs picked on-device (spec: client-side optimization). */
  imageDataUrls?: string[];
  /** Remote invoice image URLs the server should fetch itself. */
  imageUrl?: string[];
  /** Raw wholesale QR JSON payloads — parsed locally, AI skipped. */
  qrPayloads?: string[];
}

/** Images ride as multipart files; QR payloads and URLs go as regular fields. */
export async function createIntakeBatch(input: CreateIntakeBatchInput): Promise<IntakeBatch> {
  const client = getApiClient();
  const images = input.imageDataUrls ?? [];
  let body: unknown;
  if (images.length > 0) {
    const form = new FormData();
    form.append("shopId", input.shopId);
    if (input.note) form.append("sourceNote", input.note);
    for (const payload of input.imageUrl ?? []) form.append("imageUrls", payload);
    for (const payload of input.qrPayloads ?? []) form.append("qrPayloads", payload);
    images.forEach((dataUrl, index) => {
      form.append("images", dataUrlToIntakeBlob(dataUrl), `intake-${index + 1}.jpg`);
    });
    body = form;
  } else {
    body = {
      shopId: input.shopId,
      sourceNote: input.note || "",
      imageUrls: input.imageUrl ?? [],
      qrPayloads: input.qrPayloads ?? [],
    };
  }
  const raw = await client.post<unknown>(BATCHES_PATH, body);
  return fromApiIntakeBatch(raw);
}

const DATA_URL_PATTERN = /^data:([^;,]+)?;base64,(.*)$/s;

function dataUrlToIntakeBlob(dataUrl: string): Blob {
  const match = DATA_URL_PATTERN.exec(dataUrl);
  if (!match) throw new Error("Intake image must be a data URL from the on-device compressor.");
  const contentType = match[1] || "image/jpeg";
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: contentType });
}

export function updateIntakeDraft(draftId: string, patch: Partial<IntakeDraft>): Promise<IntakeDraft> {
  const payload: Record<string, unknown> = {};
  if (patch.nameEn !== undefined) payload.nameEn = patch.nameEn;
  if (patch.nameSw !== undefined) payload.nameSw = patch.nameSw;
  if (patch.unit !== undefined) payload.unit = patch.unit;
  if (patch.quantity !== undefined) payload.quantity = patch.quantity;
  if (patch.buyingPrice !== undefined) payload.buyingPrice = patch.buyingPrice;
  if (patch.sellingPrice !== undefined) payload.sellingPrice = patch.sellingPrice;
  if (patch.categoryName !== undefined) payload.categoryName = patch.categoryName;
  if (patch.aiConfidenceScore !== undefined) payload.aiConfidenceScore = patch.aiConfidenceScore;
  if (patch.traItemCode !== undefined) payload.traItemCode = patch.traItemCode;
  if (patch.taxRatePercent !== undefined) payload.taxRatePercent = patch.taxRatePercent;
  return getApiClient()
    .patch<unknown>(`${DRAFTS_PATH}${encodeURIComponent(draftId)}/`, payload)
    .then(fromApiIntakeDraft);
}

export async function deleteIntakeDraft(draftId: string): Promise<void> {
  await getApiClient().del(`${DRAFTS_PATH}${encodeURIComponent(draftId)}/`);
}

export async function applyIntakeBatch(batchId: string): Promise<IntakeApplySummary> {
  const raw = await getApiClient().post<unknown>(`${BATCHES_PATH}${encodeURIComponent(batchId)}/apply/`);
  const row = isRecord(raw) ? raw : {};
  const summary = isRecord(row.summary) ? row.summary : {};
  return {
    created: numberOr(summary.created),
    updated: numberOr(summary.updated),
    skipped: numberOr(summary.skipped),
  };
}
