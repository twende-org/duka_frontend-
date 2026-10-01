/**
 * The exceljs main entry imports node built-ins, which breaks Vite browser
 * builds; the dist UMD bundle is the browser-safe surface this app uses.
 * The bundle ships no types, so we re-expose them from the main package.
 */
declare module "exceljs/dist/exceljs.min.js" {
  const ExcelJS: {
    Workbook: new () => import("exceljs").Workbook;
  };
  export default ExcelJS;
}
