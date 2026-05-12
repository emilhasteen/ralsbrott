import { invoices } from "../data/invoices.js";

export function listInvoices() {
  return invoices.map(({ id, vendor, date }) => ({ id, vendor, date }));
}
