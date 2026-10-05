import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accessToken, businessId } = body;

    if (!accessToken || !accessToken.trim()) {
      return NextResponse.json(
        { success: false, error: "Access Token Meta wajib diisi." },
        { status: 400 }
      );
    }

    const cleanToken = accessToken.trim();
    const cleanBmId = businessId?.trim();
    let rawAccounts: any[] = [];

    if (cleanBmId) {
      // Fetch from Business Manager (both owned_ad_accounts and client_ad_accounts)
      const fetchBmAccounts = async (type: "owned_ad_accounts" | "client_ad_accounts") => {
        const url = new URL(`https://graph.facebook.com/v20.0/${cleanBmId}/${type}`);
        url.searchParams.set("access_token", cleanToken);
        url.searchParams.set("fields", "id,account_id,name,account_status,currency");
        url.searchParams.set("limit", "200");
        const res = await fetch(url.toString(), { next: { revalidate: 0 } });
        const json = await res.json();
        return Array.isArray(json.data) ? json.data : [];
      };

      try {
        const [owned, client] = await Promise.all([
          fetchBmAccounts("owned_ad_accounts"),
          fetchBmAccounts("client_ad_accounts"),
        ]);
        rawAccounts = [...owned, ...client];
      } catch (_) {}
    }

    // Fallback or default: Fetch all ad accounts under user (/me/adaccounts)
    if (rawAccounts.length === 0) {
      const url = new URL("https://graph.facebook.com/v20.0/me/adaccounts");
      url.searchParams.set("access_token", cleanToken);
      url.searchParams.set("fields", "id,account_id,name,account_status,currency");
      url.searchParams.set("limit", "200");

      const res = await fetch(url.toString(), { next: { revalidate: 0 } });
      const json = await res.json();

      if (json.error) {
        return NextResponse.json(
          {
            success: false,
            error: json.error.message || "Gagal mengambil daftar Ad Account dari Meta.",
          },
          { status: 400 }
        );
      }
      rawAccounts = json.data || [];
    }

    // Deduplicate by account id
    const seen = new Set<string>();
    const accounts = [];

    for (const acc of rawAccounts) {
      const id = acc.id || `act_${acc.account_id}`;
      if (!seen.has(id)) {
        seen.add(id);
        accounts.push({
          id: id,
          accountId: acc.account_id || id.replace("act_", ""),
          name: acc.name || id,
          currency: acc.currency || "USD",
          status: acc.account_status === 1 ? "ACTIVE" : "DISABLED",
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: accounts,
      count: accounts.length,
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error
        ? err.message
        : "Terjadi kesalahan saat mendeteksi akun Meta.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
