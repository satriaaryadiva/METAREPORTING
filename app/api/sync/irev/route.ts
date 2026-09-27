import { NextRequest, NextResponse } from "next/server";
import { CrmRawRow } from "@/types/campaign-report";
import { parseAmount } from "@/lib/campaign-parser";

/* ─── helpers ─── */

/** Recursively find all arrays within a nested object (max depth 4) */
function findArrays(obj: any, path = "", depth = 0): { path: string; length: number; sample: any }[] {
  const found: { path: string; length: number; sample: any }[] = [];
  if (depth > 4 || !obj || typeof obj !== "object") return found;

  for (const key of Object.keys(obj)) {
    const val = obj[key];
    const currentPath = path ? `${path}.${key}` : key;
    if (Array.isArray(val)) {
      found.push({ path: currentPath, length: val.length, sample: val[0] ?? null });
    } else if (val && typeof val === "object" && !Array.isArray(val)) {
      found.push(...findArrays(val, currentPath, depth + 1));
    }
  }
  return found;
}

/** Summarise top-level structure safely */
function summariseObject(obj: any, maxKeys = 30): Record<string, string> {
  if (!obj || typeof obj !== "object") return { _type: typeof obj };
  const summary: Record<string, string> = {};
  const keys = Object.keys(obj).slice(0, maxKeys);
  for (const k of keys) {
    const v = obj[k];
    if (v === null) summary[k] = "null";
    else if (Array.isArray(v)) summary[k] = `Array(${v.length})`;
    else if (typeof v === "object") summary[k] = `Object{${Object.keys(v).slice(0, 8).join(",")}}`;
    else summary[k] = `${typeof v}: ${String(v).slice(0, 80)}`;
  }
  return summary;
}

/** Try to extract group code from an item using many possible field names */
function extractGroupCode(item: any): string {
  if (!item || typeof item !== "object") return "";

  const candidates = [
    item.groupCode, item.group_code, item.group, item.Group,
    item.aff_sub2, item.aff_sub1, item.aff_sub, item.affSub2, item.affSub1,
    item.affiliate_id, item.affiliateId, item.affiliate, item.Affiliate,
    item.code, item.Code, item.ref, item.refCode, item.ref_code,
    item.kode_ref, item.sub_id, item.subId, item.sub, item.Sub,
    item.tracker, item.Tracker, item.tracker_name, item.trackerName,
    item.name, item.Name, item.tag, item.Tag,
    item.key, item.label, item.title,
    item.id, item.Id, item.ID,
  ];

  for (const c of candidates) {
    if (c !== undefined && c !== null && c !== "") {
      const str = String(c).trim();
      if (str && str.toLowerCase() !== "total" && str !== "0") return str;
    }
  }

  // If item has a nested "group" or "key" field that's an object
  if (item.group && typeof item.group === "object") {
    return String(item.group.name || item.group.code || item.group.id || "").trim();
  }

  return "";
}

/** Try to extract numeric metric from an item using many field name patterns */
function extractMetric(item: any, patterns: string[]): number {
  for (const p of patterns) {
    let val: any = item;
    for (const part of p.split(".")) {
      val = val?.[part];
    }
    if (val !== undefined && val !== null) {
      return parseAmount(val);
    }
  }
  return 0;
}

/**
 * Detect if user pasted an iRev frontend URL and extract:
 * - baseUrl (e.g. https://cerah-pp.irev.com)
 * - filters (decoded from base64)
 */
function parseIrevFrontendUrl(rawUrl: string): {
  isIrevFrontend: boolean;
  baseUrl: string;
  filters: any | null;
  reportType: string;
} {
  try {
    const url = new URL(rawUrl.trim());
    const pathname = url.pathname;

    const isIrevFrontend =
      pathname.includes("/app/reporting/") ||
      pathname.includes("/app/dashboard") ||
      pathname.includes("/app/statistics");

    if (!isIrevFrontend) {
      return { isIrevFrontend: false, baseUrl: "", filters: null, reportType: "" };
    }

    const baseUrl = `${url.protocol}//${url.host}`;

    let filters: any = null;
    const filtersParam = url.searchParams.get("filters");
    if (filtersParam) {
      try {
        const decoded = Buffer.from(filtersParam, "base64").toString("utf-8");
        filters = JSON.parse(decoded);
      } catch {
        try {
          const decoded = Buffer.from(decodeURIComponent(filtersParam), "base64").toString("utf-8");
          filters = JSON.parse(decoded);
        } catch { /* ignore */ }
      }
    }

    let reportType = "performance-report";
    if (pathname.includes("performance")) reportType = "performance-report";
    else if (pathname.includes("cohort")) reportType = "cohort-report";
    else if (pathname.includes("financial")) reportType = "financial-report";

    return { isIrevFrontend: true, baseUrl, filters, reportType };
  } catch {
    return { isIrevFrontend: false, baseUrl: "", filters: null, reportType: "" };
  }
}

/**
 * Build the POST body for iRev backend API based on decoded filters
 */
function buildIrevReportPayload(filters: any) {
  const now = new Date();
  const todayFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const todayTo = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const groupsData = filters?.groupsData || {
    groups: ["aff_sub2"],
    groupRelations: {},
  };

  return {
    date: filters?.date || {
      from: todayFrom.toISOString().replace("Z", ""),
      to: todayTo.toISOString().replace("Z", ""),
      timezone: "Asia/Jakarta",
      interval: "today",
    },
    // Top-level "groups" is required by iRev's validator, in addition to the
    // nested groupsData shape.
    groups: groupsData.groups || ["aff_sub2"],
    groupsData,
    conditionsAndCurrency: filters?.conditionsAndCurrency || {
      conditions: [],
      currencyMode: "origin",
    },
  };
}

/* ─── main handler ─── */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpointUrl, apiKey, partnerId, dateFrom, dateTo } = body;

    if (!endpointUrl) {
      return NextResponse.json(
        { success: false, error: "Endpoint URL iRev / CRM API wajib diisi." },
        { status: 400 }
      );
    }

    const rawUrl = endpointUrl.trim();
    const headers: Record<string, string> = { Accept: "application/json" };

    if (apiKey) {
      const cleanKey = apiKey.trim();
      if (cleanKey.toLowerCase().startsWith("bearer ")) {
        headers["Authorization"] = cleanKey;
      } else {
        headers["Authorization"] = `Bearer ${cleanKey}`;
        headers["X-API-KEY"] = cleanKey;
        headers["apikey"] = cleanKey;
      }
    }

    let response: Response;

    /** Build the POST body for a direct iRev backend endpoint from form fields
     * (dateFrom/dateTo/partnerId), matching the same shape as buildIrevReportPayload. */
    function buildPayloadFromFormFields() {
      const now = new Date();
      const todayFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const todayTo = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      const from = dateFrom ? `${dateFrom}T00:00:00` : todayFrom.toISOString().replace("Z", "");
      const to = dateTo ? `${dateTo}T23:59:59` : todayTo.toISOString().replace("Z", "");

      return {
        date: {
          from,
          to,
          timezone: "Asia/Jakarta",
          interval: dateFrom || dateTo ? "custom" : "today",
        },
        // iRev's validator wants "groups" as a top-level field (confirmed via
        // "The groups field is required" 400 response), so we send it flat here
        // in addition to the nested groupsData shape for backward compatibility.
        groups: ["aff_sub2"],
        groupsData: {
          groups: ["aff_sub2"],
          groupRelations: {},
        },
        conditionsAndCurrency: {
          conditions: partnerId
            ? [{ field: "partner_id", operator: "=", value: partnerId }]
            : [],
          currencyMode: "origin",
        },
      };
    }

    // ── If this is an iRev *frontend* URL (has /app/reporting/... + base64 filters),
    // decode the filters and hit the backend report endpoint with a POST instead of
    // treating it as a plain REST GET endpoint. ──
    const parsedFrontend = parseIrevFrontendUrl(rawUrl);

    if (parsedFrontend.isIrevFrontend) {
      const payload = buildIrevReportPayload(parsedFrontend.filters);
      const backendUrl = `${parsedFrontend.baseUrl}/api/reports/${parsedFrontend.reportType}`;

      response = await fetch(backendUrl, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        next: { revalidate: 0 },
      });
    } else {
      const targetUrl = new URL(rawUrl);
      if (dateFrom) targetUrl.searchParams.set("from", dateFrom);
      if (dateTo) targetUrl.searchParams.set("to", dateTo);
      if (partnerId) targetUrl.searchParams.set("partner_id", partnerId);

      response = await fetch(targetUrl.toString(), {
        method: "GET",
        headers,
        next: { revalidate: 0 },
      });

      // Many iRev backend endpoints (e.g. .../api/v1/crm/drill-down/data/layer)
      // reject GET with 405 and only accept POST + a JSON filter body.
      // If we hit that, retry as POST automatically instead of surfacing the 405.
      if (response.status === 405) {
        const payload = buildPayloadFromFormFields();
        response = await fetch(rawUrl, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          next: { revalidate: 0 },
        });
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          success: false,
          error: `iRev API responded with status ${response.status}: ${errorText.slice(0, 300)}`,
        },
        { status: response.status }
      );
    }

    const result = await response.json();

    // ── Find the data array ──
    let rawItems: any[] = [];
    let foundPath = "";

    if (Array.isArray(result)) {
      rawItems = result;
      foundPath = "(root array)";
    } else {
      const searchPaths = [
        "data", "items", "results", "reports", "rows",
        "affiliates", "partners", "records", "list",
        "data.rows", "data.items", "data.records", "data.list",
        "result", "result.data", "result.rows",
        "response", "response.data",
        "payload", "payload.data",
        "body", "body.data",
      ];

      for (const sp of searchPaths) {
        let val: any = result;
        for (const part of sp.split(".")) {
          val = val?.[part];
        }
        if (Array.isArray(val) && val.length > 0) {
          rawItems = val;
          foundPath = sp;
          break;
        }
      }

      if (rawItems.length === 0) {
        const allArrays = findArrays(result);
        if (allArrays.length > 0) {
          const best = allArrays.sort((a, b) => b.length - a.length)[0];
          let val: any = result;
          for (const part of best.path.split(".")) {
            val = val?.[part];
          }
          if (Array.isArray(val)) {
            rawItems = val;
            foundPath = best.path;
          }
        }
      }
    }

    // ── Parse items ──
    const parsedCrmRows: CrmRawRow[] = [];

    for (const item of rawItems) {
      if (!item || typeof item !== "object") continue;

      const groupCode = extractGroupCode(item);
      if (!groupCode) continue;

      const registrations = extractMetric(item, [
        "registrations", "Registrations", "total_registrations",
        "regis", "signups", "sign_ups", "users",
        "stats.registrations", "metrics.registrations",
      ]);

      const ndp = extractMetric(item, [
        "ndp", "NDP", "qftds", "QFTDs", "total_qftds", "totalQftds",
        "qftd", "QFTD", "ftd_count", "ftdCount", "FTD",
        "deposits_count", "depositsCount", "Deposits Count",
        "qualified_ftd", "qualifiedFtd",
        "stats.qftds", "stats.ndp", "metrics.ftd",
      ]);

      const ftdDepositSum = extractMetric(item, [
        "ftdDepositSum", "ftd_deposit_sum", "FTD Deposit Sum",
        "deposit_amount", "depositAmount", "Deposit Amount",
        "deposit_sum", "depositSum", "total_deposit",
        "revenue", "amount", "sum",
        "stats.ftdDepositSum", "stats.deposit_amount",
        "metrics.deposit_amount",
      ]);

      parsedCrmRows.push({
        id: `irev_${groupCode}_${Math.random().toString(36).substring(2, 7)}`,
        groupCode,
        registrations,
        ndp,
        ftdDepositSum,
      });
    }

    // ── If 0 parsed, return diagnostic info ──
    if (parsedCrmRows.length === 0) {
      const allArrays = findArrays(result);
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
        syncedAt: new Date().toISOString(),
        _debug: {
          message: "Koneksi berhasil tapi 0 data terparsing. Berikut struktur response dari iRev:",
          topLevelType: Array.isArray(result) ? "Array" : typeof result,
          topLevelKeys: Array.isArray(result) ? `Array(${result.length})` : summariseObject(result),
          arraysFound: allArrays.map((a) => ({
            path: a.path,
            length: a.length,
            sampleKeys: a.sample && typeof a.sample === "object" ? Object.keys(a.sample).slice(0, 20) : null,
            sampleValue: a.sample ? JSON.stringify(a.sample).slice(0, 500) : null,
          })),
          rawItemsFoundAt: foundPath || "(none)",
          rawItemsCount: rawItems.length,
          firstRawItem: rawItems[0] ? JSON.stringify(rawItems[0]).slice(0, 1000) : null,
          first3RawItems: rawItems.slice(0, 3).map((r) => JSON.stringify(r).slice(0, 500)),
          rawSnippet: JSON.stringify(result).slice(0, 2000),
          detectedIrevFrontend: parsedFrontend.isIrevFrontend,
          decodedFilters: parsedFrontend.filters,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: parsedCrmRows,
      count: parsedCrmRows.length,
      syncedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan server saat sinkronisasi iRev.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}