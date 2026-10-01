import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchInventory } from "@/store/inventorySlice";
import { useBusinessIntelligence } from "@/hooks/useBusinessIntelligence";
import { ExecutiveSummary } from "@/components/command-center/ExecutiveSummary";
import { ProductIntelligence } from "@/components/command-center/ProductIntelligence";
import { CustomerIntelligence } from "@/components/command-center/CustomerIntelligence";
import { SupplierIntelligence } from "@/components/command-center/SupplierIntelligence";
import { TwendeAIAssistant } from "@/components/command-center/TwendeAIAssistant";
import { ErrorAlert } from "@/components/ErrorAlert";
import { useI18n } from "@/lib/i18n";
import PageHeader from "@/components/common/PageHeader";
import Loader from "@/components/common/Loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { Store } from "lucide-react";

export default function CommandCenter() {
  const dispatch = useAppDispatch();
  const currentShopId = useAppSelector((s) => s.shops.currentShopId);
  const shops = useAppSelector((s) => s.shops.shops);
  const currentShop = shops.find((s) => s.id === currentShopId);
  const user = useAppSelector((s) => s.auth.user);
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState("products");

  useEffect(() => {
    if (currentShopId) {
      dispatch(fetchInventory(currentShopId));
    }
  }, [currentShopId, dispatch]);

  const {
    sales,
    finance,
    productInt,
    customerInt,
    supplierInt,
    isLoading,
    aiPayload,
  } = useBusinessIntelligence(currentShopId);

  if (!currentShopId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <ErrorAlert error={null} onClear={() => {}} />
        <h2 className="text-xl font-bold">{t("commandCenter.noShop") || "Please select or add a shop first."}</h2>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader />
      </div>
    );
  }

  const tabs = [
    ["products", t("common.products") || "Products", productInt.totalProducts],
    ["customers", t("common.customers") || "Customers", customerInt.totalCustomers],
    ["suppliers", t("common.suppliers") || "Suppliers", supplierInt.totalSuppliers],
  ] as const;

  return (
    <div className="space-y-6 pb-12 fade-in-up">
      <PageHeader
        title={t("commandCenter.title") || "Business Command Center"}
        description={`${t("commandCenter.welcome") || "Welcome back"}, ${user?.displayName || ""}. ${t("commandCenter.subtitle") || "Here is your executive overview."}`}
        actions={
          currentShop ? (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
              <Store className="h-4 w-4 text-orange-500" />
              <span className="max-w-[180px] truncate font-medium">{currentShop.name}</span>
            </div>
          ) : undefined
        }
      />

      <ExecutiveSummary sales={sales} finance={finance} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>{t("commandCenter.bi") || "Business Intelligence"}</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="-mx-1 mb-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <TabsList className="inline-flex w-max h-auto gap-1 bg-muted/50 p-1">
                    {tabs.map(([value, label, count]) => (
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
                            layoutId="cc-tab-underline"
                            className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-primary"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                          />
                        )}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                <TabsContent value="products" className="mt-0 outline-none">
                  <ProductIntelligence productInt={productInt} />
                </TabsContent>
                <TabsContent value="customers" className="mt-0 outline-none">
                  <CustomerIntelligence customerInt={customerInt} />
                </TabsContent>
                <TabsContent value="suppliers" className="mt-0 outline-none">
                  <SupplierIntelligence supplierInt={supplierInt} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="xl:col-span-1">
          {/* Twende AI Assistant UI */}
          <TwendeAIAssistant />
        </div>
      </div>

      {/* Hidden Data Context for Twende AI */}
      <script type="application/json" id="twende-ai-context">
        {JSON.stringify(aiPayload)}
      </script>
    </div>
  );
}
