import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { table } = await req.json();
  const API_KEY = process.env.AIRTABLE_API_KEY as string | undefined;
  const BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID as string | undefined;
  if (!API_KEY || !BASE_ID || !table) {
    const missing = [
      !API_KEY ? 'AIRTABLE_API_KEY' : null,
      !BASE_ID ? 'NEXT_PUBLIC_AIRTABLE_BASE_ID' : null,
      !table ? 'table' : null,
    ].filter(Boolean);
    return NextResponse.json({ error: 'Missing configuration or table name', missing }, { status: 400 });
  }
  const headers = {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  } as const;
  const encoded = encodeURIComponent(String(table));
  const url = `https://api.airtable.com/v0/${BASE_ID}/${encoded}`;
  const res = await fetch(url, { headers, cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json({ error: data?.error?.message || 'Airtable fetch failed' }, { status: res.status });
  }
  return NextResponse.json({ records: data.records || [] });
}


