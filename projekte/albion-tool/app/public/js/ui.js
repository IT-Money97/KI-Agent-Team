// Kleine DOM-Helfer ohne Framework.

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "value") el.value = v;
    else if (k === "checked") el.checked = !!v;
    else if (k === "html") el.innerHTML = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

const nf0 = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });
const pf = new Intl.NumberFormat("de-DE", { style: "percent", maximumFractionDigits: 1 });

export const fmt = {
  int: (n) => (n == null || !Number.isFinite(n) ? "–" : nf0.format(Math.round(n))),
  num: (n, d = 1) => (n == null || !Number.isFinite(n) ? "–" : (d === 2 ? nf2 : nf1).format(n)),
  silver: (n) => (n == null || !Number.isFinite(n) ? "–" : `${nf0.format(Math.round(n))}`),
  pct: (n) => (n == null || !Number.isFinite(n) ? "–" : pf.format(n)),
  age: (hours) => {
    if (hours == null) return "keine Daten";
    if (hours < 1) return `vor ${Math.max(1, Math.round(hours * 60))} Min.`;
    if (hours < 48) return `vor ${Math.round(hours)} Std.`;
    return `vor ${Math.round(hours / 24)} Tagen`;
  },
  hours: (h) => (h < 48 ? `${nf1.format(h)} Std.` : `${nf1.format(h / 24)} Tage`)
};

export function ageClass(hours) {
  if (hours == null) return "age-none";
  if (hours <= 3) return "age-fresh";
  if (hours <= 24) return "age-ok";
  return "age-old";
}

export function numberInput({ value, min = 0, step = "any", label, onchange, className = "", width }) {
  return h("input", {
    type: "number", inputmode: "decimal", min, step, value: value ?? "", "aria-label": label, title: label,
    class: `num ${className}`, style: width ? { width } : null,
    onchange: (e) => onchange(e.target.value === "" ? null : Number(e.target.value))
  });
}

export function select(options, value, onchange, attrs = {}) {
  const el = h("select", { ...attrs, onchange: (e) => onchange(e.target.value) },
    options.map((o) => {
      if (o.group) return h("optgroup", { label: o.group }, o.options.map((x) => h("option", { value: x.value }, x.label)));
      return h("option", { value: o.value }, o.label);
    }));
  el.value = value;
  return el;
}

export function field(label, control, hint) {
  return h("label", { class: "field" }, h("span", { class: "field-label" }, label), control, hint ? h("span", { class: "hint" }, hint) : null);
}

export function toggle(label, checked, onchange, hint) {
  return h("label", { class: "toggle", title: hint || null },
    h("input", { type: "checkbox", checked, onchange: (e) => onchange(e.target.checked) }),
    h("span", {}, label));
}

export function kpi(label, value, tone = "", sub) {
  return h("div", { class: `kpi ${tone}` }, h("div", { class: "kpi-label" }, label), h("div", { class: "kpi-value" }, value), sub ? h("div", { class: "kpi-sub" }, sub) : null);
}

let toastTimer;
export function toast(message, tone = "") {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.className = `toast show ${tone}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.className = "toast"), 4000);
}

export function debounce(fn, ms = 200) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

export function downloadJson(name, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const a = h("a", { href: URL.createObjectURL(blob), download: name });
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
}
