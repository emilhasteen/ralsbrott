export async function getInvoice(id) {
  const r = await fetch(`/api/invoices/${encodeURIComponent(id)}`);
  if (r.status === 404) return null;
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`Failed to fetch invoice ${id} (${r.status}): ${body}`);
  }
  return r.json();
}
