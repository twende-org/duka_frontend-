import React, { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Fuse from "fuse.js";
import { useAuth } from "@/components/AuthProvider";
import { useAppSelector } from "@/store/hooks";
import { useCustomerBalances, useCustomerInvoices } from "@/hooks/useCustomerAR";
import { getCustomers } from "@/lib/api/domains/customers";
import type { Customer } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Users, ArrowRight, DollarSign, Clock, CheckCircle, Search, ChevronRight, FileText } from "lucide-react";
import CustomerAccountView from "@/components/sales/CustomerAccountView";
import PageHeader from "@/components/common/PageHeader";
import { formatTZS } from "@/data/mockData";
import { useI18n } from "@/lib/i18n";
import { Loader } from "@/components/common/Loader";

export default function AccountsReceivable() {
  const { t } = useI18n();
  const currentShopId = useAppSelector((s) => s.shops.currentShopId);
  const currentShop = useAppSelector((s) => s.shops.shops.find((shop) => shop.id === currentShopId));
  const { data: balances, isLoading: loadingBalances } = useCustomerBalances(currentShop?.id);
  const { data: invoices, isLoading: loadingInvoices } = useCustomerInvoices(currentShop?.id);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [selectedBalanceId, setSelectedBalanceId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"all" | "active" | "paid">("all");

  const loadCustomers = useCallback(async () => {
    if (!currentShopId) return;
    try {
      const data = await getCustomers(currentShopId);
      setCustomers(data);
    } catch (err) {
      console.error(err);
    }
  }, [currentShopId]);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  // Combine balances with customer names
  const enhancedBalances = useMemo(() => {
    if (!balances) return [];
    return balances.map(b => {
      const customer = customers.find(c => c.id === b.customerId);
      return {
        ...b,
        customerName: customer ? customer.name : b.customerId,
        customerPhone: customer?.phone || "",
      };
    }).sort((a, b) => b.outstandingBalance - a.outstandingBalance);
  }, [balances, customers]);

  // Search
  const filteredBalances = useMemo(() => {
    if (!search.trim()) return enhancedBalances;
    const fuse = new Fuse(enhancedBalances, {
      keys: [
        { name: 'customerName', weight: 1.0 },
        { name: 'customerPhone', weight: 0.8 },
      ],
      threshold: 0.3,
      ignoreLocation: true,
      useExtendedSearch: true
    });
    return fuse.search(search).map(res => res.item);
  }, [enhancedBalances, search]);

  // Tabs filtering
  const tabbedBalances = useMemo(() => {
    if (activeTab === "active") return filteredBalances.filter(b => b.outstandingBalance > 0);
    if (activeTab === "paid") return filteredBalances.filter(b => b.outstandingBalance <= 0);
    return filteredBalances;
  }, [filteredBalances, activeTab]);

  // KPIs
  const totalOutstanding = balances?.reduce((acc, bal) => acc + (bal.outstandingBalance || 0), 0) || 0;
  const totalCollected = balances?.reduce((acc, bal) => acc + (bal.paidAmount || 0), 0) || 0;
  
  // Count overdue invoices
  const overdueInvoicesCount = invoices?.filter(inv => inv.status === "overdue").length || 0;
  const overdueAmount = invoices?.filter(inv => inv.status === "overdue").reduce((acc, inv) => acc + (inv.totalAmount || 0), 0) || 0;

  if (selectedBalanceId) {
    const selectedBalance = balances?.find(b => b.id === selectedBalanceId);
    return (
      <div className="space-y-6 fade-in-up pb-12">
        <Button variant="ghost" onClick={() => setSelectedBalanceId(null)} className="mb-2">
          <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
          {t("ar.backToAccountsReceivable")}
        </Button>
        {selectedBalance && currentShop && (
          <CustomerAccountView balance={selectedBalance} shopId={currentShop.id} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 fade-in-up">
      <PageHeader
        title={t("ar.title")}
        description={t("ar.description")}
      />

      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("ar.totalReceivables")}</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-foreground">
              {formatTZS(totalOutstanding)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t("ar.amountOwedByCustomers")}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("ar.totalCollected")}</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-500">
              {formatTZS(totalCollected)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t("ar.paymentsReceived")}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("ar.overdueAmount")}</CardTitle>
            <Clock className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {formatTZS(overdueAmount)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{overdueInvoicesCount} {t("ar.overdueInvoices")}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("ar.activeDebtors")}</CardTitle>
            <Users className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {balances?.filter(b => b.outstandingBalance > 0).length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t("ar.customersWithBalances")}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>{t("ar.customerLedger")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("common.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-muted/50 border-none focus-visible:ring-1"
              />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
            <div className="-mx-1 mb-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <TabsList className="inline-flex w-max h-auto gap-1 bg-muted/50 p-1">
                {([
                  ["all", "All Accounts", filteredBalances.length],
                  ["active", "Active Debtors", filteredBalances.filter(b => b.outstandingBalance > 0).length],
                  ["paid", "Paid Off", filteredBalances.filter(b => b.outstandingBalance <= 0).length],
                ] as const).map(([value, label, count]) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="relative gap-2 transition-all duration-200 data-[state=active]:shadow-sm"
                  >
                    <span>{label}</span>
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                      {count}
                    </span>
                    {activeTab === value && (
                      <motion.span
                        layoutId="ar-tab-underline"
                        className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-primary"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value={activeTab} className="mt-0 outline-none">

          {loadingBalances ? (
            <div className="flex justify-center py-20">
              <Loader size={14} />
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block rounded-xl border bg-card overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
                    <thead className="sticky top-0 z-10 text-xs text-muted-foreground bg-muted/50 backdrop-blur uppercase">
                      <tr>
                        <th className="px-4 py-3 font-medium">{t("ar.customer")}</th>
                        <th className="px-4 py-3 font-medium text-right">{t("ar.totalCredit")}</th>
                        <th className="px-4 py-3 font-medium text-right">{t("ar.paidAmount")}</th>
                        <th className="px-4 py-3 font-medium text-right">{t("ar.outstandingBalance")}</th>
                        <th className="px-4 py-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {tabbedBalances.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                              <Users className="mx-auto h-8 w-8 mb-3 opacity-20" />
                              {t("ar.noCustomerCreditAccountsFound")}
                            </motion.div>
                          </td>
                        </tr>
                      ) : (
                        <AnimatePresence initial={false} mode="popLayout">
                          {tabbedBalances.map((balance, i) => (
                            <motion.tr
                              key={balance.id}
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              transition={{ duration: 0.28, delay: Math.min(i, 12) * 0.03, ease: [0.22, 1, 0.36, 1] }}
                              onClick={() => setSelectedBalanceId(balance.id)}
                              className="group relative cursor-pointer transition-colors duration-200 hover:bg-primary/5"
                            >
                              <td className="relative px-4 py-3 font-medium">
                                <span className="absolute left-0 top-1/2 h-0 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300 group-hover:h-3/5" />
                                <div className="flex items-center gap-3 transition-transform duration-200 group-hover:translate-x-1">
                                  <div className="h-8 w-8 shrink-0 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                                    {balance.customerName.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="font-semibold">{balance.customerName}</div>
                                    {balance.customerPhone && <div className="text-xs text-muted-foreground">{balance.customerPhone}</div>}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right tabular-nums">
                                {formatTZS(balance.totalPurchases || 0)}
                              </td>
                              <td className="px-4 py-3 text-right tabular-nums text-emerald-600 font-medium">
                                {formatTZS(balance.paidAmount || 0)}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-blue-600 tabular-nums">
                                {formatTZS(balance.outstandingBalance || 0)}
                              </td>
                              <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-2">
                                  <div className="flex items-center gap-2 opacity-60 transition-all duration-200 group-hover:opacity-100">
                                    <Button size="sm" variant="outline" onClick={() => setSelectedBalanceId(balance.id)} className="gap-2 transition-transform duration-200 hover:-translate-y-0.5">
                                      <FileText className="h-4 w-4" />
                                      {t("ar.viewLedger")}
                                    </Button>
                                  </div>
                                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-all duration-200 group-hover:translate-x-1 group-hover:text-foreground" />
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile card list */}
              <div className="md:hidden space-y-3">
                {tabbedBalances.length === 0 ? (
                  <div className="rounded-xl border bg-card px-4 py-12 text-center text-muted-foreground">
                    <Users className="mx-auto h-8 w-8 mb-3 opacity-20" />
                    {t("ar.noCustomerCreditAccountsFound")}
                  </div>
                ) : (
                  <AnimatePresence initial={false} mode="popLayout">
                    {tabbedBalances.map((balance, i) => (
                      <motion.div
                        key={balance.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.28, delay: Math.min(i, 8) * 0.03, ease: [0.22, 1, 0.36, 1] }}
                        onClick={() => setSelectedBalanceId(balance.id)}
                        className="rounded-xl border bg-card p-4 shadow-sm active:scale-[0.99] transition-transform"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex items-center gap-3">
                            <div className="h-10 w-10 shrink-0 rounded-full bg-muted flex items-center justify-center font-semibold">
                              {balance.customerName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold truncate">{balance.customerName}</div>
                              {balance.customerPhone && <div className="text-xs text-muted-foreground truncate">{balance.customerPhone}</div>}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="font-bold text-blue-600 tabular-nums">{formatTZS(balance.outstandingBalance || 0)}</div>
                            <div className="text-xs text-muted-foreground">Outstanding</div>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-4 text-sm border-t pt-3">
                          <div>
                            <div className="text-xs text-muted-foreground">{t("ar.totalCredit")}</div>
                            <div className="font-medium tabular-nums">{formatTZS(balance.totalPurchases || 0)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">{t("ar.paidAmount")}</div>
                            <div className="font-medium text-emerald-600 tabular-nums">{formatTZS(balance.paidAmount || 0)}</div>
                          </div>
                        </div>

                        <div className="mt-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="outline" onClick={() => setSelectedBalanceId(balance.id)} className="w-full gap-2">
                            <FileText className="h-4 w-4" />
                            {t("ar.viewLedger")}
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
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
