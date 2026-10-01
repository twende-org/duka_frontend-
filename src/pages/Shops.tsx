import { useEffect, useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Fuse from "fuse.js";

import { useNavigate } from "react-router-dom";
import { Plus, Search, Edit, Trash2, Store, Loader2, MapPin, Phone, AlertTriangle, LocateFixed, ImagePlus, X, Camera, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchShops, createShop, editShop, removeShop, clearError, setCurrentShop } from "@/store/shopsSlice";
import { loadUserProfile } from "@/store/authSlice";
import { toast } from "sonner";
import ShopMap from "@/components/ShopMap";
import ShopCard from "@/components/shops/ShopCard";
import ShopProductGrid from "@/components/shops/ShopProductGrid";
import PageHeader from "@/components/common/PageHeader";
import { useI18n } from "@/lib/i18n";
import { useSubscription } from "@/hooks/useSubscription";
import { ErrorAlert } from "@/components/ErrorAlert";
import { CameraCapture } from "@/components/common/CameraCapture";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { categoryTree, getCategoryName } from "@/lib/categories";
import { Loader } from "@/components/common/Loader";


async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    const data = await res.json();
    return data.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  }
}

async function geocode(query: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!data.length) return null;
    const lat = Number(data[0].lat); const lon = Number(data[0].lon);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
    return { lat, lon };
  } catch { return null; }
}

export default function Shops() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const { shops, loading, error } = useAppSelector((s) => s.shops);
  const { t } = useI18n();
  const { canAddShop, plan, limits, shopCount } = useSubscription();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<any>(null);
  const [form, setForm] = useState({ name: "", location: "", phone: "+255", description: "", imageUrl: "", productCondition: "new" as "new" | "secondhand" | "both", categories: [] as string[], isWholesaleSupplier: false });
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  

  useEffect(() => { if (user?.id) dispatch(fetchShops(user.id)); }, [user?.id, dispatch]);

  const filtered = useMemo(() => {
    if (!search.trim()) return shops;
    const fuse = new Fuse(shops, {
      keys: [
        { name: 'name', weight: 0.6 },
        { name: 'description', weight: 0.3 },
        { name: 'location', weight: 0.2 }
      ],
      threshold: 0.3,
      ignoreLocation: true,
    });
    return fuse.search(search).map(r => r.item);
  }, [shops, search]);

  const [activeTab, setActiveTab] = useState<"all" | "public" | "needs">("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const totalProducts = useMemo(
    () => shops.reduce((s: number, sh: any) => s + (sh.productCount ?? 0), 0),
    [shops]
  );
  const publicShops = useMemo(
    () => shops.filter((sh: any) => (sh.productCount ?? 0) >= 10).length,
    [shops]
  );
  const visibleShops = useMemo(() => {
    if (activeTab === "public") return (filtered as any[]).filter((s) => (s.productCount ?? 0) >= 10);
    if (activeTab === "needs") return (filtered as any[]).filter((s) => (s.productCount ?? 0) < 10);
    return filtered as any[];
  }, [filtered, activeTab]);


  // Auto-detect GPS location
  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error(t("shops.gpsNotAvailable") || "GPS haipatikani kwenye kifaa hiki");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lon: longitude });
        const address = await reverseGeocode(latitude, longitude);
        setForm((f) => ({ ...f, location: address }));
        setLocating(false);
        toast.success(t("shops.locationFound") || "Mahali pamepatikana!");
      },
      (err) => {
        setLocating(false);
        toast.error(t("shops.gpsFailed") || "Imeshindwa kupata mahali. Tafadhali ruhusu GPS.");
        console.error("Geolocation error:", err);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Auto-detect location when dialog opens for new shop
  useEffect(() => {
    if (dialogOpen && !editingShop) {
      detectLocation();
    }
    if (!dialogOpen) {
      setCoords(null);
    }
  }, [dialogOpen, editingShop]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error(t("products.imageOnly")); return; }
    if (file.size > 800 * 1024) { toast.error(t("shops.imageTooBig") || "Picha ni kubwa mno. Tafadhali tumia picha isiyozidi 800KB."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImagePreview(dataUrl);
      setForm((f) => ({ ...f, imageUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    setForm((f) => ({ ...f, imageUrl: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setProgress(30);
    try {
      setProgress(50);
      // Use detected coords or try geocoding the location text
      let finalCoords = coords;
      if (!finalCoords && form.location) {
        finalCoords = await geocode(form.location);
      }
      setProgress(70);
      const shopData: any = {
        name: form.name.trim(),
        location: form.location.trim() || "",
        phone: form.phone.trim() || "",
        description: form.description.trim() || "",
        imageUrl: form.imageUrl || "",
        productCondition: form.productCondition,
        categories: form.categories,
        isWholesaleSupplier: form.isWholesaleSupplier,
        ...(finalCoords ? { lat: finalCoords.lat, lon: finalCoords.lon } : {}),
      };
      if (editingShop) {
        await dispatch(editShop({ id: editingShop.id, data: shopData })).unwrap();
        toast.success(t("shops.updated"));
        setProgress(100);
        setDialogOpen(false);
        setEditingShop(null);
        setForm({ name: "", location: "", phone: "+255", description: "", imageUrl: "", productCondition: "new", categories: [], isWholesaleSupplier: false });
        setCoords(null);
        setProgress(0);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        const newShop = await dispatch(createShop({ ...shopData, ownerId: user!.id })).unwrap();
        // Set newly created shop as the active shop immediately
        dispatch(setCurrentShop(newShop.id));
        // Refresh profile to get the new role in Redux
        await dispatch(loadUserProfile()).unwrap();
        setProgress(100);
        setDialogOpen(false);
        setEditingShop(null);
        setForm({ name: "", location: "", phone: "+255", description: "", imageUrl: "", productCondition: "new", categories: [], isWholesaleSupplier: false });
        setCoords(null);
        setProgress(0);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        // Rich prompt: redirect user to add products
        toast.success(
          `🎉 Duka "${shopData.name}" limeundwa! Sasa ongeza bidhaa zako.`,
          {
            duration: 5000,
            action: {
              label: `${t("products.addBtn") || "Ongeza Bidhaa"} →`,
              onClick: () => navigate("/dashboard/products"),
            },
          }
        );
        // Auto-navigate to Products page after a brief delay
        setTimeout(() => navigate("/dashboard/products"), 1200);
      }
    } catch (err: any) { toast.error(err?.message || t("products.failed")); }
    setSubmitting(false);
  };

  const handleEdit = (shop: any) => {
    setEditingShop(shop);
    setForm({ 
      name: shop.name, 
      location: shop.location || "", 
      phone: shop.phone || "", 
      description: shop.description || "",
      imageUrl: shop.imageUrl || "",
      productCondition: shop.productCondition || "new",
      categories: shop.categories || [],
      isWholesaleSupplier: shop.isWholesaleSupplier || false,
    });
    if (shop.lat && shop.lon) setCoords({ lat: shop.lat, lon: shop.lon });
    setImagePreview(shop.imageUrl || null);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await dispatch(removeShop(id));
    toast.success(t("shops.deleted"));
  };

  return (
    <div>
      <ErrorAlert error={error} onClear={() => dispatch(clearError())} />
      <PageHeader
        title={t("shops.title")}
        description={t("shops.subtitle")}
        actions={
          <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) { setEditingShop(null); setForm({ name: "", location: "", phone: "+255", description: "", imageUrl: "", productCondition: "new", categories: [], isWholesaleSupplier: false }); setCoords(null); setProgress(0); } }}>
          <DialogTrigger asChild>
            <Button disabled={!canAddShop}><Plus className="h-4 w-4 mr-2" />{t("shops.add")}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editingShop ? t("shops.editTitle") : t("shops.addTitle")}</DialogTitle></DialogHeader>
            {submitting && <Progress value={progress} className="h-1" />}
            <div className="max-h-[80vh] overflow-y-auto px-1 py-1 scrollbar-hide">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">{t("shops.name")}</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">{t("shops.location")}</label>
                  <div className="flex gap-2">
                    <Input
                      value={form.location}
                      onChange={(e) => { setForm({ ...form, location: e.target.value }); setCoords(null); }}
                      className="flex-1"
                      placeholder={locating ? (t("shops.locating") || "Inatafuta mahali...") : (t("shops.locationPlaceholder") || "Mahali pa duka")}
                      readOnly={locating}
                    />
                    <Button type="button" variant="outline" size="icon" onClick={detectLocation} disabled={locating} title={t("shops.useGps") || "Tumia GPS"}>
                      <LocateFixed className={`h-4 w-4 ${locating ? "animate-pulse text-primary" : ""}`} />
                    </Button>
                  </div>
                  {coords && (
                    <p className="text-xs text-primary mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> GPS: {coords.lat.toFixed(5)}, {coords.lon.toFixed(5)}
                    </p>
                  )}
                  {locating && <p className="text-xs text-muted-foreground mt-1 animate-pulse">{t("shops.locatingGps") || "📍 Inatafuta mahali pako..."}</p>}
                </div>
                {(coords || form.location.length > 3) && (
                  <ShopMap
                    location={form.location}
                    shopName={form.name || undefined}
                    lat={coords?.lat}
                    lon={coords?.lon}
                    className="h-[200px]"
                    compact
                    showActions={false}
                  />
                )}
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-primary" />
                    {t("shops.phone")} <span className="text-destructive">*</span>
                    <span className="ml-auto text-[10px] font-normal text-muted-foreground">{t("shops.phoneDesc") || "Inahitajika kwa wateja kukupigia"}</span>
                  </label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+255 7xx xxx xxx"
                    type="tel"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">{t("shops.description")}</label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
                </div>

                {/* Product Condition Selector */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-primary" />
                    Aina ya Bidhaa Unazouza
                    <span className="ml-auto text-[10px] font-normal text-muted-foreground">{t("shops.aiCaptionUsed") || "Inatumika kwenye AI Caption"}</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: "new", label: t("shops.conditionNew") || "Mpya", emoji: "✨", desc: t("shops.conditionNewDesc") || "Brand new" },
                      { value: "secondhand", label: t("shops.conditionUsed") || "Mitumba", emoji: "♻️", desc: t("shops.conditionUsedDesc") || "Second hand" },
                      { value: "both", label: t("shops.conditionBoth") || "Vyote Viwili", emoji: "🏪", desc: t("shops.conditionBothDesc") || "New & used" },
                    ] as const).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm({ ...form, productCondition: opt.value })}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center ${
                          form.productCondition === opt.value
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        <span className="text-xl">{opt.emoji}</span>
                        <span className="text-xs font-bold">{opt.label}</span>
                        <span className="text-[9px] opacity-70">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Categories Selector */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">{t("shops.productCategories") || "Kategoria za Bidhaa"}</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" type="button" className="w-full justify-start font-normal h-11 rounded-xl py-2 px-3">
                        {form.categories && form.categories.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {form.categories.map(c => (
                              <Badge key={c} variant="secondary" className="mr-1 mb-1">{getCategoryName(c)}</Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">{t("shops.selectCategories") || "Chagua kategoria za duka..."}</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder={t("shops.searchCategory") || "Tafuta kategoria..."} />
                        <CommandList>
                          <CommandEmpty>{t("shops.noCategoryFound") || "Hakuna kategoria iliyopatikana."}</CommandEmpty>
                          {categoryTree.map((group) => (
                            <CommandGroup key={group.id} heading={group.name}>
                              {group.children?.map(cat => (
                                <CommandItem
                                  key={cat.id}
                                  onSelect={() => {
                                    setForm(f => {
                                      const isSelected = f.categories.includes(cat.id);
                                      const newCats = isSelected ? f.categories.filter(id => id !== cat.id) : [...f.categories, cat.id];
                                      return { ...f, categories: newCats };
                                    });
                                  }}
                                >
                                  <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", form.categories.includes(cat.id) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}>
                                    <Check className="h-4 w-4" />
                                  </div>
                                  {cat.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          ))}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex flex-row items-center justify-between rounded-xl border p-4 shadow-sm bg-muted/10">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold text-foreground">{t("shops.wholesaleTitle") || "Soko la Jumla (Wholesale)"}</Label>
                    <p className="text-xs text-muted-foreground">{t("shops.wholesaleDesc") || "Orodhesha duka hili kwenye Soko la Jumla kwa wafanyabiashara wengine."}</p>
                  </div>
                  <Switch
                    checked={form.isWholesaleSupplier}
                    onCheckedChange={(v) => setForm({ ...form, isWholesaleSupplier: v })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">{t("shops.imageUrl")}</label>
                  <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-4 transition-colors hover:border-primary/50 relative group bg-muted/30">
                    {imagePreview ? (
                      <div className="relative w-full aspect-video rounded-lg overflow-hidden ring-1 ring-border shadow-sm">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <button onClick={removeImage} type="button" className="absolute top-2 right-2 p-1.5 bg-background/80 hover:bg-background text-foreground rounded-full shadow-lg backdrop-blur-sm transition-transform hover:scale-110">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-4">
                        <button onClick={() => fileInputRef.current?.click()} type="button" className="flex flex-col items-center gap-2 py-4 px-6 rounded-xl hover:bg-primary/5 transition-colors group">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary transition-transform group-hover:scale-110">
                            <ImagePlus className="h-6 w-6" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-semibold">{t("products.clickToUpload")}</p>
                            <p className="text-xs text-muted-foreground mt-1">Files</p>
                          </div>
                        </button>

                        <div className="w-px h-16 bg-border self-center" />

                        <button onClick={() => setIsCameraOpen(true)} type="button" className="flex flex-col items-center gap-2 py-4 px-6 rounded-xl hover:bg-primary/5 transition-colors group">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary transition-transform group-hover:scale-110">
                            <Camera className="h-6 w-6" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-semibold">{t("shops.takePhoto") || "Piga Picha"}</p>
                            <p className="text-xs text-muted-foreground mt-1">Camera</p>
                          </div>
                        </button>
                      </div>
                    )}
                    <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
                  </div>
                  <CameraCapture 
                    isOpen={isCameraOpen} 
                    onClose={() => setIsCameraOpen(false)} 
                    onCapture={(dataUrl) => {
                      setImagePreview(dataUrl);
                      setForm((f) => ({ ...f, imageUrl: dataUrl }));
                      setIsCameraOpen(false);
                    }}
                    title={t("shops.takeLogoPhoto") || "Piga Picha ya Logo"}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("common.loading")}</> : (editingShop ? t("shops.update") : t("common.add"))}
                </Button>
              </form>
            </div>
          </DialogContent>
        </Dialog>
        }
      />

      {!canAddShop && (
        <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4 mb-6">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">{t("subscription.shopLimit")}</p>
            <p className="text-xs text-muted-foreground">{t("subscription.currentPlan")}: <span className="font-semibold capitalize">{plan}</span> ({shopCount}/{limits.maxShops}). {t("subscription.upgradeDesc")}</p>
          </div>
        </div>
      )}

      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("shops.title")}</CardTitle>
            <Store className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{shops.length}</div>
            <p className="text-xs text-muted-foreground">{t("shops.allShops") || "Maduka yote"}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("common.products") || "Bidhaa"}</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">{t("shops.productsListed") || "Products listed"}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Public</CardTitle>
            <MapPin className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{publicShops}</div>
            <p className="text-xs text-muted-foreground">{t("shops.publicDesc") || "Yanaonekana (10+ bidhaa)"}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("shops.needsProducts") || "Zinahitaji Bidhaa"}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{shops.length - publicShops}</div>
            <p className="text-xs text-muted-foreground">{t("shops.needsProductsDesc") || "Chini ya bidhaa 10"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search + Tabs */}
      <div className="space-y-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("shops.searchPlaceholder")}
            className="pl-9 bg-muted/50 border-none focus-visible:ring-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="-mx-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="inline-flex w-max h-auto gap-1 rounded-md bg-muted/50 p-1">
              {([
                ["all", t("shops.tabAll") || "Yote", shops.length],
                ["public", "Public", publicShops],
                ["needs", t("shops.tabNeedsProducts") || "Zinahitaji Bidhaa", shops.length - publicShops],
              ] as const).map(([value, label, count]) => (
                <button
                  key={value}
                  onClick={() => setActiveTab(value as "all" | "public" | "needs")}
                  className={`relative inline-flex items-center gap-2 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all duration-200 ${activeTab === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <span>{label}</span>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">{count}</span>
                  {activeTab === value && (
                    <motion.span
                      layoutId="shops-tab-underline"
                      className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-primary"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="ml-auto inline-flex gap-1 rounded-md bg-muted/50 p-1">
            {([["table", "Table"], ["grid", "Grid"]] as const).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`rounded-sm px-3 py-1.5 text-sm font-medium transition-all duration-200 ${viewMode === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader size={24} />
        </div>
      ) : visibleShops.length === 0 ? (
        <div className="rounded-xl border bg-card px-4 py-12 text-center text-muted-foreground">
          <Store className="mx-auto h-8 w-8 mb-3 opacity-20" />
          {t("shops.noShops")}
        </div>
      ) : viewMode === "grid" ? (
        <div className="space-y-12">
          {visibleShops.map((shop, idx) => (
            <ShopProductGrid
              key={shop.id}
              shop={shop}
              onEdit={handleEdit}
              onDelete={handleDelete}
              index={idx}
            />
          ))}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
                <thead className="sticky top-0 z-10 text-xs text-muted-foreground bg-muted/50 backdrop-blur uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium min-w-[220px]">{t("shops.name")}</th>
                    <th className="px-4 py-3 font-medium min-w-[220px]">{t("shops.location")}</th>
                    <th className="px-4 py-3 font-medium min-w-[150px]">{t("shops.phone")}</th>
                    <th className="px-4 py-3 font-medium min-w-[180px]">{t("shops.colCategory") || "Kategoria"}</th>
                    <th className="px-4 py-3 font-medium text-right">{t("common.products") || "Bidhaa"}</th>
                    <th className="px-4 py-3 font-medium">{t("admin.status")}</th>
                    <th className="px-4 py-3 font-medium text-right">{t("users.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <AnimatePresence initial={false} mode="popLayout">
                    {visibleShops.map((shop: any, i: number) => {
                      const count = shop.productCount ?? 0;
                      const isPublic = count >= 10;
                      return (
                        <motion.tr
                          key={shop.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.28, delay: Math.min(i, 12) * 0.03, ease: [0.22, 1, 0.36, 1] }}
                          className="group relative transition-colors duration-200 hover:bg-primary/5"
                        >
                          <td className="relative px-4 py-3 font-medium">
                            <span className="absolute left-0 top-1/2 h-0 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300 group-hover:h-3/5" />
                            <div className="flex items-center gap-3 transition-transform duration-200 group-hover:translate-x-1">
                              <div className="h-8 w-8 shrink-0 rounded-lg bg-muted flex items-center justify-center text-muted-foreground overflow-hidden">
                                {shop.imageUrl ? <img src={shop.imageUrl} alt={shop.name} className="h-full w-full object-cover" /> : <Store className="h-4 w-4" />}
                              </div>
                              <span className="truncate max-w-[180px]">{shop.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate max-w-[200px] inline-block align-bottom">{shop.location || "—"}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{shop.phone || "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]">
                            {(shop.categories || []).length ? (shop.categories as string[]).map(getCategoryName).join(", ") : "—"}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums font-medium">{count}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium whitespace-nowrap border",
                              isPublic ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-transparent"
                            )}>
                              {isPublic ? "Public" : "Draft"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-60 transition-all duration-200 group-hover:opacity-100">
                              <Button size="sm" variant="outline" onClick={() => handleEdit(shop)} className="gap-2 transition-transform duration-200 hover:-translate-y-0.5">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDelete(shop.id)} className="text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {visibleShops.map((shop: any, i: number) => (
              <motion.div
                key={shop.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: Math.min(i, 8) * 0.03, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-xl border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{shop.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{shop.location || "—"}</p>
                    <p className="text-xs text-muted-foreground">{shop.phone || "—"}</p>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{shop.productCount ?? 0} bidhaa</span>
                </div>
                <div className="mt-3 pt-3 border-t flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 gap-2" onClick={() => handleEdit(shop)}>
                    <Edit className="h-4 w-4" />{t("common.edit")}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(shop.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}

    </div>
  );
}
