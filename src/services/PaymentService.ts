export type PaymentMethodType = "Taslimu" | "M-Pesa" | "Tigo Pesa" | "Airtel Money" | "Benki" | "Mkopo" | "Split";

export interface PaymentTransaction {
  method: PaymentMethodType;
  amount: number;
  reference?: string;
}

export interface PaymentProcessingResult {
  success: boolean;
  transactions: PaymentTransaction[];
  error?: string;
}

/**
 * Reusable Payment Routing Service.
 * Manages validation and prepares checkout for future split-payment configurations.
 */
export class PaymentService {
  private static instance: PaymentService;

  private constructor() {}

  public static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  /**
   * Validates single or split payment totals match expected cart total.
   */
  public processPayments(
    expectedTotal: number,
    transactions: PaymentTransaction[]
  ): PaymentProcessingResult {
    const sum = transactions.reduce((s, tx) => s + tx.amount, 0);
    if (sum !== expectedTotal) {
      return {
        success: false,
        transactions,
        error: `Expected total ${expectedTotal} TZS, but received ${sum} TZS.`,
      };
    }

    return {
      success: true,
      transactions,
    };
  }
}
