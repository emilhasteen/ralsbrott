import { smartdokFetch, jsonResponse, errorResponse } from "../_smartdok.js";

export async function onRequestGet({ params, env }) {
  const id = params.id;
  if (!/^\d+$/.test(id)) {
    return errorResponse(400, "Invoice id must be numeric");
  }

  const r = await smartdokFetch(env, `/Invoices/${id}`);
  if (r.status === 404) return errorResponse(404, `Invoice ${id} not found`);
  if (!r.ok) {
    return errorResponse(r.status, `Upstream error (${r.status})`);
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
    lines: (inv.InvoiceLines ?? []).map((l) => ({
      lineType: l.InvoiceLineType,
      lineTypeId: l.InvoiceLineTypeId,
      detail: l.Detail,
      code: l.Code,
      lineText: l.LineText,
      quantity: l.Quantity,
      price: l.Price,
      sum: l.Sum,
      unitType: l.UnitType,
    })),
  });
}
