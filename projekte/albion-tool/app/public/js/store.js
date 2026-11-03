// Lokale Speicherung (localStorage). Alles bleibt im Browser des Spielers.

const KEY = "albion-werkbank-v2";

const DEFAULT_STATE = {
  settings: {
    server: "europe",
    premium: true,
    lang: "de",
    theme: typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark",
    buyCity: "Martlock",
    sellCity: "Martlock",
    buyMode: "instant",
    sellMode: "order",
    focusValue: 0,
    focusPerDay: 10000
  },
  craft: {
    itemId: "T4_PLANKS",
    quantity: 100,
    location: "4000",
    useFocus: false,
    dailyBonus: 0,
    fce: 0,
    fceManual: false,
    stationFee: 300,
    quality: 1,
    craftSelf: [],
    recipeChoice: {},
    inventory: {},
    manualPrices: {},
    manualSale: null
  },
  market: { view: "compare", watch: ["T4_PLANKS", "T5_PLANKS", "T4_BAG", "T4_MEAL_STEW"], quality: 1, cities: ["Bridgewatch", "Caerleon", "Fort Sterling", "Lymhurst", "Martlock", "Thetford", "Brecilien", "Black Market"] },
  island: {
    city: "Lymhurst",
    fce: 0,
    fceManual: false,
    priceCity: "Lymhurst",
    plots: [
      { id: "p1", type: "farm", content: "T1_FARM_CARROT_SEED", tiles: 9, useFocus: false, cycles: 1 },
      { id: "p2", type: "pasture", content: "T4_FARM_GOAT_BABY", tiles: 9, useFocus: false, cycles: 1, favorite: true, productDays: 0 }
    ],
    manualPrices: {}
  },
  // Spec-Stufen aus dem Destiny Board: { SPEC_ID: Stufe }
  specs: {},
  profile: { search: "", cat: "crafting" },
  plans: [],
  // Marktdaten-Schnappschuss: key "ID|Stadt|Qualität" -> Datensatz des Data Project
  prices: {},
  pricesFetchedAt: null
};

function merge(base, extra) {
  if (Array.isArray(base)) return Array.isArray(extra) ? extra : base;
  if (base && typeof base === "object") {
    const out = { ...base };
    for (const [k, v] of Object.entries(extra || {})) out[k] = k in base ? merge(base[k], v) : v;
    return out;
  }
  return extra === undefined ? base : extra;
}

export function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    return merge(structuredClone(DEFAULT_STATE), raw || {});
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

let timer;
export function saveState(state) {
  clearTimeout(timer);
  timer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      // Speicher voll: alte Marktdaten verwerfen und erneut versuchen
      state.prices = {};
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignorieren */ }
      console.warn("Speichern fehlgeschlagen:", e);
    }
  }, 250);
}

export function resetState() {
  localStorage.removeItem(KEY);
  return structuredClone(DEFAULT_STATE);
}

export function validImport(value) {
  return value && typeof value === "object" && value.settings && Array.isArray(value.plans);
}

export { DEFAULT_STATE };
