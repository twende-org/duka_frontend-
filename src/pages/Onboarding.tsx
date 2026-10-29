import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Store, Loader2, Package, Truck, Factory, Globe,
  ShoppingCart, Building2, MapPin, DollarSign,
  Box, Users, CheckCircle2, Phone, Mail, Link as LinkIcon,
  Shirt, Smartphone, Monitor, ShoppingBag, Utensils,
  Wrench, Hammer, Sofa, Heart, Car, Wheat, Dumbbell,
  Baby, BookOpen, Diamond, ShieldPlus, Component,
  ChevronRight, ChevronLeft, PartyPopper, Tag, LocateFixed
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { createShop, fetchShops, setCurrentShop } from "@/store/shopsSlice";
import { loadUserProfile } from "@/store/authSlice";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import SEO from "@/components/SEO";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import WizardShell from "@/components/onboarding/WizardShell";
import { updateMeOnApi } from "@/lib/api/domains/auth";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import { PageLoader } from "@/components/common/Loader";


delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl: iconShadow,
});

function LocationMarker({ form, setForm }: { form: any, setForm: any }) {
  useMapEvents({
    click(e) {
      setForm((prev: any) => ({ ...prev, lat: e.latlng.lat, lon: e.latlng.lng }));
    },
  });

  return form.lat && form.lon ? (
    <Marker position={[form.lat, form.lon]}></Marker>
  ) : null;
}

function MapUpdater({ lat, lon }: { lat: number | null, lon: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lon) {
      map.flyTo([lat, lon], map.getZoom());
    }
  }, [lat, lon, map]);
  return null;
}

// --- DATA LISTS ---
type Capability = "hasVariants" | "sellsByQuantity" | "sellsByWeight" | "sellsByLength" | "sellsByVolume" | "sellsSetsOrPackages";

const SELLING_UNITS: { key: Capability; en: string; sw: string }[] = [
  { key: "sellsByQuantity", en: "Pieces", sw: "Idadi" },
  { key: "sellsByWeight", en: "Weight (kg/g)", sw: "Uzito (kg/g)" },
  { key: "sellsByLength", en: "Length (m)", sw: "Urefu (m)" },
  { key: "sellsByVolume", en: "Volume (L/ml)", sw: "Ujazo (L/ml)" },
  { key: "sellsSetsOrPackages", en: "Sets / Packages", sw: "Seti / Fungu" },
  { key: "hasVariants", en: "Sizes & colours", sw: "Size na rangi" },
];

const PRODUCT_CATEGORIES = [
  { id: "fashion", icon: Shirt, label: { en: "Fashion & Clothing", sw: "Mavazi na Mitindo" } },
  { id: "shoes", icon: ShoppingBag, label: { en: "Shoes & Footwear", sw: "Viatu" } },
  { id: "electronics", icon: Monitor, label: { en: "Electronics", sw: "Elektroniki" } },
  { id: "phones", icon: Smartphone, label: { en: "Phones & Accessories", sw: "Simu na Vifaa" } },
  { id: "cosmetics", icon: Heart, label: { en: "Beauty & Cosmetics", sw: "Urembo na Vipodozi" } },
  { id: "food", icon: Utensils, label: { en: "Food & Groceries", sw: "Chakula na Mahitaji" } },
  { id: "furniture", icon: Sofa, label: { en: "Home & Furniture", sw: "Samani za Ndani" } },
  { id: "construction", icon: Hammer, label: { en: "Hardware & Tools", sw: "Vifaa vya Ujenzi" } },
  { id: "vehicles", icon: Car, label: { en: "Automotive & Parts", sw: "Vifaa vya Magari" } },
  { id: "agriculture", icon: Wheat, label: { en: "Agriculture & Farming", sw: "Kilimo" } },
  { id: "sports", icon: Dumbbell, label: { en: "Sports & Fitness", sw: "Michezo" } },
  { id: "kids-clothing", icon: Baby, label: { en: "Baby & Kids", sw: "Vifaa vya Watoto" } },
  { id: "books", icon: BookOpen, label: { en: "Books & Stationery", sw: "Vitabu" } },
  { id: "jewelry", icon: Diamond, label: { en: "Jewelry & Accessories", sw: "Vito" } },
  { id: "health", icon: ShieldPlus, label: { en: "Health & Personal Care", sw: "Afya" } },
  { id: "other", icon: Box, label: { en: "General/Other", sw: "Mengineyo" } },
];

const STOCK_QUESTIONS: { id: string; en: string; sw: string }[] = [
  { id: "stock", en: "Yes, I keep stock in my shop", sw: "Ndiyo, ninaweka mzigo dukani" },
  { id: "partial", en: "Some items in stock, others on order", sw: "Baadhi yangu dukani, nyingi kwa oda" },
  { id: "order", en: "No stock — I source when a customer orders", sw: "Sina mzigo — natafuta mteja ameweka oda" },
];

const SERVICE_COVERAGE = [
  { id: "local", label: { en: "Local Area", sw: "Eneo la Karibu" } },
  { id: "city", label: { en: "City-wide", sw: "Mji mzima" } },
  { id: "region", label: { en: "Regional", sw: "Mkoa Mzima" } },
  { id: "nationwide", label: { en: "Nationwide", sw: "Nchi Nzima" } },
  { id: "international", label: { en: "International", sw: "Nje ya Nchi" } },
];

const CURRENCIES = [
  { id: "TZS", label: { en: "Tanzanian Shilling (TZS)", sw: "Shilingi ya Tanzania (TZS)" }, flag: "🇹🇿" },
  { id: "KES", label: { en: "Kenyan Shilling (KES)", sw: "Shilingi ya Kenya (KES)" }, flag: "🇰🇪" },
  { id: "UGX", label: { en: "Ugandan Shilling (UGX)", sw: "Shilingi ya Uganda (UGX)" }, flag: "🇺🇬" },
  { id: "RWF", label: { en: "Rwandan Franc (RWF)", sw: "Faranga ya Rwanda (RWF)" }, flag: "🇷🇼" },
  { id: "USD", label: { en: "US Dollar (USD)", sw: "Dola ya Marekani (USD)" }, flag: "🇺🇸" },
];

export default function Onboarding() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((s) => s.auth);
  const { lang } = useI18n();

  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const handleCancel = async () => {
    if (user?.id) {
      try {
        await updateMeOnApi({ defaultWorkspace: "customer" });
      } catch (e) {
        console.warn("Failed to revert workspace", e);
      }
    }
    navigate("/customer/home");
  };

  const [form, setForm] = useState({
    // Step 1: Identity
    name: "",
    phone: "+255",
    whatsapp: "",
    useAccountPhone: true,

    // Step 2: Products & prices (everything the till needs)
    productCategories: [] as string[],
    productCapabilities: {
      hasVariants: false,
      sellsByQuantity: true,
      sellsByWeight: false,
      sellsByLength: false,
      sellsByVolume: false,
      sellsSetsOrPackages: false,
    },
    inventoryModel: "stock",
    currency: lang === 'sw' ? "TZS" : "USD",

    // Step 3: Reach — optional, off by default
    marketplace: false,
    social: false,
    description: "",
    email: "",
    website: "",
    legal: {
      tin: "",
      vrn: "",
      licenseNumber: "",
      registrationNumber: "",
    },
    country: "Tanzania",
    region: "",
    district: "",
    address: "",
    lat: null as number | null,
    lon: null as number | null,
    serviceCoverage: [] as string[],
  });

  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [success, setSuccess] = useState(false);

  const existingShops = useAppSelector((s) => s.shops.shops);
  const [checkingShops, setCheckingShops] = useState(true);
  const [createAnyway, setCreateAnyway] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setCheckingShops(false);
      return;
    }
    let active = true;
    dispatch(fetchShops(user.id))
      .unwrap()
      .catch(() => null)
      .finally(() => { if (active) setCheckingShops(false); });
    return () => { active = false; };
  }, [user?.id, dispatch]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (form.useAccountPhone && user?.phone && !form.phone) {
      setForm(prev => ({ ...prev, phone: user.phone! }));
    }
  }, [step, form.useAccountPhone, user?.phone, form.phone]);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error(lang === 'sw' ? "GPS haipatikani kwenye kifaa hiki" : "GPS is not available on this device");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setForm((f) => ({ ...f, lat: latitude, lon: longitude }));
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            { headers: { Accept: "application/json" } }
          );
          if (!res.ok) throw new Error();
          const data = await res.json();
          const address = data.address || {};
          
          setForm((f) => ({ 
            ...f, 
            lat: latitude,
            lon: longitude,
            country: address.country || f.country,
            region: address.state || address.region || f.region,
            district: address.city || address.town || address.county || f.district,
          }));
          toast.success(lang === 'sw' ? "Mahali pamepatikana!" : "Location found!");
        } catch {
          toast.success(lang === 'sw' ? "Mahali pamepatikana (GPS)!" : "Location found (GPS)!");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        toast.error(lang === 'sw' ? "Imeshindwa kupata mahali. Tafadhali ruhusu GPS." : "Failed to get location. Please allow GPS.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleNext = () => {
    if (step === 1 && (!form.name || !form.phone)) {
      toast.error(lang === 'sw' ? "Tafadhali jaza jina la duka na namba ya simu" : "Please enter shop name and phone");
      return;
    }
    if (step === 2 && form.productCategories.length === 0) {
      toast.error(lang === 'sw' ? "Tafadhali chagua angalau kundi moja la bidhaa" : "Please pick at least one product category");
      return;
    }
    if (step === 3 && form.marketplace && (!form.region || !form.district)) {
      toast.error(lang === 'sw' ? "Tafadhali jaza mkoa na wilaya ili wanunuzi wakupate" : "Enter region and district so nearby buyers can find you");
      return;
    }
    
    setStep(s => Math.min(s + 1, totalSteps));
  };

  const handleBack = () => {
    setStep(s => Math.max(s - 1, 1));
  };

  const toggleArrayItem = (field: 'productCategories' | 'serviceCoverage', value: string) => {
    setForm(prev => {
      const current = prev[field] as string[];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter(item => item !== value) };
      } else {
        return { ...prev, [field]: [...current, value] };
      }
    });
  };

  const toggleProductCapability = (field: keyof typeof form.productCapabilities) => {
    setForm(prev => ({
      ...prev,
      productCapabilities: {
        ...prev.productCapabilities,
        [field]: !prev.productCapabilities[field]
      }
    }));
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      toast.error(lang === 'sw' ? "Kipindi chako kimeisha. Tafadhali ingia tena." : "User session expired. Please sign in again.");
      return;
    }

    setSubmitting(true);
    try {
      const sellsToBuyersOnline = form.marketplace;
      const channels = ["physical"];
      if (sellsToBuyersOnline) channels.push("marketplace");
      if (form.social) channels.push("social", "whatsapp");

      const shopData = {
        name: form.name,
        phone: form.phone,
        whatsappNumber: form.whatsapp,
        ownerId: user.id,

        productCategories: form.productCategories,
        productCapabilities: form.productCapabilities,
        inventoryModel: form.inventoryModel,
        currency: form.currency,

        // Reach fields: only collected when the merchant asked for the directory.
        description: sellsToBuyersOnline ? form.description : "",
        email: sellsToBuyersOnline ? form.email : "",
        website: sellsToBuyersOnline ? form.website : "",
        legal: form.legal,
        country: sellsToBuyersOnline ? form.country : "",
        region: sellsToBuyersOnline ? form.region : "",
        district: sellsToBuyersOnline ? form.district : "",
        location: sellsToBuyersOnline ? `${form.district}, ${form.region}` : "",
        address: sellsToBuyersOnline ? form.address : "",
        lat: sellsToBuyersOnline && form.lat ? form.lat : undefined,
        lon: sellsToBuyersOnline && form.lon ? form.lon : undefined,
        serviceCoverage: sellsToBuyersOnline ? form.serviceCoverage : [],

        // No longer asked in the wizard — sensible defaults, editable in Shop Setup.
        customerTypes: ["individual"],
        pricingModels: ["standard"],
        stockLocations: form.inventoryModel === "order" ? [] : ["shop"],
        fulfillmentMethods: ["pickup"],
        salesChannels: channels,
        language: lang === 'sw' ? "Swahili" : "English",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,

        setupStatus: "completed" as const,
        isPublic: false,
      };

      const resultAction = await dispatch(createShop(shopData));
      
      if (createShop.fulfilled.match(resultAction)) {
        setSuccess(true);
        const newShopId = resultAction.payload.id;
        if (newShopId) {
            dispatch(setCurrentShop(newShopId));
            dispatch(loadUserProfile());
        }
      } else {
        throw new Error(resultAction.error.message || (lang === 'sw' ? "Imeshindwa kusajili duka" : "Failed to create shop"));
      }
    } catch (error: any) {
      toast.error(error.message || (lang === 'sw' ? "Kuna tatizo limetokea" : "An error occurred"));
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingShops && !success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <PageLoader />
          <p className="text-sm text-muted-foreground font-semibold">
            {lang === 'sw' ? "Inakagua akaunti yako..." : "Checking your account..."}
          </p>
        </div>
      </div>
    );
  }

  if (!success && !createAnyway && existingShops.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-2xl shadow-xl border border-border p-8 text-center">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <Store className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-3">
            {lang === 'sw' ? "Tayari una duka" : "You already have a shop"}
          </h2>
          <p className="text-muted-foreground mb-6">
            {lang === 'sw'
              ? `Akaunti yako tayari inasimamia duka ${existingShops.length > 1 ? `${existingShops.length}` : `"${existingShops[0]?.name}"`}. Huhitaji kusanidi upya.`
              : `Your account already manages ${existingShops.length > 1 ? `${existingShops.length} shops` : `"${existingShops[0]?.name}"`}. You don't need to set up again.`}
          </p>
          <div className="flex flex-col gap-3">
            <Button size="lg" className="w-full" onClick={() => navigate("/dashboard")}>
              {lang === 'sw' ? "Nenda kwenye Dashibodi" : "Go to Dashboard"}
            </Button>
            <Button size="lg" variant="outline" className="w-full" onClick={() => setCreateAnyway(true)}>
              {lang === 'sw' ? "Ninataka kuongeza duka jingine" : "I want to add another shop"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-card rounded-2xl shadow-xl border border-border p-8 text-center"
        >
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <PartyPopper className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {lang === 'sw' ? "Hongera!" : "Congratulations!"}
          </h2>
          <p className="text-muted-foreground mb-6">
            {lang === 'sw' 
              ? "Duka lako limesajiliwa kikamilifu. Sasa, hebu tusanidi orodha yako ya bidhaa." 
              : "Your shop is now registered. Now, let's set up your product catalog."}
          </p>
          <div className="flex flex-col gap-3">
            <Button size="lg" onClick={() => navigate("/dashboard/products/new")} className="w-full">
              {lang === 'sw' ? "Ongeza Bidhaa" : "Add Product"}
            </Button>
            <Button size="lg" variant="ghost" onClick={() => navigate("/dashboard")} className="w-full">
              {lang === 'sw' ? "Nenda kwenye Dashibodi" : "Go to Dashboard"}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title={lang === 'sw' ? 'Sanidi Duka Lako - Twende Duka' : 'Set Up Your Shop - Twende Duka'} 
        description={lang === 'sw' ? 'Jiunge na Twende Duka' : 'Join Twende Duka'} 
      />
      <WizardShell
        step={step}
        totalSteps={totalSteps}
        shopName={form.name}
        onStepSelect={setStep}
        onBack={() => setStep(step - 1)}
        onNext={handleNext}
        onSubmit={handleSubmit}
        submitting={submitting}
        onCancel={handleCancel}
      >
          <AnimatePresence mode="wait">
            
            {/* Step 1: Shop Identity */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{lang === 'sw' ? "Jina la Duka *" : "Shop Name *"}</label>
                  <Input placeholder={lang === 'sw' ? "Mfano: Baraka Store" : "e.g. Baraka Store"} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="text-lg py-6" autoFocus />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{lang === 'sw' ? "Namba ya Simu *" : "Shop Phone *"}</label>
                    <Input placeholder="+255..." value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">{lang === 'sw' ? "WhatsApp (Si lazima)" : "WhatsApp (Optional)"}</label>
                    <Input placeholder="+255..." value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {lang === 'sw'
                    ? "Hizi ndizo pekee zinazohitajika. Maelezo, anwani na nyaraka za kisheria unaweza kuongeza baadaye."
                    : "These are all we need. Description, address and legal documents can be added any time."}
                </p>
              </motion.div>
            )}

            {/* Step 2: Products & Prices */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-7">

                <div className="space-y-3">
                  <label className="text-sm font-bold">{lang === 'sw' ? "Unauza nini? (chagua yote yanayokuhusu) *" : "What do you sell? (pick all that apply) *"}</label>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {PRODUCT_CATEGORIES.map((cat) => {
                      const isSelected = form.productCategories.includes(cat.id);
                      return (
                        <div key={cat.id} onClick={() => toggleArrayItem('productCategories', cat.id)} className={cn("rounded-xl border-2 p-2.5 cursor-pointer transition-all flex flex-col items-center text-center gap-1.5", isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                          <cat.icon className={cn("w-5 h-5", isSelected ? "text-primary" : "text-muted-foreground")} />
                          <span className={cn("text-[0.6875rem] font-medium leading-tight", isSelected ? "text-foreground" : "text-muted-foreground")}>{lang === 'sw' ? cat.label.sw : cat.label.en}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold">{lang === 'sw' ? "Unapima vipi bidhaa zako?" : "How do you measure your products?"}</label>
                  <div className="flex flex-wrap gap-2">
                    {SELLING_UNITS.map((u) => {
                      const on = form.productCapabilities[u.key];
                      return (
                        <div key={u.key} onClick={() => toggleProductCapability(u.key)} className={cn("rounded-full border-2 px-3.5 py-1.5 text-xs font-medium cursor-pointer transition-all", on ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/50")}>
                          {lang === 'sw' ? u.sw : u.en}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {lang === 'sw' ? "Hivi ndivyo mfumo utakavyohesabu mauzo — unaweza kuweka kipimo tofauti kwa kila bidhaa baadaye." : "This is how the till calculates prices — you can still mix units per product later."}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1 border-t border-dashed border-border">
                  <div className="space-y-3 pt-4">
                    <label className="text-sm font-bold">{lang === 'sw' ? "Unaweka mzigo (stoo)?" : "Do you keep stock?"}</label>
                    <div className="space-y-2">
                      {STOCK_QUESTIONS.map((q) => (
                        <div key={q.id} onClick={() => setForm({ ...form, inventoryModel: q.id })} className={cn("rounded-xl border-2 p-3 cursor-pointer flex items-center gap-3", form.inventoryModel === q.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                          <div className={cn("w-4 h-4 shrink-0 rounded-full border-2 flex items-center justify-center", form.inventoryModel === q.id ? "border-primary" : "border-muted-foreground")}>
                            {form.inventoryModel === q.id && <div className="w-2 h-2 rounded-full bg-primary" />}
                          </div>
                          <span className={cn("text-sm font-medium", form.inventoryModel === q.id ? "text-foreground" : "text-muted-foreground")}>{lang === 'sw' ? q.sw : q.en}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3 pt-4">
                    <label className="text-sm font-bold">{lang === 'sw' ? "Sarafu" : "Currency"}</label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                      {CURRENCIES.map(c => <option key={c.id} value={c.id}>{c.flag} {lang === 'sw' ? c.label.sw : c.label.en}</option>)}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      {lang === 'sw' ? "Bei zote za POS na ripiti hutumia sarafu hii." : "Every till price and report uses this currency."}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Reach (optional) */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">

                <div onClick={() => setForm({ ...form, marketplace: !form.marketplace })} className={cn("rounded-xl border-2 p-4 cursor-pointer transition-all flex items-start gap-3", form.marketplace ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                  <ShoppingCart className={cn("w-5 h-5 mt-0.5 shrink-0", form.marketplace ? "text-primary" : "text-muted-foreground")} />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold">{lang === 'sw' ? "Duka langu liwe kwenye orodha ya Twende Duka" : "List my shop in the Twende Duka directory"}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {lang === 'sw' ? "Wanunuzi wa karibu hutakupata kwenye ramani na hutafuta bidhaa zako." : "Nearby buyers find you on the map and search your products."}
                    </p>
                  </div>
                  {form.marketplace && <CheckCircle2 className="w-5 h-5 shrink-0 text-primary" />}
                </div>

                <div onClick={() => setForm({ ...form, social: !form.social })} className={cn("rounded-xl border-2 p-4 cursor-pointer transition-all flex items-start gap-3", form.social ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                  <Smartphone className={cn("w-5 h-5 mt-0.5 shrink-0", form.social ? "text-primary" : "text-muted-foreground")} />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold">{lang === 'sw' ? "Nitangaze bidhaa zangu kwenye mitandao ya kijamii" : "Post my products to social media"}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {lang === 'sw' ? "Facebook, Instagram na TikTok — huunganishwa baada ya duka lako kuundwa." : "Facebook, Instagram and TikTok — connected from Marketing once your shop exists."}
                    </p>
                  </div>
                  {form.social && <CheckCircle2 className="w-5 h-5 shrink-0 text-primary" />}
                </div>

                {!form.marketplace && !form.social && (
                  <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4">
                    <p className="text-sm font-medium">{lang === 'sw' ? "Sawa — tutaanza na mfumo wa kuuzia (POS) pekee." : "No problem — we'll start with the till only."}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {lang === 'sw' ? "Ukiwa tayari, unaweza kuwasha usajili wa umma baadaye: Dashibodi › Mipangilio ya Duka." : "When you're ready, turn on public listing from Dashboard › Shop Setup."}
                    </p>
                  </div>
                )}

                {form.marketplace && (
                  <div className="space-y-5 rounded-xl border border-border bg-background p-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold">{lang === 'sw' ? "Duka lako lipo wapi? *" : "Where is your shop? *"}</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">{lang === 'sw' ? "Mkoa" : "Region"}</label>
                          <Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder={lang === 'sw' ? "Mfano: Dar es Salaam" : "e.g. Dar es Salaam"} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">{lang === 'sw' ? "Wilaya / Mji" : "District / City"}</label>
                          <Input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} placeholder={lang === 'sw' ? "Mfano: Ilala" : "e.g. Ilala"} />
                        </div>
                      </div>
                      <div className="space-y-1.5 pt-1">
                        <label className="text-xs font-medium text-muted-foreground">{lang === 'sw' ? "Anwani kamili (Si lazima)" : "Full address (Optional)"}</label>
                        <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder={lang === 'sw' ? "Mtaa, jengo, nambari ya mlango" : "Street, building, door number"} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold">{lang === 'sw' ? "Weka alama kwenye ramani" : "Pin your shop on the map"}</label>
                      <div className="relative h-56 w-full overflow-hidden rounded-xl border border-border z-0">
                        <MapContainer center={form.lat && form.lon ? [form.lat, form.lon] : [-6.7924, 39.2083]} zoom={13} scrollWheelZoom={true} style={{ height: "100%", width: "100%", zIndex: 0 }}>
                          <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          />
                          <LocationMarker form={form} setForm={setForm} />
                          <MapUpdater lat={form.lat} lon={form.lon} />
                        </MapContainer>
                      </div>
                      <Button type="button" variant="outline" onClick={detectLocation} disabled={locating} className="w-full">
                        {locating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LocateFixed className="w-4 h-4 mr-2" />}
                        {form.lat ? (lang === 'sw' ? "Sasisha kutoka GPS" : "Update from GPS") : (lang === 'sw' ? "Tafuta mahali pangu" : "Find my location")}
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold">{lang === 'sw' ? "Eneo unalohudumia" : "Area you serve"}</label>
                      <div className="flex flex-wrap gap-2">
                        {SERVICE_COVERAGE.map(sc => (
                          <div key={sc.id} onClick={() => toggleArrayItem('serviceCoverage', sc.id)} className={cn("rounded-full border-2 px-3.5 py-1.5 text-xs font-medium cursor-pointer transition-all", form.serviceCoverage.includes(sc.id) ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/50")}>
                            {lang === 'sw' ? sc.label.sw : sc.label.en}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold">{lang === 'sw' ? "Maelezo mafupi ya duka" : "Short description"}</label>
                      <Textarea placeholder={lang === 'sw' ? "Tunauza..." : "We sell..."} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-[80px] resize-none" maxLength={300} />
                      <p className="text-xs text-muted-foreground">{lang === 'sw' ? "Hii huonekana kwenye matokeo ya utafutaji na ukurasa wa duka lako." : "This shows in search results and on your public shop page."}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">{lang === 'sw' ? "Barua pepe (Si lazima)" : "Email (Optional)"}</label>
                        <Input placeholder="shop@example.com" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">{lang === 'sw' ? "Tovuti (Si lazima)" : "Website (Optional)"}</label>
                        <Input placeholder="https://" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
                      </div>
                    </div>

                    <Accordion type="single" collapsible className="w-full border border-border rounded-xl px-4 bg-muted/30">
                      <AccordionItem value="legal" className="border-none">
                        <AccordionTrigger className="hover:no-underline py-4">
                          <div className="flex items-center gap-2 text-sm font-semibold">
                            <ShieldPlus className="w-4 h-4 text-primary" />
                            {lang === 'sw' ? "Nyaraka za kisheria (Si lazima)" : "Legal documents (Optional)"}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-2 pb-4">
                          <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 text-orange-800 dark:text-orange-300 text-xs p-3 rounded-lg flex gap-2 items-start font-medium">
                            <span className="text-lg leading-none">💡</span>
                            <p>{lang === 'sw'
                              ? "Dokezo: Kuweka TIN au Leseni kunakupa alama ya 'Muuzaji Aliyehakikiwa' na kufungua huduma za B2B baadaye."
                              : "Tip: Providing your TIN or Business License unlocks the 'Verified Seller' badge and allows you to sell to B2B corporate customers."}</p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">{lang === 'sw' ? "Namba ya TIN" : "TIN Number"}</label>
                              <Input placeholder="000-000-000" value={form.legal.tin} onChange={(e) => setForm({ ...form, legal: { ...form.legal, tin: e.target.value } })} />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">{lang === 'sw' ? "Namba ya VRN" : "VRN Number"}</label>
                              <Input placeholder="..." value={form.legal.vrn} onChange={(e) => setForm({ ...form, legal: { ...form.legal, vrn: e.target.value } })} />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">{lang === 'sw' ? "Leseni ya Biashara" : "Business License"}</label>
                              <Input placeholder="..." value={form.legal.licenseNumber} onChange={(e) => setForm({ ...form, legal: { ...form.legal, licenseNumber: e.target.value } })} />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">{lang === 'sw' ? "Namba ya Usajili (Brela)" : "Company Reg No"}</label>
                              <Input placeholder="..." value={form.legal.registrationNumber} onChange={(e) => setForm({ ...form, legal: { ...form.legal, registrationNumber: e.target.value } })} />
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2 italic">
                            {lang === 'sw' ? "Huna hizi taarifa kwa sasa? Usijali, unaweza kuziweka baadaye katika Mipangilio ya Duka." : "You don't have these right now? No problem, you can always add them later in your Shop Settings."}
                          </p>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">

                <div className="bg-muted/50 rounded-xl p-4 space-y-3 text-sm">
                  <div className="flex justify-between items-start border-b pb-3">
                    <div>
                      <h4 className="font-bold text-muted-foreground mb-1">{lang === 'sw' ? "Duka lako" : "Shop"}</h4>
                      <p className="font-medium text-lg leading-tight">{form.name || "—"}</p>
                      <p className="text-muted-foreground">{form.phone}{form.whatsapp ? ` · WhatsApp ${form.whatsapp}` : ""}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setStep(1)}>{lang === 'sw' ? "Badilisha" : "Edit"}</Button>
                  </div>

                  <div className="flex justify-between items-start border-b pb-3">
                    <div>
                      <h4 className="font-bold text-muted-foreground mb-1">{lang === 'sw' ? "Mfumo wa kuuzia na bidhaa" : "Till & Products"}</h4>
                      <p className="text-muted-foreground">{form.productCategories.map(t => PRODUCT_CATEGORIES.find(x => x.id === t)?.label[lang === 'sw' ? 'sw' : 'en']).join(", ") || "—"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {SELLING_UNITS.filter(u => form.productCapabilities[u.key]).map(u => lang === 'sw' ? u.sw : u.en).join(" · ") || "—"}
                      </p>
                      <p className="mt-1 text-xs">{STOCK_QUESTIONS.find(x => x.id === form.inventoryModel)?.[lang === 'sw' ? 'sw' : 'en']} · {form.currency}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setStep(2)}>{lang === 'sw' ? "Badilisha" : "Edit"}</Button>
                  </div>

                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-muted-foreground mb-1">{lang === 'sw' ? "Ufikiaji wa wanunuzi" : "Reach"}</h4>
                      <p className="text-muted-foreground">
                        {form.marketplace
                          ? `${lang === 'sw' ? "Orodha ya umma" : "Public directory"}: ${form.district}, ${form.region}${form.lat ? ` · ${lang === 'sw' ? "ina alama kwenye ramani" : "pinned"}` : ""}`
                          : (lang === 'sw' ? "Duka binafsi — halionekani kwenye orodha" : "Private shop — not listed in the directory")}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {form.social ? (lang === 'sw' ? "Mitandao ya kijamii: unganisha katika Marketing" : "Social media: connect in Marketing") : (lang === 'sw' ? "Hakuna mitandao ya kijamii" : "No social posting")}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setStep(3)}>{lang === 'sw' ? "Badilisha" : "Edit"}</Button>
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-muted-foreground">
                  {lang === 'sw'
                    ? "Duka lako litaundwa mara tu unapobofya kitufe hiki. Usajili wa kwenye orodha ya umma hukaguliwa na timu ya Twende Duka kabla ya kuanza kuonekana."
                    : "Your shop is created as soon as you hit the button. Public listing is reviewed by the Twende Duka team before it goes live."}
                </p>
              </motion.div>
            )}

          </AnimatePresence>
      </WizardShell>
    </>
  );
}
