export const invoices = [
  {
    id: "INV-001",
    vendor: "Acme Corp",
    date: "2026-01-15",
    currency: "USD",
    lineItems: [
      { description: "Widget A", quantity: 10, unitPrice: 25 },
      { description: "Widget B", quantity: 5, unitPrice: 40 },
    ],
  },
  {
    id: "INV-002",
    vendor: "Globex",
    date: "2026-02-03",
    currency: "USD",
    lineItems: [
      { description: "Consulting hours", quantity: 12, unitPrice: 150 },
    ],
  },
  {
    id: "INV-003",
    vendor: "Initech",
    date: "2026-02-21",
    currency: "EUR",
    lineItems: [
      { description: "Software license", quantity: 1, unitPrice: 1200 },
      { description: "Support add-on", quantity: 1, unitPrice: 200 },
      { description: "Training session", quantity: 2, unitPrice: 350 },
    ],
  },
];
