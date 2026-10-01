import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Search, Trash2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatTZS } from "@/data/mockData";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useProducts } from "@/hooks/useProducts";
import { useCreateB2BOrder } from "@/hooks/useB2BOrders";
import type { B2BPurchaseOrderItem } from "@/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
}

interface DraftLine {
  productId: string;
  sourceProductId?: string;
  productName: string;
  expectedQty: number;
  buyingPrice: number;
}

export function CreatePurchaseOrderDialog({ isOpen, onClose, shopId }: Props) {
  const { data: suppliers = [] } = useSuppliers(shopId);
  const [supplierId, setSupplierId] = useState("");
  
  const supplier = suppliers.find((s) => s.id === supplierId);
  
  // Only fetch products for the selected supplier
  const { data: supplierProducts = [] } = useProducts(supplier?.platformShopId || supplier?.id);
  const createPO = useCreateB2BOrder();

  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [lines, setLines] = useState<DraftLine[]>([]);

  const results = useMemo(() => {
    if (!supplier) return [];
    const q = search.trim().toLowerCase();
    return supplierProducts
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .filter((p) => !lines.some((l) => l.productId === p.id))
      .slice(0, 20);
  }, [supplierProducts, search, lines, supplier]);

  const showCustomAdd = search.trim().length > 0 && !results.some(p => p.name.toLowerCase() === search.trim().toLowerCase());

  const total = lines.reduce((sum, l) => sum + l.expectedQty * l.buyingPrice, 0);

  const reset = () => {
    setSupplierId("");
    setNotes("");
    setSearch("");
    setLines([]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const addLine = (productId: string) => {
    const p = supplierProducts.find((x) => x.id === productId);
    if (!p) return;
    
    const wholesalePriceObj = p.prices?.find((pr: any) => pr.type === 'wholesale');
    const wholesalePrice = wholesalePriceObj ? wholesalePriceObj.price : (p.wholesalePrice || p.sellingPrice || 0);

    setLines((prev) => [
      ...prev,
      { productId: p.id, productName: p.name, expectedQty: 1, buyingPrice: wholesalePrice },
    ]);
    setSearch("");
  };

  const addCustomLine = () => {
    if (!search.trim()) return;
    setLines((prev) => [
      ...prev,
      {
        productId: `custom_${Date.now()}`,
        productName: search.trim(),
        expectedQty: 1,
        buyingPrice: 0,
      },
    ]);
    setSearch("");
  };

  const updateLine = (productId: string, patch: Partial<DraftLine>) => {
    setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, ...patch } : l)));
  };

  const handleSubmit = async (status: "draft" | "submitted") => {
    if (!supplier) {
      toast.error("Chagua msambazaji (supplier) kwanza.");
      return;
    }
    const items: B2BPurchaseOrderItem[] = lines
      .filter((l) => l.expectedQty > 0)
      .map((l) => ({
        productId: l.productId,
        productName: l.productName,
        expectedQty: l.expectedQty,
        receivedQty: 0,
        buyingPrice: l.buyingPrice,
        subtotal: l.expectedQty * l.buyingPrice,
      }));

    if (items.length === 0) {
      toast.error("Ongeza angalau bidhaa moja kwenye oda.");
      return;
    }

    try {
      await createPO.mutateAsync({
        buyerShopId: shopId,
        supplierShopId: supplier.platformShopId || supplier.id,
        supplierName: supplier.name,
        status,
        items,
        subtotal: items.reduce((s, i) => s + i.subtotal, 0),
        totalAmount: items.reduce((s, i) => s + i.subtotal, 0),
        currency: "TZS",
        notes,
      });
      toast.success(status === "draft" ? "Oda imehifadhiwa kama rasimu." : "Oda ya manunuzi imetumwa.");
      handleClose();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Imeshindikana kutengeneza oda.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Purchase Order / Oda Mpya ya Manunuzi</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1 block">
              Supplier / Msambazaji
            </label>
            {suppliers.length === 0 ? (
              <p className="text-sm text-muted-foreground border border-dashed rounded-lg p-3">
                Huna wasambazaji bado. Ongeza msambazaji kwenye ukurasa wa Wasambazaji kwanza.
              </p>
            ) : (
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chagua msambazaji" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1 block">
              Add Items / Ongeza Bidhaa
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Tafuta bidhaa kwa jina..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              />
            </div>
            
            {(isFocused || search.trim().length > 0) && (
              <div className="mt-2 border rounded-lg divide-y overflow-hidden max-h-60 overflow-y-auto bg-card shadow-sm relative z-10">
                {results.length === 0 && !showCustomAdd && search.trim().length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Msambazaji huyu hana bidhaa kwenye mfumo.
                  </div>
                )}
                {results.map((p) => {
                  const wholesalePriceObj = p.prices?.find((pr: any) => pr.type === 'wholesale');
                  const wholesalePrice = wholesalePriceObj ? wholesalePriceObj.price : (p.wholesalePrice || p.sellingPrice || 0);
                  return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addLine(p.id)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/50"
                  >
                    <span className="font-medium">{p.name}</span>
                    <span className="text-muted-foreground flex items-center gap-2">
                      {formatTZS(wholesalePrice)} <Plus className="h-4 w-4" />
                    </span>
                  </button>
                  );
                })}
                
                {showCustomAdd && (
                  <button
                    type="button"
                    onClick={addCustomLine}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm bg-primary/5 hover:bg-primary/10 text-primary transition-colors"
                  >
                    <span className="font-medium">Ongeza "{search}" kama bidhaa mpya</span>
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {lines.length > 0 && (
            <div className="space-y-2">
              {lines.map((l) => (
                <div key={l.productId} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/20">
                  <span className="flex-1 text-sm font-medium truncate">{l.productName}</span>
                  <Input
                    type="number"
                    min={1}
                    className="w-20 h-9 text-center"
                    value={l.expectedQty}
                    onChange={(e) =>
                      updateLine(l.productId, { expectedQty: Math.max(0, parseInt(e.target.value) || 0) })
                    }
                  />
                  <Input
                    type="number"
                    min={0}
                    className="w-28 h-9 text-center"
                    value={l.buyingPrice}
                    onChange={(e) =>
                      updateLine(l.productId, { buyingPrice: Math.max(0, Number(e.target.value) || 0) })
                    }
                  />
                  <span className="w-28 text-right text-sm font-semibold">
                    {formatTZS(l.expectedQty * l.buyingPrice)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setLines((prev) => prev.filter((x) => x.productId !== l.productId))}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Total</span>
                <span className="text-xl font-black">{formatTZS(total)}</span>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1 block">
              Notes (Optional)
            </label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Maelezo ya ziada..." />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="secondary" disabled={createPO.isPending} onClick={() => handleSubmit("draft")}>
            Save Draft
          </Button>
          <Button disabled={createPO.isPending} onClick={() => handleSubmit("submitted")}>
            {createPO.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CreatePurchaseOrderDialog;
