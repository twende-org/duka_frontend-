import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Trash2, Shield, Loader2, Clock, X, Users, Search, UserCog, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAppSelector } from "@/store/hooks";
import { 
  cancelInvitation,
  getShopInvitations,
  getShopUsers, 
  removeUserRole, 
  sendInvitation, 
} from "@/lib/api/domains/shops";
import type { AppRole, Invitation } from "@/types";
import { cn, toSafeDate } from "@/lib/utils";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { THEME_COLORS } from "@/lib/theme";
import { useSubscription } from "@/hooks/useSubscription";
import { ErrorAlert } from "@/components/ErrorAlert";
import PageHeader from "@/components/common/PageHeader";
import { Loader } from "@/components/common/Loader";


interface ShopUser {
  userId: string;
  email: string;
  displayName: string;
  role: AppRole;
  shopId: string;
}

const roleColors: Record<AppRole, string> = {
  owner: "bg-primary/10 text-primary",
  manager: "bg-info/10 text-info",
  attendant: "bg-accent/10 text-accent",
};

export default function UserManagement() {
  const user = useAppSelector((s) => s.auth.user);
  const shops = useAppSelector((s) => s.shops.shops);
  const currentShopId = useAppSelector((s) => s.shops.currentShopId);
  const { t } = useI18n();
  const { limits, plan } = useSubscription();
  const [selectedShop, setSelectedShop] = useState(currentShopId || "");
  const [shopUsers, setShopUsers] = useState<ShopUser[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<AppRole>("attendant");
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "pending">("all");
  const [search, setSearch] = useState("");

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return shopUsers;
    return shopUsers.filter((u) => u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [shopUsers, search]);

  const filteredInvitations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return invitations;
    return invitations.filter((i) => i.email.toLowerCase().includes(q));
  }, [invitations, search]);



  const roleLabels: Record<AppRole, string> = {
    owner: t("role.owner"),
    manager: t("role.manager"),
    attendant: t("role.attendant"),
  };

  useEffect(() => { if (currentShopId && !selectedShop) setSelectedShop(currentShopId); }, [currentShopId]);
  useEffect(() => { if (selectedShop) loadData(); }, [selectedShop]);

  async function loadData() {
    setLoading(true);
    try {
      // The role rows already carry the member's email and display name, so the
      // legacy per-user profile lookups (N+1) are no longer needed.
      const [roles, pendingInvites] = await Promise.all([
        getShopUsers(selectedShop),
        getShopInvitations(selectedShop),
      ]);

      setShopUsers(
        roles.map((role) => ({
          userId: role.userId,
          email: role.email || t("users.unknown"),
          displayName: role.displayName || t("users.unknown"),
          role: role.role,
          shopId: role.shopId,
        }))
      );
      setInvitations(pendingInvites);
    } catch (err) {
      console.error("Failed to load shop data:", err);
      toast.error(t("users.failedLoad"));
    }
    setLoading(false);
  }

  async function handleInviteUser(e: React.FormEvent) {
    e.preventDefault(); 
    if (!user) return;
    setSubmitting(true); 
    setProgress(30);
    try {
      const email = newUserEmail.trim().toLowerCase();
      
      // Check if user already in shop
      if (shopUsers.some(u => u.email.toLowerCase() === email)) {
        toast.error(t("users.alreadyInShop") || "User is already in this shop");
        setSubmitting(false);
        setProgress(0);
        return;
      }

      await sendInvitation({
        email,
        shopId: selectedShop,
        role: newUserRole,
        invitedBy: user.id,
        shopName: shops.find(s => s.id === selectedShop)?.name || "Shop"
      });
      
      setProgress(100);
      toast.success(t("users.assigned"));
      setDialogOpen(false); 
      setNewUserEmail(""); 
      setNewUserRole("attendant"); 
      setProgress(0); 
      loadData(); 
    } catch (err: any) { 
      setError(err.message);
      toast.error(err.message || t("products.failed")); 
      setProgress(0); 
    }
    setSubmitting(false);
  }

  async function handleRemoveUser(userId: string) {
    try { 
      await removeUserRole(userId, selectedShop); 
      toast.success(t("users.removed")); 
      loadData(); 
    } catch (err: any) { 
      toast.error(err.message || t("products.failed")); 
    }
  }

  async function handleCancelInvite(inviteId: string) {
    try {
      await cancelInvitation(inviteId);
      toast.success(t("invitation.cancel") + " successfully");
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <ErrorAlert error={error} onClear={() => setError(null)} />
      <PageHeader
        title={t("users.title")}
        description={t("users.subtitle")}
        actions={
          <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setProgress(0); }}>
            <DialogTrigger asChild>
              <Button 
                  disabled={!selectedShop || (shopUsers.length + invitations.length >= limits.maxStaff)} 
                  className={`font-bold ${THEME_COLORS.primary.fill} shadow-xs uppercase tracking-widest text-[10px] transition-all hover:scale-105 active:scale-95`}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {t("users.addUser")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t("users.addToShop")}</DialogTitle></DialogHeader>
              {submitting && <Progress value={progress} className="h-1" />}
              <form onSubmit={handleInviteUser} className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">{t("users.userEmail")}</label>
                  <Input 
                    placeholder="mfano@email.com" 
                    type="email" 
                    value={newUserEmail} 
                    onChange={(e) => setNewUserEmail(e.target.value)} 
                    required 
                    className="bg-muted/50"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">{t("users.role")}</label>
                  <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as AppRole)}>
                    <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">{t("role.manager")}</SelectItem>
                      <SelectItem value="attendant">{t("role.attendant")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("common.loading")}</> : t("users.assignRole")}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("nav.users")}</CardTitle>
            <Users className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{shopUsers.length}</div>
            <p className="text-xs text-muted-foreground">Wanachama / Members</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("role.owner")}</CardTitle>
            <Shield className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{shopUsers.filter(u => u.role === "owner").length}</div>
            <p className="text-xs text-muted-foreground">Wamiliki</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Staff</CardTitle>
            <UserCog className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{shopUsers.filter(u => u.role !== "owner").length}</div>
            <p className="text-xs text-muted-foreground">{t("role.manager")} / {t("role.attendant")}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("users.invitations")}</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{invitations.length}</div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("users.email")}
              className="pl-9 bg-muted/50 border-none focus-visible:ring-1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-64">
            <Select value={selectedShop} onValueChange={setSelectedShop}>
              <SelectTrigger className="bg-muted/50 border-none focus:ring-1"><SelectValue placeholder={t("users.selectShopPlaceholder")} /></SelectTrigger>
              <SelectContent>
                {shops.map((shop) => (<SelectItem key={shop.id} value={shop.id}>{shop.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="-mx-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="inline-flex w-max h-auto gap-1 rounded-md bg-muted/50 p-1">
            {([
              ["all", "Wote", shopUsers.length + invitations.length],
              ["active", "Active", shopUsers.length],
              ["pending", "Pending", invitations.length],
            ] as const).map(([value, label, count]) => (
              <button
                key={value}
                onClick={() => setActiveTab(value)}
                className={`relative inline-flex items-center gap-2 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all duration-200 ${activeTab === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <span>{label}</span>
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">{count}</span>
                {activeTab === value && (
                  <motion.span
                    layoutId="users-tab-underline"
                    className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {selectedShop && (shopUsers.length + invitations.length >= limits.maxStaff) && (
        <div className="flex items-center gap-4 rounded-xl border border-warning/20 bg-warning/5 p-4">
          <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center text-warning shrink-0">
            <Shield className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {t("subscription.staffLimitReached") || "Ukomo wa Wafanyakazi Umefikiwa"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("subscription.staffLimitDesc") || `Mpango wako wa sasa (${plan}) unaruhusu hadi mfanyakazi ${limits.maxStaff}.`}
            </p>
          </div>
        </div>
      )}

      {!selectedShop ? (
        <div className="rounded-xl border bg-card px-4 py-12 text-center text-muted-foreground">
          <Shield className="mx-auto h-8 w-8 mb-3 opacity-20" />
          {t("users.selectShopFirst")}
        </div>
      ) : loading ? (
        <div className="flex justify-center py-20">
          <Loader size={24} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Members */}
          {activeTab !== "pending" && (
            filteredUsers.length === 0 ? (
              <div className="rounded-xl border bg-card px-4 py-12 text-center text-muted-foreground">
                <Users className="mx-auto h-8 w-8 mb-3 opacity-20" />
                {t("users.noUsers")}
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block rounded-xl border bg-card overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
                      <thead className="sticky top-0 z-10 text-xs text-muted-foreground bg-muted/50 backdrop-blur uppercase">
                        <tr>
                          <th className="px-4 py-3 font-medium min-w-[220px]">{t("users.name")}</th>
                          <th className="px-4 py-3 font-medium min-w-[220px]">{t("users.email")}</th>
                          <th className="px-4 py-3 font-medium">{t("users.role")}</th>
                          <th className="px-4 py-3 font-medium text-right">{t("users.actions")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <AnimatePresence initial={false} mode="popLayout">
                          {filteredUsers.map((u, i) => (
                            <motion.tr
                              key={u.userId}
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              transition={{ duration: 0.28, delay: Math.min(i, 12) * 0.03, ease: [0.22, 1, 0.36, 1] }}
                              className="group relative transition-colors duration-200 hover:bg-primary/5"
                            >
                              <td className="relative px-4 py-3 font-medium">
                                <span className="absolute left-0 top-1/2 h-0 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300 group-hover:h-3/5" />
                                <div className="flex items-center gap-3 transition-transform duration-200 group-hover:translate-x-1">
                                  <div className="h-8 w-8 shrink-0 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                                    {u.displayName.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="truncate max-w-[180px]">{u.displayName}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground truncate max-w-[240px]">{u.email}</td>
                              <td className="px-4 py-3">
                                <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium whitespace-nowrap", roleColors[u.role])}>
                                  {roleLabels[u.role]}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                {u.role !== "owner" && (
                                  <Button size="sm" variant="ghost" onClick={() => handleRemoveUser(u.userId)} className="text-destructive hover:bg-destructive/10">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </td>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile cards */}
                <div className="grid gap-3 md:hidden">
                  {filteredUsers.map((u, i) => (
                    <motion.div
                      key={u.userId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.28, delay: Math.min(i, 8) * 0.03, ease: [0.22, 1, 0.36, 1] }}
                      className="rounded-xl border bg-card p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{u.displayName}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                        {u.role !== "owner" && (
                          <Button size="sm" variant="ghost" onClick={() => handleRemoveUser(u.userId)} className="text-destructive hover:bg-destructive/10 shrink-0">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium", roleColors[u.role])}>
                          {roleLabels[u.role]}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )
          )}

          {/* Invitations */}
          {activeTab !== "active" && (
            filteredInvitations.length === 0 ? (
              activeTab === "pending" ? (
                <div className="rounded-xl border bg-card px-4 py-12 text-center text-muted-foreground">
                  <Clock className="mx-auto h-8 w-8 mb-3 opacity-20" />
                  No pending invitations
                </div>
              ) : null
            ) : (
              <>
                <div className="hidden md:block rounded-xl border bg-card overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
                      <thead className="sticky top-0 z-10 text-xs text-muted-foreground bg-muted/50 backdrop-blur uppercase">
                        <tr>
                          <th className="px-4 py-3 font-medium min-w-[240px]">{t("users.email")}</th>
                          <th className="px-4 py-3 font-medium">{t("users.role")}</th>
                          <th className="px-4 py-3 font-medium">{t("users.inviteDate")}</th>
                          <th className="px-4 py-3 font-medium text-right">{t("users.actions")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <AnimatePresence initial={false} mode="popLayout">
                          {filteredInvitations.map((inv, i) => (
                            <motion.tr
                              key={inv.id}
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              transition={{ duration: 0.28, delay: Math.min(i, 12) * 0.03, ease: [0.22, 1, 0.36, 1] }}
                              className="group relative transition-colors duration-200 hover:bg-primary/5"
                            >
                              <td className="relative px-4 py-3 font-medium">
                                <span className="absolute left-0 top-1/2 h-0 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300 group-hover:h-3/5" />
                                <div className="flex items-center gap-3 transition-transform duration-200 group-hover:translate-x-1">
                                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                                  <span className="truncate max-w-[220px]">{inv.email}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium whitespace-nowrap", roleColors[inv.role])}>
                                  {roleLabels[inv.role]}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">{toSafeDate(inv.createdAt)?.toLocaleDateString() || "—"}</td>
                              <td className="px-4 py-3 text-right">
                                <Button size="sm" variant="ghost" onClick={() => handleCancelInvite(inv.id)} className="text-destructive hover:bg-destructive/10">
                                  <X className="h-4 w-4" />
                                </Button>
                              </td>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid gap-3 md:hidden">
                  {filteredInvitations.map((inv, i) => (
                    <motion.div
                      key={inv.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.28, delay: Math.min(i, 8) * 0.03, ease: [0.22, 1, 0.36, 1] }}
                      className="rounded-xl border bg-card p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{inv.email}</p>
                          <p className="text-xs text-muted-foreground">{toSafeDate(inv.createdAt)?.toLocaleDateString() || "—"}</p>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => handleCancelInvite(inv.id)} className="text-destructive hover:bg-destructive/10 shrink-0">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium", roleColors[inv.role])}>
                          {roleLabels[inv.role]}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )
          )}
        </div>
      )}
    </div>
  );
}
