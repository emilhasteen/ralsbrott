function parseDate(lineText) {
  if (!lineText) return null;
  const m = lineText.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

// For MachineHours and UnitAddition lines only — workhour LineText has a different layout.
function parsePerson(lineText) {
  if (!lineText) return null;
  const parts = lineText.split(",").map((s) => s.trim());
  return parts[2] || null;
}

// Order matters: check storhelg before helg.
function modifierFor(detail) {
  if (!detail) return null;
  const d = detail.toLowerCase();
  if (d.includes("storhelg")) return "storhelg";
  if (d.includes("kväll") || d.includes("kveld")) return "kväll";
  if (d.includes("natt")) return "natt";
  if (d.includes("helg")) return "helg";
  return null;
}

const MODIFIER_ORDER = { null: 0, kväll: 1, natt: 2, helg: 3, storhelg: 4 };

export function computeAggregate(invoice) {
  const lines = invoice.lines ?? [];

  // Bucket by (person, date)
  const byPersonDate = new Map();
  function bucket(person, date) {
    const key = `${person ?? ""}__${date}`;
    let b = byPersonDate.get(key);
    if (!b) {
      b = { person, date, machineSum: 0, additions: new Map() };
      byPersonDate.set(key, b);
    }
    return b;
  }

  for (const line of lines) {
    const date = parseDate(line.lineText);
    if (!date) continue;
    const person = parsePerson(line.lineText);

    if (line.lineType === "MachineHours") {
      bucket(person, date).machineSum += line.sum || 0;
    } else if (line.lineType === "UnitAddition") {
      const mod = modifierFor(line.detail);
      if (!mod) continue;
      const b = bucket(person, date);
      const cur = b.additions.get(mod) || { hours: 0, sum: 0 };
      cur.hours += line.quantity || 0;
      cur.sum += line.sum || 0;
      b.additions.set(mod, cur);
    }
  }

  // For each (person, date), split machine cost across modifiers in proportion to addition hours.
  // No additions → all machine goes to bare "Maskin".
  const byDateModifier = new Map();
  function dmBucket(date, modifier) {
    const key = `${date}__${modifier ?? ""}`;
    let b = byDateModifier.get(key);
    if (!b) {
      b = { date, modifier, machine: 0, addition: 0 };
      byDateModifier.set(key, b);
    }
    return b;
  }

  for (const { date, machineSum, additions } of byPersonDate.values()) {
    if (additions.size === 0) {
      dmBucket(date, null).machine += machineSum;
      continue;
    }
    const totalAdditionHours = [...additions.values()].reduce(
      (s, v) => s + v.hours,
      0,
    );
    for (const [mod, { hours, sum }] of additions) {
      const target = dmBucket(date, mod);
      target.addition += sum;
      if (totalAdditionHours > 0) {
        target.machine += machineSum * (hours / totalAdditionHours);
      }
    }
  }

  const rows = [...byDateModifier.values()].map((r) => ({
    date: r.date,
    modifier: r.modifier,
    label: r.modifier ? `Maskin ${r.modifier}` : "Maskin",
    machine: r.machine,
    addition: r.addition,
    total: r.machine + r.addition,
  }));

  rows.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      (MODIFIER_ORDER[a.modifier ?? "null"] ?? 99) -
        (MODIFIER_ORDER[b.modifier ?? "null"] ?? 99),
  );

  const grandMachine = rows.reduce((s, r) => s + r.machine, 0);
  const grandAddition = rows.reduce((s, r) => s + r.addition, 0);

  return {
    invoiceId: invoice.id,
    serial: invoice.serial,
    title: invoice.title,
    customer: invoice.customer,
    dateFrom: invoice.dateFrom,
    dateTo: invoice.dateTo,
    total: invoice.total,
    lineCount: invoice.lineCount,
    grandMachine,
    grandAddition,
    grandTotal: grandMachine + grandAddition,
    rows,
  };
}
