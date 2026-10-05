import { NextRequest, NextResponse } from "next/server";
import { AdRule } from "@/types/ad-rules";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accessToken, rule } = body as { accessToken: string; rule: AdRule };

    if (!accessToken?.trim()) {
      return NextResponse.json(
        { success: false, error: "Meta Access Token wajib diisi." },
        { status: 400 }
      );
    }

    if (!rule || !rule.accountIds?.length) {
      return NextResponse.json(
        { success: false, error: "Rule dan daftar Ad Account wajib dipilih." },
        { status: 400 }
      );
    }

    const token = accessToken.trim();
    const syncedAccounts: string[] = [];
    const errors: string[] = [];

    // Map rule to Meta adrules_library format
    const entityType = rule.level; // AD, ADSET, CAMPAIGN
    const primaryCond = rule.conditions[0];
    const metricField = primaryCond?.metric === "cpr" ? "cost_per_result" : primaryCond?.metric || "spend";
    const operator = primaryCond?.operator || "GREATER_THAN";
    const val = primaryCond?.value || 0;

    const evaluationSpec = {
      evaluation_type: "SCHEDULE",
      filters: [
        {
          field: "entity_type",
          operator: "EQUAL",
          value: entityType,
        },
        {
          field: metricField,
          operator: operator,
          value: val,
        },
        {
          field: "time_preset",
          operator: "EQUAL",
          value: rule.timeWindow === "today" ? "TODAY" : "LAST_7D",
        },
      ],
    };

    const executionSpec = {
      execution_type: rule.action === "SEND_NOTIFICATION" ? "NOTIFICATION" : "PAUSE",
    };

    const scheduleSpec = {
      schedule_type: "SEMI_HOURLY",
    };

    for (const rawAccountId of rule.accountIds) {
      const accountId = rawAccountId.trim().startsWith("act_")
        ? rawAccountId.trim()
        : `act_${rawAccountId.trim()}`;

      try {
        const createUrl = `https://graph.facebook.com/v20.0/${accountId}/adrules_library`;
        const params = new URLSearchParams();
        params.append("access_token", token);
        params.append("name", rule.name);
        params.append("status", rule.enabled ? "ENABLED" : "DISABLED");
        params.append("evaluation_spec", JSON.stringify(evaluationSpec));
        params.append("execution_spec", JSON.stringify(executionSpec));
        params.append("schedule_spec", JSON.stringify(scheduleSpec));

        const res = await fetch(createUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params.toString(),
        });

        const json = await res.json();
        if (json.id) {
          syncedAccounts.push(accountId);
        } else if (json.error) {
          errors.push(`${accountId}: ${json.error.message}`);
        }
      } catch (err) {
        errors.push(`${accountId}: ${err instanceof Error ? err.message : "Network error"}`);
      }
    }

    return NextResponse.json({
      success: syncedAccounts.length > 0,
      syncedAccounts,
      errors,
      msg: syncedAccounts.length > 0
        ? `✅ Rule berhasil disinkronkan ke ${syncedAccounts.length} akun di Meta Ads Manager!`
        : `Gagal sinkron ke Meta: ${errors.join(", ")}`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error saat sync rule ke Meta.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
