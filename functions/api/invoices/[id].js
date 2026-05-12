import { smartdokFetch, jsonResponse, errorResponse } from "../_smartdok.js";

export async function onRequestGet({ params, env }) {
  const id = params.id;
  if (!/^\d+$/.test(id)) {
    return errorResponse(400, "Invoice id must be numeric");
  }

  const r = await smartdokFetch(env, `/Invoices/${id}`);
  if (r.status === 404) return errorResponse(404, `Invoice ${id} not found`);
  if (!r.ok) {
    return errorResponse(r.status, `SmartDok upstream error: ${await r.text()}`);
  }

  const inv = await r.json();
  return jsonResponse({
    id: inv.Id,
    serial: inv.SerialNumber,
    title: inv.Title,
    customer: inv.CustomerName,
    dateFrom: (inv.DateFrom ?? "").slice(0, 10),
    dateTo: (inv.DateTo ?? "").slice(0, 10),
    total: inv.TotalPrice,
    lineCount: (inv.InvoiceLines ?? []).length,
    summary: (inv.InvoiceSummary ?? []).map((s) => ({
      name: s.Name,
      lineType: s.InvoiceLineType,
      quantity: s.Quantity,
      price: s.Price,
      unitType: s.UnitType,
      code: s.Code,
    })),
  });
}
