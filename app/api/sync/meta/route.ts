import { NextRequest, NextResponse } from "next/server";
import { CampaignRawRow, CampaignStatus } from "@/types/campaign-report";
import { extractRefCode } from "@/lib/campaign-parser";

interface MetaAction {
  action_type: string;
  value: string | number;
}

interface MetaInsightItem {
  account_id: string;
  account_name?: string;
  campaign_id: string;
  campaign_name: string;
  spend?: string;
  actions?: MetaAction[];
  delivery_status?: string;
  objective?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accessToken, adAccountIds, datePreset = "today" } = body;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: "Access Token Meta Ads wajib diisi." },
        { status: 400 }
      );
    }

    if (!adAccountIds || !Array.isArray(adAccountIds) || adAccountIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Pilih minimal 1 Ad Account ID (contoh: act_123456789)." },
        { status: 400 }
      );
    }

    const allCampaignRows: CampaignRawRow[] = [];
    const errors: string[] = [];

    // Fetch in parallel for each Ad Account
    for (const rawAccountId of adAccountIds) {
      const cleanAccountId = rawAccountId.trim().startsWith("act_")
        ? rawAccountId.trim()
        : `act_${rawAccountId.trim()}`;

      try {
        // 1. Fetch Insights (Spend, Result/Website Registration, Campaign Name)
        const insightsUrl = new URL(
          `https://graph.facebook.com/v20.0/${cleanAccountId}/insights`
        );
        insightsUrl.searchParams.set("access_token", accessToken.trim());
        insightsUrl.searchParams.set("level", "campaign");
        insightsUrl.searchParams.set(
          "fields",
          "account_id,account_name,campaign_id,campaign_name,spend,actions,objective"
        );
        insightsUrl.searchParams.set("date_preset", datePreset);
        insightsUrl.searchParams.set("limit", "500");

        // 2. Fetch Campaign effective status (Active / Paused / OFF)
        const campaignsUrl = new URL(
          `https://graph.facebook.com/v20.0/${cleanAccountId}/campaigns`
        );
        campaignsUrl.searchParams.set("access_token", accessToken.trim());
        campaignsUrl.searchParams.set("fields", "id,name,effective_status,status");
        campaignsUrl.searchParams.set("limit", "500");

        const [insightsRes, campaignsRes] = await Promise.all([
          fetch(insightsUrl.toString(), { next: { revalidate: 0 } }),
          fetch(campaignsUrl.toString(), { next: { revalidate: 0 } }),
        ]);

        const insightsJson = await insightsRes.json();
        const campaignsJson = await campaignsRes.json();

        if (insightsJson.error) {
          throw new Error(insightsJson.error.message || `Error pada akun ${cleanAccountId}`);
        }

        // Map campaign status
        const statusMap = new Map<string, CampaignStatus>();
        if (campaignsJson.data && Array.isArray(campaignsJson.data)) {
          for (const camp of campaignsJson.data) {
            const rawStatus = (camp.effective_status || camp.status || "").toUpperCase();
            if (rawStatus === "ACTIVE") {
              statusMap.set(camp.id, "Active");
            } else if (rawStatus === "PAUSED" || rawStatus === "ARCHIVED" || rawStatus === "INACTIVE") {
              statusMap.set(camp.id, "OFF");
            } else if (rawStatus === "DISAPPROVED" || rawStatus === "WITH_ISSUES") {
              statusMap.set(camp.id, "Not approved");
            } else if (rawStatus === "DELETED") {
              statusMap.set(camp.id, "Deleted");
            } else {
              statusMap.set(camp.id, "OFF");
            }
          }
        }

        // Process Insights Rows
        const items: MetaInsightItem[] = insightsJson.data || [];

        // Also if campaign has no spend today but exists in campaignsJson, we can list them or focus on active insights
        for (const item of items) {
          const spend = parseFloat(item.spend || "0") || 0;

          // Extract registration results
          let results = 0;
          if (item.actions && Array.isArray(item.actions)) {
            const regAction = item.actions.find(
              (a) =>
                a.action_type === "offsite_conversion.fb_pixel_complete_registration" ||
                a.action_type === "complete_registration" ||
                a.action_type === "omni_complete_registration" ||
                a.action_type === "lead" ||
                a.action_type.includes("registration")
            );
            if (regAction) {
              results = parseInt(String(regAction.value), 10) || 0;
            } else {
              // Fallback to first conversion action
              const fallbackAction = item.actions[0];
              if (fallbackAction) {
                results = parseInt(String(fallbackAction.value), 10) || 0;
              }
            }
          }

          const campaignName = item.campaign_name || "Untitled Campaign";
          const accountName = item.account_name || cleanAccountId;
          const { display: extractedRef } = extractRefCode(campaignName);
          const deliveryStatus = statusMap.get(item.campaign_id) || (spend > 0 ? "Active" : "OFF");

          allCampaignRows.push({
            id: `meta_${item.campaign_id}_${cleanAccountId}`,
            account: accountName,
            accountId: cleanAccountId,
            campaignName,
            spent: spend,
            results,
            extractedRef,
            deliveryStatus,
          });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${cleanAccountId}: ${msg}`);
      }
    }

    if (allCampaignRows.length === 0 && errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Gagal menarik data Meta: ${errors.join("; ")}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: allCampaignRows,
      count: allCampaignRows.length,
      errors: errors.length > 0 ? errors : undefined,
      syncedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan server saat sinkronisasi Meta.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
