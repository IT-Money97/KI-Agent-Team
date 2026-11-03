// Ansicht: Marktanalyse, Städtevergleich, Handelsrouten, Preisverlauf, Profit-Scanner
import { h, fmt, field, select, toast, debounce, ageClass, toggle, numberInput } from "../ui.js";
import { data, searchFamilies, itemName, tierLabel, GROUPS, variants } from "../data.js";
import { CITIES, fetchPrices, fetchHistory, marketQuote } from "../market.js";
import { tradeMargin, productionBonus } from "../calc.js";
import { computeCraft } from "./craft.js";
import { resolveLocation } from "../data.js";

export function renderMarket(root, app) {
  const { state } = app;
  const m = state.market;
  const lang = state.settings.lang;
  const D = data();

  // ---------- Merkliste
  const results = h("div", { class: "search-results compact" });
  const search = h("input", { type: "search", placeholder: "Item hinzufügen, z. B. „Reitpferd“, „t5 tasche“, „planken 6.1“ …", "aria-label": "Item suchen",
    oninput: debounce((e) => {
      const q = e.target.value;
      const list = q.trim() ? searchFamilies(q, { lang, limit: 20 }) : [];
      results.replaceChildren(...list.map((r) => h("button", { type: "button", class: "result", onclick: () => {
        if (!m.watch.includes(r.id)) m.watch.push(r.id);
        toast(`${itemName(r.id, lang)} ${tierLabel(r.id)} hinzugefügt.`, "ok");
        app.save(); app.render();
      } }, h("span", { class: "result-name" }, `${r.name} `, h("span", { class: "badge small" }, tierLabel(r.id))), h("span", { class: "result-meta" }, GROUPS.find((g) => g.id === r.family.group)?.label || ""))));
      if (q.trim() && !list.length) results.append(h("p", { class: "muted small pad" }, "Nichts gefunden. Tipp: deutsch oder englisch, Tier als „t5“ oder „5.1“."));
    }, 150) });

  const qualitySel = select([1, 2, 3, 4, 5].map((q) => ({ value: String(q), label: `Qualität ${q}` })), String(m.quality), (v) => { m.quality = Number(v); app.save(); app.render(); });
  const loadBtn = h("button", { type: "button", class: "btn primary", onclick: async () => {
    loadBtn.disabled = true;
    try {
      const n = await fetchPrices(state, m.watch, { cities: m.cities, qualities: [m.quality] });
      toast(`${n} Marktdatensätze geladen.`, "ok"); app.save(); app.render();
    } catch (e) { toast(e.message, "error"); loadBtn.disabled = false; }
  } }, "Preise laden");

  const cityToggles = h("div", { class: "chips" }, CITIES.map((city) => toggle(city, m.cities.includes(city), (v) => {
    m.cities = v ? CITIES.filter((x) => x === city || m.cities.includes(x)) : m.cities.filter((x) => x !== city);
    app.save(); app.render();
  })));

  const table = h("table", { class: "table market" },
    h("thead", {}, h("tr", {}, h("th", {}, "Item"), m.cities.map((city) => h("th", { class: "r" }, city)), h("th", {}, ""))),
    h("tbody", {}, m.watch.map((id) => {
      const quotes = m.cities.map((city) => ({ city, sell: marketQuote(state, id, city, m.quality, "sell"), buy: marketQuote(state, id, city, m.quality, "buy") }));
      const minSell = Math.min(...quotes.filter((q) => q.sell).map((q) => q.sell.price));
      const maxBuy = Math.max(...quotes.filter((q) => q.buy).map((q) => q.buy.price));
      return h("tr", {},
        h("td", {}, h("button", { type: "button", class: "link", title: "Preisverlauf anzeigen", onclick: () => { m.historyId = id; m.view = "history"; app.save(); app.render(); } }, itemName(id, lang)), " ", tierSwitcher(id, m, app)),
        quotes.map((q) => h("td", { class: "r cell" },
          q.sell ? h("div", { class: `${ageClass(q.sell.age)} ${q.sell.price === minSell ? "best-buy" : ""}`, title: `Günstigstes Angebot · ${fmt.age(q.sell.age)}` }, fmt.silver(q.sell.price)) : h("div", { class: "muted" }, "–"),
          q.buy ? h("div", { class: `small ${ageClass(q.buy.age)} ${q.buy.price === maxBuy ? "best-sell" : ""}`, title: `Höchstes Kaufgebot · ${fmt.age(q.buy.age)}` }, `↘ ${fmt.silver(q.buy.price)}`) : null)),
        h("td", {}, h("button", { type: "button", class: "icon", "aria-label": "Entfernen", onclick: () => { m.watch = m.watch.filter((x) => x !== id); app.save(); app.render(); } }, "✕")));
    })));

  const watchCard = h("section", { class: "card" },
    h("h2", {}, "Städtevergleich"),
    h("div", { class: "row wrap" }, search, qualitySel, loadBtn),
    results,
    cityToggles,
    h("p", { class: "muted small" }, "Obere Zahl: günstigstes Verkaufsangebot (das zahlst du beim Sofortkauf). ↘ Untere Zahl: höchstes Kaufgebot (das bekommst du beim Sofortverkauf). Farbe = Alter der Daten: grün < 3 Std., gelb < 24 Std., rot älter."),
    h("div", { class: "table-wrap" }, table));

  // ---------- Handelsrouten
  const routes = [];
  for (const id of m.watch) {
    for (const from of m.cities) {
      if (from === "Black Market") continue; // am Schwarzmarkt kann man nicht kaufen
      const buy = marketQuote(state, id, from, m.quality, "sell");
      if (!buy) continue;
      for (const to of m.cities) {
        if (to === from) continue;
        for (const mode of ["instant", "order"]) {
          if (to === "Black Market" && (mode === "order" || !D.items[id]?.q)) continue; // Schwarzmarkt: nur Sofortverkauf, nur Ausrüstung
          const sell = marketQuote(state, id, to, m.quality, mode === "instant" ? "buy" : "sell");
          if (!sell) continue;
          const t = tradeMargin({ buy: buy.price, sell: sell.price, premium: state.settings.premium, sellMode: mode, constants: D.constants });
          if (t.profit > 0) routes.push({ id, from, to, mode, buy, sell, ...t, perKg: D.items[id]?.w ? t.perItem / D.items[id].w : null, age: Math.max(buy.age ?? 99, sell.age ?? 99) });
        }
      }
    }
  }
  routes.sort((a, b) => b.roi - a.roi);
  const routeCard = h("section", { class: "card" },
    h("h2", {}, "Handelsrouten (Kauf → Verkauf)"),
    h("div", { class: "row wrap" },
      field("Mindestgewinn je Stück", numberInput({ value: m.minProfit || null, label: "Mindestgewinn", onchange: (n) => { m.minProfit = n || 0; app.save(); app.render(); } })),
      toggle("nur frische Daten (< 3 Std.)", !!m.freshOnly, (v) => { m.freshOnly = v; app.save(); app.render(); })),
    routes.length ? h("div", { class: "table-wrap" }, h("table", { class: "table" },
      h("thead", {}, h("tr", {}, ["Item / Route", "Gewinn/Stück", "Rendite", "Datenalter", "Einkauf", "Verkauf", "Art", "Silber/kg"].map((t, i) => h("th", { class: i && i !== 6 ? "r" : "" }, t)))),
      h("tbody", {}, routes.filter((r) => r.perItem >= (m.minProfit || 0) && (!m.freshOnly || r.age <= 3)).slice(0, 25).map((r) => h("tr", {},
        h("td", {}, `${itemName(r.id, lang)} ${tierLabel(r.id)}`, h("div", { class: "small muted" }, `${r.from} → ${r.to}`)),
        h("td", { class: "r good" }, fmt.silver(r.perItem)), h("td", { class: "r" }, fmt.pct(r.roi)),
        h("td", { class: `r ${ageClass(r.age)}` }, fmt.age(r.age)),
        h("td", { class: "r" }, fmt.silver(r.buy.price)), h("td", { class: "r" }, fmt.silver(r.sell.price)),
        h("td", {}, r.mode === "instant" ? "sofort" : "Auftrag"),
        h("td", { class: "r" }, fmt.int(r.perKg))))))) :
      h("p", { class: "muted" }, "Noch keine lohnende Route. Preise für die Merkliste laden; Routen erscheinen, wenn Verkauf nach Steuern über dem Einkauf liegt."),
    h("p", { class: "muted small" }, "Annahme: gesamte Menge ist zum angezeigten Preis handelbar. Transport, Risiko und Liquidität sind nicht eingerechnet. „Auftrag“ = Verkaufsauftrag zum aktuellen Tiefstpreis inkl. 2,5 % Einstellgebühr."));

  // ---------- Preisverlauf (wird nur geladen, wenn der Bereich offen ist)
  const historyView = () => {
    const card = h("section", { class: "card" }, h("h2", {}, "Preisverlauf"));
    if (m.historyId) {
      const chartBox = h("div", { class: "chart" }, h("p", { class: "muted" }, "Lade Verlauf …"));
      card.append(h("div", { class: "row wrap" }, h("strong", {}, `${itemName(m.historyId, lang)} ${tierLabel(m.historyId)}`), h("span", { class: "muted" }, `Tagesdurchschnitt · Qualität ${m.quality}`),
        m.watch.length > 1 ? select(m.watch.map((id) => ({ value: id, label: `${itemName(id, lang)} ${tierLabel(id)}` })), m.historyId, (v) => { m.historyId = v; app.save(); app.render(); }, { "aria-label": "Item für Verlauf" }) : null), chartBox);
      fetchHistory(state, m.historyId, { cities: m.cities, quality: m.quality })
        .then((series) => chartBox.replaceChildren(lineChart(series)))
        .catch((e) => chartBox.replaceChildren(h("p", { class: "warn" }, e.message)));
    } else {
      card.append(h("p", { class: "muted" }, "Im Städtevergleich auf einen Itemnamen klicken, um den Verlauf zu sehen."));
    }
    return card;
  };

  // ---------- Unterbereiche als Kacheln statt einer langen Seite
  const VIEWS = [
    { id: "compare", label: "Städtevergleich", sub: `${m.watch.length} Items auf der Merkliste`, render: () => watchCard },
    { id: "routes", label: "Handelsrouten", sub: routes.length ? `${routes.length} lohnende Routen` : "Kauf in A, Verkauf in B", render: () => routeCard },
    { id: "scanner", label: "Profit-Scanner", sub: "Was lohnt sich zu craften?", render: () => renderScanner(app) },
    { id: "history", label: "Preisverlauf", sub: m.historyId ? `${itemName(m.historyId, lang)} ${tierLabel(m.historyId)}` : "Preise über die Zeit", render: historyView }
  ];
  const view = VIEWS.find((v) => v.id === m.view) || VIEWS[0];
  const nav = h("nav", { class: "tiles cols-4 subnav", "aria-label": "Markt-Bereiche" }, VIEWS.map((v) => h("button", {
    type: "button", class: `tile nav-tile ${v.id === view.id ? "active" : ""}`, "aria-pressed": String(v.id === view.id),
    onclick: () => { m.view = v.id; app.save(); app.render(); }
  }, h("strong", {}, v.label), h("span", { class: "muted small" }, v.sub))));
  root.replaceChildren(h("div", { class: "stack" }, nav, view.render()));
}

function tierSwitcher(id, m, app) {
  const D = data();
  const v = variants(id);
  const it = D.items[id];
  const opts = [];
  for (const [t, mm] of [...v.entries()].sort((a, b) => a[0] - b[0])) for (const [l, vid] of [...mm.entries()].sort()) opts.push({ value: vid, label: `T${t}${l ? "." + l : ""}` });
  if (opts.length < 2) return h("span", { class: "badge small" }, tierLabel(id));
  return select(opts, id, (val) => { m.watch = m.watch.map((x) => (x === id ? val : x)); app.save(); app.render(); }, { class: "mini", "aria-label": "Tier wählen", title: `Aktuell ${it ? tierLabel(id) : ""}` });
}

// ---------- Profit-Scanner: welche Items lohnen sich gerade zu craften?
function renderScanner(app) {
  const { state } = app;
  const D = data();
  const s = (state.market.scan ||= { group: "bags", tierMin: 4, tierMax: 8, enchants: [0, 1], results: [] });
  const lang = state.settings.lang;

  const candidates = () => Object.keys(D.recipes).filter((id) => {
    const it = D.items[id];
    return it && it.s === s.group && it.t >= s.tierMin && it.t <= s.tierMax && s.enchants.includes(it.l);
  });

  const run = async (btn) => {
    const ids = candidates();
    if (!ids.length) return toast("Keine Items in dieser Auswahl.", "error");
    if (ids.length > 250) return toast(`${ids.length} Items – bitte Auswahl eingrenzen (max. 250).`, "error");
    btn.disabled = true;
    try {
      const mats = new Set();
      for (const id of ids) for (const [rid] of D.recipes[id][0].r) mats.add(rid);
      await fetchPrices(state, [...ids, ...mats], { cities: [...new Set([state.settings.buyCity, state.settings.sellCity])], qualities: [1] });
      const out = [];
      for (const id of ids) {
        const tmp = { ...state, craft: { ...state.craft, itemId: id, quantity: D.recipes[id][0].a, craftSelf: [], manualPrices: {}, manualSale: null, inventory: {}, recipeChoice: {}, quality: 1 } };
        try {
          const calc = computeCraft(tmp);
          if (calc.result.profit == null || calc.node.missingPrices) continue;
          out.push({ id, profit: calc.result.profitPerItem, margin: calc.result.margin, cost: calc.node.totalCost / calc.node.quantity, sale: calc.salePrice, age: calc.saleQuote?.age ?? null, focus: calc.node.totalFocus / calc.node.quantity });
        } catch { /* Item ohne gültiges Rezept überspringen */ }
      }
      out.sort((a, b) => b.profit - a.profit);
      s.results = out.slice(0, 60);
      s.ranAt = new Date().toISOString();
      app.save(); app.render();
      toast(`${out.length} von ${ids.length} Items mit vollständigen Preisen berechnet.`, "ok");
    } catch (e) { toast(e.message, "error"); btn.disabled = false; }
  };

  const loc = resolveLocation(state.craft.location, state.craft.customBonus);
  const sample = candidates()[0];
  const rrr = sample ? productionBonus(D.items[sample], loc.location, { island: loc.island, useFocus: state.craft.useFocus, dailyBonus: state.craft.dailyBonus }).rrr : 0;
  const btn = h("button", { type: "button", class: "btn primary", onclick: (e) => run(e.currentTarget) }, "Scannen");
  return h("section", { class: "card" },
    h("h2", {}, "Profit-Scanner"),
    h("p", { class: "muted small" }, `Nutzt die Einstellungen aus „Crafting & Refining“: Standort ${loc.location?.name || "?"}${loc.island ? " (Insel)" : ""}, ${state.craft.useFocus ? "mit" : "ohne"} Fokus (RRR ca. ${fmt.pct(rrr)}), Material aus ${state.settings.buyCity}, Verkauf in ${state.settings.sellCity}. Zutaten werden gekauft, nicht selbst hergestellt.`),
    h("div", { class: "row wrap" },
      field("Kategorie", select(GROUPS.map((g) => ({ value: g.id, label: g.label })), s.group, (v) => { s.group = v; app.save(); app.render(); })),
      field("Tier von", select([2, 3, 4, 5, 6, 7, 8].map((t) => ({ value: String(t), label: `T${t}` })), String(s.tierMin), (v) => { s.tierMin = Number(v); app.save(); app.render(); })),
      field("bis", select([2, 3, 4, 5, 6, 7, 8].map((t) => ({ value: String(t), label: `T${t}` })), String(s.tierMax), (v) => { s.tierMax = Number(v); app.save(); app.render(); })),
      h("div", { class: "chips" }, [0, 1, 2, 3, 4].map((l) => toggle(`.${l}`, s.enchants.includes(l), (v) => { s.enchants = v ? [...new Set([...s.enchants, l])].sort() : s.enchants.filter((x) => x !== l); app.save(); app.render(); }))),
      h("span", { class: "muted small" }, `${candidates().length} Items`),
      btn),
    s.results?.length ? h("div", { class: "table-wrap" }, h("table", { class: "table" },
      h("thead", {}, h("tr", {}, ["Item", "Kosten/Stück", "Verkauf", "Gewinn/Stück", "Marge", "Fokus/Stück", "Datenalter", ""].map((t, i) => h("th", { class: i && i < 7 ? "r" : "" }, t)))),
      h("tbody", {}, s.results.map((r) => h("tr", {},
        h("td", {}, `${itemName(r.id, lang)} ${tierLabel(r.id)}`),
        h("td", { class: "r" }, fmt.silver(r.cost)), h("td", { class: "r" }, fmt.silver(r.sale)),
        h("td", { class: `r ${r.profit >= 0 ? "good" : "bad"}` }, fmt.silver(r.profit)), h("td", { class: "r" }, fmt.pct(r.margin)),
        h("td", { class: "r" }, fmt.int(r.focus)),
        h("td", { class: `r ${ageClass(r.age)}` }, fmt.age(r.age)),
        h("td", {}, h("button", { type: "button", class: "btn small", onclick: () => { state.craft.itemId = r.id; state.craft.manualSale = null; app.save(); app.go("craft"); } }, "Öffnen"))))))) : null);
}

// ---------- einfaches SVG-Liniendiagramm
const COLORS = ["#e0b354", "#6cb6ff", "#7ee2a8", "#ff8f8f", "#c9a0ff", "#ffd27a", "#5fd4d4", "#bdbdbd"];
function lineChart(series) {
  const pts = series.flatMap((s) => s.points);
  if (!pts.length) return h("p", { class: "muted" }, "Keine Verlaufsdaten für diese Auswahl.");
  const W = 760, H = 260, P = 44;
  const t0 = Math.min(...pts.map((p) => p.t)), t1 = Math.max(...pts.map((p) => p.t));
  const sorted = pts.map((p) => p.avg).sort((a, b) => a - b);
  const vMax = sorted[Math.floor(sorted.length * 0.98)] * 1.05, vMin = 0;
  const x = (t) => P + ((t - t0) / Math.max(1, t1 - t0)) * (W - P - 10);
  const y = (v) => H - 24 - ((Math.min(v, vMax) - vMin) / (vMax - vMin || 1)) * (H - 40);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Preisverlauf je Stadt");
  const add = (tag, attrs, text) => { const e = document.createElementNS(svg.namespaceURI, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (text) e.textContent = text; svg.append(e); return e; };
  for (let i = 0; i <= 4; i++) {
    const v = vMin + ((vMax - vMin) * i) / 4;
    add("line", { x1: P, x2: W - 10, y1: y(v), y2: y(v), class: "grid" });
    add("text", { x: P - 6, y: y(v) + 4, "text-anchor": "end", class: "axis" }, fmt.int(v));
  }
  add("text", { x: P, y: H - 6, class: "axis" }, new Date(t0).toLocaleDateString("de-DE"));
  add("text", { x: W - 10, y: H - 6, "text-anchor": "end", class: "axis" }, new Date(t1).toLocaleDateString("de-DE"));
  const legend = h("div", { class: "legend" });
  series.forEach((s, i) => {
    if (!s.points.length) return;
    const color = COLORS[i % COLORS.length];
    const d = s.points.sort((a, b) => a.t - b.t).map((p, j) => `${j ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.avg).toFixed(1)}`).join(" ");
    add("path", { d, fill: "none", stroke: color, "stroke-width": 2 });
    const last = s.points[s.points.length - 1];
    const vol = s.points.reduce((a, p) => a + p.count, 0);
    legend.append(h("span", { class: "legend-item" }, h("i", { style: { background: color } }), `${s.city}: ${fmt.int(last.avg)} (Ø Menge/Tag ${fmt.int(vol / s.points.length)})`));
  });
  return h("div", {}, svg, legend);
}
