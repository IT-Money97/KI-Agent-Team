// Marktdaten über den lokalen Proxy (server.js) vom Albion Online Data Project.
import { ageHours } from "./calc.js";

export const CITIES = ["Bridgewatch", "Caerleon", "Fort Sterling", "Lymhurst", "Martlock", "Thetford", "Brecilien", "Black Market"];
export const ROYAL = ["Bridgewatch", "Fort Sterling", "Lymhurst", "Martlock", "Thetford"];

const key = (id, city, q) => `${id}|${city}|${q}`;

function chunks(ids, maxLen = 2800) {
  const out = [];
  let cur = [];
  let len = 0;
  for (const id of ids) {
    if (cur.length && len + id.length + 1 > maxLen) { out.push(cur); cur = []; len = 0; }
    cur.push(id);
    len += id.length + 1;
  }
  if (cur.length) out.push(cur);
  return out;
}

async function getJson(url) {
  let res;
  try {
    res = await fetch(url);
  } catch {
    throw new Error("Lokaler Server nicht erreichbar. Bitte die Werkbank über start.bat bzw. start.sh starten.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body;
}

/** Lädt aktuelle Preise und legt sie in state.prices ab. Gibt Anzahl Datensätze zurück. */
export async function fetchPrices(state, ids, { cities = CITIES, qualities = [1] } = {}) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return 0;
  let count = 0;
  for (const part of chunks(unique)) {
    const q = new URLSearchParams({ server: state.settings.server, items: part.join(","), locations: cities.join(","), qualities: qualities.join(",") });
    const body = await getJson(`/api/market/prices?${q}`);
    for (const row of body.data || []) {
      const city = normalizeCity(row.city);
      state.prices[key(row.item_id, city, row.quality)] = {
        sellMin: row.sell_price_min || null, sellMinDate: row.sell_price_min_date,
        buyMax: row.buy_price_max || null, buyMaxDate: row.buy_price_max_date,
        server: state.settings.server
      };
      count++;
    }
  }
  state.pricesFetchedAt = new Date().toISOString();
  return count;
}

export async function fetchHistory(state, id, { cities = CITIES, quality = 1, scale = 24 } = {}) {
  const q = new URLSearchParams({ server: state.settings.server, items: id, locations: cities.join(","), qualities: String(quality), "time-scale": String(scale) });
  const body = await getJson(`/api/market/history?${q}`);
  return (body.data || []).map((s) => ({ city: normalizeCity(s.location), quality: s.quality, points: (s.data || []).map((p) => ({ t: Date.parse(p.timestamp + (p.timestamp.endsWith("Z") ? "" : "Z")), avg: p.avg_price, count: p.item_count })) }));
}

function normalizeCity(c) {
  if (!c) return c;
  if (/black ?market/i.test(c)) return "Black Market";
  if (/^\d+$/.test(c)) return c;
  return c.replace(/\s*Portal$/i, "");
}

/** Marktpreis-Eintrag: { price, age, source } oder null */
export function marketQuote(state, id, city, quality, side) {
  const row = state.prices[key(id, city, quality)];
  if (!row || row.server !== state.settings.server) return null;
  const price = side === "sell" ? row.sellMin : row.buyMax;
  if (!price) return null;
  return { price, age: ageHours(side === "sell" ? row.sellMinDate : row.buyMaxDate), side };
}

/** Einkaufspreis gemäß Einkaufsart: Sofortkauf = günstigstes Verkaufsangebot, Kaufauftrag = höchstes Kaufgebot */
export function buyQuote(state, id, city, quality = 1) {
  return marketQuote(state, id, city, quality, state.settings.buyMode === "order" ? "buy" : "sell");
}

/** Verkaufspreis gemäß Verkaufsart: Auftrag = günstigstes Verkaufsangebot (unterbieten), Sofort = höchstes Kaufgebot */
export function sellQuote(state, id, city, quality = 1, mode = state.settings.sellMode) {
  return marketQuote(state, id, city, quality, mode === "order" ? "sell" : "buy");
}

export function hasMarketData(state) {
  return Object.keys(state.prices).length > 0;
}
