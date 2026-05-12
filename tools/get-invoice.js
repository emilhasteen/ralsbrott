import { invoices } from "../data/invoices.js";

export function getInvoice(id) {
  const target = id.toLowerCase();
  return invoices.find((inv) => inv.id.toLowerCase() === target) ?? null;
}
