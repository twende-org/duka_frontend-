import React, { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useBulkImportProducts } from "@/hooks/useProducts";
import {
  PRODUCT_COLUMNS,
  TEMPLATE_EXAMPLE_ROW,
  downloadProductsTemplate,
  parseProductsFile,
  type ProductColumnKey,
  type ProductImportRow,
} from "@/lib/excel/productsWorkbook";
import type { BulkImportResult, BulkImportSummary } from "@/lib/api/domains/products";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ImportProductsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string | null;
  branchId?: string | null;
}

/** Literal key per column so each value stays a valid TranslationKey for t(). */
const TEMPLATE_HINTS = {
  name: "inventory.import.col.name",
  barcode: "inventory.import.col.barcode",
  sku: "inventory.import.col.sku",
  category: "inventory.import.col.category",
  unit: "inventory.import.col.unit",
  buyingPrice: "inventory.import.col.buyingPrice",
  sellingPrice: "inventory.import.col.sellingPrice",
  quantity: "inventory.import.col.quantity",
} as const;

/**
 * Excel import for the Inventory page: the merchant downloads the template
 * (or an export), edits stock/prices offline, uploads the file, reviews the
 * parsed rows, then applies. Parsing happens in the browser; the backend
 * matches each row to a product by barcode or name and moves stock via the
 * ledger, so one bad row never blocks the rest.
 */
export const ImportProductsDialog: React.FC<ImportProductsDialogProps> = ({ isOpen, onClose, shopId, branchId }) => {
  const { t } = useI18n();
  const importMutation = useBulkImportProducts(shopId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<"pick" | "preview" | "result">("pick");
  const [rows, setRows] = useState<ProductImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [summary, setSummary] = useState<BulkImportSummary | null>(null);
  const [results, setResults] = useState<BulkImportResult[]>([]);

  const reset = () => {
    setStage("pick");
    setRows([]);
    setFileName("");
    setSummary(null);
    setResults([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = (open: boolean) => {
    if (!open) onClose();
  };

  const handleFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !shopId) return;
    setParsing(true);
    try {
      const parsed = await parseProductsFile(file);
      if (parsed.length === 0) {
        toast.error(t("inventory.import.noRows"));
        return;
      }
      setRows(parsed);
      setFileName(file.name);
      setStage("preview");
    } catch (err) {
      console.error("Excel import parse failed:", err);
      toast.error(t("inventory.import.parseFailed"));
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onTemplate = async () => {
    try {
      await downloadProductsTemplate();
    } catch (err) {
      console.error("Template download failed:", err);
      toast.error(t("inventory.export.failed"));
    }
  };

  const onApply = () => {
    if (!shopId || rows.length === 0) return;
    importMutation.mutate(
      { rows, branchId },
      {
        onSuccess: ({ summary: nextSummary, results: nextResults }) => {
          setSummary(nextSummary);
          setResults(nextResults);
          setStage("result");
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const missingNameCount = rows.filter((row) => !row.name).length;
  const errorRows = results.filter((r) => r.status === "error");

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            {t("inventory.import.title")}
          </DialogTitle>
          <DialogDescription>{t("inventory.import.desc")}</DialogDescription>
        </DialogHeader>

        {stage === "pick" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={onTemplate}
                className="flex-1 rounded-lg"
              >
                <Download className="h-4 w-4 mr-2" />
                {t("inventory.import.template")}
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={parsing}
                className="flex-1 rounded-lg"
              >
                {parsing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                {parsing ? t("inventory.import.parsing") : t("inventory.import.chooseFile")}
              </Button>
            </div>
            <div className="rounded-lg border overflow-hidden">
              <div className="flex items-center gap-2 border-b bg-muted/50 px-3 py-2">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-medium">{t("inventory.import.previewTitle")}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-xs">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      {PRODUCT_COLUMNS.map((col) => (
                        <th key={col.key} className="px-2.5 py-1.5 text-left font-semibold whitespace-nowrap">
                          {col.header}
                          <span className="block text-[10px] font-normal text-muted-foreground whitespace-nowrap">
                            {t(TEMPLATE_HINTS[col.key])}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {PRODUCT_COLUMNS.map((col) => (
                        <td key={col.key} className="px-2.5 py-1.5 whitespace-nowrap">
                          {TEMPLATE_EXAMPLE_ROW[col.key] ?? ""}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="border-t px-3 py-2 text-[11px] text-muted-foreground">
                {t("inventory.import.previewNote")}
              </div>
            </div>
            <p className="text-xs text-muted-foreground flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
              {t("inventory.import.quantityNote")}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              className="hidden"
              onChange={(e) => handleFile(e.target.files)}
            />
          </div>
        )}

        {stage === "preview" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm">
                <span className="font-medium">{fileName}</span>
                <span className="text-muted-foreground">
                  {" · "}
                  {rows.length} {t("inventory.import.rowsReady")}
                </span>
              </div>
              {missingNameCount > 0 && (
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {t("inventory.import.missingName").replace("{n}", String(missingNameCount))}
                </Badge>
              )}
            </div>
            <div className="rounded-lg border overflow-hidden">
              <div className="max-h-[38vh] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>{t("inventory.product")}</TableHead>
                      <TableHead>Barcode</TableHead>
                      <TableHead>{t("inventory.category")}</TableHead>
                      <TableHead>{t("intake.colBuy")}</TableHead>
                      <TableHead>{t("intake.colSell")}</TableHead>
                      <TableHead>{t("inventory.stock")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 100).map((row, index) => (
                      <TableRow
                        key={`import-row-${index}`}
                        className={cn(!row.name && "bg-amber-50/70 hover:bg-amber-50 dark:bg-amber-950/30 dark:hover:bg-amber-950/50")}
                      >
                        <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="font-medium">
                          {row.name || <span className="text-amber-700 dark:text-amber-300">{t("inventory.import.missingNameOne")}</span>}
                        </TableCell>
                        <TableCell>{row.barcode || "—"}</TableCell>
                        <TableCell>{row.category || "—"}</TableCell>
                        <TableCell>{row.buyingPrice || "—"}</TableCell>
                        <TableCell>{row.sellingPrice || "—"}</TableCell>
                        <TableCell>{row.quantity || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {rows.length > 100 && (
                <div className="border-t px-3 py-2 text-xs text-muted-foreground">
                  {t("inventory.import.moreRows").replace("{n}", String(rows.length - 100))}
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <Button variant="outline" onClick={reset} className="rounded-lg">
                {t("inventory.import.chooseOther")}
              </Button>
              <Button onClick={onApply} disabled={importMutation.isPending} className="rounded-lg">
                {importMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                {t("inventory.import.apply")}
              </Button>
            </div>
          </div>
        )}

        {stage === "result" && summary && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-lg font-bold">{summary.created}</span>
                </div>
                <p className="text-xs text-muted-foreground">{t("inventory.import.created")}</p>
              </div>
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span className="text-lg font-bold">{summary.updated}</span>
                </div>
                <p className="text-xs text-muted-foreground">{t("inventory.import.updated")}</p>
              </div>
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-1.5 text-primary">
                  <Upload className="h-4 w-4" />
                  <span className="text-lg font-bold">{summary.stockChanges}</span>
                </div>
                <p className="text-xs text-muted-foreground">{t("inventory.import.stockChanges")}</p>
              </div>
              <div className="rounded-lg border p-3">
                <div className={cn("flex items-center gap-1.5", summary.errors > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground")}>
                  <XCircle className="h-4 w-4" />
                  <span className="text-lg font-bold">{summary.errors}</span>
                </div>
                <p className="text-xs text-muted-foreground">{t("inventory.import.errors")}</p>
              </div>
            </div>

            {errorRows.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/30 p-3 space-y-1.5">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">{t("inventory.import.errorRows")}</p>
                <ul className="space-y-1 max-h-32 overflow-y-auto">
                  {errorRows.map((row) => (
                    <li key={`err-${row.row}`} className="text-xs text-red-700 dark:text-red-300">
                      <span className="font-medium">#{row.row}</span> {row.name || "—"}: {row.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={onClose} className="rounded-lg">
                {t("inventory.import.done")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
