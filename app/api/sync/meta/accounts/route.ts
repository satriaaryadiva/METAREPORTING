import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accessToken } = body;

    if (!accessToken || !accessToken.trim()) {
      return NextResponse.json(
        { success: false, error: "Access Token Meta wajib diisi." },
        { status: 400 }
      );
    }

    const cleanToken = accessToken.trim();
    const url = new URL("https://graph.facebook.com/v20.0/me/adaccounts");
    url.searchParams.set("access_token", cleanToken);
    url.searchParams.set("fields", "id,account_id,name,account_status,currency");
    url.searchParams.set("limit", "100");

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

    const accounts = (json.data || []).map((acc: any) => ({
      id: acc.id, // e.g. "act_123456789"
      accountId: acc.account_id,
      name: acc.name || acc.id,
      currency: acc.currency || "USD",
      status: acc.account_status === 1 ? "ACTIVE" : "DISABLED",
    }));

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
