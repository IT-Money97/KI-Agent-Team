// Einstieg: lädt Spieldaten, verwaltet Zustand und Tabs.
import { h, select, toggle, toast } from "./ui.js";
import { loadGameData, data } from "./data.js";
import { loadState, saveState, resetState } from "./store.js";
import { renderCraft } from "./views/craft.js";
import { renderMarket } from "./views/market.js";
import { renderIsland } from "./views/island.js";
import { renderPlanner } from "./views/planner.js";

const TABS = [
  { id: "craft", label: "Crafting & Refining", render: renderCraft },
  { id: "market", label: "Markt", render: renderMarket },
  { id: "island", label: "Insel", render: renderIsland },
  { id: "planner", label: "Planer", render: renderPlanner }
];

const app = {
  state: loadState(),
  tab: "craft",
  save() { saveState(app.state); },
  render() { renderAll(); },
  go(tab) { app.tab = tab; history.replaceState(null, "", `#${tab}`); renderAll(); window.scrollTo({ top: 0 }); },
  replaceState(next) { app.state = loadStateFrom(next); app.save(); renderAll(); }
};

function loadStateFrom(value) {
  localStorage.setItem("albion-werkbank-v2", JSON.stringify(value));
  return loadState();
}

function applyTheme() {
  document.documentElement.dataset.theme = app.state.settings.theme;
}

function renderHeader() {
  const s = app.state.settings;
  const nav = document.getElementById("tabs");
  nav.replaceChildren(...TABS.map((t) => h("button", {
    type: "button", role: "tab", class: `tab ${app.tab === t.id ? "active" : ""}`, "aria-selected": String(app.tab === t.id),
    onclick: () => app.go(t.id)
  }, t.label)));

  const bar = document.getElementById("globals");
  const gear = document.getElementById("gear");
  gear.onclick = () => { bar.classList.toggle("open"); gear.setAttribute("aria-expanded", String(bar.classList.contains("open"))); };
  bar.replaceChildren(
    select([{ value: "europe", label: "Server: Europa" }, { value: "west", label: "Server: Amerika (West)" }, { value: "east", label: "Server: Asien (Ost)" }], s.server, (v) => { s.server = v; app.save(); renderAll(); toast("Server gewechselt – Preise bitte neu laden."); }, { "aria-label": "Server" }),
    toggle("Premium", s.premium, (v) => { s.premium = v; app.save(); renderAll(); }, "Premium: 4 % statt 8 % Verkaufssteuer, mehr Ernte"),
    select([{ value: "de", label: "Namen: Deutsch" }, { value: "en", label: "Names: English" }], s.lang, (v) => { s.lang = v; app.save(); renderAll(); }, { "aria-label": "Sprache der Itemnamen" }),
    h("button", { type: "button", class: "btn", title: "Hell/Dunkel umschalten", "aria-label": "Hell/Dunkel umschalten", onclick: () => { s.theme = s.theme === "dark" ? "light" : "dark"; app.save(); renderAll(); } }, s.theme === "dark" ? "☀ Hell" : "☾ Dunkel")
  );
}

function renderFooter() {
  const D = data();
  const foot = document.getElementById("footer");
  foot.replaceChildren(
    h("span", {}, `Spieldaten: ${D.meta.items.toLocaleString("de-DE")} Items, ${D.meta.recipes.toLocaleString("de-DE")} Rezepte · Stand ${new Date(D.meta.builtAt).toLocaleDateString("de-DE")} · Quelle ao-bin-dumps`),
    h("button", { type: "button", class: "btn small", onclick: async (e) => {
      e.target.disabled = true; e.target.textContent = "Aktualisiere … (ca. 1 Min.)";
      try {
        const res = await fetch("/api/data/update", { method: "POST", headers: { "x-werkbank": "1" } });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
        toast(`${body.message} – Seite wird neu geladen.`, "ok");
        setTimeout(() => location.reload(), 1200);
      } catch (err) { toast(`Aktualisierung fehlgeschlagen: ${err.message}`, "error"); e.target.disabled = false; e.target.textContent = "Spieldaten aktualisieren"; }
    } }, "Spieldaten aktualisieren"),
    h("button", { type: "button", class: "btn small ghost", onclick: () => { if (confirm("Alle lokalen Einstellungen, Pläne und Preise löschen?")) { app.state = resetState(); renderAll(); } } }, "Zurücksetzen"),
    h("span", { class: "muted" }, "Marktpreise: Albion Online Data Project (Community). Kein offizielles Tool von Sandbox Interactive.")
  );
}

function renderAll() {
  applyTheme();
  renderHeader();
  const main = document.getElementById("main");
  const tab = TABS.find((t) => t.id === app.tab) || TABS[0];
  try {
    tab.render(main, app);
  } catch (e) {
    console.error(e);
    main.replaceChildren(h("section", { class: "card error" }, h("h2", {}, "Fehler"), h("p", {}, e.message), h("button", { class: "btn", onclick: () => { app.state = resetState(); renderAll(); } }, "Einstellungen zurücksetzen")));
  }
  renderFooter();
}

async function start() {
  applyTheme();
  const hash = location.hash.slice(1);
  if (TABS.some((t) => t.id === hash)) app.tab = hash;
  if (location.protocol === "file:") {
    document.getElementById("main").replaceChildren(h("section", { class: "card error" }, h("h2", {}, "Bitte über start.bat / start.sh öffnen"), h("p", {}, "Die Werkbank braucht den lokalen Server. Doppelklick auf start.bat (Windows) bzw. ./start.sh (Mac/Linux), dann öffnet sich http://127.0.0.1:4173.")));
    return;
  }
  try {
    await loadGameData();
  } catch (e) {
    document.getElementById("main").replaceChildren(h("section", { class: "card error" }, h("h2", {}, "Spieldaten konnten nicht geladen werden"), h("p", {}, e.message)));
    return;
  }
  renderAll();
}

window.addEventListener("hashchange", () => { const t = location.hash.slice(1); if (t !== app.tab && TABS.some((x) => x.id === t)) { app.tab = t; renderAll(); } });
start();
