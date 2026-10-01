import React, { useState, useEffect, useCallback } from "react";
import { useAppSelector } from "@/store/hooks";
import { getPurchaseOrders, approvePurchaseOrder, rejectPurchaseOrder } from "@/lib/api/domains/corporate";
import { Building, Users, CreditCard, ShoppingCart, Clock, CheckCircle, XCircle, FileText, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PageLoader } from "@/components/common/Loader";


export default function CorporateDashboard() {
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const dbProfile = useAppSelector((s) => s.auth.user);
  const companyId = dbProfile?.corporateProfile?.companyId;

  const loadPurchaseOrders = useCallback(async () => {
    if (!companyId) return;
    try {
      const poData = await getPurchaseOrders();
      setPurchaseOrders(poData);
    } catch (e) {
      console.error("Error loading corporate details:", e);
    }
  }, [companyId]);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getPurchaseOrders()
      .then((poData) => { if (!cancelled) setPurchaseOrders(poData); })
      .catch((e) => console.error("Error loading corporate details:", e))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [companyId]);

  const handlePOApprove = async (poId: string) => {
    if (!companyId) return;
    try {
      await approvePurchaseOrder(poId, dbProfile?.id || undefined);
      toast.success("Oda ya Ununuzi (PO) imethibitishwa!");
      await loadPurchaseOrders();
    } catch (e) {
      toast.error("Imeshindwa kuthibitisha oda.");
    }
  };

  const handlePOReject = async (poId: string) => {
    if (!companyId) return;
    try {
      await rejectPurchaseOrder(poId);
      toast.error("Oda ya Ununuzi imekataliwa.");
      await loadPurchaseOrders();
    } catch (e) {
      toast.error("Imeshindwa kukataa oda.");
    }
  };

  const isApprover = dbProfile?.corporateProfile?.role === "approver" || dbProfile?.corporateProfile?.role === "admin";

  const poStatusTags = {
    pending_approval: "bg-warning/10 text-warning border-warning/10",
    APPROVED: "bg-success/10 text-success border-success/10",
    REJECTED: "bg-destructive/10 text-destructive border-destructive/10"
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight uppercase">Corporate Portal</h1>
          <p className="text-xs text-muted-foreground font-bold tracking-wider uppercase">
            Mfumo wa ununuzi na mikataba wa kampuni
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-4">
          <PageLoader />
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Inapakia taarifa...</p>
        </div>
      ) : dbProfile?.corporateProfile ? (
        <div className="space-y-6">
          {/* Company Credit & Balance Info */}
          <Card className="p-6 sm:p-8 rounded-[2.5rem] border-primary/15 bg-primary/[0.01] shadow-xs flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex gap-4 items-center w-full">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Building className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-foreground uppercase tracking-wide">
                  Kampuni: {dbProfile.corporateProfile.companyName}
                </h3>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">
                  Wajibu wako: {dbProfile.corporateProfile.role.toUpperCase()}
                </p>
              </div>
            </div>

            <div className="flex gap-8 w-full justify-between md:justify-end border-t border-border pt-4 md:border-0 md:pt-0">
              <div>
                <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest block">Ukomo wa Mkopo</span>
                <span className="text-sm font-black text-foreground">
                  {(dbProfile.corporateProfile.creditLimit || 2000000).toLocaleString()} TZS
                </span>
              </div>
              <div>
                <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest block">Salio la Kampuni</span>
                <span className="text-sm font-black text-success">
                  {(dbProfile.corporateProfile.creditBalance || 1850000).toLocaleString()} TZS
                </span>
              </div>
            </div>
          </Card>

          {/* Pending Purchase Orders Approval Flow */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Oda za Ununuzi (PO Requests)</h3>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Oda zinazosubiri kuidhinishwa na idara</p>
            </div>

            {purchaseOrders.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {purchaseOrders.map((po) => (
                  <Card key={po.id} className="p-5 rounded-[2rem] border border-border flex flex-col justify-between space-y-4 bg-card/60 backdrop-blur-md">
                    <div>
                      <div className="flex justify-between items-start gap-2 border-b border-border pb-3 mb-3">
                        <div>
                          <span className="text-[10px] text-primary font-black uppercase tracking-wider">#{po.id.slice(0,8).toUpperCase()}</span>
                          <h4 className="font-black text-sm text-foreground uppercase tracking-tight">{po.departmentName || "Idara ya Manunuzi"}</h4>
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${poStatusTags[po.approvalStatus] || "bg-muted"}`}>
                          {po.approvalStatus}
                        </span>
                      </div>

                      <div className="space-y-2 mb-4 text-xs font-semibold text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Mnunuzi (Buyer):</span>
                          <span className="text-foreground font-bold">{po.buyerName || "IT Officer"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Jumla Kuu:</span>
                          <span className="text-foreground font-black">{(po.totalAmount || 0).toLocaleString()} TZS</span>
                        </div>
                      </div>
                    </div>

                    {po.approvalStatus === "pending_approval" && isApprover && (
                      <div className="flex gap-2 pt-3 border-t border-border">
                        <Button onClick={() => handlePOApprove(po.id)} className="flex-1 rounded-xl h-10 font-bold bg-success hover:bg-success/90">Idhinisha (Approve)</Button>
                        <Button onClick={() => handlePOReject(po.id)} variant="outline" className="flex-1 rounded-xl h-10 font-bold border-destructive/20 text-destructive hover:bg-destructive/10">Kataa</Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <div className="glass-card rounded-[2rem] border-primary/5 p-12 text-center space-y-4 bg-card/40">
                <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground mx-auto">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-foreground text-sm">Hakuna Oda Zilizopatikana</h3>
                  <p className="text-xs text-muted-foreground font-medium">Hakuna maombi ya PO yanayosubiri sasa hivi.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-[2rem] border-primary/5 p-12 text-center space-y-4 bg-card/40">
          <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground mx-auto">
            <Building className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-foreground text-sm">Akaunti ya Kawaida</h3>
            <p className="text-xs text-muted-foreground font-medium leading-relaxed max-w-sm mx-auto">
              Akaunti yako haijaunganishwa na akaunti yoyote ya Corporate. Tafadhali wasiliana na mwajiri wako ili kuongezwa kwenye kundi la ununuzi.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
