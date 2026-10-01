import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Store, MapPin, Link as LinkIcon, CheckCircle2, ShieldCheck, Globe, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/common/PageHeader";
import { Loader } from "@/components/common/Loader";
import { ErrorAlert } from "@/components/ErrorAlert";
import { getWholesaleSuppliers } from "@/lib/api/domains/storefront";
import { useCreateSupplier, useSuppliers } from "@/hooks/useSuppliers";
import { useAppSelector } from "@/store/hooks";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { mapShopToSupplierFields } from "@/lib/supplierMapping";

import { toast } from "sonner";
import type { Shop } from "@/types";
import { useNavigate } from "react-router-dom";

export function DiscoverSuppliers() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const currentShopId = useAppSelector((state) => state.shops.currentShopId);
  const user = useAppSelector((state) => state.auth.user);
  const [suppliers, setSuppliers] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "linked" | "unlinked">("all");

  const { data: mySuppliers } = useSuppliers(currentShopId);
  const createSupplier = useCreateSupplier(currentShopId);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getWholesaleSuppliers();
        // Don't show our own shop in the directory
        setSuppliers(data.filter((s) => s.id !== currentShopId));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load suppliers.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentShopId]);

  const isAlreadyLinked = (platformShopId: string) => {
    return !!mySuppliers?.some((s) => s.platformShopId === platformShopId);
  };

  const searched = useMemo(() => suppliers.filter((s) => {
    const shopCats = s.businessCategories || s.categories || [];
    return s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.location?.toLowerCase().includes(search.toLowerCase()) ||
    shopCats.some(c => c.toLowerCase().includes(search.toLowerCase()));
  }), [suppliers, search]);

  const filteredSuppliers = useMemo(() => searched.filter((s) => {
    if (statusFilter === "linked") return isAlreadyLinked(s.id);
    if (statusFilter === "unlinked") return !isAlreadyLinked(s.id);
    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [searched, statusFilter, mySuppliers]);

  const linkedCount = useMemo(
    () => searched.filter((s) => isAlreadyLinked(s.id)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searched, mySuppliers]
  );

  const filterTabs = [
    { value: "all" as const, label: "Wote", count: searched.length },
    { value: "linked" as const, label: "Waliounganishwa", count: linkedCount },
    { value: "unlinked" as const, label: "Hawajaunganishwa", count: searched.length - linkedCount },
  ];

  const handleLinkSupplier = async (supplierShop: Shop) => {
    if (!currentShopId || !user) return;
    try {
      const mapped = mapShopToSupplierFields(supplierShop);
      await createSupplier.mutateAsync({
        shopId: currentShopId,
        name: mapped.name,
        phone: mapped.phone,
        email: "",
        address: mapped.address,
        products: mapped.products,
        notes: mapped.notes,
        ownerId: user.id,
        platformShopId: mapped.platformShopId,
      });
      toast.success(`${supplierShop.name} imeongezwa kama msambazaji wako!`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Imeshindwa kuongeza msambazaji.");
    }
  };


  return (
    <div className="space-y-6 pb-12 fade-in-up">
      <ErrorAlert error={error} onClear={() => setError(null)} />

      <PageHeader
        title="Soko la Jumla (Wholesale)"
        description="Gundua na unganisha na wasambazaji wa jumla kwenye mtandao wa Twende Duka."
        actions={
          <Button variant="outline" className="gap-2" onClick={() => navigate("/dashboard/suppliers")}>
            <Users className="h-4 w-4" /> Wasambazaji Wangu
          </Button>
        }
      />

      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Wasambazaji Waliopo</CardTitle>
            <Globe className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{suppliers.length}</div>
            <p className="text-xs text-muted-foreground">Kwenye mtandao</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Waliounganishwa</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{linkedCount}</div>
            <p className="text-xs text-muted-foreground">Kwenye duka lako</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Matokeo</CardTitle>
            <Search className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{filteredSuppliers.length}</div>
            <p className="text-xs text-muted-foreground">Yanayolingana na utafutaji</p>
          </CardContent>
        </Card>
      </div>

      {/* Search + filter pills */}
      <div className="space-y-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tafuta msambazaji kwa jina au eneo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-muted/50 border-none focus-visible:ring-1"
          />
        </div>

        <div className="-mx-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="inline-flex w-max h-auto gap-1 rounded-md bg-muted/50 p-1">
            {filterTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  "relative inline-flex items-center gap-2 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all duration-200",
                  statusFilter === tab.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span>{tab.label}</span>
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                  {tab.count}
                </span>
                {statusFilter === tab.value && (
                  <motion.span
                    layoutId="discover-suppliers-tab-underline"
                    className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader size={14} />
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="rounded-xl border bg-card px-4 py-12 text-center text-muted-foreground">
          <Store className="mx-auto h-8 w-8 mb-3 opacity-20" />
          <p className="font-medium text-foreground mb-1">Hakuna Wasambazaji Waliopatikana</p>
          <p className="text-sm">
            {search ? "Hakuna msambazaji anayelingana na utafutaji wako." : "Hakuna maduka yaliyojiorodhesha kama wasambazaji wa jumla kwa sasa."}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-sm [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
                <thead className="sticky top-0 z-10 bg-muted/50 backdrop-blur">
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Msambazaji</th>
                    <th className="px-4 py-3 font-medium">Bidhaa / Kategoria</th>
                    <th className="px-4 py-3 font-medium">Maelezo</th>
                    <th className="px-4 py-3 font-medium">Hali</th>
                    <th className="px-4 py-3 font-medium text-right">Kitendo</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <AnimatePresence initial={false} mode="popLayout">
                    {filteredSuppliers.map((shop, i) => {
                      const linked = isAlreadyLinked(shop.id);
                      return (
                        <motion.tr
                          key={shop.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.28, delay: Math.min(i, 8) * 0.03, ease: [0.22, 1, 0.36, 1] }}
                          className="group relative whitespace-nowrap align-middle transition-colors hover:bg-primary/5"
                        >
                          <td className="relative min-w-[320px] px-4 py-3 whitespace-nowrap">
                            <span className="absolute left-0 top-0 h-full w-0.5 scale-y-0 bg-primary transition-transform duration-200 group-hover:scale-y-100" />
                            <div className="flex min-w-[280px] flex-nowrap items-center gap-3">
                              {shop.imageUrl ? (
                                <img src={shop.imageUrl} alt={shop.name} className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                              ) : (
                                <div className="h-9 w-9 shrink-0 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                                  <Store className="h-4 w-4" />
                                </div>
                              )}
                              <div className="flex min-w-0 max-w-[360px] flex-nowrap items-center gap-2 overflow-hidden">
                                <span className="max-w-[150px] shrink truncate font-medium">{shop.name}</span>
                                {shop.isPublic && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />}
                                <span className="shrink-0 text-muted-foreground">·</span>
                                <span className="inline-flex min-w-0 shrink items-center gap-1 text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3 shrink-0" />
                                  <span className="max-w-[130px] truncate">{shop.location || "—"}</span>
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="min-w-[250px] px-4 py-3 whitespace-nowrap">
                            {shop.businessCategories && shop.businessCategories.length > 0 ? (
                              <div className="flex max-w-[240px] flex-nowrap items-center gap-1.5 overflow-hidden">
                                {shop.businessCategories.slice(0, 2).map((cat) => (
                                  <span key={cat} className="whitespace-nowrap rounded-md border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                    {cat}
                                  </span>
                                ))}
                                {shop.businessCategories.length > 2 && (
                                  <span className="text-[10px] text-muted-foreground">+{shop.businessCategories.length - 2}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="min-w-[260px] px-4 py-3 whitespace-nowrap">
                            <span className="block max-w-[260px] truncate text-muted-foreground">
                              {shop.description || "—"}
                            </span>
                          </td>
                          <td className="min-w-[150px] px-4 py-3 whitespace-nowrap">
                            {linked ? (
                              <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
                                <CheckCircle2 className="h-3 w-3 shrink-0" /> Imeunganishwa
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="min-w-[160px] px-4 py-3 whitespace-nowrap text-right">
                            {linked ? (
                              <Button size="sm" variant="outline" className="gap-2 pointer-events-none" disabled>
                                <CheckCircle2 className="h-4 w-4" /> Imeunganishwa
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                className="gap-2"
                                onClick={() => handleLinkSupplier(shop)}
                                disabled={createSupplier.isPending}
                              >
                                {createSupplier.isPending ? <Loader size={8} /> : <><LinkIcon className="h-4 w-4" /> Unganisha</>}
                              </Button>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile list */}
          <div className="md:hidden space-y-3">
            <AnimatePresence initial={false} mode="popLayout">
              {filteredSuppliers.map((shop, i) => {
                const linked = isAlreadyLinked(shop.id);
                return (
                  <motion.div
                    key={shop.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.28, delay: Math.min(i, 8) * 0.03, ease: [0.22, 1, 0.36, 1] }}
                    className="rounded-xl border bg-card p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      {shop.imageUrl ? (
                        <img src={shop.imageUrl} alt={shop.name} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="h-10 w-10 shrink-0 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                          <Store className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 font-semibold text-sm truncate">
                          <span className="truncate">{shop.name}</span>
                          {shop.isPublic && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{shop.location || "—"}</span>
                        </div>
                      </div>
                    </div>

                    {shop.businessCategories && shop.businessCategories.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {shop.businessCategories.slice(0, 3).map((cat) => (
                          <span key={cat} className="whitespace-nowrap rounded-md border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-4">
                      {linked ? (
                        <Button variant="outline" className="w-full gap-2 pointer-events-none" disabled>
                          <CheckCircle2 className="h-4 w-4" /> Imeunganishwa
                        </Button>
                      ) : (
                        <Button
                          className="w-full gap-2"
                          onClick={() => handleLinkSupplier(shop)}
                          disabled={createSupplier.isPending}
                        >
                          {createSupplier.isPending ? <Loader size={10} /> : <><LinkIcon className="h-4 w-4" /> Unganisha</>}
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </>
      )}

    </div>
  );
}
