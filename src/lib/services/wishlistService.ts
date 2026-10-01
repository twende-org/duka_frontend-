import type { Product, Shop } from "@/types";
import { hasApiSession } from "@/lib/api";
import {
  addWishlistItem,
  deleteWishlistItem,
  deleteWishlistItems,
  isWishlisted,
  listWishlistItems,
  toggleWishlistItemOnApi,
  type WishlistInput,
  type WishlistRow,
} from "@/lib/api/domains/wishlist";

export interface WishlistItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  shopId: string;
  shopName: string;
  wholesalePrice?: number;
  moq?: number;
  addedAt?: any;
}

const LOCAL_KEY = "twende_guest_wishlist";

// --- Local Storage Helpers ---
const getLocalWishlist = (): WishlistItem[] => {
  try {
    const data = localStorage.getItem(LOCAL_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveLocalWishlist = (items: WishlistItem[]) => {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("wishlist_updated"));
};

const toWishlistItem = (row: WishlistRow): WishlistItem => ({ ...row });

const toWishlistInput = (product: Product, shop: Shop): WishlistInput => ({
  productId: product.id,
  name: product.name,
  price: product.sellingPrice || 0,
  shopId: shop.id,
  shopName: shop.name,
  wholesalePrice: product.wholesalePrice || undefined,
  moq: product.moq || undefined,
});

// --- Core Service Functions ---

/**
 * Gets all wishlist items.
 * If user is logged in, fetches from the API.
 * If guest, fetches from LocalStorage.
 */
export async function getWishlistItems(): Promise<WishlistItem[]> {
  if (hasApiSession()) {
    try {
      const rows = await listWishlistItems();
      return rows.map(toWishlistItem);
    } catch (e) {
      console.error("Error fetching wishlist:", e);
      return [];
    }
  } else {
    return getLocalWishlist();
  }
}

/**
 * Checks if a specific product is in the wishlist.
 */
export async function isProductWishlisted(productId: string): Promise<boolean> {
  if (hasApiSession()) {
    try {
      return await isWishlisted(productId);
    } catch {
      return false;
    }
  } else {
    const local = getLocalWishlist();
    return local.some(item => item.productId === productId);
  }
}

/**
 * Toggles a product in the wishlist (adds if missing, removes if present).
 * Handles both the API and LocalStorage.
 * Returns the new state (true if added, false if removed).
 */
export async function toggleWishlistItem(product: Product, shop: Shop): Promise<boolean> {
  const productId = product.id;

  if (hasApiSession()) {
    const nowWishlisted = await toggleWishlistItemOnApi(toWishlistInput(product, shop));
    window.dispatchEvent(new Event("wishlist_updated"));
    return nowWishlisted;
  } else {
    // Guest flow
    let local = getLocalWishlist();
    const exists = local.some(item => item.productId === productId);

    if (exists) {
      local = local.filter(item => item.productId !== productId);
      saveLocalWishlist(local);
      return false; // Removed
    } else {
      local.push({
        id: productId,
        productId: productId,
        name: product.name,
        price: product.sellingPrice || 0,
        wholesalePrice: product.wholesalePrice || undefined,
        moq: product.moq || undefined,
        shopId: shop.id,
        shopName: shop.name,
        addedAt: new Date().toISOString()
      });
      saveLocalWishlist(local);
      return true; // Added
    }
  }
}

/**
 * Explicitly removes an item (used in the Wishlist page).
 */
export async function removeWishlistItem(productId: string): Promise<void> {
  if (hasApiSession()) {
    await deleteWishlistItem(productId);
    window.dispatchEvent(new Event("wishlist_updated"));
  } else {
    let local = getLocalWishlist();
    local = local.filter(item => item.productId !== productId);
    saveLocalWishlist(local);
  }
}

/**
 * Bulk removes items from the wishlist.
 */
export async function removeWishlistItems(productIds: string[]): Promise<void> {
  if (hasApiSession()) {
    await deleteWishlistItems(productIds);
    window.dispatchEvent(new Event("wishlist_updated"));
  } else {
    let local = getLocalWishlist();
    local = local.filter(item => !productIds.includes(item.productId));
    saveLocalWishlist(local);
  }
}


/**
 * Merges local storage items into the account.
 * Called automatically upon successful login.
 */
export async function mergeGuestWishlistToCloud(uid: string): Promise<void> {
  void uid;
  const local = getLocalWishlist();
  if (local.length === 0) return;

  console.log(`Merging ${local.length} guest wishlist items to cloud...`);

  try {
    await Promise.all(local.map(item => addWishlistItem(item)));

    // Clear local storage after successful merge
    localStorage.removeItem(LOCAL_KEY);
    window.dispatchEvent(new Event("wishlist_updated"));
    console.log("Merge complete and local storage cleared.");
  } catch (e) {
    console.error("Failed to merge guest wishlist:", e);
  }
}
