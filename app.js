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
  const rows = [
    ["Customer", a.customer ?? "—"],
    ["Period", `${a.dateFrom ?? ""} → ${a.dateTo ?? ""}`],
    ["Line items", String(a.lineCount)],
    ["Total", fmtNumber(a.total)],
  ];
  for (const [label, value] of rows) {
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    dl.append(dt, dd);
  }
  wrap.appendChild(dl);

  if (a.rows.length) {
    const heading = document.createElement("div");
    heading.className = "aggregate-subheading";
    heading.textContent = "By line type";
    wrap.appendChild(heading);

    const table = document.createElement("table");
    table.className = "aggregate-table";

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    for (const h of ["Type", "Name", "Qty", "Unit", "Price"]) {
      const th = document.createElement("th");
      th.textContent = h;
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    for (const row of a.rows) {
      const tr = document.createElement("tr");
      const cells = [
        row.lineType ?? "",
        row.name ?? "",
        fmtNumber(row.quantity),
        row.unitType ?? "",
        fmtNumber(row.price),
      ];
      for (const c of cells) {
        const td = document.createElement("td");
        td.textContent = String(c);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    wrap.appendChild(table);
  }

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
