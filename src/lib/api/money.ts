/**
 * DRF renders every DecimalField as a JSON string (COERCE_DECIMAL_TO_STRING),
 * while the legacy backend stored the same values as numbers and the UI does arithmetic
 * on them. The client therefore converts them back to numbers.
 *
 * The set is an allowlist rather than a "looks numeric" heuristic: barcodes,
 * SKUs, phone numbers and PINs are digit-only strings that must stay strings.
 * Every name below comes from a model DecimalField (snake_case, emitted for
 * fields='__all__' serializers) or a camelCase serializer alias declared with
 * source= on that field. Add a field here when its domain is cut over if it is
 * not already covered.
 */
export const MONEY_FIELDS: ReadonlySet<string> = new Set([
  // products
  "buying_price",
  "buyingPrice",
  "selling_price",
  "sellingPrice",
  "wholesale_price",
  "wholesalePrice",
  "discount",
  "tax_rate",
  "taxRate",
  // inventory / purchases
  "subtotal",
  "tax",
  "tax_amount",
  "taxAmount",
  "discount_amount",
  "discountAmount",
  "shipping_cost",
  "shippingCost",
  "total_amount",
  "totalAmount",
  "unit_cost",
  "unitCost",
  "profit_estimate",
  // sales
  "unit_price",
  "unitPrice",
  "total_price",
  "totalPrice",
  "profit",
  "total_sales",
  "net_profit",
  "total_expenses",
  // shifts
  "opening_cash",
  "openingCash",
  "cash_sales_total",
  "cashSalesTotal",
  "cash_expenses_total",
  "cashExpensesTotal",
  "expected_closing_cash",
  "expectedClosingCash",
  "actual_closing_cash",
  "actualClosingCash",
  "cash_left_for_next_day",
  "cashLeftForNextDay",
  "cash_submitted_to_owner",
  "cashSubmittedToOwner",
  "discrepancy",
  // expenses
  "amount",
  // crm (customers + suppliers)
  "credit_limit",
  "creditLimit",
  "outstanding_balance",
  "outstandingBalance",
  "total_purchases",
  "totalPurchases",
  "received_goods_value",
  "receivedGoodsValue",
  "paid_amount",
  "paidAmount",
  "total_spent",
  "totalSpent",
  "amount_due",
  "amountDue",
  "amount_paid",
  "amountPaid",
  // marketing
  "value",
  "spend",
  "revenue",
  "roi",
  // wishlist / order snapshots
  "price",
]);

/** Leading/trailing trimmed decimal, so DRF's "12.50" becomes 12.5. */
const DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/;

function toNumber(value: unknown): unknown {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return value;
  const text = value.trim();
  if (!DECIMAL_PATTERN.test(text)) return value;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : value;
}

/**
 * Recursively convert money fields to numbers, leaving every other value
 * untouched. Returns a new structure; the input is not mutated.
 */
export function coerceMoneyFields<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => coerceMoneyFields(item)) as unknown as T;
  }
  if (value && typeof value === "object") {
    // Dates and other class instances are returned as-is.
    if (Object.getPrototypeOf(value) !== Object.prototype) return value;
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      result[key] = MONEY_FIELDS.has(key) ? toNumber(item) : coerceMoneyFields(item);
    }
    return result as T;
  }
  return value;
}
