import { parseIntent } from "../agents/invoice-prompt-agent.js";
import { listInvoices } from "../tools/list-invoices.js";
import { getInvoice } from "../tools/get-invoice.js";
import { computeAggregate } from "../tools/compute-aggregate.js";

export const greeting =
  "Which invoice would you like to see an aggregate on? Type an invoice number (e.g. INV-001 or just 1), or 'list' to see all.";

export function handleTurn(input) {
  const intent = parseIntent(input);

  switch (intent.intent) {
    case "noop":
      return { kind: "text", text: "Please enter an invoice number or 'list'." };

    case "help":
      return {
        kind: "text",
        text: "Type an invoice number (e.g. INV-001), 'list' to see all invoices, or 'help'.",
      };

    case "list":
      return { kind: "list", invoices: listInvoices() };

    case "aggregate": {
      const inv = getInvoice(intent.invoiceId);
      if (!inv) {
        return {
          kind: "text",
          text: `Invoice ${intent.invoiceId} not found. Type 'list' to see options.`,
        };
      }
      return { kind: "aggregate", aggregate: computeAggregate(inv) };
    }

    case "unknown":
      return {
        kind: "text",
        text: `I didn't understand "${intent.raw}". Type 'help' for options.`,
      };
  }
}
