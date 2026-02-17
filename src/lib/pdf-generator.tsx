import { formatCurrency, formatDate } from "./formatters";

// 見積もり結果型（公開API）
interface EstimateResult {
  reference_number: string;
  customer_name: string;
  customer_phone: string | null;
  customer_company: string | null;
  total_monthly: number;
  total_yearly: number;
  created_at: string;
  items: {
    product_name: string;
    tier_name: string | null;
    quantity: number;
    final_price: number;
  }[];
}

// ブランド情報（SystemSettingsから渡される）
interface PdfBranding {
  name: string;
  primary_color: string;
}

// 日本語フォント登録済みフラグ
let fontRegistered = false;

// PDF生成（@react-pdf/rendererを遅延読み込み）
export async function generateEstimatePdf(
  estimate: EstimateResult,
  branding: PdfBranding
): Promise<void> {
  const ReactPDF = await import("@react-pdf/renderer");
  const { Document, Page, Text, View, StyleSheet, Font, pdf } = ReactPDF;

  // 日本語フォント登録（初回のみ）
  if (!fontRegistered) {
    Font.register({
      family: "NotoSansJP",
      fonts: [
        { src: "/fonts/NotoSansJP-Regular.ttf", fontWeight: 400 },
        { src: "/fonts/NotoSansJP-Bold.ttf", fontWeight: 700 },
      ],
    });
    fontRegistered = true;
  }

  const styles = StyleSheet.create({
    page: { padding: 40, fontFamily: "NotoSansJP", fontSize: 10 },
    header: { marginBottom: 30 },
    title: { fontSize: 20, fontWeight: "bold", marginBottom: 4 },
    subtitle: { fontSize: 10, color: "#666" },
    infoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
    infoBlock: { width: "45%" },
    infoLabel: { fontSize: 8, color: "#999", marginBottom: 2, textTransform: "uppercase" },
    infoValue: { fontSize: 11 },
    table: { marginTop: 10 },
    tableHeader: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: "#ddd",
      paddingBottom: 6,
      marginBottom: 4,
    },
    tableRow: {
      flexDirection: "row",
      paddingVertical: 4,
      borderBottomWidth: 0.5,
      borderBottomColor: "#eee",
    },
    colService: { width: "35%" },
    colPlan: { width: "25%" },
    colQty: { width: "15%", textAlign: "right" },
    colPrice: { width: "25%", textAlign: "right" },
    headerText: { fontSize: 8, color: "#999", textTransform: "uppercase" },
    totalRow: {
      flexDirection: "row",
      marginTop: 10,
      paddingTop: 8,
      borderTopWidth: 2,
      borderTopColor: "#333",
    },
    totalLabel: { width: "75%", textAlign: "right", fontWeight: "bold", fontSize: 12 },
    totalValue: { width: "25%", textAlign: "right", fontWeight: "bold", fontSize: 14, color: branding.primary_color },
    yearlyRow: {
      flexDirection: "row",
      marginTop: 4,
    },
    yearlyLabel: { width: "75%", textAlign: "right", color: "#666" },
    yearlyValue: { width: "25%", textAlign: "right", color: "#666" },
    footer: { position: "absolute", bottom: 30, left: 40, right: 40, textAlign: "center", fontSize: 8, color: "#999" },
  });

  const MyDocument = () => (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{branding.name}</Text>
          <Text style={styles.subtitle}>Cloudflare サービス見積もり</Text>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>お客様</Text>
            <Text style={styles.infoValue}>{estimate.customer_name}</Text>
            {estimate.customer_company && (
              <Text style={styles.infoValue}>{estimate.customer_company}</Text>
            )}
            {estimate.customer_phone && (
              <Text style={styles.infoValue}>TEL: {estimate.customer_phone}</Text>
            )}
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>参照番号</Text>
            <Text style={styles.infoValue}>{estimate.reference_number}</Text>
            <Text style={styles.infoLabel}>見積もり日</Text>
            <Text style={styles.infoValue}>{formatDate(estimate.created_at)}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, styles.colService]}>サービス</Text>
            <Text style={[styles.headerText, styles.colPlan]}>プラン</Text>
            <Text style={[styles.headerText, styles.colQty]}>数量</Text>
            <Text style={[styles.headerText, styles.colPrice]}>月額</Text>
          </View>

          {estimate.items.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.colService}>{item.product_name}</Text>
              <Text style={styles.colPlan}>{item.tier_name ?? "-"}</Text>
              <Text style={styles.colQty}>{String(item.quantity)}</Text>
              <Text style={styles.colPrice}>{formatCurrency(item.final_price)}</Text>
            </View>
          ))}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>月額合計</Text>
            <Text style={styles.totalValue}>{formatCurrency(estimate.total_monthly)}</Text>
          </View>
          <View style={styles.yearlyRow}>
            <Text style={styles.yearlyLabel}>年額合計</Text>
            <Text style={styles.yearlyValue}>{formatCurrency(estimate.total_yearly)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Powered by CostNavigator | Generated on {formatDate(new Date().toISOString())}
        </Text>
      </Page>
    </Document>
  );

  // PDFをBlobに変換してダウンロード
  const blob = await pdf(<MyDocument />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `estimate-${estimate.reference_number}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
