import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAppSelector } from "@/store/hooks";
import { useBuyerSupplierBalances } from "@/hooks/useB2BFinance";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, ArrowRight, ArrowLeft, Search, HandCoins, Package, Users } from "lucide-react";
import SupplierAccountView from "@/components/purchases/SupplierAccountView";
import PageHeader from "@/components/common/PageHeader";
import { PageLoader } from "@/components/common/Loader";
import { formatTZS } from "@/data/mockData";
import { useI18n } from "@/lib/i18n";

export default function AccountsPayable() {
  const { t } = useI18n();
  const currentShopId = useAppSelector((s) => s.shops.currentShopId);
  const currentShop = useAppSelector((s) => s.shops.shops.find((shop) => shop.id === currentShopId));
  const { data: balances = [], isLoading } = useBuyerSupplierBalances(currentShop?.id || null);

  const [selectedBalanceId, setSelectedBalanceId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const metrics = useMemo(() => {
    let outstanding = 0;
    let paid = 0;
    let purchases = 0;
    balances.forEach((b) => {
      outstanding += b.outstandingBalance || 0;
      paid += b.paidAmount || 0;
      purchases += b.receivedGoodsValue || 0;
    });
    return { outstanding, paid, purchases, accounts: balances.length };
  }, [balances]);

  const kpiCards = [
    { title: t("ap.totalLiabilities"), value: formatTZS(metrics.outstanding), icon: Wallet, iconClass: "text-destructive" },
    { title: t("ap.totalPaid"), value: formatTZS(metrics.paid), icon: HandCoins, iconClass: "text-emerald-500" },
    { title: t("ap.totalPurchases"), value: formatTZS(metrics.purchases), icon: Package, iconClass: "text-primary" },
    { title: t("ap.activeAccounts"), value: String(metrics.accounts), icon: Users, iconClass: "text-blue-500" },
  ];

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? balances.filter((b) => (b.supplierShopId || "").toLowerCase().includes(q))
      : balances;
    return [...list].sort((a, b) => (b.outstandingBalance || 0) - (a.outstandingBalance || 0));
  }, [balances, search]);

  const countFor = (value: string) => {
    if (value === "all") return searched.length;
    if (value === "outstanding") return searched.filter((b) => (b.outstandingBalance || 0) > 0).length;
    return searched.filter((b) => (b.outstandingBalance || 0) <= 0).length;
  };

  const tabs = useMemo(() => ([
    { value: "all", label: t("ap.allAccounts") },
    { value: "outstanding", label: t("ap.outstanding") },
    { value: "settled", label: t("ap.settled") },
  ].map((tab) => ({ ...tab, count: countFor(tab.value) }))), [searched, t]);

  const filtered = useMemo(() => {
    if (statusFilter === "outstanding") return searched.filter((b) => (b.outstandingBalance || 0) > 0);
    if (statusFilter === "settled") return searched.filter((b) => (b.outstandingBalance || 0) <= 0);
    return searched;
  }, [searched, statusFilter]);

  if (selectedBalanceId) {
    const selectedBalance = balances.find((b) => b.id === selectedBalanceId);
    return (
      <div className="space-y-6 pb-12">
        <Button variant="ghost" size="sm" onClick={() => setSelectedBalanceId(null)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t("ap.backToAccountsPayable")}
        </Button>
        {selectedBalance && (
          <SupplierAccountView balance={selectedBalance} buyerShopId={currentShop!.id} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={t("ap.title")}
        description={t("ap.amountOwedToSuppliers")}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(({ title, value, icon: Icon, iconClass }) => (
          <Card key={title} className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <div className="flex flex-row items-center justify-between p-6 pb-2">
              <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
              <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} />
            </div>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight truncate">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("ap.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-muted/50 border-none focus-visible:ring-1"
              />
            </div>
          </div>

          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <div className="-mx-1 mb-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <TabsList className="inline-flex w-max h-auto gap-1 bg-muted/50 p-1">
                {tabs.map(({ value, label, count }) => (
                  <TabsTrigger key={value} value={value} className="relative gap-2 whitespace-nowrap transition-all duration-200 data-[state=active]:shadow-sm">
                    <span>{label}</span>
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                      {count}
                    </span>
                    {statusFilter === value && (
                      <motion.span
                        layoutId="ap-tab-underline"
                        className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-primary"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value={statusFilter} className="mt-0 outline-none">
              {isLoading ? (
                <PageLoader />
              ) : filtered.length === 0 ? (
                <div className="text-center py-16 rounded-xl border border-dashed">
                  <Wallet className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                  <h3 className="text-lg font-semibold text-foreground">{t("ap.noSupplierLiabilitiesFound")}</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1">
                    {t("ap.supplierBalances")}
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto rounded-xl border">
                    <Table className="min-w-[880px] [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap [&_td]:align-middle">
                      <TableHeader className="sticky top-0 bg-muted/40 backdrop-blur">
                        <TableRow>
                          <TableHead className="min-w-[260px]">{t("ap.supplierId")}</TableHead>
                          <TableHead>{t("ap.totalPurchases")}</TableHead>
                          <TableHead>{t("ap.paidAmount")}</TableHead>
                          <TableHead className="text-right">{t("ap.outstandingBalance")}</TableHead>
                          <TableHead className="text-right w-[1%]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((balance, index) => (
                          <motion.tr
                            key={balance.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.22, delay: Math.min(index * 0.03, 0.3) }}
                            className="group relative border-b transition-colors hover:bg-primary/5"
                          >
                            <TableCell className="relative font-medium max-w-[320px]">
                              <span className="absolute left-0 top-1/2 h-0 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300 group-hover:h-3/5" />
                              <span className="block truncate transition-transform duration-200 group-hover:translate-x-1">{balance.supplierShopId}</span>
                            </TableCell>
                            <TableCell className="tabular-nums">{formatTZS(balance.receivedGoodsValue || 0)}</TableCell>
                            <TableCell className="tabular-nums text-emerald-600">{formatTZS(balance.paidAmount || 0)}</TableCell>
                            <TableCell className="text-right font-bold tabular-nums text-destructive">
                              {formatTZS(balance.outstandingBalance || 0)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="outline" size="sm" className="shrink-0" onClick={() => setSelectedBalanceId(balance.id)}>
                                {t("ap.viewAccount")} <ArrowRight className="ml-2 h-4 w-4" />
                              </Button>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile cards */}
                  <div className="grid gap-3 md:hidden">
                    {filtered.map((balance, index) => (
                      <motion.div
                        key={balance.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.22, delay: Math.min(index * 0.04, 0.3) }}
                      >
                        <Card className="shadow-sm">
                          <CardContent className="p-4 space-y-3">
                            <p className="font-semibold truncate">{balance.supplierShopId}</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground">{t("ap.totalPurchases")}</p>
                                <p className="font-medium tabular-nums">{formatTZS(balance.receivedGoodsValue || 0)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">{t("ap.paidAmount")}</p>
                                <p className="font-medium tabular-nums text-emerald-600">{formatTZS(balance.paidAmount || 0)}</p>
                              </div>
                              <div className="col-span-2">
                                <p className="text-xs text-muted-foreground">{t("ap.outstandingBalance")}</p>
                                <p className="font-bold tabular-nums text-destructive">{formatTZS(balance.outstandingBalance || 0)}</p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm" className="w-full" onClick={() => setSelectedBalanceId(balance.id)}>
                              {t("ap.viewAccount")} <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
