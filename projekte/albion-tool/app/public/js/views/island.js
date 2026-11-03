// Ansicht: Insel-Planer (Farm, Kräutergarten, Weide, Zwinger)
import { h, fmt, field, select, toggle, numberInput, toast, ageClass } from "../ui.js";
import { data, itemName, tierLabel } from "../data.js";
import { planCrop, planAnimal, netSalePrice, specsForItem, fceFromSpecs } from "../calc.js";
import { specWidget } from "./profile.js";
import { CITIES, ROYAL, fetchPrices, marketQuote } from "../market.js";

export const PLOT_TYPES = {
  farm: { label: "Farm (Gemüse)", kind: "crop" },
  herbgarden: { label: "Kräutergarten", kind: "crop" },
  pasture: { label: "Weide (Nutztiere, Pferde, Ochsen)", kind: "animal" },
  kennel: { label: "Zwinger (Reittier-Jungtiere)", kind: "animal" }
};

function contents(type) {
  const D = data();
  return PLOT_TYPES[type].kind === "crop"
    ? D.farming.crops.filter((c) => c.building === type)
    : D.farming.animals.filter((a) => a.building === type);
}

function priceOf(state, id, side) {
  const isl = state.island;
  if (isl.manualPrices[id] != null) return { price: isl.manualPrices[id], manual: true };
  const q = marketQuote(state, id, isl.priceCity, 1, side);
  return q ? { price: q.price, age: q.age } : null;
}

/** Farming-FCE für ein Saatgut/Jungtier: aus den Specs oder manuell */
export function farmFce(state, id) {
  const isl = state.island;
  if (isl.fceManual) return Number(isl.fce) || 0;
  const D = data();
  return fceFromSpecs(specsForItem(D.specs, id, D.items[id]?.t || 0, "farm"), state.specs || {});
}

/** Berechnet einen Insel-Plot inklusive Kosten und Erlösen */
export function computePlot(state, plot) {
  const D = data();
  const isl = state.island;
  const premium = state.settings.premium;
  const cityMods = D.farmMods[isl.city] || {};
  const salePrice = (id) => priceOf(state, id, state.settings.sellMode === "order" ? "sell" : "buy");
  const buyPrice = (id) => priceOf(state, id, state.settings.buyMode === "order" ? "buy" : "sell");
  const net = (p) => netSalePrice(p, { premium, mode: state.settings.sellMode, constants: D.constants }).net;
  const lines = []; // { id, qty, dir: "in"|"out", price, value, label }
  let r;

  if (PLOT_TYPES[plot.type].kind === "crop") {
    const crop = D.farming.crops.find((c) => c.id === plot.content) || contents(plot.type)[0];
    r = planCrop(crop, { tiles: plot.tiles, premium, premiumFactor: isl.premiumFactor ?? 2, useFocus: plot.useFocus, fce: farmFce(state, crop.id), cityBonus: cityMods[crop.id]?.island || 0, cycles: plot.cycles });
    lines.push({ id: crop.id, qty: r.seedsNetUse, dir: "in", label: "Saatgut (Netto-Verbrauch)", p: buyPrice(crop.id) });
    for (const p of r.products) lines.push({ id: p.id, qty: p.qty, dir: "out", label: "Ernte", p: salePrice(p.id) });
    r.subject = crop;
    r.buyList = [{ id: crop.id, qty: r.seedsToBuy }];
  } else {
    const animal = D.farming.animals.find((a) => a.id === plot.content) || contents(plot.type)[0];
    const foodId = plot.favorite && animal.favorite ? animal.favorite : plot.food || D.farming.foods.find((f) => f.category === animal.food)?.id;
    const food = D.farming.foods.find((f) => f.id === foodId);
    r = planAnimal(animal, { tiles: plot.tiles, premium, premiumFactor: isl.premiumFactor ?? 2, useFocus: plot.useFocus, fce: farmFce(state, animal.id), favorite: plot.favorite && !!animal.favorite, foodNutrition: food?.nutrition, cityBonus: cityMods[animal.grown]?.island || 0, productDays: plot.productDays });
    lines.push({ id: animal.id, qty: plot.tiles, dir: "in", label: "Jungtiere", p: buyPrice(animal.id) });
    if (foodId) lines.push({ id: foodId, qty: r.food + r.grownFoodPerDay * (plot.productDays || 0), dir: "in", label: "Futter", p: buyPrice(foodId) });
    if (r.babiesReturned) lines.push({ id: animal.id, qty: r.babiesReturned, dir: "out", label: "Nachwuchs", p: salePrice(animal.id) });
    for (const p of r.products) if (p.qty) lines.push({ id: p.id, qty: p.qty, dir: "out", label: "Tierprodukte", p: salePrice(p.id) });
    const use = plot.use || "sell";
    if (use === "butcher" && animal.usedBy.length) {
      const meatId = animal.usedBy.find((id) => D.items[id]?.s2 === "meat") || animal.usedBy[0];
      const rec = D.recipes[meatId][0];
      lines.push({ id: meatId, qty: rec.a * plot.tiles, dir: "out", label: "Schlachten", p: salePrice(meatId) });
    } else {
      lines.push({ id: animal.grown, qty: plot.tiles, dir: "out", label: use === "keep" ? "Ausgewachsen (Wert)" : "Ausgewachsen verkaufen", p: salePrice(animal.grown) });
    }
    r.subject = animal;
    r.foodId = foodId;
    r.hours = r.days * 24;
    r.buyList = [{ id: animal.id, qty: plot.tiles }, ...(foodId ? [{ id: foodId, qty: r.food + r.grownFoodPerDay * (plot.productDays || 0) }] : [])];
  }

  let cost = 0, revenue = 0, missing = false;
  for (const l of lines) {
    if (!l.p) { if (l.qty > 0) missing = true; continue; }
    l.value = l.dir === "in" ? l.p.price * l.qty : net(l.p.price) * l.qty;
    if (l.dir === "in") cost += l.value; else revenue += l.value;
  }
  const profit = revenue - cost;
  return { ...r, lines, cost, revenue, profit, missing, perDay: r.hours ? profit / (r.hours / 24) : null };
}

export function renderIsland(root, app) {
  const { state } = app;
  const isl = state.island;
  const D = data();
  const lang = state.settings.lang;

  const results = isl.plots.map((p) => ({ plot: p, r: computePlot(state, p) }));
  const totalFocus = results.reduce((s, x) => s + x.r.focus, 0);
  const totalProfit = results.reduce((s, x) => s + x.r.profit, 0);
  const anyMissing = results.some((x) => x.r.missing);
  const totalPerDay = results.reduce((s, x) => s + (x.r.perDay || 0), 0);
  const tile = (label, value, tone, sub) => h("div", { class: `tile big ${tone}` }, h("div", { class: "kpi-label" }, label), h("div", { class: "kpi-value" }, value), sub ? h("div", { class: "kpi-sub" }, sub) : null);

  const loadBtn = h("button", { type: "button", class: "btn primary", onclick: async (e) => {
    e.currentTarget.disabled = true;
    const ids = results.flatMap((x) => x.r.lines.map((l) => l.id));
    try { const n = await fetchPrices(state, ids, { cities: [isl.priceCity], qualities: [1] }); toast(`${n} Marktdatensätze geladen.`, "ok"); app.save(); app.render(); }
    catch (err) { toast(err.message, "error"); loadBtn.disabled = false; }
  } }, "Marktpreise laden");

  const summary = h("section", { class: "result-band" },
    h("div", { class: "tiles cols-4" },
      tile("Gewinn je Durchgang", fmt.silver(totalProfit), totalProfit >= 0 ? "good" : "bad", anyMissing ? "vorläufig – Preise fehlen" : `${isl.plots.length} Plots`),
      tile("Gewinn pro Tag", fmt.silver(totalPerDay), totalPerDay >= 0 ? "good" : "bad"),
      tile("Fokus", fmt.int(totalFocus), totalFocus > state.settings.focusPerDay ? "bad" : "", `${fmt.pct(totalFocus / Math.max(1, state.settings.focusPerDay))} des Tagesfokus`),
      tile("Insel", isl.city, "", `Preise aus ${isl.priceCity}`)),
    h("div", { class: "band-foot" },
      loadBtn,
      h("button", { type: "button", class: "btn", onclick: () => { isl.plots.push({ id: `p${Date.now()}`, type: "farm", content: contents("farm")[0].id, tiles: 9, useFocus: false, cycles: 1 }); app.save(); app.render(); } }, "+ Plot hinzufügen"),
      h("button", { type: "button", class: "btn", onclick: () => { state.plans.push({ id: `i${Date.now()}`, type: "island", name: `Insel ${isl.city} (${isl.plots.length} Plots)`, created: new Date().toISOString(), include: true, island: structuredClone(isl) }); app.save(); toast("Im Planer gespeichert.", "ok"); } }, "In Planer übernehmen")));

  const settings = h("details", { class: "card settings-card" },
    h("summary", {}, h("strong", {}, "Insel-Einstellungen"), h("span", { class: "muted small" }, ` · ${isl.city} · Premium ${state.settings.premium ? "an" : "aus"} · Faktor ${fmt.num(isl.premiumFactor ?? 2)} · ${isl.fceManual ? `FCE ${fmt.int(isl.fce)} manuell` : "FCE aus deinen Specs"}`)),
    h("div", { class: "tiles cols-3" },
      field("Insel liegt bei", select(Object.keys(D.farmMods).filter((c) => !/Rast/.test(c)).map((c) => ({ value: c, label: c })), isl.city, (v) => { isl.city = v; app.save(); app.render(); }), "Bestimmt die +10 %-Ertragsboni der Stadt"),
      field("Preise aus", select(CITIES.map((c) => ({ value: c, label: c })), isl.priceCity, (v) => { isl.priceCity = v; app.save(); app.render(); })),
      field("Premium-Ertragsfaktor", numberInput({ value: isl.premiumFactor ?? 2, label: "Faktor", onchange: (n) => { isl.premiumFactor = n || 1; app.save(); app.render(); } }), "Community-Wert: Premium verdoppelt die Ernte. Im Spiel prüfen."),
      h("div", { class: "field" }, h("span", { class: "field-label" }, "Fokuskosten-Effizienz"),
        toggle("FCE selbst eintragen", !!isl.fceManual, (v) => { isl.fceManual = v; app.save(); app.render(); }, "Sonst aus deinen Farming-Specs unter „Mein Charakter“"),
        isl.fceManual ? numberInput({ value: isl.fce, label: "Farming-FCE", onchange: (n) => { isl.fce = n || 0; app.save(); app.render(); } }) : h("span", { class: "hint" }, "Wird je Plot aus deinen Specs berechnet."))),
    h("p", { class: "muted small" }, `Stadtboni für ${isl.city}: ${Object.keys(D.farmMods[isl.city] || {}).map((id) => itemName(id, lang)).join(", ") || "keine"}. Premium und Fokus pro Tag stellst du unter „Mein Charakter“ ein.`));

  const plots = h("div", { class: "tiles cols-2" }, results.map(({ plot, r }, idx) => renderPlot(plot, r, idx, app, lang)));
  root.replaceChildren(h("div", { class: "stack" }, summary, settings, plots,
    h("details", { class: "card help" }, h("summary", {}, "So wird gerechnet"), h("ul", { class: "muted small" },
      h("li", {}, "Ernte je Feld = Durchschnitt der Lootliste (z. B. 3–6 → 4,5) × Premium-Faktor × (1 + Stadtbonus der Insel)."),
      h("li", {}, "Samenrückgabe = Grundchance aus den Spieldaten; mit Fokus-Bewässerung + halber Fokusbonus (ergibt in den Spieldaten für alle Pflanzen und Nutztiere genau 100 %)."),
      h("li", {}, "Futter zum Aufziehen = Nährwertbedarf ÷ Nährwert des Futters; Lieblingsfutter zählt doppelt. Ausgewachsene Tiere fressen täglich weiter, wenn du Produkte (Milch, Eier, Wolle …) sammelst."),
      h("li", {}, "Fokus je Feld und Aktion laut Spieldaten 1.000, gesenkt durch deine Farming-Specs (je 10.000 FCE halbiert)."),
      h("li", {}, "Werte sind Erwartungswerte. Zufallsschwankungen und Arbeiter bitte im Spiel gegenprüfen.")))));
}

function renderPlot(plot, r, idx, app, lang) {
  const { state } = app;
  const isl = state.island;
  const D = data();
  const kind = PLOT_TYPES[plot.type].kind;
  const upd = (fn) => { fn(); app.save(); app.render(); };
  const list = contents(plot.type);

  const main = h("div", { class: "row wrap" },
    field("Gebäude", select(Object.entries(PLOT_TYPES).map(([v, t]) => ({ value: v, label: t.label })), plot.type, (v) => upd(() => { plot.type = v; plot.content = contents(v)[0]?.id; }))),
    field(kind === "crop" ? "Saatgut" : "Tier", select(list.map((x) => ({ value: x.id, label: `${itemName(x.id, lang)} (T${x.tier})` })), plot.content, (v) => upd(() => { plot.content = v; }))),
    field("Felder", numberInput({ value: plot.tiles, step: 1, label: "Felder", width: "5em", onchange: (n) => upd(() => { plot.tiles = Math.max(0, Math.round(n || 0)); }) })),
    kind === "crop" ? field("Durchgänge", numberInput({ value: plot.cycles, step: 1, min: 1, label: "Durchgänge", width: "5em", onchange: (n) => upd(() => { plot.cycles = Math.max(1, Math.round(n || 1)); }) })) : null);

  const extra = h("div", { class: "row wrap" },
    toggle(kind === "crop" ? "Mit Fokus gießen" : "Mit Fokus füttern", plot.useFocus, (v) => upd(() => { plot.useFocus = v; })),
    kind === "animal" && r.subject.favorite ? toggle(`Lieblingsfutter (${itemName(r.subject.favorite, lang)})`, plot.favorite, (v) => upd(() => { plot.favorite = v; })) : null,
    kind === "animal" && !(plot.favorite && r.subject.favorite) ? field("Futter", select(D.farming.foods.filter((f) => f.category === r.subject.food).map((f) => ({ value: f.id, label: itemName(f.id, lang) })), r.foodId || "", (v) => upd(() => { plot.food = v; }))) : null,
    kind === "animal" && r.subject.products?.length ? field("Produkte sammeln (Tage)", numberInput({ value: plot.productDays || 0, step: 1, label: "Tage", width: "5em", onchange: (n) => upd(() => { plot.productDays = Math.max(0, Math.round(n || 0)); }) }), "Alle 22 Std. Produkte") : null,
    kind === "animal" ? field("Danach", select([{ value: "sell", label: "ausgewachsen verkaufen" }, ...(r.subject.usedBy.some((id) => D.items[id]?.s2 === "meat") ? [{ value: "butcher", label: "schlachten (Fleisch)" }] : []), { value: "keep", label: "behalten/Reittier craften (Marktwert)" }], plot.use || "sell", (v) => upd(() => { plot.use = v; }))) : null);

  const facts = kind === "crop"
    ? [`Wachstum ${fmt.hours(r.hours / r.cycles)}`, `Samen zurück ${fmt.pct(r.seedBack)}`, `Saatgut kaufen: ${fmt.int(r.seedsToBuy)}`, `Fokus ${fmt.int(r.focus)}`]
    : [`Aufzucht ${fmt.num(r.days)} Tage`, `Nachwuchs ${fmt.pct(r.offspringChance)}`, `Futter ${fmt.int(r.foodPerAnimal)} je Tier`, r.grownFoodPerDay ? `ausgewachsen ${fmt.int(r.grownFoodPerDay)} Futter/Tag` : null, `Fokus ${fmt.int(r.focus)}`].filter(Boolean);

  const table = h("table", { class: "table" },
    h("thead", {}, h("tr", {}, h("th", {}, ""), h("th", {}, "Item"), h("th", { class: "r" }, "Menge"), h("th", { class: "r" }, "Preis"), h("th", { class: "r" }, "Wert"))),
    h("tbody", {}, r.lines.map((l) => {
      const inp = numberInput({ value: isl.manualPrices[l.id], label: `Preis ${itemName(l.id, lang)}`, width: "7em", onchange: (n) => upd(() => { if (n == null) delete isl.manualPrices[l.id]; else isl.manualPrices[l.id] = n; }) });
      inp.placeholder = l.p && !l.p.manual ? String(l.p.price) : "–";
      return h("tr", {},
        h("td", {}, h("span", { class: l.dir === "in" ? "tag in" : "tag out" }, l.label)),
        h("td", {}, `${itemName(l.id, lang)} `, h("span", { class: "badge small" }, tierLabel(l.id))),
        h("td", { class: "r" }, fmt.num(l.qty)),
        h("td", { class: "r" }, inp, l.p && !l.p.manual ? h("div", { class: `small ${ageClass(l.p.age)}` }, fmt.age(l.p.age)) : null),
        h("td", { class: `r ${l.dir === "in" ? "bad" : "good"}` }, l.value == null ? (l.qty > 0 ? h("span", { class: "warn" }, "Preis fehlt") : "0") : Math.round(l.value) === 0 ? "0" : `${l.dir === "in" ? "−" : "+"}${fmt.silver(l.value)}`));
    })));

  let focusNote = null;
  if (plot.useFocus && r.focus > 0) {
    const alt = computePlot(state, { ...plot, useFocus: false });
    const perFocus = (r.profit - alt.profit) / r.focus;
    focusNote = h("p", { class: perFocus < 1 ? "warn small" : "muted small" }, `Fokus bringt hier ${fmt.silver(r.profit - alt.profit)} Silber mehr = ${fmt.num(perFocus, 2)} Silber je Fokuspunkt.${perFocus < 1 ? " Das ist wenig – im Crafting/Refining bringt Fokus meist mehr." : ""}`);
  }

  const tone = r.profit >= 0 ? "good" : "bad";
  return h("section", { class: `tile plot plot-${tone}` },
    h("div", { class: "plot-head" },
      h("div", {}, h("div", { class: "eyebrow" }, PLOT_TYPES[plot.type].label), h("h3", {}, itemName(plot.content, lang), " ", h("span", { class: "badge small" }, tierLabel(plot.content)))),
      h("div", { class: "plot-profit" }, h("strong", { class: tone }, fmt.silver(r.profit)), h("span", { class: "muted small" }, r.perDay != null ? `${fmt.silver(r.perDay)}/Tag` : ""), r.missing ? h("span", { class: "warn small" }, "Preise fehlen") : null),
      h("button", { type: "button", class: "icon", "aria-label": "Plot entfernen", title: "Plot entfernen", onclick: () => upd(() => { isl.plots.splice(idx, 1); }) }, "✕")),
    main,
    h("p", { class: "facts" }, facts.map((f) => h("span", {}, f))),
    extra,
    focusNote,
    h("details", { class: "more" }, h("summary", {}, "Kosten und Erlöse im Detail"), h("div", { class: "table-wrap" }, table)),
    plot.useFocus && !isl.fceManual ? h("details", { class: "more" }, h("summary", {}, "Fokus & Specs"), specWidget(app, plot.content, "farm", r.subject.focusCost)) : null);
}

export { ROYAL };
