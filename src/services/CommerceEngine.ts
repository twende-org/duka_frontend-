import { addSaleWithSummary, addDraftSale } from "@/lib/api/domains/sales";
import type { Sale } from "@/types";

export interface SaleCompletedEvent {
  sale: Sale;
  profit: number;
  timestamp: string;
}

export type SaleCompletedListener = (event: SaleCompletedEvent) => void | Promise<void>;

/**
 * Commerce Engine serving as the central orchestration point for sales transactions.
 * Enables decoupling checkout database writes from secondary business events.
 */
export class CommerceEngine {
  private static instance: CommerceEngine;
  private listeners: SaleCompletedListener[] = [];

  private constructor() {}

  public static getInstance(): CommerceEngine {
    if (!CommerceEngine.instance) {
      CommerceEngine.instance = new CommerceEngine();
    }
    return CommerceEngine.instance;
  }

  /**
   * Registers a listener for post-sale execution side effects (AI pipeline, custom logging, analytics).
   */
  public registerListener(listener: SaleCompletedListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Orchestrates completed sale execution.
   */
  public async executeSaleCheckout(
    shopId: string,
    saleData: Omit<Sale, "id">,
    profit: number
  ): Promise<Sale> {
    // 1. Transaction Database Write (atomically: dec stock, write sale log, inc summary)
    const id = await addSaleWithSummary(saleData, profit);
    const sale = { ...saleData, id, status: "completed" as const } as Sale;

    // 2. Dispatch business event triggers asynchronously (e.g. AI forecasting, logging)
    const event: SaleCompletedEvent = {
      sale,
      profit,
      timestamp: new Date().toISOString(),
    };

    this.listeners.forEach((listener) => {
      try {
        Promise.resolve(listener(event)).catch((err) => {
          console.error("CommerceEngine event listener error:", err);
        });
      } catch (err) {
        console.error("CommerceEngine event listener sync error:", err);
      }
    });

    return sale;
  }

  /**
   * Orchestrates draft sale quotation execution.
   */
  public async executeDraftCheckout(
    _shopId: string,
    saleData: Omit<Sale, "id">
  ): Promise<Sale> {
    const id = await addDraftSale(saleData);
    return { ...saleData, id, status: "draft" as const } as Sale;
  }
}
export const commerceEngine = CommerceEngine.getInstance();
