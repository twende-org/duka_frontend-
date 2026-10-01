import {
  fetchGlobalAnalyticsSummary,
  fetchShopAnalyticsSummary,
  writeAnalyticsEvent,
  type GlobalAnalyticsSummary,
  type ShopAnalyticsSummary,
} from "./api/domains/telemetry";

export type EventType = 
  | "product_view"
  | "whatsapp_click"
  | "shop_visit"
  | "search_query"
  | "category_filter"
  | "shop_follow"
  | "search_submitted"
  | "ai_search_toggled";

export interface EventPayload {
  productId?: string;
  productName?: string;
  shopId?: string;
  shopName?: string;
  query?: string;
  category?: string;
  source?: string;
  [key: string]: any;
}

const DEVICE_ID_KEY = "twende_device_id";

export function getDeviceId(): string {
  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch (e) {
    return "unknown_device";
  }
}

/**
 * Fire-and-forget storefront event. Works for guests too (the endpoint allows
 * anonymous creates); a signed-in caller's identity is stamped server-side, so
 * ``userId`` is forwarded only for backward compatibility.
 */
export async function trackEvent(
  eventType: EventType,
  payload: EventPayload,
  userId?: string | null
) {
  try {
    const deviceId = getDeviceId();
    const path = typeof window !== "undefined" ? window.location.pathname : "";

    // Fire and forget, don't await to avoid blocking UI interactions
    writeAnalyticsEvent({
      eventType,
      deviceId,
      url: path,
      userId: userId || null,
      ...payload,
    }).catch((err) => {
      // Silently catch to not disrupt user experience
      console.debug(`Failed to track event ${eventType}`, err);
    });
  } catch (error) {
    console.debug(`Analytics Setup Error [${eventType}]:`, error);
  }
}

export interface ShopAnalytics {
  visits: number;
  productViews: number;
  whatsappClicks: number;
  followers: number;
}

export interface GlobalAnalytics {
  totalSearches: number;
  totalWhatsAppClicks: number;
  totalShopVisits: number;
  topSearches: { query: string; count: number }[];
}

const EMPTY_SHOP_ANALYTICS: ShopAnalytics = {
  visits: 0,
  productViews: 0,
  whatsappClicks: 0,
  followers: 0,
};

const EMPTY_GLOBAL_ANALYTICS: GlobalAnalytics = {
  totalSearches: 0,
  totalWhatsAppClicks: 0,
  totalShopVisits: 0,
  topSearches: [],
};

export async function getShopAnalytics(shopId: string, days: number = 7): Promise<ShopAnalytics> {
  try {
    const summary: ShopAnalyticsSummary = await fetchShopAnalyticsSummary(shopId, days);
    return {
      visits: summary.visits,
      productViews: summary.productViews,
      whatsappClicks: summary.whatsappClicks,
      followers: summary.followers,
    };
  } catch (error) {
    console.error("Failed to fetch shop analytics:", error);
    return { ...EMPTY_SHOP_ANALYTICS };
  }
}

export async function getGlobalAnalytics(days: number = 7): Promise<GlobalAnalytics> {
  try {
    const summary: GlobalAnalyticsSummary = await fetchGlobalAnalyticsSummary(days);
    return {
      totalSearches: summary.totalSearches,
      totalWhatsAppClicks: summary.totalWhatsAppClicks,
      totalShopVisits: summary.totalShopVisits,
      topSearches: summary.topSearches,
    };
  } catch (error) {
    console.error("Failed to fetch global analytics:", error);
    return { ...EMPTY_GLOBAL_ANALYTICS, topSearches: [] };
  }
}
