/**
 * Merchant business-setup wizard (/setup-business).
 *
 * Mirrors the onboarding wizard's seven steps field-for-field, but edits the
 * merchant's existing shop instead of creating one: each step PATCHes its slice
 * through ``editShop`` so progress survives a reload, and the last step flips
 * ``setupStatus`` to completed so the app shell stops redirecting here.
 */
import React, { useState, useEffect, useRef } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  Store, Loader2, Package, Truck, Factory, Globe,
  ShoppingCart, Building2, Shirt, Smartphone, Monitor, ShoppingBag, Utensils,
  Hammer, Sofa, Heart, Car, Wheat, Dumbbell,
  Baby, BookOpen, Diamond, ShieldPlus, Component, Box,
  CheckCircle2, Phone, LocateFixed, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { editShop, fetchShops } from "@/store/shopsSlice";
import { getShopSettings } from "@/lib/api/domains/shopSettings";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import SEO from "@/components/SEO";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import WizardShell from "@/components/onboarding/WizardShell";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PageLoader } from "@/components/common/Loader";
import type { Shop } from "@/types";

import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl: iconShadow,
});

function LocationMarker({ form, setForm }: { form: any; setForm: any }) {
  useMapEvents({
    click(e) {
      setForm((prev: any) => ({ ...prev, lat: e.latlng.lat, lon: e.latlng.lng }));
    },
  });

  return form.lat && form.lon ? (
    <Marker position={[form.lat, form.lon]}></Marker>
  ) : null;
}

function MapUpdater({ lat, lon }: { lat: number | null; lon: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lon) {
      map.flyTo([lat, lon], map.getZoom());
    }
  }, [lat, lon, map]);
  return null;
}

// --- DATA LISTS ---
const SHOP_TYPES = [
  { id: "retail", icon: Store, label: { en: "Retail Shop", sw: "Duka la Rejareja" } },
  { id: "wholesale", icon: Package, label: { en: "Wholesale Shop", sw: "Duka la Jumla" } },
  { id: "distributor", icon: Truck, label: { en: "Distributor", sw: "Msambazaji" } },
  { id: "manufacturer", icon: Factory, label: { en: "Manufacturer / Producer", sw: "Mzalishaji" } },
  { id: "importer", icon: Globe, label: { en: "Importer / Reseller", sw: "Muingizaji" } },
  { id: "general", icon: Store, label: { en: "General Shop", sw: "Duka la Kawaida" } },
  { id: "specialty", icon: Component, label: { en: "Specialty Shop", sw: "Duka Maalum" } },
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

const SALES_CHANNELS = [
  { id: "physical", icon: Store, label: { en: "Physical Shop", sw: "Duka la Kuonekana" } },
  { id: "online", icon: Globe, label: { en: "Online Store", sw: "Duka la Mtandaoni" } },
  { id: "marketplace", icon: ShoppingCart, label: { en: "Marketplace", sw: "Soko la Mtandaoni" } },
  { id: "social", icon: Smartphone, label: { en: "Social Media", sw: "Mitandao ya Kijamii" } },
  { id: "whatsapp", icon: Phone, label: { en: "WhatsApp", sw: "WhatsApp" } },
  { id: "mobile", icon: Truck, label: { en: "Mobile / Field Sales", sw: "Mauzo ya Kutembea" } },
];

const CUSTOMER_TYPES = [
  { id: "individual", icon: Users, label: { en: "Individual Customers (B2C)", sw: "Wateja Binafsi (B2C)" } },
  { id: "business", icon: Building2, label: { en: "Business Customers (B2B)", sw: "Biashara Nyingine (B2B)" } },
];

const PRICING_MODELS = [
  { id: "standard", label: { en: "Standard Selling Price", sw: "Bei ya Kawaida" } },
  { id: "retail_wholesale", label: { en: "Retail & Wholesale Pricing", sw: "Bei ya Rejareja & Jumla" } },
  { id: "quantity", label: { en: "Quantity-Based Pricing", sw: "Bei kulingana na Idadi" } },
  { id: "promotional", label: { en: "Promotional Pricing", sw: "Bei ya Punguzo/Ofa" } },
  { id: "customer_specific", label: { en: "Customer-Specific Pricing", sw: "Bei Kulingana na Mteja" } },
];

const INVENTORY_MODELS = [
  { id: "stock", label: { en: "Stock-based (I keep inventory)", sw: "Ninaweka mzigo/stoo" } },
  { id: "partial", label: { en: "Partially stock-based", sw: "Nusu stoo, nusu oda" } },
  { id: "order", label: { en: "Order-based (I source when ordered)", sw: "Mteja akiweka oda ndio natafuta" } },
];

const STOCK_LOCATIONS = [
  { id: "shop", label: { en: "At the Shop", sw: "Dukani" } },
  { id: "warehouse", label: { en: "In a Warehouse", sw: "Ghalani (Warehouse)" } },
  { id: "multiple", label: { en: "Multiple Locations", sw: "Sehemu Mbalimbali" } },
];

const FULFILLMENT_METHODS = [
  { id: "pickup", label: { en: "Customer Pickup", sw: "Mteja Kuchukua Dukani" } },
  { id: "local_delivery", label: { en: "Local Delivery", sw: "Kufikisha Karibu (Mtaani/Wilayani)" } },
  { id: "regional", label: { en: "Regional Delivery", sw: "Kufikisha Mkoani" } },
  { id: "nationwide", label: { en: "Nationwide Delivery", sw: "Kufikisha Nchi Nzima" } },
  { id: "courier", label: { en: "Third-party Courier", sw: "Kutuma kwa Basi/Ndege/Courier" } },
];

const SERVICE_COVERAGE = [
  { id: "local", label: { en: "Local Area", sw: "Eneo la Karibu" } },
  { id: "city", label: { en: "City-wide", sw: "Mji mzima" } },
  { id: "region", label: { en: "Regional", sw: "Mkoa Mzima" } },
  { id: "nationwide", label: { en: "Nationwide", sw: "Nchi Nzima" } },
  { id: "international", label: { en: "International", sw: "Nje ya Nchi" } },
];

const CURRENCIES = [
  { id: "TZS", label: "Tanzanian Shilling (TZS)", flag: "🇹🇿" },
  { id: "KES", label: "Kenyan Shilling (KES)", flag: "🇰🇪" },
  { id: "UGX", label: "Ugandan Shilling (UGX)", flag: "🇺🇬" },
  { id: "RWF", label: "Rwandan Franc (RWF)", flag: "🇷🇼" },
  { id: "USD", label: "US Dollar (USD)", flag: "🇺🇸" },
];

const LANGUAGES = [
  { id: "Swahili", label: "Kiswahili", desc: "Kwa watumiaji wa Kiswahili" },
  { id: "English", label: "English", desc: "For English speaking users" },
  { id: "Both", label: "Both (Swahili & English)", desc: "Bilingual interface" },
];

type ArrayField =
  | "shopTypes"
  | "productCategories"
  | "customerTypes"
  | "salesChannels"
  | "pricingModels"
  | "stockLocations"
  | "fulfillmentMethods"
  | "serviceCoverage";

interface SetupFormData {
  name: string;
  phone: string;
  description: string;
  whatsapp: string;
  email: string;
  website: string;
  legal: { tin: string; vrn: string; licenseNumber: string; registrationNumber: string };
  shopTypes: string[];
  productCategories: string[];
  productCapabilities: {
    hasVariants: boolean;
    sellsByQuantity: boolean;
    sellsByWeight: boolean;
    sellsByLength: boolean;
    sellsByVolume: boolean;
    sellsSetsOrPackages: boolean;
  };
  customerTypes: string[];
  salesChannels: string[];
  pricingModels: string[];
  inventoryModel: string;
  stockLocations: string[];
  fulfillmentMethods: string[];
  country: string;
  region: string;
  district: string;
  address: string;
  lat: number | null;
  lon: number | null;
  serviceCoverage: string[];
  currency: string;
  language: string;
  timezone: string;
}

export default function BusinessSetupWizard() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { lang } = useI18n();
  const user = useAppSelector((s) => s.auth.user);
  const currentShopId = useAppSelector((s) => s.shops.currentShopId);
  const shops = useAppSelector((s) => s.shops.shops);
  const shopsInitialized = useAppSelector((s) => s.shops.initialized);
  const currentShop = shops.find((s) => s.id === currentShopId);

  const [step, setStep] = useState(1);
  const totalSteps = 7;
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const [form, setForm] = useState<SetupFormData>(() => ({
    name: "",
    phone: "+255",
    description: "",
    whatsapp: "",
    email: "",
    website: "",
    legal: { tin: "", vrn: "", licenseNumber: "", registrationNumber: "" },
    shopTypes: [],
    productCategories: [],
    productCapabilities: {
      hasVariants: false,
      sellsByQuantity: true,
      sellsByWeight: false,
      sellsByLength: false,
      sellsByVolume: false,
      sellsSetsOrPackages: false,
    },
    customerTypes: [],
    salesChannels: [],
    pricingModels: [],
    inventoryModel: "stock",
    stockLocations: [],
    fulfillmentMethods: [],
    country: "Tanzania",
    region: "",
    district: "",
    address: "",
    lat: null,
    lon: null,
    serviceCoverage: [],
    currency: lang === "sw" ? "TZS" : "USD",
    language: lang === "sw" ? "Swahili" : "English",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }));

  // The wizard can be opened cold (refresh / direct link), where the shops
  // slice is still empty. Bootstrap it so the gate below can resolve.
  useEffect(() => {
    if (user?.id && !shopsInitialized) {
      dispatch(fetchShops(user.id)).unwrap().catch(() => null);
    }
  }, [user?.id, shopsInitialized, dispatch]);

  // Hydrate the form once per shop — the useState initializer above ran before
  // shops were loaded on a cold open.
  const hydratedShopRef = useRef<string | null>(null);
  useEffect(() => {
    const shop = currentShop;
    if (!shop || hydratedShopRef.current === shop.id) return;
    hydratedShopRef.current = shop.id;
    setForm((prev) => ({
      ...prev,
      name: shop.name || prev.name,
      phone: shop.phone || prev.phone,
      description: shop.description || "",
      whatsapp: shop.whatsappNumber || "",
      email: shop.email || "",
      website: shop.website || "",
      shopTypes: shop.shopTypes ?? [],
      productCategories: shop.productCategories ?? [],
      productCapabilities: { ...prev.productCapabilities, ...(shop.productCapabilities ?? {}) },
      customerTypes: shop.customerTypes ?? [],
      salesChannels: shop.salesChannels ?? [],
      pricingModels: shop.pricingModels ?? [],
      inventoryModel: shop.inventoryModel || prev.inventoryModel,
      stockLocations: shop.stockLocations ?? [],
      fulfillmentMethods: shop.fulfillmentMethods ?? [],
      country: shop.country || prev.country,
      region: shop.region || "",
      district: shop.district || "",
      address: shop.address || "",
      lat: shop.lat ?? null,
      lon: shop.lon ?? null,
      serviceCoverage: shop.serviceCoverage ?? [],
      currency: shop.currency || prev.currency,
      language: shop.language || prev.language,
      timezone: shop.timezone || prev.timezone,
    }));
  }, [currentShop]);

  // The legal identifiers live on flat columns and read back through the shop
  // settings' businessInfo group, so they need their own fetch. The wizard
  // waits for it so a save can't send stale (empty) legal values.
  const shopIdForSettings = currentShop?.id;
  useEffect(() => {
    if (!shopIdForSettings) return;
    let active = true;
    getShopSettings(shopIdForSettings)
      .then((settings) => {
        if (!active) return;
        const info = settings.businessInfo;
        if (!info) return;
        setForm((prev) => ({
          ...prev,
          legal: {
            tin: info.tin || prev.legal.tin,
            vrn: info.vat || prev.legal.vrn,
            licenseNumber: info.licenseNumber || prev.legal.licenseNumber,
            registrationNumber: info.registrationNumber || prev.legal.registrationNumber,
          },
        }));
      })
      .catch(() => null)
      .finally(() => {
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, [shopIdForSettings]);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error(lang === "sw" ? "GPS haipatikani kwenye kifaa hiki" : "GPS is not available on this device");
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
          toast.success(lang === "sw" ? "Mahali pamepatikana!" : "Location found!");
        } catch {
          toast.success(lang === "sw" ? "Mahali pamepatikana (GPS)!" : "Location found (GPS)!");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        toast.error(lang === "sw" ? "Imeshindwa kupata mahali. Tafadhali ruhusu GPS." : "Failed to get location. Please allow GPS.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const toggleArrayItem = (field: ArrayField, value: string) => {
    setForm((prev) => {
      const current = prev[field];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter((item) => item !== value) };
      }
      return { ...prev, [field]: [...current, value] };
    });
  };

  const toggleProductCapability = (field: keyof SetupFormData["productCapabilities"]) => {
    setForm((prev) => ({
      ...prev,
      productCapabilities: {
        ...prev.productCapabilities,
        [field]: !prev.productCapabilities[field],
      },
    }));
  };

  const handleNext = async () => {
    if (step === 1 && (!form.name || !form.phone)) {
      toast.error(lang === "sw" ? "Tafadhali jaza jina la duka na namba ya simu" : "Please enter shop name and phone");
      return;
    }
    if (step === 2 && (form.shopTypes.length === 0 || form.productCategories.length === 0)) {
      toast.error(lang === "sw" ? "Tafadhali chagua aina ya duka na bidhaa" : "Please select shop type and product category");
      return;
    }
    if (step === 4 && (form.customerTypes.length === 0 || form.salesChannels.length === 0)) {
      toast.error(lang === "sw" ? "Tafadhali chagua aina za wateja na njia za mauzo" : "Please select customer types and sales channels");
      return;
    }
    if (step === 6 && (!form.country || !form.region || !form.district)) {
      toast.error(lang === "sw" ? "Tafadhali jaza taarifa za nchi, mkoa na wilaya" : "Please fill in country, region and district");
      return;
    }
    if (!currentShopId) return;

    setSubmitting(true);
    try {
      if (step === 1) {
        // Only non-empty legal identifiers are sent: shopWritePayload maps this
        // block onto the flat *_number columns, and PATCHing blanks would wipe
        // values we could not hydrate (e.g. the settings read failed).
        const legal: Record<string, string> = {};
        if (form.legal.tin) legal.tin = form.legal.tin;
        if (form.legal.vrn) legal.vrn = form.legal.vrn;
        if (form.legal.licenseNumber) legal.licenseNumber = form.legal.licenseNumber;
        if (form.legal.registrationNumber) legal.registrationNumber = form.legal.registrationNumber;
        const data: Partial<Shop> = {
          name: form.name,
          phone: form.phone,
          description: form.description,
          whatsappNumber: form.whatsapp,
          email: form.email,
          website: form.website,
          legal,
        };
        await dispatch(editShop({ id: currentShopId, data })).unwrap();
      } else if (step === 2) {
        await dispatch(editShop({
          id: currentShopId,
          data: { shopTypes: form.shopTypes, productCategories: form.productCategories },
        })).unwrap();
      } else if (step === 3) {
        await dispatch(editShop({
          id: currentShopId,
          data: { productCapabilities: form.productCapabilities },
        })).unwrap();
      } else if (step === 4) {
        await dispatch(editShop({
          id: currentShopId,
          data: {
            customerTypes: form.customerTypes,
            salesChannels: form.salesChannels,
            pricingModels: form.pricingModels,
          },
        })).unwrap();
      } else if (step === 5) {
        await dispatch(editShop({
          id: currentShopId,
          data: {
            inventoryModel: form.inventoryModel,
            stockLocations: form.stockLocations,
            fulfillmentMethods: form.fulfillmentMethods,
          },
        })).unwrap();
      } else if (step === 6) {
        const data: Partial<Shop> = {
          country: form.country,
          region: form.region,
          district: form.district,
          address: form.address,
          location: `${form.district}, ${form.region}`,
          serviceCoverage: form.serviceCoverage,
          currency: form.currency,
          language: form.language,
          timezone: form.timezone,
        };
        if (form.lat != null && form.lon != null) {
          data.lat = form.lat;
          data.lon = form.lon;
        }
        await dispatch(editShop({ id: currentShopId, data })).unwrap();
      }
      setStep(Math.min(step + 1, totalSteps));
    } catch (e) {
      toast.error(lang === "sw" ? "Kuna tatizo" : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!currentShopId) return;
    setSubmitting(true);
    try {
      const hasLegal = Boolean(
        form.legal.tin || form.legal.vrn || form.legal.licenseNumber || form.legal.registrationNumber
      );
      await dispatch(editShop({
        id: currentShopId,
        data: {
          setupStatus: "completed",
          verificationStatus: hasLegal ? "pending" : "unverified",
        },
      })).unwrap();
      toast.success(lang === "sw" ? "Usanidi umekamilika!" : "Setup Complete!");
      navigate("/dashboard");
    } catch (e) {
      toast.error(lang === "sw" ? "Kuna tatizo" : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentShopId || !currentShop) {
    if (!shopsInitialized) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <PageLoader />
        </div>
      );
    }
    // Shops are loaded but there are none: this merchant has no business yet.
    return <Navigate to="/onboarding" replace />;
  }

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <PageLoader />
      </div>
    );
  }

  return (
    <>
      <SEO
        title={lang === "sw" ? "Usanidi wa Biashara" : "Business Setup"}
        description={lang === "sw" ? "Kamilisha usanidi wa biashara yako kwenye Twende Duka." : "Complete your business setup on Twende Duka."}
      />
      <WizardShell
        step={step}
        totalSteps={totalSteps}
        shopName={form.name}
        submitting={submitting}
        submitLabel={{ en: "Submit & Finish", sw: "Wasilisha & Maliza" }}
        onStepSelect={setStep}
        onBack={() => setStep(Math.max(step - 1, 1))}
        onNext={handleNext}
        onSubmit={handleSubmit}
      >
        <AnimatePresence mode="wait">

          {/* Step 1: Shop Identity */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{lang === 'sw' ? "Jina la Duka *" : "Shop Name *"}</label>
                  <Input placeholder={lang === 'sw' ? "Mfano: Baraka Store" : "e.g. Baraka Store"} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="text-lg py-6" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{lang === 'sw' ? "Namba ya Simu ya Duka *" : "Shop Phone Number *"}</label>
                  <Input placeholder="+255..." value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="text-lg py-6" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{lang === 'sw' ? "Maelezo ya Duka (Si lazima)" : "Shop Description (Optional)"}</label>
                  <Textarea placeholder={lang === 'sw' ? "Tunauza..." : "We sell..."} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-[100px] resize-none" maxLength={300} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">WhatsApp (Optional)</label>
                    <Input placeholder="+255..." value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email (Optional)</label>
                    <Input placeholder="shop@example.com" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Website (Optional)</label>
                  <Input placeholder="https://" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
                </div>

                <Accordion type="single" collapsible className="w-full mt-4 border border-border rounded-xl px-4 bg-muted/30">
                  <AccordionItem value="legal" className="border-none">
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <ShieldPlus className="w-4 h-4 text-primary" />
                        {lang === 'sw' ? "Taarifa za Kisheria (Si lazima sasa)" : "Advanced Legal Details (Optional)"}
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
                          <label className="text-sm font-medium">TIN Number</label>
                          <Input placeholder="000-000-000" value={form.legal.tin} onChange={(e) => setForm({ ...form, legal: { ...form.legal, tin: e.target.value } })} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">VRN Number</label>
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
                        {lang === 'sw' ? "Huna hizi taarifa sasa? Usijali, unaweza kuziruka na kuziweka baadaye kwenye Settings." : "You don't have these right now? No problem, you can always add them later in your Shop Settings."}
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </motion.div>
          )}

          {/* Step 2: Classification */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">

              <div className="space-y-4">
                <label className="text-sm font-bold">{lang === 'sw' ? "Aina ya Duka (Chagua zinazofaa) *" : "Shop Type (Select applicable) *"}</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SHOP_TYPES.map((type) => {
                    const isSelected = form.shopTypes.includes(type.id);
                    return (
                      <div key={type.id} onClick={() => toggleArrayItem('shopTypes', type.id)} className={cn("p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3", isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                        <type.icon className={cn("w-5 h-5", isSelected ? "text-primary" : "text-muted-foreground")} />
                        <span className={cn("font-medium", isSelected ? "text-foreground" : "text-muted-foreground")}>{lang === 'sw' ? type.label.sw : type.label.en}</span>
                        {isSelected && <CheckCircle2 className="w-5 h-5 ml-auto text-primary" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-bold">{lang === 'sw' ? "Kundi la Bidhaa *" : "Product Category *"}</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {PRODUCT_CATEGORIES.map((cat) => {
                    const isSelected = form.productCategories.includes(cat.id);
                    return (
                      <div key={cat.id} onClick={() => toggleArrayItem('productCategories', cat.id)} className={cn("p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center text-center gap-2", isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                        <cat.icon className={cn("w-6 h-6", isSelected ? "text-primary" : "text-muted-foreground")} />
                        <span className={cn("text-xs font-medium", isSelected ? "text-foreground" : "text-muted-foreground")}>{lang === 'sw' ? cat.label.sw : cat.label.en}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Product Model */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div onClick={() => toggleProductCapability('hasVariants')} className={cn("p-4 rounded-xl border-2 cursor-pointer transition-all", form.productCapabilities.hasVariants ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                  <h3 className="font-bold mb-1">Products with Variations</h3>
                  <p className="text-sm text-muted-foreground">Different sizes, colors, or materials (e.g. Clothes, Shoes)</p>
                </div>
                <div onClick={() => toggleProductCapability('sellsByQuantity')} className={cn("p-4 rounded-xl border-2 cursor-pointer transition-all", form.productCapabilities.sellsByQuantity ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                  <h3 className="font-bold mb-1">Sold by Quantity</h3>
                  <p className="text-sm text-muted-foreground">Standard items sold in countable units (e.g. Phones, Chairs)</p>
                </div>
                <div onClick={() => toggleProductCapability('sellsByWeight')} className={cn("p-4 rounded-xl border-2 cursor-pointer transition-all", form.productCapabilities.sellsByWeight ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                  <h3 className="font-bold mb-1">Sold by Weight</h3>
                  <p className="text-sm text-muted-foreground">Items weighed per kg/g (e.g. Sugar, Meat, Vegetables)</p>
                </div>
                <div onClick={() => toggleProductCapability('sellsByLength')} className={cn("p-4 rounded-xl border-2 cursor-pointer transition-all", form.productCapabilities.sellsByLength ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                  <h3 className="font-bold mb-1">Sold by Length</h3>
                  <p className="text-sm text-muted-foreground">Items measured in meters (e.g. Fabrics, Cables, Pipes)</p>
                </div>
                <div onClick={() => toggleProductCapability('sellsByVolume')} className={cn("p-4 rounded-xl border-2 cursor-pointer transition-all", form.productCapabilities.sellsByVolume ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                  <h3 className="font-bold mb-1">Sold by Volume</h3>
                  <p className="text-sm text-muted-foreground">Liquids in Liters/ml (e.g. Cooking Oil, Paint)</p>
                </div>
                <div onClick={() => toggleProductCapability('sellsSetsOrPackages')} className={cn("p-4 rounded-xl border-2 cursor-pointer transition-all", form.productCapabilities.sellsSetsOrPackages ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                  <h3 className="font-bold mb-1">Sold as Sets / Packages</h3>
                  <p className="text-sm text-muted-foreground">Items bundled together (e.g. Furniture sets, Gift baskets)</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 4: Selling Model */}
          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">

              <div className="space-y-4">
                <label className="text-sm font-bold">{lang === 'sw' ? "Aina ya Wateja *" : "Customer Types *"}</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CUSTOMER_TYPES.map(ct => (
                    <div key={ct.id} onClick={() => toggleArrayItem('customerTypes', ct.id)} className={cn("p-3 rounded-xl border-2 cursor-pointer flex items-center gap-3", form.customerTypes.includes(ct.id) ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                      <ct.icon className={cn("w-5 h-5", form.customerTypes.includes(ct.id) ? "text-primary" : "text-muted-foreground")} />
                      <span className="font-medium text-sm">{lang === 'sw' ? ct.label.sw : ct.label.en}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-bold">{lang === 'sw' ? "Njia za Mauzo *" : "Sales Channels *"}</label>
                <div className="grid grid-cols-2 gap-3">
                  {SALES_CHANNELS.map(sc => (
                    <div key={sc.id} onClick={() => toggleArrayItem('salesChannels', sc.id)} className={cn("p-3 rounded-xl border-2 cursor-pointer flex items-center gap-3", form.salesChannels.includes(sc.id) ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                      <sc.icon className={cn("w-5 h-5", form.salesChannels.includes(sc.id) ? "text-primary" : "text-muted-foreground")} />
                      <span className="font-medium text-xs">{lang === 'sw' ? sc.label.sw : sc.label.en}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-bold">{lang === 'sw' ? "Mfumo wa Bei (Si lazima)" : "Pricing Model (Optional)"}</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PRICING_MODELS.map(pm => {
                    // Only show wholesale pricing if shop is wholesale or distributor
                    if (pm.id === 'retail_wholesale' && !form.shopTypes.some(t => ['wholesale', 'distributor', 'manufacturer', 'importer'].includes(t))) return null;
                    return (
                      <div key={pm.id} onClick={() => toggleArrayItem('pricingModels', pm.id)} className={cn("p-3 rounded-xl border-2 cursor-pointer flex items-center gap-3", form.pricingModels.includes(pm.id) ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                        <span className="font-medium text-sm">{lang === 'sw' ? pm.label.sw : pm.label.en}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 5: Operations */}
          {step === 5 && (
            <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">

              <div className="space-y-4">
                <label className="text-sm font-bold">{lang === 'sw' ? "Mfumo wa Stoo" : "Inventory Model"}</label>
                <div className="grid grid-cols-1 gap-3">
                  {INVENTORY_MODELS.map(im => (
                    <div key={im.id} onClick={() => setForm({ ...form, inventoryModel: im.id })} className={cn("p-3 rounded-xl border-2 cursor-pointer flex items-center gap-3", form.inventoryModel === im.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                      <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center", form.inventoryModel === im.id ? "border-primary" : "border-muted-foreground")}>
                        {form.inventoryModel === im.id && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <span className="font-medium text-sm">{lang === 'sw' ? im.label.sw : im.label.en}</span>
                    </div>
                  ))}
                </div>
              </div>

              {(form.inventoryModel === 'stock' || form.inventoryModel === 'partial') && (
                <div className="space-y-4">
                  <label className="text-sm font-bold">{lang === 'sw' ? "Eneo la Stoo" : "Stock Locations"}</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {STOCK_LOCATIONS.map(sl => (
                      <div key={sl.id} onClick={() => toggleArrayItem('stockLocations', sl.id)} className={cn("p-3 rounded-xl border-2 cursor-pointer flex items-center justify-center text-center", form.stockLocations.includes(sl.id) ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                        <span className="font-medium text-sm">{lang === 'sw' ? sl.label.sw : sl.label.en}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <label className="text-sm font-bold">{lang === 'sw' ? "Njia za Ufikishaji (Fulfillment)" : "Fulfillment Methods"}</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {FULFILLMENT_METHODS.map(fm => (
                    <div key={fm.id} onClick={() => toggleArrayItem('fulfillmentMethods', fm.id)} className={cn("p-3 rounded-xl border-2 cursor-pointer flex items-center gap-3", form.fulfillmentMethods.includes(fm.id) ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                      <span className="font-medium text-sm">{lang === 'sw' ? fm.label.sw : fm.label.en}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 6: Location & Settings */}
          {step === 6 && (
            <motion.div key="step6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{lang === 'sw' ? "Nchi *" : "Country *"}</label>
                  <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{lang === 'sw' ? "Mkoa *" : "Region / State *"}</label>
                  <Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{lang === 'sw' ? "Wilaya/Mji *" : "District / City *"}</label>
                  <Input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{lang === 'sw' ? "Anwani Kamili" : "Full Address"}</label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <label className="text-sm font-bold">{lang === 'sw' ? "Chagua Mahali Kwenye Ramani" : "Pick Location on Map"}</label>
                <p className="text-xs text-muted-foreground">{lang === 'sw' ? "Bofya kwenye ramani kuweka alama ya duka lako." : "Click on the map to set your shop's exact location."}</p>
                <div className="h-64 w-full rounded-xl overflow-hidden border border-border z-0 relative">
                  <MapContainer center={form.lat && form.lon ? [form.lat, form.lon] : [-6.7924, 39.2083]} zoom={13} scrollWheelZoom={true} style={{ height: "100%", width: "100%", zIndex: 0 }}>
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker form={form} setForm={setForm} />
                    <MapUpdater lat={form.lat} lon={form.lon} />
                  </MapContainer>
                </div>
                <div className="pt-2">
                  <Button type="button" variant="outline" onClick={detectLocation} disabled={locating} className="w-full">
                    {locating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LocateFixed className="w-4 h-4 mr-2" />}
                    {form.lat ? (lang === 'sw' ? "Sasisha Kutoka GPS" : "Update from GPS") : (lang === 'sw' ? "Tafuta Kutoka GPS" : "Get from GPS")}
                  </Button>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <label className="text-sm font-bold">{lang === 'sw' ? "Eneo Unalohudumia" : "Service Coverage"}</label>
                <div className="grid grid-cols-2 gap-3">
                  {SERVICE_COVERAGE.map(sc => (
                    <div key={sc.id} onClick={() => toggleArrayItem('serviceCoverage', sc.id)} className={cn("p-2 rounded-xl border cursor-pointer text-center text-sm", form.serviceCoverage.includes(sc.id) ? "border-primary bg-primary/5 font-bold text-primary" : "border-border hover:border-primary/50 text-muted-foreground")}>
                      {lang === 'sw' ? sc.label.sw : sc.label.en}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{lang === 'sw' ? "Sarafu" : "Currency"}</label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                    {CURRENCIES.map(c => <option key={c.id} value={c.id}>{c.flag} {c.label}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{lang === 'sw' ? "Lugha" : "Language"}</label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                    {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 7: Review */}
          {step === 7 && (
            <motion.div key="step7" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">

              <div className="bg-muted/50 rounded-xl p-4 space-y-4 text-sm">
                <div className="flex justify-between items-start border-b pb-2">
                  <div>
                    <h4 className="font-bold text-muted-foreground mb-1">Shop Identity</h4>
                    <p className="font-medium text-lg">{form.name}</p>
                    <p className="text-muted-foreground">{form.phone}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep(1)}>Edit</Button>
                </div>

                <div className="flex justify-between items-start border-b pb-2">
                  <div>
                    <h4 className="font-bold text-muted-foreground mb-1">Business Model</h4>
                    <p>{form.shopTypes.map(t => SHOP_TYPES.find(x => x.id === t)?.label.en).join(", ") || "None"}</p>
                    <p className="mt-1">{form.productCategories.map(t => PRODUCT_CATEGORIES.find(x => x.id === t)?.label.en).join(", ") || "None"}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep(2)}>Edit</Button>
                </div>

                <div className="flex justify-between items-start border-b pb-2">
                  <div>
                    <h4 className="font-bold text-muted-foreground mb-1">Selling & Customers</h4>
                    <p>Customers: {form.customerTypes.map(t => CUSTOMER_TYPES.find(x => x.id === t)?.label.en).join(", ")}</p>
                    <p>Channels: {form.salesChannels.map(t => SALES_CHANNELS.find(x => x.id === t)?.label.en).join(", ")}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep(4)}>Edit</Button>
                </div>

                <div className="flex justify-between items-start border-b pb-2">
                  <div>
                    <h4 className="font-bold text-muted-foreground mb-1">Operations & Fulfillment</h4>
                    <p>Inventory: {INVENTORY_MODELS.find(x => x.id === form.inventoryModel)?.label.en}</p>
                    <p>Methods: {form.fulfillmentMethods.map(t => FULFILLMENT_METHODS.find(x => x.id === t)?.label.en).join(", ") || "None"}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep(5)}>Edit</Button>
                </div>

                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-muted-foreground mb-1">Location</h4>
                    <p>{form.district}, {form.region}, {form.country}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep(6)}>Edit</Button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </WizardShell>
    </>
  );
}
