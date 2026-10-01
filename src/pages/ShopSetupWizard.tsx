import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ChevronRight, Store, Phone, Clock, FileText, Tag, Package, Users, CreditCard, ShoppingBag, Share2, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { editShop } from "@/store/shopsSlice";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import SEO from "@/components/SEO";
import {
  BrandingStep, ContactStep, HoursStep, BusinessInfoStep, PricingStep,
  InventoryStep, CustomersStep, PaymentStep, OnlineStoreStep,
  SocialCommerceStep, StaffStep
} from "@/components/shop-setup/SetupSteps";

const STEPS = [
  { id: "branding", title: "Branding", icon: Store },
  { id: "contact", title: "Contact Info", icon: Phone },
  { id: "hours", title: "Business Hours", icon: Clock },
  { id: "info", title: "Business Info", icon: FileText },
  { id: "pricing", title: "Pricing Config", icon: Tag },
  { id: "inventory", title: "Inventory", icon: Package },
  { id: "customers", title: "Customers", icon: Users },
  { id: "payments", title: "Payment Methods", icon: CreditCard },
  { id: "online", title: "Online Store", icon: ShoppingBag },
  { id: "social", title: "Social Commerce", icon: Share2 },
  { id: "staff", title: "Staff", icon: ShieldCheck },
];

export default function ShopSetupWizard() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentShopId, shops } = useAppSelector((s) => s.shops);
  const shop = shops.find((s) => s.id === currentShopId);
  const { t, lang } = useI18n();

  const [activeStep, setActiveStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<any>({
    slogan: shop?.slogan || "",
    description: shop?.description || "",
    phone: shop?.phone || "",
    whatsappNumber: shop?.whatsappNumber || "",
    website: shop?.website || "",
    operatingHours: shop?.operatingHours || "",
    timezone: shop?.timezone || "Africa/Dar_es_Salaam",
    businessType: shop?.businessType || "",
    country: shop?.country || "",
    region: shop?.region || "",
    currency: shop?.currency || "TZS",
    keepsStock: shop?.keepsStock !== false,
    isPublic: shop?.isPublic !== false,
    productCondition: shop?.productCondition || "new",
    instagramUrl: shop?.instagramUrl || "",
    facebookUrl: shop?.facebookUrl || "",
    tiktokUrl: shop?.tiktokUrl || "",
  });

  useEffect(() => {
    if (!currentShopId) navigate("/dashboard");
  }, [currentShopId, navigate]);

  if (!shop) return null;

  const handleNext = async () => {
    setSaving(true);
    try {
      // Save progress incrementally
      await dispatch(editShop({ id: shop.id, data: { ...formData, setupProgress: activeStep + 1 } })).unwrap();
      
      if (activeStep < STEPS.length - 1) {
        setActiveStep((prev) => prev + 1);
      } else {
        handleComplete();
      }
    } catch (err) {
      toast.error(lang === 'sw' ? "Imeshindwa kuhifadhi" : "Failed to save");
    }
    setSaving(false);
  };

  const handleSkip = () => {
    if (activeStep < STEPS.length - 1) {
      setActiveStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      await dispatch(editShop({ id: shop.id, data: { setupStatus: "completed" } })).unwrap();
      toast.success(lang === 'sw' ? "Usanidi Umekamilika!" : "Setup Completed!");
      navigate("/dashboard");
    } catch (err) {
      toast.error("Failed to complete setup");
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col md:flex-row">
      <SEO title="Shop Setup Wizard" description="Configure your shop settings" noindex={true} />

      {/* Sidebar Progress */}
      <div className="w-full md:w-80 bg-white dark:bg-zinc-900 border-r border-border/50 p-6 flex flex-col h-auto md:h-screen sticky top-0 overflow-y-auto">
        <div className="mb-8">
          <h2 className="text-xl font-bold">{lang === 'sw' ? "Usanidi wa Duka" : "Shop Setup"}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {shop.name}
          </p>
        </div>

        <div className="space-y-1">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isActive = idx === activeStep;
            const isPast = idx < activeStep;
            
            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(idx)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                  isActive 
                    ? "bg-primary/10 text-primary font-semibold" 
                    : isPast 
                      ? "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800" 
                      : "text-zinc-400 dark:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                <div className={`p-2 rounded-lg ${isActive ? "bg-primary/20" : isPast ? "bg-zinc-200 dark:bg-zinc-800" : "bg-transparent"}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="flex-1 text-sm">{step.title}</span>
                {isPast && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        <div className="flex-1 p-8 md:p-12 max-w-4xl mx-auto w-full">
          <div className="mb-8">
            <h1 className="text-3xl font-black">{STEPS[activeStep].title}</h1>
            <p className="text-muted-foreground mt-2">
              {lang === 'sw' ? "Sanidi maelezo ya duka lako." : "Configure your shop settings."}
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-border/50 rounded-2xl p-6 shadow-sm min-h-[400px] flex items-center justify-center">
            <div className="w-full max-w-2xl mx-auto">
              {(() => {
                switch (STEPS[activeStep].id) {
                  case "branding": return <BrandingStep formData={formData} setFormData={setFormData} />;
                  case "contact": return <ContactStep formData={formData} setFormData={setFormData} />;
                  case "hours": return <HoursStep formData={formData} setFormData={setFormData} />;
                  case "info": return <BusinessInfoStep formData={formData} setFormData={setFormData} />;
                  case "pricing": return <PricingStep />;
                  case "inventory": return <InventoryStep formData={formData} setFormData={setFormData} />;
                  case "customers": return <CustomersStep />;
                  case "payments": return <PaymentStep />;
                  case "online": return <OnlineStoreStep formData={formData} setFormData={setFormData} />;
                  case "social": return <SocialCommerceStep formData={formData} setFormData={setFormData} />;
                  case "staff": return <StaffStep />;
                  default: return null;
                }
              })()}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border/50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur p-4 px-8 sticky bottom-0">
          <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
            <Button variant="ghost" onClick={handleSkip}>
              {lang === 'sw' ? "Ruka Hatua Hii" : "Skip Step"}
            </Button>

            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => navigate("/dashboard")}>
                {lang === 'sw' ? "Nenda kwenye POS" : "Go to Dashboard"}
              </Button>
              <Button onClick={handleNext} disabled={saving}>
                {activeStep === STEPS.length - 1 ? (
                  saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (lang === 'sw' ? "Kamilisha" : "Finish")
                ) : (
                  <>
                    {lang === 'sw' ? "Hifadhi & Endelea" : "Save & Continue"}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
