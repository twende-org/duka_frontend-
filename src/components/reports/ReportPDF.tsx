import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

// Elite Enterprise Design System Colors
const colors = {
  primaryGold: "#f59e0b",
  charcoal: "#2d2d2d",
  background: "#fffcf2",
  white: "#ffffff",
  border: "#e2e8f0",
  textMuted: "#64748b",
  success: "#10b981",
  danger: "#ef4444"
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.background,
    padding: 30,
    fontFamily: "Helvetica",
    color: colors.charcoal
  },
  header: {
    backgroundColor: colors.charcoal,
    marginLeft: -30,
    marginRight: -30,
    marginTop: -30,
    marginBottom: 0,
    paddingTop: 18,
    paddingBottom: 14,
    paddingLeft: 28,
    paddingRight: 28
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    maxWidth: "55%"
  },
  headerRight: {
    maxWidth: "42%",
    alignItems: "flex-end"
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 5
  },
  shopName: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.white
  },
  shopSub: {
    fontSize: 8,
    color: colors.white,
    opacity: 0.75,
    marginTop: 1
  },
  reportTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.primaryGold,
    textTransform: "uppercase",
    textAlign: "right"
  },
  reportMeta: {
    fontSize: 7.5,
    color: colors.white,
    opacity: 0.8,
    marginTop: 2,
    textAlign: "right"
  },
  headerDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginTop: 12,
    marginBottom: 0
  },
  accentBar: {
    height: 3,
    backgroundColor: colors.primaryGold,
    marginLeft: -30,
    marginRight: -30,
    marginBottom: 10
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    borderLeft: `3px solid ${colors.primaryGold}`,
    paddingLeft: 7,
    marginBottom: 8,
    marginTop: 6
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 8,
    borderRadius: 6,
    border: `1px solid ${colors.border}`
  },
  cardLabel: {
    fontSize: 7,
    textTransform: "uppercase",
    color: colors.textMuted,
    fontWeight: "bold",
    marginBottom: 3
  },
  cardValue: {
    fontSize: 10,
    fontWeight: "bold"
  },
  table: {
    width: "auto",
    marginBottom: 10
  },
  tableRow: {
    flexDirection: "row",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    minHeight: 20,
    alignItems: "center"
  },
  tableHeader: {
    backgroundColor: colors.charcoal,
    color: colors.white
  },
  tableCell: {
    padding: 4,
    fontSize: 7.5
  },
  headerCell: {
    fontWeight: "bold",
    fontSize: 8
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    borderTop: `1px solid ${colors.border}`,
    paddingTop: 10,
    textAlign: "center"
  },
  tagline: {
    fontSize: 8,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1
  },
  verification: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    gap: 20
  },
  verifyCol: {
    flex: 1
  },
  verifyTitle: {
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
    color: colors.textMuted,
    marginBottom: 20
  },
  signatureLine: {
    borderBottom: `1px solid ${colors.charcoal}`,
    height: 10,
    marginBottom: 4
  },
  verifyName: {
    fontSize: 10,
    fontWeight: "bold"
  },
  verifyRole: {
    fontSize: 8,
    textTransform: "uppercase",
    color: colors.textMuted
  },
  stampBox: {
    width: 70,
    height: 70,
    border: `2px dashed ${colors.border}`,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.5,
    transform: "rotate(15deg)"
  },
  stampText: {
    fontSize: 6,
    textAlign: "center",
    fontWeight: "bold",
    color: colors.textMuted
  }
});

interface ReportPDFProps {
  type: "sales" | "products" | "summary" | "pl" | "margin" | "valuation" | "turnover" | "reorder" | "reconciliation" | "receivables" | "leaderboard" | "shift" | "marketing";
  shop: any;
  data: any;
  dateRange: string;
  generatedBy: string;
  isSw?: boolean;
  formatTZS: (val: number) => string;
}

export const ReportPDF: React.FC<ReportPDFProps> = ({ type, shop, data, dateRange, generatedBy, isSw = true, formatTZS }) => {
  const dateStr = new Date().toLocaleDateString();
  const local = (sw: string, en: string) => (isSw ? sw : en);

  // Helper to resolve title
  const getPDFTitle = () => {
    switch (type) {
      case "sales": return local("Ripoti ya Mauzo", "Sales Report");
      case "products": return local("Ripoti ya Bidhaa & Stoo", "Products & Stock Report");
      case "summary": return local("Muhtasari wa Utendaji wa Duka", "Shop Summary Performance");
      case "pl": return local("Hesabu ya Faida na Hasara (P&L)", "Profit & Loss (P&L) Statement");
      case "margin": return local("Uchambuzi wa Margin ya Faida", "Profit Margin Analysis");
      case "valuation": return local("Ripoti ya Thamani ya Stoo", "Stock Valuation Report");
      case "turnover": return local("Mzunguko wa Bidhaa (Turnover)", "Inventory Turnover Report");
      case "reorder": return local("Bidhaa Pungufu & Reorder", "Low Stock & Reorder Report");
      case "reconciliation": return local("Upatanisho wa Malipo (POS vs Actual)", "Payment Reconciliation Report");
      case "receivables": return local("Ripoti ya Madeni (Receivables)", "Aging Accounts Receivable Report");
      case "leaderboard": return local("Msimamo wa Mauzo ya Cashier", "Cashier Sales Leaderboard");
      case "shift": return local("Upatanisho wa Shift na Droo", "Shift Reconciliation Report");
      case "marketing": return local("Utendaji wa Kampeni za Masoko", "Marketing Campaign Performance");
      default: return local("Ripoti ya Biashara", "Business Report");
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            {/* Left: shop branding */}
            <View style={styles.headerLeft}>
              {shop?.imageUrl && <Image src={shop.imageUrl} style={styles.logo} />}
              <View>
                <Text style={styles.shopName}>{shop?.name || "Twende Duka"}</Text>
                {shop?.phone && <Text style={styles.shopSub}>Mob: {shop.phone}</Text>}
              </View>
            </View>
            {/* Right: report type + date */}
            <View style={styles.headerRight}>
              <Text style={styles.reportTitle}>{getPDFTitle()}</Text>
              <Text style={styles.reportMeta}>{local("Tarehe:", "Date:")} {dateStr}</Text>
              <Text style={styles.reportMeta}>{dateRange}</Text>
            </View>
          </View>
          <View style={styles.headerDivider} />
        </View>

        <View style={[styles.accentBar, { marginTop: 16 }]} />

        {/* SUMMARY SECTION */}
        {type === "summary" && (
          <>
            <Text style={styles.sectionTitle}>{local("Muhtasari wa Utendaji", "Performance Summary")}</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <Text style={styles.cardLabel}>{local("Idadi ya Mauzo", "Sales Transactions")}</Text>
                <Text style={styles.cardValue}>{data.totalSalesCount}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.cardLabel}>{local("Jumla ya Mapato", "Total Revenue")}</Text>
                <Text style={[styles.cardValue, { color: colors.primaryGold }]}>{data.totalRevenueFormatted}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.cardLabel}>{local("Jumla ya Faida", "Total Profit")}</Text>
                <Text style={[styles.cardValue, { color: colors.success }]}>{data.totalProfitFormatted}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.cardLabel}>{local("Bidhaa Chache", "Low Stock Products")}</Text>
                <Text style={[styles.cardValue, data.lowStockCount > 0 ? { color: colors.danger } : {}]}>{data.lowStockCount}</Text>
              </View>
            </View>
          </>
        )}

        {type === "pl" && (
          <>
            <Text style={styles.sectionTitle}>{local("Muhtasari wa P&L", "P&L Summary")}</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <Text style={styles.cardLabel}>{local("Mapato ya Mauzo", "Sales Revenue")}</Text>
                <Text style={[styles.cardValue, { color: colors.primaryGold }]}>{data.revenueFormatted || data.revenue}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.cardLabel}>{local("Gharama za Bidhaa (COGS)", "Cost of Sales (COGS)")}</Text>
                <Text style={styles.cardValue}>{data.cogsFormatted || data.cogs}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.cardLabel}>{local("Gharama za Uendeshaji", "Operating Expenses")}</Text>
                <Text style={[styles.cardValue, { color: colors.danger }]}>{data.totalExpensesFormatted || data.totalExpenses}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.cardLabel}>{local("Faida Halisi (Net)", "Net Income")}</Text>
                <Text style={[styles.cardValue, { color: colors.success }]}>{data.netProfitFormatted || data.netProfit}</Text>
              </View>
            </View>
          </>
        )}

        {type === "valuation" && (
          <>
            <Text style={styles.sectionTitle}>{local("Thamani ya Stoko", "Stock Valuation Summary")}</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <Text style={styles.cardLabel}>{local("Jumla ya Bidhaa", "Total Items")}</Text>
                <Text style={styles.cardValue}>{data.totalQty}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.cardLabel}>{local("Mtaji wa Ununuzi (Cost)", "Total Capital at Cost")}</Text>
                <Text style={styles.cardValue}>{data.totalCostFormatted || data.totalCost}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.cardLabel}>{local("Thamani ya Kuuza (Retail)", "Total Retail Value")}</Text>
                <Text style={[styles.cardValue, { color: colors.primaryGold }]}>{data.totalRetailFormatted || data.totalRetail}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.cardLabel}>{local("Faida Tarajiwa", "Projected Profit")}</Text>
                <Text style={[styles.cardValue, { color: colors.success }]}>{data.totalProfitFormatted || data.totalProfit}</Text>
              </View>
            </View>
          </>
        )}


        <View style={styles.table}>
          {/* Header Row */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            {type === "sales" && (
              <>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 3.5 }]}>{local("Bidhaa", "Product")}</Text>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 1, textAlign: "center" }]}>{local("Idadi", "Qty")}</Text>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 2, textAlign: "right" }]}>{local("Jumla", "Total")}</Text>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 2, textAlign: "center" }]}>{local("Malipo", "Payment")}</Text>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 2, textAlign: "right" }]}>{local("Tarehe", "Date")}</Text>
              </>
            )}

            {type === "products" && (
              <>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 3.5 }]}>{local("Jina la Bidhaa", "Product Name")}</Text>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 2 }]}>{local("Aina", "Category")}</Text>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 2.5, textAlign: "right" }]}>{local("Bei ya Kuuza", "Selling Price")}</Text>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 1.5, textAlign: "center" }]}>{local("Stoo", "Stock")}</Text>
              </>
            )}

            {type === "pl" && (
              <>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 6 }]}>{local("Kipengele cha P&L", "P&L Component")}</Text>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 4, textAlign: "right" }]}>{local("Kiasi (TZS)", "Amount (TZS)")}</Text>
              </>
            )}

            {type === "margin" && (
              <>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 3.5 }]}>{local("Bidhaa", "Product")}</Text>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 2 }]}>{local("Kategoria", "Category")}</Text>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 1.8, textAlign: "right" }]}>{local("Bei ya Kununua", "Buying Price")}</Text>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 1.8, textAlign: "right" }]}>{local("Bei ya Kuuza", "Selling Price")}</Text>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 1.2, textAlign: "right" }]}>{local("Faida (%)", "Margin %")}</Text>
              </>
            )}

            {type === "valuation" && (
              <>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 3 }]}>{local("Bidhaa", "Product")}</Text>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 1, textAlign: "center" }]}>{local("Stoki", "Stock")}</Text>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 2, textAlign: "right" }]}>{local("Bei ya Kununua", "Buying Price")}</Text>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 2, textAlign: "right" }]}>{local("Bei ya Kuuza", "Selling Price")}</Text>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 2, textAlign: "right" }]}>{local("Thamani (Cost)", "Total Cost")}</Text>
              </>
            )}

            {type === "turnover" && (
              <>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 4 }]}>{local("Bidhaa", "Product")}</Text>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 2, textAlign: "center" }]}>{local("Stoki Iliyopo", "Current Stock")}</Text>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 2, textAlign: "center" }]}>{local("Uuzaji (Units)", "Units Sold")}</Text>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 2, textAlign: "center" }]}>{local("Hali ya Mzunguko", "Status")}</Text>
              </>
            )}

            {type === "reorder" && (
              <>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 4 }]}>{local("Bidhaa", "Product")}</Text>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 2, textAlign: "center" }]}>{local("Stoki Iliyopo", "Current Stock")}</Text>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 2, textAlign: "center" }]}>{local("Kiwango cha Chini", "Min Stock")}</Text>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 2, textAlign: "center" }]}>{local("Kiasi cha Kuagiza", "Reorder Qty")}</Text>
              </>
            )}

            {type === "reconciliation" && (
              <>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 3 }]}>{local("Njia ya Malipo", "Payment Method")}</Text>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 2.3, textAlign: "right" }]}>{local("Mapato POS (Expected)", "POS Expected")}</Text>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 2.3, textAlign: "right" }]}>{local("Actual Drawer", "Counted Actual")}</Text>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 2.4, textAlign: "right" }]}>{local("Tofauti (Discrepancy)", "Discrepancy")}</Text>
              </>
            )}

            {type === "receivables" && (
              <>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 4 }]}>{local("Mteja", "Customer")}</Text>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 2, textAlign: "right" }]}>{local("Siku 0-30", "0-30 Days")}</Text>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 2, textAlign: "right" }]}>{local("Siku 31-60", "31-60 Days")}</Text>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 2, textAlign: "right" }]}>{local("Jumla ya Deni", "Total Debt")}</Text>
              </>
            )}

            {type === "leaderboard" && (
              <>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 4 }]}>{local("Mhudumu / Cashier", "Cashier/Employee")}</Text>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 3, textAlign: "center" }]}>{local("Miamala", "Transactions")}</Text>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 3, textAlign: "right" }]}>{local("Kiasi cha Mauzo", "Sales Volume")}</Text>
              </>
            )}

            {type === "shift" && (
              <>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 2.5 }]}>{local("Mhudumu", "Cashier")}</Text>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 2.5 }]}>{local("Muda", "Opened")}</Text>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 1.6, textAlign: "right" }]}>{local("Float ya Kwanza", "Float")}</Text>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 1.7, textAlign: "right" }]}>{local("Expected", "Expected")}</Text>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 1.7, textAlign: "right" }]}>{local("Drawer", "Drawer")}</Text>
              </>
            )}

            {type === "marketing" && (
              <>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 3 }]}>{local("Jina la Kampeni", "Campaign Name")}</Text>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 2 }]}>{local("Channel", "Channel")}</Text>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 1.6, textAlign: "right" }]}>{local("Bajeti", "Spend")}</Text>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 1.8, textAlign: "right" }]}>{local("Mauzo", "Revenue")}</Text>
                <Text style={[styles.tableCell, styles.headerCell, { flex: 1.6, textAlign: "right" }]}>{local("ROI (%)", "ROI (%)")}</Text>
              </>
            )}
          </View>

          {/* Rows */}
          {type === "pl" ? (
            // Profit & Loss rows
            <>
              <View style={[styles.tableRow, { backgroundColor: "#ffffff" }]}>
                <Text style={[styles.tableCell, { flex: 6, fontWeight: "bold" }]}>{local("Mapato ya Mauzo (Revenue)", "Gross Sales Revenue")}</Text>
                <Text style={[styles.tableCell, { flex: 4, textAlign: "right", color: colors.success, fontWeight: "bold" }]}>{data.revenueFormatted || data.revenue}</Text>
              </View>
              <View style={[styles.tableRow, { backgroundColor: "#f8fafc" }]}>
                <Text style={[styles.tableCell, { flex: 6 }]}>{local("Gharama za Bidhaa (COGS)", "Cost of Goods Sold (COGS)")}</Text>
                <Text style={[styles.tableCell, { flex: 4, textAlign: "right", color: colors.danger }]}>-{data.cogsFormatted || data.cogs}</Text>
              </View>
              <View style={[styles.tableRow, { backgroundColor: "#ffffff", borderTopWidth: 1, borderTopColor: "#94a3b8" }]}>
                <Text style={[styles.tableCell, { flex: 6, fontWeight: "bold" }]}>{local("Faida Ghafi (Gross Profit)", "Gross Operating Profit")}</Text>
                <Text style={[styles.tableCell, { flex: 4, textAlign: "right", fontWeight: "bold" }]}>{data.grossProfitFormatted || data.grossProfit}</Text>
              </View>
              <View style={[styles.tableRow, { backgroundColor: "#f8fafc" }]}>
                <Text style={[styles.tableCell, { flex: 6 }]}>{local("Gharama za Uendeshaji (Operating Expenses)", "Total Operating Expenses")}</Text>
                <Text style={[styles.tableCell, { flex: 4, textAlign: "right", color: colors.danger }]}>-{data.totalExpensesFormatted || data.totalExpenses}</Text>
              </View>
              <View style={[styles.tableRow, { backgroundColor: "#fffbeb", borderTopWidth: 1.5, borderTopColor: colors.primaryGold }]}>
                <Text style={[styles.tableCell, { flex: 6, fontWeight: "bold", color: colors.charcoal }]}>{local("Faida Halisi baada ya Gharama (Net Profit)", "Net Income / Loss")}</Text>
                <Text style={[styles.tableCell, { flex: 4, textAlign: "right", fontWeight: "bold", fontSize: 10, color: colors.success }]}>{data.netProfitFormatted || data.netProfit}</Text>
              </View>
            </>
          ) : (
            // standard array data rendering
            (Array.isArray(data) ? data : data.items || [])?.map((item: any, i: number) => (
              <View key={i} style={[styles.tableRow, { backgroundColor: i % 2 === 0 ? "#ffffff" : "#f8fafc" }]}>
                {type === "sales" && (
                  <>
                    <Text style={[styles.tableCell, { flex: 3.5 }]}>{item.productName}</Text>
                    <Text style={[styles.tableCell, { flex: 1, textAlign: "center" }]}>{item.quantity}</Text>
                    <Text style={[styles.tableCell, { flex: 2, textAlign: "right", fontWeight: "bold" }]}>{item.totalPriceFormatted}</Text>
                    <Text style={[styles.tableCell, { flex: 2, textAlign: "center" }]}>{item.paymentMethod}</Text>
                    <Text style={[styles.tableCell, { flex: 2, textAlign: "right", color: colors.textMuted }]}>{item.date}</Text>
                  </>
                )}

                {type === "products" && (
                  <>
                    <Text style={[styles.tableCell, { flex: 3.5 }]}>{item.name}</Text>
                    <Text style={[styles.tableCell, { flex: 2 }]}>{item.category}</Text>
                    <Text style={[styles.tableCell, { flex: 2.5, textAlign: "right" }]}>{item.sellingPriceFormatted}</Text>
                    <Text style={[styles.tableCell, { flex: 1.5, textAlign: "center", fontWeight: "bold" }]}>{item.stock}</Text>
                  </>
                )}

                {type === "margin" && (
                  <>
                    <Text style={[styles.tableCell, { flex: 3.5 }]}>{item.name}</Text>
                    <Text style={[styles.tableCell, { flex: 2 }]}>{item.category}</Text>
                    <Text style={[styles.tableCell, { flex: 1.8, textAlign: "right", color: colors.textMuted }]}>{formatTZS(item.bp)}</Text>
                    <Text style={[styles.tableCell, { flex: 1.8, textAlign: "right" }]}>{formatTZS(item.sp)}</Text>
                    <Text style={[styles.tableCell, { flex: 1.2, textAlign: "right", fontWeight: "bold", color: colors.success }]}>{item.marginPct}%</Text>
                  </>
                )}

                {type === "valuation" && (
                  <>
                    <Text style={[styles.tableCell, { flex: 3 }]}>{item.name}</Text>
                    <Text style={[styles.tableCell, { flex: 1, textAlign: "center" }]}>{item.qty}</Text>
                    <Text style={[styles.tableCell, { flex: 2, textAlign: "right", color: colors.textMuted }]}>{formatTZS(item.bp)}</Text>
                    <Text style={[styles.tableCell, { flex: 2, textAlign: "right" }]}>{formatTZS(item.sp)}</Text>
                    <Text style={[styles.tableCell, { flex: 2, textAlign: "right", fontWeight: "bold" }]}>{formatTZS(item.costVal)}</Text>
                  </>
                )}

                {type === "turnover" && (
                  <>
                    <Text style={[styles.tableCell, { flex: 4 }]}>{item.name}</Text>
                    <Text style={[styles.tableCell, { flex: 2, textAlign: "center" }]}>{item.stock}</Text>
                    <Text style={[styles.tableCell, { flex: 2, textAlign: "center", fontWeight: "bold" }]}>{item.unitsSold}</Text>
                    <Text style={[styles.tableCell, { flex: 2, textAlign: "center", color: item.unitsSold > 0 ? colors.success : colors.danger }]}>{item.status}</Text>
                  </>
                )}

                {type === "reorder" && (
                  <>
                    <Text style={[styles.tableCell, { flex: 4 }]}>{item.name}</Text>
                    <Text style={[styles.tableCell, { flex: 2, textAlign: "center", fontWeight: "bold", color: item.stock === 0 ? colors.danger : colors.primaryGold }]}>{item.stock}</Text>
                    <Text style={[styles.tableCell, { flex: 2, textAlign: "center", color: colors.textMuted }]}>{item.minStock}</Text>
                    <Text style={[styles.tableCell, { flex: 2, textAlign: "center", fontWeight: "bold", color: colors.success }]}>{item.reorderQty}</Text>
                  </>
                )}

                {type === "reconciliation" && (
                  <>
                    <Text style={[styles.tableCell, { flex: 3 }]}>{item.method}</Text>
                    <Text style={[styles.tableCell, { flex: 2.3, textAlign: "right" }]}>{formatTZS(item.expected)}</Text>
                    <Text style={[styles.tableCell, { flex: 2.3, textAlign: "right" }]}>{formatTZS(item.actual)}</Text>
                    <Text style={[styles.tableCell, { flex: 2.4, textAlign: "right", fontWeight: "bold", color: item.discrepancy === 0 ? colors.success : colors.danger }]}>{item.discrepancy === 0 ? local("Sawa", "Matched") : formatTZS(item.discrepancy)}</Text>
                  </>
                )}

                {type === "receivables" && (
                  <>
                    <Text style={[styles.tableCell, { flex: 4 }]}>{item.name}</Text>
                    <Text style={[styles.tableCell, { flex: 2, textAlign: "right" }]}>{formatTZS(item.thirty)}</Text>
                    <Text style={[styles.tableCell, { flex: 2, textAlign: "right" }]}>{formatTZS(item.sixty)}</Text>
                    <Text style={[styles.tableCell, { flex: 2, textAlign: "right", fontWeight: "bold", color: colors.danger }]}>{formatTZS(item.total)}</Text>
                  </>
                )}

                {type === "leaderboard" && (
                  <>
                    <Text style={[styles.tableCell, { flex: 4 }]}>{item.name}</Text>
                    <Text style={[styles.tableCell, { flex: 3, textAlign: "center" }]}>{item.count}</Text>
                    <Text style={[styles.tableCell, { flex: 3, textAlign: "right", fontWeight: "bold", color: colors.primaryGold }]}>{formatTZS(item.total)}</Text>
                  </>
                )}

                {type === "shift" && (
                  <>
                    <Text style={[styles.tableCell, { flex: 2.5 }]}>{item.openedByName || item.openedBy}</Text>
                    <Text style={[styles.tableCell, { flex: 2.5 }]}>{item.openedAt}</Text>
                    <Text style={[styles.tableCell, { flex: 1.6, textAlign: "right" }]}>{formatTZS(item.openingCash)}</Text>
                    <Text style={[styles.tableCell, { flex: 1.7, textAlign: "right" }]}>{formatTZS(item.expectedClosingCash)}</Text>
                    <Text style={[styles.tableCell, { flex: 1.7, textAlign: "right", fontWeight: "bold" }]}>{formatTZS(item.actualClosingCash)}</Text>
                  </>
                )}

                {type === "marketing" && (
                  <>
                    <Text style={[styles.tableCell, { flex: 3 }]}>{item.name}</Text>
                    <Text style={[styles.tableCell, { flex: 2 }]}>{item.platform}</Text>
                    <Text style={[styles.tableCell, { flex: 1.6, textAlign: "right" }]}>{formatTZS(item.spend)}</Text>
                    <Text style={[styles.tableCell, { flex: 1.8, textAlign: "right", color: colors.success }]}>{formatTZS(item.revenue)}</Text>
                    <Text style={[styles.tableCell, { flex: 1.6, textAlign: "right", fontWeight: "bold" }]}>+{item.roi}%</Text>
                  </>
                )}
              </View>
            ))
          )}
        </View>


        <View style={styles.footer}>
          <Text style={styles.tagline}>{local("Mfumo wa Kisasa wa Kusimamia Biashara • Powered by Twende Duka", "Modern Business Management System • Powered by Twende Duka")}</Text>
        </View>
      </Page>
    </Document>
  );
};
