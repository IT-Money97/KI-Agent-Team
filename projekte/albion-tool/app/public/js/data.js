// Spieldaten laden und durchsuchbar machen.

export const GROUPS = [
  { id: "crafting", label: "Veredeln (Refining)" },
  { id: "weapons", label: "Waffen" },
  { id: "armors", label: "Rüstungen" },
  { id: "head", label: "Helme/Kapuzen" },
  { id: "shoes", label: "Schuhe" },
  { id: "offhands", label: "Nebenhand" },
  { id: "capes", label: "Umhänge" },
  { id: "bags", label: "Taschen" },
  { id: "consumables", label: "Essen & Tränke" },
  { id: "farming", label: "Farming (Fleisch …)" },
  { id: "mounts", label: "Reittiere" },
  { id: "gathering", label: "Sammler-Ausrüstung & Werkzeuge" },
  { id: "artefacts", label: "Artefakte" },
  { id: "other", label: "Sonstiges" },
  { id: "furniture", label: "Möbel" },
  { id: "vanity", label: "Kosmetik" }
];

export const TIER_NAMES = { 1: "Anfänger", 2: "Neuling", 3: "Geselle", 4: "Adept", 5: "Experte", 6: "Meister", 7: "Großmeister", 8: "Älterer" };

let DATA = null;
let FAMILIES = null;

export async function loadGameData() {
  const res = await fetch("data/gamedata.json", { cache: "no-cache" });
  if (!res.ok) throw new Error(`Spieldaten fehlen (HTTP ${res.status}). Bitte „npm run update-data“ ausführen.`);
  DATA = await res.json();
  buildFamilies();
  return DATA;
}

export const data = () => DATA;

export function familyKey(id) {
  return id.replace(/@\d$/, "").replace(/_LEVEL\d$/, "").replace(/^T\d_/, "");
}

/** Für die Suche: Kleinbuchstaben, Umlaute ausgeschrieben, Satzzeichen weg */
export function norm(text) {
  return String(text).toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9@.]+/g, " ");
}

// Tier-Wörter (deutsch und englisch) → Tier-Filter
const TIER_WORDS = { anfaenger: 1, beginner: 1, neuling: 2, novizen: 2, novice: 2, geselle: 3, gesellen: 3, journeyman: 3, adept: 4, adepten: 4, experte: 5, experten: 5, expert: 5, meister: 6, meisters: 6, master: 6, grossmeister: 7, grossmeisters: 7, grandmaster: 7, aeltester: 8, aeltesten: 8, aelterer: 8, elder: 8 };
// Häufige Spielerbegriffe, die im Spiel anders heißen
const SYNONYMS = { heiltrank: "lebenstrank", heiltraenke: "lebenstrank", karotte: "moehre", karotten: "moehre", tasche: "tasche tornister bag", reittier: "mount reitpferd gesattelter", mount: "reittier reitpferd", sattel: "gesattelter gesattelte reitpferd", pferd: "pferd horse", holz: "holz wood planken", erz: "erz ore", barren: "barren bar", stoff: "stoff cloth", fell: "fell hide" };

function buildFamilies() {
  FAMILIES = new Map();
  for (const [id, it] of Object.entries(DATA.items)) {
    const fk = familyKey(id);
    let f = FAMILIES.get(fk);
    if (!f) FAMILIES.set(fk, (f = { key: fk, ids: [], craftable: false, search: "", names: new Set(), group: it.s, translated: false }));
    f.ids.push(id);
    if (DATA.recipes[id]) f.craftable = true;
    if (it.n && it.n !== id) f.translated = true;
    if (it.l === 0) f.names.add(id);
  }
  for (const f of FAMILIES.values()) {
    // Quest-/Handelswaren, Testitems und Items ohne Übersetzung aus der Suche ausblenden
    f.hidden = /QUESTITEM|TRADEPACK|_TEST|^UNIQUE_|TUTORIAL|SKIN_|NONTRADABLE|KILL_EMOTE|LOOTBAG/.test(f.key) || !f.translated;
    // je Basis-Item (ohne Verzauberung) die Wörter des deutschen und englischen Namens
    f.entries = [...f.names].map((id) => ({ id, t: DATA.items[id].t, words: `${norm(DATA.items[id].n)} ${norm(DATA.items[id].e)}`.split(/\s+/).filter(Boolean) }));
    f.keyWords = norm(f.key.replace(/_/g, " ")).split(/\s+/).filter(Boolean);
    f.ids.sort((a, b) => DATA.items[a].t - DATA.items[b].t || DATA.items[a].l - DATA.items[b].l);
  }
}

export function family(id) {
  return FAMILIES.get(familyKey(id));
}

/** Anzeigename eines Items (ohne Tierpräfix) */
export function itemName(id, lang = "de") {
  const it = DATA?.items[id];
  if (!it) return id;
  return lang === "en" ? it.e : it.n;
}

export function itemLabel(id, lang = "de") {
  const it = DATA?.items[id];
  if (!it) return id;
  return `${itemName(id, lang)} · ${tierLabel(id)}`;
}

export function tierLabel(id) {
  const it = DATA?.items[id];
  if (!it) return "";
  return it.t ? `T${it.t}${it.l ? `.${it.l}` : ""}` : "";
}

/** Suche nach Item-Familien. opts: { craftable, group } */
export const POPULAR = ["T4_BAG", "T4_PLANKS", "T4_CLOTH", "T4_LEATHER", "T4_METALBAR", "T4_STONEBLOCK", "T4_MEAL_STEW", "T4_POTION_HEAL", "T4_MAIN_SWORD", "T4_ARMOR_LEATHER_SET1", "T4_CAPE", "T4_MOUNT_HORSE"];

// Kategorien, die bei der Suche nach hinten rutschen (Möbel, Kosmetik …)
const LOW_GROUPS = new Set(["furniture", "vanity", "other", ""]);

/**
 * Suche nach Item-Familien. Versteht auch Tier-Angaben: „t5 tasche“, „tasche 6.1“, „Großmeister Tasche“,
 * Item-IDs („T4_BAG@1“), Umlaute ohne Punkte („grossmeister“) und einige Spielerbegriffe („Heiltrank“).
 * opts: { craftable, group, limit, lang }
 * Ergebnis: [{ family, id, name }] – id ist die passende Variante (Tier/Verzauberung)
 */
export function searchFamilies(query, { craftable = false, group = "", limit = 40, lang = "de" } = {}) {
  const raw = String(query || "").trim();
  if (!raw && !group) {
    return POPULAR.filter((id) => DATA.items[id]).map((id) => ({ family: family(id), id, name: itemName(id, lang), popular: true }));
  }
  // Direkte Item-ID
  const direct = raw.toUpperCase();
  if (/^T\d_[A-Z0-9_]+(@\d)?$/.test(direct) && DATA.items[direct]) return [{ family: family(direct), id: direct, name: itemName(direct, lang) }];

  let tier = null, ench = null;
  const words = [];
  for (const w of norm(raw).split(/\s+/).filter(Boolean)) {
    const t = w.match(/^t?([1-8])(?:[.@]([0-4]))?$/);
    if (t) { tier = Number(t[1]); if (t[2] != null) ench = Number(t[2]); continue; }
    const e = w.match(/^[.@]([0-4])$/);
    if (e) { ench = Number(e[1]); continue; }
    if (TIER_WORDS[w]) { tier = TIER_WORDS[w]; continue; }
    words.push(w);
  }
  const alts = words.map((w) => (SYNONYMS[w] ? [w, ...SYNONYMS[w].split(" ")] : [w]));

  // Punkte je Suchwort: ganzes Wort 6, Wortanfang 5, im Wort (z. B. „Breit-schwert“) 3, nur in der Item-ID 2; Synonyme 1 weniger
  const wordScore = (entryWords, keyWords, options) => {
    let best = -1;
    options.forEach((w, i) => {
      const minus = i ? 1 : 0;
      for (const ew of entryWords) {
        if (ew === w) best = Math.max(best, 6 - minus);
        else if (ew.startsWith(w)) best = Math.max(best, 5 - minus);
        else if (w.length >= 4 && ew.includes(w)) best = Math.max(best, 3 - minus);
      }
      if (keyWords.includes(w)) best = Math.max(best, 2 - minus);
      else if (w.length >= 3 && keyWords.some((k) => k.startsWith(w))) best = Math.max(best, 1 - minus);
    });
    return best;
  };
  const scored = [];
  for (const f of FAMILIES.values()) {
    if (f.hidden) continue;
    if (craftable && !f.craftable) continue;
    if (group && f.group !== group) continue;
    let top = null;
    for (const e of f.entries) {
      if (tier != null && e.t !== tier) continue;
      let score = 0;
      for (const options of alts) {
        const sc = wordScore(e.words, f.keyWords, options);
        if (sc < 0) { score = -1; break; }
        score += sc;
      }
      if (score < 0) continue;
      if (!top || score > top.score || (score === top.score && Math.abs(e.t - 4) < Math.abs(top.t - 4))) top = { ...e, score };
    }
    if (!top) continue;
    const pick = pickVariant(f, tier ?? top.t, ench, top.id);
    if (!pick) continue;
    let score = top.score;
    if (f.craftable) score += 1;
    if (LOW_GROUPS.has(f.group)) score -= 3;
    scored.push({ family: f, id: pick, name: itemName(pick, lang), score });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.name.length - b.name.length || a.name.localeCompare(b.name, "de"))
    .slice(0, limit);
}

/** Passende Variante einer Familie: gewünschtes Tier/Verzauberung, sonst T4.0 */
function pickVariant(f, tier, ench, preferred) {
  if (preferred && ench == null) return preferred;
  const items = f.ids.map((id) => [id, DATA.items[id]]);
  const ok = items.filter(([, it]) => (tier == null || it.t === tier) && (ench == null || it.l === ench));
  if (!ok.length) return null;
  const pref = ok.find(([, it]) => it.l === (ench ?? 0) && it.t === (tier ?? 4)) || ok.find(([, it]) => it.l === (ench ?? 0)) || ok[0];
  return pref[0];
}

/** Varianten (Tier × Verzauberung) einer Familie */
export function variants(id) {
  const f = family(id);
  if (!f) return { tiers: [], enchants: [] };
  const byTier = new Map();
  for (const vid of f.ids) {
    const it = DATA.items[vid];
    if (!byTier.has(it.t)) byTier.set(it.t, new Map());
    byTier.get(it.t).set(it.l, vid);
  }
  return byTier;
}

export function locationOptions() {
  const named = DATA.locations.filter((l) => !l.hideout);
  const hideouts = DATA.locations.filter((l) => l.hideout);
  return [
    { group: "Städte & Rasten", options: named.map((l) => ({ value: l.id, label: l.name })) },
    { group: "Insel", options: named.filter((l) => !/Rast/.test(l.name)).map((l) => ({ value: `island:${l.id}`, label: `Insel bei ${l.name}` })) },
    { group: "Hideouts (Outlands)", options: hideouts.map((l) => ({ value: l.id, label: l.name.replace("Hideout ", "Hideout ") })) },
    { group: "Sonstiges", options: [{ value: "custom", label: "Eigener Bonus …" }] }
  ];
}

export function resolveLocation(value, customBonus = 0) {
  if (value === "custom") return { location: { custom: true, bonus: customBonus, name: "Eigener Bonus" }, island: false };
  if (value?.startsWith("island:")) return { location: DATA.locations.find((l) => l.id === value.slice(7)), island: true };
  return { location: DATA.locations.find((l) => l.id === value) || DATA.locations[0], island: false };
}

/** Name der Royal-City (für Marktabfragen) zu einem Standort */
export function marketCityForLocation(loc) {
  const map = { "Arthurs Rast": "Caerleon", "Merlyns Rast": "Caerleon", "Morganas Rast": "Caerleon" };
  if (!loc || loc.custom || loc.hideout) return null;
  return map[loc.name] || loc.name;
}
