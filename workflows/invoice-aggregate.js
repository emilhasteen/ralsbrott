import { parseIntent } from "../agents/invoice-prompt-agent.js";
import { listInvoices } from "../tools/list-invoices.js";
import { getInvoice } from "../tools/get-invoice.js";
import { computeAggregate } from "../tools/compute-aggregate.js";

export const greeting =
  "Which invoice would you like to see an aggregate on? Type an invoice id (numeric), or 'list' to fetch the last 90 days.";

export async function handleTurn(input) {
  const intent = parseIntent(input);

  switch (intent.intent) {
    case "noop":
      return { kind: "text", text: "Please enter an invoice id or 'list'." };

    case "help":
      return {
        kind: "text",
        text: "Type an invoice id (numeric), 'list' to fetch recent invoices, or 'help'.",
      };

    case "list":
      try {
        const result = await listInvoices();
        return {
          kind: "list",
          from: result.from,
          to: result.to,
          invoices: result.invoices,
        };
      } catch (e) {
        return { kind: "text", text: `Failed to load invoices: ${e.message}` };
      }

    case "aggregate":
      try {
        const inv = await getInvoice(intent.invoiceId);
        if (!inv) {
          return {
            kind: "text",
            text: `Invoice ${intent.invoiceId} not found.`,
          };
        }
        return { kind: "aggregate", aggregate: computeAggregate(inv) };
      } catch (e) {
        return {
          kind: "text",
          text: `Failed to load invoice ${intent.invoiceId}: ${e.message}`,
        };
      }

    case "unknown":
      return {
        kind: "text",
        text: `I didn't understand "${intent.raw}". Type 'help' for options.`,
      };
  }
}
