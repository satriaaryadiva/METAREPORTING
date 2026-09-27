import * as XLSX from "xlsx";
import {
  CampaignAccountGroup,
  CampaignRawRow,
  CampaignReportSettings,
  CampaignStatus,
  CrmRawRow,
  MergedCampaignRow,
} from "@/types/campaign-report";

/**
 * Parses numeric amounts safely, removing currency symbols, commas, footnote brackets like [2], dashes, etc.
 */
export function parseAmount(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  let valueString = String(value ?? "")
    .replace(/\[.*?\]/g, "") // remove footnotes like [2]
    .replace(/\$/g, "")
    .replace(/USD/gi, "")
    .replace(/RP/gi, "")
    .replace(/,/g, "")
    .replace(/—/g, "0")
    .replace(/^-+$/, "0")
    .trim();

  const number = Number(valueString);
  return Number.isFinite(number) ? number : 0;
}

/**
 * Enhanced flexible column finder that strips special characters, arrows (↓, ↑), punctuation, etc.
 */
export function findColumnFlexible(headers: string[], candidates: string[]): number {
  const cleanHeaders = headers.map((h) =>
    String(h ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );

  // 1. Exact match
  for (const candidate of candidates) {
    const cleanCand = candidate
      .toLowerCase()
      .replace(/[^a-z0-9]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const idx = cleanHeaders.findIndex((h) => h === cleanCand);
    if (idx !== -1) return idx;
  }

  // 2. Contains match
  for (const candidate of candidates) {
    const cleanCand = candidate
      .toLowerCase()
      .replace(/[^a-z0-9]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (cleanCand.length < 3) continue;
    const idx = cleanHeaders.findIndex(
      (h) => h.includes(cleanCand) || (cleanCand.length > 4 && cleanCand.includes(h))
    );
    if (idx !== -1) return idx;
  }

  return -1;
}

/**
 * Extracts reference code from a campaign name.
 * Examples:
 * - "2/BNRDAFTAR-HG-/R1" -> "/R1" (clean: "R1")
 * - "2/COBATES-HG/R8" -> "R8" (clean: "R8")
 * - "2/COBATES-HG/R7" -> "/R7" (clean: "R7")
 * - "2/kfc-joy/R10" -> "/R10" (clean: "R10")
 * - "2/kfc-joy/R18" -> "/R18" (clean: "R18")
 * - "3/saldonol-hg/R106" -> "R106" (clean: "R106")
 * - "3/SALDONOL-HUGO/R102" -> "R102" (clean: "R102")
 */
export function extractRefCode(campaignName: string): { display: string; clean: string } {
  if (!campaignName) return { display: "", clean: "" };

  const trimmed = campaignName.trim();

  // 1. Check if it ends with /R123 or /HG123 or /RY123 or /\w+
  const slashMatch = trimmed.match(/\/([A-Za-z0-9_-]+)$/);
  if (slashMatch) {
    const code = slashMatch[1].trim();
    const clean = cleanRefKey(code);
    const display =
      code.toUpperCase().startsWith("R") ||
        code.toUpperCase().startsWith("HG") ||
        code.toUpperCase().startsWith("RY") ||
        code.toUpperCase().startsWith("CP")
        ? `/${clean}`
        : clean;
    return {
      display,
      clean,
    };
  }

  // 2. Check for patterns like R10, HG173, RY1666, CP160, KAY1180, AR001 anywhere in the name
  const codeMatch = trimmed.match(/\b([A-Za-z]{1,4}\d{1,5})\b/i);
  if (codeMatch) {
    const code = codeMatch[1].toUpperCase();
    return {
      display: `/${code}`,
      clean: code,
    };
  }

  // 3. Fallback: last segment after any separator (-, _, /)
  const segments = trimmed.split(/[/_-]/).filter(Boolean);
  if (segments.length > 0) {
    const last = segments[segments.length - 1];
    const clean = cleanRefKey(last);
    return {
      display: clean,
      clean,
    };
  }

  const clean = cleanRefKey(trimmed);
  return { display: clean, clean };
}

export function cleanRefKey(code: string): string {
  return String(code ?? "")
    .trim()
    .toUpperCase()
    .replace(/^[\s/\\_#-]+/, "")
    .replace(/[\s/\\_#-]+$/, "")
    .replace(/\s+/g, "");
}

/**
 * Parses File 1: Meta Ads Campaign RAW (Excel/CSV)
 */
export async function parseMetaCampaignFile(file: File): Promise<CampaignRawRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  // Find sheet with data
  let targetSheet = workbook.Sheets[workbook.SheetNames[0]];
  for (const name of workbook.SheetNames) {
    const s = workbook.Sheets[name];
    if (s && Object.keys(s).length > 5) {
      targetSheet = s;
      break;
    }
  }

  const data = XLSX.utils.sheet_to_json<unknown[]>(targetSheet, {
    header: 1,
    defval: "",
  });

  if (!data.length) {
    throw new Error("File Meta Ads RAW kosong.");
  }

  // Scan up to the first 10 rows to find header row
  let headerRowIndex = 0;
  let accountIndex = -1;
  let accountIdIndex = -1;
  let campaignIndex = -1;
  let spentIndex = -1;
  let resultIndex = -1;
  let deliveryIndex = -1;

  for (let r = 0; r < Math.min(10, data.length); r++) {
    const rawHeaders = (data[r] as unknown[]).map((h) => String(h ?? ""));

    const cIdx = findColumnFlexible(rawHeaders, [
      "campaign name",
      "campaign_name",
      "nama kampanye",
      "nama campaign",
      "campaigns",
      "campaign",
    ]);

    const sIdx = findColumnFlexible(rawHeaders, [
      "amount spent usd",
      "amount spent",
      "amount_spent",
      "spend",
      "spent",
      "jumlah yang dibelanjakan",
      "biaya",
    ]);

    if (cIdx !== -1 || sIdx !== -1) {
      headerRowIndex = r;
      campaignIndex = cIdx;
      spentIndex = sIdx;
      accountIndex = findColumnFlexible(rawHeaders, [
        "account name",
        "account_name",
        "ad account name",
        "nama akun",
        "account",
      ]);
      accountIdIndex = findColumnFlexible(rawHeaders, [
        "account id",
        "account_id",
        "ad account id",
        "id akun",
        "id account",
      ]);
      resultIndex = findColumnFlexible(rawHeaders, [
        "website registrations completed",
        "registrations completed",
        "website registrations",
        "results",
        "result",
        "hasil",
        "pendaftaran situs web diselesaikan",
        "registrations",
      ]);
      deliveryIndex = findColumnFlexible(rawHeaders, [
        "delivery",
        "campaign delivery",
        "ad delivery",
        "delivery status",
        "status pengiriman",
        "status penayangan",
        "status",
      ]);
      break;
    }
  }

  if (campaignIndex === -1 && accountIndex === -1) {
    throw new Error("Kolom Campaign Name atau Account Name tidak ditemukan di file Meta Ads.");
  }

  if (spentIndex === -1) {
    throw new Error("Kolom Amount Spent tidak ditemukan di file Meta Ads.");
  }

  const parsed: CampaignRawRow[] = [];
  let currentAccount = "";
  let currentAccountId = "";

  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i] as unknown[];
    if (!row || !row.length) continue;

    const rowAccount = accountIndex !== -1 ? String(row[accountIndex] ?? "").trim() : "";
    if (rowAccount) {
      currentAccount = rowAccount;
      // Update Account ID saat account baru ditemukan
      if (accountIdIndex !== -1 && accountIdIndex < row.length) {
        const rawId = String(row[accountIdIndex] ?? "").trim();
        if (rawId) currentAccountId = rawId;
      }
    }

    const campaignName = campaignIndex !== -1 ? String(row[campaignIndex] ?? "").trim() : "";

    // Skip empty rows, totals, and "All" summary rows
    if (!campaignName && !rowAccount) continue;
    if (campaignName.toLowerCase() === "all" || campaignName.toLowerCase() === "total") continue;
    if (rowAccount.toLowerCase().includes("total") && !campaignName) continue;

    const effectiveCampaign = campaignName || "Default Campaign";
    const effectiveAccount = currentAccount || "Unknown Account";

    const spent = parseAmount(row[spentIndex]);
    const results = resultIndex !== -1 ? parseAmount(row[resultIndex]) : 0;

    let deliveryStatus: CampaignStatus | undefined = undefined;
    if (deliveryIndex !== -1 && deliveryIndex < row.length) {
      const rawDeliv = String(row[deliveryIndex] ?? "").trim();
      if (rawDeliv) {
        // Normalize status agar sesuai dengan Meta Ads Manager
        const lower = rawDeliv.toLowerCase();
        if (lower === "active") {
          deliveryStatus = "Active";
        } else if (lower === "inactive" || lower === "off" || lower === "paused") {
          deliveryStatus = "OFF";
        } else if (lower === "not delivering" || lower === "not_delivering") {
          deliveryStatus = "Not delivering";
        } else if (lower === "not approved" || lower === "not_approved") {
          deliveryStatus = "Not approved";
        } else if (lower === "deleted") {
          deliveryStatus = "Deleted";
        } else if (lower === "completed") {
          deliveryStatus = "Completed";
        } else if (lower === "scheduled") {
          deliveryStatus = "Scheduled";
        } else if (lower === "in draft" || lower === "draft") {
          deliveryStatus = "In draft";
        } else if (lower === "archived") {
          deliveryStatus = "DISABLE";
        } else {
          deliveryStatus = rawDeliv; // fallback: simpan as-is
        }
      }
    }

    const { display: extractedRef } = extractRefCode(effectiveCampaign);

    parsed.push({
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      account: effectiveAccount,
      accountId: currentAccountId || undefined,
      campaignName: effectiveCampaign,
      spent,
      results,
      extractedRef,
      deliveryStatus,
    });
  }

  return parsed;
}

/**
 * Parses File 2: CRM / Affiliate / Deposit RAW (Excel/CSV)
 */
export async function parseCrmRefFile(file: File): Promise<CrmRawRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  let targetSheet = workbook.Sheets[workbook.SheetNames[0]];
  for (const name of workbook.SheetNames) {
    const s = workbook.Sheets[name];
    if (s && Object.keys(s).length > 5) {
      targetSheet = s;
      break;
    }
  }

  const data = XLSX.utils.sheet_to_json<unknown[]>(targetSheet, {
    header: 1,
    defval: "",
  });

  if (!data.length) {
    throw new Error("File CRM / Ref RAW kosong.");
  }

  return parseCrmRowsFromData(data);
}

/**
 * Parses CRM text / clipboard (tab-separated or comma-separated)
 */
export function parseCrmFromText(text: string): CrmRawRow[] {
  if (!text || !text.trim()) {
    throw new Error("Teks data CRM kosong.");
  }

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("Teks harus memiliki baris judul dan minimal 1 baris data.");
  }

  const firstLine = lines[0];
  const delimiter = firstLine.includes("\t")
    ? "\t"
    : firstLine.includes(";")
      ? ";"
      : ",";

  const data = lines.map((line) => line.split(delimiter).map((c) => c.trim()));
  return parseCrmRowsFromData(data);
}

function parseCrmRowsFromData(data: unknown[][]): CrmRawRow[] {
  if (!data || data.length === 0) {
    throw new Error("Data CRM kosong.");
  }

  // 1. Scan up to first 10 rows for header row
  let headerRowIndex = 0;
  let groupIndex = -1;
  let regisIndex = -1;
  let qftdIndex = -1;
  let ftdSumIndex = -1;
  let depositAmountIndex = -1;

  for (let r = 0; r < Math.min(10, data.length); r++) {
    const rawHeaders = (data[r] as unknown[]).map((h) => String(h ?? ""));

    const gIdx = findColumnFlexible(rawHeaders, [
      "group",
      "group name",
      "affiliate id",
      "affiliate",
      "kode ref",
      "ref code",
      "kode referensi",
      "referral",
      "ref",
      "code",
      "id",
    ]);

    const rIdx = findColumnFlexible(rawHeaders, [
      "registrations",
      "regis",
      "registration",
      "total registrations",
      "signups",
      "pendaftaran",
      "signup",
      "user",
      "users",
      "member",
    ]);

    const qIdx = findColumnFlexible(rawHeaders, [
      "total qftds",
      "total qftd",
      "qftds",
      "qftd",
      "ndp",
      "deposits count",
      "deposit count",
      "ftd count",
      "ftd",
      "ftds",
      "total ftd",
    ]);

    if (gIdx !== -1 || rIdx !== -1 || qIdx !== -1) {
      headerRowIndex = r;
      if (gIdx !== -1) groupIndex = gIdx;
      if (rIdx !== -1) regisIndex = rIdx;
      if (qIdx !== -1) qftdIndex = qIdx;

      ftdSumIndex = findColumnFlexible(rawHeaders, [
        "ftd deposit sum",
        "ftd sum",
        "deposit sum",
        "total deposit",
      ]);
      depositAmountIndex = findColumnFlexible(rawHeaders, [
        "deposit amount sum of deposits",
        "sum of deposits",
        "deposit amount",
        "total amount",
      ]);
      break;
    }
  }

  // 2. Intelligent Data-Driven Fallback if any column was missing
  // Inspect sample data rows (up to 20 rows) to deduce columns
  if (groupIndex === -1 || regisIndex === -1 || qftdIndex === -1) {
    const sampleRows = data.slice(headerRowIndex + 1, headerRowIndex + 21);
    const colCount = Math.max(...sampleRows.map((r) => r.length), 0);

    for (let c = 0; c < colCount; c++) {
      if (c === groupIndex || c === regisIndex || c === qftdIndex) continue;

      let stringCodeMatches = 0;
      let numericCount = 0;
      let nonZeroCount = 0;

      for (const row of sampleRows) {
        const val = String(row[c] ?? "").trim();
        if (!val || val.toLowerCase() === "total") continue;

        // Check if looks like a Ref code (e.g. R10, RY1666, HG173, CP160)
        if (/^[A-Za-z0-9_-]{2,15}$/.test(val) && /[A-Za-z]/.test(val) && /\d/.test(val)) {
          stringCodeMatches++;
        }

        const num = parseAmount(val);
        if (num > 0) {
          numericCount++;
          nonZeroCount++;
        }
      }

      if (groupIndex === -1 && stringCodeMatches >= 2) {
        groupIndex = c;
      } else if (regisIndex === -1 && numericCount >= 2) {
        regisIndex = c;
      } else if (qftdIndex === -1 && numericCount >= 2) {
        qftdIndex = c;
      }
    }
  }

  // 3. Absolute Fallback: Default column positions
  if (groupIndex === -1) groupIndex = 0;
  if (regisIndex === -1) regisIndex = 1;
  if (qftdIndex === -1) qftdIndex = 2;

  const parsed: CrmRawRow[] = [];

  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i] as unknown[];
    if (!row || !row.length) continue;

    const groupCode = String(row[groupIndex] ?? "").trim();
    if (!groupCode || groupCode.toLowerCase() === "total" || groupCode.toLowerCase() === "group") continue;

    const registrations = regisIndex !== -1 && regisIndex < row.length ? parseAmount(row[regisIndex]) : 0;
    const ndp = qftdIndex !== -1 && qftdIndex < row.length ? parseAmount(row[qftdIndex]) : 0; // Total QFTDs / NDP
    const ftdDepositSum = ftdSumIndex !== -1 && ftdSumIndex < row.length ? parseAmount(row[ftdSumIndex]) : 0;
    const depositAmount = depositAmountIndex !== -1 && depositAmountIndex < row.length ? parseAmount(row[depositAmountIndex]) : 0;

    parsed.push({
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      groupCode,
      registrations,
      ndp,
      ftdDepositSum,
      depositAmount,
    });
  }

  return parsed;
}

/**
 * Calculates a single merged row given campaign info and CRM lookup map
 */
export function calculateMergedCampaignRow(
  camp: {
    id: string;
    account: string;
    accountId?: string;
    campaignName: string;
    spent: number;
    results: number;
    refCode: string;
    budget?: number;
    status?: CampaignStatus;
    deliveryStatus?: CampaignStatus;
  },
  crmMap: Map<string, CrmRawRow>,
  settings: CampaignReportSettings
): MergedCampaignRow {
  const cleanRef = cleanRefKey(camp.refCode);

  // 1. Direct match by clean key
  let crmMatch = crmMap.get(cleanRef);

  // 2. Fuzzy / Substring fallback search if direct match not found
  if (!crmMatch) {
    for (const [key, val] of crmMap.entries()) {
      if (key === cleanRef || key.includes(cleanRef) || (cleanRef.length > 2 && cleanRef.includes(key))) {
        crmMatch = val;
        break;
      }
    }
  }

  // Registrations from CRM -> goes to REGIS column
  const regis = crmMatch ? crmMatch.registrations : 0;

  // Total QFTDs from CRM -> goes to NDP column
  const ndp = crmMatch ? crmMatch.ndp : 0;

  const effectiveRate = settings.rate * (1 + settings.taxFeePercent / 100);
  const spentTaxRp = Math.round(camp.spent * effectiveRate);

  // Cost Per Result in USD: SPENT / RESULT
  const cphUsd = camp.results > 0 ? camp.spent / camp.results : null;

  // Cost Per Result with Tax in IDR: (SPENT + TAX) / RESULT
  const cphTaxRp = camp.results > 0 ? Math.round(spentTaxRp / camp.results) : null;

  // CPR REF (Cost Per Registration): (SPENT + TAX) / REGIS
  const cprRefRp = regis > 0 ? Math.round(spentTaxRp / regis) : null;

  // CPD REF (Cost Per Deposit / QFTD): (SPENT + TAX) / QFTD
  const cpdRefRp = ndp > 0 ? Math.round(spentTaxRp / ndp) : null;

  const status: CampaignStatus =
    camp.status ||
    camp.deliveryStatus ||
    (camp.spent === 0 ? "Not delivering" : "OFF");

  return {
    id: camp.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15)),
    account: camp.account,
    accountId: camp.accountId,
    campaignName: camp.campaignName,
    budget: camp.budget ?? settings.defaultBudget,
    spent: camp.spent,
    spentTaxRp,
    results: camp.results,
    cphUsd,
    cphTaxRp,
    regis,
    ndp,
    cprRefRp,
    cpdRefRp,
    status,
    refCode: camp.refCode,
  };
}

/**
 * Merges Meta Ads Campaign rows with CRM data by matching Ref Code.
 */
export function mergeCampaignAndCrmData(
  campaigns: CampaignRawRow[],
  crmData: CrmRawRow[],
  settings: CampaignReportSettings,
  overrides?: Record<string, Partial<MergedCampaignRow>>
): CampaignAccountGroup[] {
  // Build CRM lookup map with clean uppercase key
  const crmMap = new Map<string, CrmRawRow>();
  for (const crm of crmData) {
    const key = cleanRefKey(crm.groupCode);
    if (key) {
      crmMap.set(key, crm);
    }
    // Also store raw trimmed
    const rawKey = crm.groupCode.trim().toUpperCase();
    if (rawKey && !crmMap.has(rawKey)) {
      crmMap.set(rawKey, crm);
    }
  }

  const mergedRows: MergedCampaignRow[] = campaigns.map((camp) => {
    const override = overrides?.[camp.id] || {};
    const refCode = override.refCode !== undefined ? override.refCode : camp.extractedRef;
    const spent = override.spent !== undefined ? override.spent : camp.spent;
    const results = override.results !== undefined ? override.results : camp.results;
    const budget = override.budget !== undefined ? override.budget : settings.defaultBudget;
    const status = override.status;

    return calculateMergedCampaignRow(
      {
        id: camp.id,
        account: camp.account,
        accountId: camp.accountId,
        campaignName: camp.campaignName,
        spent,
        results,
        refCode,
        budget,
        status,
        deliveryStatus: camp.deliveryStatus,
      },
      crmMap,
      settings
    );
  });

  // Group by Account
  const accountMap = new Map<string, { items: MergedCampaignRow[]; accountId?: string }>();
  for (const row of mergedRows) {
    const entry = accountMap.get(row.account) || { items: [], accountId: row.accountId };
    entry.items.push(row);
    if (!entry.accountId && row.accountId) entry.accountId = row.accountId;
    accountMap.set(row.account, entry);
  }

  const groups: CampaignAccountGroup[] = [];
  for (const [account, { items, accountId }] of accountMap.entries()) {
    const totalSpent = items.reduce((sum, item) => sum + item.spent, 0);
    const totalSpentTaxRp = items.reduce((sum, item) => sum + item.spentTaxRp, 0);
    const totalResults = items.reduce((sum, item) => sum + item.results, 0);
    const totalRegis = items.reduce((sum, item) => sum + item.regis, 0);
    const totalNdp = items.reduce((sum, item) => sum + item.ndp, 0);

    groups.push({
      account,
      accountId,
      items,
      totalSpent,
      totalSpentTaxRp,
      totalResults,
      totalRegis,
      totalNdp,
    });
  }

  return groups;
}

/**
 * Generates sample data based exactly on Gambar 1, 2, 3
 */
export function generateSampleCampaignData(): {
  campaigns: CampaignRawRow[];
  crmData: CrmRawRow[];
} {
  const campaigns: CampaignRawRow[] = [
    {
      id: "c1",
      account: "JANJI33 37 - Robert",
      campaignName: "2/kfc-joy/R18",
      spent: 40.86,
      results: 12,
      extractedRef: "/R18",
    },
    {
      id: "c2",
      account: "JANJI33 40 - Robert",
      campaignName: "2/KFC-JOY/R19",
      spent: 1.4,
      results: 1,
      extractedRef: "/R19",
    },
    {
      id: "c3",
      account: "JANJI33 40 - Robert",
      campaignName: "2/KFC-JOY/R20",
      spent: 1.37,
      results: 1,
      extractedRef: "/R20",
    },
    {
      id: "c4",
      account: "JANJI33 41 - Robert",
      campaignName: "2/KFC-JOY/R20",
      spent: 0.0,
      results: 0,
      extractedRef: "/R20",
    },
    {
      id: "c5",
      account: "JANJI33 41 - Robert",
      campaignName: "2/KFC-JOY/R19",
      spent: 0.0,
      results: 0,
      extractedRef: "/R19",
    },
    {
      id: "c6",
      account: "JANJI33 39 - Robert",
      campaignName: "2/KFC-JOY/R22",
      spent: 0.0,
      results: 0,
      extractedRef: "/R22",
    },
    {
      id: "c7",
      account: "JANJI33 39 - Robert",
      campaignName: "2/KFC-JOY/R21",
      spent: 0.0,
      results: 0,
      extractedRef: "/R21",
    },
    {
      id: "c8",
      account: "TRX-Janji33.P9-A151",
      campaignName: "2/BNRDAFTAR-HG-/R1",
      spent: 0.87,
      results: 0,
      extractedRef: "/R1",
    },
    {
      id: "c9",
      account: "TRX-Janji33.P9-A151",
      campaignName: "2/COBATES-HG/R8",
      spent: 11.39,
      results: 3,
      extractedRef: "/R8",
    },
    {
      id: "c10",
      account: "TRX-Janji33.P9-A153",
      campaignName: "2/COBATES-HG/R7",
      spent: 19.75,
      results: 5,
      extractedRef: "/R7",
    },
    {
      id: "c11",
      account: "TRX-Janji33.P9-A153",
      campaignName: "2/COBATES-HG/R9",
      spent: 33.99,
      results: 8,
      extractedRef: "/R9",
    },
    {
      id: "c12",
      account: "TRX-Janji33.P9-A155",
      campaignName: "2/23/gaisiv5-hg/R23",
      spent: 5.97,
      results: 3,
      extractedRef: "/R23",
    },
    {
      id: "c13",
      account: "TRX-Janji33.P9-A154",
      campaignName: "2/kfc-joy/R10",
      spent: 131.32,
      results: 48,
      extractedRef: "/R10",
    },
    {
      id: "c14",
      account: "TRX-Janji33.P9-A154",
      campaignName: "2/kfc-joy/R11",
      spent: 55.28,
      results: 12,
      extractedRef: "/R11",
    },
  ];

  const crmData: CrmRawRow[] = [
    { id: "crm1", groupCode: "RY1666", registrations: 294, ndp: 68 },
    { id: "crm2", groupCode: "HG173", registrations: 143, ndp: 51 },
    { id: "crm3", groupCode: "RY1687", registrations: 62, ndp: 23 },
    { id: "crm4", groupCode: "RY1667", registrations: 65, ndp: 12 },
    { id: "crm5", groupCode: "RY1767", registrations: 26, ndp: 9 },
    { id: "crm6", groupCode: "RY1769", registrations: 24, ndp: 7 },
    { id: "crm7", groupCode: "RY1785", registrations: 12, ndp: 6 },
    { id: "crm8", groupCode: "RY1742", registrations: 8, ndp: 6 },
    { id: "crm9", groupCode: "R7", registrations: 5, ndp: 5 },
    { id: "crm10", groupCode: "RY1740", registrations: 8, ndp: 5 },
    { id: "crm11", groupCode: "R10", registrations: 23, ndp: 5 },
    { id: "crm12", groupCode: "CP160", registrations: 4, ndp: 4 },
    { id: "crm13", groupCode: "R11", registrations: 7, ndp: 4 },
    { id: "crm14", groupCode: "RY1760", registrations: 10, ndp: 4 },
    { id: "crm15", groupCode: "R8", registrations: 1, ndp: 1 },
    { id: "crm16", groupCode: "R9", registrations: 7, ndp: 2 },
    { id: "crm17", groupCode: "R18", registrations: 6, ndp: 3 },
    { id: "crm18", groupCode: "R19", registrations: 1, ndp: 0 },
    { id: "crm19", groupCode: "R20", registrations: 0, ndp: 0 },
    { id: "crm20", groupCode: "R21", registrations: 0, ndp: 0 },
    { id: "crm21", groupCode: "R22", registrations: 0, ndp: 0 },
    { id: "crm22", groupCode: "R23", registrations: 3, ndp: 1 },
    { id: "crm23", groupCode: "R1", registrations: 0, ndp: 0 },
  ];

  return { campaigns, crmData };
}
