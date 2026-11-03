// Ansicht: Planer – gespeicherte Vorhaben, gemeinsame Einkaufsliste, Fokusbudget, Backup
import { h, fmt, kpi, toggle, toast, downloadJson } from "../ui.js";
import { itemName, tierLabel } from "../data.js";
import { shoppingList } from "../calc.js";
import { computeCraft } from "./craft.js";
import { computePlot } from "./island.js";
import { validImport } from "../store.js";

function evaluate(state, plan) {
  if (plan.type === "craft") {
    const tmp = { ...state, craft: plan.craft, settings: { ...state.settings, buyCity: plan.buyCity || state.settings.buyCity, sellCity: plan.sellCity || state.settings.sellCity } };
    const calc = computeCraft(tmp);
    const buy = [...shoppingList(calc.node).values()].map((e) => ({ id: e.id, qty: e.qty, city: tmp.settings.buyCity }));
    return { focus: calc.result.focus, profit: calc.result.profit, complete: calc.result.complete, buy };
  }
  const tmp = { ...state, island: plan.island };
  const rs = plan.island.plots.map((p) => computePlot(tmp, p));
  return {
    focus: rs.reduce((s, r) => s + r.focus, 0),
    profit: rs.reduce((s, r) => s + r.profit, 0),
    complete: !rs.some((r) => r.missing),
    buy: rs.flatMap((r) => r.buyList.map((b) => ({ ...b, city: plan.island.priceCity })))
  };
}

export function renderPlanner(root, app) {
  const { state } = app;
  const lang = state.settings.lang;
  const evals = state.plans.map((p) => {
    try { return { plan: p, ev: evaluate(state, p) }; } catch (e) { return { plan: p, error: e.message }; }
  });
  const active = evals.filter((x) => x.plan.include && x.ev);
  const focus = active.reduce((s, x) => s + x.ev.focus, 0);
  const profit = active.reduce((s, x) => s + (x.ev.profit || 0), 0);
  const days = state.settings.focusPerDay ? focus / state.settings.focusPerDay : 0;

  const agg = new Map();
  for (const x of active) for (const b of x.ev.buy) {
    const k = `${b.city}|${b.id}`;
    agg.set(k, { ...b, qty: (agg.get(k)?.qty || 0) + b.qty });
  }
  const byCity = new Map();
  for (const b of agg.values()) { if (!byCity.has(b.city)) byCity.set(b.city, []); byCity.get(b.city).push(b); }

  const fileInput = h("input", { type: "file", accept: "application/json", hidden: true, onchange: async (e) => {
    try {
      const value = JSON.parse(await e.target.files[0].text());
      if (!validImport(value)) throw new Error("Datei ist kein Werkbank-Backup.");
      app.replaceState(value);
      toast("Backup importiert.", "ok");
    } catch (err) { toast(`Import fehlgeschlagen: ${err.message}`, "error"); }
  } });

  root.replaceChildren(h("div", { class: "stack" },
    h("section", { class: "card" },
      h("h2", {}, "Planer"),
      h("p", { class: "muted" }, "Speichere Crafting- und Insel-Pläne mit „In Planer übernehmen“. Hier siehst du alles zusammen: Einkaufsliste je Stadt, Fokusbedarf und erwarteten Gewinn mit den aktuell geladenen Preisen."),
      h("div", { class: "kpis" },
        kpi("Pläne aktiv", `${active.length} / ${state.plans.length}`),
        kpi("Gewinn gesamt", `${fmt.silver(profit)} Silber`, profit >= 0 ? "good" : "bad", active.some((x) => !x.ev.complete) ? "unvollständig – Preise fehlen" : null),
        kpi("Fokus gesamt", fmt.int(focus), "", state.settings.focusPerDay ? `≈ ${fmt.num(days)} Tage Fokus-Regeneration` : null))),
    h("section", { class: "card" },
      h("h3", {}, "Gespeicherte Pläne"),
      evals.length ? h("div", { class: "table-wrap" }, h("table", { class: "table" },
        h("thead", {}, h("tr", {}, ["Aktiv", "Plan", "Art", "Fokus", "Gewinn", ""].map((t, i) => h("th", { class: i === 3 || i === 4 ? "r" : "" }, t)))),
        h("tbody", {}, evals.map(({ plan, ev, error }) => h("tr", {},
          h("td", {}, toggle("", plan.include, (v) => { plan.include = v; app.save(); app.render(); })),
          h("td", {}, plan.name, h("div", { class: "muted small" }, new Date(plan.created).toLocaleString("de-DE"))),
          h("td", {}, plan.type === "craft" ? "Crafting" : "Insel"),
          h("td", { class: "r" }, ev ? fmt.int(ev.focus) : "–"),
          h("td", { class: `r ${ev?.profit >= 0 ? "good" : "bad"}` }, error ? h("span", { class: "warn" }, error) : ev.profit == null ? "Preise fehlen" : fmt.silver(ev.profit)),
          h("td", { class: "nowrap" },
            h("button", { type: "button", class: "btn small", onclick: () => {
              if (plan.type === "craft") { state.craft = structuredClone(plan.craft); if (plan.buyCity) state.settings.buyCity = plan.buyCity; if (plan.sellCity) state.settings.sellCity = plan.sellCity; app.save(); app.go("craft"); }
              else { state.island = structuredClone(plan.island); app.save(); app.go("island"); }
            } }, "Öffnen"),
            h("button", { type: "button", class: "icon", "aria-label": "Plan löschen", onclick: () => { state.plans = state.plans.filter((p) => p !== plan); app.save(); app.render(); } }, "✕"))))))) :
        h("p", { class: "muted" }, "Noch keine Pläne gespeichert.")),
    h("section", { class: "card" },
      h("h3", {}, "Gemeinsame Einkaufsliste"),
      byCity.size ? [...byCity.entries()].map(([city, list]) => h("div", { class: "shop-city" },
        h("h4", {}, city),
        h("ul", { class: "shop" }, list.sort((a, b) => itemName(a.id, lang).localeCompare(itemName(b.id, lang))).map((b) => h("li", {}, `${fmt.int(Math.ceil(b.qty))}× ${itemName(b.id, lang)} ${tierLabel(b.id)}`))))) :
        h("p", { class: "muted" }, "Keine aktiven Pläne.")),
    h("section", { class: "card" },
      h("h3", {}, "Backup"),
      h("p", { class: "muted small" }, "Alle Daten liegen nur in diesem Browser. Für einen anderen PC oder Browser: exportieren und dort importieren."),
      h("div", { class: "row" },
        h("button", { type: "button", class: "btn", onclick: () => downloadJson(`albion-werkbank-${new Date().toISOString().slice(0, 10)}.json`, { ...state, prices: {} }) }, "Exportieren"),
        h("button", { type: "button", class: "btn", onclick: () => fileInput.click() }, "Importieren"),
        fileInput))));
}
