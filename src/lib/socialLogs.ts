import { fetchSocialLogs } from "./api/domains/social";

export interface SocialLog {
  id: string;
  type: "social_post" | "ai_reply";
  action: "post" | "reply";
  status: "success" | "failure";
  facebookPostId?: string;
  instagramPostId?: string;
  error?: string;
  productIds?: string[];
  createdAt: string;
}

/** The shop's post/reply outcome log, newest first. Returns [] on failure. */
export async function getSocialLogs(shopId: string, maxLogs: number = 20): Promise<SocialLog[]> {
  try {
    const rows = await fetchSocialLogs(shopId, maxLogs);
    return rows.map((row) => ({
      id: row.id,
      type: row.type as SocialLog["type"],
      action: row.action as SocialLog["action"],
      status: row.status as SocialLog["status"],
      facebookPostId: row.facebookPostId,
      instagramPostId: row.instagramPostId,
      error: row.error,
      productIds: row.productIds,
      createdAt: row.createdAt || new Date().toISOString(),
    }));
  } catch (error) {
    console.error("Failed to fetch social logs:", error);
    return [];
  }
}
