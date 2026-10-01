import { useState, useEffect, useMemo } from "react";
import { Link, useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  Search, Store, MapPin, Phone, Package, Navigation, Plus,
  Share2, MessageCircle, Sparkles, CheckCircle2, Box, Maximize2,
  Clock, Facebook, Instagram, QrCode, Heart, ChevronRight, X, Loader2, Trash2, Minus, Star
} from "lucide-react";
import { TrustSystem } from "@/components/directory/TrustSystem";
import { BsWhatsapp } from "react-icons/bs";
import { motion, AnimatePresence } from "framer-motion";
import ShareShopDialog from "@/components/shops/ShareShopDialog";
import ShareProductDialog from "@/components/shops/ShareProductDialog";
import { ShopSkeleton } from "@/components/shops/ShopSkeleton";
import StoreBanner from "@/components/shops/StoreBanner";
import StoreIdentityBar from "@/components/shops/StoreIdentityBar";
import StoreTabs from "@/components/shops/StoreTabs";
import StoreProductCard from "@/components/shops/StoreProductCard";

import { ProfessionalImage } from "@/components/common/ProfessionalImage";
import { WishlistButton } from "@/components/common/WishlistButton";
import { Button } from "@/components/ui/button";
import Logo from "@/components/common/Logo";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import SEO from "@/components/SEO";
import { createSlug } from "@/lib/slug";
import { useAppSelector } from "@/store/hooks";
import type { Shop, Product } from "@/types";
import { useI18n } from "@/lib/i18n";
import { normalizeCategories, getCategoryName } from "@/lib/categories";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";
import QRCode from "react-qr-code";
import { addProduct, getProducts } from "@/lib/api/domains/products";
import {
  placeWishlistOrder,
  stockMapFromProducts,
  getShopBySlugOrId,
  getProductsByShop,
  adjustFollowerCount,
} from "@/lib/api/domains/storefront";
import { createB2BPurchaseOrder } from "@/lib/api/domains/b2b";
import { getCorporateDepartments, createPurchaseOrder } from "@/lib/api/domains/corporate";
import { searchProducts } from "@/lib/services/discoveryService";
import { PublicAIAssistantWidget } from "@/components/public/PublicAIAssistantWidget";
import { pricingEngine } from "@/lib/pricing/PricingStrategy";
import { cn } from "@/lib/utils";
import { PublicFooter } from "@/components/layout/PublicFooter";

interface CartItem {
  product: Product;
  quantity: number;
}

function hexToHsl(hex: string): string | undefined {
  if (!hex || typeof hex !== 'string') return undefined;
  hex = hex.replace(/^#/, "");
  if (hex.length !== 6) return undefined;
  
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;

  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function CartQuantityControl({
  item,
  minQty,
  updateQuantity,
  setExactQuantity
}: {
  item: CartItem,
  minQty: number,
  updateQuantity: (id: string, delta: number) => void,
  setExactQuantity: (id: string, qty: number) => void
}) {
  const [val, setVal] = useState(item.quantity.toString());

  useEffect(() => {
    setVal(item.quantity.toString());
  }, [item.quantity]);

  const handleBlur = () => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num < minQty) {
      toast.warning(`Kiwango cha Chini cha Oda kwa bidhaa hii ni ${minQty}.`);
      setExactQuantity(item.product.id, minQty);
      setVal(minQty.toString());
    } else {
      setExactQuantity(item.product.id, num);
    }
  };

  return (
    <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1 shadow-inner border border-border/50 w-fit">
      <button onClick={() => updateQuantity(item.product.id, -1)} className="w-8 h-8 flex items-center justify-center bg-background rounded-md text-foreground hover:bg-destructive hover:text-white shadow-sm transition-all">
        <Minus className="h-4 w-4" />
      </button>
      <input
        type="number"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={handleBlur}
        className="w-10 h-8 text-center text-sm font-black bg-transparent border-none p-0 focus:ring-0 appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button onClick={() => updateQuantity(item.product.id, 1)} className="w-8 h-8 flex items-center justify-center bg-background rounded-md text-foreground hover:bg-primary hover:text-white shadow-sm transition-all">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function ShopDetail() {
  const { identifier, productSlug } = useParams<{ identifier: string; productSlug?: string }>();
  const [searchParams] = useSearchParams();
  const highlightedProductId = searchParams.get("productId") || productSlug;
  const navigate = useNavigate();

  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [productToShare, setProductToShare] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [activeTab, setActiveTab] = useState("products");
  const [sortBy, setSortBy] = useState<"relevance" | "price-asc" | "price-desc">("relevance");
  // Both ride on the public shop payload (see PublicShopSerializer).
  const storePolicies = shop?.storePolicies ?? null;
  const onlineStoreConfig = shop?.onlineStore ?? null;

  const [isFollowing, setIsFollowing] = useState(() => {
    try {
      return localStorage.getItem(`twende-follow-${window.location.pathname.split('/').pop()}`) === "true";
    } catch {
      return false;
    }
  });
  const [followerCount, setFollowerCount] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(`twende-cart-${identifier}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "details">("cart");
  const [customerDetails, setCustomerDetails] = useState({ name: "", phone: "", address: "", notes: "", deliveryDate: "" });
  const [customerProfile, setCustomerProfile] = useState<any | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>("");
  const [paymentType, setPaymentType] = useState<"whatsapp" | "po">("whatsapp");

  useEffect(() => {
    if (customerProfile?.corporateProfile?.companyId) {
      getCorporateDepartments()
        .then((depts) => {
          setDepartments(depts);
          if (depts.length > 0) {
            setSelectedDeptId(depts[0].id);
          }
        })
        .catch((e) => console.warn("Failed to load departments:", e));
    }
  }, [customerProfile]);

  const [searchTerm, setSearchTerm] = useState("");

  const user = useAppSelector((s) => s.auth.user);
  const currentShopId = useAppSelector((s) => s.shops.currentShopId);

  const handleImportProduct = async (product: Product) => {
    if (!currentShopId) {
      toast.error("You must have an active shop to import products.");
      return;
    }
    if (shop?.id === currentShopId) {
      toast.error("You cannot import your own product.");
      return;
    }

    try {
      const existing = await getProducts(currentShopId);
      if (existing.some((p) => p.sourceProductId === product.id)) {
        toast.warning("This product is already imported to your shop.");
        return;
      }

      await addProduct({
        shopId: currentShopId,
        name: product.name,
        category: product.category || "",
        categories: product.categories || [],
        buyingPrice: product.wholesalePrice || product.sellingPrice,
        sellingPrice: product.sellingPrice,
        sku: product.sku || "",
        barcode: product.barcode || "",
        brand: product.brand || "",
        description: product.description || "",
        imageUrl: product.imageUrl || "",
        imageUrls: product.imageUrls || [],
        sourceProductId: product.id,
        supplierShopId: shop?.id,
        supplier: shop?.name || "B2B Supplier",
        status: "active",
        tags: product.tags || [],
      } as unknown as Omit<Product, "id">);

      toast.success(`${product.name} imported to your shop catalog!`);
    } catch (error) {
      console.error("Error importing product:", error);
      toast.error("Failed to import product.");
    }
  };

  useEffect(() => {
    setCustomerProfile(user ?? null);
  }, [user]);



  const getCustomerCategory = (): "retail" | "wholesale" | "corporate" | "reseller" => {
    if (customerProfile?.businessProfile?.status === "APPROVED") {
      return customerProfile.businessProfile.category || "wholesale";
    }
    if (customerProfile?.corporateProfile) {
      return "corporate";
    }
    return "retail";
  };

  const isWholesale = getCustomerCategory() !== "retail";
  const customerType = getCustomerCategory();

  const getProductPrice = (product: Product, quantity: number = 1) => {
    return pricingEngine.calculate(product, {
      customerType: customerType,
      quantity
    });
  };

  const [visibleCount, setVisibleCount] = useState(12);

  useEffect(() => {
    if (identifier) {
      localStorage.setItem(`twende-cart-${identifier}`, JSON.stringify(cart));
    }
  }, [cart, identifier]);

  useEffect(() => {
    if (user) {
      setCustomerDetails(prev => ({
        ...prev,
        name: prev.name || user.displayName || "",
        phone: prev.phone || user.phone || "",
      }));
    }
  }, [user]);

  const { t, lang, toggleLang } = useI18n();

  useEffect(() => {
    async function load() {
      if (!identifier) return;
      try {
        const found = await getShopBySlugOrId(identifier);

        if (found) {
          const displaySlug = found.slug || createSlug(found.name) || found.id;
          if (identifier === found.id && displaySlug !== found.id) {
            const currentParams = searchParams.toString();
            navigate(`/shop/${displaySlug}${currentParams ? `?${currentParams}` : ''}`, { replace: true });
          }

          setShop(found);
          setFollowerCount(found.followerCount || 0);

          // One funnel visit per shop per session, into the telemetry ledger.
          if (!sessionStorage.getItem(`store_view_${found.id}`)) {
            trackEvent("shop_visit", { shopId: found.id, shopName: found.name, source: "direct" });
            sessionStorage.setItem(`store_view_${found.id}`, "true");
          }

          const prods = await getProductsByShop(found.id);
          setProducts(prods);
        } else {
          setShop(null);
        }
      } catch (err) {
        console.error("Failed to load shop:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [identifier, navigate, searchParams]);

  const categories = useMemo(
    () => [...new Set(products.flatMap((p) => normalizeCategories(p)).filter(Boolean))].sort(),
    [products]
  );

  useEffect(() => {
    if (shop?.id && highlightedProductId) {
      trackEvent("product_view", { shopId: shop.id, productId: highlightedProductId });
    }
  }, [shop?.id, highlightedProductId]);


  // Stock rides on each product row now; the map is only for the share dialogs.
  const stockMap = useMemo(() => stockMapFromProducts(products), [products]);

  const productsWithStock = useMemo(() => {
    return products.filter(
      (p) => p.status === "active" && (p.stock ?? 0) > 0 && p.name?.trim() !== "" && (p.sellingPrice || 0) > 0
    );
  }, [products]);

  const featuredProducts = useMemo(() => {
    let result = [...productsWithStock];
    if (highlightedProductId) {
      result = result.filter(p => p.id !== highlightedProductId);
    }
    return result.slice(0, 4);
  }, [productsWithStock, highlightedProductId]);

  const newArrivals = useMemo(() => {
    return [...productsWithStock]
      .sort((a, b) => {
        const d1 = a.createdAt ? new Date(a.createdAt as any).getTime() : 0;
        const d2 = b.createdAt ? new Date(b.createdAt as any).getTime() : 0;
        return d2 - d1;
      })
      .slice(0, 4);
  }, [productsWithStock]);

  const filtered = useMemo(() => {
    let result = productsWithStock;

    if (searchQuery.trim() && shop) {
      result = searchProducts(
        result.map((product) => ({ product, shop, stockQty: product.stock ?? 0 })),
        searchQuery
      ).map(({ product }) => product as typeof result[number]);
    }

    if (selectedCategory) {
      result = result.filter((p) => normalizeCategories(p).includes(selectedCategory));
    }

    return result;
  }, [productsWithStock, searchQuery, selectedCategory, shop]);

  const sortedProducts = useMemo(() => {
    if (sortBy === "relevance") return filtered;
    const list = [...filtered];
    list.sort((a, b) =>
      sortBy === "price-asc"
        ? (a.sellingPrice || 0) - (b.sellingPrice || 0)
        : (b.sellingPrice || 0) - (a.sellingPrice || 0)
    );
    return list;
  }, [filtered, sortBy]);

  const galleryImages = useMemo(() => {
    const imgs = [
      shop?.coverImage,
      shop?.imageUrl,
      ...productsWithStock.flatMap((p) => [p.imageUrl, ...(p.imageUrls || [])]),
    ].filter(Boolean) as string[];
    return [...new Set(imgs)].slice(0, 16);
  }, [shop, productsWithStock]);

  const openWhatsApp = (product?: Product | string) => {
    if (!shop?.phone && !shop?.whatsappNumber) return;

    // Track click
    const productName = typeof product === "string" ? product : product?.name;
    trackEvent("whatsapp_click", {
      shopId: shop.id,
      shopName: shop.name,
      productName: productName,
      source: productName ? "shop_detail_product" : "shop_detail_main"
    });

    const phoneNum = shop.whatsappNumber || shop.phone;
    if (!phoneNum) return;

    const phone = phoneNum.replace(/[^0-9]/g, "");
    const formattedPhone = phone.startsWith("0") ? "255" + phone.slice(1) : phone;
    let message = `Habari ${shop.name}, nimeona duka lako kwenye Twende Duka.`;
    
    if (product) {
      const isProductObj = typeof product !== "string";
      const name = isProductObj ? product.name : product;
      const price = isProductObj && product.sellingPrice ? `\n*Bei:* TZS ${product.sellingPrice.toLocaleString()}` : '';
      const image = isProductObj && product.imageUrl ? `\n*Picha:* ${product.imageUrl}` : '';
      const trackingId = `REF-${Math.floor(Math.random() * 90000) + 10000}`;
      
      message = `Habari, nimeona bidhaa hii kwenye Twende Duka:\n\n*Bidhaa:* ${name}${price}\n*Kumbukumbu ID:* ${trackingId}${image}\n\nJe, bado ipo?`;
    }
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const getDirections = () => {
    if (!shop?.location) return;
    const dest = shop.lat && shop.lon ? `${shop.lat},${shop.lon}` : shop.location;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`, "_blank");
  };

  const addToCart = (product: Product) => {
    const minQty = isWholesale ? (product.moq || 1) : 1;
    setCart(prev => {
      const exists = prev.find(item => item.product.id === product.id);
      if (exists) {
        const nextQty = exists.quantity + 1;
        const finalQty = nextQty < minQty ? minQty : nextQty;
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: finalQty } : item);
      }
      return [...prev, { product, quantity: minQty }];
    });

    if (isWholesale && product.moq && product.moq > 1) {
      toast.info(`Kiwango cha Chini cha Oda (MOQ) cha ${product.moq} kimetumika.`);
    } else {
      toast.success(`✅ ${product.name} added to cart`);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const minQty = isWholesale ? (item.product.moq || 1) : 1;
        const newQ = item.quantity + delta;

        // If they click minus when they are already at the minimum quantity, remove the item
        if (newQ < minQty) {
          removeFromCart(productId);
          return null; // Return null so we can filter it out
        }

        return { ...item, quantity: newQ };
      }
      return item;
    }).filter(Boolean) as CartItem[]);
  };

  const setExactQuantity = (productId: string, quantity: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        return { ...item, quantity };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
    toast.info("Item removed from cart");
  };

  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const isB2BViewer = !!(currentShopId && shop?.id && currentShopId !== shop.id);

  const handleCheckout = async () => {
    if (checkoutStep === "cart") {
      setCheckoutStep("details");
      return;
    }

    if (cart.length === 0 || (!shop?.phone && !shop?.whatsappNumber) || !shop?.id) return;

    // Require name and phone, unless B2B Viewer
    if (!isB2BViewer && (!customerDetails.name.trim() || !customerDetails.phone.trim())) {
      toast.error("Tafadhali jaza Jina na Namba ya Simu");
      return;
    }

    if (paymentType === "po" && !selectedDeptId) {
      toast.error("Tafadhali chagua Idara");
      return;
    }

    const phoneNum = shop.whatsappNumber || shop.phone;
    if (!phoneNum) return;

    setIsCheckingOut(true);

    try {
      // 1. Generate Order ID
      const orderIdStr = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
      const subTotalAmount = cart.reduce((sum, item) => sum + (getProductPrice(item.product, item.quantity) * item.quantity), 0);
      const deliveryFee = 5000;
      const totalAmount = subTotalAmount + deliveryFee;

      // 1.5 If B2B Procurement Checkout (Peer to Peer Shop)
      if (isB2BViewer) {
        const poData = {
          buyerShopId: currentShopId,
          supplierShopId: shop.id,
          supplierName: shop.name,
          status: "submitted" as any,
          totalAmount,
          notes: customerDetails.notes,
          deliveryDate: customerDetails.deliveryDate,
          deliveryFee: deliveryFee,
          items: cart.map(c => ({
            productId: c.product.id,
            sourceProductId: c.product.id,
            productName: c.product.name,
            expectedQty: c.quantity,
            buyingPrice: getProductPrice(c.product, c.quantity),
            subtotal: getProductPrice(c.product, c.quantity) * c.quantity
          }))
        };

        await createB2BPurchaseOrder(poData);
        toast.success("B2B Purchase Order submitted successfully!");
        setCart([]);
        setIsCheckingOut(false);
        setIsCartOpen(false);
        setCheckoutStep("cart");
        return;
      }

      // 2. If Corporate PO Checkout, create PO record
      if (paymentType === "po" && customerProfile?.corporateProfile?.companyId) {
        await createPurchaseOrder({
          shopId: shop.id,
          shopName: shop.name,
          buyerId: user?.id || "",
          buyerName: customerDetails.name,
          buyerPhone: customerDetails.phone,
          departmentId: selectedDeptId,
          departmentName: departments.find(d => d.id === selectedDeptId)?.name || "Default Department",
          items: cart.map(c => ({
            productId: c.product.id,
            productName: c.product.name,
            quantity: c.quantity,
            price: getProductPrice(c.product, c.quantity),
            subtotal: getProductPrice(c.product, c.quantity) * c.quantity
          })),
          totalAmount,
        });
      }

      // 3. Save Order via the public storefront checkout (server re-prices every line)
      await placeWishlistOrder(shop.id, {
        orderId: orderIdStr,
        customerName: customerDetails.name,
        customerPhone: customerDetails.phone,
        customerAddress: customerDetails.address || "",
        notes: customerDetails.notes || "",
        customerType: customerType,
        paymentMethod: paymentType === "po" ? "Purchase Order (PO)" : "Cash / WhatsApp",
        items: cart.map(c => ({
          productId: c.product.id,
          productName: c.product.name,
          quantity: c.quantity,
          price: getProductPrice(c.product, c.quantity),
        })),
      });

      // 4. If standard WhatsApp order, prepare message and redirect
      if (paymentType === "whatsapp") {
        const phone = phoneNum.replace(/[^0-9]/g, "");
        const formattedPhone = phone.startsWith("0") ? "255" + phone.slice(1) : phone;

        let message = `Hello ${shop.name},\n\nI have placed an order on your website.\n*Order ID: ${orderIdStr}*\n\n*Cart Items:*\n`;
        cart.forEach((item, index) => {
          message += `${index + 1}. ${item.product.name} - Qty ${item.quantity}\n`;
        });
        message += `\n*Subtotal:* TZS ${subTotalAmount.toLocaleString()}\n`;
        message += `*Est. Delivery:* TZS ${deliveryFee.toLocaleString()}\n`;
        message += `*Total:* TZS ${totalAmount.toLocaleString()}\n`;

        message += `\n*Customer Details:*\n`;
        message += `Name: ${customerDetails.name || "N/A"}\n`;
        message += `Address: ${customerDetails.address || "N/A"}\n`;
        if (customerDetails.phone) message += `Phone: ${customerDetails.phone}\n`;
        if (customerDetails.notes) message += `Notes: ${customerDetails.notes}\n`;

        message += `\nPlease confirm availability and pricing.`;

        // Clear Cart and open WhatsApp
        setCart([]);
        setIsCartOpen(false);
        setCheckoutStep("cart");
        toast.success("Order placed successfully!");
        window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, "_blank");
      } else {
        // Corporate PO success feedback
        toast.success(`Purchase Order ${orderIdStr} submitted to corporate approval flow!`);
        setCart([]);
        setIsCartOpen(false);
        setCheckoutStep("cart");
      }
      setPaymentType("whatsapp");

    } catch (err) {
      console.error("Checkout error:", err);
      toast.error("Failed to place order. Please try again.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleShareProduct = async (product: Product) => {
    setProductToShare(product);
  };

  const toggleFollow = async () => {
    const newStatus = !isFollowing;
    setIsFollowing(newStatus);
    localStorage.setItem(`twende-follow-${identifier}`, newStatus.toString());

    if (newStatus) {
      setFollowerCount(prev => prev + 1);
      toast.success(`❤️ You are now following ${shop?.name}`);
      trackEvent("shop_follow", { shopId: shop?.id, shopName: shop?.name });
      if (shop?.id) {
        try {
          await adjustFollowerCount(shop.id, 1);
        } catch (e) { console.error("Failed to update followers", e); }
      }
    } else {
      setFollowerCount(prev => Math.max(0, prev - 1));
      toast.info(`Unfollowed ${shop?.name}`);
      if (shop?.id) {
        try {
          await adjustFollowerCount(shop.id, -1);
        } catch (e) { console.error("Failed to update followers", e); }
      }
    }
  };

  if (loading) {
    return <ShopSkeleton />;
  }

  if (!shop) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4 px-4 text-center">
        <Store className="h-16 w-16 text-muted-foreground/30" />
        <h2 className="text-xl font-bold text-foreground">Duka hili halijapatikana</h2>
        <Link to="/"><Button variant="outline">Rudi Nyumbani</Button></Link>
      </div>
    );
  }

  const shopUrl = `https://duka.twendedigital.tech/shop/${shop.slug || shop.id}`;
  const highlightedProduct = highlightedProductId
    ? productsWithStock.find(p => p.id === highlightedProductId || createSlug(p.name) === highlightedProductId)
    : null;
  const hpImages = highlightedProduct?.imageUrls?.length ? highlightedProduct.imageUrls : [highlightedProduct?.imageUrl || ""];

  // Dynamic SEO Data
  const seoTitle = highlightedProduct
    ? `${highlightedProduct.name} | ${shop.name}`
    : `${shop.name} — Twende Duka`;
  const seoDesc = highlightedProduct
    ? highlightedProduct.description || `Buy ${highlightedProduct.name} from ${shop.name} for TZS ${highlightedProduct.sellingPrice?.toLocaleString()}.`
    : shop.description || `Tazama bidhaa za ${shop.name} kwenye Twende Duka.`;
  const seoImage = highlightedProduct
    ? hpImages[0]
    : shop.coverImage || shop.imageUrl;
  const seoUrl = highlightedProduct
    ? `/shop/${shop.slug || shop.id}/product/${createSlug(highlightedProduct.name)}`
    : `/shop/${shop.slug || shop.id}`;

  const customThemeColor = hexToHsl(onlineStoreConfig?.themeColor);
  const rootStyle = customThemeColor ? { '--primary': customThemeColor } as React.CSSProperties : {};

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/20" style={rootStyle}>
      <SEO
        title={seoTitle}
        description={seoDesc}
        canonical={seoUrl}
        ogImage={seoImage}
      />

      {/* Liquid Navbar */}
      <nav className="fixed top-0 inset-x-0 z-[100] h-16 bg-background/60 backdrop-blur-2xl transition-all duration-300">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="h-9 w-9 bg-primary/10 rounded-xl flex items-center justify-center shadow-lg shadow-primary/5 group-hover:scale-105 transition-transform"><Logo size={20} className="text-primary" /></div>
            <span className="text-lg font-semibold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Twende Duka</span>
          </Link>
          <Button onClick={() => openWhatsApp()} className="h-9 w-9 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20 transition-all hover:scale-105 active:scale-95 p-0">
            <BsWhatsapp className="h-4 w-4" />
          </Button>
        </div>
      </nav>

      <main className="pb-40 sm:pb-32 md:pb-12">

        {/* SECTION 1 — STORE BANNER + IDENTITY */}
        <div className="mx-auto max-w-7xl px-0 sm:px-6 sm:pt-4">
          <StoreBanner
            name={shop.name}
            coverImage={onlineStoreConfig?.bannerUrl || shop.coverImage || shop.imageUrl}
            logoUrl={onlineStoreConfig?.logoUrl || shop.imageUrl}
            eyebrow="Twende Duka"
          />
          <div className="px-4 sm:px-0">
            <StoreIdentityBar
              location={shop.location}
              productCount={productsWithStock.length}
              followerCount={followerCount}
              isFollowing={isFollowing}
              onFollow={toggleFollow}
              onContact={() => openWhatsApp()}
              extraActions={
                <ShareShopDialog
                  shopName={shop.name} shopId={shop.id} shopDescription={shop.description} shopLocation={shop.location} shopPhone={shop.phone}
                  products={productsWithStock} stockMap={stockMap}
                  trigger={<Button variant="outline" className="h-10 font-semibold"><Share2 className="mr-2 h-4 w-4" /> Share</Button>}
                />
              }
            />
          </div>
        </div>


        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12 sm:space-y-16 md:space-y-24 mt-10 sm:mt-14 md:mt-16">

          {/* SECTION 2 — APPLE-STYLE HIGHLIGHTED PRODUCT */}
          <AnimatePresence mode="wait">
            {highlightedProduct && (
              <motion.section initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="pt-8">
                <div className="rounded-3xl lg:rounded-[3rem] bg-gradient-to-b from-card to-background border border-border/40 shadow-2xl overflow-hidden ring-1 ring-black/5">
                  <div className="grid grid-cols-1 lg:grid-cols-2">
                    {/* Left: Sticky Image Gallery */}
                    <div className="relative bg-muted/30 p-3 sm:p-4 lg:p-8 flex flex-col group">
                      <div className="relative aspect-[4/3] sm:aspect-square lg:aspect-[4/3] max-h-[260px] sm:max-h-none rounded-2xl sm:rounded-[2rem] overflow-hidden bg-white shadow-sm cursor-zoom-in group-hover:shadow-xl transition-all duration-500" onClick={() => setIsLightboxOpen(true)}>
                        <ProfessionalImage src={hpImages[activeImageIdx]} alt={highlightedProduct.name} className="h-full w-full" imageClassName="object-contain p-4" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                          <div className="bg-white/90 backdrop-blur-md rounded-full p-3 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-4 group-hover:translate-y-0 shadow-xl"><Maximize2 className="h-6 w-6 text-foreground" /></div>
                        </div>
                      </div>
                      {hpImages.length > 1 && (
                        <div className="flex gap-3 mt-4 sm:mt-6 overflow-x-auto no-scrollbar pb-2 px-2">
                          {hpImages.map((img, i) => (
                            <button key={i} onClick={() => setActiveImageIdx(i)} className={`relative h-14 w-14 sm:h-20 sm:w-20 shrink-0 rounded-xl sm:rounded-2xl overflow-hidden bg-white transition-all duration-300 ${i === activeImageIdx ? 'ring-2 ring-primary ring-offset-2 scale-105 shadow-md' : 'opacity-60 hover:opacity-100 border border-border/50'}`}>
                              <img src={img} className="h-full w-full object-contain p-1" />
                            </button>
                          ))}
                        </div>
                      )}
                      <Badge className="absolute top-4 left-4 sm:top-8 sm:left-8 bg-primary/90 backdrop-blur-md text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-semibold shadow-2xl tracking-widest ">Selected Item</Badge>
                    </div>

                    {/* Right: Massive Typography Details */}
                    <div className="p-4 sm:p-8 lg:p-16 flex flex-col justify-center">
                      <div className="space-y-5 sm:space-y-8">
                        <div>
                          <div className="text-[9px] sm:text-[11px] font-semibold  tracking-[0.25em] text-primary mb-2 sm:mb-4 flex items-center gap-2">
                            {normalizeCategories(highlightedProduct).map(getCategoryName).join(" • ")}
                          </div>
                          <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight leading-snug sm:leading-[1.05] text-foreground mb-3 sm:mb-6">{highlightedProduct.name}</h2>
                          <div className="flex flex-wrap items-baseline gap-2.5 sm:gap-4">
                            <span className="text-2xl sm:text-4xl md:text-5xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">TZS {getProductPrice(highlightedProduct).toLocaleString()}</span>
                            {highlightedProduct.stock < 10 && <Badge variant="destructive" className="rounded-lg sm:rounded-xl px-2 py-0.5 sm:px-3 sm:py-1 font-semibold text-[9px] sm:text-xs  tracking-widest shadow-sm">Low Stock</Badge>}
                          </div>
                        </div>

                        {highlightedProduct.description && (
                          <p className="text-muted-foreground/80 text-base md:text-lg leading-relaxed font-medium">{highlightedProduct.description}</p>
                        )}

                        <div className="flex items-center gap-4 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-muted/50 border border-border/40 w-fit">
                          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-background shadow-sm flex items-center justify-center text-primary"><Box className="h-5 w-5 sm:h-6 sm:w-6" /></div>
                          <div>
                            <p className="text-[9px] font-semibold text-muted-foreground  tracking-[0.2em] mb-0.5">Available Units</p>
                            <p className="text-lg sm:text-xl font-semibold text-foreground">{highlightedProduct.stock}</p>
                          </div>
                        </div>

                        <div className="pt-4 sm:pt-8">
                          {/* Sticky bottom bar on mobile */}
                          <div className="fixed sm:static bottom-[4.5rem] left-0 right-0 z-50 p-4 sm:p-0 bg-background/95 sm:bg-transparent backdrop-blur-xl sm:backdrop-blur-none border-t sm:border-0 border-border/50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] sm:shadow-none flex flex-col sm:flex-row gap-3 sm:gap-4 pb-safe animate-in slide-in-from-bottom-2 duration-300">
                            <Button
                              onClick={() => addToCart(highlightedProduct)}
                              className="w-full sm:flex-1 h-12 sm:h-16 rounded-xl sm:rounded-2xl bg-primary hover:bg-primary/90 text-white font-semibold text-xs sm:text-sm  tracking-widest gap-2 sm:gap-3 shadow-xl sm:shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                              <Package className="h-5 w-5 sm:h-6 sm:w-6" /> Add to Cart
                            </Button>
                            <div className="flex gap-3 sm:flex-1 w-full">
                              <Button
                                onClick={() => openWhatsApp(highlightedProduct)}
                                variant="outline"
                                className="flex-1 h-12 sm:h-16 rounded-xl sm:rounded-2xl border-2 border-green-500 text-green-600 hover:bg-green-50 hover:text-green-600 font-semibold text-xs sm:text-sm  tracking-widest gap-2 sm:gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all bg-background"
                              >
                                <BsWhatsapp className="h-5 w-5 sm:h-6 sm:w-6" /> WhatsApp
                              </Button>
                              <Button
                                onClick={() => handleShareProduct(highlightedProduct)}
                                variant="outline"
                                className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl border-2 hover:bg-muted hover:text-foreground shrink-0 transition-transform hover:scale-105 p-0 flex items-center justify-center bg-background"
                              >
                                <Share2 className="w-4 h-4 sm:w-6 sm:h-6" />
                              </Button>
                            </div>
                          </div>

                          {/* Dummy spacer for mobile so content isn't hidden behind the fixed bar */}
                          <div className="h-32 sm:hidden block" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* SECTION 3 — VIBRANT NEW ARRIVALS */}
          {newArrivals.length > 0 && (
            <section className="relative overflow-hidden rounded-3xl sm:rounded-[2.5rem] bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-rose-500/10 border border-orange-500/20 p-4 sm:p-8 md:p-12">
              <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-orange-500/20 blur-3xl rounded-full pointer-events-none" />
              <div className="relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-10">
                  <div>
                    <div className="flex items-center gap-2 text-orange-600 font-semibold text-[10px] sm:text-xs tracking-[0.2em] mb-1.5 sm:mb-2 uppercase">
                      <Sparkles className="h-4 w-4" /> Special Drops
                    </div>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-foreground">New This Week</h2>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                  {newArrivals.map(product => (
                    <div key={`new-${product.id}`} className="group relative bg-card rounded-2xl overflow-hidden border border-border/30 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col">
                      {/* Image Wrapper */}
                      <div className="relative aspect-square sm:aspect-[4/5] bg-muted/20 overflow-hidden flex items-center justify-center">
                        <ProfessionalImage src={product.imageUrl} alt={product.name} className="w-full h-full" imageClassName="object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                        <div className="absolute top-2 left-2 bg-red-500 text-white text-[8px] font-semibold px-2 py-0.5 rounded-md  tracking-wider shadow-md z-30">NEW</div>

                        {/* Wishlist Button floating on top-right */}
                        <div className="absolute top-3 right-3 z-30">
                          {shop && (
                            <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-sm border border-border/50">
                              <WishlistButton
                                product={product}
                                shop={shop}
                                className="w-5 h-5"
                                iconClassName="w-4 h-4"
                              />
                            </div>
                          )}
                        </div>

                        {/* Desktop Hover Overlay Action */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 hidden md:flex flex-col justify-end p-4">
                          <div className="flex gap-2 w-full translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                            <Button onClick={(e) => { e.preventDefault(); e.stopPropagation(); addToCart(product); }} className="flex-1 bg-primary hover:bg-primary/90 text-white hover:text-white rounded-xl h-11 text-xs font-semibold shadow-2xl">
                              <Package className="mr-2 w-4 h-4" /> Add
                            </Button>
                            <Button onClick={(e) => { e.preventDefault(); e.stopPropagation(); openWhatsApp(product); }} className="w-11 h-11 bg-green-500 hover:bg-green-600 text-white hover:text-white rounded-xl shadow-2xl shrink-0 p-0 flex items-center justify-center">
                              <BsWhatsapp className="w-5 h-5" />
                            </Button>
                            <Button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleShareProduct(product); }} variant="outline" className="w-11 h-11 bg-white/10 hover:bg-white/20 border-white/20 text-white hover:text-white rounded-xl shadow-2xl shrink-0 p-0 flex items-center justify-center">
                              <Share2 className="w-5 h-5" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Product Info */}
                      <div className="p-3 sm:p-5 flex flex-col flex-1 bg-card relative z-30 justify-between">
                        <div>
                          <div className="text-[8px] sm:text-[9px] font-semibold text-primary  tracking-[0.2em] mb-1 line-clamp-1">
                            {normalizeCategories(product).map(getCategoryName).join(" • ")}
                          </div>
                          <h4 className="font-bold text-xs sm:text-base leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-1 mb-1.5">{product.name}</h4>

                          {/* Rating Section */}
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-2">
                            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                            <span className="font-semibold text-foreground">
                              {(product as any).rating ? (product as any).rating.toFixed(1) : "New"}
                            </span>
                            {typeof (product as any).reviewCount === "number" && (product as any).reviewCount > 0 && (
                              <span>({(product as any).reviewCount})</span>
                            )}
                          </div>
                        </div>

                        <div className="mt-auto flex flex-col gap-2 pt-2 border-t border-border/10 sm:flex-row sm:items-center sm:justify-between">
                          <span className="text-primary font-bold text-sm tracking-tight whitespace-nowrap">
                            TZS {getProductPrice(product).toLocaleString()}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); addToCart(product); }} className="h-8 flex-1 sm:w-8 sm:flex-none rounded-lg sm:rounded-full bg-primary/10 hover:bg-primary text-primary hover:text-white flex items-center justify-center transition-all" title="Add to Cart">
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); openWhatsApp(product); }} className="h-8 flex-1 sm:w-8 sm:flex-none rounded-lg sm:rounded-full bg-green-500/10 text-green-600 hover:bg-green-500 hover:text-white flex items-center justify-center transition-all" title="WhatsApp Chat">
                              <BsWhatsapp className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleShareProduct(product); }} className="h-8 flex-1 sm:w-8 sm:flex-none rounded-lg sm:rounded-full bg-muted text-muted-foreground hover:bg-muted-foreground/20 flex items-center justify-center transition-all" title="Share">
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* SECTION TABS */}
          <section className="space-y-8">
            <div className="sticky top-16 z-[90] -mx-4 bg-background/85 px-4 backdrop-blur-xl sm:mx-0 sm:px-0">
              <StoreTabs
                tabs={[
                  { id: "products", label: "Products", count: filtered.length },
                  { id: "about", label: "About Us" },
                  { id: "reviews", label: "Reviews" },
                  { id: "policies", label: "Policies" },
                  { id: "showroom", label: "Showroom" },
                ]}
                active={activeTab}
                onChange={setActiveTab}
              />
            </div>

            <AnimatePresence mode="wait">
              {activeTab === "products" && (
                <motion.div
                  key="products"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ type: "spring", stiffness: 320, damping: 30 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">Products</h2>
                      <p className="text-xs text-muted-foreground">{sortedProducts.length} items available</p>
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                      <div className="relative w-full sm:w-60">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search this shop..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="h-11 rounded-xl pl-9 sm:h-10"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="h-11 w-full min-w-0 truncate rounded-xl border border-input bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:h-10 sm:w-auto sm:text-sm"
                        >
                          <option value="">All categories</option>
                          {categories.map((cat) => (
                            <option key={cat} value={cat}>{getCategoryName(cat)}</option>
                          ))}
                        </select>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className="h-11 w-full min-w-0 truncate rounded-xl border border-input bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:h-10 sm:w-auto sm:text-sm"
                        >
                          <option value="relevance">Sort: Featured</option>
                          <option value="price-asc">Price: Low to High</option>
                          <option value="price-desc">Price: High to Low</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {sortedProducts.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border/60 bg-card py-16 sm:py-24 text-center">
                      <Package className="mx-auto mb-4 h-14 w-14 text-muted-foreground/20" />
                      <p className="mb-1 text-lg font-bold text-foreground">Nothing found</p>
                      <p className="text-sm text-muted-foreground">Try adjusting your search or category filter.</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
                        {sortedProducts.slice(0, visibleCount).map((product) => (
                          <StoreProductCard
                            key={product.id}
                            product={product}
                            shop={shop}
                            price={getProductPrice(product)}
                            onAdd={() => addToCart(product)}
                            onWhatsApp={() => openWhatsApp(product)}
                            onShare={() => handleShareProduct(product)}
                            onImport={currentShopId && currentShopId !== shop.id ? () => handleImportProduct(product) : undefined}
                          />
                        ))}
                      </div>
                      {visibleCount < sortedProducts.length && (
                        <div className="flex justify-center pt-4">
                          <Button onClick={() => setVisibleCount((prev) => prev + 12)} variant="outline" className="h-11 rounded-xl px-8 font-semibold">
                            Load More Products
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              )}

              {activeTab === "about" && (
                <motion.div
                  key="about"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ type: "spring", stiffness: 320, damping: 30 }}
                  className="grid grid-cols-1 gap-6 md:grid-cols-12"
                >
                  <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm md:col-span-7 sm:p-8">
                    <h3 className="mb-6 flex items-center gap-2 text-lg font-bold">
                      <Store className="h-5 w-5 text-primary" /> Business Profile
                    </h3>
                    {shop.description && (
                      <p className="mb-6 text-sm leading-relaxed text-muted-foreground">{shop.description}</p>
                    )}
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-5">
                        <div>
                          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Location</p>
                          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <MapPin className="h-4 w-4 text-primary" /> {shop.location || "Tanzania"}
                          </p>
                        </div>
                        <div>
                          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Contact</p>
                          <a href={`tel:${shop.phone}`} className="flex items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-primary">
                            <Phone className="h-4 w-4 text-primary" /> {shop.phone || "Not provided"}
                          </a>
                        </div>
                        {shop.whatsappNumber && (
                          <div>
                            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">WhatsApp</p>
                            <button onClick={() => openWhatsApp()} className="flex items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-primary">
                              <BsWhatsapp className="h-4 w-4 text-primary" /> {shop.whatsappNumber}
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="space-y-5">
                        <div>
                          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Operating Hours</p>
                          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Clock className="h-4 w-4 text-primary" /> {shop.operatingHours || "Mon-Sat (08:00 - 18:00)"}
                          </p>
                        </div>
                        <div>
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Connect</p>
                          <div className="flex gap-2">
                            {shop.facebookUrl ? (
                              <a href={shop.facebookUrl} target="_blank" rel="noreferrer" className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors hover:bg-primary/20">
                                <Facebook className="h-4 w-4" />
                              </a>
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground/40"><Facebook className="h-4 w-4" /></div>
                            )}
                            {shop.instagramUrl ? (
                              <a href={shop.instagramUrl} target="_blank" rel="noreferrer" className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors hover:bg-primary/20">
                                <Instagram className="h-4 w-4" />
                              </a>
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground/40"><Instagram className="h-4 w-4" /></div>
                            )}
                            <button onClick={getDirections} className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors hover:bg-primary/20" title="Directions">
                              <Navigation className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-6 md:col-span-5">
                    <div className="rounded-2xl border border-border/60 bg-card p-6 text-center shadow-sm">
                      <Heart className="mx-auto mb-3 h-8 w-8 text-primary" />
                      <h3 className="mb-1 text-lg font-bold text-foreground">Join {followerCount.toLocaleString()} followers</h3>
                      <p className="mb-4 text-sm text-muted-foreground">Follow {shop.name} for new drops and offers.</p>
                      <Button onClick={toggleFollow} variant={isFollowing ? "secondary" : "default"} className="h-11 w-full rounded-xl font-semibold">
                        {isFollowing ? "Following" : "Follow Shop"}
                      </Button>
                    </div>
                    <div className="flex items-center gap-5 rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
                      <div className="shrink-0 rounded-xl border border-border/60 bg-white p-2.5">
                        <QRCode value={shopUrl} size={78} />
                      </div>
                      <div>
                        <h4 className="mb-1 text-base font-bold">Scan &amp; Save</h4>
                        <p className="mb-3 text-xs text-muted-foreground">Keep this shop in your pocket.</p>
                        <ShareShopDialog
                          shopName={shop.name} shopId={shop.id} shopDescription={shop.description} shopLocation={shop.location} shopPhone={shop.phone}
                          products={productsWithStock} stockMap={stockMap}
                          trigger={<Button variant="outline" size="sm" className="h-8 gap-2 rounded-lg text-xs font-bold"><QrCode className="h-3 w-3" /> Share Code</Button>}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "reviews" && (
                <motion.div
                  key="reviews"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ type: "spring", stiffness: 320, damping: 30 }}
                  className="rounded-2xl border border-border/60 bg-card p-10 text-center shadow-sm"
                >
                  <Sparkles className="mx-auto mb-4 h-12 w-12 text-muted-foreground/25" />
                  <h3 className="mb-1 text-lg font-bold text-foreground">No reviews yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Be the first to order from {shop.name} and share your experience.
                  </p>
                </motion.div>
              )}

              {activeTab === "policies" && (
                <motion.div
                  key="policies"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ type: "spring", stiffness: 320, damping: 30 }}
                  className="grid gap-5 md:grid-cols-3"
                >
                  {[
                    { title: "Returns & Refunds", body: storePolicies?.returnsPolicy },
                    { title: "Shipping & Delivery", body: storePolicies?.shippingPolicy },
                    { title: "Terms of Service", body: storePolicies?.termsOfService },
                  ].map((policy) => (
                    <div key={policy.title} className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
                      <h3 className="mb-3 text-base font-bold text-foreground">{policy.title}</h3>
                      <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                        {policy.body?.trim() || "This shop has not published this policy yet. Contact the shop for details."}
                      </p>
                    </div>
                  ))}
                </motion.div>
              )}

              {activeTab === "showroom" && (
                <motion.div
                  key="showroom"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ type: "spring", stiffness: 320, damping: 30 }}
                >
                  {galleryImages.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border/60 bg-card py-20 text-center">
                      <Store className="mx-auto mb-4 h-12 w-12 text-muted-foreground/20" />
                      <p className="text-sm text-muted-foreground">No showroom images yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
                      {galleryImages.map((img, i) => (
                        <div key={`${img}-${i}`} className="aspect-square overflow-hidden rounded-2xl border border-border/60 bg-muted/30">
                          <img src={img} alt={`${shop.name} showroom ${i + 1}`} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </section>


        </div>
      </main>

      {/* Sticky Mobile Action Bar */}
      <div className="fixed bottom-16 inset-x-0 z-[90] bg-background/90 backdrop-blur-xl border-t border-border/50 p-4 md:hidden flex justify-around items-center pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
        <button onClick={() => openWhatsApp()} className="flex flex-col items-center gap-1 text-muted-foreground hover:text-green-500 transition-colors">
          <BsWhatsapp className="h-5 w-5" />
          <span className="text-[10px] font-bold  tracking-widest">Chat</span>
        </button>
        <button onClick={() => shop?.phone && window.open(`tel:${shop.phone}`, '_self')} className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
          <Phone className="h-5 w-5" />
          <span className="text-[10px] font-bold  tracking-widest">Call</span>
        </button>
        <button onClick={getDirections} className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
          <Navigation className="h-5 w-5" />
          <span className="text-[10px] font-bold  tracking-widest">Map</span>
        </button>
        <button onClick={() => setIsCartOpen(true)} className="flex flex-col items-center gap-1 text-primary relative">
          <div className="relative">
            <Package className="h-5 w-5" />
            {cart.length > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-semibold animate-in zoom-in">{cart.reduce((a, b) => a + b.quantity, 0)}</span>}
          </div>
          <span className="text-[10px] font-semibold">Cart</span>
        </button>
      </div>

      {/* Floating Action Cart Button (Desktop) */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.button initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} onClick={() => setIsCartOpen(true)} className="hidden md:flex fixed bottom-8 right-8 z-[90] h-16 px-6 bg-primary text-white rounded-full items-center gap-3 shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all">
            <Package className="h-6 w-6" />
            <span className="font-semibold text-lg">{cart.reduce((a, b) => a + b.quantity, 0)} items</span>
            <span className="text-white/60">|</span>
            <span className="font-bold">TZS {cart.reduce((sum, item) => sum + (getProductPrice(item.product, item.quantity) * item.quantity), 0).toLocaleString()}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Cart Drawer Modal */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCartOpen(false)} className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm" />
            <motion.div
              initial={typeof window !== 'undefined' && window.innerWidth >= 640 ? { x: "100%" } : { y: "100%" }}
              animate={{ x: 0, y: 0 }}
              exit={typeof window !== 'undefined' && window.innerWidth >= 640 ? { x: "100%" } : { y: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="fixed inset-x-0 bottom-0 h-[85vh] sm:h-full sm:inset-y-0 sm:right-0 sm:bottom-auto w-full sm:max-w-md bg-background z-[101] shadow-[0_-20px_50px_rgba(0,0,0,0.1)] sm:shadow-2xl sm:border-l border-t sm:border-t-0 border-border/20 flex flex-col rounded-t-[2rem] sm:rounded-none"
            >
              <div className="p-6 border-b border-border/10 flex items-center justify-between bg-card">
                <h2 className="text-2xl font-semibold flex items-center gap-3"><Package className="text-primary w-6 h-6" /> {t("cart.yourCart")}</h2>
                <button onClick={() => setIsCartOpen(false)} className="h-10 w-10 bg-muted rounded-full flex items-center justify-center hover:bg-muted-foreground/20 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {checkoutStep === "details" ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                    <Button variant="ghost" onClick={() => setCheckoutStep("cart")} className="mb-2 -ml-4 text-muted-foreground hover:text-foreground"><ChevronRight className="rotate-180 mr-2 h-4 w-4" /> {t("checkout.backToCart")}</Button>
                    <h3 className="text-xl font-semibold mb-4">{t("checkout.deliveryDetails")}</h3>
                    <div className="space-y-3">
                      {!isB2BViewer && (
                        <>
                          <div>
                            <label className="text-[10px] font-semibold text-muted-foreground  tracking-widest mb-1 block">{t("checkout.fullName")}</label>
                            <Input placeholder={t("checkout.namePlaceholder")} value={customerDetails.name} onChange={e => setCustomerDetails(prev => ({ ...prev, name: e.target.value }))} className="h-12 rounded-xl font-medium" />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-muted-foreground  tracking-widest mb-1 block">{t("checkout.phoneNumber")}</label>
                            <Input placeholder={t("checkout.phonePlaceholder")} type="tel" value={customerDetails.phone} onChange={e => setCustomerDetails(prev => ({ ...prev, phone: e.target.value }))} className="h-12 rounded-xl font-medium" />
                          </div>
                        </>
                      )}
                      {!isB2BViewer && (
                        <div>
                          <label className="text-[10px] font-semibold text-muted-foreground  tracking-widest mb-1 block">{t("checkout.deliveryAddress")}</label>
                          <Input placeholder={t("checkout.addressPlaceholder")} value={customerDetails.address} onChange={e => setCustomerDetails(prev => ({ ...prev, address: e.target.value }))} className="h-12 rounded-xl font-medium" />
                        </div>
                      )}
                      {isB2BViewer && (
                        <div>
                          <label className="text-[10px] font-semibold text-muted-foreground tracking-widest mb-1 block">Requested Delivery Date</label>
                          <Input type="date" value={customerDetails.deliveryDate} onChange={e => setCustomerDetails(prev => ({ ...prev, deliveryDate: e.target.value }))} className="h-12 rounded-xl font-medium" />
                        </div>
                      )}
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground  tracking-widest mb-1 block">{t("checkout.additionalNotes")}</label>
                        <Input placeholder={t("checkout.notesPlaceholder")} value={customerDetails.notes} onChange={e => setCustomerDetails(prev => ({ ...prev, notes: e.target.value }))} className="h-12 rounded-xl font-medium" />
                      </div>

                      {customerProfile?.corporateProfile && (
                        <div className="space-y-3 pt-3 border-t border-border/50">
                          <label className="text-[10px] font-semibold text-muted-foreground  tracking-widest block">Njia ya Malipo (Payment Method)</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setPaymentType("whatsapp")}
                              className={cn(
                                "p-3 rounded-xl border text-xs font-bold text-center transition-all",
                                paymentType === "whatsapp"
                                  ? "border-primary bg-primary/5 text-primary"
                                  : "border-border hover:bg-muted"
                              )}
                            >
                              WhatsApp (Standard)
                            </button>
                            <button
                              type="button"
                              onClick={() => setPaymentType("po")}
                              className={cn(
                                "p-3 rounded-xl border text-xs font-bold text-center transition-all",
                                paymentType === "po"
                                  ? "border-primary bg-primary/5 text-primary"
                                  : "border-border hover:bg-muted"
                              )}
                            >
                              Purchase Order (PO)
                            </button>
                          </div>

                          {paymentType === "po" && departments.length > 0 && (
                            <div className="space-y-1.5 animate-in fade-in duration-200">
                              <label className="text-[10px] font-semibold text-muted-foreground  tracking-widest block">Chagua Idara (Department)</label>
                              <select
                                value={selectedDeptId}
                                onChange={e => setSelectedDeptId(e.target.value)}
                                className="flex h-11 w-full items-center justify-between rounded-xl border border-input bg-transparent px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                              >
                                {departments.map(d => (
                                  <option key={d.id} value={d.id}>{d.name} (Salio: {(d.budget - d.spent).toLocaleString()} TZS)</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                    <Box className="h-16 w-16 mb-4 text-muted-foreground" />
                    <p className="font-bold text-xl text-foreground">{t("cart.empty")}</p>
                    <p className="text-sm font-medium">{t("cart.emptyHint")}</p>
                    <Button onClick={() => setIsCartOpen(false)} variant="outline" className="mt-8 rounded-2xl h-12 px-6 font-bold">{t("cart.browseCatalog")}</Button>
                  </div>
                ) : (
                  cart.map(item => (
                    <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} key={item.product.id} className="group relative flex gap-4 bg-card p-4 rounded-2xl border border-border/40 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300">
                      <div className="h-20 w-20 bg-muted/20 rounded-xl overflow-hidden shrink-0 border border-border/30 relative">
                        <ProfessionalImage src={item.product.imageUrl} alt={item.product.name} className="h-full w-full" imageClassName="object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <p className="font-bold text-sm text-foreground line-clamp-2 mb-1 leading-tight">{item.product.name}</p>
                          <p className="text-primary font-black tracking-tight text-sm">TZS {getProductPrice(item.product, item.quantity).toLocaleString()}</p>
                          {isWholesale && item.product.moq && item.product.moq > 1 && (
                            <div className="mt-1">
                              <Badge variant="outline" className="text-[9px] font-bold text-primary border-primary/30 bg-primary/5 uppercase tracking-widest px-2 py-0.5">
                                MOQ: {item.product.moq}
                              </Badge>
                            </div>
                          )}
                        </div>
                        <div className="flex items-end justify-between mt-3">
                          <CartQuantityControl
                            item={item}
                            minQty={isWholesale ? (item.product.moq || 1) : 1}
                            updateQuantity={updateQuantity}
                            setExactQuantity={setExactQuantity}
                          />
                          <button onClick={() => removeFromCart(item.product.id)} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-md hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                            <span className="hidden sm:inline">Ondoa</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 border-t border-border/10 bg-card">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-muted-foreground font-bold tracking-widest text-[10px] uppercase">Kiasi (Subtotal)</span>
                    <span className="font-semibold text-foreground text-sm">TZS {cart.reduce((sum, item) => sum + (getProductPrice(item.product, item.quantity) * item.quantity), 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center mb-4 pb-4 border-b border-border/20">
                    <span className="text-muted-foreground font-bold tracking-widest text-[10px] uppercase flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Kadirio la Usafiri
                    </span>
                    <span className="font-semibold text-foreground text-sm">TZS {cart.length > 0 ? "5,000" : "0"}</span>
                  </div>
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-foreground font-black tracking-widest text-xs uppercase">Jumla (Total)</span>
                    <span className="text-2xl font-black text-foreground">TZS {(cart.reduce((sum, item) => sum + (getProductPrice(item.product, item.quantity) * item.quantity), 0) + (cart.length > 0 ? 5000 : 0)).toLocaleString()}</span>
                  </div>
                  <Button
                    disabled={isCheckingOut}
                    onClick={handleCheckout}
                    className={cn(
                      "w-full h-16 rounded-2xl text-white font-semibold text-lg  tracking-widest gap-3 transition-transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed",
                      paymentType === "po"
                        ? "bg-primary hover:bg-primary/95 shadow-primary/30"
                        : "bg-green-500 hover:bg-green-600 shadow-green-500/30"
                    )}
                  >
                    {isCheckingOut ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : paymentType === "po" ? (
                      <Package className="w-6 h-6" />
                    ) : (
                      <BsWhatsapp className="w-6 h-6" />
                    )}
                    {isCheckingOut
                      ? t("common.loading")
                      : (checkoutStep === "cart"
                        ? t("checkout.proceed")
                        : isB2BViewer
                          ? "Submit B2B Purchase Order"
                          : paymentType === "po"
                            ? "Thibitisha PO (Confirm PO)"
                            : t("checkout.confirmOrder"))}
                  </Button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] bg-background/95 backdrop-blur-3xl flex items-center justify-center p-4">
            <button onClick={() => setIsLightboxOpen(false)} className="absolute top-8 right-8 h-12 w-12 rounded-full bg-muted text-foreground flex items-center justify-center hover:bg-muted/80 hover:scale-105 transition-all">
              <X className="h-5 w-5" />
            </button>
            <div className="relative w-full h-full max-h-[80vh] max-w-5xl flex items-center justify-center">
              <ProfessionalImage src={hpImages[activeImageIdx]} alt="Full view" className="max-h-full max-w-full rounded-3xl shadow-2xl" imageClassName="object-contain" aspectRatio="auto" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Luxury Global Footer (Slim) */}
      <PublicFooter />

      {/* Public AI Shopping Assistant */}
      <PublicAIAssistantWidget
        contextData={{
          shopName: shop.name,
          location: shop.location,
          operatingHours: shop.operatingHours,
          phone: shop.phone,
          whatsappNumber: shop.whatsappNumber,
          productCount: productsWithStock.length,
          products: productsWithStock.map(p => ({
            id: p.id,
            name: p.name,
            price: p.sellingPrice,
            inStock: p.stock > 0,
            category: normalizeCategories(p)[0] || "Uncategorized"
          }))
        }}
      />

      {/* Share Product Dialog */}
      {productToShare && (
        <ShareProductDialog
          shopName={shop.name}
          shopId={shop.id}
          product={productToShare}
          isOpen={!!productToShare}
          onOpenChange={(open) => !open && setProductToShare(null)}
        />
      )}
    </div>
  );
}
