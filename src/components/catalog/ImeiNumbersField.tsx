import { useMemo, useState } from "react";
import { ClipboardPaste, Hash, ScanLine, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { parseImeiInput } from "@/lib/api/domains/catalog";
import { BarcodeScanner } from "@/components/common/BarcodeScanner";
import { useI18n } from "@/lib/i18n";

const MAX_IMEI_LENGTH = 100;

export interface ImeiIssues {
  inList: string[];
  onShelf: string[];
  tooLong: string[];
}

/** Same rules the backend applies, computed live so nothing waits for a 400. */
export function imeiIssues(value: string[], knownImeis?: string[]): ImeiIssues {
  const issues: ImeiIssues = { inList: [], onShelf: [], tooLong: [] };
  if (!knownImeis) return issues;
  const known = new Set(knownImeis);
  const seen = new Set<string>();
  for (const imei of value) {
    if (seen.has(imei)) issues.inList.push(imei);
    seen.add(imei);
    if (known.has(imei)) issues.onShelf.push(imei);
    if (imei.length > MAX_IMEI_LENGTH) issues.tooLong.push(imei);
  }
  return issues;
}

interface ImeiNumbersFieldProps {
  value: string[];
  onChange: (next: string[]) => void;
  /** Units the caller still needs; renders the "n/m" counter when set. */
  required?: number;
  /** IMEIs the shop already holds — flagged red before the backend rejects them. */
  knownImeis?: string[];
  disabled?: boolean;
  scanTitle?: string;
  placeholder?: string;
  className?: string;
}

/**
 * One IMEI/serial capture control shared by tap-to-add, the serials manager and
 * POS checkout. The camera reads QR labels and the 1D barcodes on phone boxes
 * (BarcodeDetector, ZXing fallback); a handheld scanner gun "types" into the
 * input and Enter commits it, which is how most counters actually scan.
 */
export default function ImeiNumbersField({
  value,
  onChange,
  required,
  knownImeis,
  disabled,
  scanTitle,
  placeholder,
  className,
}: ImeiNumbersFieldProps) {
  const { t } = useI18n();
  const [input, setInput] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteValue, setPasteValue] = useState("");
  const [scanning, setScanning] = useState(false);
  // Bumping the key remounts QrScanner with a fresh camera, so a run of ten
  // boxes scans continuously instead of one scan per dialog open.
  const [scanNonce, setScanNonce] = useState(0);

  const issues = useMemo(() => imeiIssues(value, knownImeis), [value, knownImeis]);
  const complete = required === undefined || value.length >= required;

  const addImeis = (tokens: string[]) => {
    const merged = [...value];
    for (const token of tokens) {
      const imei = token.trim().slice(0, MAX_IMEI_LENGTH);
      if (imei && !merged.includes(imei)) merged.push(imei);
    }
    onChange(merged);
  };

  const commitInput = () => {
    if (!input.trim() || disabled) return;
    addImeis([input]);
    setInput("");
  };

  const handleScanResult = (payload: string) => {
    const code = payload.trim();
    if (code) addImeis([code]);
    setScanNonce((n) => n + 1);
  };

  const removeImei = (imei: string) => onChange(value.filter((v) => v !== imei));

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          {t("sales.imeiLabel")}
          {required !== undefined && (
            <span
              className={cn(
                "ml-2 rounded-full px-2 py-0.5 font-bold tabular-nums",
                complete ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"
              )}
            >
              {value.length}/{required}
            </span>
          )}
        </span>
        <div className="flex items-center gap-1.5">
          {pasteOpen ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-lg px-2 text-xs"
              onClick={() => setPasteOpen(false)}
            >
              <X className="h-3.5 w-3.5 mr-1" />{t("common.cancel")}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-lg px-2 text-xs"
              disabled={disabled}
              onClick={() => setPasteOpen(true)}
            >
              <ClipboardPaste className="h-3.5 w-3.5 mr-1" />{t("serials.paste")}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-lg px-2 text-xs border-primary/30 text-primary hover:bg-primary/10"
            disabled={disabled}
            onClick={() => setScanning(true)}
          >
            <ScanLine className="h-3.5 w-3.5 mr-1" />{t("serials.scan")}
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitInput();
            }
          }}
          onBlur={commitInput}
          disabled={disabled}
          inputMode="numeric"
          placeholder={placeholder ?? t("serials.placeholder")}
          className="h-10 rounded-xl font-mono text-sm"
        />
        <Button
          type="button"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-xl"
          disabled={disabled || !input.trim()}
          onClick={commitInput}
          aria-label={t("serials.add")}
        >
          <Hash className="h-4 w-4" />
        </Button>
      </div>

      {pasteOpen && (
        <div className="space-y-1.5 rounded-xl border border-border/60 bg-muted/20 p-3">
          <Textarea
            value={pasteValue}
            onChange={(e) => setPasteValue(e.target.value)}
            disabled={disabled}
            rows={3}
            placeholder={t("serials.pasteHint")}
            className="rounded-lg font-mono text-xs bg-background"
          />
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              className="h-8 rounded-lg px-3 text-xs"
              disabled={disabled || !parseImeiInput(pasteValue).length}
              onClick={() => {
                addImeis(parseImeiInput(pasteValue));
                setPasteValue("");
                setPasteOpen(false);
              }}
            >
              {t("serials.add")}
            </Button>
          </div>
        </div>
      )}

      {value.length > 0 && (
        <div className="space-y-1.5">
          {value.map((imei) => {
            const conflict = issues.onShelf.includes(imei);
            return (
              <div
                key={imei}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-2.5 py-1.5",
                  conflict
                    ? "border-destructive/40 bg-destructive/5"
                    : "border-border/60 bg-background"
                )}
              >
                <Hash className={cn("h-3.5 w-3.5 shrink-0", conflict ? "text-destructive" : "text-muted-foreground")} />
                <span className="min-w-0 flex-1 truncate font-mono text-xs font-semibold">{imei}</span>
                <button
                  type="button"
                  onClick={() => removeImei(imei)}
                  disabled={disabled}
                  aria-label={`${t("catalog.remove")} ${imei}`}
                  className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {(issues.onShelf.length > 0 || issues.tooLong.length > 0) && (
        <p className="flex items-start gap-1.5 text-[11px] font-semibold text-destructive">
          <TriangleAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            {issues.tooLong.length > 0
              ? t("serials.tooLong")
              : `${issues.onShelf.join(", ")} — ${t("serials.alreadyOnShelf")}`}
          </span>
        </p>
      )}

      <p className="text-[10px] font-medium text-muted-foreground">{t("serials.addHint")}</p>

      {scanning && (
        <BarcodeScanner
          key={scanNonce}
          isOpen
          onClose={() => setScanning(false)}
          onResult={handleScanResult}
          title={scanTitle ?? t("serials.scanTitle")}
        />
      )}
    </div>
  );
}
