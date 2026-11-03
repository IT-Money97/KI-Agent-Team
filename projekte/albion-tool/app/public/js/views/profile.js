// Ansicht „Mein Charakter“: Konto-Einstellungen und Specs (Destiny Board)
import { h, fmt, field, select, toggle, numberInput, debounce, toast } from "../ui.js";
import { data } from "../data.js";
import { specsForItem, fceFromSpecs, focusCost } from "../calc.js";

const REFINE_LABEL = { FIBER: "Stoff weben", HIDE: "Leder gerben", ORE: "Metall schmelzen", WOOD: "Holz hobeln", ROCK: "Stein hauen" };
// Zusätzliche Suchbegriffe, damit z. B. „Planken“ die Holz-Specs findet
const REFINE_WORDS = { FIBER: "stoff cloth faser fiber", HIDE: "leder leather fell hide", ORE: "barren metall bar erz ore", WOOD: "planken planks holz wood", ROCK: "steinblock stone stein rock" };

/** Gruppen für die Spec-Liste: Meisterschaft + zugehörige Spezialisierungen */
export function specGroups() {
  const D = data();
  const byId = new Map(D.specs.map((s) => [s.id, s]));
  const groups = new Map();
  for (const s of D.specs) {
    let key = s.id;
    let label = s.n;
    const refine = s.id.match(/^CRAFT_REFINE_([A-Z]+)_T\d$/);
    if (refine) { key = `CRAFT_REFINE_${refine[1]}`; label = `Veredeln: ${REFINE_LABEL[refine[1]] || refine[1]}`; }
    else {
      const mastery = s.parents.map((p) => byId.get(p)).find((p) => p && p.ring < s.ring);
      if (mastery) { key = mastery.id; label = mastery.n; }
    }
    if (!groups.has(key)) groups.set(key, { key, label, cat: s.cat, specs: [], words: refine ? REFINE_WORDS[refine[1]] || "" : "" });
    groups.get(key).specs.push(s);
  }
  for (const g of groups.values()) g.specs.sort((a, b) => a.ring - b.ring || a.n.localeCompare(b.n, "de"));
  return [...groups.values()].sort((a, b) => a.cat.localeCompare(b.cat) || a.label.localeCompare(b.label, "de"));
}

/** Name mit Tier-Hinweis für Refining-Specs (z. B. „… (T4)“) */
function specLabel(spec) {
  const t = spec.id.match(/_T(\d)$/);
  return t ? `${spec.n} (T${t[1]})` : spec.n;
}

function levelInput(state, spec, app, onChange) {
  return numberInput({
    value: state.specs[spec.id] || null, min: 0, step: 1, width: "5.5em", label: `Stufe ${spec.n}`,
    onchange: (n) => {
      const v = Math.min(spec.max || 100, Math.max(0, Math.round(n || 0)));
      if (v) state.specs[spec.id] = v; else delete state.specs[spec.id];
      app.save();
      onChange ? onChange() : app.render();
    }
  });
}

/**
 * Kompakte Spec-Kachel für ein Item (Crafting oder Insel).
 * Zeigt die wichtigsten Specs mit Eingabe und die resultierende FCE.
 */
export function specWidget(app, itemId, kind, baseFocus) {
  const { state } = app;
  const D = data();
  const it = D.items[itemId];
  const list = specsForItem(D.specs, itemId, it?.t || 0, kind);
  const fce = fceFromSpecs(list, state.specs);
  if (!list.length) return h("p", { class: "muted small" }, "Für dieses Item gibt es keine Specs mit Fokus-Rabatt.");
  const main = list.filter((x) => x.fcePerLevel >= 100 || x.spec.ring <= 7);
  const rest = list.filter((x) => !main.includes(x));
  const row = (x) => h("div", { class: "spec-row" },
    h("span", { class: "spec-name" }, specLabel(x.spec), h("span", { class: "muted small" }, ` · ${fmt.num(x.fcePerLevel)} FCE je Stufe`)),
    levelInput(state, x.spec, app));
  return h("div", { class: "specs" },
    main.map(row),
    rest.length ? h("details", { class: "more" }, h("summary", {}, `${rest.length} weitere Specs im selben Baum (kleiner Effekt)`), rest.map(row)) : null,
    h("div", { class: "spec-sum" },
      h("span", {}, "Deine FCE: ", h("strong", {}, fmt.int(fce))),
      baseFocus != null ? h("span", {}, ` · Fokus je Aktion ${fmt.int(baseFocus)} → `, h("strong", {}, fmt.int(focusCost(baseFocus, fce))), ` (−${fmt.pct(1 - Math.pow(0.5, fce / 10000))})`) : null),
    h("p", { class: "muted small" }, "Stufen gelten überall in der Werkbank. Alle Specs findest du unter „Mein Charakter“."));
}

export function renderProfile(root, app) {
  const { state } = app;
  const s = state.settings;
  const D = data();

  const account = h("section", { class: "card" },
    h("h2", {}, "Konto & Anzeige"),
    h("div", { class: "tiles cols-3" },
      field("Server", select([{ value: "europe", label: "Europa" }, { value: "west", label: "Amerika (West)" }, { value: "east", label: "Asien (Ost)" }], s.server, (v) => { s.server = v; app.save(); app.render(); toast("Server gewechselt – Preise bitte neu laden."); })),
      field("Namen der Items", select([{ value: "de", label: "Deutsch" }, { value: "en", label: "English" }], s.lang, (v) => { s.lang = v; app.save(); app.render(); })),
      field("Darstellung", select([{ value: "dark", label: "Dunkel" }, { value: "light", label: "Hell" }], s.theme, (v) => { s.theme = v; app.save(); app.render(); })),
      h("div", { class: "field" }, h("span", { class: "field-label" }, "Premium"), toggle("Premium aktiv", s.premium, (v) => { s.premium = v; app.save(); app.render(); }), h("span", { class: "hint" }, "4 % statt 8 % Verkaufssteuer, doppelte Ernte")),
      field("Fokus pro Tag", numberInput({ value: s.focusPerDay, label: "Fokus pro Tag", onchange: (n) => { s.focusPerDay = n || 0; app.save(); app.render(); } }), "Premium: 10.000"),
      field("Wert eines Fokuspunkts (Silber)", numberInput({ value: s.focusValue || null, label: "Silber je Fokus", onchange: (n) => { s.focusValue = n || 0; app.save(); app.render(); } }), "Optional: wird als Kosten abgezogen")));

  const groups = specGroups();
  const q = (state.profile ||= { search: "", cat: "crafting" });
  const listBox = h("div", { class: "tiles cols-3 spec-groups" });
  const renderGroups = () => {
    const words = q.search.toLowerCase().split(/\s+/).filter(Boolean);
    const shown = groups.filter((g) => g.cat === q.cat && (!words.length || words.every((w) => (g.label + " " + g.words + " " + g.specs.map((x) => x.n + " " + x.e).join(" ")).toLowerCase().includes(w))));
    listBox.replaceChildren(...shown.map((g) => {
      const filled = g.specs.filter((x) => state.specs[x.id]).length;
      return h("details", { class: "tile spec-group", open: words.length > 0 || filled > 0 },
        h("summary", {}, h("span", {}, g.label), h("span", { class: `badge small ${filled ? "" : "muted"}` }, `${filled}/${g.specs.length}`)),
        g.specs.map((x) => h("div", { class: "spec-row" }, h("span", { class: "spec-name" }, specLabel(x)), levelInput(state, x, app, () => { app.save(); renderGroups(); }))));
    }));
    if (!shown.length) listBox.append(h("p", { class: "muted" }, "Keine Specs gefunden."));
  };
  renderGroups();
  const total = Object.keys(state.specs).length;

  const specs = h("section", { class: "card" },
    h("h2", {}, "Meine Specs (Destiny Board)"),
    h("p", { class: "muted" }, "Trage deine Stufen ein (0–100). Daraus berechnet die Werkbank deine Fokuskosten-Effizienz (FCE) für jedes Item automatisch. Je 10.000 FCE halbieren sich die Fokuskosten."),
    h("div", { class: "row wrap" },
      h("div", { class: "seg", role: "tablist" },
        [["crafting", "Crafting & Refining"], ["farming", "Farming & Insel"]].map(([v, l]) => h("button", { type: "button", class: q.cat === v ? "active" : "", onclick: () => { q.cat = v; app.save(); app.render(); } }, l))),
      h("input", { type: "search", placeholder: "Spec suchen, z. B. Tasche, Planken, Ziege …", value: q.search, "aria-label": "Spec suchen", oninput: debounce((e) => { q.search = e.target.value; app.save(); renderGroups(); }, 150) }),
      h("span", { class: "muted small" }, `${total} ${total === 1 ? "Spec" : "Specs"} eingetragen`),
      total ? h("button", { type: "button", class: "btn small ghost", onclick: () => { if (confirm("Alle Spec-Stufen löschen?")) { state.specs = {}; app.save(); app.render(); } } }, "Alle zurücksetzen") : null),
    listBox,
    h("details", { class: "help" }, h("summary", {}, "Wie wird die FCE berechnet?"),
      h("p", { class: "muted small" }, "Die Werte stammen direkt aus den Spieldaten (Destiny Board). Beispiel Arkanstab: Meisterschaft „Arkanstab-Schmied“ gibt 30 FCE je Stufe auf alle Arkanstäbe. Die Spezialisierung auf ein Item gibt 250 FCE je Stufe für genau dieses Item und zusätzlich 30 FCE je Stufe (Artefakt-Specs 15) für alle anderen Items im Baum. Refining-Specs gelten mit 250 nur für ihr Tier. Fokuskosten = Grundkosten × 0,5^(FCE ÷ 10.000)."),
      h("p", { class: "muted small" }, `Daten: ${D.specs.length} Specs mit Fokus-Rabatt.`)));

  root.replaceChildren(h("div", { class: "stack" }, specs, account));
}
