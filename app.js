import { greeting, handleTurn } from "./workflows/invoice-aggregate.js";

const transcript = document.getElementById("transcript");
const form = document.getElementById("prompt-form");
const input = document.getElementById("prompt-input");

function append(role, content) {
  const el = document.createElement("div");
  el.className = `msg msg-${role}`;
  if (typeof content === "string") {
    el.textContent = content;
  } else {
    el.appendChild(content);
  }
  transcript.appendChild(el);
  transcript.scrollTop = transcript.scrollHeight;
  return el;
}

function appendLoading() {
  const el = document.createElement("div");
  el.className = "msg msg-system msg-loading";
  el.textContent = "…";
  transcript.appendChild(el);
  transcript.scrollTop = transcript.scrollHeight;
  return el;
}

function fmtNumber(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 2 }).format(n);
}

function submitWith(text) {
  input.value = text;
  form.requestSubmit();
}

function renderList(response) {
  const wrap = document.createElement("div");

  const meta = document.createElement("div");
  meta.className = "list-meta";
  meta.textContent = `Invoices ${response.from} → ${response.to} (${response.invoices.length})`;
  wrap.appendChild(meta);

  if (!response.invoices.length) {
    const empty = document.createElement("div");
    empty.textContent = "No invoices in this range.";
    wrap.appendChild(empty);
    return wrap;
  }

  const ul = document.createElement("ul");
  ul.className = "invoice-list";
  for (const inv of response.invoices) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "invoice-row-button";
    const parts = [`#${inv.id}`];
    if (inv.serial) parts.push(`[${inv.serial}]`);
    if (inv.customer) parts.push(inv.customer);
    if (inv.date) parts.push(inv.date);
    parts.push(fmtNumber(inv.total));
    btn.textContent = parts.join(" · ");
    btn.addEventListener("click", () => submitWith(String(inv.id)));
    li.appendChild(btn);
    ul.appendChild(li);
  }
  wrap.appendChild(ul);
  return wrap;
}

const MODIFIERS = ["dag", "kväll", "natt", "helg", "storhelg"];

function appendSection(parent, heading, columns, rows, rowFn, emptyText = "(none)") {
  const h = document.createElement("div");
  h.className = "aggregate-subheading";
  h.textContent = heading;
  parent.appendChild(h);

  if (!rows.length) {
    const empty = document.createElement("div");
    empty.className = "section-empty";
    empty.textContent = emptyText;
    parent.appendChild(empty);
    return;
  }

  const table = document.createElement("table");
  table.className = "aggregate-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  for (const c of columns) {
    const th = document.createElement("th");
    th.textContent = c;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  for (const row of rows) {
    const tr = document.createElement("tr");
    for (const cell of rowFn(row)) {
      const td = document.createElement("td");
      td.textContent = String(cell);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  parent.appendChild(table);
}

function renderAggregate(a) {
  const wrap = document.createElement("div");

  const title = document.createElement("div");
  title.className = "aggregate-title";
  const titleParts = [`#${a.invoiceId}`];
  if (a.serial) titleParts.push(`[${a.serial}]`);
  if (a.title) titleParts.push(`— ${a.title}`);
  title.textContent = titleParts.join(" ");
  wrap.appendChild(title);

  const dl = document.createElement("dl");
  dl.className = "aggregate-fields";
  const fields = [
    ["Customer", a.customer ?? "—"],
    ["Period", `${a.dateFrom ?? ""} → ${a.dateTo ?? ""}`],
    ["Line items", String(a.lineCount)],
    ["Invoice total", fmtNumber(a.total)],
  ];
  for (const [label, value] of fields) {
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    dl.append(dt, dd);
  }
  wrap.appendChild(dl);

  appendSection(
    wrap,
    "Machines",
    ["Machine", "Person", "Shift", "Hours", "Price"],
    a.machineRows,
    (r) => [
      r.machine,
      r.person ?? "—",
      r.modifier,
      fmtNumber(r.hours),
      fmtNumber(r.price),
    ],
  );

  appendSection(
    wrap,
    "Mantimmar",
    ["Person", "Shift", "Hours", "Workhour", "Addition", "Total"],
    a.mantimmarRows,
    (r) => [
      r.person ?? "—",
      r.modifier,
      fmtNumber(r.hours),
      fmtNumber(r.workhourPrice),
      fmtNumber(r.additionPrice),
      fmtNumber(r.workhourPrice + r.additionPrice),
    ],
  );

  appendSection(
    wrap,
    "Others",
    ["Description", "Qty", "Unit", "Price"],
    a.others,
    (r) => [r.label, fmtNumber(r.quantity), r.unitType ?? "", fmtNumber(r.price)],
  );

  appendSection(
    wrap,
    "Ej mappat",
    ["Date", "Person", "Shift", "Hours", "Price"],
    a.ejMappat,
    (r) => [r.date, r.person ?? "—", r.modifier, fmtNumber(r.hours), fmtNumber(r.price)],
  );

  const machineTotalRows = MODIFIERS.map((m) => ({
    modifier: m,
    hours: a.machineHoursByModifier[m] || 0,
    price: a.machinePriceByModifier[m] || 0,
  })).filter((r) => r.hours > 0 || r.price > 0);
  appendSection(
    wrap,
    "Total machines per shift",
    ["Shift", "Hours", "Price"],
    machineTotalRows,
    (r) => [r.modifier, fmtNumber(r.hours), fmtNumber(r.price)],
  );

  const mantimmarTotalRows = MODIFIERS.map((m) => ({
    modifier: m,
    hours: a.mantimmarHoursByModifier[m] || 0,
    price: a.mantimmarPriceByModifier[m] || 0,
  })).filter((r) => r.hours > 0 || r.price > 0);
  appendSection(
    wrap,
    "Total Mantimmar per shift",
    ["Shift", "Hours", "Price"],
    mantimmarTotalRows,
    (r) => [r.modifier, fmtNumber(r.hours), fmtNumber(r.price)],
  );

  const s = a.grandSummary;
  const summaryRows = [
    { label: "Machines", hours: s.machineHours, price: s.machinePrice },
    { label: "Mantimmar", hours: s.mantimmarHours, price: s.mantimmarPrice },
    { label: "Others", hours: s.othersQty, price: s.othersPrice },
  ];
  if (s.ejMappatHours > 0 || s.ejMappatPrice > 0) {
    summaryRows.push({
      label: "Ej mappat",
      hours: s.ejMappatHours,
      price: s.ejMappatPrice,
    });
  }
  summaryRows.push({ label: "Grand total", hours: null, price: s.grandPrice });

  appendSection(
    wrap,
    "Summary",
    ["", "Hours", "Price"],
    summaryRows,
    (r) => [r.label, r.hours == null ? "" : fmtNumber(r.hours), fmtNumber(r.price)],
  );

  return wrap;
}

function renderResponse(response) {
  switch (response.kind) {
    case "text":
      append("system", response.text);
      return;
    case "list":
      append("system", renderList(response));
      return;
    case "aggregate":
      append("system", renderAggregate(response.aggregate));
      return;
  }
}

append("system", greeting);

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = input.value;
  if (!text.trim()) return;
  append("user", text);
  input.value = "";

  const loading = appendLoading();
  try {
    const response = await handleTurn(text);
    loading.remove();
    renderResponse(response);
  } catch (e) {
    loading.remove();
    append("system", `Unexpected error: ${e.message}`);
  }
});
