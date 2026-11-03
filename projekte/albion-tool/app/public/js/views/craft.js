// Ansicht: Crafting & Refining – in Kacheln aufgebaut:
// Item → Ergebnis-Kacheln → Einstellungen (Standort, Fokus & Specs, Markt) → Material-Kacheln → Verkauf/Einkauf
import { h, fmt, field, toggle, select, numberInput, toast, debounce, ageClass } from "../ui.js";
import { data, searchFamilies, variants, itemName, tierLabel, locationOptions, resolveLocation, marketCityForLocation, GROUPS } from "../data.js";
import { productionBonus, planProduction, productionResult, shoppingList, specsForItem, fceFromSpecs } from "../calc.js";
import { CITIES, buyQuote, sellQuote, fetchPrices } from "../market.js";
import { specWidget } from "./profile.js";

/** FCE eines Items: aus den Specs oder (falls eingeschaltet) manuell */
export function fceFor(state, id, kind = "craft") {
  const c = state.craft;
  if (kind === "craft" && c.fceManual) return Number(c.fce) || 0;
  const D = data();
  return fceFromSpecs(specsForItem(D.specs, id, D.items[id]?.t || 0, kind), state.specs || {});
}

export function computeCraft(state) {
  const D = data();
  const c = state.craft;
  const { location, island } = resolveLocation(c.location, c.customBonus);
  const settingsFor = (id) => {
    const pb = productionBonus(D.items[id], location, { island, useFocus: c.useFocus, dailyBonus: c.dailyBonus, constants: D.constants });
    return { rrr: pb.rrr, pb, useFocus: c.useFocus, focusFce: fceFor(state, id), stationFee: c.stationFee };
  };
  const price = (id) => {
    const manual = c.manualPrices[id];
    if (manual != null) return manual;
    return buyQuote(state, id, state.settings.buyCity, 1)?.price ?? null;
  };
  const ctx = {
    data: D, settingsFor, price,
    craftSelf: new Set(c.craftSelf),
    inventory: new Map(Object.entries(c.inventory).map(([k, v]) => [k, Number(v) || 0])),
    recipeChoice: new Map(Object.entries(c.recipeChoice).map(([k, v]) => [k, Number(v)]))
  };
  const node = planProduction(c.itemId, Math.max(1, Number(c.quantity) || 1), ctx);
  const q = D.items[c.itemId]?.q ? c.quality : 1;
  const saleQuote = sellQuote(state, c.itemId, state.settings.sellCity, q);
  const salePrice = c.manualSale ?? saleQuote?.price ?? null;
  const result = productionResult(node, { salePrice, premium: state.settings.premium, saleMode: state.settings.sellMode, focusValue: state.settings.focusValue, constants: D.constants });
  return { node, result, settings: settingsFor(c.itemId), location, island, saleQuote, salePrice, quality: q };
}

async function loadCraftPrices(app, calc, btn) {
  const { state } = app;
  const c = state.craft;
  if (btn) btn.disabled = true;
  const ids = [c.itemId, ...collectIds(calc.node)];
  try {
    const n = await fetchPrices(state, ids, { cities: [...new Set([state.settings.buyCity, state.settings.sellCity])], qualities: [...new Set([1, calc.quality])] });
    toast(`${n} Marktpreise geladen.`, "ok");
    app.save(); app.render();
  } catch (err) { toast(err.message, "error"); if (btn) btn.disabled = false; }
}

function autoPrices(app) {
  if (!app.state.pricesFetchedAt) return;
  try { loadCraftPrices(app, computeCraft(app.state)); } catch { /* ohne Preise weiter */ }
}

export function renderCraft(root, app) {
  const { state } = app;
  const D = data();
  const c = state.craft;
  if (!D.recipes[c.itemId]) c.itemId = "T4_PLANKS";

  let calc;
  let error = null;
  try { calc = computeCraft(state); } catch (e) { error = e.message; }

  const parts = [itemTile(app)];
  if (error) parts.push(h("section", { class: "card error" }, error));
  else {
    parts.push(resultTiles(calc, app));
    parts.push(h("div", { class: "tiles cols-3" }, locationTile(calc, app), focusTile(calc, app), marketTile(calc, app)));
    parts.push(materialsCard(calc, app));
    parts.push(h("div", { class: "tiles cols-2" }, saleTile(calc, app), shopTile(calc, app)));
  }
  parts.push(glossary());
  root.replaceChildren(h("div", { class: "stack" }, ...parts));
}

// ---------------------------------------------------------------- 1. Item
function itemTile(app) {
  const { state } = app;
  const D = data();
  const c = state.craft;
  const lang = state.settings.lang;
  const it = D.items[c.itemId];

  const results = h("div", { class: "search-results", role: "listbox", "aria-label": "Suchergebnisse" });
  const pick = (r) => {
    const v = variants(r.id);
    const tierMap = v.get(it?.t) || [...v.values()].find((m) => [...m.values()].some((id) => D.recipes[id]));
    const id = [...tierMap.values()].find((x) => D.recipes[x] && D.items[x].l === (it?.l || 0)) || [...tierMap.values()].find((x) => D.recipes[x]) || r.id;
    c.itemId = id; c.manualSale = null; c.search = ""; app.save(); app.render(); autoPrices(app);
  };
  const doSearch = (q) => {
    const list = searchFamilies(q, { craftable: true, group: c.searchGroup || "", lang, limit: 24 });
    results.replaceChildren(
      ...(q.trim() || c.searchGroup ? [] : [h("div", { class: "result-head" }, "Beliebt")]),
      ...list.map((r) => h("button", { type: "button", class: `result ${r.family.ids.includes(c.itemId) ? "active" : ""}`, role: "option", onclick: () => pick(r) },
        h("span", { class: "result-name" }, r.name), h("span", { class: "result-meta" }, GROUPS.find((g) => g.id === r.family.group)?.label || ""))));
    if (!list.length) results.append(h("p", { class: "muted small pad" }, "Nichts gefunden. Deutsch oder englisch suchen, z. B. „Planken“, „bag“, „Eintopf“."));
  };
  const searchInput = h("input", { type: "search", placeholder: "Was willst du herstellen? (z. B. Tasche, Planken, Eintopf)", value: c.search || "", "aria-label": "Item suchen",
    oninput: debounce((e) => { c.search = e.target.value; app.save(); doSearch(e.target.value); }, 120) });
  const groupSel = select([{ value: "", label: "Alle Kategorien" }, ...GROUPS.map((g) => ({ value: g.id, label: g.label }))], c.searchGroup || "", (v) => { c.searchGroup = v; app.save(); doSearch(searchInput.value); }, { "aria-label": "Kategorie" });
  const searchBox = h("details", { class: "picker", open: !!(c.search || c.searchGroup) || null },
    h("summary", { class: "btn" }, "Anderes Item wählen"),
    h("div", { class: "row wrap" }, searchInput, groupSel), results);
  searchBox.addEventListener("toggle", () => { if (searchBox.open) { doSearch(searchInput.value); searchInput.focus(); } });
  if (searchBox.open) doSearch(c.search || "");

  const v = variants(c.itemId);
  const tiers = [...v.keys()].filter((t) => [...v.get(t).values()].some((id) => D.recipes[id])).sort((a, b) => a - b);
  const enchants = [...(v.get(it.t)?.entries() || [])].filter(([, id]) => D.recipes[id]).map(([l]) => l).sort();
  const go = (t, l) => {
    const m = v.get(t);
    const id = m?.get(l) && D.recipes[m.get(l)] ? m.get(l) : [...(m?.values() || [])].find((x) => D.recipes[x]);
    if (id) { c.itemId = id; c.manualSale = null; app.save(); app.render(); autoPrices(app); }
  };
  const recipes = D.recipes[c.itemId];
  const ri = c.recipeChoice[c.itemId] ?? 0;

  return h("section", { class: "card item-card" },
    h("div", { class: "item-head" },
      h("div", {},
        h("div", { class: "eyebrow" }, "Herstellen"),
        h("h1", { class: "item-title" }, itemName(c.itemId, lang), " ", h("span", { class: "badge" }, tierLabel(c.itemId)))),
      searchBox),
    h("div", { class: "item-controls" },
      h("div", { class: "control" }, h("span", { class: "field-label" }, "Tier"),
        h("div", { class: "chips-btn" }, tiers.map((t) => h("button", { type: "button", class: t === it.t ? "active" : "", onclick: () => go(t, it.l) }, `T${t}`)))),
      enchants.length > 1 ? h("div", { class: "control" }, h("span", { class: "field-label" }, "Verzauberung"),
        h("div", { class: "chips-btn" }, enchants.map((l) => h("button", { type: "button", class: l === it.l ? "active" : "", onclick: () => go(it.t, l) }, `.${l}`)))) : null,
      field("Menge", numberInput({ value: c.quantity, min: 1, step: 1, label: "Menge fertiger Items", width: "7em", onchange: (n) => { c.quantity = Math.max(1, Math.round(n || 1)); app.save(); app.render(); } }),
        recipes[ri]?.a > 1 ? `${recipes[ri].a} Stück je Herstellung` : null),
      recipes.length > 1 ? field("Rezept", select(recipes.map((r, i) => ({ value: String(i), label: `${i + 1}: ${r.r.map(([id, n]) => `${n}× ${itemName(id, lang)}`).join(", ")}` })), String(ri), (val) => { c.recipeChoice[c.itemId] = Number(val); app.save(); app.render(); })) : null));
}

// ---------------------------------------------------------------- 2. Ergebnis
function resultTiles(calc, app) {
  const { state } = app;
  const c = state.craft;
  const { node, result } = calc;
  const ok = result.complete;
  const tone = result.profit == null || !ok ? "" : result.profit >= 0 ? "good" : "bad";
  const days = result.focus / Math.max(1, state.settings.focusPerDay || 10000);

  let focusLine = null;
  try {
    const alt = computeCraft({ ...state, craft: { ...c, useFocus: !c.useFocus } });
    const withF = c.useFocus ? result : alt.result;
    const without = c.useFocus ? alt.result : result;
    if (withF.profit != null && without.profit != null && withF.focus > 0) {
      const extra = (withF.profit + withF.focusCostSilver) - without.profit;
      focusLine = { extra, perFocus: extra / withF.focus, focus: withF.focus };
    }
  } catch { /* optional */ }

  const missing = node.missingPrices || calc.salePrice == null;
  return h("section", { class: "result-band" },
    h("div", { class: "tiles cols-4" },
      bigTile(ok ? "Gewinn" : "Gewinn (vorläufig)", result.profit == null ? "–" : fmt.silver(result.profit), tone, result.profit == null ? "Verkaufspreis fehlt" : ok ? `${fmt.silver(result.profitPerItem)} je Item` : "Es fehlen noch Preise"),
      bigTile("Marge", fmt.pct(result.margin), tone, `Kosten ${node.missingPrices ? "mind. " : ""}${fmt.silver(result.cost)}`),
      bigTile("Rückgabequote", fmt.pct(calc.settings.rrr), "", `${calc.location?.name || ""}${calc.island ? " (Insel)" : ""}${c.useFocus ? " · mit Fokus" : ""}`),
      bigTile("Fokus", result.focus ? fmt.int(result.focus) : "kein", "", result.focus ? `${fmt.num(days)} Tage · ${result.silverPerFocus != null ? fmt.num(result.silverPerFocus) + " Silber/Fokus" : ""}` : (focusLine ? `mit Fokus: ${focusLine.extra >= 0 ? "+" : ""}${fmt.silver(focusLine.extra)}` : "ohne Fokus"))),
    h("div", { class: "band-foot" },
      h("span", { class: "muted" }, `${fmt.int(node.crafts)} Herstellungen · ${fmt.int(node.produced)} Stück · Material aus ${state.settings.buyCity} · Verkauf in ${state.settings.sellCity}`),
      focusLine ? h("span", { class: `pill ${focusLine.perFocus >= 1 ? "good" : "warn"}` }, `Fokus lohnt sich: ${focusLine.extra >= 0 ? "+" : ""}${fmt.silver(focusLine.extra)} Silber = ${fmt.num(focusLine.perFocus, 2)} je Fokuspunkt`) : null,
      missing ? h("button", { type: "button", class: "btn primary", onclick: (e) => loadCraftPrices(app, calc, e.currentTarget) }, "Marktpreise laden") : null));
}

function bigTile(label, value, tone, sub) {
  return h("div", { class: `tile big ${tone}` }, h("div", { class: "kpi-label" }, label), h("div", { class: "kpi-value" }, value), sub ? h("div", { class: "kpi-sub" }, sub) : null);
}

// ---------------------------------------------------------------- 3. Einstellungen
function locationTile(calc, app) {
  const { state } = app;
  const c = state.craft;
  return h("section", { class: "tile" },
    h("h3", {}, "Standort"),
    field("Wo stellst du her?", select(locationOptions(), c.location, (val) => {
      c.location = val;
      const city = marketCityForLocation(resolveLocation(val).location);
      if (city && (state.settings.buyCity !== city || state.settings.sellCity !== city)) { state.settings.buyCity = city; state.settings.sellCity = city; toast(`Kauf und Verkauf jetzt in ${city}.`); }
      app.save(); app.render();
    })),
    c.location === "custom" ? field("Eigener Produktionsbonus (%)", numberInput({ value: (c.customBonus || 0) * 100, label: "Bonus", onchange: (n) => { c.customBonus = (n || 0) / 100; app.save(); app.render(); } })) : null,
    h("div", { class: "row wrap" },
      field("Tagesbonus", select([{ value: "0", label: "keiner" }, { value: "0.1", label: "+10 %" }, { value: "0.2", label: "+20 %" }], String(c.dailyBonus || 0), (val) => { c.dailyBonus = Number(val); app.save(); app.render(); })),
      field("Stationsgebühr", numberInput({ value: c.stationFee, label: "Silber je 100 Nährwert", width: "6em", onchange: (n) => { c.stationFee = n || 0; app.save(); app.render(); } }), "je 100 Nährwert")),
    h("details", { class: "more" }, h("summary", {}, `Rückgabe ${fmt.pct(calc.settings.rrr)} – woher?`),
      h("ul", { class: "rrr-parts" },
        calc.settings.pb.parts.length ? calc.settings.pb.parts.map((p) => h("li", {}, `${p.label}: +${fmt.num(p.value * 100)} %`)) : h("li", {}, "Kein Produktionsbonus"),
        h("li", { class: "muted" }, `Bonus ${fmt.num(calc.settings.pb.total * 100)} % → Rückgabe = Bonus ÷ (1 + Bonus)`))));
}

function focusTile(calc, app) {
  const { state } = app;
  const c = state.craft;
  const D = data();
  const recipe = D.recipes[c.itemId][c.recipeChoice[c.itemId] ?? 0];
  return h("section", { class: "tile" },
    h("h3", {}, "Fokus & Specs"),
    toggle("Mit Fokus herstellen (+59 % Bonus)", c.useFocus, (val) => { c.useFocus = val; app.save(); app.render(); }),
    c.fceManual
      ? field("FCE manuell", numberInput({ value: c.fce, label: "FCE", onchange: (n) => { c.fce = n || 0; app.save(); app.render(); } }))
      : specWidget(app, c.itemId, "craft", recipe.f),
    toggle("FCE lieber selbst eintragen", !!c.fceManual, (val) => { c.fceManual = val; app.save(); app.render(); }, "Statt aus den Specs zu rechnen"));
}

function marketTile(calc, app) {
  const { state } = app;
  const c = state.craft;
  const it = data().items[c.itemId];
  return h("section", { class: "tile" },
    h("h3", {}, "Markt"),
    h("div", { class: "row wrap" },
      field("Material kaufen in", select(CITIES.filter((x) => x !== "Black Market").map((x) => ({ value: x, label: x })), state.settings.buyCity, (val) => { state.settings.buyCity = val; app.save(); app.render(); autoPrices(app); })),
      field("Verkaufen in", select(CITIES.map((x) => ({ value: x, label: x })), state.settings.sellCity, (val) => { state.settings.sellCity = val; app.save(); app.render(); autoPrices(app); }))),
    h("details", { class: "more" }, h("summary", {}, `${state.settings.buyMode === "order" ? "Kaufauftrag" : "Sofortkauf"} · ${state.settings.sellMode === "order" ? "Verkaufsauftrag" : "Sofortverkauf"}${it.q ? ` · Qualität ${c.quality}` : ""}`),
      field("Einkauf", select([{ value: "instant", label: "Sofort kaufen (günstigstes Angebot)" }, { value: "order", label: "Kaufauftrag (+2,5 % Gebühr)" }], state.settings.buyMode, (val) => { state.settings.buyMode = val; app.save(); app.render(); })),
      field("Verkauf", select([{ value: "order", label: "Verkaufsauftrag (Steuer + 2,5 %)" }, { value: "instant", label: "Sofort verkaufen (nur Steuer)" }], state.settings.sellMode, (val) => { state.settings.sellMode = val; app.save(); app.render(); })),
      it.q ? field("Qualität beim Verkauf", select([1, 2, 3, 4, 5].map((q) => ({ value: String(q), label: ["Normal", "Gut", "Hervorragend", "Exzellent", "Meisterhaft"][q - 1] })), String(c.quality), (val) => { c.quality = Number(val); app.save(); app.render(); })) : null),
    h("button", { type: "button", class: "btn primary block", onclick: (e) => loadCraftPrices(app, calc, e.currentTarget) }, state.pricesFetchedAt ? "Preise aktualisieren" : "Marktpreise laden"));
}

// ---------------------------------------------------------------- 4. Material-Kacheln
function materialsCard(calc, app) {
  return h("section", { class: "card" },
    h("div", { class: "card-head" }, h("h2", {}, "Materialien"), h("span", { class: "muted small" }, "Leeres Preisfeld = Marktpreis. Eigene Preise überschreiben ihn.")),
    h("div", { class: "tiles mats" }, materialTiles(calc.node, app)));
}

function materialTiles(node, app) {
  const { state } = app;
  const c = state.craft;
  const D = data();
  const lang = state.settings.lang;
  return node.inputs.map((r) => {
    const canCraft = !!D.recipes[r.id];
    const manual = c.manualPrices[r.id];
    const quote = buyQuote(state, r.id, state.settings.buyCity, 1);
    const priceInput = numberInput({ value: manual, label: `Preis ${itemName(r.id, lang)}`, width: "100%", onchange: (n) => { if (n == null) delete c.manualPrices[r.id]; else c.manualPrices[r.id] = n; app.save(); app.render(); } });
    priceInput.placeholder = quote ? String(quote.price) : "Preis?";
    const invInput = numberInput({ value: c.inventory[r.id], label: `Lager ${itemName(r.id, lang)}`, step: 1, width: "100%", onchange: (n) => { if (!n) delete c.inventory[r.id]; else c.inventory[r.id] = n; app.save(); app.render(); } });
    invInput.placeholder = "0";
    const child = r.crafted ? node.children.find((ch) => ch.id === r.id) : null;
    return h("div", { class: `tile mat ${r.missingPrice ? "missing" : ""} ${r.crafted ? "crafted" : ""}` },
      h("div", { class: "mat-head" },
        h("strong", {}, itemName(r.id, lang)), h("span", { class: "badge small" }, tierLabel(r.id)),
        !r.returnable ? h("span", { class: "tag", title: "Wird bei der Herstellung nicht zurückgegeben" }, "keine Rückgabe") : null),
      h("div", { class: "mat-need" }, h("span", { class: "big-num" }, fmt.int(r.toObtain)), h("span", { class: "muted small" }, r.crafted ? " selbst herstellen" : " besorgen"),
        h("div", { class: "muted small" }, `Rezept ${fmt.int(r.gross)} → nach Rückgabe ${fmt.int(r.net)}${r.fromInventory ? ` · ${fmt.int(r.fromInventory)} aus Lager` : ""}`)),
      r.crafted
        ? h("div", { class: "mat-cost" }, r.unitPrice == null ? h("span", { class: "warn" }, "Preise der Zutaten fehlen") : `${fmt.silver(r.unitPrice)} je Stück (selbst) · ${fmt.silver(r.cost)} gesamt`)
        : h("div", { class: "mat-grid" },
          h("label", { class: "field" }, h("span", { class: "field-label" }, "Preis/Stück"), priceInput, quote && manual == null ? h("span", { class: `small ${ageClass(quote.age)}` }, fmt.age(quote.age)) : null),
          h("label", { class: "field" }, h("span", { class: "field-label" }, "Im Lager"), invInput),
          h("div", { class: "field" }, h("span", { class: "field-label" }, "Kosten"), r.missingPrice ? h("span", { class: "warn" }, "Preis fehlt") : h("strong", {}, fmt.silver(r.cost)))),
      canCraft ? toggle("Selbst herstellen", c.craftSelf.includes(r.id), (val) => {
        c.craftSelf = val ? [...new Set([...c.craftSelf, r.id])] : c.craftSelf.filter((x) => x !== r.id);
        app.save(); app.render();
        if (val && state.pricesFetchedAt) {
          fetchPrices(state, D.recipes[r.id][0].r.map(([id]) => id), { cities: [state.settings.buyCity], qualities: [1] }).then(() => { app.save(); app.render(); }).catch(() => {});
        }
      }, "Diese Zutat selbst herstellen statt kaufen") : null,
      child ? h("div", { class: "sub-mats" }, h("div", { class: "muted small" }, `${fmt.int(child.crafts)} Herstellungen · Rückgabe ${fmt.pct(child.rrr)}`), h("div", { class: "tiles mats" }, materialTiles(child, app))) : null);
  });
}

// ---------------------------------------------------------------- 5. Verkauf & Einkauf
function saleTile(calc, app) {
  const { state } = app;
  const c = state.craft;
  const { result } = calc;
  const saleInput = numberInput({ value: c.manualSale, label: "Verkaufspreis je Stück", onchange: (n) => { c.manualSale = n; app.save(); app.render(); } });
  saleInput.placeholder = calc.saleQuote ? String(calc.saleQuote.price) : "Preis eingeben";
  return h("section", { class: "tile" },
    h("h3", {}, `Verkauf in ${state.settings.sellCity}`),
    field("Preis je Stück", saleInput, calc.saleQuote ? h("span", { class: ageClass(calc.saleQuote.age) }, `Markt: ${fmt.silver(calc.saleQuote.price)} (${fmt.age(calc.saleQuote.age)})`) : "Noch kein Marktpreis"),
    h("dl", { class: "sums" },
      h("dt", {}, "Erlös brutto"), h("dd", {}, calc.salePrice == null ? "–" : fmt.silver(calc.salePrice * result.sold)),
      h("dt", {}, "Steuer & Gebühren"), h("dd", {}, fmt.silver(result.taxes)),
      state.settings.focusValue ? [h("dt", {}, "Fokus-Gegenwert"), h("dd", {}, `−${fmt.silver(result.focusCostSilver)}`)] : null,
      h("dt", {}, "Erlös netto"), h("dd", {}, h("strong", {}, fmt.silver(result.revenue))),
      result.surplus > 0.5 ? [h("dt", {}, "Überschuss"), h("dd", {}, `${fmt.int(result.surplus)} Stück`)] : null));
}

function shopTile(calc, app) {
  const { state } = app;
  const c = state.craft;
  const lang = state.settings.lang;
  const list = [...shoppingList(calc.node).values()];
  return h("section", { class: "tile" },
    h("h3", {}, `Einkaufsliste ${state.settings.buyCity}`),
    list.length ? h("ul", { class: "shop" }, list.map((e) => h("li", {}, h("span", {}, `${fmt.int(e.qty)}× ${itemName(e.id, lang)} ${tierLabel(e.id)}`), h("span", { class: "muted" }, e.missingPrice ? "Preis fehlt" : fmt.silver(e.cost))))) : h("p", { class: "muted" }, "Alles im Lager."),
    h("div", { class: "row wrap" },
      h("button", { type: "button", class: "btn", onclick: () => {
        const text = list.map((e) => `${Math.ceil(e.qty)}x ${itemName(e.id, lang)} ${tierLabel(e.id)}`).join("\n");
        navigator.clipboard?.writeText(text).then(() => toast("Einkaufsliste kopiert.", "ok"), () => toast("Kopieren nicht erlaubt.", "error"));
      } }, "Kopieren"),
      h("button", { type: "button", class: "btn", onclick: () => {
        state.plans.push({ id: `c${Date.now()}`, type: "craft", name: `${itemName(c.itemId, lang)} ${tierLabel(c.itemId)} × ${c.quantity}`, created: new Date().toISOString(), include: true, craft: structuredClone(c), sellCity: state.settings.sellCity, buyCity: state.settings.buyCity });
        app.save(); toast("Im Planer gespeichert.", "ok");
      } }, "In Planer speichern")));
}

function glossary() {
  return h("details", { class: "card help" },
    h("summary", {}, "Begriffe erklärt"),
    h("dl", {},
      h("dt", {}, "Rückgabequote"), h("dd", {}, "So viel Prozent der Materialien bekommst du beim Herstellen im Schnitt zurück. Sie hängt vom Produktionsbonus ab: Stadt (18 %), Stadt-Spezialisierung (z. B. +40 % Holz in Fort Sterling, +15 % Taschen in Brecilien), Fokus (+59 %) und Tagesbonus."),
      h("dt", {}, "Fokus & FCE"), h("dd", {}, "Fokus ist die tägliche Ressource (Premium: 10.000 pro Tag). FCE (Fokuskosten-Effizienz) kommt aus deinen Specs und senkt die Fokuskosten: je 10.000 FCE halbieren sie sich."),
      h("dt", {}, "Stationsgebühr"), h("dd", {}, "Silber je 100 Nährwert, das der Besitzer der Werkstatt verlangt. Steht im Herstellfenster."),
      h("dt", {}, "Sofort / Auftrag"), h("dd", {}, "Sofort kaufen = günstigstes Angebot nehmen. Kaufauftrag = eigenes Gebot (+2,5 % Gebühr). Verkaufsauftrag = zum Tiefstpreis anbieten (4 % Steuer mit Premium, 8 % ohne, plus 2,5 %). Sofort verkaufen = ans höchste Gebot, nur Steuer.")));
}

function collectIds(node, acc = new Set()) {
  for (const r of node.inputs) acc.add(r.id);
  for (const ch of node.children) collectIds(ch, acc);
  return acc;
}
