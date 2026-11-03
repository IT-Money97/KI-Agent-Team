import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  productionBonus, returnRateFromBonus, focusCost, stationFee, netSalePrice,
  planProduction, shoppingList, productionResult, planCrop, planAnimal, tradeMargin, ageHours
} from "../public/js/calc.js";

const data = JSON.parse(readFileSync(new URL("../public/data/gamedata.json", import.meta.url)));
const loc = (name) => data.locations.find((l) => l.name === name);
const close = (a, b, eps = 1e-3) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test("Rückgabequoten entsprechen den bekannten Werten", () => {
  close(returnRateFromBonus(0.18), 0.1525);
  close(returnRateFromBonus(0.18 + 0.59), 0.435);
  // Planken in Fort Sterling (Holz-Spezialisierung +40 %)
  const planks = data.items.T4_PLANKS;
  const fs = productionBonus(planks, loc("Fort Sterling"));
  close(fs.rrr, 0.367);
  close(productionBonus(planks, loc("Fort Sterling"), { useFocus: true }).rrr, 0.539);
  // Planken in Martlock: nur Grundbonus
  close(productionBonus(planks, loc("Martlock")).rrr, 0.1525);
  // Schwert in Lymhurst: 18 % + 15 %
  close(productionBonus(data.items.T4_MAIN_SWORD, loc("Lymhurst")).total, 0.33);
  // Insel ohne Fokus: 0 %
  assert.equal(productionBonus(planks, loc("Fort Sterling"), { island: true }).rrr, 0);
});

test("Fokuskosten halbieren sich je 10.000 FCE", () => {
  assert.equal(focusCost(1000, 0), 1000);
  close(focusCost(1000, 10000), 500);
  close(focusCost(1000, 20000), 250);
});

test("Stationsgebühr und Marktsteuern", () => {
  close(stationFee(384, 1000), 384 * 0.1125 * 10);
  const p = netSalePrice(1000, { premium: true, mode: "order" });
  close(p.net, 935);
  close(netSalePrice(1000, { premium: false, mode: "instant" }).net, 920);
});

test("Rezepte aus den Spieldaten haben richtige IDs und Mengen", () => {
  assert.deepEqual(data.recipes.T4_PLANKS[0].r, [["T4_WOOD", 2], ["T3_PLANKS", 1]]);
  assert.deepEqual(data.recipes["T4_MAIN_SWORD@1"][0].r, [["T4_METALBAR_LEVEL1@1", 16], ["T4_LEATHER_LEVEL1@1", 8]]);
  assert.equal(data.recipes.T4_MEAL_STEW[0].a, 10);
  assert.equal(data.recipes.T6_POTION_HEAL[0].a, 5);
  // Artefakt ist nicht rückgabefähig
  assert.deepEqual(data.recipes.T4_2H_CLAYMORE_AVALON[0].r[2], ["T4_ARTEFACT_2H_CLAYMORE_AVALON", 1, 0]);
  // Verzauberte Zutat behält ihren eigenen Namen (Fischsauce ist kein @1-Item)
  assert.ok(data.recipes["T4_MEAL_STEW@1"][0].r.some(([id]) => id === "T1_FISHSAUCE_LEVEL1"));
  assert.ok(data.items["T1_FISHSAUCE_LEVEL1"]);
});

test("Produktionsplan mit Rückgabe, Bestand und Unterrezept", () => {
  const rrr = 0.367;
  const prices = { T4_WOOD: 100, T3_PLANKS: 150, T3_WOOD: 50, T2_PLANKS: 60 };
  const ctx = {
    data,
    settingsFor: () => ({ rrr, useFocus: false, focusFce: 0, stationFee: 0 }),
    inventory: new Map([["T4_WOOD", 27]]),
    price: (id) => prices[id] ?? null,
    craftSelf: new Set()
  };
  const node = planProduction("T4_PLANKS", 100, ctx);
  assert.equal(node.crafts, 100);
  const wood = node.inputs.find((r) => r.id === "T4_WOOD");
  assert.equal(wood.gross, 200);
  assert.equal(wood.net, Math.ceil(200 * (1 - rrr)));
  assert.equal(wood.fromInventory, 27);
  assert.equal(wood.toObtain, wood.net - 27);
  const list = [...shoppingList(node).values()];
  assert.equal(list.length, 2);
  const res = productionResult(node, { salePrice: 400, premium: true });
  assert.ok(res.complete);
  close(res.revenue, 400 * 0.935 * 100);

  // Mit Unterrezept: T3-Planken selbst herstellen
  ctx.inventory = new Map();
  ctx.craftSelf = new Set(["T3_PLANKS"]);
  const deep = planProduction("T4_PLANKS", 100, ctx);
  assert.equal(deep.children.length, 1);
  assert.equal(deep.children[0].id, "T3_PLANKS");
  const items = new Set([...shoppingList(deep).keys()]);
  assert.ok(items.has("T3_WOOD") && items.has("T2_PLANKS") && !items.has("T3_PLANKS"));
});

test("Fehlende Preise werden markiert, nicht als 0 gerechnet", () => {
  const node = planProduction("T4_BAG", 1, { data, settingsFor: () => ({ rrr: 0, stationFee: 0 }), price: () => null });
  const res = productionResult(node, { salePrice: 5000 });
  assert.equal(res.complete, false);
  assert.ok(node.missingPrices);
});

test("Mahlzeiten: Chargen werden aufgerundet", () => {
  const node = planProduction("T4_MEAL_STEW", 25, { data, settingsFor: () => ({ rrr: 0, stationFee: 0 }), price: () => 1 });
  assert.equal(node.crafts, 3);
  assert.equal(node.produced, 30);
});

test("Feld: Samenrückgabe mit Fokus ist 100 %", () => {
  for (const crop of data.farming.crops) {
    const p = planCrop(crop, { tiles: 9, useFocus: true });
    close(p.seedBack, 1);
  }
  const carrot = data.farming.crops.find((c) => c.id === "T1_FARM_CARROT_SEED");
  const noFocus = planCrop(carrot, { tiles: 9, premium: true });
  assert.equal(noFocus.seedBack, 0);
  close(noFocus.products[0].qty, 9 * 4.5 * 2);
});

test("Tierzucht: Ziege braucht 18 Pflanzen bzw. 9 Rüben", () => {
  const goat = data.farming.animals.find((a) => a.id === "T4_FARM_GOAT_BABY");
  assert.equal(planAnimal(goat, { tiles: 1 }).foodPerAnimal, 18);
  assert.equal(planAnimal(goat, { tiles: 1, favorite: true }).foodPerAnimal, 9);
  close(planAnimal(goat, { tiles: 1, useFocus: true }).offspringChance, 1);
  close(planAnimal(goat, { tiles: 1 }).days, 158400 / 86400);
});

test("Handel und Zeitstempel", () => {
  const t = tradeMargin({ buy: 1000, sell: 1500, qty: 10, premium: true });
  close(t.profit, 1500 * 0.935 * 10 - 10000);
  close(ageHours("2026-11-03T00:00:00", Date.parse("2026-11-03T02:00:00Z")), 2);
  assert.equal(ageHours("0001-01-01T00:00:00"), null);
});

test("Specs: Fokus-Rabatte aus dem Destiny Board", async () => {
  const { specsForItem, fceFromSpecs } = await import("../public/js/calc.js");
  const list = specsForItem(data.specs, "T4_MAIN_ARCANESTAFF", 4, "craft");
  const own = list.find((x) => x.spec.id === "CRAFT_ARCANESTAFFS_ARCANE");
  const mastery = list.find((x) => x.spec.id === "CRAFT_ARCANESTAFFS");
  assert.equal(own.fcePerLevel, 280); // 250 eigene + 30 gemeinsame Spezialisierung
  assert.equal(mastery.fcePerLevel, 30);
  assert.equal(fceFromSpecs(list, { CRAFT_ARCANESTAFFS: 100, CRAFT_ARCANESTAFFS_ARCANE: 100 }), 31000);
  // Stufen über dem Maximum werden begrenzt
  assert.equal(fceFromSpecs(list, { CRAFT_ARCANESTAFFS: 500 }), 3000);
  // Refining-Spec gilt nur für ihr Tier
  const t4 = specsForItem(data.specs, "T4_PLANKS", 4).find((x) => x.spec.id === "CRAFT_REFINE_WOOD_T4");
  const t5 = specsForItem(data.specs, "T5_PLANKS", 5).find((x) => x.spec.id === "CRAFT_REFINE_WOOD_T4");
  assert.equal(t4.fcePerLevel, 280);
  assert.equal(t5.fcePerLevel, 30);
  // Farming
  const goat = specsForItem(data.specs, "T4_FARM_GOAT_BABY", 4, "farm");
  assert.equal(fceFromSpecs(goat, { FARM_ANIMALS_GOAT: 100, FARM_ANIMALS: 100 }), 30000);
});
