/**
 * The Excel round-trip for product stock: export the catalogue to a
 * spreadsheet the merchant can edit offline, then read the edited file back
 * into plain rows for POST /api/v1/products/bulk_import/.
 *
 * exceljs is loaded lazily through its dist UMD bundle (the package main
 * pulls node built-ins that Vite cannot serve to browsers).
 */
import { format } from "date-fns";

export const PRODUCT_COLUMNS = [
  { key: "name", header: "Name" },
  { key: "barcode", header: "Barcode" },
  { key: "sku", header: "SKU" },
  { key: "category", header: "Category" },
  { key: "unit", header: "Unit" },
  { key: "buyingPrice", header: "Buying Price" },
  { key: "sellingPrice", header: "Selling Price" },
  { key: "quantity", header: "Quantity" },
] as const;

export type ProductColumnKey = (typeof PRODUCT_COLUMNS)[number]["key"];

const HEADERS = PRODUCT_COLUMNS.map((c) => c.header);

export type ProductImportRow = Partial<Record<ProductColumnKey, string>>;

export interface ProductExportRow {
  name: string;
  barcode?: string | null;
  sku?: string | null;
  category?: string | null;
  unit?: string | null;
  buyingPrice?: number | null;
  sellingPrice?: number | null;
  quantity?: number | null;
}

/** The example row shown in the import dialog's template preview and written into the download. */
export const TEMPLATE_EXAMPLE_ROW: ProductExportRow = {
  name: "Sukari",
  barcode: "8901058000012",
  sku: "SK-001",
  category: "Chakula",
  unit: "pcs",
  buyingPrice: 1500,
  sellingPrice: 2000,
  quantity: 24,
};

type CellValue = string | number | boolean | Date | null | undefined | { text?: string; result?: unknown };

function cellToString(value: CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (typeof value.text === "string") return value.text;
    if (value.result !== undefined && value.result !== null) return cellToString(value.result as CellValue);
    return "";
  }
  return String(value).trim();
}

function headerToKey(header: string): ProductColumnKey | null {
  const normalized = header.trim().toLowerCase().replace(/[\s_-]/g, "");
  const found = PRODUCT_COLUMNS.find((c) => c.header.toLowerCase().replace(/\s/g, "") === normalized || c.key.toLowerCase() === normalized);
  return found ? found.key : null;
}

/** RFC-4180-ish CSV: quoted fields, escaped quotes, CRLF or LF line breaks. */
export function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/** Matrix (row 1 = headers) to keyed rows; rows without a name are kept so the backend can report them. */
export function matrixToImportRows(matrix: string[][]): ProductImportRow[] {
  if (matrix.length === 0) return [];
  const keys = matrix[0].map((cell) => headerToKey(cell));
  return matrix.slice(1).map((cells) => {
    const row: ProductImportRow = {};
    keys.forEach((key, index) => {
      if (!key) return;
      const value = (cells[index] ?? "").trim();
      if (value !== "") row[key] = value;
    });
    return row;
  });
}

/** Parses an uploaded .xlsx or .csv file into rows the bulk-import API accepts. */
export async function parseProductsFile(file: File): Promise<ProductImportRow[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || file.type === "text/csv") {
    return matrixToImportRows(parseCsvText(await file.text()));
  }
  const ExcelJS = (await import("exceljs/dist/exceljs.min.js")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  const matrix: string[][] = [];
  sheet.eachRow((row) => {
    matrix.push(
      Array.from({ length: Math.max(row.cellCount, HEADERS.length) }, (_, i) =>
        cellToString(row.getCell(i + 1).value as CellValue)
      )
    );
  });
  return matrixToImportRows(matrix);
}

async function buildWorkbook(rows: ProductExportRow[]): Promise<ArrayBuffer> {
  const ExcelJS = (await import("exceljs/dist/exceljs.min.js")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Products");
  sheet.addRow(HEADERS);
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  for (const row of rows) {
    sheet.addRow([
      row.name || "",
      row.barcode || "",
      row.sku || "",
      row.category || "",
      row.unit || "",
      row.buyingPrice ?? "",
      row.sellingPrice ?? "",
      row.quantity ?? "",
    ]);
  }
  sheet.columns.forEach((column) => {
    column.width = 18;
  });
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as unknown as ArrayBuffer;
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function downloadProductsWorkbook(rows: ProductExportRow[]): Promise<void> {
  const data = await buildWorkbook(rows);
  saveBlob(new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `products-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
}

/** Blank import sheet: headers plus one filled example the merchant can overwrite. */
export async function downloadProductsTemplate(): Promise<void> {
  await downloadProductsWorkbook([
    { name: "Sukari", barcode: "8901058000012", sku: "SK-001", category: "Chakula", unit: "pcs", buyingPrice: 1500, sellingPrice: 2000, quantity: 24 },
  ]);
}
