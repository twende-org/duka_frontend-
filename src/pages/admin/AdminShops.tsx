import { useEffect, useState } from "react";
import { Store, Search, Trash2, MapPin, User, ExternalLink, Eye, TestTube2, X, Package, TrendingUp, Phone, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getAllShopsAdmin as getAllShops, deleteShop, updateShop } from "@/lib/api/domains/shops";
import { getAllUsers } from "@/lib/subscription";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import type { Shop } from "@/types";
import { cn } from "@/lib/utils";
import { Loader } from "@/components/common/Loader";

interface ShopWithOwner extends Shop {
  ownerEmail?: string;
  ownerName?: string;
}

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

export default function AdminShops() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [shops, setShops] = useState<ShopWithOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [detailShop, setDetailShop] = useState<ShopWithOwner | null>(null);
  const [quotaInput, setQuotaInput] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const [allShops, allUsers] = await Promise.all([
        getAllShops().catch(() => []),
        getAllUsers().catch(() => []),
      ]);
      const usersMap = new Map<string, any>();
      allUsers.forEach((u) => usersMap.set(u.id, u));
      setShops(
        allShops.map((s) => ({
          ...s,
          ownerEmail: usersMap.get(s.ownerId)?.email || "N/A",
          ownerName: usersMap.get(s.ownerId)?.displayName || "N/A",
        }))
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to load shops");
    }
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    setQuotaInput(
      detailShop?.aiIntakeMonthlyLimit == null ? "" : String(detailShop.aiIntakeMonthlyLimit)
    );
  }, [detailShop]);

  const filtered = shops.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.ownerEmail?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleDeleteShop(id: string, name: string) {
    if (!confirm(`Una uhakika kutaka kufuta "${name}"? Kitendo hiki hakiwezi kutenduliwa.`)) return;
    try {
      await deleteShop(id);
      toast.success(`Duka "${name}" limefutwa`);
      loadData();
    } catch (err: any) { toast.error(err.message); }
  }

  async function handleTogglePublic(id: string, name: string, isPublic: boolean) {
    try {
      await updateShop(id, { isPublic });
      toast.success(`Duka "${name}" sasa ${isPublic ? "linaonekana hadharani" : "limefichwa"}`);
      loadData();
    } catch (err: any) { toast.error(err.message); }
  }

  async function handleSaveQuota(shop: ShopWithOwner, raw: string) {
    const trimmed = raw.trim();
    const value = trimmed === "" ? null : Number(trimmed);
    if (value !== null && (!Number.isInteger(value) || value < 0 || value > 32767)) {
      toast.error("Weka namba halali (0 = hakuna kikomo)");
      return;
    }
    try {
      await updateShop(shop.id, { aiIntakeMonthlyLimit: value });
      toast.success(
        `Kikomo cha AI cha "${shop.name}": ${
          value === null ? "chaguo-msingi" : value === 0 ? "hakuna kikomo" : `${value} picha/mwezi`
        }`
      );
      setDetailShop(null);
      loadData();
    } catch (err: any) { toast.error(err.message); }
  }

  function handleEnterTestMode(shop: ShopWithOwner) {
    localStorage.setItem("admin_test_mode", JSON.stringify({ shopId: shop.id, shopName: shop.name }));
    toast.success(`🧪 Unaingia majaribio ya "${shop.name}" — unaweza kurudi Admin Panel wakati wowote`, { duration: 5000 });
    navigate("/app");
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">{t("admin.shopsTitle") || "Shop Management"}</h1>
        <p className="page-description">{t("admin.shopsDesc") || "Monitor and manage all shops on the platform"}</p>
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search shops or owners..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading}>{loading ? "..." : t("common.refresh") || "Refresh"}</Button>
        <Button variant="outline" onClick={() => exportToCSV("shops.csv", filtered.map((s) => ({ name: s.name, location: s.location || "", phone: s.phone || "", owner: s.ownerName, ownerEmail: s.ownerEmail, public: s.isPublic ? "Yes" : "No", salesTotal: s.salesTotal || 0 })))}>
          📥 Export CSV
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader size={14} />
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.length === 0 ? (
            <div className="stat-card text-center py-12">
              <Store className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No shops found</p>
            </div>
          ) : (
            filtered.map((shop) => (
              <div key={shop.id} className="stat-card flex items-center justify-between gap-4 hover:border-primary/20 transition-colors group">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 overflow-hidden flex items-center justify-center shrink-0 border">
                    {shop.imageUrl ? (
                      <img src={shop.imageUrl} alt={shop.name} className="h-full w-full object-cover" />
                    ) : (
                      <Store className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground truncate flex items-center gap-2">
                      {shop.name}
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold", shop.isPublic ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500")}>
                        {shop.isPublic ? "Public" : "Pending"}
                      </span>
                      <Link to={`/maduka/${shop.id}`} target="_blank" className="text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" /> {shop.ownerName} ({shop.ownerEmail})</p>
                      {shop.location && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {shop.location}</p>}
                      {shop.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> {shop.phone}</p>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="hidden sm:block text-right mr-2">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase opacity-50">Sales</p>
                    <p className="font-mono text-sm">TZS {(shop.salesTotal || 0).toLocaleString()}</p>
                  </div>

                  {/* View Details */}
                  <Button size="sm" variant="ghost" onClick={() => setDetailShop(shop)} title="Maelezo ya Duka">
                    <Eye className="h-4 w-4" />
                  </Button>

                  {/* Test Mode */}
                  <Button size="sm" variant="ghost" onClick={() => handleEnterTestMode(shop)} title="Jaribu kama Duka hili" className="text-primary hover:bg-primary/10">
                    <TestTube2 className="h-4 w-4" />
                  </Button>

                  {/* Approve / Revoke */}
                  <Button variant={shop.isPublic ? "outline" : "default"} size="sm" onClick={() => handleTogglePublic(shop.id, shop.name, !shop.isPublic)}>
                    {shop.isPublic ? "Revoke" : "Approve"}
                  </Button>

                  {/* Delete */}
                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteShop(shop.id, shop.name)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Shop Detail Modal */}
      <Dialog open={!!detailShop} onOpenChange={(v) => !v && setDetailShop(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              {detailShop?.name}
            </DialogTitle>
          </DialogHeader>
          {detailShop && (
            <div className="space-y-4 mt-2">
              {detailShop.imageUrl && (
                <img src={detailShop.imageUrl} alt={detailShop.name} className="w-full h-40 object-cover rounded-xl" />
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Mmiliki</p>
                  <p className="text-sm font-semibold">{detailShop.ownerName}</p>
                  <p className="text-xs text-muted-foreground">{detailShop.ownerEmail}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Hali</p>
                  <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", detailShop.isPublic ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
                    {detailShop.isPublic ? "Public ✓" : "Inasubiri Idhini"}
                  </span>
                </div>
                {detailShop.location && (
                  <div className="rounded-lg bg-muted/50 p-3 col-span-2">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1 flex items-center gap-1"><MapPin className="h-3 w-3" />Mahali</p>
                    <p className="text-sm">{detailShop.location}</p>
                  </div>
                )}
                {detailShop.phone && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1 flex items-center gap-1"><Phone className="h-3 w-3" />Simu</p>
                    <p className="text-sm font-semibold">{detailShop.phone}</p>
                  </div>
                )}
                <div className="rounded-lg bg-success/5 border border-success/20 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1 flex items-center gap-1"><TrendingUp className="h-3 w-3" />Mauzo Jumla</p>
                  <p className="text-sm font-black text-success">TZS {(detailShop.salesTotal || 0).toLocaleString()}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 col-span-2">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1 flex items-center gap-1"><Sparkles className="h-3 w-3" />Kikomo cha Picha za AI (mwezi)</p>
                  <p className="text-xs text-muted-foreground mb-2">Acha wazi = chaguo-msingi wa mfumo; 0 = hakuna kikomo. Ingizo la QR halilipi kikomo.</p>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={32767}
                      value={quotaInput}
                      onChange={(e) => setQuotaInput(e.target.value)}
                      placeholder="Chaguo-msingi"
                      className="h-8 w-36"
                    />
                    <Button size="sm" onClick={() => handleSaveQuota(detailShop, quotaInput)}>Hifadhi</Button>
                  </div>
                </div>
                {detailShop.description && (
                  <div className="rounded-lg bg-muted/50 p-3 col-span-2">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Maelezo</p>
                    <p className="text-sm text-muted-foreground">{detailShop.description}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <Button className="flex-1 gap-2" onClick={() => { setDetailShop(null); handleEnterTestMode(detailShop); }}>
                  <TestTube2 className="h-4 w-4" /> Jaribu Duka Hili
                </Button>
                <Button variant="outline" asChild>
                  <Link to={`/maduka/${detailShop.id}`} target="_blank">
                    <ExternalLink className="h-4 w-4 mr-2" /> Preview
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
