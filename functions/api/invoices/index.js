import { smartdokFetch, jsonResponse, errorResponse } from "../_smartdok.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const today = new Date();
  const ninetyDaysAgo = new Date(today.getTime() - 90 * DAY_MS);
  const fromDate = url.searchParams.get("from") ?? isoDate(ninetyDaysAgo);
  const toDate = url.searchParams.get("to") ?? isoDate(today);

  const qs = `fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`;
  const r = await smartdokFetch(env, `/Invoices?${qs}`);
  if (!r.ok) {
    return errorResponse(r.status, `SmartDok upstream error: ${await r.text()}`);
  }

  const data = await r.json();
  const summary = data.map((inv) => ({
    id: inv.Id,
    serial: inv.SerialNumber,
    title: inv.Title,
    customer: inv.CustomerName,
    date: (inv.DateFrom ?? "").slice(0, 10),
    total: inv.TotalPrice,
    isDraft: inv.IsDraft,
    sent: inv.Sent,
    credited: inv.Credited,
  }));
  return jsonResponse({ from: fromDate, to: toDate, invoices: summary });
}
