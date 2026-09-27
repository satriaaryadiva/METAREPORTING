import * as XLSX from "xlsx";
import { toPng } from "html-to-image";
import { Card, CustomRule, GroupedRow, Mapping } from "@/types/report";
import { getGroupDisplayName, getGroupSubtitle } from "./utils";

interface ExportExcelParams {
  rows: GroupedRow[];
  orderedCards: Card[];
  mapping: Mapping[];
  customRules: CustomRule[];
  fee: number;
  rate: number;
  period?: string;
  sortBySpent?: boolean;
  totalSpending: number;
  totalFee: number;
  totalWithFee: number;
  totalRP: number;
}

export function exportExcelReport({
  rows,
  orderedCards,
  mapping,
  customRules,
  fee,
  rate,
  period,
  sortBySpent = true,
  totalSpending,
  totalFee,
  totalWithFee,
  totalRP,
}: ExportExcelParams): void {
  if (!rows.length) {
    alert("Upload RAW terlebih dahulu.");
    return;
  }

  const output: Record<string, unknown>[] = [];

  if (period) {
    output.push({ GROUP: "PERIODE", NAME: period });
    output.push({});
  }

  orderedCards.forEach((card) => {
    if (card.kind === "single") {
      const group = card.code;
      let items = rows.filter(
        (row) => row.group === group && row.spent !== 0
      );
      if (sortBySpent) {
        items = [...items].sort((a, b) => b.spent - a.spent);
      }
      const total = items.reduce((sum, row) => sum + row.spent, 0);
      const feeValue = total * (fee / 100);
      const withFee = total + feeValue;
      const totalRp = withFee * rate;

      output.push({
        GROUP: getGroupSubtitle(group, customRules),
        NAME: getGroupDisplayName(group, mapping, customRules),
      });
      items.forEach((item) => {
        output.push({
          GROUP: getGroupSubtitle(group, customRules),
          "ACCOUNT NAME": item.account,
          "TOTAL SPENT": item.spent,
        });
      });
      output.push({
        GROUP: getGroupSubtitle(group, customRules),
        "TOTAL SPENDING": total,
        FEE: feeValue,
        "TOTAL + FEE": withFee,
        "TOTAL SPENDING RP": totalRp,
      });
      output.push({});
    } else {
      const { merge } = card;
      let items = merge.codes.flatMap((code) =>
        rows.filter((row) => row.group === code && row.spent !== 0)
      );
      if (sortBySpent) {
        items = [...items].sort((a, b) => b.spent - a.spent);
      }
      const total = items.reduce((sum, row) => sum + row.spent, 0);
      const feeValue = total * (fee / 100);
      const withFee = total + feeValue;
      const totalRp = withFee * rate;

      output.push({ GROUP: "MERGE", NAME: merge.name });
      items.forEach((item) => {
        output.push({
          GROUP: "MERGE",
          "ACCOUNT NAME": item.account,
          "AMOUNT SPENT": item.spent,
        });
      });
      output.push({
        GROUP: "MERGE",
        "TOTAL SPENDING": total,
        FEE: feeValue,
        "TOTAL + FEE": withFee,
        "TOTAL SPENDING RP": totalRp,
      });
      output.push({});
    }
  });

  output.push({
    "GRAND TOTAL": totalSpending,
    "GRAND FEE": totalFee,
    "GRAND TOTAL + FEE": totalWithFee,
    "GRAND TOTAL RP": totalRP,
  });

  const worksheet = XLSX.utils.json_to_sheet(output);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "REPORT");
  XLSX.writeFile(workbook, "META_ADS_REPORT.xlsx");
}

export async function captureHDReportScreenshot(
  element: HTMLElement | null,
  setIsScreenshotting: (status: boolean) => void
): Promise<void> {
  if (!element) {
    alert("Elemen laporan belum tersedia.");
    return;
  }

  try {
    setIsScreenshotting(true);

    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    // Short delay to ensure any render/styling settles
    await new Promise((resolve) => setTimeout(resolve, 300));

    let dataUrl = "";

    try {
      // Primary: High-Resolution Capture (pixelRatio 2.5)
      dataUrl = await toPng(element, {
        cacheBust: true,
        pixelRatio: 2.5,
        backgroundColor: "#f4f7fb",
        filter: (node) => {
          // Exclude any temporary tooltip/debug element if needed
          return true;
        },
      });
    } catch (err1) {
      console.warn("Primary screenshot failed, attempting fallback...", err1);
      // Secondary fallback without external font embeds
      dataUrl = await toPng(element, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#f4f7fb",
        fontEmbedCSS: "",
      });
    }

    if (!dataUrl || dataUrl === "data:,") {
      throw new Error("Hasil render gambar kosong.");
    }

    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);

    link.download = `META-ADS-REPORT-HD-${date}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Screenshot error:", error);
    alert(
      "Gagal membuat screenshot: " +
        (error instanceof Error ? error.message : "Terjadi kendala saat merender gambar.")
    );
  } finally {
    setIsScreenshotting(false);
  }
}
