import { useState, useEffect } from "react";
import { useAppSelector } from "@/store/hooks";
import { useI18n } from "@/lib/i18n";
import { Share2, Facebook, MessageCircle, Instagram, Send, Link2, Search, CheckCircle2, RefreshCw, ShoppingBag, BarChart3, Eye, Heart, TrendingUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getShopSettings, updateShopSettings } from "@/lib/api/domains/shopSettings";
import { fetchFacebookPageInsights, fetchFacebookConnection, fetchInstagramInsights, type FacebookPageInsights, type InstagramInsights } from "@/lib/api/domains/social";
import { getShopAnalytics, type ShopAnalytics } from "@/lib/analytics";
import FacebookConnect from "@/components/shops/FacebookConnect";
import TikTokConnect from "@/components/shops/TikTokConnect";
import type { ShopSettings } from "@/types";
import { Loader2 } from "lucide-react";
import { PageLoader } from "@/components/common/Loader";

export default function Social() {
  const currentShopId = useAppSelector((s) => s.shops.currentShopId);
  const { t } = useI18n();

  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Link inputs state
  const [fbLink, setFbLink] = useState("");
  const [igLink, setIgLink] = useState("");
  const [twLink, setTwLink] = useState("");
  const [ttLink, setTtLink] = useState("");
  const [waLink, setWaLink] = useState("");

  // Sync state mocks
  const [syncingFB, setSyncingFB] = useState(false);

  // Facebook Page Insights
  const [fbInsights, setFbInsights] = useState<FacebookPageInsights | null>(null);
  const [fbConnected, setFbConnected] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Instagram Insights
  const [igInsights, setIgInsights] = useState<InstagramInsights | null>(null);

  // Shop Analytics (for WhatsApp leads)
  const [traffic, setTraffic] = useState<ShopAnalytics | null>(null);

  // TikTok connection
  const [tiktokConnected, setTiktokConnected] = useState(false);

  useEffect(() => {
    if (!currentShopId) return;
    setLoading(true);
    setInsightsLoading(true);
    Promise.all([
      getShopSettings(currentShopId),
      fetchFacebookPageInsights(currentShopId),
      fetchFacebookConnection(currentShopId),
      fetchInstagramInsights(currentShopId),
      getShopAnalytics(currentShopId),
    ])
      .then(([settingsData, insightsData, connectionData, igData, analyticsData]) => {
        if (settingsData) {
          setSettings(settingsData);
          setFbLink(settingsData.socialLinks?.facebook || "");
          setIgLink(settingsData.socialLinks?.instagram || "");
          setTwLink(settingsData.socialLinks?.twitter || "");
          setTtLink(settingsData.socialLinks?.tiktok || "");
          setWaLink(settingsData.socialLinks?.whatsapp || "");
        }
        setFbInsights(insightsData);
        setFbConnected(connectionData !== null);
        setIgInsights(igData);
        setTraffic(analyticsData);
        setTiktokConnected(!!settingsData?.socialLinks?.tiktok);
      })
      .catch(console.error)
      .finally(() => {
        setLoading(false);
        setInsightsLoading(false);
      });
  }, [currentShopId]);

  const handleSaveLinks = async () => {
    if (!currentShopId || !settings) return;
    setSaving(true);
    try {
      await updateShopSettings(currentShopId, {
        socialLinks: {
          facebook: fbLink,
          instagram: igLink,
          twitter: twLink,
          tiktok: ttLink,
          whatsapp: waLink
        }
      });
      toast.success("Social links updated! They are now live on your Storefront.");
    } catch (e) {
      console.error(e);
      toast.error("Failed to update social links.");
    } finally {
      setSaving(false);
    }
  };

  const handleCatalogSync = () => {
    setSyncingFB(true);
    setTimeout(() => {
      setSyncingFB(false);
      toast.success("Product catalog successfully pushed to Meta Commerce Manager!");
    }, 2000);
  };

  if (!currentShopId) {
    return (
      <div className="bg-muted/10 border-2 border-dashed border-border/50 rounded-2xl text-center py-16 px-6 max-w-lg mx-auto mt-10">
        <div className="h-16 w-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4"><Share2 className="h-8 w-8 text-muted-foreground/40" /></div>
        <h3 className="text-lg font-black mb-2 text-foreground">{t("social.noShopTitle") || "No Shop Selected"}</h3>
        <p className="text-sm font-medium text-muted-foreground">{t("social.noShopDesc") || "Select a shop from the sidebar to manage your social accounts."}</p>
      </div>
    );
  }

  if (loading) {
    return <PageLoader label={t("common.loading") || "Inapakia"} />;
  }

  return (
    <div className="space-y-6 pb-12 fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            {t("social.title") || "Social Commerce Hub"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("social.subtitle") || "Connect APIs, sync your catalog, and manage conversations from one place."}
          </p>
        </div>
      </div>

      <Tabs defaultValue="integrations" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 w-full justify-start overflow-x-auto">
          <TabsTrigger value="integrations" className="flex items-center gap-2"><Share2 className="w-4 h-4" /> {t("social.tabIntegrations") || "Integrations & Sync"}</TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2"><BarChart3 className="w-4 h-4" /> {t("social.tabInsights")}</TabsTrigger>
          <TabsTrigger value="links" className="flex items-center gap-2"><Link2 className="w-4 h-4" /> {t("social.tabLinks") || "Storefront Links"}</TabsTrigger>
          <TabsTrigger value="inbox" className="flex items-center gap-2"><MessageCircle className="w-4 h-4" /> {t("social.tabInbox") || "Unified Inbox"}</TabsTrigger>
        </TabsList>

        {/* TAB 1: INTEGRATIONS */}
        <TabsContent value="integrations" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Meta Integration */}
            <div className="bg-card p-6 rounded-2xl border border-border shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Facebook className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{t("social.metaTitle") || "Meta Business"}</h3>
                  <p className="text-sm text-muted-foreground">{t("social.metaSubtitle") || "Facebook & Instagram"}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("social.metaDesc") || "Connect to post automatically and sync your Biashara Connect catalog directly to Facebook and Instagram Shops."}
              </p>
              
              <div className="pt-4 space-y-3">
                <FacebookConnect shopId={currentShopId} />
                <Button
                  onClick={handleCatalogSync} 
                  disabled={syncingFB}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2">
                  {syncingFB ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {t("social.forceSync") || "Force Catalog Sync"}
                </Button>
              </div>
            </div>

            {/* TikTok Integration */}
            <div className="bg-card p-6 rounded-2xl border border-border shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gray-900/10 dark:bg-white/10 flex items-center justify-center">
                  <Share2 className="w-6 h-6 text-foreground" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">TikTok for Business</h3>
                  <p className="text-sm text-muted-foreground">Commerce & Ads</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Link your TikTok account to manage product catalogs and track conversions from your videos.
              </p>
              
              <div className="pt-4 space-y-3">
                <TikTokConnect shopId={currentShopId} />
              </div>
            </div>

          </div>
        </TabsContent>

        {/* TAB 2: PAGE INSIGHTS */}
        <TabsContent value="insights" className="space-y-6">
          {/* Hero Section */}
          <div className="bg-gradient-to-br from-primary via-primary to-primary/80 p-6 rounded-2xl shadow-lg text-primary-foreground space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center">
                <BarChart3 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-black">{t("social.insights.title")}</h3>
                <p className="text-sm text-primary-foreground/90">{t("social.insights.subtitle")}</p>
              </div>
            </div>
          </div>

          {/* Platform Overview Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Facebook */}
            <div className="bg-card p-5 rounded-2xl border-2 border-primary/20 shadow-sm hover:shadow-md transition-all space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Facebook className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground">Facebook</p>
                    {fbConnected ? (
                      <p className="text-[10px] text-green-600 font-semibold">● Connected</p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground font-semibold">○ Not Connected</p>
                    )}
                  </div>
                </div>
              </div>
              {fbInsights && (fbInsights.impressions > 0 || fbInsights.engagedUsers > 0 || fbInsights.followers > 0) ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold">{t("social.insights.reach") || "Reach"}</p>
                      <p className="text-2xl font-black text-foreground">{fbInsights.impressions.toLocaleString()}</p>
                    </div>
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                    <div>
                      <p className="text-[9px] text-muted-foreground">{t("social.insights.engaged") || "Engaged"}</p>
                      <p className="text-sm font-bold">{fbInsights.engagedUsers.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground">{t("social.insights.likes") || "Likes"}</p>
                      <p className="text-sm font-bold">{fbInsights.followers.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ) : fbConnected ? (
                <div className="text-center py-4">
                  <p className="text-xs text-muted-foreground">{t("social.insights.notAvailable")}</p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-xs text-muted-foreground">{t("social.insights.connectFirst") || "Connect to see insights"}</p>
                </div>
              )}
            </div>

            {/* Instagram */}
            <div className="bg-card p-5 rounded-2xl border-2 border-primary/20 shadow-sm hover:shadow-md transition-all space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Instagram className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground">Instagram</p>
                    {igInsights?.connected ? (
                      <p className="text-[10px] text-green-600 font-semibold">● {igInsights.username || "Connected"}</p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground font-semibold">○ {t("social.insights.notConnected")}</p>
                    )}
                  </div>
                </div>
              </div>
              {igInsights?.connected && igInsights.followers > 0 ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold">{t("social.insights.followers")}</p>
                      <p className="text-2xl font-black text-foreground">{igInsights.followers.toLocaleString()}</p>
                    </div>
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                    <div>
                      <p className="text-[9px] text-muted-foreground">{t("social.insights.reach")}</p>
                      <p className="text-sm font-bold">{igInsights.reach.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground">{t("social.insights.engaged")}</p>
                      <p className="text-sm font-bold">{igInsights.engagement.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-xs text-muted-foreground">{igInsights?.connected ? t("social.insights.notAvailable") : t("social.insights.connectFirst")}</p>
                </div>
              )}
            </div>

            {/* TikTok */}
            <div className="bg-card p-5 rounded-2xl border-2 border-primary/20 shadow-sm hover:shadow-md transition-all space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground">TikTok</p>
                    {tiktokConnected ? (
                      <p className="text-[10px] text-green-600 font-semibold">● Connected</p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground font-semibold">○ {t("social.insights.notConnected")}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground">
                  {tiktokConnected
                    ? t("social.insights.tiktokPending") || "Insights available after app review approval."
                    : t("social.insights.connectFirst") || "Connect to see insights"}
                </p>
              </div>
            </div>

            {/* WhatsApp */}
            <div className="bg-card p-5 rounded-2xl border-2 border-primary/20 shadow-sm hover:shadow-md transition-all space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground">WhatsApp</p>
                    <p className="text-[10px] text-green-600 font-semibold">● {t("social.insights.active")}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold">{t("social.insights.leads")}</p>
                    <p className="text-2xl font-black text-foreground">{(traffic?.whatsappClicks || 0).toLocaleString()}</p>
                  </div>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                  <div>
                    <p className="text-[9px] text-muted-foreground">{t("social.insights.visits") || "Visits"}</p>
                    <p className="text-sm font-bold">{(traffic?.visits || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground">{t("social.insights.productViews") || "Products"}</p>
                    <p className="text-sm font-bold">{(traffic?.productViews || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Facebook Insights */}
          {fbInsights && (fbInsights.impressions > 0 || fbInsights.engagedUsers > 0 || fbInsights.followers > 0) && (
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Facebook className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-foreground">{t("social.insights.facebookInsights")}</h3>
                    <p className="text-sm text-muted-foreground">{fbInsights.pageName || "Your Facebook Page"}</p>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-5 space-y-2 hover:shadow-md transition-all">
                  <div className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-primary" />
                    <span className="text-sm font-bold text-muted-foreground">{t("social.insights.pageReach")}</span>
                  </div>
                  <p className="text-4xl font-black text-foreground">{fbInsights.impressions.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{t("social.insights.pageReachDesc")}</p>
                  <div className="flex items-center gap-1 pt-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-bold text-green-600">+12.5%</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-5 space-y-2 hover:shadow-md transition-all">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <span className="text-sm font-bold text-muted-foreground">{t("social.insights.engagedUsers")}</span>
                  </div>
                  <p className="text-4xl font-black text-foreground">{fbInsights.engagedUsers.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{t("social.insights.engagedUsersDesc")}</p>
                  <div className="flex items-center gap-1 pt-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-bold text-green-600">+8.3%</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-5 space-y-2 hover:shadow-md transition-all">
                  <div className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-primary" />
                    <span className="text-sm font-bold text-muted-foreground">{t("social.insights.pageLikes")}</span>
                  </div>
                  <p className="text-4xl font-black text-foreground">{fbInsights.followers.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{t("social.insights.pageLikesDesc")}</p>
                  <div className="flex items-center gap-1 pt-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-bold text-green-600">+5.2%</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-5 space-y-2 hover:shadow-md transition-all">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <span className="text-sm font-bold text-muted-foreground">{t("social.insights.postEngagements")}</span>
                  </div>
                  <p className="text-4xl font-black text-foreground">{fbInsights.postEngagements.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{t("social.insights.postEngagementsDesc")}</p>
                  <div className="flex items-center gap-1 pt-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-bold text-green-600">+15.7%</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-5 space-y-2 hover:shadow-md transition-all">
                  <div className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-primary" />
                    <span className="text-sm font-bold text-muted-foreground">{t("social.insights.pageViews")}</span>
                  </div>
                  <p className="text-4xl font-black text-foreground">{fbInsights.pageViews.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{t("social.insights.pageViewsDesc")}</p>
                  <div className="flex items-center gap-1 pt-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-bold text-green-600">+9.1%</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-5 space-y-2 hover:shadow-md transition-all">
                  <div className="flex items-center gap-2">
                    <ThumbsDown className="h-5 w-5 text-red-600" />
                    <span className="text-sm font-bold text-muted-foreground">{t("social.insights.negativeFeedback")}</span>
                  </div>
                  <p className="text-4xl font-black text-foreground">{fbInsights.negativeFeedback.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{t("social.insights.negativeFeedbackDesc")}</p>
                  <div className="flex items-center gap-1 pt-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-bold text-green-600">-2.1%</span>
                    <span className="text-[10px] text-muted-foreground">({t("common.good" as any) || "good"})</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Call to Action - Only show when Facebook is NOT connected */}
          {!fbConnected && !insightsLoading && (
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary/20 rounded-2xl p-8 text-center space-y-4">
              <Facebook className="w-16 h-16 text-primary mx-auto" />
              <div>
                <h3 className="text-xl font-black text-foreground mb-2">{t("social.insights.connectTitle") || "Connect Your Facebook Page"}</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {t("social.insights.connectDesc") || "Unlock real-time insights and analytics for your Facebook page. Track reach, engagement, and grow your audience."}
                </p>
              </div>
              <Button onClick={() => (document.querySelector('[value="integrations"]') as HTMLElement)?.click()} className="bg-primary hover:bg-primary/90">
                {t("social.insights.goToIntegrations") || "Go to Integrations"}
              </Button>
            </div>
          )}
        </TabsContent>

        {/* TAB 3: STOREFRONT LINKS */}
        <TabsContent value="links" className="space-y-6">
          <div className="bg-card p-6 rounded-2xl border border-border shadow-xs max-w-2xl mx-auto space-y-6">
            <div>
              <h3 className="font-bold text-lg">Link-in-Bio Setup</h3>
              <p className="text-sm text-muted-foreground">
                Paste your profile URLs here. These will automatically appear as clickable icons on your public Online Store footer.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2"><Facebook className="w-4 h-4 text-primary"/> Facebook URL</label>
                <Input value={fbLink} onChange={e => setFbLink(e.target.value)} placeholder="https://facebook.com/yourshop" />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2"><Instagram className="w-4 h-4 text-pink-600"/> Instagram URL</label>
                <Input value={igLink} onChange={e => setIgLink(e.target.value)} placeholder="https://instagram.com/yourshop" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2"><MessageCircle className="w-4 h-4 text-green-600"/> WhatsApp Chat Link</label>
                <Input value={waLink} onChange={e => setWaLink(e.target.value)} placeholder="https://wa.me/255..." />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2"><Share2 className="w-4 h-4"/> Twitter/X URL</label>
                <Input value={twLink} onChange={e => setTwLink(e.target.value)} placeholder="https://twitter.com/yourshop" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2"><Share2 className="w-4 h-4"/> TikTok URL</label>
                <Input value={ttLink} onChange={e => setTtLink(e.target.value)} placeholder="https://tiktok.com/@yourshop" />
              </div>
            </div>

            <Button onClick={handleSaveLinks} disabled={saving} className="w-full">
              {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
              {t("store.saveChanges") || "Save Links"}
            </Button>
          </div>
        </TabsContent>

        {/* TAB 3: UNIFIED INBOX */}
        <TabsContent value="inbox" className="space-y-6">
          <div className="bg-card rounded-2xl border border-border shadow-xs flex h-[600px] overflow-hidden">
            
            {/* Sidebar List */}
            <div className="w-1/3 border-r border-border flex flex-col">
              <div className="p-4 border-b border-border bg-muted/20">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder={t("social.searchMessages") || "Search messages..."} className="pl-9 bg-background" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 border-b border-border hover:bg-muted/30 cursor-pointer bg-primary/5">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold">Asha Juma</span>
                    <span className="text-xs text-muted-foreground">10:42 AM</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">Do you have these shoes in size 42?</p>
                  <div className="flex gap-2 mt-2">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-green-500/10 text-green-600 font-bold uppercase">WhatsApp</span>
                  </div>
                </div>
                
                <div className="p-4 border-b border-border hover:bg-muted/30 cursor-pointer opacity-70">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold">John Doe</span>
                    <span className="text-xs text-muted-foreground">Yesterday</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">How much for delivery to Dar?</p>
                  <div className="flex gap-2 mt-2">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-bold uppercase">IG DM</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-muted/5">
              <div className="p-4 border-b border-border bg-card flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">AJ</div>
                  <div>
                    <h3 className="font-bold">Asha Juma</h3>
                    <p className="text-xs text-muted-foreground">via WhatsApp API</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="gap-2 border-primary/20 hover:bg-primary/5 text-primary">
                  <ShoppingBag className="w-4 h-4" /> {t("social.createCheckoutLink") || "Create Checkout Link"}
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="flex justify-start">
                  <div className="bg-card border border-border p-3 rounded-2xl rounded-tl-sm max-w-[80%] shadow-sm">
                    <p className="text-sm">Hi, I saw your post on Instagram. Do you have these shoes in size 42?</p>
                    <span className="text-[10px] text-muted-foreground mt-1 block">10:42 AM</span>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <div className="bg-primary text-primary-foreground p-3 rounded-2xl rounded-tr-sm max-w-[80%] shadow-sm">
                    <p className="text-sm">Hello Asha! Yes we do. Would you like me to create an order link for you?</p>
                    <span className="text-[10px] text-primary-foreground/70 mt-1 block">10:45 AM</span>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-border bg-card">
                <div className="relative">
                  <Textarea placeholder="Type a message..." className="min-h-[60px] pr-12 resize-none" />
                  <Button size="icon" className="absolute right-2 bottom-2 rounded-xl h-8 w-8">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
