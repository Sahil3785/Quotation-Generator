const API_KEY = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY!;
const BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID!;
const CLIENTS_TABLE = process.env.NEXT_PUBLIC_AIRTABLE_CLIENTS_TABLE!;
const PRODUCTS_TABLE = process.env.NEXT_PUBLIC_AIRTABLE_PRODUCTS_TABLE!;
const QUOTATIONS_TABLE = process.env.NEXT_PUBLIC_AIRTABLE_QUOTATIONS_TABLE!;
const TEAM_TABLE = process.env.NEXT_PUBLIC_AIRTABLE_TEAM_TABLE!;

const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

export async function fetchAirtableData(table: string) {
  const encoded = encodeURIComponent(table);
  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${encoded}`, {
    headers,
    cache: "no-store",
  });

  if (!res.ok) throw new Error("Failed to fetch from Airtable");
  const data = await res.json();
  return data.records || [];
}

export async function createAirtableRecord(table: string, fields: Record<string, any>) {
  const encoded = encodeURIComponent(table);
  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${encoded}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ fields }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Airtable create failed');
  return data;
}

export async function updateAirtableRecord(table: string, recordId: string, fields: Record<string, any>) {
  const encoded = encodeURIComponent(table);
  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${encoded}/${recordId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ fields }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Airtable update failed');
  return data;
}

export async function getNextQuotationId(quotationsTable: string) {
  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(quotationsTable)}?maxRecords=1&sort%5B0%5D%5Bfield%5D=Quotation%20ID&sort%5B0%5D%5Bdirection%5D=desc&fields%5B%5D=Quotation%20ID`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error('Failed to fetch last quotation id');
  const data = await res.json();
  let newQuotationNumber = 'Q-00001';
  if (data.records && data.records.length > 0) {
    const lastId = data.records[0].fields['Quotation ID'] as string;
    if (lastId) {
      const lastNum = parseInt(lastId.split('-')[1]);
      if (!isNaN(lastNum)) newQuotationNumber = `Q-${String(lastNum + 1).padStart(5, '0')}`;
    }
  }
  return newQuotationNumber;
}