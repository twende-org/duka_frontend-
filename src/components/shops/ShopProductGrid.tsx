import { useState, useEffect, useMemo } from "react";
import { 
  Store, 
  Edit, 
  Trash2, 
  MapPin, 
  Phone, 
  Package, 
  Eye, 
  AlertTriangle, 
  Share2,
  Facebook,
  ChevronRight,
  MoreVertical,
  Plus,
  Sparkles,
  Link as LinkIcon
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfessionalImage } from "@/components/common/ProfessionalImage";
import { getProductsByShop, stockMapFromProducts } from "@/lib/api/domains/storefront";
import { createSlug } from "@/lib/slug";
import { formatViews } from "@/lib/productViews";
import { useI18n } from "@/lib/i18n";
import type { Shop, Product } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import ShareShopDialog from "@/components/shops/ShareShopDialog";
import ShareProductsFeedDialog from "@/components/shops/ShareProductsFeedDialog";
import ShareSoldOutDialog from "@/components/shops/ShareSoldOutDialog";
import FacebookConnect from "@/components/shops/FacebookConnect";
import AIAdGeneratorDialog from "@/components/shops/AIAdGeneratorDialog";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface ShopProductGridProps {
  shop: Shop;
  onEdit: (shop: Shop) => void;
  onDelete: (id: string) => void;
  index: number;
}

export default function ShopProductGrid({ shop, onEdit, onDelete, index }: ShopProductGridProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

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

  const getStock = (productId: string) => stockMap.get(productId)?.quantity ?? 0;
  const inStockProducts = products.filter(p => getStock(p.id) > 0);

  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="mb-12 space-y-6"
    >
      {/* Premium Header - Minimalist & Clear */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border">
             {shop.imageUrl ? (
               <img src={shop.imageUrl} className="h-full w-full object-cover rounded-2xl" />
             ) : (
               <Store className="h-7 w-7" />
             )}
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-foreground">{shop.name}</h2>
            <div className="flex items-center gap-4 mt-1">
               {shop.location && (
                 <p className="text-xs text-muted-foreground flex items-center gap-1 font-bold">
                   <MapPin className="h-3 w-3 text-primary" /> {shop.location}
                 </p>
               )}
               {shop.phone && (
                 <p className="text-xs text-muted-foreground flex items-center gap-1 font-bold">
                   <Phone className="h-3 w-3 text-primary" /> {shop.phone}
                 </p>
               )}
               <p className="text-xs text-muted-foreground flex items-center gap-1 font-bold">
                 <Store className="h-3 w-3 text-primary" /> ID: {shop.id}
               </p>
            </div>
          </div>
        </div>

        {/* Action Center - Modern & Grouped */}
        <div className="flex items-center gap-2 flex-wrap">
          <ShareProductsFeedDialog
            shop={shop}
            products={products}
            stockMap={stockMap}
            trigger={
              <Button variant="default" className="gap-2 rounded-xl h-11 px-6 font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20">
                <Share2 className="h-4 w-4" /> Shiriki Bidhaa (AI)
              </Button>
            }
          />
          
          <div className="h-8 w-px bg-border mx-2 hidden sm:block" />

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-11 w-11 rounded-xl border-border/50 hover:bg-muted text-primary" 
              title="Copy Shop Link"
              onClick={() => {
                const url = `${window.location.origin}/shop/${shop.slug || createSlug(shop.name) || shop.id}`;
                navigator.clipboard.writeText(url);
                toast.success("Link ya duka imenakiliwa!");
              }}
            >
              <LinkIcon className="h-4 w-4" />
            </Button>

            <ShareShopDialog
              shopName={shop.name}
              shopId={shop.id}
              shopDescription={shop.description}
              shopPhone={shop.phone}
              shopLocation={shop.location}
              products={products}
              stockMap={stockMap}
              trigger={
                <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl border-border/50 hover:bg-muted" title="Download Shop Poster">
                  <Package className="h-4 w-4" />
                </Button>
              }
            />
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl border-border/50 hover:bg-blue-50" title="Facebook Connect">
                  <Facebook className="h-4 w-4 text-[#1877F2]" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader><DialogTitle>Facebook Integration — {shop.name}</DialogTitle></DialogHeader>
                <FacebookConnect shopId={shop.id} />
              </DialogContent>
            </Dialog>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl border-border/50">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl p-2">
                <DropdownMenuItem onClick={() => {
                  navigator.clipboard.writeText(shop.id);
                  toast.success("Shop ID copied to clipboard!");
                }} className="rounded-lg gap-2 cursor-pointer">
                  <LinkIcon className="h-4 w-4" /> Copy Shop ID
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(shop)} className="rounded-lg gap-2 cursor-pointer">
                  <Edit className="h-4 w-4" /> Edit Shop
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/dashboard/products")} className="rounded-lg gap-2 cursor-pointer">
                  <Plus className="h-4 w-4" /> Add Products
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(shop.id)} className="rounded-lg gap-2 text-destructive cursor-pointer hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" /> Delete Shop
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Products Grid - The "Whole Page" Experience */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="py-12 text-center rounded-[2rem] bg-muted/20 border-2 border-dashed flex flex-col items-center justify-center gap-4">
           <Package className="h-12 w-12 text-muted-foreground/30" />
           <div>
              <p className="font-bold text-muted-foreground">Hakuna bidhaa bado</p>
              <Button variant="link" onClick={() => navigate("/dashboard/products")}>Ongeza bidhaa ya kwanza</Button>
           </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
          {products.map((product) => {
            const isSoldOut = getStock(product.id) === 0;
            return (
            <motion.div 
              key={product.id}
              whileHover={{ y: -5 }}
              className="group relative"
            >
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted border shadow-sm transition-all group-hover:shadow-xl group-hover:border-primary/30">
                <ProfessionalImage src={product.imageUrl} alt={product.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                
                {/* Stock Indicator */}
                <div className="absolute top-2 right-2">
                   {isSoldOut ? (
                     <Badge variant="destructive" className="text-[8px] font-black uppercase tracking-tighter px-1.5 py-0">Out</Badge>
                   ) : (
                     <Badge className="bg-background/90 backdrop-blur-sm text-foreground text-[8px] font-black border-none px-1.5 py-0 shadow-sm">{getStock(product.id)} pcs</Badge>
                   )}
                </div>

                {/* Quick Share Hover Overlay — Sold Out vs In Stock */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2 p-2 backdrop-blur-[2px]">
                       <AIAdGeneratorDialog 
                         shop={shop} 
                         product={product} 
                         trigger={
                           <Button size="sm" className="rounded-xl h-10 w-10 p-0 bg-primary text-white shadow-xl hover:scale-110 active:scale-95" title="Generate AI Ad">
                             <Sparkles className="h-5 w-5" />
                           </Button>
                         }
                       />
                       {isSoldOut ? (
                         <ShareSoldOutDialog
                           shop={shop}
                           products={[product]}
                           stockMap={stockMap}
                           trigger={
                             <Button size="sm" className="rounded-xl h-10 w-10 p-0 bg-red-600 text-white shadow-xl hover:scale-110 active:scale-95" title="Tangaza Imeuzwa">
                               <Share2 className="h-5 w-5" />
                             </Button>
                           }
                         />
                       ) : (
                         <ShareProductsFeedDialog 
                           shop={shop} 
                           products={[product]} 
                           stockMap={stockMap}
                           trigger={
                             <Button size="sm" className="rounded-xl h-10 w-10 p-0 bg-white text-primary shadow-xl hover:scale-110 active:scale-95">
                               <Share2 className="h-5 w-5" />
                             </Button>
                           }
                         />
                       )}
                    </div>
              </div>
              <div className="mt-2 px-1">
                <h4 className={`text-xs font-black truncate transition-colors leading-tight ${ isSoldOut ? "text-muted-foreground group-hover:text-red-500" : "text-foreground group-hover:text-primary" }`}>
                  {product.name}
                </h4>
                <p className={`text-[10px] font-bold mt-0.5 ${ isSoldOut ? "text-red-500 line-through" : "text-primary" }`}>
                   TZS {product.sellingPrice.toLocaleString()}
                </p>
              </div>
            </motion.div>
            );
          })}
        </div>
      )}
    </motion.section>
  );
}
