import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Building2, Briefcase, Store, Truck, ShoppingCart, 
  ChevronRight, ChevronLeft, CheckCircle2, User, CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type { Customer, CommercialSettings } from "@/types";

interface CustomerWizardProps {
  initialData?: Customer | null;
  onSubmit: (data: Omit<Customer, "id" | "shopId" | "createdAt" | "userId" | "linkedAt" | "totalPurchases" | "totalSpent" | "lastPurchaseDate">) => Promise<void>;
  onCancel: () => void;
  lang?: "en" | "sw";
}

const defaultCommercialSettings: CommercialSettings = {
  priceTier: "retail",
  creditEnabled: false,
  creditLimit: 0,
  paymentTerms: "Cash",
  minimumOrderQuantity: 0
};

const defaultForm: Omit<Customer, "id" | "shopId" | "createdAt" | "userId" | "linkedAt" | "totalPurchases" | "totalSpent" | "lastPurchaseDate"> & { customerType: NonNullable<Customer["customerType"]> } = {
  name: "",
  customerType: "retail",
  businessName: "",
  contactPerson: "",
  registrationNumber: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
  commercialSettings: { ...defaultCommercialSettings }
};

export function CustomerWizard({ initialData, onSubmit, onCancel, lang = "en" }: CustomerWizardProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm({
        ...defaultForm,
        ...initialData,
        commercialSettings: initialData.commercialSettings || { ...defaultCommercialSettings, priceTier: initialData.customerType === "retail" ? "retail" : "wholesale" }
      });
    }
  }, [initialData]);

  const totalSteps = 4;

  const handleNext = () => {
    if (step === 2 && !form.name.trim()) return;
    setStep(s => Math.min(s + 1, totalSteps));
  };

  const handlePrev = () => setStep(s => Math.max(s - 1, 1));

  const handleFinish = async () => {
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(form);
    } finally {
      setSubmitting(false);
    }
  };

  const customerTypes = [
    { id: "retail", icon: ShoppingCart, title: "Retail", desc: "Individual consumer" },
    { id: "wholesale", icon: Store, title: "Wholesale", desc: "Bulk buyer" },
    { id: "corporate", icon: Building2, title: "Corporate", desc: "B2B client" },
    { id: "reseller", icon: Briefcase, title: "Reseller", desc: "Resells your products" },
    { id: "distributor", icon: Truck, title: "Distributor", desc: "Large scale distribution" },
  ] as const;

  return (
    <div className="flex flex-col h-full max-h-[85vh]">
      {/* Header & Progress */}
      <div className="px-6 pb-4 border-b border-border/40 shrink-0">
        <div className="flex gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i + 1 <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>
        <div className="mt-4 text-center">
          <h2 className="text-xl font-bold tracking-tight">
            {step === 1 && "Select Customer Type"}
            {step === 2 && "Customer Details"}
            {step === 3 && "Commercial Settings"}
            {step === 4 && "Review & Complete"}
          </h2>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {/* Step 1: Type */}
            {step === 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {customerTypes.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setForm(f => ({
                        ...f, 
                        customerType: t.id, 
                        commercialSettings: { 
                          ...f.commercialSettings, 
                          priceTier: t.id === "corporate" ? "contract" : t.id === "reseller" ? "wholesale" : t.id as CommercialSettings["priceTier"]
                        }
                      }));
                      setStep(2);
                    }}
                    className={`flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${form.customerType === t.id ? "border-primary bg-primary/5 shadow-md" : "border-border/50 hover:border-primary/30 hover:bg-accent/50"}`}
                  >
                    <div className={`p-2 rounded-lg ${form.customerType === t.id ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                      <t.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold">{t.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Step 2: Info */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">
                    {form.customerType === "retail" ? "Customer Name" : "Primary Contact Name"} <span className="text-destructive">*</span>
                  </label>
                  <Input 
                    value={form.name} 
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
                    className="h-12 rounded-xl" placeholder="Full Name" 
                    autoFocus
                  />
                </div>

                {form.customerType !== "retail" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Business/Company Name</label>
                      <Input value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))} className="h-12 rounded-xl" placeholder="Company Ltd" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Registration No.</label>
                      <Input value={form.registrationNumber} onChange={e => setForm(f => ({ ...f, registrationNumber: e.target.value }))} className="h-12 rounded-xl" placeholder="TIN / Reg No" />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Phone</label>
                    <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="h-12 rounded-xl" placeholder="+255..." />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Email</label>
                    <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="h-12 rounded-xl" placeholder="email@example.com" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Address / Location</label>
                  <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="h-12 rounded-xl" placeholder="City, Area" />
                </div>
              </div>
            )}

            {/* Step 3: Commercial Settings */}
            {step === 3 && (
              <div className="space-y-6">
                {form.customerType === "retail" ? (
                  <div className="text-center py-10">
                    <div className="h-16 w-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                      <ShoppingCart className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-bold">Standard Retail Settings</h3>
                    <p className="text-sm text-muted-foreground mt-2">Retail customers use standard pricing and typically pay in cash.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4 bg-muted/20 p-4 rounded-xl border border-border/50">
                      <h4 className="font-bold flex items-center gap-2"><CreditCard className="h-4 w-4" /> Credit Terms</h4>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Enable Credit</p>
                          <p className="text-xs text-muted-foreground">Allow this customer to purchase on credit</p>
                        </div>
                        <Switch 
                          checked={form.commercialSettings.creditEnabled} 
                          onCheckedChange={c => setForm(f => ({ ...f, commercialSettings: { ...f.commercialSettings, creditEnabled: c } }))} 
                        />
                      </div>

                      {form.commercialSettings.creditEnabled && (
                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Credit Limit</label>
                            <Input 
                              type="number"
                              value={form.commercialSettings.creditLimit || ""} 
                              onChange={e => setForm(f => ({ ...f, commercialSettings: { ...f.commercialSettings, creditLimit: Number(e.target.value) } }))} 
                              className="h-10 rounded-lg" 
                              placeholder="0.00" 
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Payment Terms</label>
                            <select 
                              value={form.commercialSettings.paymentTerms}
                              onChange={e => setForm(f => ({ ...f, commercialSettings: { ...f.commercialSettings, paymentTerms: e.target.value as any } }))}
                              className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <option value="Cash">Cash / Due on Receipt</option>
                              <option value="7 Days">Net 7 Days</option>
                              <option value="30 Days">Net 30 Days</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4 bg-muted/20 p-4 rounded-xl border border-border/50">
                      <h4 className="font-bold flex items-center gap-2"><Store className="h-4 w-4" /> Purchasing Rules</h4>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Minimum Order Quantity (Optional)</label>
                        <Input 
                          type="number"
                          value={form.commercialSettings.minimumOrderQuantity || ""} 
                          onChange={e => setForm(f => ({ ...f, commercialSettings: { ...f.commercialSettings, minimumOrderQuantity: Number(e.target.value) } }))} 
                          className="h-10 rounded-lg" 
                          placeholder="e.g. 50" 
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 text-center">
                  <div className="h-12 w-12 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold">{form.name}</h3>
                  <p className="text-primary font-medium uppercase tracking-wider text-xs mt-1">{form.customerType}</p>
                  {form.businessName && <p className="text-sm text-muted-foreground mt-1">{form.businessName}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs block mb-1">Phone</span>
                    <span className="font-medium">{form.phone || "-"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs block mb-1">Email</span>
                    <span className="font-medium truncate">{form.email || "-"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs block mb-1">Credit Limit</span>
                    <span className="font-medium">{form.commercialSettings.creditEnabled ? form.commercialSettings.creditLimit.toLocaleString() : "None"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs block mb-1">Payment Terms</span>
                    <span className="font-medium">{form.commercialSettings.paymentTerms}</span>
                  </div>
                </div>
                
                <div className="space-y-1.5 pt-4 border-t border-border/40">
                  <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Internal Notes</label>
                  <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="rounded-xl bg-card border-border/50 resize-none" placeholder="Add any relevant notes here..." />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Controls */}
      <div className="p-4 border-t border-border/40 shrink-0 bg-card flex justify-between items-center rounded-b-lg">
        {step > 1 ? (
          <Button variant="ghost" onClick={handlePrev} className="rounded-xl">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        ) : (
          <Button variant="ghost" onClick={onCancel} className="rounded-xl text-muted-foreground">
            Cancel
          </Button>
        )}
        
        {step < totalSteps ? (
          <Button onClick={handleNext} disabled={step === 2 && !form.name.trim()} className="rounded-xl px-6 shadow-lg shadow-primary/20">
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleFinish} disabled={submitting || !form.name.trim()} className="rounded-xl px-8 font-black tracking-wide shadow-lg shadow-primary/20">
            {submitting ? "Saving..." : "Save Customer"}
          </Button>
        )}
      </div>
    </div>
  );
}
