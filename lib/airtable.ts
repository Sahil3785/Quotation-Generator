// Client-side safe wrappers that call server API routes.
// This ensures Airtable API key stays server-side only.

export async function fetchAirtableData(table: string) {
  const res = await fetch(`/api/airtable/fetch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.records || [];
}

export async function createAirtableRecord(table: string, fields: Record<string, any>) {
  const res = await fetch(`/api/airtable/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, fields }),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function updateAirtableRecord(table: string, recordId: string, fields: Record<string, any>) {
  const res = await fetch(`/api/airtable/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, recordId, fields }),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function getNextQuotationId(quotationsTable: string) {
  const res = await fetch(`/api/airtable/next-id?table=${encodeURIComponent(quotationsTable)}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.nextId as string;
}