import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  Loader2,
  PackagePlus,
  Plus,
  QrCode,
  ScanLine,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import PageHeader from "@/components/common/PageHeader";
import { useAppSelector } from "@/store/hooks";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { compressImage, compressIntakeImage } from "@/lib/imageUtils";
import { CameraCapture } from "@/components/common/CameraCapture";
import { QrScanner } from "@/components/common/QrScanner";
import {
  useApplyIntakeBatch,
  useCreateIntakeBatch,
  useDeleteIntakeDraft,
  useIntakeBatches,
  useUpdateIntakeDraft,
} from "@/hooks/useIntake";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";
import type { IntakeBatch, IntakeDraft } from "@/types";

const CONFIDENCE_THRESHOLD = 0.85;

const STATUS_TONE: Record<IntakeBatch["status"], string> = {
  pending: "bg-slate-400",
  processing: "bg-blue-500 animate-pulse",
  completed: "bg-emerald-500",
  failed: "bg-red-500",
  applied: "bg-violet-500",
};

function isEditable(batch: IntakeBatch) {
  return batch.status === "completed";
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

function shortDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : format(date, "MMM d HH:mm");
}

export default function InventoryIntake() {
  const { t } = useI18n();
  const shopId = useAppSelector((s) => s.shops.currentShopId);

  const { data: batchesData, isLoading } = useIntakeBatches(shopId);
  const updateDraft = useUpdateIntakeDraft(shopId, null);
  const removeDraft = useDeleteIntakeDraft(shopId, null);
  const applyBatch = useApplyIntakeBatch(shopId);
  const createBatch = useCreateIntakeBatch(shopId);

  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, IntakeDraft>>({});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [urlText, setUrlText] = useState("");
  const [qrText, setQrText] = useState("");
  const [note, setNote] = useState("");
  const [preparing, setPreparing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [qrScanOpen, setQrScanOpen] = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);

  const batches = useMemo(
    () => [...(batchesData ?? [])].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
    [batchesData]
  );
  const inFlight = batches.find((b) => b.status === "pending" || b.status === "processing");
  const activeBatch = batches.find((b) => b.id === selectedBatchId) ?? inFlight ?? batches[0];

  const draftOf = (draft: IntakeDraft): IntakeDraft => edits[draft.id] ?? draft;

  const editDraft = (draft: IntakeDraft, field: keyof IntakeDraft, value: string | number) => {
    setEdits((prev) => {
      const base = prev[draft.id] ?? draft;
      return { ...prev, [draft.id]: { ...base, [field]: value } };
    });
  };

  const saveText = (
    draft: IntakeDraft,
    field: "nameEn" | "nameSw" | "unit" | "categoryName" | "traItemCode"
  ) => {
    const value = draftOf(draft)[field];
    if (value === draft[field]) return;
    updateDraft.mutate({ draftId: draft.id, patch: { [field]: value } as Partial<IntakeDraft> });
  };

  const saveNumber = (
    draft: IntakeDraft,
    field: "quantity" | "buyingPrice" | "sellingPrice" | "taxRatePercent"
  ) => {
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
    if (!activeBatch) return;
    applyBatch.mutate(activeBatch.id, {
      onSuccess: (summary) => {
        toast.success(
          `${summary.created} ${t("intake.toastCreated")} · ${summary.updated} ${t("intake.toastUpdated")} · ${summary.skipped} ${t("intake.toastSkipped")}`
        );
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const onSubmitNewBatch = async () => {
    if (!shopId || createBatch.isPending || preparing) return;
    let imageDataUrls: string[] = [...capturedImages];
    if (files.length > 0) {
      setPreparing(true);
      try {
        for (const file of files) {
          imageDataUrls.push(await compressIntakeImage(file));
        }
      } catch (err) {
        setPreparing(false);
        toast.error(err instanceof Error ? err.message : t("intake.genericError"));
        return;
      }
      setPreparing(false);
    }
    const imageUrl = urlText.split("\n").map((s) => s.trim()).filter(Boolean);
    const qrPayloads = qrText.split("\n").map((s) => s.trim()).filter(Boolean);
    if (imageDataUrls.length === 0 && imageUrl.length === 0 && qrPayloads.length === 0) {
      toast.error(t("intake.needSource"));
      return;
    }
    createBatch.mutate(
      {
        note: note.trim() || undefined,
        imageDataUrls: imageDataUrls.length > 0 ? imageDataUrls : undefined,
        imageUrl: imageUrl.length > 0 ? imageUrl : undefined,
        qrPayloads: qrPayloads.length > 0 ? qrPayloads : undefined,
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setFiles([]);
          setCapturedImages([]);
          setUrlText("");
          setQrText("");
          setNote("");
          if (fileInputRef.current) fileInputRef.current.value = "";
          toast.success(t("intake.submitted"));
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  if (!shopId) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("intake.title")} description={t("intake.subtitle")} />
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t("intake.noShop")}
          </CardContent>
        </Card>
      </div>
    );
  }

  const editable = activeBatch ? isEditable(activeBatch) : false;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("intake.title")}
        description={t("intake.subtitle")}
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("intake.newBatch")}
          </Button>
        }
      />

      {batches.length === 0 ? (
        isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("intake.processing")}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
              <ScanLine className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium">{t("intake.noBatchesTitle")}</p>
              <p className="max-w-md text-xs text-muted-foreground">{t("intake.noBatchesDesc")}</p>
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t("intake.newBatch")}
              </Button>
            </CardContent>
          </Card>
        )
      ) : (
        <>
          {batches.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {batches.map((batch) => (
                <button
                  key={batch.id}
                  type="button"
                  onClick={() => setSelectedBatchId(batch.id)}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition-colors",
                    batch.id === activeBatch?.id
                      ? "border-primary bg-primary/10 font-medium text-primary"
                      : "border-border text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <span className={cn("h-2 w-2 rounded-full", STATUS_TONE[batch.status])} />
                  <span>
                    {t("intake.batchLabel")} · {shortDate(batch.createdAt)}
                  </span>
                  <Badge variant="outline" className="h-4 px-1 text-[10px] leading-none">
                    {batch.drafts.length || batch.itemCount}
                  </Badge>
                </button>
              ))}
            </div>
          )}

          {activeBatch && activeBatch.status === "processing" && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium">{t("intake.processing")}</p>
                <p className="text-xs text-muted-foreground">{t("intake.processingDesc")}</p>
              </CardContent>
            </Card>
          )}

          {activeBatch && activeBatch.status === "pending" && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{t("intake.processingDesc")}</p>
              </CardContent>
            </Card>
          )}

          {activeBatch && activeBatch.status === "failed" && (
            <Card className="border-red-300 dark:border-red-800">
              <CardContent className="flex items-start gap-3 py-6">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm font-medium text-red-700 dark:text-red-300">
                    {t("intake.failedTitle")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activeBatch.errorMessage || t("intake.genericError")}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeBatch && (activeBatch.status === "completed" || activeBatch.status === "applied") && (
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
                <div className="space-y-1">
                  <CardTitle className="text-base">
                    {t("intake.reviewTitle")} · {activeBatch.drafts.length} {t("intake.items")}
                  </CardTitle>
                  <CardDescription>{t("intake.reviewDesc")}</CardDescription>
                </div>
                {editable && (
                  <Button onClick={onApply} disabled={applyBatch.isPending}>
                    {applyBatch.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <PackagePlus className="mr-2 h-4 w-4" />
                    )}
                    {applyBatch.isPending ? t("intake.applying") : t("intake.apply")}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {activeBatch.status === "applied" && (
                  <p className="text-xs text-muted-foreground">{t("intake.readOnlyApplied")}</p>
                )}
                {activeBatch.drafts.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {t("intake.noDrafts")}
                  </p>
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
                          <TableHead>{t("intake.colTra")}</TableHead>
                          <TableHead>{t("intake.colTax")}</TableHead>
                          <TableHead>{t("intake.colConfidence")}</TableHead>
                          {editable && <TableHead className="w-10" />}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeBatch.drafts.map((draft) => {
                          const current = draftOf(draft);
                          const score = draft.aiConfidenceScore;
                          return (
                            <TableRow key={draft.id} className={rowTone(score)}>
                              <TableCell className="min-w-[140px]">
                                <Input
                                  className="h-8"
                                  value={current.nameEn}
                                  readOnly={!editable}
                                  onChange={(e) => editDraft(draft, "nameEn", e.target.value)}
                                  onBlur={() => saveText(draft, "nameEn")}
                                />
                              </TableCell>
                              <TableCell className="min-w-[140px]">
                                <Input
                                  className="h-8"
                                  value={current.nameSw}
                                  readOnly={!editable}
                                  onChange={(e) => editDraft(draft, "nameSw", e.target.value)}
                                  onBlur={() => saveText(draft, "nameSw")}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  className="h-8 w-20"
                                  value={current.unit}
                                  readOnly={!editable}
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
                                  readOnly={!editable}
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
                                  readOnly={!editable}
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
                                  readOnly={!editable}
                                  onChange={(e) => editDraft(draft, "sellingPrice", e.target.value)}
                                  onBlur={() => saveNumber(draft, "sellingPrice")}
                                />
                              </TableCell>
                              <TableCell className="min-w-[120px]">
                                <Input
                                  className="h-8"
                                  value={current.categoryName}
                                  readOnly={!editable}
                                  onChange={(e) => editDraft(draft, "categoryName", e.target.value)}
                                  onBlur={() => saveText(draft, "categoryName")}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  className="h-8 w-24"
                                  value={current.traItemCode}
                                  readOnly={!editable}
                                  onChange={(e) => editDraft(draft, "traItemCode", e.target.value)}
                                  onBlur={() => saveText(draft, "traItemCode")}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  className="h-8 w-16"
                                  type="number"
                                  min={0}
                                  step="any"
                                  value={current.taxRatePercent}
                                  readOnly={!editable}
                                  onChange={(e) => editDraft(draft, "taxRatePercent", e.target.value)}
                                  onBlur={() => saveNumber(draft, "taxRatePercent")}
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
                              {editable && (
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
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("intake.newBatchTitle")}</DialogTitle>
            <DialogDescription>{t("intake.newBatchDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="intake-images">{t("intake.invoiceImages")}</Label>
              <Input
                id="intake-images"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setCameraOpen(true)}>
                  <Camera className="mr-2 h-4 w-4" />
                  {t("intake.captureInvoice")}
                </Button>
                <p className="text-xs text-muted-foreground">
                  {files.length + capturedImages.length > 0
                    ? `${files.length + capturedImages.length} · ${t("intake.compressedNote")}`
                    : t("intake.compressedNote")}
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="intake-urls">{t("intake.imageUrls")}</Label>
              <Textarea
                id="intake-urls"
                rows={2}
                value={urlText}
                onChange={(e) => setUrlText(e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="intake-qr" className="flex items-center gap-1.5">
                <QrCode className="h-3.5 w-3.5" />
                {t("intake.qrPayloads")}
              </Label>
              <Textarea
                id="intake-qr"
                rows={3}
                value={qrText}
                onChange={(e) => setQrText(e.target.value)}
                placeholder='{"type": "twendeduka.wholesale.v1", …}'
              />
              <Button type="button" variant="outline" size="sm" onClick={() => setQrScanOpen(true)}>
                <ScanLine className="mr-2 h-4 w-4" />
                {t("intake.scanQr")}
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="intake-note">{t("intake.note")}</Label>
              <Input id="intake-note" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={onSubmitNewBatch} disabled={createBatch.isPending || preparing}>
                {createBatch.isPending || preparing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                {preparing ? t("intake.preparing") : t("intake.submit")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
            setCapturedImages((prev) => [...prev, compressed]);
            toast.success(t("intake.photoAdded"));
          } catch (err) {
            console.error("Intake capture compression failed:", err);
            setCapturedImages((prev) => [...prev, dataUrl]);
            toast.error(t("intake.photoFailed"));
          }
        }}
        title={t("intake.captureInvoice")}
      />
      <QrScanner
        isOpen={qrScanOpen}
        onClose={() => setQrScanOpen(false)}
        onResult={(payload) => {
          setQrScanOpen(false);
          const trimmed = payload.trim();
          if (!trimmed) return;
          setQrText((prev) => (prev ? `${prev}\n${trimmed}` : trimmed));
          toast.success(t("intake.qrAdded"));
        }}
        title={t("intake.scanQr")}
      />
    </div>
  );
}
