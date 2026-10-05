// app/api/ad-rules/apply/route.ts
import { NextRequest, NextResponse } from "next/server";
import { AdRule, ApplyRuleResult, RuleMetric } from "@/types/ad-rules";

const GRAPH = "https://graph.facebook.com/v20.0";

interface MetaInsightItem {
  ad_id?: string;
  adset_id?: string;
  campaign_id?: string;
  ad_name?: string;
  adset_name?: string;
  campaign_name?: string;
  spend: string;
  cpc?: string;
  cpm?: string;
  ctr?: string;
  impressions?: string;
  actions?: { action_type: string; value: string }[];
}

function getResults(insight: MetaInsightItem): number {
  const actions = insight.actions || [];
  const reg = actions.find(
    (a) => a.action_type.includes("registration") || a.action_type === "lead"
  );
  return reg ? parseInt(reg.value, 10) || 0 : 0;
}

function getMetricValue(insight: MetaInsightItem, metric: RuleMetric): number {
  switch (metric) {
    case "spend":
      return parseFloat(insight.spend || "0") || 0;
    case "cpc":
      return parseFloat(insight.cpc || "0") || 0;
    case "cpm":
      return parseFloat(insight.cpm || "0") || 0;
    case "ctr":
      return parseFloat(insight.ctr || "0") || 0;
    case "impressions":
      return parseInt(insight.impressions || "0", 10) || 0;
    case "results":
      return getResults(insight);
    case "cpr": {
      const spend = parseFloat(insight.spend || "0") || 0;
      const results = getResults(insight);
      return results > 0 ? spend / results : 0;
    }
    default:
      return 0;
  }
}

function compare(value: number, operator: string, target: number): boolean {
  switch (operator) {
    case "GREATER_THAN":
      return value > target;
    case "GREATER_THAN_OR_EQUAL":
      return value >= target;
    case "LESS_THAN":
      return value < target;
    case "LESS_THAN_OR_EQUAL":
      return value <= target;
    case "EQUALS":
      return value === target;
    default:
      return false;
  }
}

// Ambil semua halaman insights
async function fetchAllInsights(firstUrl: string): Promise<MetaInsightItem[]> {
  const all: MetaInsightItem[] = [];
  let url: string | null = firstUrl;
  let guard = 0;

  while (url && guard < 20) {
    const res: Response = await fetch(url, { cache: "no-store" });
    const json = await res.json();
    if (json.error) {
      throw new Error(json.error.message || "Gagal mengambil insights.");
    }
    all.push(...(json.data || []));
    url = json.paging?.next || null;
    guard++;
  }
  return all;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accessToken, rule } = body as { accessToken: string; rule: AdRule };

    if (!accessToken?.trim()) {
      return NextResponse.json(
        { success: false, error: "Access Token Meta wajib diisi." },
        { status: 400 }
      );
    }

    if (!rule || !rule.accountIds?.length) {
      return NextResponse.json(
        { success: false, error: "Rule dan daftar Ad Account wajib ada." },
        { status: 400 }
      );
    }

    if (!rule.enabled) {
      return NextResponse.json(
        { success: false, error: "Rule nonaktif. Aktifkan dulu sebelum dijalankan." },
        { status: 400 }
      );
    }

    if (!rule.conditions?.length) {
      return NextResponse.json(
        { success: false, error: "Rule tidak punya kondisi." },
        { status: 400 }
      );
    }

    const token = accessToken.trim();
    const levelLower = rule.level.toLowerCase(); // ad, adset, campaign

    const metricFields = "spend,cpc,cpm,ctr,impressions,actions";
    const itemIdField =
      rule.level === "AD"
        ? "ad_id,ad_name"
        : rule.level === "ADSET"
          ? "adset_id,adset_name"
          : "campaign_id,campaign_name";

    const results: ApplyRuleResult = {
      ruleId: rule.id,
      ruleName: rule.name,
      affectedItems: [],
      triggeredCount: 0,
      runAt: new Date().toISOString(),
    };
    const errors: string[] = [];

    for (const rawAccountId of rule.accountIds) {
      const trimmed = rawAccountId.trim();
      const accountId = trimmed.startsWith("act_") ? trimmed : `act_${trimmed}`;

      try {
        // 1. Insights, hanya entitas yang masih ACTIVE
        const insightsUrl = new URL(`${GRAPH}/${accountId}/insights`);
        insightsUrl.searchParams.set("access_token", token);
        insightsUrl.searchParams.set("level", levelLower);
        insightsUrl.searchParams.set("fields", `${itemIdField},${metricFields}`);
        insightsUrl.searchParams.set("date_preset", rule.timeWindow);
        insightsUrl.searchParams.set("limit", "500");
        insightsUrl.searchParams.set(
          "filtering",
          JSON.stringify([
            {
              field: `${levelLower}.effective_status`,
              operator: "IN",
              value: ["ACTIVE"],
            },
          ])
        );

        const items = await fetchAllInsights(insightsUrl.toString());

        // 2. Cek kondisi per item (AND)
        for (const item of items) {
          const itemId = item.ad_id || item.adset_id || item.campaign_id || "";
          const itemName =
            item.ad_name || item.adset_name || item.campaign_name || itemId;
          if (!itemId) continue;

          const primaryMetricName = rule.conditions[0].metric;
          const primaryMetricValue = getMetricValue(item, primaryMetricName);

          const allMet = rule.conditions.every((cond) =>
            compare(getMetricValue(item, cond.metric), cond.operator, cond.value)
          );
          if (!allMet) continue;

          const baseItem = {
            id: itemId,
            name: itemName,
            accountId,
            metric: primaryMetricName,
            metricValue: primaryMetricValue,
            action: rule.action,
          };

          // 3a. Notifikasi saja
          if (rule.action === "SEND_NOTIFICATION") {
            results.affectedItems.push({ ...baseItem, success: true });
            results.triggeredCount++;
            continue;
          }

          // 3b. Pause. itemId sudah sesuai level rule
          try {
            const pauseRes = await fetch(`${GRAPH}/${itemId}`, {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                access_token: token,
                status: "PAUSED",
              }),
              cache: "no-store",
            });
            const pauseJson = await pauseRes.json();

            if (pauseJson.success || pauseJson.id) {
              results.affectedItems.push({ ...baseItem, success: true });
              results.triggeredCount++;
            } else {
              results.affectedItems.push({
                ...baseItem,
                success: false,
                error: pauseJson.error?.message || "Unknown error",
              });
            }
          } catch (e) {
            results.affectedItems.push({
              ...baseItem,
              success: false,
              error: e instanceof Error ? e.message : "Pause failed",
            });
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error tidak diketahui";
        console.error(`Error processing ${accountId}:`, err);
        errors.push(`${accountId}: ${msg}`);
      }
    }

    // Kalau semua akun gagal dan tidak ada hasil, kembalikan error yang jelas
    if (errors.length > 0 && results.affectedItems.length === 0) {
      return NextResponse.json(
        { success: false, error: errors.slice(0, 3).join(" | ") },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      data: results,
      errors, // akun yang gagal (opsional ditampilkan di UI)
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error saat apply rule.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}