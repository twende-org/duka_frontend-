import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Store, User, ArrowRight, Building2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { setUser } from "@/store/authSlice";
import { updateMeOnApi, type ProfileUpdate } from "@/lib/api/domains/auth";
import { useI18n } from "@/lib/i18n";
import SEO from "@/components/SEO";
import { motion } from "framer-motion";

export default function WorkspaceSelector() {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const user = useAppSelector((s) => s.auth.user);
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(true);
  
  const sw = lang === "sw";

  const dispatch = useAppDispatch();
  
  const handleSelection = async (workspace: "merchant" | "customer") => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const updates: ProfileUpdate = {};
      if (remember) updates.defaultWorkspace = workspace;
      if (user.accountType === "unassigned") updates.accountType = workspace;
      
      if (Object.keys(updates).length > 0) {
        await updateMeOnApi(updates);
      }
      
      // Synchronously update Redux state so PostLoginRedirect sees it immediately
      // We explicitly override defaultWorkspace in Redux for this session, even if not remembered in DB
      dispatch(setUser({ ...user, ...updates, defaultWorkspace: workspace }));
      
      // Navigate to the intelligent redirector so it re-evaluates their roles and shops
      navigate("/app", { replace: true });
    } catch (error) {
      console.error("Failed to save workspace preference", error);
      // Fallback navigation
      navigate(workspace === "merchant" ? "/dashboard" : "/customer/home", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <SEO title={sw ? "Chagua Eneo Lako — Twende Duka" : "Choose Workspace — Twende Duka"} description="Select your workspace" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-card rounded-[2.5rem] p-8 border border-border shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />
        
        <div className="relative z-10 text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight mb-2">
            {sw ? "Habari, " : "Hello, "}{user?.displayName?.split(" ")[0] || ""}
          </h1>
          <p className="text-sm font-medium text-muted-foreground">
            {sw ? "Ungependa kutumia Twende Duka vipi leo?" : "How would you like to use Twende Duka today?"}
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          <button
            onClick={() => handleSelection("merchant")}
            disabled={loading}
            className="w-full group flex items-center gap-4 p-4 rounded-2xl border-2 border-border/50 hover:border-primary/50 bg-background hover:bg-primary/5 transition-all active:scale-[0.98] text-left disabled:opacity-50"
          >
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
              <Store className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
                {sw ? "Simamia Biashara" : "Manage My Business"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {sw ? "Ingia kwenye dashibodi yako ya mauzo" : "Enter your sales and management dashboard"}
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </button>

          <button
            onClick={() => handleSelection("customer")}
            disabled={loading}
            className="w-full group flex items-center gap-4 p-4 rounded-2xl border-2 border-border/50 hover:border-amber-500/50 bg-background hover:bg-amber-500/5 transition-all active:scale-[0.98] text-left disabled:opacity-50"
          >
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0 group-hover:scale-110 transition-transform">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-foreground group-hover:text-amber-600 transition-colors">
                {sw ? "Manunuzi Binafsi" : "Personal Shopping"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {sw ? "Vinjari maduka na kufuatilia oda zako" : "Browse shops and track your orders"}
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
          </button>
        </div>

        <div className="relative z-10 mt-8 pt-6 border-t border-border/50">
          <label className="flex items-center justify-center gap-3 cursor-pointer group">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <div className="w-10 h-6 bg-muted rounded-full peer-checked:bg-primary transition-colors border border-border/50 shadow-inner"></div>
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm peer-checked:translate-x-4 transition-transform"></div>
            </div>
            <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
              {sw ? "Kumbuka chaguo langu" : "Remember my choice"}
            </span>
          </label>
        </div>
      </motion.div>
    </div>
  );
}
