import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Store, Share2, Eye, ExternalLink, QrCode, Sparkles, Image as ImageIcon, Link as LinkIcon, Settings, ShieldCheck, PaintBucket, Loader2, Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n";
import { THEME_COLORS } from "@/lib/theme";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { editShop } from "@/store/shopsSlice";
import { getShopSettings, updateShopSettings } from "@/lib/api/domains/shopSettings";
import { getShopAnalytics } from "@/lib/analytics";
import { toast } from "sonner";
import { ShopSettings } from "@/types";
import QRCode from "react-qr-code";
import { PageLoader } from "@/components/common/Loader";

export default function OnlineStore() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { t } = useI18n();
  const { currentShopId, shops } = useAppSelector((s) => s.shops);
  const currentShop = shops.find((s) => s.id === currentShopId);

  const storeSlug = currentShop?.slug || currentShopId || "";
  const publicStoreUrl = `${window.location.origin}/store/${storeSlug}`;

  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Local state for edits
  const [slug, setSlug] = useState(storeSlug);
  const [themeColor, setThemeColor] = useState("#0f172a");
  const [bannerUrl, setBannerUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [isOffline, setIsOffline] = useState(false);
  const [returnsPolicy, setReturnsPolicy] = useState("");
  const [shippingPolicy, setShippingPolicy] = useState("");
  const [termsOfService, setTermsOfService] = useState("");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [analytics, setAnalytics] = useState({ storeViews: 0, productClicks: 0 });

  useEffect(() => {
    if (currentShopId) {
      loadSettings();
    }
  }, [currentShopId]);

  const loadSettings = async () => {
    try {
      const data = await getShopSettings(currentShopId!);
      if (data) {
        setSettings(data);
        setThemeColor(data.onlineStore?.themeColor || "#0f172a");
        setBannerUrl(data.onlineStore?.bannerUrl || "");
        setLogoUrl(data.onlineStore?.logoUrl || "");
        setIsOffline(data.onlineStore?.isOffline || false);
        setLayout(data.onlineStore?.layout || "grid");
        setReturnsPolicy(data.storePolicies?.returnsPolicy || "");
        setShippingPolicy(data.storePolicies?.shippingPolicy || "");
        setTermsOfService(data.storePolicies?.termsOfService || "");
      }
      
      // Same funnel counters the storefront writes, over the last day.
      const stats = await getShopAnalytics(currentShopId!, 1);
      setAnalytics({ storeViews: stats.visits, productClicks: stats.productViews });
    } catch (e) {
      console.error(e);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicStoreUrl);
    toast.success("Store Link copied to clipboard!");
  };

  const handleSave = async () => {
    if (!currentShopId) return;
    setSaving(true);
    try {
      // 1. Update Shop Slug if changed
      if (slug && slug !== currentShop?.slug) {
        await dispatch(editShop({ id: currentShopId, data: { slug } })).unwrap();
      }

      // 2. Update Settings
      await updateShopSettings(currentShopId, {
        onlineStore: {
          ...settings?.onlineStore,
          enabled: true,
          pickupAvailable: true,
          deliveryAvailable: true,
          themeColor,
          bannerUrl,
          logoUrl,
          isOffline,
          layout,
        },
        storePolicies: {
          ...settings?.storePolicies,
          returnsPolicy,
          shippingPolicy,
          termsOfService,
        }
      });
      
      toast.success("Store settings updated successfully");
      loadSettings();
    } catch (e) {
      console.error(e);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageLoader label={t("common.loading") || "Inapakia"} />;
  }

  return (
    <div className="space-y-6 pb-12 fade-in-up">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {!isOffline ? (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${THEME_COLORS.success.bg} ${THEME_COLORS.success.text} ${THEME_COLORS.success.border}`}>
                <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                Store Online
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-warning/10 text-warning border border-warning/20">
                <span className="h-2 w-2 rounded-full bg-warning" />
                Maintenance Mode
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            {t("store.title") || "Online Store"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("store.subtitle") || "Manage your digital shopfront, appearance, and public policies."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCopyLink} className="font-bold">
            <Share2 className="mr-2 h-4 w-4" /> {t("store.btnShare") || "Share Link"}
          </Button>
          <Button onClick={() => window.open(publicStoreUrl, "_blank")} className={`font-bold ${THEME_COLORS.primary.fill} shadow-xs`}>
            <ExternalLink className="mr-2 h-4 w-4" /> {t("store.btnPreview") || "Preview Store"}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview" className="flex items-center gap-2"><Store className="w-4 h-4" /> {t("store.tabOverview") || "Overview"}</TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2"><PaintBucket className="w-4 h-4" /> {t("store.tabAppearance") || "Appearance"}</TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2"><Settings className="w-4 h-4" /> {t("store.tabPreferences") || "Preferences"}</TabsTrigger>
          <TabsTrigger value="policies" className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> {t("store.tabPolicies") || "Policies"}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-card p-6 rounded-2xl border border-border/80 shadow-2xs space-y-4 md:col-span-2">
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" /> {t("store.traffic") || "Traffic & Analytics"}
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-border/50 bg-muted/20">
                  <span className="text-xs font-bold text-muted-foreground">{t("store.storeViews") || "Store Views (Today)"}</span>
                  <p className="text-2xl font-black text-foreground mt-1">{analytics.storeViews}</p>
                </div>
                <div className="p-4 rounded-xl border border-border/50 bg-muted/20">
                  <span className="text-xs font-bold text-muted-foreground">{t("store.topClicks") || "Total Product Clicks"}</span>
                  <p className="text-2xl font-black text-foreground mt-1">{analytics.productClicks}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-2 mt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase">{t("store.publicUrl") || "Public Store URL"}</p>
                <div className="flex items-center gap-2">
                  <Input value={publicStoreUrl} readOnly className="font-mono text-sm bg-background" />
                  <Button variant="secondary" onClick={handleCopyLink}>{t("store.copyBtn") || "Copy"}</Button>
                </div>
              </div>
            </div>

            <div className="bg-card p-6 rounded-2xl border border-border/80 shadow-2xs space-y-4 flex flex-col justify-between items-center text-center">
              <div className="p-4 bg-white rounded-xl border-2 border-border shadow-sm inline-block">
                <QRCode value={publicStoreUrl} size={150} level="M" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">{t("store.qrTitle") || "Store QR Code"}</h3>
                <p className="text-xs text-muted-foreground mt-1">{t("store.qrDesc") || "Display this in your physical shop."}</p>
              </div>
              <Button onClick={() => navigate("/dashboard/marketing")} className="w-full font-bold" variant="outline">
                {t("store.promoteBtn") || "Promote Online Store"}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <div className="bg-card p-6 rounded-2xl border border-border/80 shadow-2xs space-y-6">
            <div>
              <h3 className="text-base font-bold">Brand Identity</h3>
              <p className="text-sm text-muted-foreground">Customize how your store looks to customers.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Logo URL</label>
                <Input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://..." />
                <p className="text-xs text-muted-foreground">Provide a link to your store's logo image.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Banner Image URL</label>
                <Input value={bannerUrl} onChange={e => setBannerUrl(e.target.value)} placeholder="https://..." />
                <p className="text-xs text-muted-foreground">A cover image displayed at the top of your store.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2"><PaintBucket className="w-4 h-4" /> Brand Theme Color</label>
                <div className="flex gap-2">
                  <Input type="color" value={themeColor} onChange={e => setThemeColor(e.target.value)} className="w-16 p-1 h-10" />
                  <Input type="text" value={themeColor} onChange={e => setThemeColor(e.target.value)} className="flex-1 font-mono uppercase" />
                  <Button variant="outline" size="icon" onClick={() => setThemeColor("#0f172a")} title="Reset to default">
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2"><Eye className="w-4 h-4" /> Catalog Layout</label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={layout === "grid"} onChange={() => setLayout("grid")} />
                    <span className="text-sm font-medium">Grid (Visual)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={layout === "list"} onChange={() => setLayout("list")} />
                    <span className="text-sm font-medium">List (Compact)</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="w-4 h-4 mr-2" /> Save Appearance
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <div className="bg-card p-6 rounded-2xl border border-border/80 shadow-2xs space-y-6">
            <div>
              <h3 className="text-base font-bold">Store Preferences</h3>
              <p className="text-sm text-muted-foreground">Manage your store's URL and visibility.</p>
            </div>

            <div className="space-y-4 max-w-lg">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2"><LinkIcon className="w-4 h-4" /> Custom Store Slug</label>
                <div className="flex items-center">
                  <span className="bg-muted px-3 py-2 border border-r-0 border-input rounded-l-md text-muted-foreground text-sm">
                    biashara.com/store/
                  </span>
                  <Input 
                    value={slug} 
                    onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} 
                    className="rounded-l-none"
                    placeholder="my-shop-name" 
                  />
                </div>
                <p className="text-xs text-muted-foreground">Keep it short, memorable, and lowercase.</p>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
                <div>
                  <h4 className="font-semibold text-sm">Maintenance Mode</h4>
                  <p className="text-xs text-muted-foreground">Temporarily hide your public store from customers.</p>
                </div>
                <Switch checked={isOffline} onCheckedChange={setIsOffline} />
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="w-4 h-4 mr-2" /> Save Preferences
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="policies" className="space-y-6">
          <div className="bg-card p-6 rounded-2xl border border-border/80 shadow-2xs space-y-6">
            <div>
              <h3 className="text-base font-bold">{t("store.storePolicies") || "Store Policies"}</h3>
              <p className="text-sm text-muted-foreground">These will be displayed publicly on your store to protect your business.</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Returns & Refunds Policy</label>
                <Textarea 
                  value={returnsPolicy} 
                  onChange={e => setReturnsPolicy(e.target.value)} 
                  rows={4}
                  placeholder="e.g. Returns accepted within 7 days with receipt..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Shipping & Delivery Policy</label>
                <Textarea 
                  value={shippingPolicy} 
                  onChange={e => setShippingPolicy(e.target.value)} 
                  rows={4}
                  placeholder="e.g. Orders are delivered within 2-3 business days..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Terms of Service</label>
                <Textarea 
                  value={termsOfService} 
                  onChange={e => setTermsOfService(e.target.value)} 
                  rows={4}
                  placeholder="Additional terms and conditions..."
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="w-4 h-4 mr-2" /> Save Policies
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
