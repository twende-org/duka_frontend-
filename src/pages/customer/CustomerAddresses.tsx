import React, { useState, useEffect } from "react";
import { MapPin, Plus, Trash2, Home, Briefcase, Star, Loader2, X, Check, Phone, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAppSelector } from "@/store/hooks";
import { getAddresses, addAddress, deleteAddress } from "@/lib/api/domains/addresses";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

interface Address { id: string; tag: "Nyumbani"|"Ofisini"|"Kazi"; name: string; phone: string; street: string; city: string; isDefault: boolean; }

const TAG_CFG = {
  Nyumbani: { icon: Home,      bg: "bg-primary/10",    txt: "text-primary",    border: "border-primary/25" },
  Ofisini:  { icon: Briefcase, bg: "bg-amber-100 dark:bg-amber-900/30",  txt: "text-amber-600 dark:text-amber-400",  border: "border-amber-200/60 dark:border-amber-800/40" },
  Kazi:     { icon: Star,      bg: "bg-emerald-100 dark:bg-emerald-900/30", txt: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-200/60 dark:border-emerald-800/40" },
};

function Skeleton() {
  return (
    <div className="bg-card rounded-2xl border border-border/40 p-4 space-y-3 animate-pulse">
      <div className="flex justify-between items-start"><div className="flex gap-3"><div className="h-10 w-10 bg-muted rounded-xl" /><div className="space-y-1.5"><div className="h-3.5 w-20 bg-muted rounded-lg" /><div className="h-3 w-14 bg-muted/60 rounded-lg" /></div></div><div className="h-8 w-8 bg-muted rounded-xl" /></div>
      <div className="pt-3 border-t border-border space-y-1.5"><div className="h-3 w-full bg-muted/50 rounded-lg" /><div className="h-3 w-3/4 bg-muted/40 rounded-lg" /></div>
    </div>
  );
}

export default function CustomerAddresses() {
  const { lang } = useI18n();
  const sw = lang === "sw";
  const user = useAppSelector((s) => s.auth.user);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({ tag: "Nyumbani" as Address["tag"], name: "", phone: "", street: "", city: "Dar es Salaam" });

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await getAddresses(user.id);
        if (!cancelled) setAddresses(rows as Address[]);
      } catch { toast.error(sw ? "Imeshindwa kupakia anwani." : "Failed to load addresses."); }
      finally { if (!cancelled) setLoading(false); }
    };
    void load();
    return () => { cancelled = true; };
  }, [user?.id]);

  const handleDelete = async (id: string, tag: string) => {
    if (!user?.id) return;
    setDeletingId(id);
    try { await deleteAddress(user.id, id); setAddresses(p => p.filter(a => a.id !== id)); toast.success(sw ? `Anwani ya "${tag}" imeondolewa.` : `"${tag}" address removed.`); }
    catch { toast.error(sw ? "Imeshindwa kuondoa anwani." : "Failed to remove address."); }
    finally { setDeletingId(null); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    if (!form.name.trim() || !form.phone.trim() || !form.street.trim()) {
      toast.error(sw ? "Jaza maeneo yote yanayohitajika." : "Fill in all required fields."); return;
    }
    setAdding(true);
    try {
      const data = { ...form, isDefault: addresses.length === 0 };
      const newId = await addAddress(user.id, data);
      setAddresses(p => [...p, { id: newId, ...data }]);
      setShowForm(false);
      setForm({ tag: "Nyumbani", name: "", phone: "", street: "", city: "Dar es Salaam" });
      toast.success(sw ? "Anwani mpya imeongezwa!" : "New address added!");
    } catch { toast.error(sw ? "Imeshindwa kuongeza anwani." : "Failed to add address."); }
    finally { setAdding(false); }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-foreground">{sw ? "Anwani Zangu" : "My Addresses"}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{loading ? "..." : `${addresses.length} ${sw ? "anwani" : "addresses"}`}</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-md shadow-primary/25 active:scale-95 transition-all">
            <Plus className="h-3.5 w-3.5" />{sw ? "Ongeza" : "Add"}
          </button>
        )}
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }}
            className="bg-card rounded-2xl border border-primary/20 shadow-lg p-4 sm:p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5"><MapPin className="h-4 w-4 text-primary" />{sw ? "Anwani Mpya" : "New Address"}</h3>
              <button onClick={() => setShowForm(false)} className="h-7 w-7 rounded-xl hover:bg-muted flex items-center justify-center"><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {/* Tag selector */}
              <div className="grid grid-cols-3 gap-2">
                {(["Nyumbani", "Ofisini", "Kazi"] as const).map((tag) => {
                  const cfg = TAG_CFG[tag]; const Icon = cfg.icon;
                  return (
                    <button key={tag} type="button" onClick={() => setForm({ ...form, tag })}
                      className={cn("flex flex-col items-center gap-1.5 py-3 rounded-2xl border font-bold text-xs transition-all",
                        form.tag === tag ? `${cfg.bg} ${cfg.border} ${cfg.txt}` : "border-border text-muted-foreground hover:bg-muted")}>
                      <Icon className="h-4 w-4" />{tag}
                    </button>
                  );
                })}
              </div>

              {/* Fields */}
              <div className="space-y-3">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={sw ? "Jina la Mpokeaji" : "Recipient Name"} className="pl-10 rounded-xl h-11" required />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+255 712 345 678" className="pl-10 rounded-xl h-11" required />
                </div>
                <Input value={form.street} onChange={e => setForm({ ...form, street: e.target.value })} placeholder={sw ? "Mtaa / Barabara / Nyumba" : "Street / Road / House"} className="rounded-xl h-11" required />
                <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="rounded-xl h-11" required />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="h-11 rounded-xl border border-border text-sm font-bold text-muted-foreground hover:bg-muted transition-all">
                  {sw ? "Ghairi" : "Cancel"}
                </button>
                <button type="submit" disabled={adding}
                  className="h-11 rounded-xl bg-primary text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-primary/20 hover:bg-primary/90 active:scale-98 transition-all disabled:opacity-70">
                  {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {adding ? (sw ? "Inahifadhi..." : "Saving...") : (sw ? "Hifadhi" : "Save")}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Address grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} />)
          : addresses.length > 0
            ? addresses.map((addr, i) => {
                const cfg = TAG_CFG[addr.tag] ?? TAG_CFG.Nyumbani; const Icon = cfg.icon;
                return (
                  <motion.div key={addr.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className={cn("bg-card rounded-2xl border p-4 transition-all hover:shadow-md", addr.isDefault ? "border-primary/25" : "border-border/50 hover:border-primary/15")}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", cfg.bg)}>
                          <Icon className={cn("h-5 w-5", cfg.txt)} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{addr.tag}</p>
                          {addr.isDefault && <span className="text-[9px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">{sw ? "Chaguo-msingi" : "Default"}</span>}
                        </div>
                      </div>
                      <button onClick={() => handleDelete(addr.id, addr.tag)} disabled={deletingId === addr.id}
                        className="h-8 w-8 rounded-xl hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20 text-muted-foreground flex items-center justify-center transition-colors active:scale-90 shrink-0">
                        {deletingId === addr.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="space-y-1.5 text-xs border-t border-border/40 pt-3">
                      <div className="flex gap-2"><User className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" /><span className="font-semibold text-foreground">{addr.name}</span></div>
                      <div className="flex gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" /><span className="text-foreground">{addr.phone}</span></div>
                      <div className="flex gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" /><span className="text-foreground leading-snug">{addr.street}, {addr.city}</span></div>
                    </div>
                  </motion.div>
                );
              })
            : (
              <div className="col-span-full flex flex-col items-center justify-center py-14 text-center gap-3">
                <div className="h-14 w-14 rounded-3xl bg-muted flex items-center justify-center"><MapPin className="h-6 w-6 text-muted-foreground" /></div>
                <div><p className="font-bold text-sm text-foreground">{sw ? "Hakuna Anwani Zilizohifadhiwa" : "No Saved Addresses"}</p>
                  <p className="text-xs text-muted-foreground mt-1">{sw ? "Ongeza anwani yako ya kwanza." : "Add your first delivery address."}</p></div>
                <button onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-primary text-white text-xs font-bold shadow-md shadow-primary/25 active:scale-95 transition-all">
                  <Plus className="h-4 w-4" />{sw ? "Ongeza Anwani" : "Add Address"}
                </button>
              </div>
            )
        }
      </div>
    </div>
  );
}
