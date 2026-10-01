import React, { useState } from "react";
import type { CustomerBalance } from "@/types";
import { useCustomerInvoices, useCustomerPayments } from "@/hooks/useCustomerAR";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import RecordCustomerPaymentDialog from "./RecordCustomerPaymentDialog";
import { useI18n } from "@/lib/i18n";

interface Props {
  balance: CustomerBalance;
  shopId: string;
}

export default function CustomerAccountView({ balance, shopId }: Props) {
  const { t } = useI18n();
  const { data: allInvoices, isLoading: loadingInvoices } = useCustomerInvoices(shopId);
  const { data: allPayments, isLoading: loadingPayments } = useCustomerPayments(shopId);

  const customerInvoices = allInvoices?.filter(inv => inv.customerId === balance.customerId) || [];
  const customerPayments = allPayments?.filter(pay => pay.customerId === balance.customerId) || [];

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{t("ar.customerAccount")} {balance.customerId}</h2>
        <Button onClick={() => setPaymentDialogOpen(true)} disabled={balance.outstandingBalance <= 0}>
          {t("ar.recordPayment")}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("ar.outstandingBalance")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {(balance.outstandingBalance || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t("ar.amountOwedByCustomer")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("ar.totalPaid")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {(balance.paidAmount || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t("ar.totalCollected")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("ar.totalCreditPurchases")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {(balance.totalPurchases || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t("ar.lifetimeValueOnCredit")}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">{t("ar.invoices")}</TabsTrigger>
          <TabsTrigger value="payments">{t("ar.paymentHistory")}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>{t("ar.customerInvoices")}</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingInvoices ? (
                <div className="h-20 bg-muted animate-pulse rounded" />
              ) : customerInvoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">{t("ar.noInvoicesRecorded")}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("ar.invoiceNumber")}</TableHead>
                      <TableHead>{t("ar.date")}</TableHead>
                      <TableHead>{t("ar.dueDate")}</TableHead>
                      <TableHead className="text-right">{t("ar.amount")}</TableHead>
                      <TableHead className="text-center">{t("ar.status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerInvoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                        <TableCell>
                          {(inv.createdAt as any)?.toDate?.()?.toLocaleDateString() || new Date(inv.createdAt as string).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{inv.dueDate || "N/A"}</TableCell>
                        <TableCell className="text-right font-medium">{(inv.totalAmount || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={inv.status === 'paid' ? 'default' : inv.status === 'overdue' ? 'destructive' : 'secondary'}>
                            {inv.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>{t("ar.paymentHistory")}</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPayments ? (
                <div className="h-20 bg-muted animate-pulse rounded" />
              ) : customerPayments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">{t("ar.noPaymentsRecorded")}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("ar.date")}</TableHead>
                      <TableHead>{t("ar.method")}</TableHead>
                      <TableHead>{t("ar.reference")}</TableHead>
                      <TableHead className="text-right">{t("ar.amount")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerPayments.map((pay) => (
                      <TableRow key={pay.id}>
                        <TableCell>
                          {(pay.createdAt as any)?.toDate?.()?.toLocaleString() || new Date(pay.createdAt as string).toLocaleString()}
                        </TableCell>
                        <TableCell>{pay.method}</TableCell>
                        <TableCell>{pay.reference || "—"}</TableCell>
                        <TableCell className="text-right text-emerald-600 font-bold">
                          +{(pay.amount || 0).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {paymentDialogOpen && (
        <RecordCustomerPaymentDialog
          balance={balance}
          shopId={shopId}
          onClose={() => setPaymentDialogOpen(false)}
        />
      )}
    </div>
  );
}
