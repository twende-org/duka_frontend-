import { useState, useEffect } from "react";
import { useAppSelector } from "@/store/hooks";
import { useI18n } from "@/lib/i18n";
import { Share2, Facebook, MessageCircle, Instagram, Send, Link2, Search, CheckCircle2, RefreshCw, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getShopSettings, updateShopSettings } from "@/lib/api/domains/shopSettings";
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

  useEffect(() => {
    if (!currentShopId) return;
    setLoading(true);
    getShopSettings(currentShopId)
      .then(data => {
        if (data) {
          setSettings(data);
          setFbLink(data.socialLinks?.facebook || "");
          setIgLink(data.socialLinks?.instagram || "");
          setTwLink(data.socialLinks?.twitter || "");
          setTtLink(data.socialLinks?.tiktok || "");
          setWaLink(data.socialLinks?.whatsapp || "");
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
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

        {/* TAB 2: STOREFRONT LINKS */}
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
