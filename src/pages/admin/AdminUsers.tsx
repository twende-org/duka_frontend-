import { Loader } from "@/components/common/Loader";
import { useEffect, useState } from "react";
import { Users, Search, Crown, ShieldAlert, ShieldCheck, Trash2, Eye, CreditCard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getAllUsers, getAllSubscriptions, setSystemAdmin, setUserStatus, deleteUserAccount, type Subscription, type PlanTier } from "@/lib/subscription";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UserWithSub {
  id: string;
  email: string;
  displayName: string;
  createdAt?: any;
  subscription?: Subscription;
  isSuspended?: boolean;
}

const planColors: Record<PlanTier, string> = {
  free: "bg-muted text-muted-foreground",
  basic: "bg-primary/10 text-primary",
  business: "bg-success/10 text-success",
  enterprise: "bg-info/10 text-info",
};

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

function AdminUsers() {
  const { t } = useI18n();
  const [users, setUsers] = useState<UserWithSub[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [userToDelete, setUserToDelete] = useState<UserWithSub | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [detailUser, setDetailUser] = useState<UserWithSub | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [allUsers, allSubs] = await Promise.all([
        getAllUsers().catch(() => []),
        getAllSubscriptions().catch(() => []),
      ]);
      const subsMap = new Map<string, Subscription>();
      allSubs.forEach((s) => subsMap.set(s.userId, s));
      setUsers(allUsers.map((u) => ({ ...u, subscription: subsMap.get(u.id) })));
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  const filtered = users.filter((u) => {
    const matchSearch = u.email.toLowerCase().includes(search.toLowerCase()) || u.displayName.toLowerCase().includes(search.toLowerCase());
    const plan = u.subscription?.plan || "free";
    const matchPlan = filterPlan === "all" || plan === filterPlan;
    return matchSearch && matchPlan;
  });

  async function handleMakeAdmin(userId: string, email: string) {
    try {
      await setSystemAdmin(userId, email);
      toast.success(`${email} is now a system admin`);
    } catch (err: any) { toast.error(err.message); }
  }

  async function handleToggleStatus(userId: string, email: string, currentStatus: boolean) {
    try {
      await setUserStatus(userId, !currentStatus);
      toast.success(`${email} has been ${!currentStatus ? "suspended" : "activated"}`);
      loadData();
    } catch (err: any) { toast.error(err.message); }
  }

  async function handleDeleteUser() {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await deleteUserAccount(userToDelete.id);
      toast.success(`${userToDelete.email} has been deleted`);
      setUserToDelete(null);
      loadData();
    } catch (err: any) { toast.error(err.message); }
    setIsDeleting(false);
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t("admin.allUsers")}</h1>
        <p className="page-description">{t("admin.usersDesc")}</p>
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t("admin.searchUsers")} className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterPlan} onValueChange={setFilterPlan}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="basic">Basic</SelectItem>
            <SelectItem value="business">Business</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => exportToCSV("users.csv", filtered.map((u) => ({ name: u.displayName, email: u.email, plan: u.subscription?.plan || "free", status: u.subscription?.status || "active", suspended: u.isSuspended ? "Yes" : "No" })))}>
          📥 Export CSV
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader size={24} />
        </div>
      ) : (
        <div className="stat-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-3 font-medium">{t("users.name")}</th>
                <th className="pb-3 font-medium">{t("users.email")}</th>
                <th className="pb-3 font-medium">{t("admin.plan")}</th>
                <th className="pb-3 font-medium">{t("admin.status")}</th>
                <th className="pb-3 font-medium text-right">{t("users.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const plan = u.subscription?.plan || "free";
                const status = u.subscription?.status || "active";
                return (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="py-3 font-medium">{u.displayName}</td>
                    <td className="py-3 text-muted-foreground">{u.email}</td>
                    <td className="py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${planColors[plan]}`}>
                        {plan}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        status === "active" ? "bg-success/10 text-success" : 
                        status === "pending" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"
                      }`}>
                        {status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setDetailUser(u)} title="View Profile">
                          <Eye className="h-4 w-4 text-primary" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleToggleStatus(u.id, u.email, !!u.isSuspended)} title={u.isSuspended ? "Activate User" : "Suspend User"}>
                          {u.isSuspended ? <ShieldCheck className="h-4 w-4 text-success" /> : <ShieldAlert className="h-4 w-4 text-destructive" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleMakeAdmin(u.id, u.email)} title="Make Admin">
                          <Crown className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setUserToDelete(u)} title="Delete User" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-8">
              <Users className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">{t("admin.noUsers")}</p>
            </div>
          )}
        </div>
      )}

      {/* User Detail Dialog */}
      <Dialog open={!!detailUser} onOpenChange={(v) => !v && setDetailUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {detailUser?.displayName}
            </DialogTitle>
          </DialogHeader>
          {detailUser && (
            <div className="space-y-3 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/50 p-3 col-span-2">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Email</p>
                  <p className="text-sm font-medium break-all">{detailUser.email}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Plan</p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${planColors[detailUser.subscription?.plan as PlanTier || "free"]}`}>
                    {detailUser.subscription?.plan || "free"}
                  </span>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Subscription Status</p>
                  <span className={`text-xs font-bold ${
                    detailUser.subscription?.status === "active" ? "text-success" :
                    detailUser.subscription?.status === "pending" ? "text-warning" : "text-muted-foreground"
                  }`}>
                    {detailUser.subscription?.status || "none"}
                  </span>
                </div>
                {detailUser.subscription?.startDate && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Start Date</p>
                    <p className="text-sm">{detailUser.subscription.startDate}</p>
                  </div>
                )}
                {detailUser.subscription?.endDate && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">End Date</p>
                    <p className="text-sm">{detailUser.subscription.endDate}</p>
                  </div>
                )}
                {detailUser.subscription?.amount != null && (
                  <div className="rounded-lg bg-success/5 border border-success/20 p-3 col-span-2">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1 flex items-center gap-1"><CreditCard className="h-3 w-3" />Amount Paid</p>
                    <p className="text-sm font-black text-success">TZS {detailUser.subscription.amount.toLocaleString()}</p>
                  </div>
                )}
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Account Status</p>
                  <span className={`text-xs font-bold ${detailUser.isSuspended ? "text-destructive" : "text-success"}`}>
                    {detailUser.isSuspended ? "🔴 Suspended" : "🟢 Active"}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button className="flex-1" variant="outline" onClick={() => { setDetailUser(null); handleToggleStatus(detailUser.id, detailUser.email, !!detailUser.isSuspended); }}>
                  {detailUser.isSuspended ? <ShieldCheck className="h-4 w-4 mr-2 text-success" /> : <ShieldAlert className="h-4 w-4 mr-2 text-destructive" />}
                  {detailUser.isSuspended ? "Activate" : "Suspend"}
                </Button>
                <Button className="flex-1" variant="outline" onClick={() => { setDetailUser(null); handleMakeAdmin(detailUser.id, detailUser.email); }}>
                  <Crown className="h-4 w-4 mr-2" /> Make Admin
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && !isDeleting && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the account for{" "}
              <span className="font-semibold text-foreground">{userToDelete?.email}</span> and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); handleDeleteUser(); }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default AdminUsers;
