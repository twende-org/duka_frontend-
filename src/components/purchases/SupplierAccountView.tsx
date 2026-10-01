import React, { useState } from "react";
import { motion } from "framer-motion";
import { B2BSupplierBalance } from "@/types";
import { useBuyerInvoices, useBuyerPayments } from "@/hooks/useB2BFinance";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/common/PageHeader";
import { PageLoader } from "@/components/common/Loader";
import { Wallet, HandCoins, Package, FileText, Receipt } from "lucide-react";
import { formatTZS } from "@/data/mockData";
import RecordPaymentDialog from "./RecordPaymentDialog";
import { useI18n } from "@/lib/i18n";
import { toSafeDate } from "@/lib/utils";

interface Props {
  balance: B2BSupplierBalance;
  buyerShopId: string;
}

export default function SupplierAccountView({ balance, buyerShopId }: Props) {
  const { t } = useI18n();
  const { data: invoices, isLoading: loadingInvoices } = useBuyerInvoices(buyerShopId);
  const { data: payments, isLoading: loadingPayments } = useBuyerPayments(buyerShopId);

  const supplierInvoices = invoices?.filter(inv => inv.supplierShopId === balance.supplierShopId) || [];
  const supplierPayments = payments?.filter(pay => pay.supplierShopId === balance.supplierShopId) || [];

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [tab, setTab] = useState("invoices");

  const kpiCards = [
    { title: t("ap.outstandingBalance"), value: formatTZS(balance.outstandingBalance || 0), icon: Wallet, iconClass: "text-destructive" },
    { title: t("ap.totalPaid"), value: formatTZS(balance.paidAmount || 0), icon: HandCoins, iconClass: "text-emerald-500" },
    { title: t("ap.totalPurchases"), value: formatTZS(balance.receivedGoodsValue || 0), icon: Package, iconClass: "text-primary" },
  ];

  const tabs = [
    { value: "invoices", label: t("ap.invoices"), count: supplierInvoices.length },
    { value: "payments", label: t("ap.paymentHistory"), count: supplierPayments.length },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={<span className="truncate">{t("ap.supplierAccount")} {balance.supplierShopId}</span>}
        actions={
          <Button onClick={() => setPaymentDialogOpen(true)} className="shadow-sm whitespace-nowrap">
            {t("ap.recordPayment")}
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <Tabs value={tab} onValueChange={setTab}>
            <div className="-mx-1 mb-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <TabsList className="inline-flex w-max h-auto gap-1 bg-muted/50 p-1">
                {tabs.map(({ value, label, count }) => (
                  <TabsTrigger key={value} value={value} className="relative gap-2 whitespace-nowrap transition-all duration-200 data-[state=active]:shadow-sm">
                    <span>{label}</span>
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                      {count}
                    </span>
                    {tab === value && (
                      <motion.span
                        layoutId="ap-account-tab-underline"
                        className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-primary"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value="invoices" className="mt-0 outline-none">
              {loadingInvoices ? (
                <PageLoader />
              ) : supplierInvoices.length === 0 ? (
                <div className="text-center py-16 rounded-xl border border-dashed">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                  <h3 className="text-lg font-semibold text-foreground">{t("ap.noInvoicesRecorded")}</h3>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border">
                  <Table className="min-w-[720px] [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap [&_td]:align-middle">
                    <TableHeader className="sticky top-0 bg-muted/40 backdrop-blur">
                      <TableRow>
                        <TableHead>{t("ap.invoiceNumber")}</TableHead>
                        <TableHead>{t("ap.date")}</TableHead>
                        <TableHead>{t("ap.dueDate")}</TableHead>
                        <TableHead className="text-right">{t("ap.amount")}</TableHead>
                        <TableHead>{t("ap.status")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supplierInvoices.map((inv, index) => (
                        <motion.tr
                          key={inv.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.22, delay: Math.min(index * 0.03, 0.3) }}
                          className="group relative border-b transition-colors hover:bg-primary/5"
                        >
                          <TableCell className="relative font-medium"><span className="absolute left-0 top-1/2 h-0 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300 group-hover:h-3/5" /><span className="inline-block transition-transform duration-200 group-hover:translate-x-1">{inv.invoiceNumber}</span></TableCell>
                          <TableCell>{inv.invoiceDate}</TableCell>
                          <TableCell>{inv.dueDate}</TableCell>
                          <TableCell className="text-right tabular-nums font-medium">{formatTZS(inv.totalAmount || 0)}</TableCell>
                          <TableCell>
                            <Badge variant={inv.status === 'paid' ? 'default' : 'secondary'} className="whitespace-nowrap">
                              {inv.status}
                            </Badge>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="payments" className="mt-0 outline-none">
              {loadingPayments ? (
                <PageLoader />
              ) : supplierPayments.length === 0 ? (
                <div className="text-center py-16 rounded-xl border border-dashed">
                  <Receipt className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                  <h3 className="text-lg font-semibold text-foreground">{t("ap.noPaymentsRecorded")}</h3>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border">
                  <Table className="min-w-[640px] [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap [&_td]:align-middle">
                    <TableHeader className="sticky top-0 bg-muted/40 backdrop-blur">
                      <TableRow>
                        <TableHead>{t("ap.date")}</TableHead>
                        <TableHead>{t("ap.method")}</TableHead>
                        <TableHead>{t("ap.reference")}</TableHead>
                        <TableHead className="text-right">{t("ap.amount")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supplierPayments.map((pay, index) => {
                        const d = toSafeDate(pay.date)?.toLocaleDateString() ?? '-';

                        return (
                          <motion.tr
                            key={pay.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.22, delay: Math.min(index * 0.03, 0.3) }}
                            className="group relative border-b transition-colors hover:bg-primary/5"
                          >
                            <TableCell className="relative"><span className="absolute left-0 top-1/2 h-0 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300 group-hover:h-3/5" /><span className="inline-block transition-transform duration-200 group-hover:translate-x-1">{d}</span></TableCell>
                            <TableCell className="capitalize">{pay.method}</TableCell>
                            <TableCell className="max-w-[240px]">
                              <span className="block truncate">{pay.reference || '-'}</span>
                            </TableCell>
                            <TableCell className="text-right font-bold tabular-nums text-emerald-600">
                              {formatTZS(pay.amount || 0)}
                            </TableCell>
                          </motion.tr>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {paymentDialogOpen && (
        <RecordPaymentDialog
          balance={balance}
          buyerShopId={buyerShopId}
          onClose={() => setPaymentDialogOpen(false)}
        />
      )}
    </div>
  );
}
