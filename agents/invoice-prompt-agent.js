export function parseIntent(input) {
  const text = input.trim();
  if (!text) return { intent: "noop" };

  const lower = text.toLowerCase();
  if (lower === "list" || lower === "ls" || lower === "all") {
    return { intent: "list" };
  }
  if (lower === "help" || lower === "?") {
    return { intent: "help" };
  }

  const idMatch = text.match(/^(?:inv[-\s]?)?0*(\d+)$/i);
  if (idMatch) {
    const padded = idMatch[1].padStart(3, "0");
    return { intent: "aggregate", invoiceId: `INV-${padded}` };
  }

  return { intent: "unknown", raw: text };
}
