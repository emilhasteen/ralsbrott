export const MODIFIERS = ["dag", "kväll", "natt", "helg", "storhelg"];
const MODIFIER_ORDER = { dag: 0, kväll: 1, natt: 2, helg: 3, storhelg: 4 };

function parseDate(lineText) {
  if (!lineText) return null;
  const m = lineText.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function parsePerson(lineText, lineType) {
  if (!lineText) return null;
  if (lineType === "Workhour") {
    // Workhour comments may contain commas (e.g. "km 262,263"), so anchor on the trailing HH:MM range.
    const m = lineText.match(/,\s*([^,]+?)\s*,\s*\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}\s*$/);
    return m ? m[1].trim() : null;
  }
  const parts = lineText.split(",").map((s) => s.trim());
  return parts[2] || null;
}

function modifierFromDetail(detail) {
  if (!detail) return null;
  const d = detail.toLowerCase();
  if (d.includes("storhelg")) return "storhelg";
  if (d.includes("kväll") || d.includes("kveld")) return "kväll";
  if (d.includes("natt")) return "natt";
  if (d.includes("helg")) return "helg";
  return null;
}

function emptyModifierMap() {
  return { dag: 0, kväll: 0, natt: 0, helg: 0, storhelg: 0 };
}

export function computeAggregate(invoice) {
  const lines = invoice.lines ?? [];

  const buckets = new Map();
  function bucket(person, date) {
    const key = `${person ?? ""}__${date}`;
    let b = buckets.get(key);
    if (!b) {
      b = {
        person,
        date,
        whHours: 0,
        whPrice: 0,
        addHours: emptyModifierMap(),
        addPrice: emptyModifierMap(),
        machines: new Map(),
      };
      buckets.set(key, b);
    }
    return b;
  }

  const others = [];

  for (const line of lines) {
    if (line.lineType === "CustomLine") {
      others.push({
        label: line.lineText || line.detail || "(custom)",
        quantity: line.quantity || 0,
        unitType: line.unitType,
        price: line.sum || 0,
      });
      continue;
    }

    const date = parseDate(line.lineText);
    if (!date) continue;
    const person = parsePerson(line.lineText, line.lineType);

    if (line.lineType === "Workhour") {
      const b = bucket(person, date);
      b.whHours += line.quantity || 0;
      b.whPrice += line.sum || 0;
    } else if (line.lineType === "MachineHours") {
      const b = bucket(person, date);
      const name = line.detail || "(unknown machine)";
      const m = b.machines.get(name) || { hours: 0, price: 0 };
      m.hours += line.quantity || 0;
      m.price += line.sum || 0;
      b.machines.set(name, m);
    } else if (line.lineType === "UnitAddition") {
      const mod = modifierFromDetail(line.detail);
      if (!mod) continue;
      const b = bucket(person, date);
      b.addHours[mod] += line.quantity || 0;
      b.addPrice[mod] += line.sum || 0;
    }
  }

  const machineRows = new Map();
  const mantimmarRows = new Map();
  const ejMappat = [];

  for (const b of buckets.values()) {
    const additionHoursTotal =
      b.addHours.kväll + b.addHours.natt + b.addHours.helg + b.addHours.storhelg;
    const hasWh = b.whHours > 0;
    const hasMachine = b.machines.size > 0;
    const hasAdd = additionHoursTotal > 0;

    if (hasAdd && !hasWh && !hasMachine) {
      for (const mod of MODIFIERS) {
        if (b.addHours[mod] > 0) {
          ejMappat.push({
            person: b.person,
            date: b.date,
            label: `Addition: ${mod}`,
            hours: b.addHours[mod],
            price: b.addPrice[mod],
          });
        }
      }
      continue;
    }

    if (!hasWh && !hasMachine) continue;

    const baselineHours = hasWh ? b.whHours : additionHoursTotal;

    // Overlap: a single hour is tagged with more than one modifier (e.g. a Sunday evening hour
    // counted as both kväll and helg). A clean proportional split would silently invent fractional
    // hours, so dump the whole bucket — machines, workhour, additions — into Ej mappat instead.
    if (additionHoursTotal > baselineHours) {
      for (const [name, { hours, price }] of b.machines) {
        ejMappat.push({
          person: b.person,
          date: b.date,
          label: `Machine: ${name}`,
          hours,
          price,
        });
      }
      if (hasWh) {
        ejMappat.push({
          person: b.person,
          date: b.date,
          label: "Workhour",
          hours: b.whHours,
          price: b.whPrice,
        });
      }
      for (const mod of MODIFIERS) {
        if (b.addHours[mod] > 0) {
          ejMappat.push({
            person: b.person,
            date: b.date,
            label: `Addition: ${mod}`,
            hours: b.addHours[mod],
            price: b.addPrice[mod],
          });
        }
      }
      continue;
    }

    const modHours = {
      dag: 0,
      kväll: b.addHours.kväll,
      natt: b.addHours.natt,
      helg: b.addHours.helg,
      storhelg: b.addHours.storhelg,
    };
    modHours.dag = Math.max(0, baselineHours - additionHoursTotal);

    const totalHours = modHours.dag + additionHoursTotal;
    if (totalHours <= 0) continue;

    for (const mod of MODIFIERS) {
      const h = modHours[mod];
      if (h <= 0) continue;
      const fraction = h / totalHours;

      for (const [name, { hours, price }] of b.machines) {
        const mkey = `${name}__${b.person ?? ""}__${mod}`;
        const r = machineRows.get(mkey) || {
          machine: name,
          person: b.person,
          modifier: mod,
          hours: 0,
          price: 0,
        };
        r.hours += hours * fraction;
        r.price += price * fraction;
        machineRows.set(mkey, r);
      }

      const pkey = `${b.person ?? ""}__${mod}`;
      const mr = mantimmarRows.get(pkey) || {
        person: b.person,
        modifier: mod,
        hours: 0,
        workhourPrice: 0,
        additionPrice: 0,
      };
      mr.hours += h;
      if (hasWh) mr.workhourPrice += b.whPrice * fraction;
      if (mod !== "dag") mr.additionPrice += b.addPrice[mod];
      mantimmarRows.set(pkey, mr);
    }
  }

  const sortedMachineRows = [...machineRows.values()].sort(
    (a, b) =>
      (a.machine || "").localeCompare(b.machine || "") ||
      (a.person || "").localeCompare(b.person || "") ||
      MODIFIER_ORDER[a.modifier] - MODIFIER_ORDER[b.modifier],
  );

  const sortedMantimmarRows = [...mantimmarRows.values()].sort(
    (a, b) =>
      (a.person || "").localeCompare(b.person || "") ||
      MODIFIER_ORDER[a.modifier] - MODIFIER_ORDER[b.modifier],
  );

  ejMappat.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      (a.person || "").localeCompare(b.person || "") ||
      (a.label || "").localeCompare(b.label || ""),
  );

  const machineHoursByModifier = emptyModifierMap();
  const machinePriceByModifier = emptyModifierMap();
  for (const r of sortedMachineRows) {
    machineHoursByModifier[r.modifier] += r.hours;
    machinePriceByModifier[r.modifier] += r.price;
  }

  const mantimmarHoursByModifier = emptyModifierMap();
  const mantimmarPriceByModifier = emptyModifierMap();
  for (const r of sortedMantimmarRows) {
    mantimmarHoursByModifier[r.modifier] += r.hours;
    mantimmarPriceByModifier[r.modifier] += r.workhourPrice + r.additionPrice;
  }

  const totalMachineHours = MODIFIERS.reduce(
    (s, m) => s + machineHoursByModifier[m],
    0,
  );
  const totalMachinePrice = MODIFIERS.reduce(
    (s, m) => s + machinePriceByModifier[m],
    0,
  );
  const totalMantimmarHours = MODIFIERS.reduce(
    (s, m) => s + mantimmarHoursByModifier[m],
    0,
  );
  const totalMantimmarPrice = MODIFIERS.reduce(
    (s, m) => s + mantimmarPriceByModifier[m],
    0,
  );
  const totalOthersQty = others.reduce((s, o) => s + o.quantity, 0);
  const totalOthersPrice = others.reduce((s, o) => s + o.price, 0);
  const totalEjMappatHours = ejMappat.reduce((s, e) => s + e.hours, 0);
  const totalEjMappatPrice = ejMappat.reduce((s, e) => s + e.price, 0);

  return {
    invoiceId: invoice.id,
    serial: invoice.serial,
    title: invoice.title,
    customer: invoice.customer,
    dateFrom: invoice.dateFrom,
    dateTo: invoice.dateTo,
    total: invoice.total,
    lineCount: invoice.lineCount,
    machineRows: sortedMachineRows,
    mantimmarRows: sortedMantimmarRows,
    others,
    ejMappat,
    machineHoursByModifier,
    machinePriceByModifier,
    mantimmarHoursByModifier,
    mantimmarPriceByModifier,
    grandSummary: {
      machineHours: totalMachineHours,
      machinePrice: totalMachinePrice,
      mantimmarHours: totalMantimmarHours,
      mantimmarPrice: totalMantimmarPrice,
      othersQty: totalOthersQty,
      othersPrice: totalOthersPrice,
      ejMappatHours: totalEjMappatHours,
      ejMappatPrice: totalEjMappatPrice,
      grandPrice:
        totalMachinePrice +
        totalMantimmarPrice +
        totalOthersPrice +
        totalEjMappatPrice,
    },
  };
}
