import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function config() {
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { url, key, configured: Boolean(url && key) };
}

function headers(key: string) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get("action") || "status";
  const current = config();

  if (action === "status") {
    return NextResponse.json({ configured: current.configured });
  }

  if (!current.configured || !current.url || !current.key) {
    return NextResponse.json(
      { error: "Supabase belum dikonfigurasi." },
      { status: 503 }
    );
  }

  if (action === "pull") {
    const response = await fetch(
      `${current.url}/rest/v1/smkpd_records?select=record_key,module,payload,updated_at&order=updated_at.desc`,
      {
        headers: headers(current.key),
        cache: "no-store",
      }
    );
    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: data?.message || "Cloud pull gagal." },
        { status: response.status }
      );
    }
    return NextResponse.json({ records: data });
  }

  return NextResponse.json({ error: "Action tidak dikenal." }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const action = request.nextUrl.searchParams.get("action");
  const current = config();

  if (!current.configured || !current.url || !current.key) {
    return NextResponse.json(
      { error: "Supabase belum dikonfigurasi." },
      { status: 503 }
    );
  }

  if (action !== "push") {
    return NextResponse.json({ error: "Action tidak dikenal." }, { status: 400 });
  }

  const body = await request.json();
  const records = Array.isArray(body.records) ? body.records : [];
  const payload = records.map((record: any) => ({
    record_key: record.key,
    module: record.module,
    payload: record.data,
    updated_at: record.updatedAt || new Date().toISOString(),
  }));

  if (!payload.length) {
    return NextResponse.json({ count: 0 });
  }

  const response = await fetch(
    `${current.url}/rest/v1/smkpd_records?on_conflict=record_key`,
    {
      method: "POST",
      headers: {
        ...headers(current.key),
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(
      { error: data?.message || "Cloud push gagal." },
      { status: response.status }
    );
  }

  return NextResponse.json({ count: payload.length });
}
