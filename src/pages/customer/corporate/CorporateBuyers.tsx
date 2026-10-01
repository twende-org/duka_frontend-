import React, { useState, useEffect } from "react";
import { getCorporateBuyers } from "@/lib/api/domains/corporate";
import { User, Mail, Phone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAppSelector } from "@/store/hooks";
import { PageLoader } from "@/components/common/Loader";


export default function CorporateBuyers() {
  const [buyers, setBuyers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const user = useAppSelector((s) => s.auth.user);
  const companyId = user?.corporateProfile?.companyId;

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getCorporateBuyers()
      .then((buyersList) => {
        if (!cancelled) setBuyers(buyersList);
      })
      .catch((e) => console.error("Error loading buyers list:", e))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const roleLabels = {
    buyer: "Mnunuzi (Procurement)",
    approver: "Mwidhinishaji (Manager)",
    admin: "Msimamizi (Admin)"
  };

  const roleColors = {
    buyer: "bg-primary/10 text-primary border-primary/10",
    approver: "bg-success/10 text-success border-success/10",
    admin: "bg-accent/10 text-accent border-accent/10"
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground tracking-tight uppercase">Wanunuzi wa Kampuni</h1>
        <p className="text-xs text-muted-foreground font-bold tracking-wider uppercase">Wanachama walioruhusiwa kufanya ununuzi kwa niaba ya kampuni</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-4">
          <PageLoader />
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Inapakia orodha...</p>
        </div>
      ) : buyers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {buyers.map((buyer) => (
            <Card key={buyer.id} className="p-5 sm:p-6 rounded-[2rem] border border-primary/5 shadow-xs bg-card/60 backdrop-blur-md flex flex-col justify-between space-y-4">
              <div className="flex gap-4 items-center">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-lg shrink-0">
                  {buyer.displayName?.charAt(0) || "U"}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-black text-foreground uppercase tracking-wide truncate">{buyer.displayName}</h3>
                  <span className={`inline-flex text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border mt-1 ${roleColors[buyer.corporateProfile?.role] || "bg-muted text-muted-foreground"}`}>
                    {roleLabels[buyer.corporateProfile?.role] || buyer.corporateProfile?.role}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground font-semibold border-t border-border pt-4">
                <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-muted-foreground" /> {buyer.email}</p>
                <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-muted-foreground" /> {buyer.phone || "N/A"}</p>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="glass-card rounded-[2rem] border-primary/5 p-12 text-center space-y-4 bg-card/40">
          <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground mx-auto">
            <User className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-foreground text-sm">Orodha Ipo Wazi</h3>
            <p className="text-xs text-muted-foreground font-medium">Hakuna wanunuzi wengine walioongezwa bado.</p>
          </div>
        </div>
      )}
    </div>
  );
}
