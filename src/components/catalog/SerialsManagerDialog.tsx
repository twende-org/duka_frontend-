import { useMemo, useState } from "react";
import { Hash, Loader2, Search, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ImeiNumbersField from "./ImeiNumbersField";
import { useProductSerials, useAddProductSerials } from "@/hooks/useSerialItems";
import type { Product } from "@/types";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

interface Props {
  shopId: string | null;
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The per-product shelf of tracked devices: what is physically in stock and a
 * bulk restock entry. Both tabs read from the same endpoint the backend guards
 * with plain shop membership, so every role in the shop can audit it.
 */
export default function SerialsManagerDialog({ shopId, product, open, onOpenChange }: Props) {
  const { t } = useI18n();
  const [tab, setTab] = useState("shelf");
  const [search, setSearch] = useState("");
  const [pendingImeis, setPendingImeis] = useState<string[]>([]);
  const [addToStock, setAddToStock] = useState(true);

  const productId = open ? product?.id ?? null : null;
  const { data: serials = [], isLoading } = useProductSerials(productId, "in_stock");
  const addSerials = useAddProductSerials(shopId, productId);

  const shelfImeis = useMemo(() => serials.map((s) => s.imeiNumber), [serials]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return serials;
    return serials.filter((s) => s.imeiNumber.toLowerCase().includes(q));
  }, [serials, search]);

  const conflictsOnShelf = pendingImeis.filter((imei) => shelfImeis.includes(imei));

  const close = () => {
    onOpenChange(false);
    setSearch("");
    setPendingImeis([]);
    setAddToStock(true);
    setTab("shelf");
  };

  const handleSubmit = async () => {
    if (!pendingImeis.length || conflictsOnShelf.length > 0 || addSerials.isPending) return;
    try {
      const created = await addSerials.mutateAsync({ imeiNumbers: pendingImeis, addToStock });
      toast.success(t("serials.saved").replace("{n}", String(created.length)));
      setPendingImeis([]);
      setTab("shelf");
    } catch {
      // The mutation state carries the backend message; it renders inline below.
    }
  };

  const addBlocked = pendingImeis.length === 0 || conflictsOnShelf.length > 0 || addSerials.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent className="h-[100dvh] max-h-[100dvh] w-[100vw] max-w-[100vw] overflow-hidden rounded-none bg-background p-0 grid-rows-[auto_minmax(0,1fr)] sm:h-[92vh] sm:max-h-[92vh] sm:w-[560px] sm:max-w-[95vw] sm:rounded-3xl [&>button]:hidden">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-border/40 p-4 pr-2 sm:p-5">
          <div className="min-w-0">
            <DialogTitle className="text-base sm:text-lg">{t("serials.title")}</DialogTitle>
            <p className="mt-0.5 truncate text-xs font-semibold text-muted-foreground">
              {product?.name} · {t("serials.inStockCount").replace("{n}", String(serials.length))}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full" onClick={close} aria-label={t("common.close")}>
            <X className="h-5 w-5" />
          </Button>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-col">
          <div className="px-4 pt-3 sm:px-5">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="shelf">{t("serials.tabShelf")}</TabsTrigger>
              <TabsTrigger value="add">{t("serials.add")}</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="shelf" className="mt-0 min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("serials.searchPlaceholder")}
                className="h-10 rounded-xl bg-muted/50 pl-9 text-sm"
              />
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> {t("serials.loading")}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/50 py-14 text-center">
                <Hash className="mb-3 h-9 w-9 text-muted-foreground/30" />
                <p className="font-semibold text-muted-foreground">{t("serials.empty")}</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filtered.map((serial) => (
                  <div key={serial.id} className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2.5">
                    <Hash className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate font-mono text-xs font-semibold">{serial.imeiNumber}</span>
                    <Badge variant="secondary" className="rounded-md whitespace-nowrap text-[10px]">
                      {t("serials.statusInStock")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="add" className="mt-0 min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            <ImeiNumbersField
              value={pendingImeis}
              onChange={setPendingImeis}
              knownImeis={shelfImeis}
              scanTitle={t("serials.scanTitle")}
            />

            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border/60 p-3.5">
              <div className="min-w-0">
                <Label>{t("serials.addToStock")}</Label>
                <p className="text-xs text-muted-foreground">
                  {t("serials.addHint")}
                </p>
              </div>
              <Switch checked={addToStock} onCheckedChange={setAddToStock} />
            </div>

            {addSerials.error && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm font-semibold text-destructive">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="min-w-0 break-words">{addSerials.error.message}</span>
              </div>
            )}

            <Button
              className="mt-4 h-12 w-full rounded-xl text-sm font-black tracking-wide"
              disabled={addBlocked}
              onClick={handleSubmit}
            >
              {addSerials.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `${t("serials.add")} (${pendingImeis.length})`
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
