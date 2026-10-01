import type { Shop, Supplier } from "@/types";

/**
 * Build the supplier fields that can be derived from a platform shop document.
 * Used both when linking a supplier from the wholesale directory and when
 * refreshing / enriching an already-linked supplier record.
 */
export function mapShopToSupplierFields(shop: Shop): {
  name: string;
  phone: string;
  address: string;
  products: string;
  notes: string;
  platformShopId: string;
} {
  const address =
    shop.location?.trim() ||
    [shop.district, shop.region].filter(Boolean).join(", ") ||
    shop.country ||
    "";

  const categories = [
    ...(shop.businessCategories || []),
    ...(shop.productCategories || []),
  ].filter(Boolean);
  const products = Array.from(new Set(categories)).slice(0, 8).join(", ");

  const description = (shop.description || shop.slogan || "").trim();
  const notes = description.length > 240 ? `${description.slice(0, 237)}...` : description;

  return {
    name: shop.name,
    phone: shop.phone || shop.whatsappNumber || "",
    address,
    products,
    notes,
    platformShopId: shop.id,
  };
}

/**
 * Read-side enrichment: fill empty supplier fields from the linked shop so
 * records created before the mapping existed still display fully.
 * Merchant-entered values always win.
 */
export function enrichSupplierWithShop(supplier: Supplier, shop?: Shop | null): Supplier {
  if (!shop) return supplier;
  const mapped = mapShopToSupplierFields(shop);
  return {
    ...supplier,
    name: supplier.name?.trim() || mapped.name,
    phone: supplier.phone?.trim() || mapped.phone,
    address: supplier.address?.trim() || mapped.address,
    products: supplier.products?.trim() || mapped.products,
    notes: supplier.notes?.trim() || mapped.notes,
  };
}
