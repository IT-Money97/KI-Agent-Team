// Reine Rechenlogik ohne DOM – im Browser und in Node-Tests nutzbar.
// Alle Formeln sind in ../../README.md unter „Rechenmodell“ beschrieben.

export const DEFAULTS = {
  focusProductionBonus: 0.59,
  marketSetupFee: 0.025,
  marketSalesTax: 0.08,
  marketSalesTaxPremium: 0.04,
  stationNutritionFactor: 0.1125
};

export const REFINING_CATEGORIES = ["fiber", "ore", "rock", "wood", "hide"];

/** Rückgabequote aus Produktionsbonus: RRR = PB / (1 + PB) */
export function returnRateFromBonus(bonus) {
  const b = Math.max(0, Number(bonus) || 0);
  return b / (1 + b);
}

/**
 * Produktionsbonus für ein Item an einem Standort.
 * location: Eintrag aus gamedata.locations oder { custom: true, bonus }
 * opts: { island, useFocus, dailyBonus (z. B. 0.1), constants }
 */
export function productionBonus(item, location, opts = {}) {
  const c = { ...DEFAULTS, ...(opts.constants || {}) };
  const parts = [];
  if (location?.custom) {
    parts.push({ label: "Eigener Standortbonus", value: Number(location.bonus) || 0 });
  } else if (location) {
    const refining = isRefining(item);
    const base = opts.island
      ? (refining ? location.island?.refining : location.island?.crafting) || 0
      : (refining ? location.refining : location.crafting) || 0;
    if (base) parts.push({ label: opts.island ? "Inselbonus" : (refining ? "Stadtbonus Veredeln" : "Stadtbonus Herstellen"), value: base });
    const mod = !opts.island && item?.c ? location.mods?.[item.c] : 0;
    if (mod) parts.push({ label: `Spezialisierung ${location.name} (${item.c})`, value: mod });
  }
  if (opts.useFocus) parts.push({ label: "Fokus", value: c.focusProductionBonus });
  if (opts.dailyBonus) parts.push({ label: "Tagesbonus", value: Number(opts.dailyBonus) || 0 });
  const total = parts.reduce((s, p) => s + p.value, 0);
  return { parts, total, rrr: returnRateFromBonus(total) };
}

export function isRefining(item) {
  return !!item && item.s1 === "refinedresources" && REFINING_CATEGORIES.includes(item.c);
}

/** Fokuskosten nach Fokuskosten-Effizienz (FCE): Basis × 0,5^(FCE/10000) */
export function focusCost(base, fce = 0) {
  return Math.max(0, Number(base) || 0) * Math.pow(0.5, (Number(fce) || 0) / 10000);
}

/** Stationsgebühr je Herstellvorgang: Item-Wert × 0,1125 × Gebühr/100 */
export function stationFee(itemValue, feePer100Nutrition, constants = DEFAULTS) {
  return (Number(itemValue) || 0) * (constants.stationNutritionFactor ?? DEFAULTS.stationNutritionFactor) * (Number(feePer100Nutrition) || 0) / 100;
}

/** Netto-Erlös je Item nach Marktgebühren. mode: "order" (Verkaufsauftrag) | "instant" (an Kaufauftrag) */
export function netSalePrice(price, { premium = true, mode = "order", constants = DEFAULTS } = {}) {
  const p = Number(price) || 0;
  const tax = premium ? constants.marketSalesTaxPremium ?? DEFAULTS.marketSalesTaxPremium : constants.marketSalesTax ?? DEFAULTS.marketSalesTax;
  const setup = mode === "order" ? constants.marketSetupFee ?? DEFAULTS.marketSetupFee : 0;
  return { net: p * (1 - tax - setup), tax: p * tax, setup: p * setup };
}

/** Effektiver Einkaufspreis. mode: "instant" (Sell-min kaufen) | "order" (Kaufauftrag + Einstellgebühr) */
export function grossBuyPrice(price, { mode = "instant", constants = DEFAULTS } = {}) {
  const p = Number(price) || 0;
  return mode === "order" ? p * (1 + (constants.marketSetupFee ?? DEFAULTS.marketSetupFee)) : p;
}

/**
 * Plant eine Produktion (rekursiv).
 * ctx: {
 *   data: gamedata, quantity, recipeIndex,
 *   settingsFor(itemId) -> { rrr, focusFce, useFocus, stationFee },
 *   craftSelf: Set<itemId> (Zutaten, die selbst hergestellt werden),
 *   inventory: Map<itemId, qty>, price(itemId) -> number|null (Einkaufspreis je Stück),
 *   recipeChoice: Map<itemId, index>
 * }
 */
export function planProduction(itemId, quantity, ctx, depth = 0, path = []) {
  const data = ctx.data;
  const recipes = data.recipes[itemId];
  if (!recipes?.length) throw new Error(`Kein Rezept für ${itemId}`);
  if (path.includes(itemId)) throw new Error(`Rezeptkreis: ${[...path, itemId].join(" → ")}`);
  const ri = Math.min(ctx.recipeChoice?.get(itemId) ?? 0, recipes.length - 1);
  const recipe = recipes[ri];
  const item = data.items[itemId] || { v: 0 };
  const s = ctx.settingsFor(itemId);
  const rrr = Math.min(0.95, Math.max(0, s.rrr));
  const target = Math.max(0, quantity);

  // Rückgabe als Zusatzprodukt (z. B. Schlachten): mehr Output je Vorgang
  const outputPerCraft = recipe.p ? recipe.a / (1 - rrr) : recipe.a;
  const crafts = target > 0 ? Math.ceil(target / outputPerCraft - 1e-9) : 0;
  const produced = crafts * outputPerCraft;

  const inputs = recipe.r.map(([id, count, returnable]) => {
    const canReturn = returnable !== 0 && !recipe.p;
    const gross = count * crafts;
    const net = canReturn ? gross * (1 - rrr) : gross;
    return { id, count, returnable: canReturn, gross, net: Math.ceil(net - 1e-9) };
  });

  const node = {
    id: itemId, depth, recipeIndex: ri, recipeCount: recipes.length,
    quantity: target, crafts, produced, outputPerCraft, rrr,
    focusPerCraft: s.useFocus ? focusCost(recipe.f, s.focusFce) : 0,
    feePerCraft: stationFee((item.v || 0) * recipe.a, s.stationFee, data.constants),
    silverPerCraft: recipe.s || 0,
    inputs: [], children: []
  };
  node.focus = node.focusPerCraft * crafts;
  node.fees = (node.feePerCraft + node.silverPerCraft) * crafts;

  for (const inp of inputs) {
    const have = Math.min(inp.net, ctx.inventory?.get(inp.id) || 0);
    if (have && ctx.inventory) ctx.inventory.set(inp.id, (ctx.inventory.get(inp.id) || 0) - have);
    const missing = inp.net - have;
    const row = { ...inp, fromInventory: have, toObtain: missing, crafted: false, unitPrice: null, cost: 0 };
    if (missing > 0 && ctx.craftSelf?.has(inp.id) && data.recipes[inp.id]) {
      const child = planProduction(inp.id, missing, ctx, depth + 1, [...path, itemId]);
      row.crafted = true;
      row.cost = child.totalCost;
      row.unitPrice = child.missingPrices ? null : child.totalCost / Math.max(1, missing);
      row.missingPrice = child.missingPrices;
      node.children.push(child);
    } else {
      const price = ctx.price?.(inp.id);
      row.unitPrice = price ?? null;
      row.cost = price != null ? price * missing : 0;
      row.missingPrice = missing > 0 && price == null;
    }
    node.inputs.push(row);
  }

  const childFocus = node.children.reduce((s, c) => s + c.totalFocus, 0);
  const childFees = node.children.reduce((s, c) => s + c.totalFees, 0);
  node.materialCost = node.inputs.reduce((s, r) => s + (r.crafted ? 0 : r.cost), 0);
  node.totalFocus = node.focus + childFocus;
  node.totalFees = node.fees + childFees;
  node.totalCost = node.materialCost + node.fees + node.children.reduce((s, c) => s + c.totalCost, 0);
  node.missingPrices = node.inputs.some((r) => r.missingPrice) || node.children.some((c) => c.missingPrices);
  return node;
}

/** Flache Einkaufsliste aus einem Produktionsbaum */
export function shoppingList(node, acc = new Map()) {
  for (const r of node.inputs) {
    if (r.crafted || r.toObtain <= 0) continue;
    const e = acc.get(r.id) || { id: r.id, qty: 0, cost: 0, missingPrice: false };
    e.qty += r.toObtain;
    e.cost += r.cost;
    e.missingPrice ||= !!r.missingPrice;
    acc.set(r.id, e);
  }
  for (const c of node.children) shoppingList(c, acc);
  return acc;
}

/** Ergebnis einer Produktion inkl. Verkauf */
export function productionResult(node, { salePrice, premium = true, saleMode = "order", focusValue = 0, constants = DEFAULTS } = {}) {
  const sold = node.quantity;
  const sale = salePrice != null ? netSalePrice(salePrice, { premium, mode: saleMode, constants }) : null;
  const revenue = sale ? sale.net * sold : null;
  const surplus = Math.max(0, node.produced - node.quantity);
  const focusCostSilver = (Number(focusValue) || 0) * node.totalFocus;
  const profit = revenue != null ? revenue - node.totalCost - focusCostSilver : null;
  return {
    sold, surplus, revenue,
    taxes: sale ? (sale.tax + sale.setup) * sold : null,
    cost: node.totalCost, focus: node.totalFocus, focusCostSilver,
    profit,
    profitPerItem: profit != null && sold ? profit / sold : null,
    margin: profit != null && revenue ? profit / revenue : null,
    silverPerFocus: profit != null && node.totalFocus > 0 ? (profit + focusCostSilver) / node.totalFocus : null,
    complete: revenue != null && !node.missingPrices
  };
}

// ---------------------------------------------------------------- Insel

export function averageLoot(loot = []) {
  return loot.map((l) => ({ id: l.id, avg: (l.chance ?? 1) * ((l.min + l.max) / 2) }));
}

/**
 * Feld (Farm/Kräutergarten) mit Saatgut bepflanzen.
 * opts: { tiles, premium, premiumFactor, useFocus, fce, cityBonus (islandvalue), cycles }
 */
export function planCrop(crop, opts = {}) {
  const tiles = Math.max(0, Number(opts.tiles ?? 9));
  const cycles = Math.max(1, Number(opts.cycles ?? 1));
  const premiumFactor = opts.premium ? Number(opts.premiumFactor ?? 2) : 1;
  const yieldFactor = premiumFactor * (1 + (Number(opts.cityBonus) || 0));
  const seedBack = Math.min(1, crop.seedChance + (opts.useFocus ? crop.focusBonus / 2 : 0));
  const loot = averageLoot(crop.loot);
  const main = loot[0];
  const extras = loot.slice(1);
  const harvestPerTile = main ? main.avg * yieldFactor : 0;
  return {
    tiles, cycles, seedBack,
    seedsPlanted: tiles * cycles,
    seedsReturned: tiles * cycles * seedBack,
    // Zu Beginn wird jedes Feld bepflanzt; danach fehlt je Zyklus nur der nicht zurückgegebene Anteil.
    seedsToBuy: tiles + Math.ceil((cycles - 1) * tiles * (1 - seedBack) - 1e-9),
    seedsNetUse: tiles * cycles * (1 - seedBack),
    products: [
      ...(main ? [{ id: main.id, qty: harvestPerTile * tiles * cycles }] : []),
      ...extras.map((e) => ({ id: e.id, qty: e.avg * tiles * cycles }))
    ],
    focus: opts.useFocus ? focusCost(crop.focusCost, opts.fce) * tiles * cycles : 0,
    hours: (crop.growSeconds / 3600) * cycles
  };
}

/**
 * Tiere aufziehen (Jungtier → ausgewachsen) und optional Produkte/Schlachten.
 * opts: { tiles, premium, premiumFactor, useFocus, fce, favorite, foodNutrition, cityBonus, productDays }
 */
export function planAnimal(animal, opts = {}) {
  const tiles = Math.max(0, Number(opts.tiles ?? 9));
  const premiumFactor = opts.premium ? Number(opts.premiumFactor ?? 2) : 1;
  const foodNutrition = Number(opts.foodNutrition) || 48;
  const perFood = foodNutrition * (opts.favorite ? 1 + (animal.favoriteBonus || 0) : 1);
  const focusFeeds = opts.useFocus ? Math.max(1, animal.focusCycles || 1) : 0;
  const offspring = Math.min(1, animal.offspringChance + (opts.useFocus ? (animal.focusBonus / 2) * focusFeeds : 0));
  const foodToGrow = Math.ceil(animal.nutritionToGrow / perFood - 1e-9);
  const productDays = Math.max(0, Number(opts.productDays) || 0);
  const products = [];
  for (const p of animal.products || []) {
    const runs = p.every ? Math.floor((productDays * 86400) / p.every + 1e-9) : 0;
    for (const l of averageLoot(p.loot)) {
      products.push({ id: l.id, qty: l.avg * runs * tiles * premiumFactor * (1 + (Number(opts.cityBonus) || 0)) });
    }
  }
  return {
    tiles,
    days: animal.growSeconds / 86400,
    offspringChance: offspring,
    babiesReturned: tiles * offspring,
    babiesToBuy: Math.ceil(tiles * (1 - offspring) - 1e-9),
    foodPerAnimal: foodToGrow,
    food: foodToGrow * tiles,
    grownFoodPerDay: animal.grownNutritionPerDay ? Math.ceil((animal.grownNutritionPerDay / perFood) * tiles - 1e-9) : 0,
    focus: opts.useFocus ? focusCost(animal.focusCost, opts.fce) * focusFeeds * tiles : 0,
    products
  };
}

// ---------------------------------------------------------------- Markt

/** Händler-Spanne: in Stadt A kaufen, in Stadt B verkaufen */
export function tradeMargin({ buy, sell, premium = true, buyMode = "instant", sellMode = "order", qty = 1, transport = 0, constants = DEFAULTS }) {
  const cost = grossBuyPrice(buy, { mode: buyMode, constants }) * qty;
  const sale = netSalePrice(sell, { premium, mode: sellMode, constants });
  const revenue = sale.net * qty;
  const profit = revenue - cost - (Number(transport) || 0);
  return { cost, revenue, profit, roi: cost ? profit / cost : null, perItem: qty ? profit / qty : 0 };
}

/** Alter eines Datenpunkts in Stunden (Data-Project-Zeitstempel sind UTC ohne „Z“) */
export function ageHours(ts, now = Date.now()) {
  if (!ts || ts.startsWith("0001")) return null;
  const t = Date.parse(/Z|[+-]\d\d:?\d\d$/.test(ts) ? ts : ts + "Z");
  return Number.isFinite(t) ? (now - t) / 3.6e6 : null;
}

// ---------------------------------------------------------------- Specs (Destiny Board)

const patternCache = new Map();
function patternRe(p) {
  let re = patternCache.get(p);
  if (!re) {
    re = new RegExp(`^${p.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\?/g, "\\d").replace(/\*/g, ".*")}$`);
    patternCache.set(p, re);
  }
  return re;
}

/**
 * Welche Specs senken die Fokuskosten dieses Items? kind: "craft" | "farm"
 * Ergebnis: [{ spec, fcePerLevel }] – FCE = Stufe × fcePerLevel
 */
export function specsForItem(specs, itemId, tier, kind = "craft") {
  const base = itemId.replace(/@\d$/, "");
  const out = [];
  for (const spec of specs || []) {
    let per = 0;
    for (const b of spec.bonuses) {
      if (b.kind !== kind || tier < b.min || tier > b.max) continue;
      if (b.p.some((p) => patternRe(p).test(base))) per += b.fce;
    }
    if (per > 0) out.push({ spec, fcePerLevel: per });
  }
  // Meisterschaften (kleiner Ring) zuerst, dann die Spezialisierung mit dem größten Effekt
  return out.sort((a, b) => b.fcePerLevel - a.fcePerLevel || a.spec.ring - b.spec.ring);
}

/** Fokuskosten-Effizienz aus eingetragenen Spec-Stufen */
export function fceFromSpecs(list, levels = {}) {
  return list.reduce((s, x) => s + Math.min(x.spec.max || 100, Math.max(0, Number(levels[x.spec.id]) || 0)) * x.fcePerLevel, 0);
}
