import React from "react";
import { useAppSelector } from "@/store/hooks";
import { useCustomerInvoices, useCustomerPayments } from "@/hooks/useCustomerAR";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Receipt, FileText, Banknote } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { formatTZS } from "@/data/mockData";

export default function CustomerInvoices() {
  const user = useAppSelector((s) => s.auth.user);
  const { lang } = useI18n();
  const sw = lang === "sw";

  // Note: We need a generic shopId to fetch invoices if the customer buys from multiple shops,
  // but for simplicity in this portal, we'll fetch invoices where customerId = user.uid.
  // We'll use a hack to fetch all invoices by using a Cloud Function or modifying the hook,
  // but since we don't have that yet, we'll assume the customer is viewing invoices for a specific active shop.
  // For the sake of the UX mockup, we will display a unified view.

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 fade-in-up">
      <div className="flex items-center gap-2">
        <FileText className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">{sw ? "Ankara Zangu" : "My Invoices & Statements"}</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{sw ? "Kiasi Unachodaiwa" : "Total Outstanding"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatTZS(0)} {/* Real data would be aggregated here */}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">{sw ? "Ankara" : "Invoices"}</TabsTrigger>
          <TabsTrigger value="payments">{sw ? "Malipo Yangu" : "My Payments"}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{sw ? "Ankara Zote" : "All Invoices"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground border rounded-xl border-dashed">
                <FileText className="mx-auto h-10 w-10 opacity-20 mb-3" />
                <p>{sw ? "Hakuna ankara zilizopatikana." : "No invoices found."}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{sw ? "Historia ya Malipo" : "Payment History"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground border rounded-xl border-dashed">
                <Banknote className="mx-auto h-10 w-10 opacity-20 mb-3" />
                <p>{sw ? "Hakuna malipo yaliyopatikana." : "No payments found."}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
