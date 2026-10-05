import { NextRequest, NextResponse } from "next/server";
import { AdRule, ApplyRuleResult, RuleMetric } from "@/types/ad-rules";

interface MetaAdItem {
  id: string;
  name: string;
  effective_status: string;
}

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
      return parseInt(insight.impressions || "0") || 0;
    case "results": {
      const actions = insight.actions || [];
      const reg = actions.find(
        (a) =>
          a.action_type.includes("registration") ||
          a.action_type === "lead"
      );
      return reg ? parseInt(reg.value, 10) || 0 : 0;
    }
    case "cpr": {
      const spend = parseFloat(insight.spend || "0") || 0;
      const actions = insight.actions || [];
      const reg = actions.find(
        (a) =>
          a.action_type.includes("registration") ||
          a.action_type === "lead"
      );
      const results = reg ? parseInt(reg.value, 10) || 0 : 0;
      return results > 0 ? spend / results : 0;
    }
    default:
      return 0;
  }
}

function evaluateConditions(
  value: number,
  rule: AdRule
): boolean {
  return rule.conditions.every((cond) => {
    switch (cond.operator) {
      case "GREATER_THAN":
        return value > cond.value;
      case "GREATER_THAN_OR_EQUAL":
        return value >= cond.value;
      case "LESS_THAN":
        return value < cond.value;
      case "LESS_THAN_OR_EQUAL":
        return value <= cond.value;
      case "EQUALS":
        return value === cond.value;
      default:
        return false;
    }
  });
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

    const token = accessToken.trim();
    const level = rule.level.toLowerCase() + "s"; // ads, adsets, campaigns
    const datePreset = rule.timeWindow;

    // Determine fields based on conditions
    const metricFields = [
      "spend",
      "cpc",
      "cpm",
      "ctr",
      "impressions",
      "actions",
    ].join(",");

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

    for (const rawAccountId of rule.accountIds) {
      const accountId = rawAccountId.trim().startsWith("act_")
        ? rawAccountId.trim()
        : `act_${rawAccountId.trim()}`;

      try {
        // 1. Fetch insights for this account at the rule level
        const insightsUrl = new URL(
          `https://graph.facebook.com/v20.0/${accountId}/insights`
        );
        insightsUrl.searchParams.set("access_token", token);
        insightsUrl.searchParams.set(
          "level",
          rule.level.toLowerCase()
        );
        insightsUrl.searchParams.set(
          "fields",
          `${itemIdField},${metricFields}`
        );
        insightsUrl.searchParams.set("date_preset", datePreset);
        insightsUrl.searchParams.set("limit", "500");

        const insightsRes = await fetch(insightsUrl.toString(), {
          next: { revalidate: 0 },
        });
        const insightsJson = await insightsRes.json();

        if (insightsJson.error) {
          throw new Error(
            insightsJson.error.message || `Error pada akun ${accountId}`
          );
        }

        const items: MetaInsightItem[] = insightsJson.data || [];

        // 2. For each item, check conditions
        for (const item of items) {
          const itemId =
            item.ad_id || item.adset_id || item.campaign_id || "";
          const itemName =
            item.ad_name || item.adset_name || item.campaign_name || itemId;

          // Evaluate all conditions (AND logic)
          let allMet = true;
          let primaryMetricValue = 0;
          let primaryMetricName = rule.conditions[0]?.metric || "spend";

          for (const cond of rule.conditions) {
            const val = getMetricValue(item, cond.metric);
            if (cond.metric === primaryMetricName) primaryMetricValue = val;
            if (!evaluateConditions(val, { ...rule, conditions: [cond] })) {
              allMet = false;
              break;
            }
          }

          if (!allMet) continue;

          // 3. Conditions met → apply action
          if (rule.action === "SEND_NOTIFICATION") {
            results.affectedItems.push({
              id: itemId,
              name: itemName,
              accountId,
              metric: primaryMetricName,
              metricValue: primaryMetricValue,
              action: rule.action,
              success: true,
            });
            results.triggeredCount++;
            continue;
          }

          // Pause action
          let pauseEndpoint = "";
          if (rule.action === "PAUSE_AD") {
            pauseEndpoint = `https://graph.facebook.com/v20.0/${item.ad_id}`;
          } else if (rule.action === "PAUSE_ADSET") {
            pauseEndpoint = `https://graph.facebook.com/v20.0/${item.adset_id}`;
          } else if (rule.action === "PAUSE_CAMPAIGN") {
            pauseEndpoint = `https://graph.facebook.com/v20.0/${item.campaign_id}`;
          }

          if (pauseEndpoint && itemId) {
            try {
              const pauseRes = await fetch(
                `${pauseEndpoint}?access_token=${token}&status=PAUSED`,
                { method: "POST", next: { revalidate: 0 } }
              );
              const pauseJson = await pauseRes.json();

              if (pauseJson.success || pauseJson.id) {
                results.affectedItems.push({
                  id: itemId,
                  name: itemName,
                  accountId,
                  metric: primaryMetricName,
                  metricValue: primaryMetricValue,
                  action: rule.action,
                  success: true,
                });
                results.triggeredCount++;
              } else {
                results.affectedItems.push({
                  id: itemId,
                  name: itemName,
                  accountId,
                  metric: primaryMetricName,
                  metricValue: primaryMetricValue,
                  action: rule.action,
                  success: false,
                  error: pauseJson.error?.message || "Unknown error",
                });
              }
            } catch (e) {
              results.affectedItems.push({
                id: itemId,
                name: itemName,
                accountId,
                metric: primaryMetricName,
                metricValue: primaryMetricValue,
                action: rule.action,
                success: false,
                error: e instanceof Error ? e.message : "Pause failed",
              });
            }
          }
        }
      } catch (err: unknown) {
        console.error(`Error processing ${accountId}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Server error saat apply rule.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
