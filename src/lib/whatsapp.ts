import { formatTZS } from "@/data/mockData";
import type { Sale, Product } from "@/types";

/**
 * Open WhatsApp with a pre-filled message via wa.me deep link.
 * Works on mobile (opens WhatsApp app) and desktop (opens WhatsApp Web).
 */
export function openWhatsApp(phone: string, message: string) {
  // Clean phone: remove spaces, dashes, leading zeros, add country code if missing
  let cleaned = phone.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("0")) cleaned = "255" + cleaned.slice(1);
  if (!cleaned.startsWith("+") && !cleaned.startsWith("255")) cleaned = "255" + cleaned;
  cleaned = cleaned.replace(/^\+/, "");

  const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

/** Share without a specific phone number (user picks contact) */
export function shareWhatsApp(message: string) {
  const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

/** Build a receipt message for WhatsApp sharing */
export function buildReceiptMessage(sale: Sale, shopName: string): string {
  const unitPrice = sale.quantity > 0 ? sale.totalPrice / sale.quantity : sale.totalPrice;
  const dateObj = new Date(sale.date);
  const formattedDate = dateObj.toLocaleDateString("sw-TZ", { day: "2-digit", month: "2-digit", year: "numeric" });
  const receiptNo = sale.id.slice(0, 8).toUpperCase();

  return [
    `🧾 *RISITI - ${shopName.toUpperCase()}*`,
    `━━━━━━━━━━━━━━━━━`,
    `📅 Tarehe: ${formattedDate}`,
    `🔢 Nambari: ${receiptNo}`,
    sale.customerName ? `👤 Mteja: ${sale.customerName}` : "",
    `━━━━━━━━━━━━━━━━━`,
    `📦 *${sale.productName}*`,
    `   ${sale.quantity} x ${formatTZS(unitPrice)}`,
    `━━━━━━━━━━━━━━━━━`,
    `💰 *JUMLA: ${formatTZS(sale.totalPrice)}*`,
    `💳 Malipo: ${sale.paymentMethod}`,
    `━━━━━━━━━━━━━━━━━`,
    `✅ Asante kwa kununua!`,
    `📱 Powered by Twende Duka`,
  ].filter(Boolean).join("\n");
}

/** Build low-stock alert message */
export function buildLowStockMessage(products: (Product & { stock?: number; minStock?: number })[], shopName: string): string {
  const lines = [
    `⚠️ *TAHADHARI: BIDHAA ZIMEPUNGUA - ${shopName.toUpperCase()}*`,
    `━━━━━━━━━━━━━━━━━`,
    `📅 ${new Date().toLocaleDateString("sw-TZ", { day: "2-digit", month: "2-digit", year: "numeric" })}`,
    ``,
    ...products.map((p, i) =>
      `${i + 1}. *${p.name}*\n   📦 Stock: ${p.stock ?? 0} ${p.unit || "pcs"} (Min: ${p.minStock ?? 0})\n   ${p.supplier ? `🏭 Supplier: ${p.supplier}` : ""}`
    ),
    ``,
    `━━━━━━━━━━━━━━━━━`,
    `📊 Jumla bidhaa: ${products.length}`,
    `⏰ Agiza haraka!`,
    `📱 Twende Duka POS`,
  ];
  return lines.filter(Boolean).join("\n");
}

/** Build customer order notification */
export function buildOrderNotification(sale: Sale, shopName: string): string {
  const receiptNo = sale.id.slice(0, 8).toUpperCase();
  return [
    `✅ *Oda Imekamilika!*`,
    `━━━━━━━━━━━━━━━━━`,
    `🏪 ${shopName}`,
    `🔢 Nambari: ${receiptNo}`,
    ``,
    `📦 *${sale.productName}*`,
    `   Idadi: ${sale.quantity}`,
    `   Jumla: ${formatTZS(sale.totalPrice)}`,
    ``,
    `💳 Malipo: ${sale.paymentMethod}`,
    `━━━━━━━━━━━━━━━━━`,
    `Karibu tena! 🙏`,
    `📱 ${shopName} - Twende Duka`,
  ].join("\n");
}
