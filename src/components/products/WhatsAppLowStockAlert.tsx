import { useState } from "react";
import { MessageCircle, AlertTriangle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatTZS } from "@/data/mockData";
import { shareWhatsApp, openWhatsApp, buildLowStockMessage } from "@/lib/whatsapp";
import { useI18n } from "@/lib/i18n";
import type { Product, Stock } from "@/types";

interface Props {
  products: Product[];
  inventory: Stock[];
  shopName: string;
}

export default function WhatsAppLowStockAlert({ products, inventory, shopName }: Props) {
  const { t } = useI18n();
  const [phone, setPhone] = useState("");
  const [open, setOpen] = useState(false);

  const getProductStock = (id: string) => inventory.find(i => i.productId === id);

  const lowStockProducts = products
    .map(p => ({
      ...p,
      stock: getProductStock(p.id)?.quantity ?? 0,
      minStock: getProductStock(p.id)?.minStock ?? 5
    }))
    .filter(p => p.stock <= p.minStock);

  if (lowStockProducts.length === 0) return null;

  const handleShare = () => {
    const msg = buildLowStockMessage(lowStockProducts, shopName);
    shareWhatsApp(msg);
  };

  const handleSendToPhone = () => {
    if (!phone.trim()) return;
    const msg = buildLowStockMessage(lowStockProducts, shopName);
    openWhatsApp(phone, msg);
    setPhone("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/10">
          <MessageCircle className="h-4 w-4" />
          <AlertTriangle className="h-3 w-3" />
          {t("whatsapp.lowStockAlert")}
          <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] text-xs">{lowStockProducts.length}</Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {t("whatsapp.lowStockTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-60 overflow-y-auto space-y-2 my-3">
          {lowStockProducts.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg bg-destructive/5 border border-destructive/10">
              <div>
                <p className="text-sm font-medium text-foreground">{p.name}</p>
                {p.supplier && <p className="text-xs text-muted-foreground">{p.supplier}</p>}
              </div>
              <div className="text-right">
                <Badge variant="destructive" className="text-xs">
                  {p.stock} / {p.minStock} {p.unit || "pcs"}
                </Badge>
                <p className="text-xs text-muted-foreground mt-0.5">{formatTZS(p.sellingPrice)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Button onClick={handleShare} className="w-full bg-[#25D366] hover:bg-[#25D366]/90 text-white">
            <MessageCircle className="h-4 w-4 mr-2" />{t("whatsapp.shareGeneral")}
          </Button>

          <div className="flex gap-2">
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("whatsapp.enterPhone")}
              className="text-sm"
            />
            <Button onClick={handleSendToPhone} disabled={!phone.trim()} className="bg-[#25D366] hover:bg-[#25D366]/90 text-white px-4">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
