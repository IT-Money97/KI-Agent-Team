// ALLE Geschäftsdaten an einer Stelle. Für einen echten Kunden nur diese Datei anpassen.
// Alles hier ist FIKTIV und ein PLATZHALTER.

export const laden = {
  name: 'Döner Muster',
  untertitel: 'Döner, Dürüm & Lahmacun in Köln-Ehrenfeld',
  strasse: 'Musterstraße 1 [Platzhalter]',
  plz: '50823',
  ort: 'Köln',
  stadtteil: 'Ehrenfeld',
  telefonAnzeige: '0221 000 000 0 [Platzhalter]',
  telefonLink: '+492210000000',
  email: 'info@example.com',
  // Kein echtes Geschäft: Link öffnet nur den Stadtteil in Google Maps.
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=K%C3%B6ln-Ehrenfeld',
};

// Wochentag 0 = Sonntag (wie Date.getDay()). Zeiten als 'HH:MM', bis 24:00 erlaubt.
export const oeffnungszeiten: { tag: string; kurz: string; von: string; bis: string }[] = [
  { tag: 'Sonntag', kurz: 'So', von: '12:00', bis: '22:00' },
  { tag: 'Montag', kurz: 'Mo', von: '11:00', bis: '23:00' },
  { tag: 'Dienstag', kurz: 'Di', von: '11:00', bis: '23:00' },
  { tag: 'Mittwoch', kurz: 'Mi', von: '11:00', bis: '23:00' },
  { tag: 'Donnerstag', kurz: 'Do', von: '11:00', bis: '23:00' },
  { tag: 'Freitag', kurz: 'Fr', von: '11:00', bis: '24:00' },
  { tag: 'Samstag', kurz: 'Sa', von: '12:00', bis: '24:00' },
];

export const allergene: Record<string, string> = {
  A: 'Glutenhaltiges Getreide',
  C: 'Ei',
  G: 'Milch/Laktose',
  K: 'Sesam',
  F: 'Soja',
  J: 'Senf',
};

export type Gericht = { name: string; beschreibung: string; preis: string; allergene: string[]; vegetarisch?: boolean };

// Preise sind bewusst KEINE echten Preise.
const P = 'x,xx €';

export const speisekarte: { kategorie: string; gerichte: Gericht[] }[] = [
  {
    kategorie: 'Döner & Dürüm',
    gerichte: [
      { name: 'Döner im Brot', beschreibung: 'Kalbfleisch vom Spieß, Salat, Tomate, Zwiebel, Soße nach Wahl', preis: P, allergene: ['A', 'G', 'K'] },
      { name: 'Dürüm', beschreibung: 'Im dünnen Yufka-Fladen gerollt, Füllung wie Döner', preis: P, allergene: ['A', 'G'] },
      { name: 'Hähnchen-Döner', beschreibung: 'Mariniertes Hähnchen, Salat, Rotkohl, Knoblauchsoße', preis: P, allergene: ['A', 'C', 'G'] },
      { name: 'Döner-Box', beschreibung: 'Fleisch mit Pommes oder Reis, Salat und Soße', preis: P, allergene: ['G'] },
    ],
  },
  {
    kategorie: 'Vegetarisch',
    gerichte: [
      { name: 'Falafel im Brot', beschreibung: 'Hausgemachte Falafel, Hummus, Salat', preis: P, allergene: ['A', 'K'], vegetarisch: true },
      { name: 'Halloumi-Dürüm', beschreibung: 'Gegrillter Halloumi, Gemüse, Kräutersoße', preis: P, allergene: ['A', 'G'], vegetarisch: true },
    ],
  },
  {
    kategorie: 'Vom Ofen',
    gerichte: [
      { name: 'Lahmacun', beschreibung: 'Dünner Teig mit gewürztem Hackfleisch, Salat und Zitrone', preis: P, allergene: ['A'] },
      { name: 'Pide mit Käse', beschreibung: 'Schiffchen aus dem Ofen mit Käse und Ei', preis: P, allergene: ['A', 'C', 'G'], vegetarisch: true },
    ],
  },
  {
    kategorie: 'Getränke & Beilagen',
    gerichte: [
      { name: 'Ayran', beschreibung: 'Joghurtgetränk, 0,25 l', preis: P, allergene: ['G'], vegetarisch: true },
      { name: 'Pommes', beschreibung: 'Mit Ketchup oder Mayo', preis: P, allergene: ['C', 'J'], vegetarisch: true },
      { name: 'Softdrink', beschreibung: 'Verschiedene Sorten, 0,33 l', preis: P, allergene: [], vegetarisch: true },
    ],
  },
];
