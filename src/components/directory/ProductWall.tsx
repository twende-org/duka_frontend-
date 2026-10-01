import { motion } from "framer-motion";
import { MarketplaceProductCard } from "./MarketplaceProductCard";
import type { Product, Shop } from "@/types";

interface ProductWallProps {
  products: Array<{
    product: Product;
    shop: Shop;
    stockQty?: number;
  }>;
  children?: React.ReactNode;
  isMerchant?: boolean;
  onProductClick?: (item: { product: Product; shop: Shop }) => void;
}

export function ProductWall({ products, children, isMerchant = false, onProductClick }: ProductWallProps) {
  if (products.length === 0 && !children) return null;

  return (
    <div className="w-full relative">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 items-start">
        {children}
        {products.map((item, i) => (
          <motion.div
            key={`${item.product.id}-${i}`}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.45, delay: (i % 4) * 0.07, ease: [0.21, 0.45, 0.32, 0.9] }}
          >
            <MarketplaceProductCard 
              product={item.product}
              shop={item.shop}
              onClick={onProductClick ? () => onProductClick(item) : undefined}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
