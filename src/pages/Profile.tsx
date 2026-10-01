import { useState } from "react";
import { User, Mail, Phone, Save, Loader2 } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { updateMeOnApi } from "@/lib/api/domains/auth";
import { loadUserProfile } from "@/store/authSlice";
import { toSafeDate } from "@/lib/utils";


export default function Profile() {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  
  const [form, setForm] = useState({
    displayName: user?.displayName || "",
    phone: user?.phone || "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!user) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setProgress(10);
    const interval = setInterval(() => {
      setProgress((prev) => (prev >= 90 ? prev : prev + 10));
    }, 150);
    
    try {
      await updateMeOnApi({ displayName: form.displayName, phone: form.phone });

      await dispatch(loadUserProfile()).unwrap();
      clearInterval(interval);
      setProgress(100);
      setTimeout(() => {
        toast.success(t("profile.updateSuccess"));
        setSubmitting(false);
        setProgress(0);
      }, 300);
    } catch (err: any) {
      clearInterval(interval);
      setProgress(0);
      console.error(err);
      toast.error(err.message || t("profile.updateError"));
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto fade-in-up">
      <div className="page-header text-center mb-10">
        <h1 className="page-title text-3xl">{t("profile.title")}</h1>
        <p className="page-description">{t("profile.subtitle")}</p>
      </div>

      <div className="glass-card p-10 rounded-[3rem] border-primary/10 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-primary/10 transition-colors" />
        
        <div className="flex flex-col items-center gap-6 mb-10 relative">
          <div className="h-24 w-24 rounded-[2.5rem] bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center p-1.5 shadow-xl shadow-primary/20 hover:scale-105 transition-transform duration-500">
             <div className="h-full w-full rounded-[2rem] bg-white flex items-center justify-center">
                <User className="h-10 w-10 text-primary" />
             </div>
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">{user.displayName}</h2>
            <div className="flex items-center justify-center gap-2 mt-2">
               <span className="text-[10px] font-black bg-primary/10 text-primary px-3 py-1 rounded-full uppercase tracking-widest">Verified Account</span>
               <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                 <Mail className="h-3.5 w-3.5 opacity-50" /> {user.email}
               </p>
            </div>
          </div>
        </div>

        {submitting && <Progress value={progress} className="h-1 mb-6" />}

        <form onSubmit={handleSubmit} className="space-y-8 relative">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 block">
                {t("users.name")}
              </label>
              <Input
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                required
                className="glass-card rounded-2xl border-primary/5 focus:border-primary/20 h-12"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 block">
                {t("shops.phone")}
              </label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+255..."
                className="glass-card rounded-2xl border-primary/5 focus:border-primary/20 h-12"
              />
            </div>
          </div>

          <div className="pt-8 border-t border-primary/5 flex justify-end">
            <Button type="submit" disabled={submitting} className="min-w-[180px] h-12 rounded-2xl shadow-xl shadow-primary/20 font-black uppercase text-[10px] tracking-widest transition-all hover:scale-105 active:scale-95">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("common.loading")}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Update Profile
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3 fade-in-up" style={{ animationDelay: "200ms" }}>
        <div className="glass-card p-6 text-center rounded-[2rem] border-primary/5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mb-2 opacity-50">Identity Status</p>
          <div className="flex items-center justify-center gap-1.5 text-success">
             <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
             <p className="text-xs font-black uppercase tracking-widest">Active Member</p>
          </div>
        </div>
        <div className="glass-card p-6 text-center rounded-[2rem] border-primary/5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mb-2 opacity-50">Member Since</p>
          <p className="text-xs font-black text-foreground">
            {user.createdAt ? (toSafeDate(user.createdAt)?.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) || 'N/A') : 'N/A'}
          </p>
        </div>
        <div className="glass-card p-6 text-center rounded-[2rem] border-primary/5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mb-2 opacity-50">Security Token</p>
          <p className="text-[10px] font-mono text-muted-foreground/50 truncate" title={user.id}>{user.id.toUpperCase()}</p>
        </div>
      </div>
    </div>
  );
}
