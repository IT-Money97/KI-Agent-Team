// Ansicht: Crafting & Refining
import { h, fmt, field, toggle, select, numberInput, kpi, toast, debounce, ageClass } from "../ui.js";
import { data, searchFamilies, variants, itemName, tierLabel, locationOptions, resolveLocation, marketCityForLocation, GROUPS, TIER_NAMES } from "../data.js";
import { productionBonus, planProduction, productionResult, shoppingList, isRefining } from "../calc.js";
import { CITIES, buyQuote, sellQuote, fetchPrices, hasMarketData as hasPrices } from "../market.js";

export function computeCraft(state) {
  const D = data();
  const c = state.craft;
  const { location, island } = resolveLocation(c.location, c.customBonus);
  const settingsFor = (id) => {
    const pb = productionBonus(D.items[id], location, { island, useFocus: c.useFocus, dailyBonus: c.dailyBonus, constants: D.constants });
    return { rrr: pb.rrr, pb, useFocus: c.useFocus, focusFce: c.fce, stationFee: c.stationFee };
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
    toast(`${n} Marktdatensätze geladen.`, "ok");
    app.save(); app.render();
  } catch (err) { toast(err.message, "error"); if (btn) btn.disabled = false; }
}

export function renderCraft(root, app) {
  const { state } = app;
  const D = data();
  const c = state.craft;
  const lang = state.settings.lang;
  if (!D.recipes[c.itemId]) c.itemId = "T4_PLANKS";

  let calc;
  let error = null;
  try { calc = computeCraft(state); } catch (e) { error = e.message; }

  // ---------- Item-Auswahl
  const results = h("div", { class: "search-results", role: "listbox", "aria-label": "Suchergebnisse" });
  let group = c.searchGroup || "";
  const doSearch = (q) => {
    const list = searchFamilies(q, { craftable: true, group, lang, limit: 30 });
    results.replaceChildren(...list.map((r) => h("button", {
      type: "button", class: `result ${r.family.ids.includes(c.itemId) ? "active" : ""}`, role: "option",
      onclick: () => {
        const v = variants(r.id);
        const curTier = data().items[c.itemId]?.t;
        const tierMap = v.get(curTier) || [...v.values()].find((m) => [...m.values()].some((id) => D.recipes[id]));
        const pick = [...tierMap.values()].find((id) => D.recipes[id] && D.items[id].l === (D.items[c.itemId]?.l || 0)) || [...tierMap.values()].find((id) => D.recipes[id]) || r.id;
        c.itemId = pick;
        c.manualSale = null;
        app.save(); app.render();
        if (state.pricesFetchedAt) { try { loadCraftPrices(app, computeCraft(state)); } catch { /* ohne Preise weiter */ } }
      }
    }, h("span", { class: "result-name" }, r.name), h("span", { class: "result-meta" }, groupLabel(r.family.group)))));
    if (!list.length) results.append(h("p", { class: "muted" }, "Nichts gefunden. Tipp: deutsch oder englisch suchen, z. B. „Planken“, „bag“, „Eintopf“."));
  };
  const searchInput = h("input", { type: "search", placeholder: "Item suchen (DE/EN) …", value: c.search || "", "aria-label": "Item suchen",
    oninput: debounce((e) => { c.search = e.target.value; app.save(); doSearch(e.target.value); }, 120) });
  const groupSel = select([{ value: "", label: "Alle Kategorien" }, ...GROUPS.map((g) => ({ value: g.id, label: g.label }))], group, (v) => { c.searchGroup = v; group = v; app.save(); doSearch(searchInput.value); }, { "aria-label": "Kategorie" });
  doSearch(c.search || "");

  const v = variants(c.itemId);
  const it = D.items[c.itemId];
  const tierOptions = [...v.keys()].filter((t) => [...v.get(t).values()].some((id) => D.recipes[id])).sort((a, b) => a - b);
  const enchOptions = [...(v.get(it.t)?.entries() || [])].filter(([, id]) => D.recipes[id]).map(([l]) => l).sort();
  const pickVariant = (t, l) => {
    const m = v.get(t);
    const id = m?.get(l) && D.recipes[m.get(l)] ? m.get(l) : [...(m?.values() || [])].find((x) => D.recipes[x]);
    if (id) {
      c.itemId = id; c.manualSale = null; app.save(); app.render();
      if (state.pricesFetchedAt) { try { loadCraftPrices(app, computeCraft(state)); } catch { /* ohne Preise weiter */ } }
    }
  };
  const recipes = D.recipes[c.itemId];

  const pick = h("section", { class: "card" },
    h("h2", {}, "1. Was willst du herstellen?"),
    h("div", { class: "row" }, searchInput, groupSel),
    results,
    h("div", { class: "selected" },
      h("div", { class: "selected-name" }, itemName(c.itemId, lang), h("span", { class: "badge" }, tierLabel(c.itemId))),
      h("div", { class: "row wrap" },
        field("Tier", select(tierOptions.map((t) => ({ value: String(t), label: `T${t} ${TIER_NAMES[t] || ""}` })), String(it.t), (val) => pickVariant(Number(val), it.l))),
        field("Verzauberung", select(enchOptions.map((l) => ({ value: String(l), label: l ? `.${l}` : ".0 (keine)" })), String(it.l), (val) => pickVariant(it.t, Number(val)))),
        recipes.length > 1 ? field("Rezept", select(recipes.map((r, i) => ({ value: String(i), label: `Variante ${i + 1}: ${r.r.map(([id, n]) => `${n}× ${shortName(id, lang)}`).join(", ")}` })), String(c.recipeChoice[c.itemId] ?? 0), (val) => { c.recipeChoice[c.itemId] = Number(val); app.save(); app.render(); })) : null,
        field("Menge (fertige Items)", numberInput({ value: c.quantity, min: 1, step: 1, label: "Menge", onchange: (n) => { c.quantity = Math.max(1, Math.round(n || 1)); app.save(); app.render(); } }),
          recipes[c.recipeChoice[c.itemId] ?? 0]?.a > 1 ? `${recipes[c.recipeChoice[c.itemId] ?? 0].a} Stück je Herstellung` : null)
      ))
  );

  // ---------- Bedingungen
  const rrrBox = calc ? h("div", { class: "rrr" },
    h("div", { class: "rrr-head" }, "Rückgabequote ", h("strong", {}, fmt.pct(calc.settings.rrr))),
    h("ul", { class: "rrr-parts" },
      calc.settings.pb.parts.length ? calc.settings.pb.parts.map((p) => h("li", {}, `${p.label}: +${fmt.num(p.value * 100)} %`)) : h("li", {}, "Kein Produktionsbonus"),
      h("li", { class: "muted" }, `Produktionsbonus gesamt ${fmt.num(calc.settings.pb.total * 100)} % → RRR = PB ÷ (1 + PB)`))) : null;

  const cond = h("section", { class: "card" },
    h("h2", {}, "2. Wo und wie?"),
    h("div", { class: "row wrap" },
      field("Standort", select(locationOptions(), c.location, (val) => {
        c.location = val;
        const city = marketCityForLocation(resolveLocation(val).location);
        if (city) { state.settings.buyCity = city; state.settings.sellCity = city; toast(`Kauf und Verkauf jetzt in ${city} (unter „3. Preise“ änderbar).`); }
        app.save(); app.render();
      }), "Kauf- und Verkaufsstadt springen mit"),
      c.location === "custom" ? field("Eigener Produktionsbonus (%)", numberInput({ value: (c.customBonus || 0) * 100, label: "Bonus", onchange: (n) => { c.customBonus = (n || 0) / 100; app.save(); app.render(); } })) : null,
      field("Tagesbonus", select([{ value: "0", label: "keiner" }, { value: "0.1", label: "+10 %" }, { value: "0.2", label: "+20 %" }], String(c.dailyBonus || 0), (val) => { c.dailyBonus = Number(val); app.save(); app.render(); }), "Täglicher Produktionsbonus der Stadt für diese Kategorie"),
      field("Stationsgebühr", numberInput({ value: c.stationFee, label: "Silber je 100 Nährwert", onchange: (n) => { c.stationFee = n || 0; app.save(); app.render(); } }), "Silber je 100 Nährwert (steht an der Station)")
    ),
    h("div", { class: "row wrap" },
      toggle("Mit Fokus herstellen", c.useFocus, (val) => { c.useFocus = val; app.save(); app.render(); }, "+59 % Produktionsbonus"),
      c.useFocus ? field("Fokuskosten-Effizienz (FCE)", numberInput({ value: c.fce, label: "FCE", onchange: (n) => { c.fce = n || 0; app.save(); app.render(); } }), "Steht im Spiel beim Item unter Fokus; 10.000 FCE halbieren die Kosten") : null
    ),
    rrrBox
  );

  // ---------- Preise
  const prices = h("section", { class: "card" },
    h("h2", {}, "3. Preise"),
    h("div", { class: "row wrap" },
      field("Material kaufen in", select(CITIES.filter((x) => x !== "Black Market").map((x) => ({ value: x, label: x })), state.settings.buyCity, (val) => { state.settings.buyCity = val; app.save(); app.render(); })),
      field("Einkaufsart", select([{ value: "instant", label: "Sofort kaufen (Sell-Angebote)" }, { value: "order", label: "Kaufauftrag (+2,5 % Gebühr)" }], state.settings.buyMode, (val) => { state.settings.buyMode = val; app.save(); app.render(); })),
      field("Verkaufen in", select(CITIES.map((x) => ({ value: x, label: x })), state.settings.sellCity, (val) => { state.settings.sellCity = val; app.save(); app.render(); })),
      field("Verkaufsart", select([{ value: "order", label: "Verkaufsauftrag (Steuer + 2,5 %)" }, { value: "instant", label: "Sofort verkaufen (nur Steuer)" }], state.settings.sellMode, (val) => { state.settings.sellMode = val; app.save(); app.render(); })),
      it.q ? field("Qualität (Verkauf)", select([1, 2, 3, 4, 5].map((q) => ({ value: String(q), label: ["Normal", "Gut", "Hervorragend", "Exzellent", "Meisterhaft"][q - 1] })), String(c.quality), (val) => { c.quality = Number(val); app.save(); app.render(); })) : null
    ),
    h("div", { class: "row wrap" },
      h("button", { type: "button", class: "btn primary", onclick: (e) => calc && loadCraftPrices(app, calc, e.currentTarget) }, "Marktpreise laden"),
      h("span", { class: "muted small" }, "Leere Felder = Marktpreis. Eigene Preise überschreiben ihn.")),
    field("Was ist dir 1 Fokuspunkt wert? (Silber, optional)", numberInput({ value: state.settings.focusValue || null, label: "Silber je Fokus", onchange: (n) => { state.settings.focusValue = n || 0; app.save(); app.render(); } }), "Wird als Kosten vom Gewinn abgezogen, wenn du mit Fokus herstellst.")
  );

  const glossary = h("details", { class: "card help" },
    h("summary", {}, "Begriffe erklärt (für Einsteiger)"),
    h("dl", {},
      h("dt", {}, "Rückgabequote (RRR)"), h("dd", {}, "So viel Prozent der Materialien bekommst du beim Herstellen im Schnitt zurück. Sie hängt vom Produktionsbonus ab: Stadt (18 %), Stadt-Spezialisierung (z. B. +40 % Holz in Fort Sterling, +15 % Taschen in Brecilien), Fokus (+59 %) und Tagesbonus. Rechnung: Bonus ÷ (1 + Bonus)."),
      h("dt", {}, "Fokus"), h("dd", {}, "Tägliche Ressource (Premium: 10.000 pro Tag, max. 30.000). Mit Fokus steigt die Rückgabequote deutlich. Lohnt sich, wenn „Silber je Fokus“ hoch ist."),
      h("dt", {}, "Fokuskosten-Effizienz (FCE)"), h("dd", {}, "Senkt die Fokuskosten durch deine Spezialisierungen im Destiny Board. Je 10.000 FCE halbieren sich die Kosten. Den Wert siehst du im Spiel im Herstellfenster."),
      h("dt", {}, "Stationsgebühr"), h("dd", {}, "Silber je 100 Nährwert, das der Besitzer der Werkstatt verlangt. Steht im Herstellfenster der Station."),
      h("dt", {}, "Sofort kaufen / Kaufauftrag"), h("dd", {}, "Sofort kaufen = günstigstes Verkaufsangebot nehmen. Kaufauftrag = eigenes Gebot einstellen (billiger, dauert, +2,5 % Gebühr)."),
      h("dt", {}, "Verkaufsauftrag / Sofort verkaufen"), h("dd", {}, "Auftrag = zum aktuellen Tiefstpreis anbieten (Steuer 4 % mit Premium, 8 % ohne, plus 2,5 % Einstellgebühr). Sofort = an das höchste Kaufgebot verkaufen (nur Steuer)."),
      h("dt", {}, "Brutto / Nach Rückgabe"), h("dd", {}, "Brutto = was das Rezept insgesamt verbraucht. Nach Rückgabe = was du wirklich brauchst, wenn du zurückgegebene Materialien weiterverwendest.")));
  const left = h("div", { class: "col" }, pick, cond, prices, glossary);
  const right = h("div", { class: "col wide" }, error ? h("section", { class: "card error" }, error) : renderResult(calc, app));
  root.replaceChildren(h("div", { class: "grid-2" }, left, right));
}

function renderResult(calc, app) {
  const { state } = app;
  const c = state.craft;
  const lang = state.settings.lang;
  const { node, result } = calc;
  const tone = result.profit == null || !result.complete ? "" : result.profit >= 0 ? "good" : "bad";

  const kpis = h("div", { class: "kpis" },
    kpi(result.complete ? "Gewinn" : "Gewinn (vorläufig)", result.profit == null ? "Preise fehlen" : `${fmt.silver(result.profit)} Silber`, tone, result.complete ? null : "unvollständig – gelb markierte Preise fehlen noch"),
    kpi("Je Item", result.profitPerItem == null ? "–" : fmt.silver(result.profitPerItem), tone),
    kpi("Marge", fmt.pct(result.margin), tone),
    kpi(node.missingPrices ? "Kosten (unvollständig)" : "Kosten gesamt", node.missingPrices ? `mind. ${fmt.silver(result.cost)}` : fmt.silver(result.cost)),
    kpi("Fokus", fmt.int(result.focus), "", result.focus ? `${fmt.num(result.focus / Math.max(1, state.settings.focusPerDay || 10000))} Tage Fokus${result.silverPerFocus != null ? ` · ${fmt.num(result.silverPerFocus)} Silber je Fokus` : ""}` : null)
  );

  // Vergleich mit/ohne Fokus
  let focusCompare = null;
  try {
    const alt = computeCraft({ ...state, craft: { ...c, useFocus: !c.useFocus } });
    const withF = c.useFocus ? result : alt.result;
    const without = c.useFocus ? alt.result : result;
    if (withF.profit != null && without.profit != null && withF.focus > 0) {
      const extra = (withF.profit + withF.focusCostSilver) - without.profit;
      focusCompare = h("p", { class: "compare" },
        `Ohne Fokus: ${fmt.silver(without.profit)} · Mit Fokus: ${fmt.silver(withF.profit + withF.focusCostSilver)} → `,
        h("strong", { class: extra >= 0 ? "good" : "bad" }, `${extra >= 0 ? "+" : ""}${fmt.silver(extra)} Silber`),
        ` für ${fmt.int(withF.focus)} Fokus = ${fmt.num(extra / withF.focus, 2)} Silber je Fokuspunkt`);
    }
  } catch { /* Vergleich optional */ }

  const where = h("p", { class: "where" },
    `Herstellen: ${calc.location?.name || "?"}${calc.island ? " (Insel)" : ""} · Material: ${state.settings.buyCity} (${state.settings.buyMode === "order" ? "Kaufauftrag" : "sofort"}) · Verkauf: ${state.settings.sellCity} (${state.settings.sellMode === "order" ? "Auftrag" : "sofort"})`,
    (node.missingPrices || calc.salePrice == null) ? h("button", { type: "button", class: "btn primary small", style: { marginLeft: "8px" }, onclick: (e) => loadCraftPrices(app, calc, e.currentTarget) }, "Marktpreise laden") : null);

  const table = h("table", { class: "table" },
    h("thead", {}, h("tr", {},
      h("th", {}, "Material"), h("th", { class: "r" }, "Zu besorgen"), h("th", { class: "r" }, "Preis/Stück"), h("th", { class: "r" }, "Kosten"), h("th", {}, "Selbst herstellen?"),
      h("th", { class: "r" }, "Im Lager"), h("th", { class: "r" }, "Brutto"), h("th", { class: "r" }, "Nach Rückgabe"))),
    h("tbody", {}, renderNodeRows(node, app, lang)));

  const crafted = h("p", { class: "muted small" },
    `${fmt.int(node.crafts)} Herstellvorgänge · ${fmt.num(node.outputPerCraft, 2)} Stück je Vorgang · ${fmt.int(node.produced)} hergestellt` +
    (result.surplus > 0.5 ? ` (${fmt.int(result.surplus)} Überschuss)` : "") +
    ` · Stationsgebühr ${fmt.silver(node.totalFees)} Silber · Rückgabe ${fmt.pct(node.rrr)}`);

  const saleInput = numberInput({ value: c.manualSale, label: "Verkaufspreis je Stück", onchange: (n) => { c.manualSale = n; app.save(); app.render(); } });
  saleInput.placeholder = calc.saleQuote ? String(calc.saleQuote.price) : "Preis eingeben";
  const sale = h("section", { class: "card" },
    h("h3", {}, "Verkauf"),
    h("div", { class: "row wrap" },
      field(`Preis je Stück in ${state.settings.sellCity}`, saleInput, calc.saleQuote ? h("span", { class: ageClass(calc.saleQuote.age) }, `Markt: ${fmt.silver(calc.saleQuote.price)} (${fmt.age(calc.saleQuote.age)})`) : "Kein Marktpreis geladen"),
      h("div", { class: "sale-sum" },
        h("div", {}, `Erlös brutto: ${calc.salePrice == null ? "–" : fmt.silver(calc.salePrice * result.sold)}`),
        h("div", {}, `Steuern & Gebühren: ${fmt.silver(result.taxes)}`),
        h("div", {}, `Erlös netto: ${fmt.silver(result.revenue)}`),
        state.settings.focusValue ? h("div", {}, `Fokus-Gegenwert: −${fmt.silver(result.focusCostSilver)}`) : null)));

  const list = [...shoppingList(node).values()];
  const shop = h("section", { class: "card" },
    h("h3", {}, "Einkaufsliste"),
    list.length ? h("ul", { class: "shop" }, list.map((e) => h("li", {}, h("span", {}, `${fmt.int(e.qty)}× ${itemName(e.id, lang)} ${tierLabel(e.id)}`), h("span", { class: "muted" }, e.missingPrice ? "Preis fehlt" : `${fmt.silver(e.cost)} Silber`)))) : h("p", { class: "muted" }, "Alles im Lager."),
    h("div", { class: "row" },
      h("button", { type: "button", class: "btn", onclick: () => {
        const text = list.map((e) => `${Math.ceil(e.qty)}x ${itemName(e.id, lang)} ${tierLabel(e.id)} (${e.id})`).join("\n");
        navigator.clipboard?.writeText(text).then(() => toast("Einkaufsliste kopiert.", "ok"), () => toast("Kopieren nicht erlaubt.", "error"));
      } }, "Liste kopieren"),
      h("button", { type: "button", class: "btn", onclick: () => {
        state.plans.push({ id: `c${Date.now()}`, type: "craft", name: `${itemName(c.itemId, lang)} ${tierLabel(c.itemId)} × ${c.quantity}`, created: new Date().toISOString(), include: true, craft: structuredClone(c), sellCity: state.settings.sellCity, buyCity: state.settings.buyCity });
        app.save(); toast("Im Planer gespeichert.", "ok");
      } }, "In Planer übernehmen")));

  return [h("section", { class: "card" }, h("h2", {}, `Ergebnis: ${itemName(c.itemId, lang)} ${tierLabel(c.itemId)}`), where, kpis, focusCompare, crafted, h("div", { class: "table-wrap" }, table)), sale, shop];
}

function renderNodeRows(node, app, lang) {
  const c = app.state.craft;
  const D = data();
  const rows = [];
  for (const r of node.inputs) {
    const canCraft = !!D.recipes[r.id];
    const isSelf = c.craftSelf.includes(r.id);
    const manual = c.manualPrices[r.id];
    const quote = buyQuote(app.state, r.id, app.state.settings.buyCity, 1);
    const priceInput = numberInput({ value: manual, label: `Preis ${itemName(r.id, lang)}`, width: "7.5em", onchange: (n) => { if (n == null) delete c.manualPrices[r.id]; else c.manualPrices[r.id] = n; app.save(); app.render(); } });
    priceInput.placeholder = quote ? String(quote.price) : "–";
    const invInput = numberInput({ value: c.inventory[r.id], label: `Lager ${itemName(r.id, lang)}`, step: 1, width: "6em", onchange: (n) => { if (!n) delete c.inventory[r.id]; else c.inventory[r.id] = n; app.save(); app.render(); } });
    rows.push(h("tr", { class: `depth-${node.depth}` },
      h("td", {}, h("span", { style: { paddingLeft: `${node.depth * 1.1}em` } }, node.depth ? "↳ " : "", itemName(r.id, lang), " ", h("span", { class: "badge small" }, tierLabel(r.id))),
        !r.returnable ? h("span", { class: "tag", title: "Wird bei der Herstellung nicht zurückgegeben (z. B. Artefakt)" }, "keine Rückgabe") : null),
      h("td", { class: "r" }, fmt.int(r.toObtain)),
      h("td", { class: "r" }, r.crafted ? h("span", { class: "muted" }, r.unitPrice == null ? "selbst (Preise fehlen)" : `${fmt.silver(r.unitPrice)} (selbst)`) : h("div", {}, priceInput, quote && manual == null ? h("div", { class: `small ${ageClass(quote.age)}` }, fmt.age(quote.age)) : null)),
      h("td", { class: "r" }, r.missingPrice ? h("span", { class: "warn" }, "Preis fehlt") : fmt.silver(r.cost)),
      h("td", {}, canCraft ? toggle("selbst", isSelf, (val) => {
        c.craftSelf = val ? [...new Set([...c.craftSelf, r.id])] : c.craftSelf.filter((x) => x !== r.id);
        app.save(); app.render();
        // Preise für die neuen Unterzutaten automatisch nachladen, wenn schon Marktdaten genutzt werden
        if (val && app.state.pricesFetchedAt) {
          const D2 = data();
          const ids = D2.recipes[r.id][0].r.map(([id]) => id);
          fetchPrices(app.state, ids, { cities: [app.state.settings.buyCity], qualities: [1] }).then(() => { app.save(); app.render(); }).catch(() => {});
        }
      }, "Diese Zutat selbst herstellen statt kaufen") : null),
      h("td", { class: "r" }, invInput),
      h("td", { class: "r" }, fmt.int(r.gross)),
      h("td", { class: "r" }, fmt.int(r.net))));
    if (r.crafted) {
      const child = node.children.find((ch) => ch.id === r.id);
      if (child) rows.push(...renderNodeRows(child, app, lang));
    }
  }
  return rows;
}

function collectIds(node, acc = new Set()) {
  for (const r of node.inputs) acc.add(r.id);
  for (const ch of node.children) collectIds(ch, acc);
  return acc;
}

function shortName(id, lang) {
  return `${itemName(id, lang)} ${tierLabel(id)}`;
}

function groupLabel(g) {
  return GROUPS.find((x) => x.id === g)?.label || g;
}

export { isRefining, marketCityForLocation };
