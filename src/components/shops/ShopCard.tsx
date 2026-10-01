import { useState, useEffect, useMemo, useRef } from "react";
import { ProfessionalImage } from "@/components/common/ProfessionalImage";
import { Store, Edit, Trash2, MapPin, Phone, Package, Eye, AlertTriangle, Share2, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ShopMap from "@/components/ShopMap";
import ShareShopDialog from "@/components/shops/ShareShopDialog";
import { getProductsByShop, stockMapFromProducts } from "@/lib/api/domains/storefront";
import { useI18n } from "@/lib/i18n";
import type { Shop, Product } from "@/types";
import { Link } from "react-router-dom";
import { recordProductView, getProductViewsBatch, formatViews } from "@/lib/productViews";
import { Facebook } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import FacebookConnect from "@/components/shops/FacebookConnect";
import ShareProductsFeedDialog from "@/components/shops/ShareProductsFeedDialog";
import ShareSoldOutDialog from "@/components/shops/ShareSoldOutDialog";

interface ShopCardProps {
  shop: Shop;
  onEdit: (shop: Shop) => void;
  onDelete: (id: string) => void;
}

export default function ShopCard({ shop, onEdit, onDelete }: ShopCardProps) {
  const { t } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [expandedMap, setExpandedMap] = useState(false);
  const viewsRecorded = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getProductsByShop(shop.id)
      .then((p) => { if (!cancelled) setProducts(p); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [shop.id]);

  // Stock rides on each product row now; the map is only for the share dialogs.
  const stockMap = useMemo(() => stockMapFromProducts(products), [products]);

  // Record views silently & update counts
  useEffect(() => {
    if (products.length === 0) return;
    if (!viewsRecorded.current) {
      products.forEach((p) => recordProductView(p.id));
      viewsRecorded.current = true;
    }
    setViewCounts(getProductViewsBatch(products.map((p) => p.id)));
  }, [products]);

  const getStock = (productId: string) => stockMap.get(productId)?.quantity ?? 0;
  const getMinStock = (productId: string) => stockMap.get(productId)?.minStock ?? 0;

  const lowStock = products.filter((p) => { const s = getStock(p.id); return s <= getMinStock(p.id) && s > 0; });
  const outOfStock = products.filter((p) => getStock(p.id) === 0);
  const totalValue = products.reduce((s, p) => s + p.sellingPrice * getStock(p.id), 0);
  const displayProducts = products.slice(0, 6);

  return (
    <div className="rounded-2xl border bg-card text-card-foreground shadow-sm overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 glass-card group">
      {/* Top Media Section (Image or Map) */}
      <div
        className={`relative transition-all duration-300 cursor-pointer ${expandedMap ? "h-[200px]" : "h-[100px]"}`}
        onClick={() => setExpandedMap(!expandedMap)}
      >
        {shop.imageUrl && !expandedMap ? (
          <ProfessionalImage src={shop.imageUrl} alt={shop.name} className="h-full w-full object-cover" />
        ) : shop.location ? (
          <ShopMap
            location={shop.location}
            shopName={shop.name}
            lat={shop.lat}
            lon={shop.lon}
            className="h-full"
            compact
            showActions={expandedMap}
          />
        ) : (
          <div className="h-full w-full bg-primary/5 flex items-center justify-center">
            <Store className="h-8 w-8 text-primary/20" />
          </div>
        )}
      </div>

      {/* Header */}
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 overflow-hidden">
              {shop.imageUrl ? (
                <ProfessionalImage src={shop.imageUrl} alt={shop.name} className="h-full w-full object-cover" />
              ) : (
                <Store className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-foreground leading-tight">{shop.name}</h3>
              {shop.location && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3 text-primary" />
                  <span className="truncate max-w-[180px]">{shop.location}</span>
                </p>
              )}
              <div className="flex items-center gap-1 mt-1">
                <span className="font-mono text-[10px] bg-muted/50 px-1.5 py-0.5 rounded text-primary/80 truncate max-w-[120px]" title="Twende Duka Shop ID">
                  ID: {shop.id}
                </span>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    navigator.clipboard.writeText(shop.id); 
                    toast.success("Shop ID copied to clipboard!"); 
                  }} 
                  className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy Shop ID"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <Dialog>
              <DialogTrigger asChild>
                <button className="rounded-lg p-1.5 hover:bg-blue-50 transition-colors">
                  <Facebook className="h-4 w-4 text-[#1877F2]" />
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Facebook Integration — {shop.name}</DialogTitle>
                </DialogHeader>
                <FacebookConnect shopId={shop.id} />
              </DialogContent>
            </Dialog>
            <ShareShopDialog
              shopName={shop.name}
              shopId={shop.id}
              shopDescription={shop.description}
              shopPhone={shop.phone}
              shopLocation={shop.location}
              shopImageUrl={shop.imageUrl}
              products={products}
              stockMap={stockMap}
              trigger={
                <button className="rounded-lg p-1.5 hover:bg-muted transition-colors">
                  <Share2 className="h-4 w-4 text-muted-foreground" />
                </button>
              }
            />
            <ShareProductsFeedDialog
              shop={shop}
              products={products}
              stockMap={stockMap}
              trigger={
                <button className="rounded-lg p-1.5 hover:bg-primary/10 transition-colors">
                  <Package className="h-4 w-4 text-primary" />
                </button>
              }
            />
            {outOfStock.length > 0 && (
              <ShareSoldOutDialog
                shop={shop}
                products={products}
                stockMap={stockMap}
              />
            )}
            <button onClick={() => onEdit(shop)} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
              <Edit className="h-4 w-4 text-muted-foreground" />
            </button>
            <button onClick={() => onDelete(shop.id)} className="rounded-lg p-1.5 hover:bg-destructive/10 transition-colors">
              <Trash2 className="h-4 w-4 text-destructive" />
            </button>
          </div>
        </div>

        {shop.phone && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 ml-[52px]">
            <Phone className="h-3 w-3 text-primary" /> {shop.phone}
          </p>
        )}
      </div>

      {/* Stats Row */}
      <div className="px-4 py-2 flex gap-2 flex-wrap">
        <Badge variant="secondary" className="text-[10px] uppercase font-bold gap-1 px-2 py-0.5">
          <Package className="h-3 w-3" /> {products.length} {t("nav.products")}
        </Badge>
        {outOfStock.length > 0 && (
          <Badge variant="destructive" className="text-xs gap-1">
            <AlertTriangle className="h-3 w-3" /> {outOfStock.length} out
          </Badge>
        )}
        {lowStock.length > 0 && (
          <Badge className="text-xs gap-1 bg-warning/15 text-warning border-warning/30">
            <AlertTriangle className="h-3 w-3" /> {lowStock.length} low
          </Badge>
        )}
        <Badge variant="outline" className="text-[10px] font-black ml-auto border-primary/20 text-primary bg-primary/5">
          TZS {totalValue.toLocaleString()}
        </Badge>
      </div>

      {/* Product Mini Grid */}
      <div className="px-4 pb-3">
        {loading ? (
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : displayProducts.length === 0 ? (
          <div className="text-center py-4 rounded-lg bg-muted/30">
            <Package className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">{t("products.noProducts")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {displayProducts.map((product) => (
              <div
                key={product.id}
                className="group/item relative rounded-xl border bg-background/50 overflow-hidden transition-all hover:shadow-lg hover:border-primary/40"
              >
                <div className="aspect-square w-full bg-muted/30 relative overflow-hidden">
                  {product.imageUrl ? (
                    <ProfessionalImage
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover/item:scale-110"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted">
                      <Package className="h-6 w-6 text-muted-foreground/60" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    {getStock(product.id) > 0 ? (
                      <>
                        <ShareProductsFeedDialog
                          shop={shop}
                          products={[product]}
                          stockMap={stockMap}
                          trigger={
                            <Button size="icon" variant="secondary" className="h-10 w-10 rounded-full shadow-lg bg-white hover:bg-primary/10 text-primary border-none">
                              <Share2 className="h-5 w-5" />
                            </Button>
                          }
                        />
                        <ShareSoldOutDialog
                          shop={shop}
                          products={[product]}
                          stockMap={stockMap}
                          trigger={
                            <Button size="icon" variant="secondary" className="h-10 w-10 rounded-full shadow-lg bg-white hover:bg-red-50 text-red-600 border-none">
                              <Package className="h-5 w-5" />
                            </Button>
                          }
                        />
                      </>
                    ) : (
                      <ShareSoldOutDialog
                        shop={shop}
                        products={[product]}
                        stockMap={stockMap}
                        trigger={
                          <Button size="icon" variant="secondary" className="h-10 w-10 rounded-full shadow-lg bg-white hover:bg-red-50 text-red-600 border-none">
                            <Share2 className="h-5 w-5" />
                          </Button>
                        }
                      />
                    )}
                  </div>
                  
                  {getStock(product.id) === 0 && (
                    <div className="absolute inset-0 bg-destructive/10 backdrop-blur-[0.5px] pointer-events-none flex items-center justify-center">
                      <span className="text-[9px] font-bold text-destructive bg-background/90 px-1.5 py-0.5 rounded-full shadow-sm">OUT</span>
                    </div>
                  )}
                  {getStock(product.id) > 0 && getStock(product.id) <= getMinStock(product.id) && (
                    <div className="absolute top-1 right-1">
                      <span className="flex h-2 w-2 rounded-full bg-warning shadow-sm" />
                    </div>
                  )}
                </div>
                <div className="p-1.5">
                  <p className="text-[10px] font-medium text-foreground truncate leading-tight">
                    {product.name}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground">
                      {getStock(product.id) > 0 ? `${getStock(product.id)} pcs` : (
                        <span className="text-destructive font-medium">Sold out</span>
                      )}
                    </p>
                    <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground/70">
                      <Eye className="h-2.5 w-2.5" />
                      {formatViews(viewCounts[product.id] || 0)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {products.length > 6 && (
        <div className="px-4 pb-3">
          <p className="text-[11px] text-muted-foreground text-center">
            +{products.length - 6} {t("nav.products")}
          </p>
        </div>
      )}
    </div>
  );
}
