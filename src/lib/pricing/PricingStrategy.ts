import { Product } from "@/types";
import { PricingService, type CustomerType } from "@/services/PricingService";

export interface PricingContext {
  customerType: "retail" | "wholesale" | "corporate" | "reseller" | "distributor";
  quantity: number;
  companyId?: string; // Selected corporate B2B identifier
}

export interface PricingStrategy {
  calculatePrice(product: Product, context: PricingContext): number;
}

export class PricingEngine {
  calculate(product: Product, context: PricingContext): number {
    const mappedType = context.customerType as CustomerType;
    return PricingService.getInstance().calculatePrice(product, context.quantity, mappedType);
  }
}

export const pricingEngine = new PricingEngine();
export default pricingEngine;
