import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Store, MapPin, ArrowRight, ShieldCheck, Lock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getWholesaleSuppliers } from "@/lib/api/domains/storefront";
import { useI18n } from "@/lib/i18n";
import type { Shop } from "@/types";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { SupplierQuickViewModal } from "@/components/directory/SupplierQuickViewModal";
import { rankBySearch } from "@/lib/services/discoveryService";
import { parseQueryWithAI } from "@/lib/services/aiRecommendationService";

export default function PublicWholesaleDirectory() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [suppliers, setSuppliers] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [quickViewShop, setQuickViewShop] = useState<Shop | null>(null);

  // Keep the local query in sync with the global navbar search (manual + AI mode).
  useEffect(() => {
    const q = searchParams.get("q") || "";
    const isAi = searchParams.get("ai") === "true" || searchParams.get("ai") === "1";
    if (isAi && q.trim()) {
      let cancelled = false;
      parseQueryWithAI(q).then((filter) => {
        if (!cancelled) setSearch(filter.cleanQuery || q);
      });
      return () => { cancelled = true; };
    }
    setSearch(q);
  }, [searchParams]);


  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getWholesaleSuppliers();
        setSuppliers(data);
      } catch (err) {
        console.error("Failed to load wholesale suppliers:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleIntelligentSearch = (query: string) => {
    setSearch(query);
  };

  const categories = useMemo(() => {
    const allCategories = new Set<string>();
    suppliers.forEach((shop) => {
      const shopCats = shop.businessCategories || shop.categories || [];
      shopCats.forEach((cat) => allCategories.add(cat));
    });
    return ["All", ...Array.from(allCategories).sort()];
  }, [suppliers]);

  const categorySuppliers = suppliers.filter((supplier) => {
    const shopCats = supplier.businessCategories || supplier.categories || [];
    return selectedCategory === "All" || shopCats.includes(selectedCategory);
  });
  const filteredSuppliers = rankBySearch(categorySuppliers, search, (supplier) => [
    { value: supplier.name, weight: 10 },
    { value: (supplier.businessCategories || supplier.categories || []).join(" "), weight: 7 },
    { value: supplier.location, weight: 5 },
    { value: supplier.description, weight: 2 },
  ]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>{t("wholesale.discoverTitle")} | {t("wholesale.b2bNetwork")}</title>
        <meta name="description" content={t("wholesale.discoverDesc")} />
      </Helmet>

      <PublicNavbar />

      <main className="flex-1 pt-16 md:pt-20">


        {/* Directory Grid */}
        <div className="max-w-7xl mx-auto px-4 py-16">
          {/* Categories Row */}
          {!loading && categories.length > 1 && (
            <div className="flex overflow-x-auto gap-2 pb-4 mb-6 scrollbar-hide">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className="rounded-full whitespace-nowrap"
                >
                  {cat === "All" ? t("directory.categoriesLabel") || "All Categories" : cat}
                </Button>
              ))}
            </div>
          )}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-card rounded-2xl p-5 border border-border flex flex-col h-[280px] relative overflow-hidden animate-pulse">
                  <div className="flex items-start gap-4 mb-3">
                    <div className="w-14 h-14 rounded-xl bg-muted/60 shrink-0"></div>
                    <div className="flex-1 pt-0.5">
                      <div className="h-4 bg-muted/60 rounded-md w-3/4 mb-2"></div>
                      <div className="h-3 bg-muted/60 rounded-md w-1/2 mt-2"></div>
                    </div>
                  </div>
                  <div className="h-3 bg-muted/60 rounded-md w-full mb-2 mt-4"></div>
                  <div className="h-3 bg-muted/60 rounded-md w-5/6 mb-4"></div>
                  <div className="flex gap-1.5 mb-5 mt-auto">
                    <div className="h-4 bg-muted/60 rounded-md w-12"></div>
                    <div className="h-4 bg-muted/60 rounded-md w-16"></div>
                  </div>
                  <div className="w-full rounded-xl h-10 bg-muted/60"></div>
                </div>
              ))}
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-20 bg-muted/20 rounded-[2rem] border border-border/50 max-w-2xl mx-auto">
              <Store className="h-20 w-20 text-muted-foreground mx-auto mb-6 opacity-30" />
              <h3 className="text-2xl font-bold text-foreground mb-3">{t("wholesale.noSuppliersTitle")}</h3>
              <p className="text-muted-foreground text-lg">
                {search ? t("wholesale.noMatch") : t("wholesale.noListed")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {filteredSuppliers.map((shop, i) => (
                <div
                  key={shop.id}
                  onClick={() => setQuickViewShop(shop)}
                  className="bg-card rounded-2xl p-5 border border-border hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 group flex flex-col h-full relative overflow-hidden cursor-pointer"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full -z-10 transition-transform group-hover:scale-125 opacity-50"></div>
                  
                  <div className="flex items-start gap-4 mb-3">
                    {shop.imageUrl ? (
                      <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 shadow-sm border border-border/50 bg-white">
                        <img src={shop.imageUrl} alt={shop.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Store className="h-6 w-6" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <h3 className="font-bold text-base truncate text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                        {shop.name}
                        {shop.isPublic && <ShieldCheck className="h-4 w-4 text-green-500 shrink-0" />}
                      </h3>
                      
                      <div className="flex items-center gap-0.5 mt-1 text-amber-500">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <Star className="h-3.5 w-3.5 fill-current" />
                      </div>

                      {shop.location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1.5 font-medium">
                          <MapPin className="h-3 w-3 shrink-0 text-primary/70" />
                          <span className="truncate">{shop.location}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {shop.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-4 flex-grow">
                      {shop.description}
                    </p>
                  )}
                  {!shop.description && <div className="flex-grow"></div>}

                  {shop.businessCategories && shop.businessCategories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {shop.businessCategories.slice(0, 3).map(cat => (
                        <span key={cat} className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-[10px] font-semibold uppercase tracking-wider">
                          {cat}
                        </span>
                      ))}
                    </div>
                  )}

                  <Button 
                    className="w-full rounded-xl h-10 text-sm font-semibold shadow-sm hover:shadow-md transition-all bg-primary/10 text-primary hover:bg-primary hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      setQuickViewShop(shop);
                    }}
                  >
                    <Store className="h-3.5 w-3.5 mr-1.5" /> {t("wholesale.viewPrices")}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      
      <PublicFooter />

      <SupplierQuickViewModal 
        isOpen={!!quickViewShop} 
        onClose={() => setQuickViewShop(null)} 
        shop={quickViewShop} 
      />
    </div>
  );
}
