import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Facebook,
  FileText,
  Loader2,
  Package,
  PackagePlus,
  QrCode,
  ScanLine,
  Sparkles,
  Store,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { QrScanner } from "@/components/common/QrScanner";
import { CameraCapture } from "@/components/common/CameraCapture";
import {
  useApplyIntakeBatch,
  useCreateIntakeBatch,
  useDeleteIntakeDraft,
  useIntakeBatch,
  useUpdateIntakeDraft,
} from "@/hooks/useIntake";
import { compressImage, compressIntakeImage } from "@/lib/imageUtils";
import { decodeQrFromDataUrl, fileToDataUrl, productHintsFromQrPayload } from "@/lib/qr";
import { extractProductDetailsListFromImage, type ProductDetails } from "@/lib/api/domains/ai";
import { matchCategoryByName, type CategoryNode } from "@/lib/categories";
import { UNITS, matchUnitByName } from "@/lib/units";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { IntakeDraft } from "@/types";

const CONFIDENCE_THRESHOLD = 0.85;

/**
 * One AI-detected product awaiting review in the in-modal table. Prices and
 * quantity stay editable as raw text and are coerced to numbers on apply.
 */
type PhotoRow = Omit<ProductDetails, "buyingPrice" | "sellingPrice" | "quantity"> & {
  buyingPrice?: number | string;
  sellingPrice?: number | string;
  quantity?: number | string;
  sku?: string;
  storeLocation?: string;
  prices?: { type: string; price: number | string }[];
  publishToDirectory?: boolean;
  publishToDeliveryApp?: boolean;
  publishToFacebook?: boolean;
};

/** One review-table row with prices and quantity coerced, ready to be created. */
export interface PhotoSubmitRow extends Omit<ProductDetails, "buyingPrice" | "sellingPrice" | "quantity"> {
  name: string;
  buyingPrice?: number;
  sellingPrice?: number;
  quantity?: number;
  sku?: string;
  storeLocation?: string;
  prices?: { type: string; price: number }[];
  publishToDirectory?: boolean;
  publishToDeliveryApp?: boolean;
  publishToFacebook?: boolean;
}

export interface PhotoSubmitResult {
  created: number;
  /** Rows the caller could not create; the dialog keeps them editable for a retry. */
  failed: PhotoSubmitRow[];
}

function photoNumber(value: number | string | undefined): number | undefined {
  if (value === undefined || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function rowTone(score: number) {
  if (score < 0.5) return "bg-red-50/70 hover:bg-red-50 dark:bg-red-950/30 dark:hover:bg-red-950/50";
  if (score < CONFIDENCE_THRESHOLD) return "bg-amber-50/70 hover:bg-amber-50 dark:bg-amber-950/30 dark:hover:bg-amber-950/50";
  return "";
}

function confidenceTone(score: number) {
  if (score < 0.5) return "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200";
  if (score < CONFIDENCE_THRESHOLD) return "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200";
  return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200";
}

interface ScanToIntakeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string | null;
  /**
   * The shop's category tree (same source the Add Product form's category
   * dropdown renders). Passed to the AI as known-category hints and mirrored
   * as the review table's category dropdown. Optional — without it the photo
   * table falls back to free-text category fields.
   */
  categoryGroups?: CategoryNode[];
  /**
   * Add Product handoff: instead of the review table + batch apply, the parsed
   * drafts are handed to the caller so the product form can be pre-filled for
   * review (first draft fills the form, the rest queue behind it).
   */
  onParsed?: (drafts: IntakeDraft[]) => void;
  /**
   * Product-photo method: the AI identifies every distinct product in a
   * captured or uploaded photo; the rows land in the editable review table
   * below the method cards until the merchant applies them to the form.
   */
  onProductDetected?: (details: ProductDetails[], image: string) => void;
  /**
   * Direct-submit mode for the photo review table: Apply creates the rows as
   * products right away (the caller reuses the Add Product pipeline) instead
   * of handing them to the product form. Takes precedence over
   * onProductDetected for the table; rows that fail stay in the table.
   */
  onSubmitProducts?: (rows: PhotoSubmitRow[], image: string) => Promise<PhotoSubmitResult>;
  /** Whether the shop's Facebook page is connected; gates the FB publish switch. */
  fbConnected?: boolean | null;
}

/**
 * The review table's Category cell: the same grouped, searchable category
 * picker the Add Product form uses, compressed into a table cell. Picking one
 * entry hands the merchant's chosen category name to the row.
 */
const CategoryCellPicker: React.FC<{
  value: string;
  placeholder: string;
  groups: CategoryNode[];
  onSelect: (name: string) => void;
}> = ({ value, placeholder, groups, onSelect }) => {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-full min-w-[130px] justify-between gap-1 px-2 font-normal"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || placeholder}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search categories..." />
          <CommandList>
            <CommandEmpty>No categories found.</CommandEmpty>
            {groups.map((group) => (
              <CommandGroup key={group.id} heading={group.name}>
                {(group.children ?? []).map((cat) => (
                  <CommandItem
                    key={cat.id}
                    onSelect={() => {
                      onSelect(cat.name);
                      setOpen(false);
                    }}
                  >
                    <span
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        value.toLowerCase() === cat.name.toLowerCase()
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check className="h-4 w-4" />
                    </span>
                    {cat.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

/**
 * The expanded "more details" editor for one photo-review row: description,
 * physical attributes, SKU/location, price tiers, publishing switches and any
 * extra fields the model read off the packaging. Shared by the desktop review
 * table's expanded row and the mobile card layout so both stay identical.
 */
const PhotoRowEditor: React.FC<{
  row: PhotoRow;
  index: number;
  editPhotoRow: (index: number, patch: Partial<PhotoRow>) => void;
  editPhotoPrice: (index: number, priceIndex: number, patch: Partial<{ type: string; price: number | string }>) => void;
  removePhotoPrice: (index: number, priceIndex: number) => void;
  addPhotoPrice: (index: number) => void;
  editPhotoExtra: (index: number, key: string, value: string) => void;
  fbConnected?: boolean | null;
}> = ({ row, index, editPhotoRow, editPhotoPrice, removePhotoPrice, addPhotoPrice, editPhotoExtra, fbConnected }) => {
  const { t } = useI18n();
  const extraEntries = Object.entries(row.extra ?? {});
  return (
    <div className="space-y-3 py-1">
      <div className="space-y-1">
        <Label className="text-xs">{t("products.fDescription")}</Label>
        <Textarea
          className="min-h-[60px]"
          value={row.description ?? ""}
          onChange={(e) => editPhotoRow(index, { description: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="space-y-1">
          <Label className="text-xs">{t("products.fSize")}</Label>
          <Input
            className="h-8"
            value={row.size ?? ""}
            onChange={(e) => editPhotoRow(index, { size: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("products.fWeight")}</Label>
          <Input
            className="h-8"
            value={row.weight ?? ""}
            onChange={(e) => editPhotoRow(index, { weight: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("products.fColor")}</Label>
          <Input
            className="h-8"
            value={row.color ?? ""}
            onChange={(e) => editPhotoRow(index, { color: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("products.fExpiry")}</Label>
          <Input
            className="h-8"
            type="date"
            value={row.expiryDate ?? ""}
            onChange={(e) => editPhotoRow(index, { expiryDate: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">SKU</Label>
          <Input
            className="h-8"
            value={row.sku ?? ""}
            onChange={(e) => editPhotoRow(index, { sku: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("products.location")}</Label>
          <Input
            className="h-8"
            value={row.storeLocation ?? ""}
            placeholder="Mfano: Aisle 4, Side B"
            onChange={(e) => editPhotoRow(index, { storeLocation: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Tiers &amp; Wholesale Pricing
        </p>
        {(row.prices ?? []).map((pRecord, pIdx) => (
          <div key={pIdx} className="flex items-center gap-2 rounded-xl border border-border/50 bg-background p-2">
            <Select
              value={pRecord.type}
              onValueChange={(val) => editPhotoPrice(index, pIdx, { type: val })}
            >
              <SelectTrigger className="h-8 w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wholesale">Wholesale</SelectItem>
                <SelectItem value="corporate">Corporate</SelectItem>
                <SelectItem value="promotional">Promo</SelectItem>
              </SelectContent>
            </Select>
            <Input
              className="h-8 flex-1"
              type="number"
              min={0}
              step="any"
              value={pRecord.price}
              onChange={(e) => editPhotoPrice(index, pIdx, { price: e.target.value })}
              placeholder="Price"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={() => removePhotoPrice(index, pIdx)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-full rounded-lg border-dashed border-2 bg-background text-xs font-bold"
          onClick={() => addPhotoPrice(index)}
        >
          + {t("products.addPriceTier")}
        </Button>
      </div>
      <div className="space-y-2 rounded-xl border bg-background/60 p-3">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Usambazaji
        </p>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-background p-2">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 shrink-0 text-primary" />
            <div className="space-y-0.5">
              <Label className="text-xs font-bold leading-none">Twende duka marketplace</Label>
              <p className="text-[10px] text-muted-foreground">Onyesha bidhaa mtandaoni</p>
            </div>
          </div>
          <Switch
            checked={row.publishToDirectory ?? false}
            onCheckedChange={(checked) => editPhotoRow(index, { publishToDirectory: checked })}
          />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-background p-2">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 shrink-0 text-primary" />
            <div className="space-y-0.5">
              <Label className="text-xs font-bold leading-none">Tulete App</Label>
              <p className="text-[10px] text-muted-foreground">Inaweza kuagizwa mtandaoni</p>
            </div>
          </div>
          <Switch
            checked={row.publishToDeliveryApp ?? false}
            onCheckedChange={(checked) => editPhotoRow(index, { publishToDeliveryApp: checked })}
          />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-background p-2">
          <div className="flex items-center gap-2">
            <Facebook className="h-4 w-4 shrink-0 text-[#1877F2]" />
            <div className="space-y-0.5">
              <Label className="text-xs font-bold leading-none text-[#1877F2]">Facebook &amp; Instagram</Label>
              <p className="text-[10px] text-muted-foreground">Post mtandaoni ukisave</p>
            </div>
          </div>
          <Switch
            checked={row.publishToFacebook ?? false}
            onCheckedChange={(checked) => {
              if (checked && !fbConnected) {
                toast.error(t("social.connectFirst") || "Please connect your Facebook account in the Social tab first.");
                return;
              }
              editPhotoRow(index, { publishToFacebook: checked });
            }}
          />
        </div>
      </div>
      {extraEntries.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">
            {t("products.photoMoreDetails")}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {extraEntries.map(([key, value]) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs">{key}</Label>
                <Input
                  className="h-8"
                  value={value}
                  onChange={(e) => editPhotoExtra(index, key, e.target.value)}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{t("products.photoExtraHint")}</p>
        </div>
      )}
    </div>
  );
};

/**
 * Opt-in capture entry inside Add Product: the product's own QR, invoice/records,
 * or a product photo — each by camera or upload. A product QR (barcode number,
 * URL, or plain name) pre-fills the product form directly; invoice pages and
 * multi-item QR layouts go through the AI intake staging area. Nothing touches
 * the catalogue until the merchant reviews and saves.
 */
export const ScanToIntakeDialog: React.FC<ScanToIntakeDialogProps> = ({ isOpen, onClose, shopId, categoryGroups, onParsed, onProductDetected, onSubmitProducts, fbConnected }) => {
  const { t } = useI18n();
  const createBatch = useCreateIntakeBatch(shopId);
  const [batchId, setBatchId] = useState<string | null>(null);
  const { data: batch } = useIntakeBatch(batchId);
  const updateDraft = useUpdateIntakeDraft(shopId, batch?.id ?? null);
  const removeDraft = useDeleteIntakeDraft(shopId, batch?.id ?? null);
  const applyBatch = useApplyIntakeBatch(shopId);

  const [qrPayloads, setQrPayloads] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [qrOpen, setQrOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [submittingPhotos, setSubmittingPhotos] = useState(false);
  const [photoRows, setPhotoRows] = useState<PhotoRow[]>([]);
  const [photoImage, setPhotoImage] = useState("");
  const [photoExpanded, setPhotoExpanded] = useState<Set<number>>(new Set());
  const qrUploadRef = useRef<HTMLInputElement>(null);
  const invoiceUploadRef = useRef<HTMLInputElement>(null);
  const photoUploadRef = useRef<HTMLInputElement>(null);
  const [edits, setEdits] = useState<Record<string, IntakeDraft>>({});
  const handoffRef = useRef(false);

  useEffect(() => {
    if (!onParsed || batch?.status !== "completed" || handoffRef.current) return;
    handoffRef.current = true;
    const drafts = batch.drafts;
    setBatchId(null);
    createBatch.reset();
    onClose();
    onParsed(drafts);
  }, [batch, onParsed, onClose, createBatch]);

  const sourcesCount = qrPayloads.length + images.length;
  const parsing = createBatch.isPending;
  const reviewStage = batchId !== null;
  const inFlight = batch?.status === "pending" || batch?.status === "processing";

  const draftOf = (draft: IntakeDraft): IntakeDraft => edits[draft.id] ?? draft;

  const editDraft = (draft: IntakeDraft, field: keyof IntakeDraft, value: string | number) => {
    setEdits((prev) => {
      const base = prev[draft.id] ?? draft;
      return { ...prev, [draft.id]: { ...base, [field]: value } };
    });
  };

  const saveText = (draft: IntakeDraft, field: "nameEn" | "nameSw" | "unit" | "categoryName" | "traItemCode") => {
    const value = draftOf(draft)[field];
    if (value === draft[field]) return;
    updateDraft.mutate({ draftId: draft.id, patch: { [field]: value } as Partial<IntakeDraft> });
  };

  const saveNumber = (draft: IntakeDraft, field: "quantity" | "buyingPrice" | "sellingPrice" | "taxRatePercent") => {
    const raw = draftOf(draft)[field];
    const parsed = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(parsed) || parsed === draft[field]) {
      editDraft(draft, field, draft[field]);
      return;
    }
    updateDraft.mutate({ draftId: draft.id, patch: { [field]: parsed } as Partial<IntakeDraft> });
  };

  const onRemove = (draft: IntakeDraft) => {
    removeDraft.mutate(draft.id, {
      onSuccess: () => {
        setEdits((prev) => {
          const next = { ...prev };
          delete next[draft.id];
          return next;
        });
        toast.success(t("intake.removedToast"));
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const onApply = () => {
    if (!batch) return;
    applyBatch.mutate(batch.id, {
      onSuccess: (summary) => {
        toast.success(
          `${summary.created} ${t("intake.toastCreated")} · ${summary.updated} ${t("intake.toastUpdated")} · ${summary.skipped} ${t("intake.toastSkipped")}`
        );
        setQrPayloads([]);
        setImages([]);
        setEdits({});
        setBatchId(null);
        createBatch.reset();
        onClose();
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const onStartParsing = () => {
    if (!shopId || parsing) return;
    if (sourcesCount === 0) {
      toast.error(t("intake.needSource"));
      return;
    }
    handoffRef.current = false;
    createBatch.mutate(
      {
        imageDataUrls: images.length > 0 ? images : undefined,
        qrPayloads: qrPayloads.length > 0 ? qrPayloads : undefined,
      },
      {
        onSuccess: (created) => {
          setBatchId(created.id);
          setQrPayloads([]);
          setImages([]);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const resetToCapture = () => {
    setEdits({});
    setBatchId(null);
    createBatch.reset();
  };

  /**
   * Route one decoded QR payload: a readable product QR (barcode number, URL,
   * plain name) fills the product form straight away, everything else joins
   * the batch queue for the review pipeline.
   */
  const handleQrPayload = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const hints = onProductDetected ? productHintsFromQrPayload(trimmed) : null;
    if (hints) {
      onClose();
      onProductDetected([hints], "");
      toast.success(t("intake.qrProductDetected"));
      return;
    }
    setQrPayloads((prev) => [...prev, trimmed]);
    toast.success(t("intake.qrAdded"));
  };

  const handleQrUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      try {
        const dataUrl = await fileToDataUrl(file);
        const payload = await decodeQrFromDataUrl(dataUrl);
        if (!payload) {
          toast.error(t("intake.qrNotFound"));
          continue;
        }
        handleQrPayload(payload);
      } catch (err) {
        console.error("QR photo decode failed:", err);
        toast.error(t("intake.photoFailed"));
      }
    }
  };

  const handleInvoiceUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      for (const file of Array.from(files)) {
        const compressed = await compressIntakeImage(file);
        setImages((prev) => [...prev, compressed]);
      }
      toast.success(t("intake.photoAdded"));
    } catch (err) {
      console.error("Invoice upload compression failed:", err);
      toast.error(t("intake.photoFailed"));
    }
  };

  const editPhotoRow = (index: number, patch: Partial<PhotoRow>) => {
    setPhotoRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const editPhotoExtra = (index: number, key: string, value: string) => {
    setPhotoRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const extra = { ...(row.extra ?? {}) };
        if (value.trim()) extra[key] = value;
        else delete extra[key];
        return { ...row, extra };
      })
    );
  };

  const removePhotoRow = (index: number) => {
    setPhotoRows((prev) => prev.filter((_, i) => i !== index));
    setPhotoExpanded((prev) => new Set([...prev].filter((idx) => idx !== index)));
  };

  const togglePhotoExpanded = (index: number) => {
    setPhotoExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const clearPhotoRows = () => {
    setPhotoRows([]);
    setPhotoImage("");
    setPhotoExpanded(new Set());
  };

  const discardPhotoRows = () => clearPhotoRows();

  const editPhotoPrice = (index: number, priceIndex: number, patch: Partial<{ type: string; price: number | string }>) => {
    setPhotoRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const prices = [...(row.prices ?? [])];
        prices[priceIndex] = { ...prices[priceIndex], ...patch };
        return { ...row, prices };
      })
    );
  };

  const removePhotoPrice = (index: number, priceIndex: number) => {
    setPhotoRows((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, prices: (row.prices ?? []).filter((_, idx) => idx !== priceIndex) } : row
      )
    );
  };

  const addPhotoPrice = (index: number) => {
    setPhotoRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const current = row.prices ?? [];
        const typesUsed = current.map((p) => p.type);
        let nextType = "wholesale";
        if (typesUsed.includes("wholesale")) nextType = "corporate";
        if (typesUsed.includes("corporate")) nextType = "promotional";
        return { ...row, prices: [...current, { type: nextType, price: "" }] };
      })
    );
  };

  const applyPhotoRows = async () => {
    if (submittingPhotos) return;
    const named = photoRows.filter((row) => row.name && row.name.trim());
    if (named.length === 0) return;
    if (onSubmitProducts) {
      const rows: PhotoSubmitRow[] = named.map((row) => {
        const extraText = Object.entries(row.extra ?? {})
          .map(([key, value]) => `${key}: ${value}`)
          .join("; ");
        return {
          ...row,
          name: row.name!.trim(),
          buyingPrice: photoNumber(row.buyingPrice),
          sellingPrice: photoNumber(row.sellingPrice),
          quantity: photoNumber(row.quantity),
          prices: (row.prices ?? [])
            .map((p) => ({ type: p.type, price: photoNumber(p.price) }))
            .filter((p): p is { type: string; price: number } => p.price !== undefined),
          description: [row.description, extraText].filter(Boolean).join("\n") || undefined,
        };
      });
      setSubmittingPhotos(true);
      try {
        const result = await onSubmitProducts(rows, photoImage);
        if (result.failed.length > 0) {
          setPhotoRows(result.failed);
          setPhotoExpanded(new Set());
        } else {
          clearPhotoRows();
          onClose();
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("common.error"));
      } finally {
        setSubmittingPhotos(false);
      }
      return;
    }
    if (!onProductDetected) return;
    const rows: ProductDetails[] = photoRows
      .filter((row) => row.name && row.name.trim())
      .map((row) => ({
        ...row,
        buyingPrice: photoNumber(row.buyingPrice),
        sellingPrice: photoNumber(row.sellingPrice),
        quantity: photoNumber(row.quantity),
        extra: row.extra && Object.keys(row.extra).length > 0 ? row.extra : undefined,
      }));
    onClose();
    onProductDetected(rows, photoImage);
    clearPhotoRows();
  };

  useEffect(() => {
    if (!isOpen) clearPhotoRows();
  }, [isOpen]);

  const detectProductFromImage = async (dataUrl: string) => {
    if (!onProductDetected && !onSubmitProducts) return;
    setAnalyzingPhoto(true);
    try {
      const compressed = await compressImage(dataUrl, { quality: 0.6, maxWidth: 1000 });
      const categoryOptions = (categoryGroups ?? []).flatMap((g) => g.children ?? []);
      const detected = await extractProductDetailsListFromImage(
        compressed,
        categoryOptions.map((c) => c.name)
      );
      if (detected.length === 0) {
        toast.error(t("products.aiDetectedFail"));
        return;
      }
      // Snap the AI's free-text answers onto the form's own options so the
      // review table's dropdowns (and the apply-time form match) line up.
      const normalized = detected.map((details) => {
        const matchedId = matchCategoryByName(details.category, categoryOptions);
        const matched = matchedId
          ? categoryOptions.find((c) => c.id === matchedId)
          : undefined;
        return {
          ...details,
          category: matched ? matched.name : details.category,
          unit: matchUnitByName(details.unit),
        };
      });
      setPhotoImage((prev) => prev || compressed);
      setPhotoRows((prev) => [...prev, ...normalized]);
      toast.success(t("products.aiDetectedMany").replace("{n}", String(normalized.length)));
    } catch (err) {
      console.error("Product photo AI failed:", err);
      toast.error(t("products.aiDetectedFail"));
    } finally {
      setAnalyzingPhoto(false);
    }
  };

  const handlePhotoUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      await detectProductFromImage(dataUrl);
    } catch (err) {
      console.error("Product photo read failed:", err);
      toast.error(t("intake.photoFailed"));
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) onClose();
  };

  const photoAppliable = photoRows.filter((row) => row.name && row.name.trim()).length;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-h-[92vh] sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-primary" />
              {reviewStage ? t("intake.reviewTitle") : t("intake.scanTitle")}
            </DialogTitle>
            <DialogDescription>
              {reviewStage ? t("intake.reviewDesc") : t("intake.scanDesc")}
            </DialogDescription>
          </DialogHeader>

          {!reviewStage && (
            <div className="space-y-4">
              <input
                ref={qrUploadRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  handleQrUpload(e.target.files);
                  e.target.value = "";
                }}
              />
              <input
                ref={invoiceUploadRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  handleInvoiceUpload(e.target.files);
                  e.target.value = "";
                }}
              />
              <input
                ref={photoUploadRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  handlePhotoUpload(e.target.files);
                  e.target.value = "";
                }}
              />

              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("intake.chooseMethod")}
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-3 rounded-2xl border-2 border-dashed p-4 transition-colors hover:border-primary/50 hover:bg-primary/5">
                  <div className="flex flex-col items-center gap-1 text-center">
                    <QrCode className="h-7 w-7 text-primary" />
                    <span className="text-sm font-bold leading-tight">{t("intake.scanQr")}</span>
                    <span className="text-xs text-muted-foreground">{t("intake.scanQrHint")}</span>
                  </div>
                  <div className="mt-auto grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => setQrOpen(true)} disabled={parsing}>
                      <Camera className="mr-1.5 h-4 w-4" />
                      {t("intake.withCamera")}
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => qrUploadRef.current?.click()} disabled={parsing}>
                      <Upload className="mr-1.5 h-4 w-4" />
                      {t("intake.withUpload")}
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 rounded-2xl border-2 border-dashed p-4 transition-colors hover:border-primary/50 hover:bg-primary/5">
                  <div className="flex flex-col items-center gap-1 text-center">
                    <FileText className="h-7 w-7 text-primary" />
                    <span className="text-sm font-bold leading-tight">{t("intake.captureInvoice")}</span>
                    <span className="text-xs text-muted-foreground">{t("intake.captureInvoiceHint")}</span>
                  </div>
                  <div className="mt-auto grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => setCameraOpen(true)} disabled={parsing}>
                      <Camera className="mr-1.5 h-4 w-4" />
                      {t("intake.withCamera")}
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => invoiceUploadRef.current?.click()} disabled={parsing}>
                      <Upload className="mr-1.5 h-4 w-4" />
                      {t("intake.withUpload")}
                    </Button>
                  </div>
                </div>

                {(onProductDetected || onSubmitProducts) && (
                  <div className="flex flex-col gap-3 rounded-2xl border-2 border-dashed p-4 transition-colors hover:border-primary/50 hover:bg-primary/5">
                    <div className="flex flex-col items-center gap-1 text-center">
                      <Sparkles className="h-7 w-7 text-primary" />
                      <span className="text-sm font-bold leading-tight">{t("intake.methodPhoto")}</span>
                      <span className="text-xs text-muted-foreground">{t("intake.methodPhotoHint")}</span>
                    </div>
                    <div className="mt-auto grid grid-cols-2 gap-2">
                      <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => setPhotoOpen(true)} disabled={analyzingPhoto || parsing}>
                        {analyzingPhoto ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Camera className="mr-1.5 h-4 w-4" />}
                        {t("intake.withCamera")}
                      </Button>
                      <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => photoUploadRef.current?.click()} disabled={analyzingPhoto || parsing}>
                        {analyzingPhoto ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
                        {t("intake.withUpload")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {sourcesCount > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {t("intake.sources")} · {sourcesCount}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {qrPayloads.map((payload, i) => (
                      <span
                        key={`qr-${i}`}
                        className="inline-flex max-w-[220px] items-center gap-1.5 rounded-full border bg-muted/50 py-1 pl-2.5 pr-1 text-xs"
                      >
                        <QrCode className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="truncate">{payload}</span>
                        <button
                          type="button"
                          aria-label="remove"
                          className="ml-0.5 rounded-full p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setQrPayloads((prev) => prev.filter((_, idx) => idx !== i))}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    {images.map((url, i) => (
                      <div key={`img-${i}`} className="relative h-16 w-16">
                        <img
                          src={url}
                          alt=""
                          className="h-full w-full rounded-lg border object-cover"
                        />
                        <button
                          type="button"
                          aria-label="remove"
                          className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-0.5 text-white shadow"
                          onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="rounded-xl bg-muted/40 px-4 py-3 text-center text-xs text-muted-foreground">
                  {t("intake.noSources")}
                </p>
              )}

              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => handleClose(false)}>
                  {t("common.cancel")}
                </Button>
                <Button onClick={onStartParsing} disabled={parsing || sourcesCount === 0}>
                  {parsing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ScanLine className="mr-2 h-4 w-4" />
                  )}
                  {t("intake.startParsing")}
                </Button>
              </div>

              {photoRows.length > 0 && (
                <div className="space-y-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                    <span className="text-sm font-bold">{t("products.photoReviewTitle")}</span>
                    <Badge variant="secondary">{photoRows.length}</Badge>
                    <span className="text-xs text-muted-foreground">{t("products.photoReviewDesc")}</span>
                  </div>
                  {/* Mobile/tablet: one card per detected product, so every field (incl. Qty) is reachable without horizontal scrolling. */}
                  <div className="space-y-3 lg:hidden">
                    {photoRows.map((row, index) => {
                      const expanded = photoExpanded.has(index);
                      return (
                        <div key={`photo-card-${index}`} className="space-y-3 rounded-2xl border bg-background/60 p-3">
                          <div className="flex items-center gap-2">
                            <Input
                              className="h-9 flex-1"
                              value={row.name ?? ""}
                              placeholder={t("products.name")}
                              onChange={(e) => editPhotoRow(index, { name: e.target.value })}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 shrink-0 text-muted-foreground"
                              title={expanded ? t("common.close") : t("products.photoMoreDetails")}
                              onClick={() => togglePhotoExpanded(index)}
                            >
                              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-red-600"
                              onClick={() => removePhotoRow(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{t("intake.colCategory")}</Label>
                            {categoryGroups && categoryGroups.length > 0 ? (
                              <CategoryCellPicker
                                value={row.category ?? ""}
                                placeholder={t("products.category")}
                                groups={categoryGroups}
                                onSelect={(name) => editPhotoRow(index, { category: name })}
                              />
                            ) : (
                              <Input
                                className="h-9"
                                value={row.category ?? ""}
                                onChange={(e) => editPhotoRow(index, { category: e.target.value })}
                              />
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">{t("products.brand")}</Label>
                              <Input
                                className="h-9"
                                value={row.brand ?? ""}
                                onChange={(e) => editPhotoRow(index, { brand: e.target.value })}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Barcode</Label>
                              <Input
                                className="h-9"
                                value={row.barcode ?? ""}
                                onChange={(e) => editPhotoRow(index, { barcode: e.target.value })}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">{t("intake.colUnit")}</Label>
                              <Select
                                value={row.unit && UNITS.includes(row.unit) ? row.unit : ""}
                                onValueChange={(v) => editPhotoRow(index, { unit: v })}
                              >
                                <SelectTrigger className="h-9 w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {UNITS.map((u) => (
                                    <SelectItem key={u} value={u}>{u}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">{t("intake.colQty")}</Label>
                              <Input
                                className="h-9"
                                type="number"
                                min={0}
                                value={row.quantity ?? ""}
                                onChange={(e) => editPhotoRow(index, { quantity: e.target.value })}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">{t("intake.colBuy")}</Label>
                              <Input
                                className="h-9"
                                type="number"
                                min={0}
                                step="any"
                                value={row.buyingPrice ?? ""}
                                onChange={(e) => editPhotoRow(index, { buyingPrice: e.target.value })}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">{t("intake.colSell")}</Label>
                              <Input
                                className="h-9"
                                type="number"
                                min={0}
                                step="any"
                                value={row.sellingPrice ?? ""}
                                onChange={(e) => editPhotoRow(index, { sellingPrice: e.target.value })}
                              />
                            </div>
                          </div>
                          {expanded && (
                            <PhotoRowEditor
                              row={row}
                              index={index}
                              editPhotoRow={editPhotoRow}
                              editPhotoPrice={editPhotoPrice}
                              removePhotoPrice={removePhotoPrice}
                              addPhotoPrice={addPhotoPrice}
                              editPhotoExtra={editPhotoExtra}
                              fbConnected={fbConnected}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* Desktop (lg+): the full editable table — the 900px min width fits inside the max-w-5xl dialog. */}
                  <div className="hidden overflow-x-auto lg:block">
                    <Table className="min-w-[900px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("products.name")}</TableHead>
                          <TableHead>{t("intake.colCategory")}</TableHead>
                          <TableHead>{t("products.brand")}</TableHead>
                          <TableHead>Barcode</TableHead>
                          <TableHead>{t("intake.colUnit")}</TableHead>
                          <TableHead>{t("intake.colBuy")}</TableHead>
                          <TableHead>{t("intake.colSell")}</TableHead>
                          <TableHead>{t("intake.colQty")}</TableHead>
                          <TableHead className="w-16" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {photoRows.map((row, index) => {
                          const expanded = photoExpanded.has(index);
                          return (
                            <React.Fragment key={`photo-${index}`}>
                              <TableRow className="bg-background/60">
                                <TableCell className="min-w-[160px]">
                                  <Input
                                    className="h-8"
                                    value={row.name ?? ""}
                                    onChange={(e) => editPhotoRow(index, { name: e.target.value })}
                                  />
                                </TableCell>
                                <TableCell className="min-w-[130px]">
                                  {categoryGroups && categoryGroups.length > 0 ? (
                                    <CategoryCellPicker
                                      value={row.category ?? ""}
                                      placeholder={t("products.category")}
                                      groups={categoryGroups}
                                      onSelect={(name) => editPhotoRow(index, { category: name })}
                                    />
                                  ) : (
                                    <Input
                                      className="h-8"
                                      value={row.category ?? ""}
                                      onChange={(e) => editPhotoRow(index, { category: e.target.value })}
                                    />
                                  )}
                                </TableCell>
                                <TableCell className="min-w-[110px]">
                                  <Input
                                    className="h-8"
                                    value={row.brand ?? ""}
                                    onChange={(e) => editPhotoRow(index, { brand: e.target.value })}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    className="h-8 w-28"
                                    value={row.barcode ?? ""}
                                    onChange={(e) => editPhotoRow(index, { barcode: e.target.value })}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={row.unit && UNITS.includes(row.unit) ? row.unit : ""}
                                    onValueChange={(v) => editPhotoRow(index, { unit: v })}
                                  >
                                    <SelectTrigger className="h-8 w-24">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {UNITS.map((u) => (
                                        <SelectItem key={u} value={u}>{u}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    className="h-8 w-24"
                                    type="number"
                                    min={0}
                                    step="any"
                                    value={row.buyingPrice ?? ""}
                                    onChange={(e) => editPhotoRow(index, { buyingPrice: e.target.value })}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    className="h-8 w-24"
                                    type="number"
                                    min={0}
                                    step="any"
                                    value={row.sellingPrice ?? ""}
                                    onChange={(e) => editPhotoRow(index, { sellingPrice: e.target.value })}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    className="h-8 w-16"
                                    type="number"
                                    min={0}
                                    value={row.quantity ?? ""}
                                    onChange={(e) => editPhotoRow(index, { quantity: e.target.value })}
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-muted-foreground"
                                      title={expanded ? t("common.close") : t("products.photoMoreDetails")}
                                      onClick={() => togglePhotoExpanded(index)}
                                    >
                                      {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-muted-foreground hover:text-red-600"
                                      onClick={() => removePhotoRow(index)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                              {expanded && (
                                <TableRow className="bg-muted/30 hover:bg-muted/30">
                                  <TableCell colSpan={9}>
                                    <PhotoRowEditor
                                      row={row}
                                      index={index}
                                      editPhotoRow={editPhotoRow}
                                      editPhotoPrice={editPhotoPrice}
                                      removePhotoPrice={removePhotoPrice}
                                      addPhotoPrice={addPhotoPrice}
                                      editPhotoExtra={editPhotoExtra}
                                      fbConnected={fbConnected}
                                    />
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button variant="outline" onClick={discardPhotoRows} disabled={submittingPhotos}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t("products.photoDiscard")}
                    </Button>
                    <Button onClick={applyPhotoRows} disabled={photoAppliable === 0 || submittingPhotos}>
                      {submittingPhotos ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackagePlus className="mr-2 h-4 w-4" />}
                      {(onSubmitProducts ? t("products.photoDirectApply") : t("products.photoApply")).replace("{n}", String(photoAppliable))}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {reviewStage && (
            <div className="space-y-3">
              {(!batch || batch.status === "pending" || batch.status === "processing" || (batch.status === "completed" && onParsed)) && (
                <div className="flex flex-col items-center justify-center gap-3 py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm font-medium">{t("intake.processing")}</p>
                  <p className="text-xs text-muted-foreground">{t("intake.processingDesc")}</p>
                </div>
              )}

              {batch?.status === "failed" && (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-xl border border-red-300 p-4 dark:border-red-800">
                    <AlertTriangle className="mt-0.5 h-5 w-5 text-red-500" />
                    <div>
                      <p className="text-sm font-medium text-red-700 dark:text-red-300">
                        {t("intake.failedTitle")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {batch.errorMessage || t("intake.genericError")}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button variant="outline" onClick={resetToCapture}>
                      {t("common.back")}
                    </Button>
                  </div>
                </div>
              )}

              {((batch?.status === "completed" && !onParsed) || batch?.status === "applied") && batch && (
                <>
                  {batch.status === "applied" && (
                    <p className="text-xs text-muted-foreground">{t("intake.readOnlyApplied")}</p>
                  )}
                  {batch.drafts.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">{t("intake.noDrafts")}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("intake.colNameEn")}</TableHead>
                            <TableHead>{t("intake.colNameSw")}</TableHead>
                            <TableHead>{t("intake.colUnit")}</TableHead>
                            <TableHead>{t("intake.colQty")}</TableHead>
                            <TableHead>{t("intake.colBuy")}</TableHead>
                            <TableHead>{t("intake.colSell")}</TableHead>
                            <TableHead>{t("intake.colCategory")}</TableHead>
                            <TableHead>{t("intake.colConfidence")}</TableHead>
                            {batch.status === "completed" && <TableHead className="w-10" />}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {batch.drafts.map((draft) => {
                            const current = draftOf(draft);
                            const score = draft.aiConfidenceScore;
                            return (
                              <TableRow key={draft.id} className={rowTone(score)}>
                                <TableCell className="min-w-[140px]">
                                  <Input
                                    className="h-8"
                                    value={current.nameEn}
                                    readOnly={batch.status !== "completed"}
                                    onChange={(e) => editDraft(draft, "nameEn", e.target.value)}
                                    onBlur={() => saveText(draft, "nameEn")}
                                  />
                                </TableCell>
                                <TableCell className="min-w-[140px]">
                                  <Input
                                    className="h-8"
                                    value={current.nameSw}
                                    readOnly={batch.status !== "completed"}
                                    onChange={(e) => editDraft(draft, "nameSw", e.target.value)}
                                    onBlur={() => saveText(draft, "nameSw")}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    className="h-8 w-20"
                                    value={current.unit}
                                    readOnly={batch.status !== "completed"}
                                    onChange={(e) => editDraft(draft, "unit", e.target.value)}
                                    onBlur={() => saveText(draft, "unit")}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    className="h-8 w-20"
                                    type="number"
                                    min={0}
                                    value={current.quantity}
                                    readOnly={batch.status !== "completed"}
                                    onChange={(e) => editDraft(draft, "quantity", e.target.value)}
                                    onBlur={() => saveNumber(draft, "quantity")}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    className="h-8 w-24"
                                    type="number"
                                    min={0}
                                    step="any"
                                    value={current.buyingPrice}
                                    readOnly={batch.status !== "completed"}
                                    onChange={(e) => editDraft(draft, "buyingPrice", e.target.value)}
                                    onBlur={() => saveNumber(draft, "buyingPrice")}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    className="h-8 w-24"
                                    type="number"
                                    min={0}
                                    step="any"
                                    value={current.sellingPrice}
                                    readOnly={batch.status !== "completed"}
                                    onChange={(e) => editDraft(draft, "sellingPrice", e.target.value)}
                                    onBlur={() => saveNumber(draft, "sellingPrice")}
                                  />
                                </TableCell>
                                <TableCell className="min-w-[120px]">
                                  <Input
                                    className="h-8"
                                    value={current.categoryName}
                                    readOnly={batch.status !== "completed"}
                                    onChange={(e) => editDraft(draft, "categoryName", e.target.value)}
                                    onBlur={() => saveText(draft, "categoryName")}
                                  />
                                </TableCell>
                                <TableCell>
                                  <span
                                    title={score < 0.5 ? t("intake.confidenceVeryLow") : score < CONFIDENCE_THRESHOLD ? t("intake.confidenceLow") : undefined}
                                    className={cn(
                                      "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                                      confidenceTone(score)
                                    )}
                                  >
                                    {Math.round(score * 100)}%
                                  </span>
                                </TableCell>
                                {batch.status === "completed" && (
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                      onClick={() => onRemove(draft)}
                                      disabled={removeDraft.isPending}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                )}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  {batch.status === "completed" && (
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" onClick={() => handleClose(false)}>
                        {t("common.close")}
                      </Button>
                      <Button onClick={onApply} disabled={applyBatch.isPending}>
                        {applyBatch.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <PackagePlus className="mr-2 h-4 w-4" />
                        )}
                        {applyBatch.isPending ? t("intake.applying") : t("intake.apply")}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <QrScanner
        isOpen={qrOpen}
        onClose={() => setQrOpen(false)}
        onResult={(payload) => {
          setQrOpen(false);
          handleQrPayload(payload);
        }}
        title={t("intake.scanQr")}
      />
      <CameraCapture
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={async (dataUrl) => {
          try {
            const compressed = await compressImage(dataUrl, {
              maxWidth: 1600,
              maxHeight: 1600,
              quality: 0.75,
              format: "image/jpeg",
            });
            setImages((prev) => [...prev, compressed]);
            toast.success(t("intake.photoAdded"));
          } catch (err) {
            console.error("Intake capture compression failed:", err);
            setImages((prev) => [...prev, dataUrl]);
            toast.error(t("intake.photoFailed"));
          }
        }}
        title={t("intake.captureInvoice")}
      />
      <CameraCapture
        isOpen={photoOpen}
        onClose={() => setPhotoOpen(false)}
        onCapture={(dataUrl) => {
          setPhotoOpen(false);
          detectProductFromImage(dataUrl);
        }}
        title={t("intake.methodPhoto")}
      />
    </>
  );
};
