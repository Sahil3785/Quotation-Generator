import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const table = searchParams.get('table');
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
  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(table)}?maxRecords=1&sort%5B0%5D%5Bfield%5D=Quotation%20ID&sort%5B0%5D%5Bdirection%5D=desc&fields%5B%5D=Quotation%20ID`;
  const res = await fetch(url, { headers, cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json({ error: data?.error?.message || 'Airtable fetch failed' }, { status: res.status });
  }
  let nextId = 'Q-00001';
  if (data.records && data.records.length > 0) {
    const lastId = data.records[0]?.fields?.['Quotation ID'] as string | undefined;
    if (lastId) {
      const lastNum = parseInt(String(lastId).split('-')[1]);
      if (!Number.isNaN(lastNum)) nextId = `Q-${String(lastNum + 1).padStart(5, '0')}`;
    }
  }
  return NextResponse.json({ nextId });
}


