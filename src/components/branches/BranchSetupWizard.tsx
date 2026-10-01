import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowRight, ArrowLeft, Check, Store, Warehouse, Briefcase, Truck } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { Branch } from "@/types";

interface BranchSetupWizardProps {
  initialData?: Partial<Branch>;
  onSubmit: (data: Partial<Branch>) => Promise<void>;
  onCancel: () => void;
}

export default function BranchSetupWizard({ initialData, onSubmit, onCancel }: BranchSetupWizardProps) {
  const { t } = useI18n();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<Branch>>({
    name: initialData?.name || "",
    location: initialData?.location || "",
    phone: initialData?.phone || "",
    type: initialData?.type || "Storefront",
    timezone: initialData?.timezone || "Africa/Dar_es_Salaam",
    operatingHours: initialData?.operatingHours || "08:00 - 22:00",
    features: {
      acceptsPOS: initialData?.features?.acceptsPOS ?? true,
      handlesDelivery: initialData?.features?.handlesDelivery ?? false,
      isFulfillmentCenter: initialData?.features?.isFulfillmentCenter ?? false,
    }
  });

  const updateForm = (updates: Partial<Branch>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const updateFeature = (feature: keyof NonNullable<Branch["features"]>, value: boolean) => {
    setFormData((prev) => ({
      ...prev,
      features: { ...(prev.features || {}), [feature]: value },
    }));
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, 5));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleFinish = async () => {
    setSubmitting(true);
    await onSubmit(formData);
    setSubmitting(false);
  };

  const stepTitles = [
    "Basic Info",
    "Branch Type",
    "Operating Details",
    "Capabilities",
    "Review & Confirm",
  ];

  return (
    <DialogContent className="max-w-xl rounded-xl">
      <DialogHeader>
        <DialogTitle className="text-xl font-black uppercase tracking-tight">
          {initialData?.id ? "Edit Branch" : "Setup New Branch"}
        </DialogTitle>
        <DialogDescription>
          Step {step} of 5: {stepTitles[step - 1]}
        </DialogDescription>
      </DialogHeader>
      
      {/* Progress Bar */}
      <div className="w-full bg-muted h-2 rounded-full mb-6 overflow-hidden">
        <div className="bg-primary h-full transition-all duration-300" style={{ width: `${(step / 5) * 100}%` }} />
      </div>

      <div className="py-4 min-h-[300px]">
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <div>
              <label className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1.5 block">Branch Name *</label>
              <Input 
                value={formData.name} 
                onChange={(e) => updateForm({ name: e.target.value })} 
                placeholder="e.g. Downtown Store" 
                className="glass-card" 
              />
            </div>
            <div>
              <label className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1.5 block">Location / Address</label>
              <Input 
                value={formData.location} 
                onChange={(e) => updateForm({ location: e.target.value })} 
                placeholder="123 Main St, City" 
                className="glass-card" 
              />
            </div>
            <div>
              <label className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1.5 block">Phone Number</label>
              <Input 
                value={formData.phone} 
                onChange={(e) => updateForm({ phone: e.target.value })} 
                placeholder="+255..." 
                className="glass-card" 
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { type: "Storefront", icon: Store, desc: "Retail walk-in customers" },
                { type: "Warehouse", icon: Warehouse, desc: "Bulk storage only" },
                { type: "Office", icon: Briefcase, desc: "Administrative functions" },
                { type: "Ghost Kitchen", icon: Truck, desc: "Delivery/Pickup only" },
              ].map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => updateForm({ type: opt.type as any })}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${formData.type === opt.type ? "border-primary bg-primary/10 text-primary" : "border-transparent bg-muted/50 hover:bg-muted text-muted-foreground"}`}
                >
                  <opt.icon className={`h-8 w-8 mb-2`} />
                  <span className="font-bold text-sm text-foreground">{opt.type}</span>
                  <span className="text-[10px] mt-1">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <div>
              <label className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1.5 block">Timezone</label>
              <Select value={formData.timezone} onValueChange={(v) => updateForm({ timezone: v })}>
                <SelectTrigger className="glass-card"><SelectValue placeholder="Select Timezone" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC (Universal Time)</SelectItem>
                  <SelectItem value="Africa/Dar_es_Salaam">EAT (East Africa Time)</SelectItem>
                  <SelectItem value="Africa/Nairobi">EAT (Nairobi)</SelectItem>
                  <SelectItem value="Africa/Johannesburg">SAST (South Africa)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1.5 block">Operating Hours</label>
              <Input 
                value={formData.operatingHours} 
                onChange={(e) => updateForm({ operatingHours: e.target.value })} 
                placeholder="e.g. 08:00 - 22:00" 
                className="glass-card" 
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center justify-between p-4 glass-card rounded-xl">
              <div className="space-y-1">
                <p className="text-sm font-bold">Accepts POS Sales</p>
                <p className="text-[10px] text-muted-foreground">Can cashiers ring up sales at this location?</p>
              </div>
              <Switch checked={formData.features?.acceptsPOS} onCheckedChange={(v) => updateFeature("acceptsPOS", v)} />
            </div>
            <div className="flex items-center justify-between p-4 glass-card rounded-xl">
              <div className="space-y-1">
                <p className="text-sm font-bold">Handles Delivery</p>
                <p className="text-[10px] text-muted-foreground">Does this branch offer delivery services?</p>
              </div>
              <Switch checked={formData.features?.handlesDelivery} onCheckedChange={(v) => updateFeature("handlesDelivery", v)} />
            </div>
            <div className="flex items-center justify-between p-4 glass-card rounded-xl">
              <div className="space-y-1">
                <p className="text-sm font-bold">Fulfillment Center</p>
                <p className="text-[10px] text-muted-foreground">Is this a primary warehouse for online orders?</p>
              </div>
              <Switch checked={formData.features?.isFulfillmentCenter} onCheckedChange={(v) => updateFeature("isFulfillmentCenter", v)} />
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="glass-card p-6 rounded-xl space-y-4">
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Branch Name</p>
                <p className="font-bold text-lg">{formData.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Type</p>
                  <p className="font-medium text-sm">{formData.type}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Location</p>
                  <p className="font-medium text-sm">{formData.location || "N/A"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Operating Hours</p>
                  <p className="font-medium text-sm">{formData.operatingHours}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Timezone</p>
                  <p className="font-medium text-sm">{formData.timezone}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Enabled Features</p>
                <div className="flex flex-wrap gap-2">
                  {formData.features?.acceptsPOS && <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">POS Ready</span>}
                  {formData.features?.handlesDelivery && <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">Delivery</span>}
                  {formData.features?.isFulfillmentCenter && <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">Fulfillment</span>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-4">
        <Button variant="ghost" onClick={step === 1 ? onCancel : prevStep} disabled={submitting}>
          {step === 1 ? "Cancel" : <><ArrowLeft className="w-4 h-4 mr-2" /> Back</>}
        </Button>
        {step < 5 ? (
          <Button onClick={nextStep} disabled={!formData.name && step === 1}>
            Next <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleFinish} disabled={submitting || !formData.name}>
            {submitting ? "Saving..." : <><Check className="w-4 h-4 mr-2" /> Confirm & Save</>}
          </Button>
        )}
      </div>
    </DialogContent>
  );
}
