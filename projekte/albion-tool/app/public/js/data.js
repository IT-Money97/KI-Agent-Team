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

function buildFamilies() {
  FAMILIES = new Map();
  for (const [id, it] of Object.entries(DATA.items)) {
    const fk = familyKey(id);
    let f = FAMILIES.get(fk);
    if (!f) FAMILIES.set(fk, (f = { key: fk, ids: [], craftable: false, search: "", group: it.s }));
    f.ids.push(id);
    if (DATA.recipes[id]) f.craftable = true;
    if (it.l === 0) f.search += ` ${it.n} ${it.e}`.toLowerCase();
  }
  for (const f of FAMILIES.values()) {
    // Quest-/Handelswaren und Items ohne Übersetzung aus der Suche ausblenden
    const first = DATA.items[f.ids[0]];
    f.hidden = /QUESTITEM|TRADEPACK|_TEST|^UNIQUE_|TUTORIAL|SKIN_/.test(f.key) || first.n === f.ids[0];
    f.search += ` ${f.key.toLowerCase().replace(/_/g, " ")}`;
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

export function searchFamilies(query, { craftable = false, group = "", limit = 40, lang = "de" } = {}) {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!words.length && !group) {
    return POPULAR.filter((id) => DATA.items[id]).map((id) => ({ family: family(id), id, name: itemName(id, lang), popular: true }));
  }
  const out = [];
  for (const f of FAMILIES.values()) {
    if (f.hidden) continue;
    if (craftable && !f.craftable) continue;
    if (group && f.group !== group) continue;
    if (words.length && !words.every((w) => f.search.includes(w))) continue;
    out.push(f);
    if (out.length >= limit * 4) break;
  }
  const rep = (f) => f.ids.find((i) => DATA.items[i].l === 0 && DATA.items[i].t === 4) || f.ids.find((i) => DATA.items[i].l === 0) || f.ids[0];
  return out
    .map((f) => ({ family: f, id: rep(f), name: itemName(rep(f), lang) }))
    .sort((a, b) => {
      if (words.length) {
        const q = words.join(" ");
        const sa = a.name.toLowerCase().startsWith(q) ? 0 : 1;
        const sb = b.name.toLowerCase().startsWith(q) ? 0 : 1;
        if (sa !== sb) return sa - sb;
      }
      return a.name.localeCompare(b.name, "de");
    })
    .slice(0, limit);
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
