const VIEWS_KEY = "duka_product_views";
const FIRST_SEEN_KEY = "duka_product_first_seen";
const BASE_VIEWS = 50;
const BASE_DELAY_MS = 12 * 60 * 60 * 1000; // 12 hours

interface ViewData {
  [productId: string]: number;
}

function getStore(key: string): Record<string, any> {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
}

function setStore(key: string, data: Record<string, any>) {
  localStorage.setItem(key, JSON.stringify(data));
}

/** Get the display view count for a product (base + real views) */
export function getProductViews(productId: string): number {
  const views: ViewData = getStore(VIEWS_KEY);
  const firstSeen = getStore(FIRST_SEEN_KEY);
  const real = views[productId] || 0;

  // Add base views only after 12hrs from first seen
  const seenAt = firstSeen[productId];
  if (seenAt && Date.now() - seenAt >= BASE_DELAY_MS) {
    return BASE_VIEWS + real;
  }
  // Before 12hrs, still show base but scaled by time elapsed
  if (seenAt) {
    const elapsed = Date.now() - seenAt;
    const ratio = Math.min(elapsed / BASE_DELAY_MS, 1);
    return Math.floor(BASE_VIEWS * ratio) + real;
  }
  return real;
}

/** Record a view for a product — call when product becomes visible */
export function recordProductView(productId: string) {
  const firstSeen = getStore(FIRST_SEEN_KEY);
  if (!firstSeen[productId]) {
    firstSeen[productId] = Date.now();
    setStore(FIRST_SEEN_KEY, firstSeen);
  }

  const views: ViewData = getStore(VIEWS_KEY);
  views[productId] = (views[productId] || 0) + 1;
  setStore(VIEWS_KEY, views);
}

/** Batch get views for multiple products */
export function getProductViewsBatch(productIds: string[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const id of productIds) {
    result[id] = getProductViews(id);
  }
  return result;
}

/** Format view count for display */
export function formatViews(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}
