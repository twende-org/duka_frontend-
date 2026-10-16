import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Share2, User, Heart, Activity, ArrowUpRight, TrendingUp } from "lucide-react";
import { BsWhatsapp, BsFacebook, BsInstagram, BsTiktok } from "react-icons/bs";
import { useI18n } from "@/lib/i18n";
import { THEME_COLORS } from "@/lib/theme";
import { fetchFacebookPageInsights, fetchInstagramInsights, type FacebookPageInsights, type InstagramInsights } from "@/lib/api/domains/social";
import type { ShopAnalytics } from "@/lib/analytics";

interface MarketingAnalyticsProps {
  traffic: ShopAnalytics | null;
  shopId?: string;
}

export function MarketingAnalytics({ traffic, shopId }: MarketingAnalyticsProps) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [fbInsights, setFbInsights] = useState<FacebookPageInsights | null>(null);
  const [igInsights, setIgInsights] = useState<InstagramInsights | null>(null);
  const hasFbInsights = fbInsights !== null && (fbInsights.impressions > 0 || fbInsights.engagedUsers > 0 || fbInsights.followers > 0);
  const hasIgInsights = igInsights !== null && igInsights.connected && igInsights.followers > 0;

  useEffect(() => {
    if (!shopId) return;
    fetchFacebookPageInsights(shopId).then(setFbInsights);
    fetchInstagramInsights(shopId).then(setIgInsights);
  }, [shopId]);

  const visits = traffic?.visits || 0;
  const followers = traffic?.followers || 0;
  const productViews = traffic?.productViews || 0;
  const whatsappClicks = traffic?.whatsappClicks || 0;

  const socialPlatforms = [
    { name: "WhatsApp Business", icon: BsWhatsapp, status: "Active Lead Generator", variant: "success" as const },
    { name: "Facebook Page", icon: BsFacebook, status: "Auto-Post Sync", variant: "info" as const },
    { name: "Instagram Store", icon: BsInstagram, status: "Ready to Connect", variant: "accent" as const },
    { name: "TikTok Shop", icon: BsTiktok, status: "Coming Soon", variant: "muted" as const },
  ];

  return (
    <div className="bg-card/60 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-border shadow-xs fade-in-up space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`p-2.5 rounded-xl shrink-0 ${THEME_COLORS.primary.bg} ${THEME_COLORS.primary.text}`}>
            <Share2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-foreground truncate">
              Marketing & Social Selling
            </h3>
            <p className="text-xs text-muted-foreground truncate">{t("dashboard.marketing.subtitle" as any) || "Store traffic and WhatsApp leads"}</p>
          </div>
        </div>

        <button
          onClick={() => navigate("/dashboard/marketing")}
          className="text-xs font-bold text-primary hover:underline flex items-center gap-1 shrink-0"
        >
          Campaigns
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Impact Banner */}
      <div className={`border p-4 rounded-xl flex items-center justify-between gap-3 ${THEME_COLORS.success.bg} ${THEME_COLORS.success.border}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-2.5 rounded-xl ${THEME_COLORS.success.fill} shrink-0 shadow-2xs`}>
            <BsWhatsapp className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-extrabold text-foreground leading-snug">
              {whatsappClicks} WhatsApp Customer Leads Generated!
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {t("dashboard.marketing.promoDesc" as any) || "Promote products to convert visitors to sales."}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate("/dashboard/marketing")}
          className={`hidden sm:flex px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 ${THEME_COLORS.success.fill} hover:bg-success/90 transition-colors shadow-2xs`}
        >
          Promote
        </button>
      </div>

      {/* Traffic Grid (2x2 layout for clean non-overlapping cards) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Store Visits */}
        <div className="bg-muted/20 border border-border/50 rounded-xl p-3 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-muted-foreground truncate">{t("dashboard.marketing.visits" as any) || "Visits"}</span>
            <div className={`p-1.5 rounded-lg ${THEME_COLORS.info.bg} ${THEME_COLORS.info.text}`}>
              <User className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-black text-foreground tracking-tight">{visits.toLocaleString()}</p>
            <p className="text-[10px] font-medium text-muted-foreground mt-0.5 truncate">{t("dashboard.storeVisits" as any)}</p>
          </div>
        </div>

        {/* Product Views */}
        <div className="bg-muted/20 border border-border/50 rounded-xl p-3 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-muted-foreground truncate">{t("dashboard.marketing.views" as any) || "Views"}</span>
            <div className={`p-1.5 rounded-lg ${THEME_COLORS.primary.bg} ${THEME_COLORS.primary.text}`}>
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-black text-foreground tracking-tight">{productViews.toLocaleString()}</p>
            <p className="text-[10px] font-medium text-muted-foreground mt-0.5 truncate">{t("dashboard.productViews" as any)}</p>
          </div>
        </div>

        {/* Followers */}
        <div className="bg-muted/20 border border-border/50 rounded-xl p-3 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-muted-foreground truncate">{t("dashboard.marketing.followers" as any) || "Followers"}</span>
            <div className={`p-1.5 rounded-lg ${THEME_COLORS.danger.bg} ${THEME_COLORS.danger.text}`}>
              <Heart className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-black text-foreground tracking-tight">{followers.toLocaleString()}</p>
            <p className="text-[10px] font-medium text-muted-foreground mt-0.5 truncate">Wafuasi</p>
          </div>
        </div>

        {/* WhatsApp Leads */}
        <div className="bg-muted/20 border border-border/50 rounded-xl p-3 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-muted-foreground truncate">WhatsApp</span>
            <div className={`p-1.5 rounded-lg ${THEME_COLORS.success.bg} ${THEME_COLORS.success.text}`}>
              <BsWhatsapp className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-black text-foreground tracking-tight">{whatsappClicks.toLocaleString()}</p>
            <p className="text-[10px] font-medium text-muted-foreground mt-0.5 truncate">{t("dashboard.whatsappLeads" as any)}</p>
          </div>
        </div>
      </div>

      {/* Social Media Insights Overview */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Social Media Performance
          </p>
          <button
            onClick={() => navigate("/dashboard/social")}
            className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5"
          >
            View All <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {/* Facebook */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-2 hover:shadow-md transition-all">
            <div className="flex items-center gap-2">
              <BsFacebook className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-bold text-muted-foreground">Facebook</span>
              {hasFbInsights ? (
                <span className="ml-auto text-[9px] text-green-600 font-bold">● Live</span>
              ) : (
                <span className="ml-auto text-[9px] text-muted-foreground font-bold">○ Demo</span>
              )}
            </div>
            <p className="text-lg font-black text-foreground">{hasFbInsights ? fbInsights!.impressions.toLocaleString() : "8,420"}</p>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-green-600" />
              <span className="text-[9px] font-bold text-green-600">+12.5%</span>
              <span className="text-[9px] text-muted-foreground">reach</span>
            </div>
          </div>

          {/* Instagram */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-2 hover:shadow-md transition-all">
            <div className="flex items-center gap-2">
              <BsInstagram className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-bold text-muted-foreground">Instagram</span>
              {hasIgInsights ? (
                <span className="ml-auto text-[9px] text-green-600 font-bold">● Live</span>
              ) : (
                <span className="ml-auto text-[9px] text-muted-foreground font-bold">○ —</span>
              )}
            </div>
            <p className="text-lg font-black text-foreground">{hasIgInsights ? igInsights!.followers.toLocaleString() : "—"}</p>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-green-600" />
              <span className="text-[9px] font-bold text-muted-foreground">{hasIgInsights ? `${igInsights!.reach.toLocaleString()} reach` : "followers"}</span>
            </div>
          </div>

          {/* TikTok */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-2 hover:shadow-md transition-all">
            <div className="flex items-center gap-2">
              <BsTiktok className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-bold text-muted-foreground">TikTok</span>
              <span className="ml-auto text-[9px] text-muted-foreground font-bold">○ —</span>
            </div>
            <p className="text-lg font-black text-foreground">—</p>
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-muted-foreground">Post-review</span>
            </div>
          </div>

          {/* WhatsApp */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-2 hover:shadow-md transition-all">
            <div className="flex items-center gap-2">
              <BsWhatsapp className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-bold text-muted-foreground">WhatsApp</span>
              <span className="ml-auto text-[9px] text-green-600 font-bold">● Active</span>
            </div>
            <p className="text-lg font-black text-foreground">{whatsappClicks.toLocaleString()}</p>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-green-600" />
              <span className="text-[9px] font-bold text-green-600">37%</span>
              <span className="text-[9px] text-muted-foreground">conv.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Social Integrations Readiness */}
      <div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
          Social Channels Integration Readiness
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {socialPlatforms.map((platform) => {
            const colors = THEME_COLORS[platform.variant];
            return (
              <div
                key={platform.name}
                className="p-3 rounded-xl border border-border/60 bg-card flex items-center justify-between min-w-0"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-2 rounded-lg shrink-0 ${colors.bg} ${colors.text}`}>
                    <platform.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{platform.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{platform.status}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
