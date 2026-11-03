// Tests für Suche und Insel-Logik (ohne Browser: fetch wird durch die lokale Datei ersetzt)
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const raw = readFileSync(new URL("../public/data/gamedata.json", import.meta.url), "utf8");
globalThis.fetch = async () => ({ ok: true, json: async () => JSON.parse(raw) });
const dataMod = await import("../public/js/data.js");
await dataMod.loadGameData();
const { searchFamilies } = dataMod;
const { computePlot, compareUses, animalUses } = await import("../public/js/views/island.js");
const { DEFAULT_STATE } = await import("../public/js/store.js");

const ids = (q, opts) => searchFamilies(q, { limit: 10, ...opts }).map((r) => r.id);

test("Suche versteht Tier, Verzauberung, Umlaute und Spielerbegriffe", () => {
  assert.equal(ids("t5 tasche")[0], "T5_BAG");
  assert.equal(ids("grossmeister tasche")[0], "T7_BAG");
  assert.equal(ids("planken 6.1")[0], "T6_PLANKS_LEVEL1@1");
  assert.equal(ids("heiltrank")[0], "T4_POTION_HEAL");
  assert.ok(ids("pferd").includes("T4_MOUNT_HORSE"));
  assert.ok(ids("fohlen").includes("T4_FARM_HORSE_BABY"));
  assert.equal(ids("T6_BAG@1")[0], "T6_BAG@1");
  // Echte Waffen vor Möbeln
  assert.equal(ids("schwert")[0], "T4_MAIN_SWORD");
  assert.ok(!ids("tasche").some((id) => /LOOTBAG/.test(id)));
});

function state(prices) {
  const s = structuredClone(DEFAULT_STATE);
  s.island.manualPrices = prices;
  return s;
}

test("Pferde: satteln, verkaufen und Empfehlung", () => {
  const horse = dataMod.data().farming.animals.find((a) => a.id === "T3_FARM_HORSE_BABY");
  assert.deepEqual(animalUses(horse).mounts, ["T3_MOUNT_HORSE"]);
  const plot = { id: "x", type: "pasture", content: "T3_FARM_HORSE_BABY", tiles: 5, useFocus: false, use: "saddle" };
  // Preise: Fohlen 1000, Futter 10, Pferd 5000, Leder 100, Reitpferd 6000
  const prices = { T3_FARM_HORSE_BABY: 1000, T3_FARM_HORSE_GROWN: 5000, T3_LEATHER: 100, T3_MOUNT_HORSE: 6000 };
  for (const f of dataMod.data().farming.foods) prices[f.id] = 10;
  const s = state(prices);
  const r = computePlot(s, plot);
  const leather = r.lines.find((l) => l.id === "T3_LEATHER");
  assert.equal(leather.qty, 100); // 20 Leder × 5 Tiere, Insel ohne Fokus: keine Rückgabe
  assert.ok(r.lines.some((l) => l.id === "T3_MOUNT_HORSE" && l.qty === 5));
  // Reitpferd 6000 − 2000 Leder < Pferd 5000 → verkaufen ist besser
  const rank = compareUses(s, plot);
  assert.equal(rank[0].use, "sell");
  // Posten abwählen: Jungtiere selbst gezüchtet
  const own = computePlot(s, { ...plot, skip: ["Jungtiere|T3_FARM_HORSE_BABY"] });
  assert.ok(Math.abs(own.profit - r.profit - 5000) < 1e-6);
});
