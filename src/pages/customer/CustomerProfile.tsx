import React, { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loadUserProfile } from "@/store/authSlice";
import { updateMeOnApi } from "@/lib/api/domains/auth";
import {
  User, Mail, Phone, Save, Building, CreditCard, Sparkles,
  Shield, CheckCircle, Clock, XCircle, Loader2, ChevronRight,
  MapPin, Receipt, Heart, ShoppingBag, Settings, FileText
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { Link } from "react-router-dom";

const STATUS_CFG = {
  PENDING:  { icon: <Clock       className="h-4 w-4" />, sw: "Inasubiri Uhakiki", en: "Awaiting Review", pill: "bg-amber-50   text-amber-700   border-amber-200   dark:bg-amber-900/20   dark:text-amber-400   dark:border-amber-800/40" },
  APPROVED: { icon: <CheckCircle className="h-4 w-4" />, sw: "Imethibitishwa",    en: "Approved",        pill: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40" },
  REJECTED: { icon: <XCircle     className="h-4 w-4" />, sw: "Imekataliwa",       en: "Rejected",        pill: "bg-rose-50    text-rose-700    border-rose-200    dark:bg-rose-900/20    dark:text-rose-400    dark:border-rose-800/40" },
};

export default function CustomerProfile() {
  const dispatch = useAppDispatch();
  const reduxUser = useAppSelector((s) => s.auth.user);
  const { lang } = useI18n();
  const sw = lang === "sw";

  const [form, setForm]     = useState({ displayName: reduxUser?.displayName || "", email: reduxUser?.email || "", phone: reduxUser?.phone || "" });
  const [biz, setBiz]      = useState({ companyName: "", tin: "", vrn: "", category: "wholesale" as "wholesale" | "corporate" | "reseller" });
  const [saving, setSaving]   = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (reduxUser) {
      setForm((f) => ({
        ...f,
        displayName: reduxUser.displayName || "",
        email: reduxUser.email || "",
        phone: reduxUser.phone || "",
      }));
    }
  }, [reduxUser]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reduxUser) return;
    setSaving(true);
    try {
      await updateMeOnApi({ displayName: form.displayName, phone: form.phone });
      await dispatch(loadUserProfile()).unwrap();
      toast.success(sw ? "Wasifu umesasishwa!" : "Profile updated!");
    } catch { toast.error(sw ? "Imeshindwa kusasisha." : "Failed to update."); }
    finally { setSaving(false); }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reduxUser) return;
    // No backend write yet: the corporate API owns wholesale applications, so
    // keep the toast-only behaviour until this form is wired up to it.
    setApplying(true);
    try {
      toast.info(sw ? "Maombi ya jumla yanahamishwa kwenye mfumo mpya." : "Wholesale applications are being migrated.");
    } finally { setApplying(false); }
  };

  const bizProfile   = reduxUser?.businessProfile;
  const statusCfg    = bizProfile ? STATUS_CFG[bizProfile.status] : null;
  const initials     = form.displayName.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase()).join("") || "C";

  /* ─────────────────────────────────────────────────────────── */

  const SideCard = () => (
    <div className="space-y-4">
      {/* Avatar card */}
      <div className="bg-card rounded-2xl border border-border/50 p-5 text-center">
        {/* Avatar circle */}
        <div className="relative inline-block mb-3">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary via-orange-500 to-amber-400
              flex items-center justify-center text-white font-black text-2xl
              shadow-xl shadow-primary/30 mx-auto">
            {initials}
          </div>
          {/* Online dot */}
          <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-card shadow-sm" />
        </div>
        <p className="text-base font-extrabold text-foreground">{form.displayName || "Customer"}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{form.email}</p>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full mt-2">
          <Shield className="h-2.5 w-2.5" />
          {sw ? "Akaunti ya Mteja" : "Customer Account"}
        </span>

        {/* Wholesale status badge */}
        {bizProfile && statusCfg && (
          <div className={cn("mt-3 flex items-center justify-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-xl border", statusCfg.pill)}>
            {statusCfg.icon}
            {sw ? statusCfg.sw : statusCfg.en}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-4 pt-3 pb-1">
          {sw ? "Viungo vya Haraka" : "Quick Links"}
        </p>
        {[
          { icon: ShoppingBag, label: sw ? "Oda Zangu"   : "My Orders",    path: "/customer/orders"    },
          { icon: FileText,    label: sw ? "Ankara"      : "Invoices",     path: "/customer/invoices"  },
          { icon: Receipt,     label: sw ? "Risiti"      : "Receipts",     path: "/customer/receipts"  },
          { icon: Heart,       label: "Wishlist",                           path: "/customer/wishlist"  },
          { icon: MapPin,      label: sw ? "Anwani"      : "Addresses",    path: "/customer/addresses" },
        ].map(({ icon: Icon, label, path }) => (
          <Link key={path} to={path}
            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-t border-border/30 first:border-t-0 group">
            <Icon className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
            <span className="text-sm font-semibold text-foreground flex-1">{label}</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </Link>
        ))}
      </div>
    </div>
  );

  /* ─────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-5">
      {/* Page title (mobile only — desktop hides it since sidebar shows name) */}
      <div className="lg:hidden flex items-center gap-2">
        <Settings className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-extrabold text-foreground">{sw ? "Wasifu Wangu" : "My Profile"}</h1>
      </div>

      {/* ═══ LAYOUT ═══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 items-start">

        {/* ── LEFT SIDEBAR (desktop) / top card (mobile) ── */}
        <SideCard />

        {/* ── RIGHT CONTENT PANEL ─────────────────────────── */}
        <div className="space-y-5">

          {/* Section header — desktop only */}
          <div className="hidden lg:block">
            <h1 className="text-2xl font-extrabold text-foreground">{sw ? "Mipangilio ya Akaunti" : "Account Settings"}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{sw ? "Simamia taarifa zako za kibinafsi na biashara" : "Manage your personal and business information"}</p>
          </div>

          {/* ── Personal Info ── */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
              {/* Card header stripe */}
              <div className="px-5 py-4 border-b border-border/40 flex items-center gap-3 bg-muted/20">
                <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{sw ? "Taarifa za Kibinafsi" : "Personal Information"}</p>
                  <p className="text-[11px] text-muted-foreground">{sw ? "Sasisha jina na namba yako ya simu" : "Update your name and phone number"}</p>
                </div>
              </div>

              <form onSubmit={handleSave} className="p-5 space-y-4">
                {/* 2-col grid on sm+ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      {sw ? "Majina Kamili" : "Full Name"} <span className="text-primary">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })}
                        placeholder="Jina Kamili" className="pl-10 rounded-xl h-11" required />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      {sw ? "Namba ya Simu" : "Phone Number"}
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                        placeholder="+255 712 345 678" className="pl-10 rounded-xl h-11" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    {sw ? "Barua Pepe" : "Email Address"}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="email" value={form.email} disabled
                      className="pl-10 rounded-xl h-11 bg-muted/30 opacity-60 cursor-not-allowed" />
                  </div>
                  <p className="text-[10px] text-muted-foreground">{sw ? "Barua pepe haiwezi kubadilishwa" : "Email cannot be changed"}</p>
                </div>

                {/* Phone warning */}
                {form.phone === "" && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/40">
                    <span className="text-base shrink-0 mt-0.5">⚠️</span>
                    <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                      {sw
                        ? "Namba ya simu inahitajika ili risiti zako zionekane kwenye akaunti hii."
                        : "A phone number is required so your receipts appear in this account."}
                    </p>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button type="submit" disabled={saving}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-sm shadow-md shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-70">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {saving ? (sw ? "Inahifadhi..." : "Saving...") : (sw ? "Hifadhi Mabadiliko" : "Save Changes")}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>

          {/* ── Wholesale / Business ── */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
            <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
              {/* Card header stripe */}
              <div className="px-5 py-4 border-b border-border/40 flex items-center gap-3 bg-muted/20">
                <div className="h-8 w-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                  <Building className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{sw ? "Lango la Jumla (Wholesale)" : "Wholesale Portal"}</p>
                  <p className="text-[11px] text-muted-foreground">{sw ? "Nunua kwa bei ya jumla, pata mkopo wa biashara" : "Buy at wholesale prices and access business credit"}</p>
                </div>
              </div>

              <div className="p-5">
                {bizProfile ? (
                  <div className="space-y-4">
                    {/* Status banner */}
                    <div className={cn("flex items-center gap-3 p-4 rounded-2xl border", statusCfg?.pill)}>
                      <span className="shrink-0">{statusCfg?.icon}</span>
                      <div>
                        <p className="text-sm font-bold">{sw ? statusCfg?.sw : statusCfg?.en}</p>
                        {bizProfile.status === "PENDING" && (
                          <p className="text-xs opacity-75 mt-0.5">{sw ? "Tutawasiliana nawe hivi karibuni" : "We'll contact you soon"}</p>
                        )}
                      </div>
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { label: sw ? "Kampuni (Company)" : "Company", value: bizProfile.companyName || "—" },
                        { label: "TIN", value: bizProfile.tin || "—", mono: true },
                        { label: "VRN", value: bizProfile.vrn || "—", mono: true },
                      ].map(({ label, value, mono }) => (
                        <div key={label} className="bg-muted/30 rounded-xl p-3">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                          <p className={cn("text-sm font-bold text-foreground", mono && "font-mono")}>{value}</p>
                        </div>
                      ))}
                      <div className="bg-muted/30 rounded-xl p-3 sm:col-span-3">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{sw ? "Aina ya Akaunti (Category)" : "Account Category"}</p>
                        <p className="text-sm font-bold text-foreground capitalize">{bizProfile.category || "Wholesale"}</p>
                      </div>
                    </div>

                    {/* Credit block — approved only */}
                    {bizProfile.status === "APPROVED" && (
                      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/15 border border-emerald-200/60 dark:border-emerald-800/40 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                            {sw ? "Mkopo wa Biashara" : "Business Credit Line"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">{sw ? "Ukomo" : "Limit"}</p>
                            <p className="text-2xl font-black text-foreground">
                              {(bizProfile.creditLimit ?? 0).toLocaleString()}
                              <span className="text-xs font-normal text-muted-foreground ml-1">TZS</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">{sw ? "Salio" : "Available"}</p>
                            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                              {(bizProfile.creditBalance ?? 0).toLocaleString()}
                              <span className="text-xs font-normal text-muted-foreground ml-1">TZS</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleApply} className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/40 text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
                      {sw
                        ? "Wasilisha maombi ya akaunti ya jumla. Tutakuhakiki na kuthibitisha ndani ya saa 24."
                        : "Apply for a wholesale account. We'll verify and confirm within 24 hours."}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                          {sw ? "Jina la Kampuni/Biashara" : "Company/Business Name"} <span className="text-muted-foreground/50">({sw ? "Hiari" : "Optional"})</span>
                        </label>
                        <Input value={biz.companyName} onChange={e => setBiz({ ...biz, companyName: e.target.value })}
                          placeholder="Mf. Twende Commerce Ltd" className="rounded-xl h-11" />
                      </div>
                      
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                          {sw ? "Aina ya Akaunti ya Biashara" : "Business Account Type"} <span className="text-primary">*</span>
                        </label>
                        <select 
                          className="flex h-11 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={biz.category}
                          onChange={e => setBiz({ ...biz, category: e.target.value as any })}
                          required
                        >
                          <option value="wholesale">{sw ? "Mnunuzi wa Jumla (Wholesale)" : "Wholesale Buyer"}</option>
                          <option value="reseller">{sw ? "Muuzaji Rejareja (Reseller)" : "Reseller"}</option>
                          <option value="corporate">{sw ? "Mteja wa Kampuni (Corporate)" : "Corporate Client"}</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                          TIN <span className="text-muted-foreground/50">({sw ? "Hiari" : "Optional"})</span>
                        </label>
                        <Input value={biz.tin} onChange={e => setBiz({ ...biz, tin: e.target.value })}
                          placeholder="123-456-789" className="rounded-xl h-11 font-mono" />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                          VRN <span className="text-muted-foreground/50">({sw ? "Hiari" : "Optional"})</span>
                        </label>
                        <Input value={biz.vrn} onChange={e => setBiz({ ...biz, vrn: e.target.value })}
                          placeholder="40012345" className="rounded-xl h-11 font-mono" />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button type="submit" disabled={applying}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-bold text-sm shadow-md shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-70"
                        style={{ background: "linear-gradient(135deg, #f97316, #c2410c)" }}>
                        {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        {applying ? (sw ? "Inawasilisha..." : "Submitting...") : (sw ? "Wasilisha Ombi" : "Submit Application")}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </motion.div>

        </div>{/* end right panel */}
      </div>{/* end grid */}
    </div>
  );
}
