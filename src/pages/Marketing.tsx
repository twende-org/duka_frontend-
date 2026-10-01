import { useEffect, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { useI18n } from "@/lib/i18n";
import { Megaphone, MessageCircle, Eye, MousePointerClick, TrendingUp, Sparkles, Users, Radio, Send, Search, CheckCircle2, ChevronRight, BarChart3, Plus, Smartphone, Globe, Facebook, Tag, Copy, Loader2, Bot, Play, Settings, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getCampaigns, createCampaign, getShopDiscounts, createDiscountCode } from "@/lib/api/domains/marketing";
import { getProducts, updateProduct } from "@/lib/api/domains/products";
import { getShopSettings, updateShopSettings } from "@/lib/api/domains/shopSettings";
import type { Campaign, DiscountCode, ShopSettings, Product } from "@/types";
import { Switch } from "@/components/ui/switch";
import { PageLoader } from "@/components/common/Loader";

export default function Marketing() {
  const currentShopId = useAppSelector((s) => s.shops.currentShopId);
  const { t } = useI18n();
  const navigate = useNavigate();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [savingAI, setSavingAI] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ai-pilot");

  // Broadcast Engine State
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [messageBody, setMessageBody] = useState("");
  const [audience, setAudience] = useState("all");
  const [channel, setChannel] = useState("sms");
  const [attachedPromo, setAttachedPromo] = useState("none");

  // Discount Engine State
  const [newPromoCode, setNewPromoCode] = useState("");
  const [newPromoValue, setNewPromoValue] = useState("");
  const [newPromoType, setNewPromoType] = useState<"percentage"|"fixed">("percentage");

  useEffect(() => {
    if (!currentShopId) return;
    fetchData();
  }, [currentShopId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [camps, discs, shopSettings, shopProducts] = await Promise.all([
        getCampaigns(currentShopId!),
        getShopDiscounts(currentShopId!),
        getShopSettings(currentShopId!),
        getProducts(currentShopId!)
      ]);
      setCampaigns(camps);
      setDiscounts(discs);
      setSettings(shopSettings);
      setProducts(shopProducts);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load marketing data");
    } finally {
      setLoading(false);
    }
  };

  const handleAIToggle = async (checked: boolean) => {
    if (!currentShopId) return;
    setSavingAI(true);
    try {
      await updateShopSettings(currentShopId, {
        aiMarketing: {
          ...(settings?.aiMarketing || { tone: "professional", musicVibe: "random" }),
          enabled: checked
        }
      });
      setSettings(prev => prev ? { ...prev, aiMarketing: { ...prev.aiMarketing, enabled: checked, tone: prev.aiMarketing?.tone || "professional", musicVibe: prev.aiMarketing?.musicVibe || "random" } } : null);
      toast.success(checked ? "AI Auto-Pilot Enabled!" : "AI Auto-Pilot Paused.");
    } catch (e) {
      toast.error("Failed to update AI settings");
    } finally {
      setSavingAI(false);
    }
  };

  const handleAIPreferenceChange = async (key: "tone" | "musicVibe", value: string) => {
    if (!currentShopId) return;
    try {
      const newSettings = {
        enabled: settings?.aiMarketing?.enabled || false,
        tone: settings?.aiMarketing?.tone || "professional",
        musicVibe: settings?.aiMarketing?.musicVibe || "random",
        [key]: value
      };
      
      await updateShopSettings(currentShopId, {
        aiMarketing: newSettings
      });
      setSettings(prev => prev ? { ...prev, aiMarketing: newSettings } : null);
      toast.success("AI preferences updated!");
    } catch (e) {
      toast.error("Failed to update preferences");
    }
  };

  const toggleProductPriority = async (product: Product) => {
    try {
      const newVal = !product.publishToFacebook;
      await updateProduct(product.id, { publishToFacebook: newVal });
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, publishToFacebook: newVal } : p));
      if (newVal) toast.success(`${product.name} queued for next AI post!`);
    } catch (e) {
      toast.error("Failed to update product priority");
    }
  };

  const handleBroadcast = async () => {
    if (!messageBody.trim()) {
      toast.error("Please enter a message to broadcast.");
      return;
    }
    if (!currentShopId) return;

    setIsBroadcasting(true);
    try {
      await createCampaign({
        shopId: currentShopId,
        name: `Campaign ${new Date().toLocaleDateString()}`,
        source: "Dashboard",
        platform: "biashara",
        status: "completed",
        reach: Math.floor(Math.random() * 500) + 50, // Simulated reach
        audienceFilter: audience as any,
        channel: channel as any,
        promoCodeId: attachedPromo !== "none" ? attachedPromo : undefined,
      });

      toast.success("Broadcast successfully queued for delivery!");
      setMessageBody("");
      fetchData(); // Refresh history
      setActiveTab("history");
    } catch (e) {
      console.error(e);
      toast.error("Failed to send broadcast");
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleCreatePromo = async () => {
    if (!newPromoCode.trim() || !newPromoValue.trim() || !currentShopId) {
      toast.error("Please enter a valid promo code and value.");
      return;
    }

    try {
      await createDiscountCode({
        shopId: currentShopId,
        code: newPromoCode.toUpperCase().trim(),
        type: newPromoType,
        value: parseFloat(newPromoValue),
        status: "active"
      });
      toast.success("Promo code created!");
      setNewPromoCode("");
      setNewPromoValue("");
      fetchData();
    } catch (e) {
      console.error(e);
      toast.error("Failed to create promo code");
    }
  };

  const insertPromoIntoMessage = (code: string) => {
    setMessageBody(prev => `${prev}\nUse promo code: ${code} at checkout!`);
  };

  if (loading) {
    return <PageLoader label={t("common.loading") || "Inapakia"} />;
  }

  return (
    <div className="space-y-6 pb-12 fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            {t("marketing.title") || "Marketing & Growth"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("marketing.subtitle") || "Drive sales by targeting customers with promos across SMS & WhatsApp."}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 w-full justify-start overflow-x-auto">
          <TabsTrigger value="ai-pilot" className="flex items-center gap-2"><Bot className="w-4 h-4" /> {t("marketing.tabAIPilot") || "AI Auto-Pilot"}</TabsTrigger>
          <TabsTrigger value="broadcast" className="flex items-center gap-2"><Radio className="w-4 h-4" /> {t("marketing.tabBroadcast") || "Broadcast Engine"}</TabsTrigger>
          <TabsTrigger value="promos" className="flex items-center gap-2"><Tag className="w-4 h-4" /> {t("marketing.tabPromos") || "Discounts & Promos"}</TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2"><BarChart3 className="w-4 h-4" /> {t("marketing.tabHistory") || "Campaign ROI"}</TabsTrigger>
        </TabsList>

        {/* AI AUTO-PILOT TAB */}
        <TabsContent value="ai-pilot" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            
            {/* Control Center */}
            <div className="md:col-span-1 space-y-6">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 rounded-2xl border border-primary/20 shadow-lg space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg flex items-center gap-2"><Bot className="w-5 h-5 text-primary" /> AI Auto-Pilot</h3>
                    <p className="text-sm text-muted-foreground mt-1">Let AI automatically generate & post Reels for you.</p>
                  </div>
                  <Switch 
                    checked={settings?.aiMarketing?.enabled || false} 
                    onCheckedChange={handleAIToggle}
                    disabled={savingAI}
                    className="data-[state=checked]:bg-success"
                  />
                </div>
                
                {settings?.aiMarketing?.enabled ? (
                  <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
                    <div className="flex items-center gap-2 text-success text-sm font-bold mb-1">
                      <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                      Active & Running
                    </div>
                    <p className="text-xs text-muted-foreground">The AI will post your next product during peak hours today.</p>
                  </div>
                ) : (
                  <div className="bg-muted rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm font-bold mb-1">
                      Paused
                    </div>
                    <p className="text-xs text-muted-foreground">Enable to let AI handle your social media.</p>
                  </div>
                )}
              </div>

              <div className="bg-card p-6 rounded-2xl border border-border shadow-xs space-y-4">
                <h3 className="font-bold flex items-center gap-2"><Settings className="w-4 h-4 text-primary" /> AI Preferences</h3>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Brand Tone</label>
                  <Select value={settings?.aiMarketing?.tone || "professional"} onValueChange={(v) => handleAIPreferenceChange("tone", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional & Trustworthy</SelectItem>
                      <SelectItem value="fun">Fun & Playful</SelectItem>
                      <SelectItem value="urgent">Urgent & Sales-Driven</SelectItem>
                      <SelectItem value="storytelling">Storytelling & Warm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Music Vibe</label>
                  <Select value={settings?.aiMarketing?.musicVibe || "random"} onValueChange={(v) => handleAIPreferenceChange("musicVibe", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="random">Surprise Me (Random)</SelectItem>
                      <SelectItem value="upbeat">Upbeat & Energetic</SelectItem>
                      <SelectItem value="chill">Chill & Relaxed</SelectItem>
                      <SelectItem value="electronic">Modern Electronic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Middle: Queue */}
            <div className="md:col-span-1 bg-card rounded-2xl border border-border shadow-xs flex flex-col h-[600px] overflow-hidden">
              <div className="p-4 border-b border-border bg-muted/20">
                <h3 className="font-bold flex items-center gap-2"><Star className="w-4 h-4 text-warning dark:text-white" /> Priority Queue</h3>
                <p className="text-xs text-muted-foreground mt-1">Star products to push them next.</p>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {products.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">No products found.</div>
                ) : (
                  products.map(p => (
                    <div key={p.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-lg group">
                      <div className="w-10 h-10 rounded-md bg-muted flex-shrink-0 overflow-hidden">
                        {p.imageUrls?.[0] || p.imageUrl ? (
                          <img src={p.imageUrls?.[0] || p.imageUrl} className="w-full h-full object-cover" />
                        ) : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.sellingPrice.toLocaleString()} TZS</p>
                      </div>
                      <Button 
                        size="icon" 
                        variant={p.publishToFacebook ? "default" : "ghost"}
                        className={`h-8 w-8 rounded-full ${p.publishToFacebook ? 'bg-warning hover:bg-warning/90 text-warning-foreground dark:text-white dark:bg-warning/80' : 'text-muted-foreground group-hover:text-foreground dark:text-white/60 dark:group-hover:text-white'}`}
                        onClick={() => toggleProductPriority(p)}
                      >
                        <Star className={`w-4 h-4 ${p.publishToFacebook ? 'fill-current' : ''}`} />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right: History Feed */}
            <div className="md:col-span-1 bg-card rounded-2xl border border-border shadow-xs flex flex-col h-[600px] overflow-hidden">
              <div className="p-4 border-b border-border bg-muted/20">
                <h3 className="font-bold flex items-center gap-2"><Play className="w-4 h-4 text-primary" /> AI Post History</h3>
                <p className="text-xs text-muted-foreground mt-1">Recent automated Reels.</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {campaigns.filter(c => c.source === 'ai_auto_pilot').length === 0 ? (
                  <div className="text-center p-8 text-sm text-muted-foreground border-2 border-dashed border-border/50 rounded-xl">
                    <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No AI posts yet. Enable Auto-Pilot to get started!
                  </div>
                ) : (
                  campaigns.filter(c => c.source === 'ai_auto_pilot').map(c => (
                    <div key={c.id} className="border border-border rounded-xl p-3 space-y-3 bg-muted/10">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Facebook className="w-3 h-3 text-primary-foreground" />
                        </div>
                        <span className="text-xs font-bold text-muted-foreground">
                          {new Date(c.createdAt?.seconds ? c.createdAt.seconds * 1000 : c.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {/* Fake Video Preview box since Campaign doesn't have imageUrl */}
                      <div className="aspect-[9/16] bg-muted/50 rounded-lg w-1/2 flex items-center justify-center relative overflow-hidden group border border-border">
                        <Play className="w-8 h-8 text-primary/50 group-hover:text-primary transition-colors" />
                        <div className="absolute bottom-2 left-2 right-2 h-1 bg-border rounded-full overflow-hidden">
                          <div className="h-full w-1/3 bg-primary" />
                        </div>
                      </div>
                      
                      <div className="bg-card p-2 rounded-lg text-xs border border-border">
                        <p className="font-bold line-clamp-1">{c.name}</p>
                        <p className="text-muted-foreground line-clamp-2 mt-1">Generated by AI from product catalog.</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </TabsContent>

        {/* BROADCAST TAB */}
        <TabsContent value="broadcast" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-card p-6 rounded-2xl border border-border shadow-xs space-y-6">
              <h3 className="font-bold flex items-center gap-2"><Users className="w-5 h-5 text-blue-500" /> {t("marketing.selectAudience") || "1. Select Audience"}</h3>
              <Select value={audience} onValueChange={setAudience}>
                <SelectTrigger><SelectValue placeholder={t("marketing.selectSegment") || "Select segment..."} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("marketing.allCustomers") || "All Customers"}</SelectItem>
                  <SelectItem value="recent">{t("marketing.recentBuyers") || "Recent Buyers (Last 30 Days)"}</SelectItem>
                  <SelectItem value="vip">{t("marketing.vipCustomers") || "✨ AI Suggested: VIP Customers (High Spenders)"}</SelectItem>
                  <SelectItem value="dormant">{t("marketing.dormantCustomers") || "✨ AI Suggested: Dormant (No purchase in 3 Months)"}</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <h3 className="font-bold flex items-center gap-2"><Radio className="w-5 h-5 text-orange-500" /> {t("marketing.composeMessage") || "2. Compose Message"}</h3>
                <Button variant="outline" size="sm" className="h-8 gap-2" onClick={() => setMessageBody("✨ Furahia punguzo letu jipya! Nunua sasa na upate ofa kabambe. Karibu sana!")}>
                  <Sparkles className="w-4 h-4" /> {t("marketing.generateAI") || "Generate with AI"}
                </Button>
              </div>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Select value={channel} onValueChange={setChannel}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="whatsapp">{t('marketing.whatsapp') || 'WhatsApp'}</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {discounts.length > 0 && (
                    <Select value={attachedPromo} onValueChange={(v) => { setAttachedPromo(v); if(v !== "none") { const d = discounts.find(x => x.id === v); if(d) insertPromoIntoMessage(d.code); } }}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder={t("marketing.attachPromo") || "Attach Promo..."} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("marketing.noPromo") || "No Promo"}</SelectItem>
                        {discounts.filter(d => d.status === "active").map(d => (
                          <SelectItem key={d.id} value={d.id}>{d.code} - {d.type === 'percentage' ? `${d.value}%` : `${d.value} TZS`} Off</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <Textarea 
                  value={messageBody} 
                  onChange={e => setMessageBody(e.target.value)} 
                  placeholder={t("marketing.typeMessage") || "Type your marketing message here..."} 
                  rows={6}
                />
              </div>

              <Button onClick={handleBroadcast} disabled={isBroadcasting} className="w-full h-12 font-bold text-base">
                {isBroadcasting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Send className="w-5 h-5 mr-2" />}
                {t("marketing.blastCampaign") || "Blast Campaign"}
              </Button>
            </div>
            
            {/* Phone Preview */}
            <div className="flex justify-center items-start">
              <div className="relative w-[300px] h-[600px] bg-gray-900 rounded-[3rem] border-[8px] border-gray-800 shadow-2xl p-4 overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-6 flex justify-center">
                  <div className="w-20 h-4 bg-gray-800 rounded-b-xl" />
                </div>
                <div className="mt-8 bg-white/10 rounded-xl p-4 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">{t("marketing.shop") || "Shop"}</div>
                    <span className="text-sm font-semibold">{channel === 'whatsapp' ? 'WhatsApp' : 'SMS Message'}</span>
                  </div>
                  <div className="bg-white/20 p-3 rounded-lg text-sm whitespace-pre-wrap break-words">
                    {messageBody || t("marketing.previewPlaceholder") || "Your message preview will appear here..."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* PROMOS TAB */}
        <TabsContent value="promos" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1 bg-card p-6 rounded-2xl border border-border shadow-xs space-y-4 h-fit">
              <h3 className="font-bold flex items-center gap-2"><Plus className="w-5 h-5 text-primary" /> {t("marketing.createPromo") || "Create New Promo"}</h3>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("marketing.promoCode") || "Promo Code"}</label>
                <Input value={newPromoCode} onChange={e => setNewPromoCode(e.target.value)} placeholder="e.g. SUMMER20" className="uppercase" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t("marketing.discountType") || "Discount Type"}</label>
                <Select value={newPromoType} onValueChange={(v: any) => setNewPromoType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">{t("marketing.percentage") || "Percentage (%)"}</SelectItem>
                    <SelectItem value="fixed">{t("marketing.fixedAmount") || "Fixed Amount (TZS)"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t("marketing.discountValue") || "Discount Value"}</label>
                <Input type="number" value={newPromoValue} onChange={e => setNewPromoValue(e.target.value)} placeholder={newPromoType === 'percentage' ? "e.g. 20" : "e.g. 5000"} />
              </div>

              <Button onClick={handleCreatePromo} className="w-full">{t("marketing.createPromo") || "Create Code"}</Button>
            </div>

            <div className="md:col-span-2 space-y-4">
              <h3 className="font-bold">Active Discount Codes</h3>
              {discounts.length === 0 ? (
                <div className="p-8 text-center bg-muted/30 rounded-xl border border-border/50 text-muted-foreground">
                  No promo codes yet. Create one to start driving sales!
                </div>
              ) : (
                <div className="grid gap-3">
                  {discounts.map(d => (
                    <div key={d.id} className="flex items-center justify-between p-4 bg-card rounded-xl border border-border shadow-sm">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-lg font-mono text-primary">{d.code}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${d.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>{d.status}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {d.type === 'percentage' ? `${d.value}% Off` : `${d.value.toLocaleString()} TZS Off`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{d.usedCount || 0}</p>
                        <p className="text-xs text-muted-foreground">Redemptions</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history" className="space-y-6">
          <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
            <div className="p-6 border-b border-border">
              <h3 className="font-bold">Campaign History</h3>
            </div>
            {campaigns.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                No campaigns sent yet.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {campaigns.map(c => (
                  <div key={c.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                    <div>
                      <h4 className="font-bold">{c.name}</h4>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span className="uppercase text-xs font-bold px-2 py-0.5 bg-muted rounded">{c.channel || 'SMS'}</span>
                        <span>Audience: <strong className="capitalize">{c.audienceFilter || 'All'}</strong></span>
                        <span>{new Date(c.createdAt?.seconds ? c.createdAt.seconds * 1000 : c.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-8 text-right">
                      <div>
                        <p className="text-sm text-muted-foreground">Reach</p>
                        <p className="font-bold">{c.reach}</p>
                      </div>
                      {c.promoCodeId && (
                        <div>
                          <p className="text-sm text-muted-foreground">Attached Promo</p>
                          <p className="font-bold text-primary font-mono text-sm">{discounts.find(d => d.id === c.promoCodeId)?.code || 'Unknown'}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
