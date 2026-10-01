import { describe, it, expect } from "vitest";
import {
  parseCsvText,
  matrixToImportRows,
  parseProductsFile,
  PRODUCT_COLUMNS,
} from "@/lib/excel/productsWorkbook";

describe("parseCsvText", () => {
  it("splits plain rows and drops empty lines", () => {
    expect(parseCsvText("a,b,c\n\n1,2,3\n")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("keeps commas inside quoted fields and unescapes doubled quotes", () => {
    expect(parseCsvText('"Sukari, 1kg","say ""hi""",5')).toEqual([
      ["Sukari, 1kg", 'say "hi"', "5"],
    ]);
  });

  it("handles CRLF line breaks", () => {
    expect(parseCsvText("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("matrixToImportRows", () => {
  it("maps headers case-insensitively to column keys and drops empty cells", () => {
    const rows = matrixToImportRows([
      ["NAME", "Buying Price", "SELLINGPRICE", "Quantity"],
      ["Sukari", "1,500", "2000", "24"],
      ["Chai", "", "", ""],
    ]);
    expect(rows).toEqual([
      { name: "Sukari", buyingPrice: "1,500", sellingPrice: "2000", quantity: "24" },
      { name: "Chai" },
    ]);
  });

  it("keeps nameless rows so the backend can report them per-row", () => {
    const rows = matrixToImportRows([
      ["Name", "Quantity"],
      ["", "10"],
    ]);
    expect(rows).toEqual([{ quantity: "10" }]);
  });

  it("ignores unknown headers", () => {
    const rows = matrixToImportRows([
      ["Name", "Notes", "quantity"],
      ["Sukari", "hello", "3"],
    ]);
    expect(rows).toEqual([{ name: "Sukari", quantity: "3" }]);
  });

  it("exposes exactly the columns the backend accepts", () => {
    expect(PRODUCT_COLUMNS.map((c) => c.key)).toEqual([
      "name",
      "barcode",
      "sku",
      "category",
      "unit",
      "buyingPrice",
      "sellingPrice",
      "quantity",
    ]);
  });
});

describe("parseProductsFile", () => {
  // jsdom's Blob predates text()/arrayBuffer(); real browsers have both.
  const fileLike = (name: string, type: string, bytes: string | ArrayBuffer) =>
    ({
      name,
      type,
      text: async () => (typeof bytes === "string" ? bytes : new TextDecoder().decode(bytes)),
      arrayBuffer: async () => (typeof bytes === "string" ? new TextEncoder().encode(bytes).buffer : bytes),
    }) as unknown as File;

  it("reads a CSV file end to end", async () => {
    await expect(parseProductsFile(fileLike("stock.csv", "text/csv", "Name,Quantity\nSukari,24\n"))).resolves.toEqual([
      { name: "Sukari", quantity: "24" },
    ]);
  });

  it("reads an .xlsx file built by exceljs itself", async () => {
    const ExcelJS = (await import("exceljs/dist/exceljs.min.js")).default;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Products");
    sheet.addRow(["Name", "Quantity", "Buying Price"]);
    sheet.addRow(["Sukari", 24, 1500]);
    sheet.addRow(["", "9", ""]);
    const buffer = await workbook.xlsx.writeBuffer();
    await expect(parseProductsFile(fileLike("stock.xlsx", "", buffer as ArrayBuffer))).resolves.toEqual([
      { name: "Sukari", quantity: "24", buyingPrice: "1500" },
      { quantity: "9" },
    ]);
  });
});
