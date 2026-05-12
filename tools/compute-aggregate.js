export function computeAggregate(invoice) {
  const subtotal = invoice.lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  return {
    invoiceId: invoice.id,
    vendor: invoice.vendor,
    date: invoice.date,
    currency: invoice.currency,
    lineItemCount: invoice.lineItems.length,
    subtotal,
  };
}
