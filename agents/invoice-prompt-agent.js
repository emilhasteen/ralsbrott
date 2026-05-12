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

  const idMatch = text.match(/^#?(\d+)$/);
  if (idMatch) {
    return { intent: "aggregate", invoiceId: idMatch[1] };
  }

  return { intent: "unknown", raw: text };
}
