import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
  Search,
  Store,
  MapPin,
  X,
  ArrowRight,
  SlidersHorizontal,
  Menu,
  ShoppingBag,
  Sparkles,
  Tag,
  Flame,
  Star,
  TrendingUp,
  Zap,
  Filter,
  Check,
  ChevronRight,
  Compass,
  Navigation,
  Globe,
  Package,
  Loader2,
  Smartphone,
  Users,
  BarChart3,
  Phone,
  Mail,
  ChevronUp,
  ChevronDown,
  Eye,
  LogOut,
  User,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { useAppSelector } from "@/store/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MarketplaceAIAssistantWidget } from "@/components/public/MarketplaceAIAssistantWidget";
import SEO from "@/components/SEO";
import LanguageToggle from "@/components/LanguageToggle";
import Logo from "@/components/common/Logo";

import { getAllPublicProducts, getAllShops, searchPublicProducts } from "@/lib/api/domains/storefront";
import type { Shop, Product, Stock } from "@/types";
import { trackEvent } from "@/lib/analytics";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { ProductWall } from "@/components/directory/ProductWall";
import { TrustSystem } from "@/components/directory/TrustSystem";
import { DiscoveryRail } from "@/components/directory/DiscoveryRail";
import { MarketplaceProductCard } from "@/components/directory/MarketplaceProductCard";
import { QuickViewModal } from "@/components/directory/QuickViewModal";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { normalizeCategories, getCategoryName } from "@/lib/categories";
import { searchProducts, rankProducts, ProductPair } from "@/lib/services/discoveryService";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import { parseQueryWithAI, ParsedAIFilter } from "@/lib/services/aiRecommendationService";

interface ShopWithProducts extends Shop {
  products: Product[];
  productCount: number;
  categories: string[];
}

interface ServerSearchState {
  query: string;
  products: Product[];
  total: number;
  hasMore: boolean;
  nextPage: number;
}

/** Visibility gate the directory has always applied to every product row. */
function isVisibleProduct(p: Product) {
  const stockQty = p.stock ?? 0;
  return p.status === "active" && (p.name ?? "").trim() !== "" && (p.sellingPrice || 0) > 0 && stockQty > 0;
}

export default function ShopDirectory() {
  const [searchParams] = useSearchParams();
  const [shops, setShops] = useState<ShopWithProducts[]>([]);
  const [loading, setLoading] = useState(true);
  const [serverResults, setServerResults] = useState<ServerSearchState | null>(null);
  const [serverSearchStatus, setServerSearchStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [serverSearchRetry, setServerSearchRetry] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const serverSearchSeq = useRef(0);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchParams.get("q") || "");
  type SortOption = "relevance" | "price_asc" | "price_desc" | "newest" | "nearest";
  const [sortBy, setSortBy] = useState<SortOption>("relevance");

  useEffect(() => {
    const q = searchParams.get("q") || "";
    const isAi = searchParams.get("ai") === "true";
    if (isAi && q) {
      handleIntelligentSearch(q, true);
    } else {
      setSearchQuery(q);
      setAiFilter(null);
    }
  }, [searchParams]);
  const [aiFilter, setAiFilter] = useState<ParsedAIFilter | null>(null);
  const [activeVisitors, setActiveVisitors] = useState(1243);
  const [quickViewItem, setQuickViewItem] = useState<{product: Product, shop: Shop} | null>(null);

  useEffect(() => {
    // Simulate real-time active visitors fluctuating slightly
    const interval = setInterval(() => {
      setActiveVisitors(prev => Math.max(100, prev + Math.floor(Math.random() * 7) - 2));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 800);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const effectiveSearchQuery = (aiFilter ? aiFilter.cleanQuery : searchQuery).trim();
  const debouncedServerQuery = useDebouncedValue(effectiveSearchQuery, 350);

  // Server-wide search: supersedes the locally loaded rows once a response for
  // the current query lands, so matches in unloaded shops become reachable.
  useEffect(() => {
    const q = debouncedServerQuery;
    if (q.length < 2) {
      serverSearchSeq.current += 1;
      setServerResults(null);
      setServerSearchStatus("idle");
      setLoadingMore(false);
      return;
    }
    const seq = ++serverSearchSeq.current;
    setServerSearchStatus("loading");
    searchPublicProducts({ q, pageSize: 200 })
      .then((page) => {
        if (seq !== serverSearchSeq.current) return;
        setServerResults({
          query: q,
          products: page.products.filter(isVisibleProduct),
          total: page.count,
          hasMore: page.hasMore,
          nextPage: 2,
        });
        setServerSearchStatus("ready");
      })
      .catch(() => {
        if (seq !== serverSearchSeq.current) return;
        setServerResults(null);
        setServerSearchStatus("error");
      });
  }, [debouncedServerQuery, serverSearchRetry]);

  const loadMoreServerResults = async () => {
    if (!serverResults || loadingMore || !serverResults.hasMore) return;
    const seq = serverSearchSeq.current;
    const q = serverResults.query;
    setLoadingMore(true);
    try {
      const page = await searchPublicProducts({ q, page: serverResults.nextPage, pageSize: 200 });
      if (seq !== serverSearchSeq.current) return;
      setServerResults((prev) => {
        if (!prev || prev.query !== q) return prev;
        return {
          ...prev,
          products: [...prev.products, ...page.products.filter(isVisibleProduct)],
          hasMore: page.hasMore,
          nextPage: prev.nextPage + 1,
        };
      });
    } catch {
      // Keep what is on screen; the button stays available for another try.
    } finally {
      if (seq === serverSearchSeq.current) setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (debouncedSearchQuery.trim().length >= 2) {
      trackEvent("search_query", { query: debouncedSearchQuery, source: "directory_page" });
    }
  }, [debouncedSearchQuery]);

  const [selectedCategory, setSelectedCategory] = useState("");
  const [nearbyOnly, setNearbyOnly] = useState(false);

  const handleCategorySelect = (cat: string) => {
    const newCat = selectedCategory === cat ? "" : cat;
    setSelectedCategory(newCat);
    if (newCat) {
      trackEvent("category_filter", { category: newCat, source: "directory_page" });
    }
  };
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
      const user = useAppSelector((s) => s.auth.user);
  const roles = useAppSelector((s) => s.auth.roles);
  const isMerchant = !!(user && (
    user.capabilities?.canManageBusiness || 
    user.roles?.includes("merchant") || 
    user.roles?.includes("staff") || 
    roles.some((r) => r.role === "owner" || r.role === "manager" || r.role === "attendant")
  ));
  const accountDest = isMerchant ? "/dashboard" : "/customer/profile";
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  
  const { t, lang, toggleLang, setLang } = useI18n();
  const gridRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const headerOpacity = useTransform(scrollY, [0, 100], [0, 1]);
  const { activity, trackProductView, trackShopView, trackSearch } = useActivityTracker();

  useEffect(() => {
    async function load() {
      try {
        // One shops page set plus one cross-shop product stream, instead of a
        // products request per shop. The stream arrives newest-first and each
        // shop's slice keeps that browse order, matching the old per-shop reads.
        const [allShops, allProducts] = await Promise.all([
          getAllShops({ isPublic: true }),
          getAllPublicProducts(),
        ]);

        const knownShopIds = new Set(allShops.map((shop) => shop.id));
        const productsByShop = new Map<string, Product[]>();
        for (const product of allProducts) {
          if (!knownShopIds.has(product.shopId) || !isVisibleProduct(product)) continue;
          const row = { ...product, _stockQty: product.stock ?? 0 };
          const list = productsByShop.get(product.shopId);
          if (list) list.push(row);
          else productsByShop.set(product.shopId, [row]);
        }

        const enriched: ShopWithProducts[] = allShops.map((shop) => {
          const products = productsByShop.get(shop.id) ?? [];
          const categories = [...new Set(products.flatMap((p) => normalizeCategories(p)).filter(Boolean))];
          return { ...shop, products, productCount: products.length, categories };
        });
        // Only show shops that are public AND have at least one active product in stock
        setShops(enriched.filter(s => s.isPublic === true && s.productCount > 0));
      } catch (err) {
        console.error("Failed to load shops:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleNearbyToggle = () => {
    if (!nearbyOnly) {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({ lat: position.coords.latitude, lon: position.coords.longitude });
            if (sortBy === "nearest") {
              // Location already being set, handle it normally
            } else {
              setNearbyOnly(true);
            }
          },
          (error) => {
            console.error("Error getting location:", error);
            if (sortBy !== "nearest") setNearbyOnly(true);
          }
        );
      } else {
        setNearbyOnly(true);
      }
    } else {
      setNearbyOnly(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const allProductPairs = useMemo(() => shops.flatMap(shop => (shop.products || []).map(product => ({ product, shop, stockQty: (product as any)._stockQty }))), [shops]);

  const shopById = useMemo(() => new Map(shops.map((s) => [s.id, s])), [shops]);

  /**
   * Server results take over only when they answer the query currently in the
   * box (live, not debounced) — during the debounce window or after an error
   * the locally ranked rows keep rendering.
   */
  const serverActive = serverResults !== null && serverResults.query === effectiveSearchQuery && effectiveSearchQuery.length >= 2;

  const baseProductPairs = useMemo(() => {
    if (serverActive && serverResults) {
      const pairs: ProductPair[] = [];
      for (const product of serverResults.products) {
        const shop = shopById.get(product.shopId);
        if (!shop) continue;
        pairs.push({ product, shop, stockQty: product.stock ?? 0 });
      }
      return pairs;
    }
    return allProductPairs as unknown as ProductPair[];
  }, [serverActive, serverResults, shopById, allProductPairs]);

  const crossSellItems = useMemo(() => {
    if (!quickViewItem) return [];
    return allProductPairs
      .filter((p: any) => p.shop.id === quickViewItem.shop.id && p.product.id !== quickViewItem.product.id)
      .slice(0, 5) as ProductPair[];
  }, [quickViewItem, allProductPairs]);
  const categories = useMemo(() => [...new Set(shops.flatMap((s) => s.categories || []))].sort(), [shops]);
  const nearbyShopsList = useMemo(() => {
    if (!userLocation) return [];
    return shops
      .filter(s => s.lat && s.lon && calculateDistance(userLocation.lat, userLocation.lon, s.lat, s.lon) < 50)
      .sort((a, b) => calculateDistance(userLocation.lat, userLocation.lon, a.lat!, a.lon!) - calculateDistance(userLocation.lat, userLocation.lon, b.lat!, b.lon!));
  }, [shops, userLocation]);

  const filteredProductPairs = useMemo(() => {
    let result = baseProductPairs;
    
    // Use the smart search service with the cleaned query if in AI mode
    const activeSearchQuery = aiFilter ? aiFilter.cleanQuery : searchQuery;
    if (serverActive) {
      // Server rows arrive already ranked; keep that order and only re-apply
      // the category chip (its values do not match server category semantics).
      // Slice first: the sort switch below mutates in place, and the memoized
      // server array must stay in its original relevance order.
      result = searchProducts(result.slice(), "", selectedCategory);
    } else {
      result = searchProducts(result, activeSearchQuery, selectedCategory);
    }
    
    if (aiFilter) {
      if (aiFilter.maxPrice) {
        result = result.filter(item => (item.product.sellingPrice || 0) <= aiFilter.maxPrice!);
      }
      if (aiFilter.minPrice) {
        result = result.filter(item => (item.product.sellingPrice || 0) >= aiFilter.minPrice!);
      }
      if (aiFilter.brand) {
        const lowerBrand = aiFilter.brand.toLowerCase();
        result = result.filter(item => item.product.name.toLowerCase().includes(lowerBrand) || item.product.description?.toLowerCase().includes(lowerBrand));
      }
    }
    
    if (nearbyOnly && userLocation) {
      result = result.filter(item => item.shop.lat && item.shop.lon ? calculateDistance(userLocation.lat, userLocation.lon, item.shop.lat, item.shop.lon) < 500 : true);
    }
    
    switch (sortBy) {
      case "price_asc":
        result = result.sort((a, b) => (a.product.sellingPrice || 0) - (b.product.sellingPrice || 0));
        break;
      case "price_desc":
        result = result.sort((a, b) => (b.product.sellingPrice || 0) - (a.product.sellingPrice || 0));
        break;
      case "newest":
        result = result.sort((a, b) => {
           // Typecast to any to safely extract date strings if createdAt exists
           const timeA = a.product.createdAt ? new Date(a.product.createdAt as any).getTime() : 0;
           const timeB = b.product.createdAt ? new Date(b.product.createdAt as any).getTime() : 0;
           return timeB - timeA;
        });
        break;
      case "nearest":
        if (userLocation) {
          result = result.sort((a, b) => {
             const distA = a.shop.lat && a.shop.lon ? calculateDistance(userLocation.lat, userLocation.lon, a.shop.lat, a.shop.lon) : 9999;
             const distB = b.shop.lat && b.shop.lon ? calculateDistance(userLocation.lat, userLocation.lon, b.shop.lat, b.shop.lon) : 9999;
             return distA - distB;
          });
        }
        break;
      case "relevance":
      default:
        // Already sorted by relevance via fuse.js in searchProducts
        if (nearbyOnly && userLocation) {
          result = result.sort((a, b) => {
            if (a.shop.lat && b.shop.lat) return calculateDistance(userLocation.lat, userLocation.lon, a.shop.lat!, a.shop.lon!) - calculateDistance(userLocation.lat, userLocation.lon, b.shop.lat!, b.shop.lon!);
            return a.shop.lat ? -1 : 1;
          });
        }
        break;
    }
    
    return result;
  }, [baseProductPairs, serverActive, searchQuery, selectedCategory, nearbyOnly, userLocation, aiFilter, sortBy]);

  const handleIntelligentSearch = async (query: string, isAiMode: boolean) => {
    setSearchQuery(query);
    if (isAiMode && query.trim() !== "") {
      const filter = await parseQueryWithAI(query);
      setAiFilter(filter);
    } else if (!isAiMode || query.trim() === "") {
      setAiFilter(null);
    }
  };

  // Track search queries automatically when they settle
  useEffect(() => {
    if (debouncedSearchQuery.trim().length >= 2) {
      trackSearch(debouncedSearchQuery);
    }
  }, [debouncedSearchQuery, trackSearch]);

  // Automatically request location if sorting by nearest
  useEffect(() => {
    if (sortBy === "nearest" && !userLocation) {
      handleNearbyToggle();
    }
  }, [sortBy]);

  const clearFilters = () => { setSearchQuery(""); setSelectedCategory(""); setNearbyOnly(false); setSortBy("relevance"); };

      return (
    <div className="min-h-screen text-foreground selection:bg-primary/30 relative bg-background">
      <SEO title="Twende Duka — Elite Global Marketplace" description="Twende Duka: Rekodi mauzo • Simamia bidhaa • Fuatilia matumizi • Duka mtandaoni • Ripoti za biashara. Mfumo mmoja wa kisasa kwa duka lako Tanzania." canonical="/" />

      <PublicNavbar />

      <main className="pt-16 md:pt-20">
        
        {/* Modern Brand-Aligned Hero / Landing Section */}
      

        {/* 2. Visual Categories (Scrollable row) */}
        <section className="py-6 sm:py-8 border-b border-border/40 bg-muted/10">
                <div className="w-full max-w-7xl mx-auto px-4 sm:px-6">
                  <div className="flex items-center justify-between mb-4">
                    {/* <h2 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2">
                      <Tag className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      {t("directory.vision.33")}
                    </h2> */}
                    {selectedCategory && (
                      <button onClick={clearFilters} className="text-xs sm:text-sm font-bold text-primary hover:text-primary/80 transition-colors">
                        {t("directory.vision.34")}
                      </button>
                    )}
                  </div>
                  <div 
                    className="flex gap-2.5 sm:gap-4 overflow-x-auto pb-4 pt-2 no-scrollbar -mx-4 px-4 sm:-mx-6 sm:px-6"
                    style={{ maskImage: "linear-gradient(to right, transparent, black 2%, black 98%, transparent)" }}
                  >
                    <button
                      onClick={() => setSelectedCategory("")}
                      className={`relative shrink-0 flex items-center gap-2 px-5 sm:px-6 h-10 sm:h-12 rounded-[1rem] transition-all duration-300 text-xs sm:text-sm font-extrabold whitespace-nowrap active:scale-[0.96] ${
                        !selectedCategory
                          ? "bg-gradient-to-br from-primary to-primary/80 text-white shadow-xl shadow-primary/30 border-0"
                          : "bg-muted/50 hover:bg-primary/5 text-foreground/70 hover:text-primary border border-border/50 hover:border-primary/30 shadow-sm"
                      }`}
                    >
                      <Sparkles className={`h-4 w-4 sm:h-5 sm:w-5 ${!selectedCategory ? "text-white" : "text-primary"}`} />
                      {t("directory.vision.35")}
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => handleCategorySelect(cat)}
                        className={`relative shrink-0 flex items-center gap-2 px-5 sm:px-6 h-10 sm:h-12 rounded-[1rem] transition-all duration-300 text-xs sm:text-sm font-extrabold whitespace-nowrap active:scale-[0.96] ${
                          selectedCategory === cat
                            ? "bg-gradient-to-br from-primary to-primary/80 text-white shadow-xl shadow-primary/30 border-0"
                            : "bg-muted/50 hover:bg-primary/5 text-foreground/70 hover:text-primary border border-border/50 hover:border-primary/30 shadow-sm"
                        }`}
                      >
                        <ShoppingBag className={`h-4 w-4 sm:h-5 sm:w-5 ${selectedCategory === cat ? "text-white" : "text-primary"}`} />
                        {getCategoryName(cat)}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {/* Promotions Section */}
         
              

          

              {/* Duplicate Feeds Removed */}

              {/* 7. Nearby Shops */}
              {userLocation && nearbyShopsList.length > 0 && !searchQuery && !selectedCategory && !nearbyOnly && (
                <section className="py-8 sm:py-12 bg-primary/5 border-y border-border/40">
                  <div className="w-full max-w-7xl mx-auto px-4 sm:px-6">
                    <h2 className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2 mb-5 sm:mb-8">
                      <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /> {t("directory.vision.47")}
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                      {nearbyShopsList.slice(0, 4).map((shop) => (
                        <Link key={shop.id} to={`/shop/${shop.slug || shop.id}`} className="group block">
                          <div className="bg-card rounded-2xl sm:rounded-[2rem] border border-border/40 overflow-hidden shadow-sm hover:shadow-xl transition-all hover:-translate-y-0.5 sm:hover:-translate-y-1 flex flex-col h-full">
                            <div className="h-16 sm:h-20 md:h-24 w-full bg-primary relative">
                               <div className="absolute inset-0 bg-black/10"></div>
                            </div>
                            <div className="px-3 sm:px-5 pb-4 sm:pb-6 pt-0 flex-1 flex flex-col items-center text-center">
                              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-white border-4 border-card flex items-center justify-center shrink-0 text-primary font-bold text-lg sm:text-xl shadow-lg -mt-6 sm:-mt-7 relative z-10">
                                {shop.name.charAt(0).toUpperCase()}
                              </div>
                              <h3 className="text-sm sm:text-base font-bold mt-2 group-hover:text-primary transition-colors line-clamp-1 w-full">{shop.name}</h3>
                              <Badge variant="secondary" className="bg-primary/5 text-primary rounded-lg text-[9px] sm:text-[10px] font-bold uppercase mt-1.5 px-2 py-0.5">
                                <Package className="h-2.5 w-2.5 mr-1" /> {shop.productCount}
                              </Badge>
                              {shop.location && (
                                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium mt-2 line-clamp-2 w-full leading-snug">
                                  {shop.location.split(',').slice(0, 2).join(', ')}
                                </p>
                              )}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* 8. Main Feed / Search Results */}
              <section className="py-8 sm:py-12 md:py-16 bg-background">
                <div className="w-full max-w-7xl mx-auto px-4 sm:px-6">
                  
                  {/* Dynamic Sections when NO search/filter is active */}
                  {!searchQuery && !selectedCategory && !nearbyOnly ? (
                    <div className="space-y-12 sm:space-y-16">
                      
                      {/* Recently Viewed */}
                      {activity.recentlyViewedProductIds.length > 0 && (
                        <DiscoveryRail
                          title={t("directory.recentlyViewed")}
                          subtitle={t("directory.yourHistory")}
                          icon={Eye}
                          items={activity.recentlyViewedProductIds
                            .map(id => allProductPairs.find((p: any) => p.product.id === id))
                            .filter(Boolean) as ProductPair[]}
                          onProductClick={setQuickViewItem}
                        />
                      )}

                      {/* Trending Now */}
                      <DiscoveryRail
                        title={t("directory.trendingNow")}
                        subtitle={t("directory.popularPicks")}
                        icon={Flame}
                        items={rankProducts(allProductPairs as ProductPair[], "trending").slice(0, 10)}
                        onProductClick={setQuickViewItem}
                      />
                      
                      {/* New Arrivals */}
                      <DiscoveryRail
                        title={t("directory.vision.43") || "New Arrivals"}
                        subtitle={t("directory.vision.44") || "Fresh products on the market"}
                        icon={Sparkles}
                        items={rankProducts(allProductPairs as ProductPair[], "new_arrivals").slice(0, 10)}
                        onProductClick={setQuickViewItem}
                      />

                      {/* Recommended For You */}
                      <DiscoveryRail
                        title={t("directory.recommendedForYou")}
                        subtitle={t("directory.curatedSelection")}
                        icon={Star}
                        items={rankProducts(allProductPairs as ProductPair[], "random").slice(0, 10)}
                        onProductClick={setQuickViewItem}
                      />
                    </div>
                  ) : (
                    /* Search Results State */
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8">
                        <div>
                          <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight">
                            {t("directory.vision.searchResults")}
                          </h2>
                          <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-1">
                            {serverActive && serverResults && serverResults.total > filteredProductPairs.length
                              ? t("directory.showingProductsOf").replace("{count}", filteredProductPairs.length.toString()).replace("{total}", serverResults.total.toString())
                              : t("directory.showingProducts").replace("{count}", filteredProductPairs.length.toString())}
                          </p>
                          {/* Active Filters Display */}
                          {(searchQuery || selectedCategory || nearbyOnly) && (
                            <div className="flex flex-wrap items-center gap-2 mt-3">
                              {searchQuery && (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                                  <span>{lang === "sw" ? "Utafutaji:" : "Search:"} {searchQuery}</span>
                                  <button onClick={() => setSearchQuery("")} className="hover:bg-primary/20 rounded-full p-0.5 transition-colors">
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}
                              {selectedCategory && (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                                  <Tag className="h-3.5 w-3.5" />
                                  <span>{selectedCategory}</span>
                                  <button onClick={() => setSelectedCategory("")} className="hover:bg-primary/20 rounded-full p-0.5 transition-colors">
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}
                              {nearbyOnly && (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                                  <MapPin className="h-3.5 w-3.5" />
                                  <span>{lang === "sw" ? "Zilizo Karibu" : "Nearby Only"}</span>
                                  <button onClick={() => setNearbyOnly(false)} className="hover:bg-primary/20 rounded-full p-0.5 transition-colors">
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}
                              <button onClick={clearFilters} className="text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors ml-1 underline underline-offset-2">
                                {t("directory.resetFilters")}
                              </button>
                            </div>
                          )}
                        </div>
                        {/* Filters and Sorting */}
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                            <SelectTrigger className="flex-1 sm:flex-none sm:w-[160px] h-9 sm:h-10 rounded-xl bg-card border-border/50 font-semibold focus:ring-0">
                              <div className="flex items-center gap-2 text-xs sm:text-sm truncate">
                                <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <SelectValue placeholder={lang === "sw" ? "Panga Kwa" : "Sort By"} />
                              </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl z-[200]">
                              <SelectItem value="relevance" className="text-xs sm:text-sm font-medium">{lang === "sw" ? "Umuhimu" : "Relevance"}</SelectItem>
                              <SelectItem value="price_asc" className="text-xs sm:text-sm font-medium">{lang === "sw" ? "Bei: Ndogo kwenda Kubwa" : "Price: Low to High"}</SelectItem>
                              <SelectItem value="price_desc" className="text-xs sm:text-sm font-medium">{lang === "sw" ? "Bei: Kubwa kwenda Ndogo" : "Price: High to Low"}</SelectItem>
                              <SelectItem value="newest" className="text-xs sm:text-sm font-medium">{lang === "sw" ? "Mpya Zaidi" : "Newest Arrivals"}</SelectItem>
                              <SelectItem value="nearest" className="text-xs sm:text-sm font-medium">{lang === "sw" ? "Karibu Zaidi" : "Nearest First"}</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          {/* Location Toggle */}
                          <button
                            onClick={handleNearbyToggle}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 h-9 sm:h-10 rounded-xl text-xs sm:text-sm font-bold transition-all border-2 ${
                              nearbyOnly
                                ? "bg-primary text-white border-primary shadow-lg"
                                : "border-border/50 text-foreground hover:border-primary/30"
                            }`}
                          >
                            <Navigation className={`h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 ${nearbyOnly ? "animate-bounce" : ""}`} />
                            <span className="truncate">{nearbyOnly ? (lang === "sw" ? "Zilizo Karibu" : "Nearby On") : (lang === "sw" ? "Onyesha za Karibu" : "Show Nearby")}</span>
                          </button>
                        </div>
                      </div>

                      {/* SERVER SEARCH STATUS */}
                      {serverSearchStatus === "loading" && (
                        <div className="flex items-center gap-2 mb-4 text-xs sm:text-sm font-semibold text-muted-foreground" role="status">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          {t("directory.searchingProducts")}
                        </div>
                      )}

                      {serverSearchStatus === "error" && (
                        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3" role="alert">
                          <p className="text-sm font-semibold text-destructive">{t("directory.searchFailed")}</p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl font-bold shrink-0 border-destructive/30 text-destructive hover:text-destructive"
                            onClick={() => setServerSearchRetry((n) => n + 1)}
                          >
                            {t("common.retry")}
                          </Button>
                        </div>
                      )}

                      {/* SKELETON */}
                      {loading && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                          {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} className="aspect-[3/4] animate-pulse rounded-[2rem] bg-muted/50 w-full" />
                          ))}
                        </div>
                      )}

                      {/* EMPTY STATE */}
                      {!loading && filteredProductPairs.length === 0 && (
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-24 text-center bg-muted/10 rounded-[3rem] border-2 border-dashed border-border/50 max-w-2xl mx-auto">
                          <div className="h-20 w-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-6"><ShoppingBag className="h-8 w-8 text-muted-foreground/40" /></div>
                          <h3 className="text-2xl font-semibold tracking-tight text-foreground">{t("directory.noProducts")}</h3>
                          <p className="mt-3 text-base text-muted-foreground max-w-sm mx-auto font-bold">{t("directory.noProductsDesc")}</p>
                          <Button onClick={clearFilters} className="mt-8 rounded-2xl font-semibold px-10 h-14 shadow-xl">
                            {t("directory.resetFilters")}
                          </Button>
                        </motion.div>
                      )}

                      {/* PRODUCT WALL */}
                      {!loading && filteredProductPairs.length > 0 && (
                        <>
                          <ProductWall 
                            products={filteredProductPairs} 
                            isMerchant={isMerchant} 
                            onProductClick={setQuickViewItem}
                          />
                          {serverActive && serverResults?.hasMore && (
                            <div className="flex justify-center mt-8 sm:mt-10">
                              <Button
                                variant="outline"
                                className="rounded-2xl font-bold px-8 h-12 border-2"
                                disabled={loadingMore}
                                onClick={loadMoreServerResults}
                              >
                                {loadingMore ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    {t("directory.loadingMore")}
                                  </>
                                ) : (
                                  t("directory.loadMore")
                                )}
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              </section>
              
              <QuickViewModal
                isOpen={!!quickViewItem}
                onClose={() => setQuickViewItem(null)}
                product={quickViewItem?.product || null}
                shop={quickViewItem?.shop || null}
                crossSellItems={crossSellItems}
                onCrossSellClick={setQuickViewItem}
              />
              
              {/* <div className="border-t border-border/40 pt-12 bg-muted/5">
                <TrustSystem />
              </div> */}


      {/* 9. Vipengele — core platform features */}
      <section className="py-10 sm:py-14 md:py-16 border-t border-border/40 bg-muted/10">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            {t("directory.features.title")}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground font-medium mt-2 max-w-2xl">
            {t("directory.features.subtitle")}
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 mt-6 sm:mt-10">
            {[
              { icon: Zap, title: t("directory.features.salesTitle"), desc: t("directory.features.salesDesc") },
              { icon: Package, title: t("directory.features.inventoryTitle"), desc: t("directory.features.inventoryDesc") },
              { icon: TrendingUp, title: t("directory.features.expensesTitle"), desc: t("directory.features.expensesDesc") },
              { icon: Globe, title: t("directory.features.onlineTitle"), desc: t("directory.features.onlineDesc") },
              { icon: Users, title: t("directory.features.customersTitle"), desc: t("directory.features.customersDesc") },
              { icon: BarChart3, title: t("directory.features.reportsTitle"), desc: t("directory.features.reportsDesc") },
            ].map((f) => (
              <div key={f.title} className="bg-card rounded-2xl sm:rounded-[2rem] border border-border/40 p-4 sm:p-7 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all">
                <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <f.icon className="h-4 w-4 sm:h-6 sm:w-6" />
                </div>
                <h3 className="text-xs sm:text-lg font-bold mt-3 sm:mt-5 tracking-tight">{f.title}</h3>
                <p className="text-[10px] sm:text-sm text-muted-foreground font-medium mt-1.5 sm:mt-2 leading-snug sm:leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      </main>

      <PublicFooter />

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-[150] bg-background/95 backdrop-blur-2xl border-t border-border/20 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] pb-safe pt-2 px-6">
        <div className="flex items-center justify-between h-16">
          <button onClick={() => { window.scrollTo({top: 0, behavior: "smooth"}); }} className={`flex flex-col items-center gap-1 ${"text-primary"}`}>
            <Compass className={`h-6 w-6 ${"fill-primary/20"}`} />
            <span className="text-[10px] font-semibold uppercase tracking-widest">{t("directory.vision.48")}</span>
          </button>
          <button onClick={() => setIsMobileFilterOpen(true)} className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground relative">
            <Filter className="h-6 w-6" />
            <span className="text-[10px] font-semibold uppercase tracking-widest">{t("directory.vision.49")}</span>
            {(selectedCategory || nearbyOnly) && (
              <span className="absolute top-0 right-1 h-2 w-2 rounded-full bg-primary animate-pulse" />
            )}
          </button>
          {user ? (
            <Link to={accountDest} className="flex flex-col items-center gap-1 text-primary">
              <User className="h-6 w-6 fill-primary/20" />
              <span className="text-[10px] font-semibold uppercase tracking-widest">{isMerchant ? "Dashibodi" : "Akaunti"}</span>
            </Link>
          ) : (
            <>
              <Link to="/login" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground">
                <User className="h-6 w-6" />
                <span className="text-[10px] font-semibold uppercase tracking-widest">{t("directory.vision.50")}</span>
              </Link>
              <Link to="/register" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground">
                <Store className="h-6 w-6" />
                <span className="text-[10px] font-semibold uppercase tracking-widest">{t("directory.vision.51")}</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile Bottom Sheet Filters */}
      <AnimatePresence>
        {isMobileFilterOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[160] lg:hidden"
              onClick={() => setIsMobileFilterOpen(false)}
            />
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }} 
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 inset-x-0 z-[170] bg-card rounded-t-[2.5rem] shadow-[0_-20px_60px_rgba(0,0,0,0.1)] lg:hidden flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between p-6 pb-4 border-b border-border/40">
                <h3 className="text-xl font-bold">{t("directory.vision.52")}</h3>
                <button onClick={() => setIsMobileFilterOpen(false)} className="h-10 w-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-8 flex-1">
                {/* Location Filter */}
                <div className="space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Eneo / Location</p>
                  <div 
                    onClick={handleNearbyToggle}
                    className="w-full flex items-center justify-between px-1 py-2 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${nearbyOnly ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        <Navigation className={`h-4 w-4 ${nearbyOnly ? "animate-pulse" : ""}`} />
                      </div>
                      <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        {t("directory.vision.53")}
                      </span>
                    </div>
                    {/* Custom Toggle Switch */}
                    <div className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${nearbyOnly ? 'bg-primary' : 'bg-border/60'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white absolute transition-transform shadow-sm ${nearbyOnly ? 'translate-x-6' : 'translate-x-1'}`} />
                    </div>
                  </div>
                </div>

                {/* Categories Filter */}
                <div className="space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Jamii / Categories</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => { setSelectedCategory(""); setIsMobileFilterOpen(false); }}
                      className={`px-4 py-2 rounded-[0.8rem] text-xs sm:text-sm font-extrabold transition-all active:scale-95 ${!selectedCategory ? "bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg shadow-primary/30 border-0" : "bg-muted/50 hover:bg-primary/5 text-foreground/70 hover:text-primary border border-border/50 hover:border-primary/30 shadow-sm"}`}
                    >
                      Zote
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => { handleCategorySelect(cat); setIsMobileFilterOpen(false); }}
                        className={`px-4 py-2 rounded-[0.8rem] text-xs sm:text-sm font-extrabold transition-all active:scale-95 ${selectedCategory === cat ? "bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg shadow-primary/30 border-0" : "bg-muted/50 hover:bg-primary/5 text-foreground/70 hover:text-primary border border-border/50 hover:border-primary/30 shadow-sm"}`}
                      >
                        {getCategoryName(cat)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-border/40 bg-card shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold border-2" onClick={() => { clearFilters(); setIsMobileFilterOpen(false); }}>{t("directory.vision.54")}</Button>
                  <Button className="flex-1 h-12 rounded-xl font-bold shadow-lg shadow-primary/20" onClick={() => setIsMobileFilterOpen(false)}>{t("directory.vision.55")}</Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
