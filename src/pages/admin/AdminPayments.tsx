import { useEffect, useState } from "react";
import { CreditCard, CheckCircle, Clock, XCircle, Search, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getAllSubscriptions, confirmSubscription, updateSubscription, createSubscription, getAllUsers, PLAN_LIMITS, type Subscription, type PlanTier, type SubscriptionStatus } from "@/lib/subscription";
import { useAppSelector } from "@/store/hooks";
import { formatTZS } from "@/data/mockData";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { Loader } from "@/components/common/Loader";


function AdminPayments() {
  const { t } = useI18n();
  const adminUser = useAppSelector((s) => s.auth.user);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>("basic");

function exportToCSV(filename: string, data: Record<string, any>[]) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const csv = [
    keys.join(","),
    ...data.map((row) => keys.map((k) => `"${String(row[k] ?? "").replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

  async function loadData() {
    setLoading(true);
    try {
      const [s, u] = await Promise.all([
        getAllSubscriptions().catch(() => []),
        getAllUsers().catch(() => []),
      ]);
      setSubs(s);
      setAllUsers(u);
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  const filtered = subs.filter((s) => {
    const matchSearch = (s.userEmail || "").toLowerCase().includes(search.toLowerCase()) || (s.userName || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  async function handleConfirm(sub: Subscription) {
    try {
      console.log("Confirming subscription:", sub.id);
      await confirmSubscription(sub.id, adminUser!.id);
      toast.success(`${sub.userEmail} — ${t("admin.paymentConfirmed")}`);
      loadData();
    } catch (err: any) { 
      console.error("Payment Confirmation Error:", err);
      toast.error(`Permission Denied: ${err.message}`); 
    }
  }

  async function handleExpire(sub: Subscription) {
    try {
      await updateSubscription(sub.id, { status: "expired" });
      toast.success(`${sub.userEmail} — expired`);
      loadData();
    } catch (err: any) { 
      console.error("Expire Error:", err);
      toast.error(err.message); 
    }
  }

  async function handleAssignPlan() {
    if (!selectedUserId) return;
    const user = allUsers.find((u) => u.id === selectedUserId);
    if (!user) return;
    try {
      const now = new Date();
      const end = new Date(now);
      end.setMonth(end.getMonth() + 1);
      await createSubscription(selectedUserId, {
        userId: selectedUserId,
        userEmail: user.email,
        userName: user.displayName,
        plan: selectedPlan,
        status: "active",
        startDate: now.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
        amount: PLAN_LIMITS[selectedPlan].price,
      });
      toast.success(`${user.email} → ${selectedPlan}`);
      setDialogOpen(false);
      loadData();
    } catch (err: any) { toast.error(err.message); }
  }

  const statusIcons: Record<SubscriptionStatus, typeof CheckCircle> = {
    active: CheckCircle,
    pending: Clock,
    expired: XCircle,
    cancelled: XCircle,
  };

  const statusColors: Record<SubscriptionStatus, string> = {
    active: "text-success",
    pending: "text-warning",
    expired: "text-destructive",
    cancelled: "text-muted-foreground",
  };

  return (
    <div>
      <div className="page-header flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">{t("admin.paymentsTitle")}</h1>
          <p className="page-description">{t("admin.paymentsDesc")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportToCSV("payments.csv", filtered.map((s) => ({ user: s.userName, email: s.userEmail, plan: s.plan, status: s.status, amount: s.amount, start: s.startDate, end: s.endDate, ref: s.paymentReference || "" })))}>
            📥 Export CSV
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><CreditCard className="h-4 w-4 mr-2" />{t("admin.assignPlan")}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t("admin.assignPlan")}</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">{t("admin.selectUser")}</label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger><SelectValue placeholder={t("admin.selectUser")} /></SelectTrigger>
                    <SelectContent>
                      {allUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.displayName} ({u.email})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">{t("admin.plan")}</label>
                <Select value={selectedPlan} onValueChange={(v) => setSelectedPlan(v as PlanTier)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free — TZS 0</SelectItem>
                    <SelectItem value="basic">Basic — TZS 9,900</SelectItem>
                    <SelectItem value="business">Business — TZS 29,900</SelectItem>
                    <SelectItem value="enterprise">Enterprise — TZS 79,900</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">{t("admin.planLimits")}:</p>
                <p className="text-sm font-medium">
                  {PLAN_LIMITS[selectedPlan].maxShops === 999999 ? "∞" : PLAN_LIMITS[selectedPlan].maxShops} {t("admin.shops")} · {" "}
                  {PLAN_LIMITS[selectedPlan].maxProducts === 999999 ? "∞" : PLAN_LIMITS[selectedPlan].maxProducts} {t("admin.products")} · {" "}
                  {PLAN_LIMITS[selectedPlan].maxStaff === 999999 ? "∞" : PLAN_LIMITS[selectedPlan].maxStaff} {t("admin.staff")}
                </p>
              </div>
              <Button onClick={handleAssignPlan} className="w-full" disabled={!selectedUserId}>{t("admin.confirmAssign")}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>

    <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t("admin.searchPayments")} className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            <SelectItem value="active">{t("admin.statusActive")}</SelectItem>
            <SelectItem value="pending">{t("admin.statusPending")}</SelectItem>
            <SelectItem value="expired">{t("admin.statusExpired")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader size={24} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="stat-card text-center py-12">
          <CreditCard className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">{t("admin.noPayments")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((sub) => {
            const StatusIcon = statusIcons[sub.status];
            return (
              <div key={sub.id} className="stat-card flex items-center gap-4 flex-wrap">
                <StatusIcon className={`h-6 w-6 ${statusColors[sub.status]}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{sub.userName}</p>
                  <p className="text-sm text-muted-foreground">{sub.userEmail}</p>
                </div>
                <div className="text-center">
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary capitalize">{sub.plan}</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">{formatTZS(sub.amount)}</p>
                  <p className="text-xs text-muted-foreground">{sub.startDate} → {sub.endDate}</p>
                </div>
                {sub.paymentReference && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {sub.paymentReference}
                  </div>
                )}
                <div className="flex gap-2">
                  {sub.status === "pending" && (
                    <Button size="sm" onClick={() => handleConfirm(sub)} className="bg-success hover:bg-success/90 text-success-foreground">
                      <CheckCircle className="h-4 w-4 mr-1" />{t("admin.confirm")}
                    </Button>
                  )}
                  {sub.status === "active" && (
                    <Button size="sm" variant="outline" onClick={() => handleExpire(sub)}>
                      <XCircle className="h-4 w-4 mr-1" />{t("admin.expire")}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AdminPayments;
