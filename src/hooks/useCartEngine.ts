import { useState, useMemo, useEffect } from "react";
import type { Product, Customer } from "@/types";
import { type CustomerType, PricingService } from "@/services/PricingService";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
  lineTotal: number;
}

export function useCartEngine(products: Product[], getProductStock: (id: string) => number) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerType, setCustomerType] = useState<CustomerType>("walk-in");
  const { t } = useI18n();

  // Recalculate prices when customer type changes
  useEffect(() => {
    setCart((prev) => prev.map((item) => {
      const unitPrice = PricingService.getInstance().calculatePrice(item.product, item.quantity, customerType);
      const disc = item.discount || 0;
      return {
        ...item,
        lineTotal: Math.round(unitPrice * (1 - disc / 100) * item.quantity)
      };
    }));
  }, [customerType]);

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.lineTotal, 0), [cart]);
  
  const estimatedProfit = useMemo(() => {
    return cart.reduce((sum, item) => {
      const buyingPrice = item.product.buyingPrice || 0;
      return sum + (item.lineTotal - (buyingPrice * item.quantity));
    }, 0);
  }, [cart]);

  const addToCart = (p: Product, qty: number = 1) => {
    const stock = getProductStock(p.id);
    const existingIdx = cart.findIndex((c) => c.product.id === p.id);
    const currentCartQty = existingIdx >= 0 ? cart[existingIdx].quantity : 0;
    
    if (currentCartQty + qty > stock) {
      toast.error(`${t("sales.stockInsufficient")} ${t("sales.remaining")}: ${stock - currentCartQty}`);
      return false;
    }

    const unitPrice = PricingService.getInstance().calculatePrice(p, qty, customerType);

    setCart((prev) => {
      if (existingIdx >= 0) {
        const updated = [...prev];
        const newQty = updated[existingIdx].quantity + qty;
        const disc = updated[existingIdx].discount || 0;
        updated[existingIdx] = { 
          ...updated[existingIdx], 
          quantity: newQty, 
          lineTotal: Math.round(unitPrice * (1 - disc / 100) * newQty) 
        };
        return updated;
      } else {
        return [...prev, { product: p, quantity: qty, discount: 0, lineTotal: Math.round(unitPrice * qty) }];
      }
    });
    
    toast.success(`${p.name} added ✓`, { duration: 600 });
    return true;
  };

  const removeFromCart = (idx: number) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateCartQty = (idx: number, newQty: any) => {
    if (newQty === "") {
      setCart((prev) => {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], quantity: "" as any, lineTotal: 0 };
        return updated;
      });
      return;
    }
    
    const parsed = parseInt(newQty);
    if (isNaN(parsed) || parsed < 1) return;
    
    const item = cart[idx];
    const stock = getProductStock(item.product.id);
    if (parsed > stock) {
      toast.error(`${t("sales.stockInsufficient")} Max: ${stock}`);
      return;
    }
    
    const unitPrice = PricingService.getInstance().calculatePrice(item.product, parsed, customerType);
    const disc = parseInt(item.discount as any) || 0;
    
    setCart((prev) => {
      const updated = [...prev];
      updated[idx] = { 
        ...item, 
        quantity: parsed, 
        lineTotal: Math.round(unitPrice * (1 - disc / 100) * parsed) 
      };
      return updated;
    });
  };

  const updateCartDiscount = (idx: number, disc: any) => {
    if (disc === "") {
      setCart((prev) => {
        const updated = [...prev];
        const item = updated[idx];
        const qty = parseInt(item.quantity as any) || 0;
        const unitPrice = PricingService.getInstance().calculatePrice(item.product, qty, customerType);
        updated[idx] = { ...item, discount: "" as any, lineTotal: Math.round(unitPrice * qty) };
        return updated;
      });
      return;
    }
    
    const parsed = parseInt(disc);
    if (isNaN(parsed)) return;
    
    const clamped = Math.max(0, Math.min(100, parsed));
    
    setCart((prev) => {
      const updated = [...prev];
      const item = updated[idx];
      const qty = parseInt(item.quantity as any) || 0;
      const unitPrice = PricingService.getInstance().calculatePrice(item.product, qty, customerType);
      updated[idx] = { 
        ...item, 
        discount: clamped, 
        lineTotal: Math.round(unitPrice * (1 - clamped / 100) * qty) 
      };
      return updated;
    });
  };

  const clearCart = () => setCart([]);

  return {
    cart,
    setCart,
    cartTotal,
    estimatedProfit,
    customerType,
    setCustomerType,
    addToCart,
    removeFromCart,
    updateCartQty,
    updateCartDiscount,
    clearCart
  };
}
