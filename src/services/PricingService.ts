import type { Product } from "@/types";

export type CustomerType = "walk-in" | "retail" | "wholesale" | "corporate" | "reseller" | "distributor";

export interface PricingStrategy {
  calculatePrice(product: Product, quantity: number, customerType: CustomerType): number;
}

/**
 * Reusable Pricing Engine to support walk-in, retail, wholesale, corporate, reseller, and distributor tiers.
 */
export class PricingService implements PricingStrategy {
  private static instance: PricingService;

  private constructor() {}

  public static getInstance(): PricingService {
    if (!PricingService.instance) {
      PricingService.instance = new PricingService();
    }
    return PricingService.instance;
  }

  /**
   * Calculates unit price for a given product, quantity, and customer tier.
   * Resolves custom pricing tiers from product.prices, falling back to retail sellingPrice.
   */
  public calculatePrice(product: Product, _quantity: number, customerType: CustomerType): number {
    if (product.prices && product.prices.length > 0) {
      // 1. Direct match for tier
      const record = product.prices.find(
        (p) => p.type.toLowerCase() === customerType.toLowerCase()
      );
      if (record) return Number(record.price) || product.sellingPrice;

      // 2. Fallbacks for specific reseller/distributor mappings to wholesale
      if (customerType === "reseller" || customerType === "distributor") {
        const wholesaleRecord = product.prices.find(
          (p) => p.type.toLowerCase() === "wholesale"
        );
        if (wholesaleRecord) return Number(wholesaleRecord.price) || product.sellingPrice;
      }

      // 3. Fallback for walk-in or retail mapping
      const isRetailFallback = 
        customerType === "walk-in" || 
        customerType === "retail" || 
        customerType === "reseller" || 
        customerType === "distributor";
        
      if (isRetailFallback) {
        const retailRecord = product.prices.find(
          (p) => p.type.toLowerCase() === "retail"
        );
        if (retailRecord) return Number(retailRecord.price) || product.sellingPrice;
      }
    }

    // Ultimate fallback for backward compatibility
    return product.sellingPrice;
  }
}
