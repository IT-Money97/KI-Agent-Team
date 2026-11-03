#!/usr/bin/env node
// Baut public/data/gamedata.json aus den ao-bin-dumps (Community-Export der Albion-Spieldaten).
// Aufruf: node tools/build-data.mjs [--offline]   (--offline nutzt nur den lokalen Cache in .cache/)
// Keine Abhängigkeiten, Node 18+.

import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = path.join(ROOT, ".cache");
const OUT = path.join(ROOT, "public", "data", "gamedata.json");
const BASE = "https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/";
const SOURCES = {
  items: "items.json",
  names: "formatted/items.json",
  loot: "loot.json",
  crafting: "craftingmodifiers.json",
  farming: "farmingmodifiers.json",
  achievements: "achievements.json", // Destiny Board: Specs und Fokus-Rabatte
  localization: "localization.xml" // nur für Spec-Namen (optional, ca. 75 MB)
};
const OPTIONAL = new Set(["localization"]);
const RAW = new Set(["localization"]);

// Stadt-Cluster-IDs aus craftingmodifiers.xml / farmingmodifiers.xml
export const CLUSTERS = {
  "0000": "Thetford", "1000": "Lymhurst", "2000": "Bridgewatch", "3004": "Martlock",
  "4000": "Fort Sterling", "3003": "Caerleon", "5000": "Brecilien",
  "4300": "Arthurs Rast", "1012": "Merlyns Rast", "0008": "Morganas Rast"
};

const offline = process.argv.includes("--offline");

async function load(key, log = console.log) {
  const file = path.join(CACHE, SOURCES[key].replace(/\//g, "_"));
  if (!offline) {
    log(`Lade ${SOURCES[key]} …`);
    const res = await fetch(BASE + SOURCES[key], { headers: { "User-Agent": "albion-werkbank-local" } });
    if (!res.ok) throw new Error(`${SOURCES[key]}: HTTP ${res.status}`);
    const text = await res.text();
    await mkdir(CACHE, { recursive: true });
    await writeFile(file, text);
    return RAW.has(key) ? text : JSON.parse(text);
  }
  await stat(file);
  const text = await readFile(file, "utf8");
  return RAW.has(key) ? text : JSON.parse(text);
}

/** Spec-Namen (DE/EN) aus localization.xml ziehen – nur Einträge @DESTINYBOARD_TITLE_* */
function parseSpecNames(xml) {
  const out = {};
  if (!xml) return out;
  const re = /<tu tuid="@DESTINYBOARD_TITLE_([A-Z0-9_]+)">([\s\S]*?)<\/tu>/g;
  let m;
  while ((m = re.exec(xml))) {
    const seg = (lang) => (m[2].match(new RegExp(`xml:lang="${lang}">\\s*<seg>([^<]*)</seg>`)) || [])[1];
    out[m[1]] = [seg("DE-DE") || seg("EN-US") || m[1], seg("EN-US") || m[1]];
  }
  return out;
}

/** Specs (Destiny Board) mit Fokus-Rabatten. bonus je Stufe × 100 = FCE je Stufe. */
function parseSpecs(ach, names) {
  const root = ach[Object.keys(ach).find((k) => k !== "?xml")];
  const maxLevels = {};
  for (const t of arr(root.template)) {
    const raw = typeof t.baselevels === "string" ? t.baselevels : t.baselevels?.["#text"] || "";
    const rows = raw.split(/\s+/).filter((l) => /^\d/.test(l)).length;
    maxLevels[t["@name"]] = rows || 100;
  }
  const specs = [];
  for (const a of [...arr(root.templateachievement), ...arr(root.achievement)]) {
    const bonuses = arr(a.baserewards?.bonus)
      .filter((b) => /focuscostreduction$/.test(b["@type"] || ""))
      .map((b) => ({
        kind: b["@type"].startsWith("farming") ? "farm" : "craft",
        fce: Math.round(num(b["@bonus"]) * 100 * 100) / 100,
        min: num(b["@mintier"], 0), max: num(b["@maxtier"], 8),
        p: arr(b.itempattern).map((x) => x["@pattern"])
      }));
    if (!bonuses.length) continue;
    const id = a["@id"];
    const [de, en] = names[id] || [id, id];
    specs.push({
      id, n: de, e: en, cat: a["@category"] || "", ring: num(a["@ring"]),
      max: maxLevels[a["@usetemplate"]] || 100,
      parents: arr(a.parentachievements?.achievement).map((x) => x["@id"]),
      bonuses
    });
  }
  return specs;
}

const arr = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const round = (n, d = 4) => Math.round(n * 10 ** d) / 10 ** d;

/** Kanonische Item-ID wie im Spiel-Markt / Data-Project: X_LEVEL1@1 bzw. T4_MAIN_SWORD@1 */
function refId(uniquename, enchant) {
  const e = num(enchant);
  return e > 0 && !uniquename.includes("@") ? `${uniquename}@${e}` : uniquename;
}

let itemEnchant = new Map();

function parseRecipes(reqs) {
  const out = [];
  for (const req of arr(reqs)) {
    const res = arr(req.craftresource);
    if (!res.length) continue;
    out.push({
      a: num(req["@amountcrafted"], 1) || 1,
      f: num(req["@craftingfocus"]),
      s: num(req["@silver"]),
      ...(req["@returnproductnotresource"] === "true" ? { p: 1 } : {}),
      r: res.map((c) => {
        const ench = c["@enchantmentlevel"] ?? itemEnchant.get(c["@uniquename"]) ?? 0;
        const row = [refId(c["@uniquename"], ench), num(c["@count"], 1)];
        if (c["@maxreturnamount"] === "0") row.push(0); // nicht rückgabefähig (Artefakte, Tiere, Token …)
        return row;
      })
    });
  }
  return out;
}

export function buildGameData(src) {
  const specs = src.achievements ? parseSpecs(src.achievements, parseSpecNames(src.localization)) : [];
  const nameMap = new Map();
  for (const n of src.names) {
    const ln = n.LocalizedNames || {};
    nameMap.set(n.UniqueName, [ln["DE-DE"] || ln["EN-US"] || n.UniqueName, ln["EN-US"] || n.UniqueName]);
  }

  const items = {};
  const recipes = {};
  const raw = src.items.items;
  const all = [];
  for (const [kind, list] of Object.entries(raw)) {
    for (const it of arr(list)) if (it && it["@uniquename"]) all.push([kind, it]);
  }

  const addItem = (id, it, kind, enchant, extra = {}) => {
    const [de, en] = nameMap.get(id) || nameMap.get(id.split("@")[0]) || [id, id];
    items[id] = {
      n: de, e: en,
      t: num(it["@tier"]), l: enchant,
      k: kind,
      c: it["@craftingcategory"] || "",
      s: it["@shopcategory"] || "",
      s1: it["@shopsubcategory1"] || "",
      s2: it["@shopsubcategory2"] || "",
      ...(it["@itemvalue"] ? { v: num(it["@itemvalue"]) } : {}),
      ...(it["@weight"] ? { w: num(it["@weight"]) } : {}),
      ...(num(it["@maxqualitylevel"], 1) > 1 || ["weapon", "equipmentitem"].includes(kind) ? { q: 1 } : {}),
      ...(it["@nutrition"] ? { nu: num(it["@nutrition"]) } : {}),
      ...(it["@foodcategory"] ? { fc: it["@foodcategory"] } : {}),
      ...extra
    };
  };

  itemEnchant = new Map(all.map(([, it]) => [it["@uniquename"], num(it["@enchantmentlevel"])]));
  for (const [kind, it] of all) {
    const ench = num(it["@enchantmentlevel"]);
    const id = refId(it["@uniquename"], ench);
    addItem(id, it, kind, ench);
    if (kind !== "farmableitem") {
      const rs = parseRecipes(it.craftingrequirements);
      if (rs.length) recipes[id] = rs;
    }
    for (const en of arr(it.enchantments?.enchantment)) {
      const lvl = num(en["@enchantmentlevel"]);
      if (!lvl) continue;
      const eid = `${it["@uniquename"]}@${lvl}`;
      addItem(eid, { ...it, ...en }, kind, lvl);
      const rs = parseRecipes(en.craftingrequirements);
      if (rs.length) recipes[eid] = rs;
    }
  }

  // Item-Wert: Attribut oder (für Ausrüstung) Summe der Zutatenwerte des ersten Rezepts.
  const visiting = new Set();
  const value = (id) => {
    const it = items[id];
    if (!it) return 0;
    if (it.v != null) return it.v;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const r = recipes[id]?.[0];
    let v = 0;
    if (r) v = r.r.reduce((s, [rid, c]) => s + value(rid) * c, 0) / (r.a || 1);
    visiting.delete(id);
    it.v = round(v, 2);
    return it.v;
  };
  for (const id of Object.keys(recipes)) value(id);

  // Crafting-Standorte
  const cm = src.crafting.craftingmodifiers;
  const refiningCategories = arr(cm.refiningcategory?.item).map((i) => i["@category"]);
  const locations = [];
  for (const loc of arr(cm.craftinglocation)) {
    const mods = Object.fromEntries(arr(loc.craftingmodifier).map((m) => [m["@name"], num(m["@value"])]));
    if (loc["@clusterid"] && CLUSTERS[loc["@clusterid"]]) {
      locations.push({
        id: loc["@clusterid"], name: CLUSTERS[loc["@clusterid"]] || loc["@clusterid"],
        refining: num(loc.refiningbonus?.["@value"]), crafting: num(loc.craftingbonus?.["@value"]),
        island: { refining: num(loc.refiningbonus?.["@islandvalue"]), crafting: num(loc.craftingbonus?.["@islandvalue"]) },
        mods
      });
    } else if (loc["@continent"] && loc["@biome"]) {
      locations.push({
        id: `${loc["@continent"]}_${loc["@biome"]}_${loc["@clusterquality"]}`,
        name: `Hideout ${({ SWAMP: "Sumpf", FOREST: "Wald", STEPPE: "Steppe", HIGHLAND: "Hochland", MOUNTAIN: "Berge" })[loc["@biome"]] || loc["@biome"]} ${loc["@clusterquality"]}`,
        hideout: true,
        refining: num(loc.refiningbonus?.["@value"]), crafting: num(loc.craftingbonus?.["@value"]),
        mods
      });
    }
  }

  // Farming-Modifikatoren (Stadt- bzw. Inselbonus auf Ertrag)
  const farmMods = {};
  for (const loc of arr(src.farming.farmingmodifiers.location)) {
    if (!loc["@clusterid"]) continue;
    const name = CLUSTERS[loc["@clusterid"]] || loc["@clusterid"];
    farmMods[name] = Object.fromEntries(arr(loc.farmingyieldmodifier).map((m) => [m["@farmable"], { city: num(m["@value"]), island: num(m["@islandvalue"]) }]));
  }

  // Lootlisten
  const lootMap = new Map();
  for (const l of arr(src.loot.LootDefinition?.Lootlist)) lootMap.set(l["@name"], arr(l.Item));
  const parseLoot = (name) => arr(lootMap.get(name)).map((i) => {
    const [mn, mx] = String(i["@amount"] || "1").split("-").map(Number);
    return { id: refId(i["@type"], 0), chance: num(i["@chance"], 1), min: mn, max: Number.isFinite(mx) ? mx : mn };
  });

  // Rückwärtsindex: welche Rezepte verbrauchen ein Item (z. B. Schlachten von Tieren)
  const usedBy = {};
  for (const [pid, rs] of Object.entries(recipes)) for (const r of rs) for (const [rid] of r.r) (usedBy[rid] ||= new Set()).add(pid);

  const crops = [];
  const animals = [];
  for (const [kind, it] of all) {
    if (kind !== "farmableitem") continue;
    const id = it["@uniquename"];
    const base = {
      id, tier: num(it["@tier"]), building: it["@shopsubcategory1"] || "",
      focusCost: num(it["@activefarmfocuscost"]), focusBonus: num(it["@activefarmbonus"]),
      focusCycles: num(it["@activefarmmaxcycles"], 1), cycleSeconds: num(it["@activefarmcyclelengthseconds"])
    };
    if (it.harvest) {
      const h = it.harvest;
      crops.push({ ...base, kind: it["@kind"], growSeconds: num(h["@growtime"]), seedChance: num(h.seed?.["@chance"]), loot: parseLoot(h["@lootlist"]) });
    } else if (it.grownitem) {
      const g = it.grownitem;
      const grown = all.find(([, x]) => x["@uniquename"] === g["@uniquename"])?.[1] || {};
      const food = arr(it.consumption?.food)[0] || {};
      const gfood = arr(grown.consumption?.food)[0] || {};
      const accepted = arr(food.acceptedfood)[0] || {};
      const products = arr(grown.products?.product).map((p) => ({ every: num(p["@productiontime"]), loot: parseLoot(p["@lootlist"]) }));
      animals.push({
        ...base,
        grown: g["@uniquename"], growSeconds: num(g["@growtime"]),
        offspringChance: num(g.offspring?.["@chance"]),
        nutritionToGrow: num(food["@nutritionmax"]), food: accepted["@foodcategory"] || "",
        favorite: accepted["@favorite"] || "", favoriteBonus: num(accepted["@favoritebonus"]),
        grownNutritionPerDay: gfood["@secondspernutrition"] ? round(86400 / num(gfood["@secondspernutrition"]), 2) : 0,
        products,
        usedBy: [...(usedBy[g["@uniquename"]] || [])].sort()
      });
    }
  }

  // Futtermittel
  const foods = Object.entries(items).filter(([, i]) => i.nu && i.fc && i.l === 0).map(([id, i]) => ({ id, nutrition: i.nu, category: i.fc }));

  return {
    meta: { source: "ao-data/ao-bin-dumps", builtAt: new Date().toISOString(), items: Object.keys(items).length, recipes: Object.keys(recipes).length },
    constants: {
      focusProductionBonus: 0.59, // gamedata.xml ActionFocus/CraftingEfficiency
      marketSetupFee: 0.025, // gamedata.xml MarketPlace/setupfee
      marketSalesTax: 0.08, // gamedata.xml MarketPlace/transactiontax (ohne Premium)
      marketSalesTaxPremium: 0.04, // Premium halbiert die Verkaufssteuer
      stationNutritionFactor: 0.1125 // Nährwert je Item-Wert (Stationsgebühr)
    },
    refiningCategories,
    locations,
    farmMods,
    specs,
    items,
    recipes,
    farming: { crops, animals, foods }
  };
}

async function main() {
  const src = {};
  for (const key of Object.keys(SOURCES)) {
    try { src[key] = await load(key); }
    catch (e) { if (!OPTIONAL.has(key)) throw e; console.warn(`Optional übersprungen: ${SOURCES[key]} (${e.message})`); }
  }
  const data = buildGameData(src);
  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(data));
  const size = (await stat(OUT)).size;
  console.log(`Fertig: ${data.meta.items} Items, ${data.meta.recipes} Rezepte, ${(size / 1e6).toFixed(1)} MB → ${path.relative(ROOT, OUT)}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error("Fehler beim Datenaufbau:", e.message); process.exit(1); });
}
