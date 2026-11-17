import { useMemo, useState } from "react";
import { Check, Image as ImageIcon, PackagePlus, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ProfessionalImage } from "@/components/common/ProfessionalImage";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useMasterCatalog, useTapToAdd } from "@/hooks/useMasterCatalog";
import { useAppSelector } from "@/store/hooks";
import type { MasterCatalogProduct } from "@/types";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import CatalogStagingSheet from "./CatalogStagingSheet";

/** The seeded electronics catalog; real rows from the API are merged in. */
const FALLBACK_CATEGORIES = [
  "Smartphones",
  "Feature Phones",
  "Tablets",
  "Laptops",
  "Chargers & Cables",
  "Power Banks",
  "Audio",
  "Smartwatches",
  "Memory Cards",
  "Flash Drives",
  "Screen Protectors",
  "Phone Cases",
  "Networking",
  "Laptop Accessories",
];

/** Category names live in the backend data; these translate the known ones. */
const CATEGORY_KEYS: Record<string, TranslationKey> = {
  "Smartphones": "catalog.cat.smartphones",
  "Feature Phones": "catalog.cat.featurePhones",
  "Tablets": "catalog.cat.tablets",
  "Laptops": "catalog.cat.laptops",
  "Chargers & Cables": "catalog.cat.chargersCables",
  "Power Banks": "catalog.cat.powerBanks",
  "Audio": "catalog.cat.audio",
  "Smartwatches": "catalog.cat.smartwatches",
  "Memory Cards": "catalog.cat.memoryCards",
  "Flash Drives": "catalog.cat.flashDrives",
  "Screen Protectors": "catalog.cat.screenProtectors",
  "Phone Cases": "catalog.cat.phoneCases",
  "Networking": "catalog.cat.networking",
  "Laptop Accessories": "catalog.cat.laptopAccessories",
};

export interface StagedSelection {
  master: MasterCatalogProduct;
  buyingPrice: string;
  sellingPrice: string;
  /** Empty string = count from the scanned IMEIs, per the backend rule. */
  quantity: string;
  imeis: string[];
}

interface Props {
  shopId: string | null;
  branchId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TapToAddCatalogDialog({ shopId, branchId, open, onOpenChange }: Props) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [staged, setStaged] = useState<Record<string, StagedSelection>>({});
  const [stagingOpen, setStagingOpen] = useState(false);

  const shop = useAppSelector((s) => s.shops.shops.find((s2) => s2.id === shopId));
  const filter = useMemo(
    () => ({ shopId, q: debouncedSearch, category, brand, productCategories: shop?.productCategories }),
    [shopId, debouncedSearch, category, brand, shop?.productCategories]
  );
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useMasterCatalog(filter);
  const tapToAdd = useTapToAdd(shopId);

  const catalogRows = useMemo(
    () => (data ? data.pages.flatMap((page) => page.products) : []),
    [data]
  );

  const categories = useMemo(() => {
    const seen = new Set<string>(FALLBACK_CATEGORIES);
    for (const row of catalogRows) if (row.categoryName) seen.add(row.categoryName);
    return [...seen];
  }, [catalogRows]);

  const brands = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of catalogRows) if (row.brand) counts.set(row.brand, (counts.get(row.brand) || 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([name]) => name);
  }, [catalogRows]);

  const stagedCount = Object.keys(staged).length;

  const toggleStaged = (row: MasterCatalogProduct) => {
    setStaged((current) => {
      if (current[row.id]) {
        const next = { ...current };
        delete next[row.id];
        return next;
      }
      return {
        ...current,
        [row.id]: {
          master: row,
          buyingPrice: "",
          sellingPrice: "",
          quantity: "",
          imeis: [],
        },
      };
    });
  };

  const updateStaged = (id: string, patch: Partial<StagedSelection>) => {
    setStaged((current) => (current[id] ? { ...current, [id]: { ...current[id], ...patch } } : current));
  };

  const closeAll = () => {
    setStagingOpen(false);
    onOpenChange(false);
    setStaged({});
    setSearch("");
    setCategory("");
    setBrand("");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) closeAll(); }}>
        <DialogContent className="h-[100dvh] max-h-[100dvh] w-[100vw] max-w-[100vw] overflow-hidden rounded-none bg-background/95 p-4 backdrop-blur-sm grid-rows-[auto_minmax(0,1fr)] sm:h-[95vh] sm:max-h-[95vh] sm:w-[96vw] sm:max-w-[96vw] sm:rounded-3xl sm:p-6">
          <DialogHeader className="flex min-w-0 flex-col gap-3 border-b pb-4">
            <div className="flex flex-row items-start justify-between pr-8">
              <div>
                <DialogTitle className="text-xl sm:text-2xl">{t("catalog.title")}</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">{t("catalog.subtitle")}</p>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("catalog.searchPlaceholder")}
                className="h-11 rounded-xl bg-background pl-9 text-sm"
              />
            </div>
            <div className="space-y-2">
              <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <Pill active={!category} onClick={() => setCategory("")}>{t("catalog.allCategories")}</Pill>
                {categories.map((name) => (
                  <Pill key={name} active={category === name} onClick={() => setCategory(category === name ? "" : name)}>
                    {CATEGORY_KEYS[name] ? t(CATEGORY_KEYS[name]) : name}
                  </Pill>
                ))}
              </div>
              {brands.length > 1 && (
                <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <Pill active={!brand} onClick={() => setBrand("")}>{t("catalog.allBrands")}</Pill>
                  {brands.map((name) => (
                    <Pill key={name} active={brand === name} onClick={() => setBrand(brand === name ? "" : name)}>
                      {name}
                    </Pill>
                  ))}
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="min-h-0 overflow-y-auto pb-28">
            {isLoading && catalogRows.length === 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted/40" />
                ))}
              </div>
            ) : catalogRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/50 py-16 text-center">
                <PackagePlus className="mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="font-semibold text-muted-foreground">{t("catalog.noResults")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {catalogRows.map((row) => (
                  <CatalogCard
                    key={row.id}
                    row={row}
                    selected={!!staged[row.id]}
                    onToggle={() => toggleStaged(row)}
                  />
                ))}
              </div>
            )}

            {hasNextPage && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={isFetchingNextPage}
                  onClick={() => fetchNextPage()}
                >
                  {t("catalog.loadMore")}
                </Button>
              </div>
            )}
          </div>

          {stagedCount > 0 && (
            <div className="absolute inset-x-4 bottom-4 z-10 sm:inset-x-6 sm:bottom-6">
              <div className="rounded-2xl border border-border/60 bg-background/95 p-2 shadow-xl backdrop-blur-md">
                <Button
                  className="h-12 w-full rounded-xl text-sm font-black tracking-wide"
                  onClick={() => setStagingOpen(true)}
                >
                  <span className="flex w-full items-center justify-between px-2">
                    <span>{t("catalog.review")}</span>
                    <span className="rounded-lg bg-white/20 px-2.5 py-0.5 font-black">
                      {t("catalog.selectedCount").replace("{n}", String(stagedCount))}
                    </span>
                  </span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CatalogStagingSheet
        open={stagingOpen}
        lines={Object.values(staged)}
        submitting={tapToAdd.isPending}
        onClose={() => setStagingOpen(false)}
        onUpdate={updateStaged}
        onRemove={(id) => setStaged((current) => {
          const next = { ...current };
          delete next[id];
          return next;
        })}
        onSubmit={async () => {
          const items = Object.values(staged).map((line) => ({
            masterProductId: line.master.id,
            buyingPrice: line.buyingPrice.trim() === "" ? undefined : Number(line.buyingPrice),
            sellingPrice: line.sellingPrice.trim() === "" ? undefined : Number(line.sellingPrice),
            quantity: line.master.requiresImei && line.imeis.length > 0
              ? (line.quantity.trim() === "" ? undefined : Number(line.quantity))
              : Math.max(0, Number(line.quantity) || 0),
            imeiNumbers: line.master.requiresImei ? line.imeis : undefined,
          }));
          try {
            const created = await tapToAdd.mutateAsync({ items, branchId });
            setStagingOpen(false);
            closeAll();
            toast.success(t("catalog.added").replace("{n}", String(created.length)));
            return { ok: true, count: created.length };
          } catch (error: unknown) {
            return {
              ok: false,
              message: error instanceof Error ? error.message : t("products.failed"),
            };
          }
        }}
      />
    </>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border/60 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function CatalogCard({ row, selected, onToggle }: { row: MasterCatalogProduct; selected: boolean; onToggle: () => void }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border-2 text-left transition-all active:scale-[0.98]",
        selected
          ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
          : "border-border/40 bg-card hover:border-primary/40 hover:shadow-md"
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {row.imageUrl ? (
          <ProfessionalImage src={row.imageUrl} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground/30">
            <ImageIcon className="h-10 w-10" />
          </div>
        )}
        {row.alreadyAdded && (
          <Badge className="absolute left-1.5 top-1.5 rounded-md bg-emerald-600 px-1.5 py-0 text-[9px] font-black uppercase tracking-wide text-white">
            {t("catalog.alreadyInShop")}
          </Badge>
        )}
        {row.requiresImei && (
          <Badge className="absolute right-1.5 top-1.5 rounded-md bg-foreground/80 px-1.5 py-0 text-[9px] font-black tracking-wide text-background">
            {t("catalog.imeiBadge")}
          </Badge>
        )}
        <span
          className={cn(
            "absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full border shadow-sm transition-colors",
            selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground group-hover:border-primary group-hover:text-primary"
          )}
        >
          {selected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-bold leading-snug">{row.name}</h3>
          <p className="mt-0.5 truncate text-xs font-semibold text-muted-foreground">
            {[row.brand, row.categoryName].filter(Boolean).join(" · ")}
          </p>
        </div>
        {row.defaultWarranty && (
          <span className="w-fit truncate rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
            {row.defaultWarranty}
          </span>
        )}
      </div>
    </button>
  );
}
