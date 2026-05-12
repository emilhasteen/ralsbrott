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
}

function renderList(items) {
  const ul = document.createElement("ul");
  ul.className = "invoice-list";
  for (const inv of items) {
    const li = document.createElement("li");
    li.textContent = `${inv.id} — ${inv.vendor} (${inv.date})`;
    ul.appendChild(li);
  }
  return ul;
}

function renderAggregate(a) {
  const wrap = document.createElement("div");

  const title = document.createElement("div");
  title.className = "aggregate-title";
  title.textContent = `${a.invoiceId} — ${a.vendor}`;
  wrap.appendChild(title);

  const dl = document.createElement("dl");
  dl.className = "aggregate-fields";
  const rows = [
    ["Date", a.date],
    ["Line items", String(a.lineItemCount)],
    ["Subtotal", `${a.subtotal.toFixed(2)} ${a.currency}`],
  ];
  for (const [label, value] of rows) {
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    dl.append(dt, dd);
  }
  wrap.appendChild(dl);
  return wrap;
}

function renderResponse(response) {
  switch (response.kind) {
    case "text":
      append("system", response.text);
      return;
    case "list":
      append("system", renderList(response.invoices));
      return;
    case "aggregate":
      append("system", renderAggregate(response.aggregate));
      return;
  }
}

append("system", greeting);

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value;
  if (!text.trim()) return;
  append("user", text);
  input.value = "";
  renderResponse(handleTurn(text));
});
