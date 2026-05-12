export function computeAggregate(invoice) {
  return {
    invoiceId: invoice.id,
    serial: invoice.serial,
    title: invoice.title,
    customer: invoice.customer,
    dateFrom: invoice.dateFrom,
    dateTo: invoice.dateTo,
    total: invoice.total,
    lineCount: invoice.lineCount,
    rows: invoice.summary ?? [],
  };
}
