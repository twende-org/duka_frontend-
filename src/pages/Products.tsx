import React, { useEffect, useState, useRef, useMemo } from "react";
import { Plus, Search, Edit, Trash2, Package, Eye, ChevronDown, ChevronUp, Loader2, ImagePlus, X, Box, Copy, Images, Camera, Sparkles, Check, LayoutGrid, List, AlertTriangle, TrendingUp, Coins, Store, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { PageLoader, Loader } from "@/components/common/Loader";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { productsKeys, usePaginatedProducts, useCreateProduct, useEditProduct, useDeleteProduct } from "@/hooks/useProducts";
import { useSuppliers } from "@/hooks/useSuppliers";
import { fetchInventory, adjustStock, clearError as clearInventoryError } from "@/store/inventorySlice";
import { fetchShops } from "@/store/shopsSlice";
import { ErrorAlert } from "@/components/ErrorAlert";
import { formatTZS } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { IntakeDraft, Product } from "@/types";
import type { ProductDetails } from "@/lib/api/domains/ai";
import PageHeader from "@/components/common/PageHeader";
import { useUserRole } from "@/hooks/useUserRole";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { useI18n } from "@/lib/i18n";
import { useSubscription } from "@/hooks/useSubscription";
import { compressImage, compressImages } from "@/lib/imageUtils";
import { uploadImageOnApi } from "@/lib/api/domains/uploads";
import { logErrorEvent } from "@/lib/errorLogger";
import { ProfessionalImage } from "@/components/common/ProfessionalImage";
import { CameraCapture } from "@/components/common/CameraCapture";
import { Facebook, Share2 } from "lucide-react";
import { fetchFacebookConnection, postProductToFacebook } from "@/lib/api/domains/social";
import { fetchTikTokConnection } from "@/lib/api/domains/tiktok";
import { TikTokIcon } from "@/components/shops/TikTokConnect";
import TikTokPublishDialog from "@/components/shops/TikTokPublishDialog";
import AIAdGeneratorDialog from "@/components/shops/AIAdGeneratorDialog";
import { ScanToIntakeDialog, type PhotoSubmitResult, type PhotoSubmitRow } from "@/components/products/ScanToIntakeDialog";
import Fuse from "fuse.js";

import { categoryTree, getCategoryName, normalizeCategories, mapBusinessToProductCategories, matchCategoryByName } from "@/lib/categories";
import { UNITS, matchUnitByName } from "@/lib/units";

const defaultForm = {
  name: "", categories: [] as string[], buyingPrice: 0 as number | string, sellingPrice: 0 as number | string,
  moq: 1 as number | string,
  prices: [] as { type: string; price: number | string }[],
  supplier: "", sku: "", barcode: "", brand: "", description: "", unit: "pcs",
  weight: "", size: "", color: "", expiryDate: "", status: "active" as "active" | "inactive" | "discontinued",
  tags: "", warranty: "", taxRate: 0 as number | string, imageUrls: [] as string[],
  storeLocation: "",
  publishToFacebook: false,
  publishToDirectory: false,
  publishToDeliveryApp: false,
  initialStock: 0 as number | string,
};

const units = UNITS;

export default function Products() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const currentShopId = useAppSelector((s) => s.shops.currentShopId);
  const { permissions } = useUserRole();
  const { log: logActivity } = useActivityLogger();
  const { data: paginatedData, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading: productsLoading, error: rqError } = usePaginatedProducts(currentShopId);
  const { data: suppliers = [] } = useSuppliers(currentShopId);
  const products = React.useMemo(() => paginatedData ? paginatedData.pages.flatMap(p => p.products) : [], [paginatedData]);
  const productsError = rqError ? rqError.message : null;
  const hasMore = hasNextPage;

  const createProductMutation = useCreateProduct(currentShopId);
  const editProductMutation = useEditProduct(currentShopId);
  const deleteProductMutation = useDeleteProduct(currentShopId);
  const { inventory, loading: inventoryLoading, error: inventoryError } = useAppSelector((s) => s.inventory);
  const shops = useAppSelector((s) => s.shops.shops);
  const currentShop = shops.find(s => s.id === currentShopId);
  const user = useAppSelector((s) => s.auth.user);
  const { t } = useI18n();
  const { canAddProduct } = useSubscription();
  const [search, setSearch] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [productToShare, setProductToShare] = useState<Product | null>(null);
  const [productToShareTikTok, setProductToShareTikTok] = useState<Product | null>(null);
  const [sharing, setSharing] = useState(false);
  const [fbConnected, setFbConnected] = useState<boolean | null>(null);
  const [ttConnected, setTtConnected] = useState<boolean | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [parsedQueue, setParsedQueue] = useState<IntakeDraft[]>([]);
  const [detailsQueue, setDetailsQueue] = useState<ProductDetails[]>([]);
  const [scanFilled, setScanFilled] = useState(false);

  useEffect(() => {
    if (user?.id && shops.length === 0) {
      dispatch(fetchShops(user.id));
    }
  }, [user?.id, shops.length, dispatch]);

  useEffect(() => {
    async function checkSocial() {
      if (!currentShopId) return;
      try {
        const connection = await fetchFacebookConnection(currentShopId);
        setFbConnected(connection !== null);
      } catch (err) {
        console.error("Facebook connection check failed:", err);
        setFbConnected(false);
      }
      try {
        const connection = await fetchTikTokConnection(currentShopId);
        setTtConnected(connection !== null);
      } catch (err) {
        console.error("TikTok connection check failed:", err);
        setTtConnected(false);
      }
    }
    checkSocial();
  }, [currentShopId]);

  useEffect(() => {
    if (currentShopId) {
      dispatch(fetchInventory(currentShopId));
    }
  }, [currentShopId, dispatch]);

  const handleLoadMore = () => {
    if (currentShopId && hasMore && !productsLoading && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const loading = productsLoading || inventoryLoading;

  // Only show full-page loader on INITIAL load or shop change.
  // Subsequent updates shouldn't blank out the UI.
  const isInitialLoad = (productsLoading || inventoryLoading) && products.length === 0;

  const filtered = useMemo(() => {
    let result = products;
    
    if (selectedFilters.length > 0) {
      result = result.filter(p => {
        const pCats = normalizeCategories(p);
        return selectedFilters.every(f => pCats.includes(f));
      });
    }

    if (search.trim()) {
      const fuse = new Fuse(result, {
        keys: [
          { name: 'name', weight: 2.0 },
          { name: 'brand', weight: 1.0 },
          { name: 'sku', weight: 0.5 },
          { name: 'barcode', weight: 0.5 }
        ],
        threshold: 0.3,
        ignoreLocation: true,
        useExtendedSearch: true,
      });
      result = fuse.search(search).map(r => r.item);
    }
    return result;
  }, [products, search, selectedFilters]);

  const getProductStock = (productId: string) => inventory.find(i => i.productId === productId);

  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Stats calculations
  const totalProductsCount = products.length;
  
  const totalStockCount = useMemo(() => {
    return products.reduce((sum, p) => {
      const stock = inventory.find(i => i.productId === p.id);
      return sum + (stock?.quantity || 0);
    }, 0);
  }, [products, inventory]);

  const lowStockCount = useMemo(() => {
    return products.filter(p => {
      const stock = inventory.find(i => i.productId === p.id);
      const qty = stock?.quantity || 0;
      const min = stock?.minStock || 5;
      return qty <= min && qty > 0;
    }).length;
  }, [products, inventory]);

  const outOfStockCount = useMemo(() => {
    return products.filter(p => {
      const stock = inventory.find(i => i.productId === p.id);
      return (stock?.quantity || 0) === 0;
    }).length;
  }, [products, inventory]);

  const totalInventoryValue = useMemo(() => {
    return products.reduce((sum, p) => {
      const stock = inventory.find(i => i.productId === p.id);
      return sum + ((stock?.quantity || 0) * p.sellingPrice);
    }, 0);
  }, [products, inventory]);

  // Filter category tree based on shop's configured categories
  const shopCategoryTree = useMemo(() => {
    let effectiveCats = currentShop?.productCategories;
    
    // Fallback migration logic for legacy shops
    if (!effectiveCats || effectiveCats.length === 0) {
      if (currentShop?.categories && currentShop.categories.length > 0) {
        effectiveCats = mapBusinessToProductCategories(currentShop.categories);
      }
    }

    if (!effectiveCats || effectiveCats.length === 0) {
      return categoryTree;
    }
    
    const shopCatIds = new Set(effectiveCats);
    return categoryTree
      .map(group => {
        // If the shop selected the entire parent group, include it with all its children
        if (shopCatIds.has(group.id)) {
          return { ...group };
        }
        
        // Otherwise, filter children to only the ones the shop specifically selected
        const children = group.children?.filter(cat => shopCatIds.has(cat.id)) || [];
        return { ...group, children };
      })
      .filter(group => group.children && group.children.length > 0);
  }, [currentShop]);

  // Filter category tree to ONLY show active categories (ones with products)
  const activeCategoryTree = useMemo(() => {
    const productCatIds = new Set(products.flatMap(p => p.categories || []).filter(Boolean));
    
    return categoryTree
      .map(group => {
        const children = group.children?.filter(cat => productCatIds.has(cat.id)) || [];
        return { ...group, children };
      })
      .filter(group => group.children.length > 0);
  }, [products]);

  // Quick categories slider
  const quickCategories = useMemo(() => {
    return activeCategoryTree.flatMap(group => group.children || []);
  }, [activeCategoryTree]);

  const toggleQuickCategory = (catId: string) => {
    setSelectedFilters(prev => prev.includes(catId) ? [] : [catId]);
  };

  const resetForm = () => {
    setForm(defaultForm);
    setShowAdvanced(false);
    setScanFilled(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const populateFormFromDraft = (draft: IntakeDraft) => {
    const treeMatches = shopCategoryTree.flatMap((g) => g.children || []);
    const matchedId = matchCategoryByName(draft.categoryName, treeMatches);
    const unitMatch = matchUnitByName(draft.unit);
    setEditingProduct(null);
    setForm((f) => ({
      ...f,
      name: draft.nameEn || f.name,
      categories: matchedId ? [matchedId] : f.categories,
      buyingPrice: draft.buyingPrice ? String(draft.buyingPrice) : f.buyingPrice,
      sellingPrice: draft.sellingPrice ? String(draft.sellingPrice) : f.sellingPrice,
      unit: unitMatch || "pcs",
      initialStock: draft.quantity ? String(draft.quantity) : f.initialStock,
    }));
    setScanFilled(true);
  };

  const applyDetailsToForm = (details: ProductDetails, image?: string) => {
    setEditingProduct(null);
    setForm((f) => {
      const extraText = Object.entries(details.extra ?? {})
        .map(([key, value]) => `${key}: ${value}`)
        .join("; ");
      const description = [details.description, extraText].filter(Boolean).join("\n");
      const treeMatches = shopCategoryTree.flatMap((g) => g.children || []);
      const matchedId = matchCategoryByName(details.category, treeMatches);
      const unitValue = matchUnitByName(details.unit);
      return {
        ...f,
        name: details.name || f.name,
        brand: details.brand || f.brand,
        description: description || f.description,
        barcode: details.barcode || f.barcode,
        categories: matchedId ? [matchedId] : f.categories,
        buyingPrice: details.buyingPrice !== undefined ? String(details.buyingPrice) : f.buyingPrice,
        sellingPrice: details.sellingPrice !== undefined ? String(details.sellingPrice) : f.sellingPrice,
        initialStock: details.quantity !== undefined ? String(details.quantity) : f.initialStock,
        unit: unitValue || f.unit,
        size: details.size || f.size,
        weight: details.weight || f.weight,
        color: details.color || f.color,
        expiryDate: details.expiryDate || f.expiryDate,
        imageUrls: image ? [...f.imageUrls, image] : f.imageUrls,
      };
    });
    setScanFilled(true);
  };

  /**
   * Photo-scan review table: create each row as a real product right away
   * (same pipeline as the Add Product form) instead of handing off to the
   * form. Rows that fail stay in the table for a retry.
   */
  const handleSubmitPhotoRows = async (rows: PhotoSubmitRow[], image: string): Promise<PhotoSubmitResult> => {
    if (!currentShopId) {
      toast.error(t("products.selectShop"));
      return { created: 0, failed: rows };
    }
    let imageUrl = "";
    if (image.startsWith("data:")) {
      try {
        imageUrl = await uploadImageOnApi(image, {
          folder: "products",
          filename: `photoscan_${Date.now()}.jpg`,
        });
      } catch (err) {
        console.warn("Photo-scan image upload failed, continuing without image:", err);
      }
    }
    const treeMatches = shopCategoryTree.flatMap((g) => g.children || []);
    let created = 0;
    const failed: PhotoSubmitRow[] = [];
    for (const row of rows) {
      try {
        const matchedId = matchCategoryByName(row.category, treeMatches);
        const productData = {
          name: row.name,
          categories: matchedId ? [matchedId] : [],
          buyingPrice: row.buyingPrice ?? 0,
          sellingPrice: row.sellingPrice ?? 0,
          moq: 1,
          prices: row.prices ?? [],
          supplier: "",
          sku: row.sku || "",
          barcode: row.barcode || "",
          brand: row.brand || "",
          description: row.description || "",
          unit: row.unit || "pcs",
          weight: row.weight || "",
          size: row.size || "",
          color: row.color || "",
          expiryDate: row.expiryDate || "",
          status: "active" as const,
          tags: [] as string[],
          warranty: "",
          taxRate: 0,
          imageUrls: imageUrl ? [imageUrl] : [],
          imageUrl,
          storeLocation: row.storeLocation || "",
          publishToFacebook: row.publishToFacebook ?? false,
          publishToDirectory: row.publishToDirectory ?? false,
          publishToDeliveryApp: row.publishToDeliveryApp ?? false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const id = await createProductMutation.mutateAsync({ ...productData, shopId: currentShopId } as unknown as Omit<Product, "id">);

        if (row.quantity && row.quantity > 0) {
          dispatch(adjustStock({
            productId: id,
            productName: row.name,
            shopId: currentShopId,
            type: "adjustment",
            quantity: row.quantity,
            reason: "Product Initialization",
            userId: user?.id || "unknown",
            userName: user?.displayName || "System",
          }));
        }

        logActivity({ action: "product_created", category: "product", details: `${row.name}`, metadata: { name: row.name, source: "photo_scan" } });
        created += 1;
      } catch (err) {
        console.error("Photo-scan product create failed:", err);
        toast.error(`${row.name}: ${err instanceof Error ? err.message : t("products.failed")}`);
        failed.push(row);
      }
    }
    if (created > 0) {
      toast.success(t("products.photoAddedMany").replace("{n}", String(created)));
    }
    return { created, failed };
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setCompressing(true);
    try {
      const compressed = await compressImages(files, { quality: 0.6, maxWidth: 1000 });
      setForm(f => ({ ...f, imageUrls: [...f.imageUrls, ...compressed] }));
      toast.success(t("products.added"));
    } catch (err) {
      toast.error(t("common.error"));
    }
    setCompressing(false);
  };

  const removeImage = (index: number) => {
    setForm(f => ({ ...f, imageUrls: f.imageUrls.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e: React.FormEvent, keepOpen = false) => {
    e.preventDefault();
    if (!currentShopId) { toast.error(t("products.selectShop")); return; }
    setSubmitting(true);
    setProgress(20);
    try {
      const raw = { ...form };
      const cleaned = Object.fromEntries(
        Object.entries(raw).filter(([_, v]) => v !== undefined)
      ) as Partial<Product>;

      // ── Upload new images to the Django media endpoint in parallel ─────
      setProgress(35);
      const productTimestamp = Date.now();

      const uploadPromises = form.imageUrls.map(async (img, i) => {
        if (img.startsWith("data:")) {
          try {
            return await uploadImageOnApi(img, {
              folder: "products",
              filename: `${productTimestamp}_${i}.jpg`,
            });
          } catch (uploadErr) {
            console.warn(`Image ${i} upload failed, skipping:`, uploadErr);
            logErrorEvent({
              action: "product_image_upload_failed",
              category: "network",
              errorMessage: `Upload failed: ${uploadErr instanceof Error ? uploadErr.message : String(uploadErr)}`,
              shopId: currentShopId || "",
            });
            return null;
          }
        }
        return img;
      });

      const uploadResults = await Promise.all(uploadPromises);
      const uploadedUrls = uploadResults.filter((url): url is string => url !== null);
      // ───────────────────────────────────────────────────────────────────

      const productData = {
        name: form.name, categories: form.categories, buyingPrice: Number(form.buyingPrice), sellingPrice: Number(form.sellingPrice),
        moq: Number(form.moq),
        prices: (form.prices || []).map(p => ({ type: p.type, price: Number(p.price) })),
        supplier: form.supplier, sku: form.sku, barcode: form.barcode, brand: form.brand,
        description: form.description, unit: form.unit, weight: form.weight, size: form.size, color: form.color,
        expiryDate: form.expiryDate, status: form.status, tags: typeof form.tags === 'string' ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : form.tags,
        warranty: form.warranty, taxRate: Number(form.taxRate), imageUrls: uploadedUrls,
        imageUrl: uploadedUrls[0] || "",
        storeLocation: form.storeLocation,
        publishToFacebook: form.publishToFacebook,
        publishToDirectory: form.publishToDirectory,
        publishToDeliveryApp: form.publishToDeliveryApp,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      };

      setProgress(70);
      if (editingProduct) {
        await editProductMutation.mutateAsync({ id: editingProduct.id, data: productData as Partial<Product> });
        logActivity({ action: "product_updated", category: "product", details: `${productData.name}`, metadata: { productId: editingProduct.id } });
        toast.success(t("products.updated"));
      } else {
        setProgress(85);
        const id = await createProductMutation.mutateAsync({ ...productData, shopId: currentShopId } as unknown as Omit<Product, "id">);
        const productResult = { ...productData, id } as unknown as Product;

        // Run stock adjustment in the background without blocking the UI
        if (Number(form.initialStock) > 0) {
          dispatch(adjustStock({
            productId: productResult.id,
            productName: productResult.name,
            shopId: currentShopId,
            type: "adjustment",
            quantity: Number(form.initialStock) || 0,
            reason: "Product Initialization",
            userId: user?.id || "unknown",
            userName: user?.displayName || "System"
          }));
        }

        logActivity({ action: "product_created", category: "product", details: `${productData.name}`, metadata: { name: productData.name } });
        toast.success(t("products.added"));
      }
      if (!editingProduct && parsedQueue.length > 0) {
        const [head, ...rest] = parsedQueue;
        resetForm();
        setParsedQueue(rest);
        populateFormFromDraft(head);
        setProgress(0);
        return;
      }
      if (!editingProduct && detailsQueue.length > 0) {
        const [head, ...rest] = detailsQueue;
        resetForm();
        setDetailsQueue(rest);
        applyDetailsToForm(head);
        setProgress(0);
        return;
      }
      setProgress(100);
      if (keepOpen) {
        const prevCategories = form.categories;
        const prevUnit = form.unit;
        resetForm();
        setForm(f => ({ ...f, categories: prevCategories, unit: prevUnit }));
        setProgress(0);
      } else {
        setDialogOpen(false);
        setEditingProduct(null);
        resetForm();
        setProgress(0);
      }
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || t("products.failed"));
    } finally {
      setSubmitting(false);
      setProgress(0);
    }
  };

  const handleDelete = async () => {
    if (!productToDelete) return;
    try {
      await deleteProductMutation.mutateAsync(productToDelete.id);
      logActivity({ action: "product_deleted", category: "product", details: `${productToDelete.name}`, metadata: { productId: productToDelete.id } });
      toast.success(t("products.deleted"));
      setProductToDelete(null);
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || t("common.error"));
    }
  };

  const handlePostToFacebook = async (product: Product) => {
    if (!currentShopId) return;
    setSharing(true);
    try {
      await postProductToFacebook(currentShopId, product.id, true);
      toast.success("Imechapishwa kwenye Facebook!");
    } catch (err: unknown) {
      console.error("Facebook post failed:", err);
      toast.error("Imeshindwa kuchapisha Facebook.");
    } finally {
      setSharing(false);
      setProductToShare(null);
    }
  };

  const handleEdit = (prod: Product) => {
    setEditingProduct(prod);
    setParsedQueue([]);
    setDetailsQueue([]);
    setForm({
      name: prod.name, categories: prod.categories || [], buyingPrice: String(prod.buyingPrice || ""), sellingPrice: String(prod.sellingPrice || ""),
      moq: String(prod.moq || 1),
      prices: prod.prices || [],
      supplier: prod.supplier || "", sku: prod.sku || "", barcode: prod.barcode || "", brand: prod.brand || "",
      description: prod.description || "", unit: prod.unit || "pcs", weight: prod.weight || "", size: prod.size || "",
      color: prod.color || "", expiryDate: prod.expiryDate || "", status: prod.status || "active", tags: (prod.tags || []).join(", "),
      warranty: prod.warranty || "", taxRate: prod.taxRate || 0, imageUrls: prod.imageUrls || [], storeLocation: prod.storeLocation || "",
      publishToFacebook: prod.publishToFacebook !== false,
      publishToDirectory: prod.publishToDirectory !== false,
      publishToDeliveryApp: prod.publishToDeliveryApp !== false,
      initialStock: 0,
    });
    setShowAdvanced(true);
    setDialogOpen(true);
  };

  const handleDuplicate = (p: Product) => {
    setEditingProduct(null);
    setForm({
      name: p.name + " (Duplicate)", categories: normalizeCategories(p), 
      buyingPrice: p.buyingPrice !== undefined && p.buyingPrice !== null ? String(p.buyingPrice).replace(/[^0-9.]/g, "") : "",
      sellingPrice: p.sellingPrice !== undefined && p.sellingPrice !== null ? String(p.sellingPrice).replace(/[^0-9.]/g, "") : "",
      moq: String(p.moq || 1),
      prices: p.prices || [],
      supplier: p.supplier || "",
      sku: "", barcode: "", brand: p.brand || "",
      description: p.description || "", unit: p.unit || "pcs", weight: p.weight || "",
      size: p.size || "", color: p.color || "", expiryDate: p.expiryDate || "",
      status: "active", tags: (p.tags || []).join(", "), warranty: p.warranty || "",
      taxRate: p.taxRate || 0, 
      imageUrls: (p.imageUrls && p.imageUrls.length > 0) ? p.imageUrls : (p.imageUrl ? [p.imageUrl] : []),
      storeLocation: p.storeLocation || "",
      publishToFacebook: p.publishToFacebook !== undefined ? p.publishToFacebook : true,
      publishToDirectory: p.publishToDirectory !== undefined ? p.publishToDirectory : true,
      publishToDeliveryApp: p.publishToDeliveryApp !== undefined ? p.publishToDeliveryApp : true,
      initialStock: 0,
    });
    setShowAdvanced(false);
    setDialogOpen(true);
  };

  const profit = (p: Product) => (Number(p.sellingPrice) || 0) - (Number(p.buyingPrice) || 0);
  const profitMargin = (p: Product) => (Number(p.buyingPrice) || 0) > 0 ? ((profit(p) / (Number(p.buyingPrice) || 1)) * 100).toFixed(0) : "0";

  return (
    <div className="space-y-6">
      <ErrorAlert error={productsError} onClear={() => queryClient.resetQueries({ queryKey: productsKeys.all })} />
      <ErrorAlert error={inventoryError} onClear={() => dispatch(clearInventoryError())} />
      <PageHeader
        title={t("products.title")}
        description={t("products.subtitle")}
        actions={
          permissions.canAddProduct && (
            <Dialog open={dialogOpen} onOpenChange={(v) => {
                setDialogOpen(v);
                if (!v) {
                  setEditingProduct(null);
                  resetForm();
                  setParsedQueue([]);
                  setDetailsQueue([]);
                  setProgress(0);
                  setSubmitting(false); // Ensure submitting is reset if closed manually
                }
              }}>
              <DialogTrigger asChild>
                <Button disabled={!canAddProduct && !editingProduct}><Plus className="h-4 w-4 mr-2" />{t("products.add")}</Button>
              </DialogTrigger>
                            <DialogContent className="h-[100dvh] max-h-[100dvh] w-[100vw] max-w-[100vw] overflow-hidden rounded-none bg-background/95 p-4 backdrop-blur-sm grid-rows-[auto_minmax(0,1fr)] sm:h-[95vh] sm:max-h-[95vh] sm:w-[96vw] sm:max-w-[96vw] sm:rounded-3xl sm:p-6">
                <DialogHeader className="flex flex-row items-center justify-between pr-8 border-b pb-4">
                  <div>
                    <DialogTitle className="text-xl sm:text-2xl">{editingProduct ? t("products.editTitle") : t("products.addTitle")}</DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">Jaza taarifa za bidhaa kwa usahihi</p>
                  </div>
                  {!editingProduct && (
                    <div className="ml-auto flex items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setScanOpen(true)}
                        className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
                      >
                        <ScanLine className="h-4 w-4" />
                        <span className="hidden sm:inline font-bold">{t("products.smartCapture")}</span>
                      </Button>
                    </div>
                  )}
                </DialogHeader>
                <ScanToIntakeDialog
                  isOpen={scanOpen}
                  onClose={() => setScanOpen(false)}
                  shopId={currentShopId}
                  categoryGroups={shopCategoryTree}
                  fbConnected={fbConnected}
                  onParsed={(drafts) => {
                    setScanOpen(false);
                    if (drafts.length === 0) return;
                    setParsedQueue(drafts.slice(1));
                    populateFormFromDraft(drafts[0]);
                  }}
                  onSubmitProducts={handleSubmitPhotoRows}
                  onProductDetected={(detected, image) => {
                    const [head, ...rest] = detected;
                    applyDetailsToForm(head, image);
                    if (rest.length > 0) setDetailsQueue(rest);
                  }}
                />
                 <form onSubmit={handleSubmit} className="flex min-h-0 flex-col gap-4">
                  {(submitting || compressing) && <Progress value={compressing ? 100 : progress} className={cn("h-1 shrink-0", compressing && "animate-pulse")} />}
                  {scanFilled && !editingProduct && (
                    <div className="flex shrink-0 items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                      <ScanLine className="h-4 w-4 shrink-0 text-primary" />
                      <span className="flex-1">{t("products.filledFromScan")}</span>
                      {parsedQueue.length + detailsQueue.length > 0 && (
                        <Badge variant="outline" className="shrink-0">
                          {t("products.scanQueue").replace("{n}", String(parsedQueue.length + detailsQueue.length))}
                        </Badge>
                      )}
                    </div>
                  )}
                  <div className="min-h-0 flex-1 overflow-y-auto">
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {/* MAIN COLUMN */}
                    <div className="space-y-6 lg:col-span-2 xl:col-span-1">
                      
                      {/* GENERAL INFO */}
                      <div className="p-5 rounded-2xl border bg-card/50 shadow-sm space-y-4">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><LayoutGrid className="h-5 w-5 text-primary" /> Taarifa Kuu</h3>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-bold mb-1 block text-foreground">{t("products.name")} *</label>
                            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="rounded-xl h-11 bg-background" />
                          </div>
                          <div>
                            <label className="text-sm font-bold mb-1 block text-foreground">{t("products.brand")}</label>
                            <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="rounded-xl h-11 bg-background" />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-bold mb-1 block text-foreground">{t("products.category")} *</label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start font-normal h-11 rounded-xl py-2 bg-background">
                                  {form.categories.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {form.categories.map(c => (
                                        <Badge key={c} variant="secondary" className="mr-1 mb-1">{getCategoryName(c)}</Badge>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">{t("products.category")}</span>
                                  )}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[300px] p-0" align="start">
                                <Command>
                                  <CommandInput placeholder="Search categories..." />
                                  <CommandList>
                                    <CommandEmpty>No categories found.</CommandEmpty>
                                    {shopCategoryTree.map((group) => (
                                      <CommandGroup key={group.id} heading={group.name}>
                                        {group.children?.map(cat => (
                                          <CommandItem
                                            key={cat.id}
                                            onSelect={() => {
                                              setForm(f => {
                                                const isSelected = f.categories.includes(cat.id);
                                                const newCats = isSelected ? f.categories.filter(id => id !== cat.id) : [...f.categories, cat.id];
                                                return { ...f, categories: newCats };
                                              });
                                            }}
                                          >
                                            <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", form.categories.includes(cat.id) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}>
                                              <Check className={cn("h-4 w-4")} />
                                            </div>
                                            {cat.name}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    ))}
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div>
                            <label className="text-sm font-bold mb-1 block text-foreground">{t("products.supplier") || "Supplier"}</label>
                            <Select value={form.supplier} onValueChange={(v) => setForm({ ...form, supplier: v })}>
                              <SelectTrigger className="h-11 rounded-xl bg-background">
                                <SelectValue placeholder="Chagua Msambazaji" />
                              </SelectTrigger>
                              <SelectContent>
                                {suppliers.map(s => (
                                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-bold mb-1 block text-foreground">{t("products.description")}</label>
                          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="rounded-xl bg-background" />
                        </div>
                      </div>

                      {/* IMAGES */}
                      <div className="p-5 rounded-2xl border bg-card/50 shadow-sm space-y-4">
                        <h3 className="font-bold text-lg flex items-center gap-2"><Images className="h-5 w-5 text-primary" /> Picha za Bidhaa</h3>
                        <p className="text-xs text-muted-foreground mb-4">Ongeza picha nzuri zinazovutia wateja wako.</p>
                        
                        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
                        <div className="grid grid-cols-4 sm:grid-cols-6 xl:grid-cols-4 gap-3">
                           {form.imageUrls.map((url, i) => (
                             <div key={i} className="relative group aspect-square">
                                <ProfessionalImage src={url} className="rounded-xl border shadow-sm h-full w-full object-cover" />
                                <button type="button" onClick={() => removeImage(i)} className="absolute -top-2 -right-2 z-20 h-6 w-6 rounded-full bg-destructive text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-lg border-2 border-background"><X className="h-3 w-3" /></button>
                             </div>
                           ))}
                            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={compressing} className="aspect-square h-auto border-dashed border-2 flex flex-col items-center justify-center gap-1 p-0 hover:bg-primary/5 hover:border-primary/50 transition-colors rounded-xl bg-background">
                               {compressing ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5 text-muted-foreground" />}
                               <span className="text-[10px] text-muted-foreground font-medium">{compressing ? "Inapakia..." : "Picha Zilizopo"}</span>
                            </Button>
                            <Button type="button" variant="outline" onClick={() => setIsCameraOpen(true)} disabled={compressing} className="aspect-square h-auto border-dashed border-2 flex flex-col items-center justify-center gap-1 p-0 hover:bg-primary/5 hover:border-primary/50 transition-colors rounded-xl bg-background">
                               <Camera className="h-5 w-5 text-muted-foreground" />
                               <span className="text-[10px] text-muted-foreground font-medium">Piga Picha</span>
                            </Button>
                         </div>
                         <CameraCapture
                            isOpen={isCameraOpen}
                            onClose={() => setIsCameraOpen(false)}
                            onCapture={async (dataUrl) => {
                              setIsCameraOpen(false);
                              setCompressing(true);
                              try {
                                const compressed = await compressImage(dataUrl, { quality: 0.6, maxWidth: 1000 });
                                setForm((f) => ({ ...f, imageUrls: [...f.imageUrls, compressed] }));
                              } catch (err) {
                                console.error("Compression failed:", err);
                                setForm((f) => ({ ...f, imageUrls: [...f.imageUrls, dataUrl] }));
                              } finally {
                                setCompressing(false);
                              }
                            }}
                            title="Piga Picha ya Bidhaa"
                         />
                      </div>
                    </div>

                    {/* PRICING COLUMN */}
                    <div className="space-y-6">
                      
                      {/* PRICING & INVENTORY */}
                      <div className="p-5 rounded-2xl border bg-card/50 shadow-sm space-y-4">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Coins className="h-5 w-5 text-primary" /> Bei & Stoo</h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-bold mb-1 block text-foreground">{t("products.buyingPrice")} *</label>
                            <Input type="number" value={Number(form.buyingPrice) === 0 ? "" : form.buyingPrice} onChange={(e) => setForm({ ...form, buyingPrice: e.target.value })} required min="0" placeholder="0" className="h-11 rounded-xl bg-background" />
                          </div>
                          <div>
                            <label className="text-sm font-bold mb-1 block text-foreground">{t("products.sellingPrice")} *</label>
                            <Input type="number" value={Number(form.sellingPrice) === 0 ? "" : form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} required min="0" placeholder="0" className="h-11 rounded-xl bg-background" />
                          </div>
                        </div>

                        {!editingProduct && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-bold mb-1 block text-foreground">Initial Stock</label>
                              <Input type="number" value={Number(form.initialStock) === 0 ? "" : form.initialStock} onChange={(e) => setForm({ ...form, initialStock: e.target.value })} min="0" placeholder="0" className="h-11 rounded-xl bg-background" />
                            </div>
                            <div>
                              <label className="text-sm font-bold mb-1 block text-foreground">{t("products.unit")}</label>
                              <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                                <SelectTrigger className="h-11 rounded-xl bg-background"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {units.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                        {editingProduct && (
                          <div>
                            <label className="text-sm font-bold mb-1 block text-foreground">{t("products.unit")}</label>
                            <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                              <SelectTrigger className="h-11 rounded-xl bg-background"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {units.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        
                        {Number(form.buyingPrice) > 0 && Number(form.sellingPrice) > 0 && (
                          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 rounded-xl bg-primary/5 border border-primary/10 text-sm">
                            <span className="text-muted-foreground">{t("products.profit")}:</span>
                            <span className={`font-black ${Number(form.sellingPrice) - Number(form.buyingPrice) > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                              {formatTZS(Number(form.sellingPrice) - Number(form.buyingPrice))}
                            </span>
                            <span className="text-muted-foreground mx-2">|</span>
                            <span className="text-muted-foreground">{t("products.margin")}:</span>
                            <span className="font-bold text-foreground">
                              {((Number(form.sellingPrice) - Number(form.buyingPrice)) / Number(form.buyingPrice) * 100).toFixed(0)}%
                            </span>
                          </div>
                        )}

                        <div className="pt-4 border-t border-border/50">
                          <label className="text-xs font-black uppercase tracking-widest text-muted-foreground block mb-3">Tiers & Wholesale Pricing</label>
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 bg-background p-3 rounded-xl border border-border/50">
                              <div className="flex-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Min Order Qty (B2B)</label>
                                <Input 
                                  type="number" 
                                  value={form.moq} 
                                  onChange={(e) => setForm({ ...form, moq: e.target.value })} 
                                  min="1" 
                                  className="h-9 rounded-lg text-xs font-bold" 
                                  placeholder="1"
                                />
                              </div>
                            </div>
                            
                            {form.prices && form.prices.map((pRecord, pIdx) => (
                              <div key={pIdx} className="flex items-center gap-2 bg-background p-3 rounded-xl border border-border/50 relative">
                                <div className="flex-1">
                                  <Select
                                    value={pRecord.type}
                                    onValueChange={(val) => {
                                      const updated = [...(form.prices || [])];
                                      updated[pIdx] = { ...updated[pIdx], type: val };
                                      setForm({ ...form, prices: updated });
                                    }}
                                  >
                                    <SelectTrigger className="h-9 rounded-lg text-xs font-bold">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="wholesale">Wholesale</SelectItem>
                                      <SelectItem value="corporate">Corporate</SelectItem>
                                      <SelectItem value="promotional">Promo</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex-1">
                                  <Input
                                    type="number"
                                    value={pRecord.price}
                                    onChange={(e) => {
                                      const updated = [...(form.prices || [])];
                                      updated[pIdx] = { ...updated[pIdx], price: e.target.value };
                                      setForm({ ...form, prices: updated });
                                    }}
                                    className="h-9 rounded-lg text-xs font-bold"
                                    placeholder="Price"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = (form.prices || []).filter((_, idx) => idx !== pIdx);
                                    setForm({ ...form, prices: updated });
                                  }}
                                  className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ))}

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const currentPrices = form.prices || [];
                                const typesUsed = currentPrices.map(p => p.type);
                                let nextType = "wholesale";
                                if (typesUsed.includes("wholesale")) nextType = "corporate";
                                if (typesUsed.includes("corporate")) nextType = "promotional";
                                setForm({ ...form, prices: [...currentPrices, { type: nextType, price: "" }] });
                              }}
                              className="w-full h-9 rounded-xl text-xs font-bold border-dashed border-2 bg-background"
                            >
                              + Add Price Tier
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                      {/* DETAILS COLUMN */}
                      <div className="space-y-6">
                      {/* ADVANCED */}
                      <div className="p-5 rounded-2xl border bg-card/50 shadow-sm space-y-4">
                        <h3 className="font-bold text-lg flex items-center gap-2"><Box className="h-5 w-5 text-primary" /> Ziada</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-bold mb-1 block text-foreground">SKU</label>
                            <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="h-11 rounded-xl bg-background" />
                          </div>
                          <div>
                            <label className="text-sm font-bold mb-1 block text-foreground">Barcode</label>
                            <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className="h-11 rounded-xl bg-background" />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-bold mb-1 block text-foreground">{t("products.location")}</label>
                          <Input value={form.storeLocation} onChange={(e) => setForm({ ...form, storeLocation: e.target.value })} placeholder="Mfano: Aisle 4, Side B" className="h-11 rounded-xl bg-background" />
                        </div>
                      </div>

                      {/* PUBLISHING */}
                      <div className="p-5 rounded-2xl border bg-card/50 shadow-sm space-y-4">
                        <h3 className="font-bold text-lg flex items-center gap-2"><Share2 className="h-5 w-5 text-primary" /> Usambazaji</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/50 hover:border-primary/30 transition-colors">
                            <div className="flex items-center gap-3">
                              <Store className="h-5 w-5 text-primary shrink-0" />
                              <div className="space-y-0.5">
                                <Label className="text-sm font-bold leading-none cursor-pointer">Twende duka marketplace</Label>
                                <p className="text-[10px] text-muted-foreground">Onyesha bidhaa mtandaoni</p>
                              </div>
                            </div>
                            <Switch checked={form.publishToDirectory} onCheckedChange={(checked) => setForm({ ...form, publishToDirectory: checked })} />
                          </div>
                          
                          <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/50 hover:border-primary/30 transition-colors">
                            <div className="flex items-center gap-3">
                              <Package className="h-5 w-5 text-primary shrink-0" />
                              <div className="space-y-0.5">
                                <Label className="text-sm font-bold leading-none cursor-pointer">Tulete App</Label>
                                <p className="text-[10px] text-muted-foreground">Inaweza kuagizwa mtandaoni</p>
                              </div>
                            </div>
                            <Switch checked={form.publishToDeliveryApp} onCheckedChange={(checked) => setForm({ ...form, publishToDeliveryApp: checked })} />
                          </div>

                          <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/50 hover:border-[#1877F2]/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <Facebook className="h-5 w-5 text-[#1877F2] shrink-0" />
                              <div className="space-y-0.5">
                                <Label className="text-sm font-bold leading-none text-[#1877F2] cursor-pointer">Facebook & Instagram</Label>
                                <p className="text-[10px] text-muted-foreground">Post mtandaoni ukisave</p>
                              </div>
                            </div>
                            <Switch
                              checked={form.publishToFacebook}
                              onCheckedChange={(checked) => {
                                if (!fbConnected) {
                                  toast.error(t("social.connectFirst") || "Please connect your Facebook account in the Social tab first.");
                                  return;
                                }
                                setForm({ ...form, publishToFacebook: checked });
                              }}
                            />
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                  </div>

                  {/* FORM ACTIONS */}
                  <div className="flex shrink-0 flex-col sm:flex-row gap-3 pt-4 border-t border-border/40">
                    <Button type="submit" className="flex-1 h-12 rounded-xl font-bold text-md" disabled={submitting || compressing}>
                      {submitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : (editingProduct ? t("products.update") : t("common.add"))}
                    </Button>
                    {!editingProduct && (
                      <Button
                        type="button"
                        variant="secondary"
                        className="flex-1 sm:flex-none h-12 rounded-xl font-bold px-8"
                        disabled={submitting || compressing || !form.name || form.categories.length === 0 || Number(form.sellingPrice) <= 0}
                        onClick={async () => {
                          const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                          await handleSubmit(fakeEvent, true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {t("products.addAnother")}
                      </Button>
                    )}
                  </div>
                </form>
              </DialogContent>

            </Dialog>
          )
        }
      />

      {/* KPI Dashboard */}
      {currentShopId && !isInitialLoad && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("products.kpi.totalProducts" as any) || "Bidhaa Zote"}</CardTitle>
              <Package className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProductsCount}</div>
              <p className="text-xs text-muted-foreground">{t("products.kpi.productTypes" as any) || "Aina za bidhaa zinazouzwa"}</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("products.kpi.totalStock" as any) || "Jumla ya Bidhaa"}</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStockCount}</div>
              <p className="text-xs text-muted-foreground">{t("products.kpi.totalPieces" as any) || "Jumla ya vipande vyote"}</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("products.kpi.lowStock" as any) || "Pungufu / Mwisho"}</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {outOfStockCount} <span className="text-xs font-medium text-muted-foreground">/{lowStockCount} low</span>
              </div>
              <p className="text-xs text-muted-foreground">{t("products.kpi.lowStockDesc" as any) || "Bidhaa zilizoisha au chache"}</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("products.kpi.storeValue" as any) || "Thamani ya Duka"}</CardTitle>
              <Coins className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatTZS(totalInventoryValue)}</div>
              <p className="text-xs text-muted-foreground">{t("products.kpi.storeValueDesc" as any) || "Thamani ya mtaji"}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 fade-in-up" style={{ animationDelay: "100ms" }}>
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t("products.searchPlaceholder")} className="pl-9 bg-muted/50 border-none focus-visible:ring-1" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-auto min-w-[160px] justify-between glass-card text-left font-normal border-dashed">
                {selectedFilters.length > 0 ? (
                  <div className="flex gap-1 overflow-hidden truncate">
                    <Badge variant="secondary" className="rounded-sm px-1 font-normal text-xs">{selectedFilters.length} selected</Badge>
                  </div>
                ) : (
                  <span className="text-muted-foreground">{t("products.allCategories")}</span>
                )}
                <ChevronDown className="h-4 w-4 opacity-50 ml-2" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Filter..." />
                <CommandList>
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => setSelectedFilters([])}
                      className="font-bold cursor-pointer"
                    >
                      Clear All
                    </CommandItem>
                  </CommandGroup>
                  {activeCategoryTree.map((group) => (
                    <CommandGroup key={group.id} heading={group.name}>
                      {group.children?.map(cat => (
                        <CommandItem
                          key={cat.id}
                          onSelect={() => {
                            setSelectedFilters(prev => {
                              const isSelected = prev.includes(cat.id);
                              return isSelected ? prev.filter(id => id !== cat.id) : [...prev, cat.id];
                            });
                          }}
                        >
                          <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", selectedFilters.includes(cat.id) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}>
                            <Check className={cn("h-4 w-4")} />
                          </div>
                          {cat.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-muted/50 rounded-xl p-1 border border-border/40 shrink-0 shadow-sm">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setViewMode("grid")}
            className={cn(
              "h-9 w-9 rounded-lg transition-all",
              viewMode === "grid" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setViewMode("table")}
            className={cn(
              "h-9 w-9 rounded-lg transition-all",
              viewMode === "table" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick Category Filtering Pills */}
      {currentShopId && !productsLoading && (
        <div className="-mx-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="inline-flex w-max items-center gap-1 rounded-lg bg-muted/50 p-1">
            {([{ id: "__all", name: "Zote (All)" }, ...quickCategories] as { id: string; name: string }[]).map((cat) => {
              const isSelected = cat.id === "__all" ? selectedFilters.length === 0 : selectedFilters.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => (cat.id === "__all" ? setSelectedFilters([]) : toggleQuickCategory(cat.id))}
                  className={cn(
                    "relative whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-200",
                    isSelected ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>{cat.name}</span>
                  {isSelected && (
                    <motion.span
                      layoutId="products-cat-underline"
                      className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-primary"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!currentShopId ? (
        <div className="stat-card text-center py-12">
          <Package className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">{t("products.addShopFirst")}</p>
        </div>
      ) : isInitialLoad ? (
        <div className="rounded-xl border bg-card shadow-sm">
          <PageLoader label={t("common.loading" as any) || "Inapakia"} />
        </div>

      ) : (
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <div className="stat-card text-center py-12">
              <Package className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">{t("products.noProducts")}</p>
            </div>
          ) : viewMode === "grid" ? (
            /* Modern Grid View */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filtered.map((p, idx) => {
                const stock = getProductStock(p.id);
                const qty = stock?.quantity || 0;
                const min = stock?.minStock || 5;
                const isLowStock = qty <= min && qty > 0;
                const isOutOfStock = qty === 0;
                const displayImage = p.imageUrls?.[0] || p.imageUrl;

                return (
                  <div 
                    key={p.id} 
                    className="group relative flex flex-col rounded-2xl border border-border/40 bg-card overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 fade-in-up"
                    style={{ animationDelay: `${(idx % 10) * 40}ms` }}
                  >
                    {/* Image Container */}
                    <div className="relative aspect-square w-full overflow-hidden bg-muted">
                      <ProfessionalImage
                        src={displayImage}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      
                      {/* Badges overlay */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                        {isOutOfStock ? (
                          <span className="bg-destructive text-destructive-foreground text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-sm">
                            Mwisho stoo
                          </span>
                        ) : isLowStock ? (
                          <span className="bg-amber-500 text-white text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-sm">
                            Chache
                          </span>
                        ) : (
                          <span className="bg-emerald-500 text-white text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-sm">
                            Tele
                          </span>
                        )}
                      </div>

                      {/* Desktop action overlay (hover state) */}
                      <div className="absolute inset-0 bg-background/85 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-2 z-20">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => setDetailProduct(p)}
                            className="p-2 bg-background hover:bg-muted text-foreground hover:text-primary rounded-xl transition-all hover:scale-105 shadow-sm border border-border/40"
                            title="Detail"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {permissions.canEditProduct && (
                            <button
                              onClick={() => handleEdit(p)}
                              className="p-2 bg-background hover:bg-muted text-foreground hover:text-primary rounded-xl transition-all hover:scale-105 shadow-sm border border-border/40"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          {permissions.canAddProduct && (
                            <button
                              onClick={() => handleDuplicate(p)}
                              className="p-2 bg-background hover:bg-muted text-foreground hover:text-primary rounded-xl transition-all hover:scale-105 shadow-sm border border-border/40"
                              title="Duplicate"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          )}
                          {permissions.canDeleteProduct && (
                            <button
                              onClick={() => setProductToDelete(p)}
                              className="p-2 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white rounded-xl transition-all hover:scale-105 shadow-sm border border-destructive/20"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        <div className="flex gap-1.5 mt-0.5">
                          {currentShop && (
                            <AIAdGeneratorDialog 
                              shop={currentShop} 
                              product={p} 
                              trigger={
                                <button
                                  className="px-2.5 py-1 bg-background hover:bg-primary hover:text-primary-foreground text-foreground rounded-xl flex items-center gap-1 transition-all hover:scale-105 shadow-sm border border-border/40 text-[10px] font-bold"
                                >
                                  <Sparkles className="h-3 w-3 text-primary group-hover:text-primary-foreground" /> Tangazo AI
                                </button>
                              }
                            />
                          )}

                          {fbConnected && (
                            <button
                              onClick={() => setProductToShare(p)}
                              className="p-2 bg-background hover:bg-[#1877F2]/10 text-[#1877F2] rounded-xl transition-all hover:scale-105 shadow-sm border border-border/40"
                              title="Post to Facebook"
                            >
                              <Facebook className="h-4 w-4" />
                            </button>
                          )}
                          {ttConnected && (
                            <button
                              onClick={() => setProductToShareTikTok(p)}
                              className="p-2 bg-background hover:bg-black/10 dark:hover:bg-white/10 text-foreground rounded-xl transition-all hover:scale-105 shadow-sm border border-border/40"
                              title="Post to TikTok"
                            >
                              <TikTokIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Product Info */}
                    <div className="p-3 flex flex-col flex-1 gap-1 border-t border-border/20">
                      <h3 className="font-bold text-xs sm:text-sm line-clamp-1 group-hover:text-primary transition-colors text-foreground">{p.name}</h3>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {normalizeCategories(p).map(getCategoryName).join(", ") || "Generali"}
                      </p>
                      
                      <div className="flex items-center justify-between gap-1 mt-auto pt-1.5 border-t border-border/10">
                        <span className="text-primary font-black text-xs sm:text-sm tracking-tight">
                          {formatTZS(p.sellingPrice)}
                        </span>
                        <span className={cn(
                          "text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full",
                          isOutOfStock ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" :
                          isLowStock ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                          "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        )}>
                          {qty} {p.unit || "pcs"}
                        </span>
                      </div>
                    </div>

                    {/* Touch action row (mobile only) */}
                    <div className="flex border-t border-border/30 md:hidden bg-muted/20">
                      <button onClick={() => setDetailProduct(p)} className="flex-1 py-2 text-center text-muted-foreground hover:text-primary border-r border-border/30 flex justify-center"><Eye className="h-4 w-4" /></button>
                      {permissions.canEditProduct && (
                        <button onClick={() => handleEdit(p)} className="flex-1 py-2 text-center text-muted-foreground hover:text-primary border-r border-border/30 flex justify-center"><Edit className="h-4 w-4" /></button>
                      )}
                      {permissions.canAddProduct && (
                        <button onClick={() => handleDuplicate(p)} className="flex-1 py-2 text-center text-muted-foreground hover:text-primary border-r border-border/30 flex justify-center"><Copy className="h-4 w-4" /></button>
                      )}
                      {currentShop && (
                        <AIAdGeneratorDialog 
                          shop={currentShop} 
                          product={p} 
                          trigger={
                            <button className="flex-1 py-2 text-center text-primary/80 hover:text-primary flex justify-center"><Sparkles className="h-4 w-4 flex items-center justify-center" /></button>
                          }
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Refined Table View */
            <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
              <table className="w-full text-sm text-left [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
                <thead className="sticky top-0 z-10 text-xs text-muted-foreground bg-muted/50 backdrop-blur uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium w-12 text-center"></th>
                    <th className="px-4 py-3 font-medium">{t("sales.product")}</th>
                    <th className="px-4 py-3 font-medium">{t("products.category")}</th>
                    <th className="px-4 py-3 font-medium text-right">{t("products.sellingPriceShort")}</th>
                    <th className="px-4 py-3 font-medium text-right">{t("products.stock")}</th>
                    <th className="px-4 py-3 font-medium text-right">{t("products.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((p, i) => {
                    const stock = getProductStock(p.id);
                    const qty = stock?.quantity || 0;
                    const min = stock?.minStock || 5;
                    const isLowStock = qty <= min && qty > 0;
                    const isOutOfStock = qty === 0;
                    const displayImage = p.imageUrls?.[0] || p.imageUrl;
                    return (
                      <motion.tr
                        key={p.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.28, delay: Math.min(i, 12) * 0.03, ease: [0.22, 1, 0.36, 1] }}
                        className="group relative transition-colors duration-200 hover:bg-primary/5"
                      >

                        <td className="relative py-2 px-1 text-center"><span className="absolute left-0 top-1/2 h-0 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300 group-hover:h-3/5" />
                          <div className="h-10 w-10 rounded-lg overflow-hidden border mx-auto relative shadow-sm group-hover:scale-110 transition-transform">
                            <ProfessionalImage src={displayImage} />
                            {(p.imageUrls?.length || 0) > 1 && (
                              <div className="absolute bottom-0 right-0 bg-black/70 text-white text-[7px] px-1 font-black backdrop-blur-sm z-10 leading-relaxed">+{p.imageUrls!.length - 1}</div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 font-bold text-foreground">
                          <div>{p.name}</div>
                          {(p.sku || p.brand) && (
                            <div className="text-[10px] text-muted-foreground font-normal flex gap-2">
                              {p.sku && <span>SKU: {p.sku}</span>}
                              {p.brand && <span>Brand: {p.brand}</span>}
                            </div>
                          )}
                        </td>
                        <td className="py-4 text-muted-foreground font-medium text-xs max-w-[150px] truncate">
                          {normalizeCategories(p).map(getCategoryName).join(", ")}
                        </td>
                        <td className="py-4 text-right font-black text-primary">{formatTZS(p.sellingPrice)}</td>
                        <td className="py-4 text-right">
                          <span className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black",
                            isOutOfStock ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" :
                            isLowStock ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                            "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          )}>
                            {qty} {p.unit || "pcs"}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setDetailProduct(p)} className="p-1.5 hover:bg-background rounded-md shadow-sm border transition-all hover:text-primary" title="View"><Eye className="h-4 w-4" /></button>
                            {permissions.canEditProduct && (
                              <button onClick={() => handleEdit(p)} className="p-1.5 hover:bg-background rounded-md shadow-sm border transition-all hover:text-primary" title="Edit"><Edit className="h-4 w-4" /></button>
                            )}
                            {permissions.canAddProduct && (
                              <button onClick={() => handleDuplicate(p)} className="p-1.5 hover:bg-background rounded-md shadow-sm border transition-all hover:text-primary" title="Duplicate"><Copy className="h-4 w-4" /></button>
                            )}
                            {permissions.canDeleteProduct && (
                              <button onClick={() => setProductToDelete(p)} className="p-1.5 hover:bg-destructive/10 rounded-md shadow-sm border border-destructive/20 transition-all text-destructive" title="Delete"><Trash2 className="h-4 w-4" /></button>
                            )}
                            {currentShop && (
                              <AIAdGeneratorDialog 
                                shop={currentShop} 
                                product={p} 
                                trigger={
                                  <button className="p-1.5 hover:bg-primary/10 rounded-md shadow-sm border transition-all" title="Generate AI Ad">
                                    <Sparkles className="h-4 w-4 text-primary" />
                                  </button>
                                }
                              />
                            )}
                            {fbConnected && (
                              <button
                                onClick={() => setProductToShare(p)}
                                className="p-1.5 hover:bg-blue-50 rounded-md shadow-sm border border-blue-100 transition-all text-[#1877F2]"
                                title="Post to Facebook"
                              >
                                <Facebook className="h-4 w-4" />
                              </button>
                            )}
                            {ttConnected && (
                              <button
                                onClick={() => setProductToShareTikTok(p)}
                                className="p-1.5 hover:bg-black/10 rounded-md shadow-sm border transition-all text-foreground"
                                title="Post to TikTok"
                              >
                                <TikTokIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>
          )}


          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button 
                variant="outline" 
                onClick={handleLoadMore} 
                disabled={productsLoading}
                className="w-full md:w-auto min-w-[200px] h-10 rounded-lg bg-card border border-border/50 shadow-sm font-bold text-primary"
              >
                {productsLoading ? (
                  <Loader size={7} className="mr-2" />
                ) : (
                  <ChevronDown className="h-4 w-4 mr-2" />
                )}

                {t("products.showMore")}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailProduct} onOpenChange={(v) => { if (!v) setDetailProduct(null); }}>
        <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto rounded-3xl p-4 sm:p-6">
          <DialogHeader><DialogTitle>{t("products.detailTitle")}</DialogTitle></DialogHeader>
          {detailProduct && (
            <div className="space-y-4 mt-2">
              {(detailProduct.imageUrls?.length || detailProduct.imageUrl) && (
                <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide snap-x">
                   {(detailProduct.imageUrls || [detailProduct.imageUrl]).map((url, idx) => (
                     url && <ProfessionalImage key={idx} src={url} className="h-40 w-40 rounded-xl border-2 border-muted/50 shadow-md shrink-0 snap-center" showZoom />
                   ))}
                </div>
              )}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">{t("products.name")}:</span><span className="font-bold">{detailProduct.name}</span></div>
                <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">{t("products.sellingPrice")}:</span><span className="font-bold">{formatTZS(detailProduct.sellingPrice)}</span></div>
                <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">{t("products.stock")}:</span><span className="font-bold">{getProductStock(detailProduct.id)?.quantity || 0}</span></div>
                {detailProduct.brand && <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">{t("products.brand")}:</span><span className="font-bold">{detailProduct.brand}</span></div>}
                {detailProduct.sku && <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">SKU:</span><span className="font-bold">{detailProduct.sku}</span></div>}
                {detailProduct.storeLocation && <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">{t("products.location") || "Eneo/Side"}:</span><span className="font-bold text-primary">{detailProduct.storeLocation}</span></div>}
                {detailProduct.prices && detailProduct.prices.length > 0 && (
                  <div className="pt-2">
                    <p className="text-muted-foreground mb-1.5 font-bold text-xs uppercase tracking-wider">Pricing Tiers (Viwango vya Bei):</p>
                    <div className="grid grid-cols-2 gap-2">
                      {detailProduct.prices.map((p, idx) => (
                        <div key={idx} className="bg-muted/40 p-2.5 rounded-xl border flex flex-col justify-center">
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{p.type}</span>
                          <span className="font-bold text-foreground mt-0.5">{formatTZS(p.price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {detailProduct.description && (
                  <div className="pt-2">
                    <p className="text-muted-foreground mb-1">{t("products.description")}:</p>
                    <p className="bg-muted/30 p-2 rounded-md">{detailProduct.description}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.areYouSure")}</AlertDialogTitle>
            <AlertDialogDescription>{t("common.deleteConfirmation")} <span className="font-bold">{productToDelete?.name}</span></AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">{t("common.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Facebook Post Confirmation */}
      <AlertDialog open={!!productToShare} onOpenChange={(open) => !open && !sharing && setProductToShare(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Facebook className="h-5 w-5 text-[#1877F2]" />
              Post to Facebook?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will publish <span className="font-bold">{productToShare?.name}</span> to your connected Facebook Page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sharing}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                if (productToShare) handlePostToFacebook(productToShare);
              }} 
              className="bg-[#1877F2] text-white hover:bg-[#1877F2]/90"
              disabled={sharing}
            >
              {sharing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Share2 className="h-4 w-4 mr-2" />}
              Publish Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* TikTok pre-publish sheet (Content Sharing Guidelines compliant) */}
      <TikTokPublishDialog
        open={!!productToShareTikTok}
        onOpenChange={(open) => !open && setProductToShareTikTok(null)}
        product={productToShareTikTok}
        shopId={currentShopId || ""}
      />
    </div>
  );
}
