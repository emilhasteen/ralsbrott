export async function listInvoices({ from, to } = {}) {
  const qs = new URLSearchParams();
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  const url = qs.toString() ? `/api/invoices?${qs}` : "/api/invoices";

  const r = await fetch(url);
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`Failed to list invoices (${r.status}): ${body}`);
  }
  return r.json();
}
