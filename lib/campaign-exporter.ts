import * as XLSX from "xlsx";
import { toPng } from "html-to-image";
import { CampaignAccountGroup, CampaignReportSettings } from "@/types/campaign-report";

export function formatUsd(val: number): string {
  return `$${val.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatRp(val: number): string {
  return `Rp${val.toLocaleString("id-ID", {
    maximumFractionDigits: 0,
  })}`;
}

export function exportCampaignExcel(
  groups: CampaignAccountGroup[],
  settings: CampaignReportSettings
) {
  if (!groups.length) {
    alert("Belum ada data campaign untuk diekspor.");
    return;
  }

  const rows: any[] = [];

  // Title Banner row
  rows.push({
    ACCOUNT: `${settings.reportTitle} ${settings.reportDate}`,
    "CAMPAIGN NAME": "",
    Budget: "",
    SPENT: "",
    "SPENT + TAX": "",
    RESULT: "",
    "CPH (USD)": "",
    "CPH + TAX (RP)": "",
    REGIS: "",
    NDP: "",
    "CPR REF": "",
    "CPD REF": "",
    STATUS: "",
    "Kode Referensi": "",
  });

  rows.push({}); // Empty row

  for (const group of groups) {
    for (const item of group.items) {
      rows.push({
        ACCOUNT: item.account,
        "CAMPAIGN NAME": item.campaignName,
        Budget: formatUsd(item.budget),
        SPENT: formatUsd(item.spent),
        "SPENT + TAX": formatRp(item.spentTaxRp),
        RESULT: item.results,
        "CPH (USD)": item.cphUsd !== null ? formatUsd(item.cphUsd) : "#DIV/0!",
        "CPH + TAX (RP)": item.cphTaxRp !== null ? formatRp(item.cphTaxRp) : "#DIV/0!",
        REGIS: item.regis,
        NDP: item.ndp,
        "CPR REF": item.cprRefRp !== null ? formatRp(item.cprRefRp) : "#DIV/0!",
        "CPD REF": item.cpdRefRp !== null ? formatRp(item.cpdRefRp) : "#DIV/0!",
        STATUS: item.status,
        "Kode Referensi": item.refCode,
      });
    }
  }

  // Summary Totals
  const totalSpent = groups.reduce((acc, g) => acc + g.totalSpent, 0);
  const totalSpentTax = groups.reduce((acc, g) => acc + g.totalSpentTaxRp, 0);
  const totalResults = groups.reduce((acc, g) => acc + g.totalResults, 0);
  const totalRegis = groups.reduce((acc, g) => acc + g.totalRegis, 0);
  const totalNdp = groups.reduce((acc, g) => acc + g.totalNdp, 0);

  rows.push({});
  rows.push({
    ACCOUNT: "TOTAL KESELURUHAN",
    "CAMPAIGN NAME": `${groups.reduce((acc, g) => acc + g.items.length, 0)} Campaigns`,
    Budget: "",
    SPENT: formatUsd(totalSpent),
    "SPENT + TAX": formatRp(totalSpentTax),
    RESULT: totalResults,
    "CPH (USD)": totalResults > 0 ? formatUsd(totalSpent / totalResults) : "#DIV/0!",
    "CPH + TAX (RP)": totalResults > 0 ? formatRp(Math.round(totalSpentTax / totalResults)) : "#DIV/0!",
    REGIS: totalRegis,
    NDP: totalNdp,
    "CPR REF": totalRegis > 0 ? formatRp(Math.round(totalSpentTax / totalRegis)) : "#DIV/0!",
    "CPD REF": totalNdp > 0 ? formatRp(Math.round(totalSpentTax / totalNdp)) : "#DIV/0!",
    STATUS: "",
    "Kode Referensi": "",
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "CAMPAIGN_REPORT");

  const cleanName = settings.reportTitle.replace(/\s+/g, "_") || "REPORT_CAMPAIGN";
  XLSX.writeFile(workbook, `${cleanName}_${settings.reportDate || "DATE"}.xlsx`);
}

export async function captureCampaignScreenshot(
  element: HTMLElement | null,
  settings: CampaignReportSettings
): Promise<void> {
  if (!element) {
    alert("Report belum tersedia untuk di-screenshot.");
    return;
  }

  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    await new Promise((resolve) => setTimeout(resolve, 350));

    const dataUrl = await toPng(element, {
      cacheBust: true,
      pixelRatio: 3,
      backgroundColor: "#ffffff",
      style: {
        transform: "none",
        transformOrigin: "top left",
      },
      width: element.scrollWidth,
      height: element.scrollHeight,
      canvasWidth: element.scrollWidth * 3,
      canvasHeight: element.scrollHeight * 3,
    });

    const link = document.createElement("a");
    const cleanName = settings.reportTitle.replace(/\s+/g, "-") || "CAMPAIGN-REPORT";
    link.download = `${cleanName}-HD-${settings.reportDate || "DATE"}.png`;
    link.href = dataUrl;
    link.click();
  } catch (err) {
    console.error("Screenshot error:", err);
    alert("Gagal membuat screenshot HD.");
  }
}
