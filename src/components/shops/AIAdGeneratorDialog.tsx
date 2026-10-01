import { useState, useEffect } from "react";
import { runtimeEnv } from "@/lib/api/config";
import {
  Sparkles,
  Copy,
  RefreshCw,
  Edit3,
  Share2,
  Download,
  Loader2,
  Check,
  Facebook,
  Instagram,
  MessageCircle,
  Video,
  ChevronRight,
  Smile,
  Briefcase,
  Gem,
  Zap,
  Laugh,
  AlertTriangle,
  Send,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { BsWhatsapp } from "react-icons/bs";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ProfessionalImage } from "@/components/common/ProfessionalImage";
import type { Shop, Product } from "@/types";
import { Loader } from "@/components/common/Loader";


interface AIAdGeneratorDialogProps {
  shop: Shop;
  product: Product;
  trigger?: React.ReactNode;
  onApply?: (adText: string) => void;
}

interface GeneratedAd {
  headline: string;
  caption: string;
  cta: string;
  hashtags: string;
  whatsapp_version: string;
  short_version: string;
}

const platforms = [
  { id: "facebook", name: "Facebook", icon: Facebook, color: "bg-[#1877F2]" },
  { id: "instagram", name: "Instagram", icon: Instagram, color: "bg-[#E4405F]" },
  { id: "whatsapp", name: "WhatsApp", icon: BsWhatsapp, color: "bg-[#25D366]" },
  { id: "tiktok", name: "TikTok", icon: Video, color: "bg-[#000000]" },
];

const tones = [
  { id: "professional", name: "Professional", icon: Briefcase },
  { id: "friendly", name: "Friendly", icon: Smile },
  { id: "luxury", name: "Luxury", icon: Gem },
  { id: "youthful", name: "Youthful", icon: Zap },
  { id: "funny", name: "Funny", icon: Laugh },
  { id: "urgent", name: "Urgent", icon: AlertTriangle },
];

export default function AIAdGeneratorDialog({
  shop,
  product,
  trigger,
  onApply,
}: AIAdGeneratorDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1); // 1: Input, 2: Generation/Result
  const [platform, setPlatform] = useState("facebook");
  const [tone, setTone] = useState("professional");
  const [targetAudience, setTargetAudience] = useState("");
  const [loading, setLoading] = useState(false);
  const [ad, setAd] = useState<GeneratedAd | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<keyof GeneratedAd | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleGenerate = async () => {
    const apiKey = runtimeEnv("VITE_OPENROUTER_API_KEY");
    if (!apiKey) {
      toast.error("AI API key missing. Please contact support.");
      return;
    }

    setLoading(true);
    setStep(2);
    setAd(null);

    const conditionLabel =
      shop.productCondition === "secondhand"
        ? "MTUMBA (second hand)"
        : shop.productCondition === "both"
        ? "Mpya au Mtumba"
        : "MPYA (brand new)";

    const prompt = `Wewe ni mtaalamu wa masoko ya kidijitali anayebobea katika soko la Afrika Mashariki na kimataifa.
Tengeneza matoleo ya matangazo ya bidhaa hii kwa ajili ya jukwaa la ${platform.toUpperCase()}.
Tumia toni ya ${tone.toUpperCase()}.
${targetAudience ? `Walengwa ni: ${targetAudience}` : ""}

Maelezo ya Bidhaa:
- Jina: ${product.name}
- Bei: TZS ${product.sellingPrice.toLocaleString()}
- Maelezo: ${product.description || "Bidhaa bora ya " + product.category}
- Jamii: ${product.category || "General"}
- Hali: ${conditionLabel}

Maelezo ya Duka:
- Jina: ${shop.name}
- Mawasiliano: ${shop.phone || "Wasiliana nasi"}

TOA MATOKEO KATIKA MFUMO WA JSON PEKEE wenye funguo hizi:
- headline: Kichwa cha habari cha kuvutia
- caption: Maelezo marefu na yenye kushawishi ya tangazo (pamoja na emoji, usizidi maneno 100). MUHIMU: Malizia kwa kuweka mawasiliano ya simu: ${shop.phone || ""}
- cta: Call to action ya nguvu (mfano: Piga sasa ${shop.phone || ""})
- hashtags: Orodha ya hashtags 5-7 zinazovuma
- whatsapp_version: Toleo fupi lililoboreshwa kwa ajili ya hali ya WhatsApp (Status) - MUHIMU SANA: lazima lijumuishe namba ${shop.phone || ""}
- short_version: Toleo fupi sana la kuvutia (kama kwa TikTok au SMS) - MUHIMU SANA: lazima lijumuishe namba ${shop.phone || ""}

Hakikisha matangazo yanavutia wateja na yanazingatia utamaduni wa jukwaa la ${platform}. Jibu kwa JSON pekee bila maelezo ya ziada.`;

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("OpenRouter Error:", errorData);
        throw new Error("AI Generation failed");
      }
      
      const data = await response.json();
      let content = data.choices?.[0]?.message?.content || "";
      
      // Basic JSON extraction in case of markdown wrapping
      if (content.includes("```json")) {
        content = content.split("```json")[1].split("```")[0];
      } else if (content.includes("```")) {
        content = content.split("```")[1].split("```")[0];
      }
      
      const parsedAd = JSON.parse(content.trim()) as GeneratedAd;
      setAd(parsedAd);
    } catch (err) {
      console.error("AI Error:", err);
      toast.error("Something went wrong. Please try again.");
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleEdit = (field: keyof GeneratedAd) => {
    setEditingField(field);
    setEditValue(ad?.[field] || "");
  };

  const saveEdit = () => {
    if (ad && editingField) {
      setAd({ ...ad, [editingField]: editValue });
      setEditingField(null);
      toast.success("Changes saved!");
    }
  };

  const shareToWhatsApp = () => {
    if (!ad) return;
    const text = `*${ad.headline}*\n\n${ad.caption}\n\n*${ad.cta}*\n\n${ad.hashtags}`;
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setStep(1); setAd(null); } }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-2 rounded-xl group hover:border-primary/50 transition-all">
            <Sparkles className="h-4 w-4 text-primary group-hover:animate-pulse" />
            Generate Ad
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="p-0 gap-0 border-none shadow-2xl rounded-[1.5rem] sm:rounded-[2rem] bg-background w-[calc(100%-1rem)] max-w-[96vw] sm:max-w-[750px] max-h-[92vh] sm:max-h-[85vh] flex flex-col overflow-hidden fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        
        {/* Header */}
        <DialogHeader className="px-4 py-4 sm:px-6 sm:py-6 bg-gradient-to-br from-primary/5 via-background to-background border-b relative overflow-hidden flex-shrink-0">
          <div className="absolute -right-6 -top-6 opacity-[0.03] pointer-events-none rotate-12">
            <Sparkles className="h-40 w-40 text-primary" />
          </div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-lg sm:text-2xl font-black tracking-tight flex items-center gap-2">
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                AI Ad Generator
              </DialogTitle>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-70">
                Marketing Assistant • {shop.name}
              </p>
            </div>
            {step === 2 && !loading && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setStep(1)} 
                className="font-black text-[10px] uppercase tracking-widest gap-2"
              >
                Change Settings
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-4 sm:p-6 space-y-6 sm:space-y-8"
              >
                {/* Product Preview Card */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-border/50">
                  <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden border bg-background shrink-0">
                    <ProfessionalImage src={product.imageUrls?.[0] || product.imageUrl} alt={product.name} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-xs sm:text-sm truncate">{product.name}</h4>
                    <p className="text-primary font-black text-base sm:text-lg">TZS {product.sellingPrice.toLocaleString()}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest px-2 py-0">{product.category}</Badge>
                      {!product.description && (
                        <span className="text-[9px] text-orange-500 font-bold flex items-center gap-1">
                          <AlertTriangle className="h-2.5 w-2.5" /> No description
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Configuration */}
                <div className="space-y-6">
                  {/* Platform Selection */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Share2 className="h-3 w-3" /> Select Platform
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {platforms.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setPlatform(p.id)}
                          className={`flex flex-col items-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-2xl border-2 transition-all group ${
                            platform === p.id 
                              ? "border-primary bg-primary/5 shadow-md shadow-primary/5" 
                              : "border-border bg-card hover:border-primary/30"
                          }`}
                        >
                          <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center text-white shadow-lg ${p.color} transition-transform group-hover:scale-110`}>
                            <p.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-wider ${platform === p.id ? "text-primary" : "text-muted-foreground"}`}>
                            {p.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tone Selection */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Smile className="h-3 w-3" /> Select Tone
                    </label>
                    <div className="grid grid-cols-3 xs:grid-cols-3 sm:grid-cols-6 gap-2">
                      {tones.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setTone(t.id)}
                          className={`flex flex-col items-center gap-1 sm:gap-2 p-2 rounded-xl border-2 transition-all ${
                            tone === t.id 
                              ? "border-primary bg-primary/5" 
                              : "border-border bg-card hover:border-primary/30"
                          }`}
                        >
                          <div className={`h-7 w-7 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center ${tone === t.id ? "text-primary bg-primary/10" : "text-muted-foreground bg-muted"}`}>
                            <t.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </div>
                          <span className={`text-[9px] font-black uppercase tracking-tighter ${tone === t.id ? "text-primary" : "text-muted-foreground"}`}>
                            {t.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Target Audience */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Send className="h-3 w-3" /> Target Audience (Optional)
                    </label>
                    <Input 
                      placeholder="e.g. Young moms in Dar, Corporate professionals..." 
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      className="rounded-xl border-2 focus-visible:ring-primary/20 bg-muted/20 h-12 text-sm font-medium"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleGenerate} 
                  className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest gap-3 shadow-xl shadow-primary/20"
                >
                  <Sparkles className="h-5 w-5" />
                  Generate Magic Ad
                </Button>
              </motion.div>
            ) : (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 sm:p-6"
              >
                {loading ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-6">
                    <div className="relative">
                      <Loader size={80} />
                      <Sparkles className="absolute inset-0 m-auto h-8 w-8 text-primary animate-pulse" />
                    </div>
                    <div className="text-center space-y-2">
                      <h3 className="text-xl font-black tracking-tight animate-pulse">Creating your masterpiece...</h3>
                      <p className="text-sm font-medium text-muted-foreground">AI is analyzing {product.name} for the best results.</p>
                    </div>
                    
                    {/* Skeleton Loading States */}
                    <div className="w-full max-w-md space-y-4 mt-8">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 rounded-2xl bg-muted/40 animate-pulse" />
                      ))}
                    </div>
                  </div>
                ) : ad ? (
                  <div className="space-y-6">
                    <Tabs defaultValue="caption" className="w-full">
                      <TabsList className="grid grid-cols-3 sm:grid-cols-6 h-auto p-1 bg-muted/30 rounded-2xl mb-6">
                        <TabsTrigger value="headline" className="rounded-xl py-2 text-[10px] font-black uppercase">Title</TabsTrigger>
                        <TabsTrigger value="caption" className="rounded-xl py-2 text-[10px] font-black uppercase">Caption</TabsTrigger>
                        <TabsTrigger value="cta" className="rounded-xl py-2 text-[10px] font-black uppercase">CTA</TabsTrigger>
                        <TabsTrigger value="hashtags" className="rounded-xl py-2 text-[10px] font-black uppercase">Tags</TabsTrigger>
                        <TabsTrigger value="whatsapp_version" className="rounded-xl py-2 text-[10px] font-black uppercase">WA</TabsTrigger>
                        <TabsTrigger value="short_version" className="rounded-xl py-2 text-[10px] font-black uppercase">Short</TabsTrigger>
                      </TabsList>

                      <AnimatePresence mode="wait">
                        <TabsContent value="headline" className="mt-0">
                          <AdContentBlock 
                            title="Headline" 
                            content={ad.headline} 
                            onCopy={() => copyToClipboard(ad.headline, 'headline')}
                            onEdit={() => handleEdit('headline')}
                            isCopied={copiedField === 'headline'}
                          />
                        </TabsContent>
                        <TabsContent value="caption" className="mt-0">
                          <AdContentBlock 
                            title="Main Caption" 
                            content={ad.caption} 
                            onCopy={() => copyToClipboard(ad.caption, 'caption')}
                            onEdit={() => handleEdit('caption')}
                            isCopied={copiedField === 'caption'}
                            isLongText
                          />
                        </TabsContent>
                        <TabsContent value="cta" className="mt-0">
                          <AdContentBlock 
                            title="Call to Action" 
                            content={ad.cta} 
                            onCopy={() => copyToClipboard(ad.cta, 'cta')}
                            onEdit={() => handleEdit('cta')}
                            isCopied={copiedField === 'cta'}
                          />
                        </TabsContent>
                        <TabsContent value="hashtags" className="mt-0">
                          <AdContentBlock 
                            title="Hashtags" 
                            content={ad.hashtags} 
                            onCopy={() => copyToClipboard(ad.hashtags, 'hashtags')}
                            onEdit={() => handleEdit('hashtags')}
                            isCopied={copiedField === 'hashtags'}
                          />
                        </TabsContent>
                        <TabsContent value="whatsapp_version" className="mt-0">
                          <AdContentBlock 
                            title="WhatsApp Status Version" 
                            content={ad.whatsapp_version} 
                            onCopy={() => copyToClipboard(ad.whatsapp_version, 'whatsapp_version')}
                            onEdit={() => handleEdit('whatsapp_version')}
                            isCopied={copiedField === 'whatsapp_version'}
                            isLongText
                          />
                        </TabsContent>
                        <TabsContent value="short_version" className="mt-0">
                          <AdContentBlock 
                            title="TikTok/Short Version" 
                            content={ad.short_version} 
                            onCopy={() => copyToClipboard(ad.short_version, 'short_version')}
                            onEdit={() => handleEdit('short_version')}
                            isCopied={copiedField === 'short_version'}
                          />
                        </TabsContent>
                      </AnimatePresence>
                    </Tabs>

                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/50">
                      <Button 
                        onClick={handleGenerate} 
                        variant="outline" 
                        className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest gap-2 border-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Regenerate
                      </Button>
                      <Button 
                        onClick={shareToWhatsApp}
                        className="flex-1 h-12 rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] text-white font-black uppercase tracking-widest gap-2 shadow-lg shadow-green-500/20"
                      >
                        <BsWhatsapp className="h-4 w-4" />
                        Share to WhatsApp
                      </Button>
                      <Button 
                        onClick={() => {
                          const allText = `*${ad.headline}*\n\n${ad.caption}\n\n*${ad.cta}*\n\n${ad.hashtags}`;
                          copyToClipboard(allText, 'all');
                        }}
                        className="flex-1 h-12 rounded-xl bg-primary text-white font-black uppercase tracking-widest gap-2 shadow-lg shadow-primary/20"
                      >
                        {copiedField === 'all' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        Copy All
                      </Button>
                    </div>
                  </div>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-muted/10 border-t flex items-center justify-between flex-shrink-0">
          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60">
            Powered by Gemini AI • Professional Marketing
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            className="font-black text-[9px] uppercase tracking-widest h-8 px-4 border"
          >
            Finish
          </Button>
        </div>
      </DialogContent>

      {/* Edit Overlay */}
      <Dialog open={!!editingField} onOpenChange={(v) => !v && setEditingField(null)}>
        <DialogContent className="sm:max-w-md rounded-[2rem] border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-primary" />
              Edit {editingField?.replace('_', ' ')}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {editingField === 'caption' || editingField === 'whatsapp_version' ? (
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full h-40 p-4 rounded-2xl bg-muted/30 border-2 border-border focus:border-primary/50 outline-none text-sm font-medium resize-none"
              />
            ) : (
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="h-12 rounded-xl border-2 focus-visible:ring-primary/20 bg-muted/30 font-medium"
              />
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setEditingField(null)} className="flex-1 rounded-xl font-bold">Cancel</Button>
            <Button onClick={saveEdit} className="flex-1 rounded-xl bg-primary text-white font-black uppercase tracking-widest">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

function AdContentBlock({ 
  title, 
  content, 
  onCopy, 
  onEdit, 
  isCopied, 
  isLongText 
}: { 
  title: string; 
  content: string; 
  onCopy: () => void; 
  onEdit: () => void;
  isCopied: boolean;
  isLongText?: boolean;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative bg-card border-2 border-border/50 rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 shadow-sm hover:border-primary/20 transition-all"
    >
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">{title}</h4>
        <div className="flex items-center gap-2">
          <button 
            onClick={onEdit}
            className="h-9 w-9 rounded-xl bg-muted/50 flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-all shadow-sm"
            title="Edit"
          >
            <Edit3 className="h-4 w-4" />
          </button>
          <button 
            onClick={onCopy}
            className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all shadow-sm ${
              isCopied ? "bg-green-500 text-white" : "bg-muted/50 hover:bg-primary/10 hover:text-primary"
            }`}
            title="Copy"
          >
            {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div className={`text-foreground leading-relaxed whitespace-pre-line break-words ${isLongText ? "text-sm font-medium" : "text-base sm:text-lg font-black tracking-tight"}`}>
        {content}
      </div>
    </motion.div>
  );
}
