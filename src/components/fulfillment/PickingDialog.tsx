import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PackageOpen, CheckCircle, AlertCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { Order, OrderItem } from "@/types";

interface PickingDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (items: OrderItem[]) => void;
}

export default function PickingDialog({ order, open, onOpenChange, onConfirm }: PickingDialogProps) {
  const { lang } = useI18n();
  const sw = lang === "sw";
  
  const [items, setItems] = useState<OrderItem[]>([]);

  useEffect(() => {
    if (order && open) {
      // Initialize pickedQty to 0 if not set
      setItems(order.items.map(item => ({
        ...item,
        pickedQty: item.pickedQty || 0
      })));
    }
  }, [order, open]);

  const handleQtyChange = (productId: string, value: string) => {
    const qty = parseInt(value) || 0;
    setItems(items.map(item => 
      item.productId === productId ? { ...item, pickedQty: Math.max(0, qty) } : item
    ));
  };

  const isComplete = items.every(item => item.pickedQty === item.quantity);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageOpen className="h-5 w-5 text-primary" />
            {sw ? "Uthibitisho wa Kuchukua Bidhaa (Picking)" : "Order Picking"}
          </DialogTitle>
        </DialogHeader>

        {order && (
          <div className="space-y-4 py-4">
            <div className="bg-muted/30 p-3 rounded-lg border">
              <p className="text-sm font-semibold">Order: #{order.id.slice(-6).toUpperCase()}</p>
              <p className="text-xs text-muted-foreground">{order.customerName}</p>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{sw ? "Bidhaa" : "Product"}</TableHead>
                  <TableHead className="text-center">{sw ? "Inayohitajika" : "Expected"}</TableHead>
                  <TableHead className="w-[120px] text-center">{sw ? "Iliyochukuliwa" : "Picked"}</TableHead>
                  <TableHead className="text-center">{sw ? "Hali" : "Status"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const picked = item.pickedQty || 0;
                  const isDone = picked === item.quantity;
                  const isOver = picked > item.quantity;

                  return (
                    <TableRow key={item.productId} className={isDone ? "bg-emerald-50/50 dark:bg-emerald-950/20" : ""}>
                      <TableCell className="font-medium text-sm">
                        {item.productName}
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        {item.quantity}
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number"
                          min="0"
                          className="h-8 text-center font-bold"
                          value={item.pickedQty === 0 ? "" : item.pickedQty}
                          onChange={(e) => handleQtyChange(item.productId, e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        {isDone ? (
                          <CheckCircle className="h-4 w-4 text-emerald-500 mx-auto" />
                        ) : isOver ? (
                          <Badge variant="destructive" className="text-[10px]">Over</Badge>
                        ) : (
                          <AlertCircle className="h-4 w-4 text-amber-500 mx-auto" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {sw ? "Ghairi" : "Cancel"}
          </Button>
          <Button onClick={() => onConfirm(items)} disabled={!isComplete} className="gap-2">
            <CheckCircle className="h-4 w-4" />
            {sw ? "Thibitisha na Funga" : "Confirm & Pack"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
