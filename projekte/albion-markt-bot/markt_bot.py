"""Albion Markt-Verkaufstool

Stellt alle Items aus "Sell from Inventory" automatisch als Sell Order ein,
zum Durchschnittspreis aus der Market History (Prioritaet 24 h, 7 Tage, 4 Wochen).

ACHTUNG: Automatische Klicks verstossen gegen die Nutzungsbedingungen von
Albion Online. Benutzung auf eigenes Risiko (Account-Sperre moeglich).

Aufruf:
    python markt_bot.py kalibrieren   Positionen einmalig einmessen
    python markt_bot.py ocr-test      liest nur den Preis im offenen Verkaufsfenster
    python markt_bot.py trocken       alles wie echt, aber ohne "Create"
    python markt_bot.py start         echter Lauf

Stopp jederzeit: F8 (oder Maus in die linke obere Bildschirmecke).
"""
import ctypes
import datetime
import json
import os
import sys
import threading
import time

# Muss VOR dem Import von pyautogui passieren, sonst stimmen bei
# Windows-Skalierung (125 %, 150 %) die Koordinaten nicht.
if sys.platform == "win32":
    try:
        ctypes.windll.shcore.SetProcessDpiAwareness(2)
    except Exception:
        try:
            ctypes.windll.user32.SetProcessDPIAware()
        except Exception:
            pass

import pyautogui
from PIL import ImageGrab
from pynput import keyboard

from preis import finde_tesseract, lese_zahl

ORDNER = os.path.dirname(os.path.abspath(__file__))
CONFIG_DATEI = os.path.join(ORDNER, "config.json")
LOG_DATEI = os.path.join(ORDNER, "verkaeufe.log")
DEBUG_ORDNER = os.path.join(ORDNER, "debug")

STANDARD_EINSTELLUNGEN = {
    "pause_nach_sell": 1.5,      # Sekunden, bis das Verkaufsfenster offen ist
    "pause_nach_tab": 1.0,       # Sekunden, bis die Market History neu geladen ist
    "pause_klick": 0.35,         # kleine Pause nach normalen Klicks
    "pause_nach_create": 1.5,    # Sekunden, bis die Liste aktualisiert ist
    "tipp_intervall": 0.05,      # Pause zwischen zwei getippten Ziffern
    "max_items": 0,              # 0 = unbegrenzt
    "sichtbare_zeilen": 5,       # so viele Sell-Buttons sind ohne Scrollen sichtbar
    "plausi_faktor": 3.0,        # Durchschnitt darf max. 3x vom Feldpreis abweichen, 0 = aus
    "farb_toleranz": 45,         # Toleranz fuer die Erkennung von Buttons
    "tesseract_pfad": "",
}

# Reihenfolge und Texte der Kalibrierung
PUNKTE = [
    ("sell_1", "punkt", "den ERSTEN 'Sell'-Button in der Liste 'Sell from Inventory'"),
    ("sell_2", "punkt", "den ZWEITEN 'Sell'-Button (Zeile darunter)"),
    ("__oeffnen__", "info", "Klicke jetzt selbst auf den ersten 'Sell'-Button, damit das Verkaufsfenster aufgeht."),
    ("tab_24h", "punkt", "den Knopf '24 hours' unter der Market History"),
    ("tab_7d", "punkt", "den Knopf '7 days'"),
    ("tab_4w", "punkt", "den Knopf '4 weeks'"),
    ("durchschnitt", "bereich", "die Zahl hinter 'Average Price' (NUR die Ziffern, ohne Silbermuenze)"),
    ("preis_feld", "punkt", "die Mitte des Preis-Eingabefelds (bei 'Price:')"),
    ("preis_feld_zahl", "bereich", "die Zahl IM Preisfeld (NUR die Ziffern, ohne Muenze und ohne '% above average')"),
    ("create", "punkt", "den 'Create'-Button"),
    ("schliessen", "punkt", "das X oben rechts am Verkaufsfenster"),
]

stopp = threading.Event()


# ---------------------------------------------------------------- Hilfen

def log(text):
    zeile = f"{datetime.datetime.now():%Y-%m-%d %H:%M:%S}  {text}"
    print(zeile, flush=True)
    with open(LOG_DATEI, "a", encoding="utf-8") as f:
        f.write(zeile + "\n")


def lade_config():
    if not os.path.exists(CONFIG_DATEI):
        return None
    with open(CONFIG_DATEI, encoding="utf-8") as f:
        cfg = json.load(f)
    for k, v in STANDARD_EINSTELLUNGEN.items():
        cfg.setdefault(k, v)
    return cfg


def speichere_config(cfg):
    with open(CONFIG_DATEI, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2, ensure_ascii=False)


def warte(sekunden):
    """Schlaeft in kleinen Schritten, damit F8 sofort greift."""
    ende = time.time() + sekunden
    while time.time() < ende:
        if stopp.is_set():
            raise KeyboardInterrupt
        time.sleep(0.05)


def klick(punkt, cfg, pause=None):
    if stopp.is_set():
        raise KeyboardInterrupt
    pyautogui.click(punkt[0], punkt[1])
    warte(cfg["pause_klick"] if pause is None else pause)


def bildschirm(bereich):
    x1, y1, x2, y2 = bereich
    return ImageGrab.grab(bbox=(x1, y1, x2, y2), all_screens=True).convert("RGB")


def farbe_um(punkt, radius=12):
    """Durchschnittsfarbe in einem kleinen Feld um den Punkt."""
    x, y = punkt
    bild = bildschirm((x - radius, y - radius, x + radius, y + radius))
    px = list(bild.getdata())
    return [sum(p[i] for p in px) / len(px) for i in range(3)]


def farbe_passt(punkt, soll, toleranz, cfg=None):
    if cfg is not None:
        # Maus kurz an den linken Bildschirmrand, damit der Hover-Effekt die Farbe
        # nicht verfaelscht (nicht in die Ecke, dort loest der Notstopp aus)
        pyautogui.moveTo(30, pyautogui.size()[1] // 2)
        time.sleep(0.15)
    ist = farbe_um(punkt)
    return all(abs(a - b) <= toleranz for a, b in zip(ist, soll))


def speichere_debug(bild, name):
    os.makedirs(DEBUG_ORDNER, exist_ok=True)
    pfad = os.path.join(DEBUG_ORDNER, f"{datetime.datetime.now():%H%M%S}_{name}.png")
    bild.save(pfad)
    return pfad


def tesseract(cfg):
    pfad = finde_tesseract(cfg.get("tesseract_pfad") if cfg else None)
    if not pfad:
        print("\nTesseract-OCR wurde nicht gefunden.")
        print("Download: https://github.com/UB-Mannheim/tesseract/wiki (Windows 64 bit Setup)")
        print("oder trage den Pfad zu tesseract.exe in config.json bei 'tesseract_pfad' ein.")
        sys.exit(1)
    return pfad


def starte_hotkeys(kalibrier_event=None):
    def bei_taste(taste):
        if taste == keyboard.Key.f8:
            stopp.set()
            print("\n>>> F8 gedrueckt: Tool stoppt.", flush=True)
            return False
        if taste == keyboard.Key.f9 and kalibrier_event is not None:
            kalibrier_event.set()

    hoerer = keyboard.Listener(on_press=bei_taste)
    hoerer.daemon = True
    hoerer.start()
    return hoerer


# ---------------------------------------------------------------- Kalibrierung

def kalibrieren():
    cfg = lade_config() or dict(STANDARD_EINSTELLUNGEN)
    f9 = threading.Event()
    starte_hotkeys(f9)

    def warte_f9():
        f9.clear()
        while not f9.wait(0.1):
            if stopp.is_set():
                sys.exit(0)
        x, y = pyautogui.position()
        print(f"   -> gespeichert: {x}, {y}")
        time.sleep(0.3)
        return [x, y]

    print("=" * 64)
    print(" KALIBRIERUNG")
    print(" Oeffne im Spiel den Marktplatz mit 'Sell from Inventory'.")
    print(" Fahre jeweils mit der Maus auf die genannte Stelle und druecke F9.")
    print(" (Das Konsolenfenster muss dafuer NICHT im Vordergrund sein.)")
    print(" Abbrechen: F8")
    print("=" * 64)

    for schritt, (name, art, text) in enumerate(PUNKTE, 1):
        print(f"\n[{schritt}/{len(PUNKTE)}] ", end="")
        if art == "info":
            print(text)
            print("   Danach F9 druecken.")
            warte_f9()
            continue
        if art == "punkt":
            print(f"Maus auf {text}, dann F9.")
            cfg[name] = warte_f9()
        else:
            print(f"Bereich: {text}")
            print("   Maus auf die OBERE LINKE Ecke, dann F9.")
            a = warte_f9()
            print("   Maus auf die UNTERE RECHTE Ecke, dann F9.")
            b = warte_f9()
            cfg[name] = [min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])]

        # Farben merken, waehrend die Maus NICHT auf dem Button liegt (Hover aendert die Farbe)
        if name == "sell_2":
            cfg["sell_farbe"] = farbe_um(cfg["sell_1"])
        if name == "schliessen":
            cfg["create_farbe"] = farbe_um(cfg["create"])

    speichere_config(cfg)
    print(f"\nGespeichert in {CONFIG_DATEI}")

    # Sofort pruefen, ob die Zahlen gelesen werden
    ts = tesseract(cfg)
    for name in ("durchschnitt", "preis_feld_zahl"):
        bild = bildschirm(cfg[name])
        wert, roh = lese_zahl(bild, ts)
        pfad = speichere_debug(bild, name)
        print(f"Test {name}: {wert if wert else 'NICHT LESBAR'}   (Ausschnitt: {pfad})")
    print("\nStimmen die Zahlen mit dem Spiel ueberein? Wenn nicht, nochmal kalibrieren")
    print("und den Bereich enger um die Ziffern ziehen.")


# ---------------------------------------------------------------- Ablauf

def lese_durchschnitt(cfg, ts):
    """Klickt 24h -> 7 Tage -> 4 Wochen, bis ein Durchschnittspreis da ist."""
    for tab, name in (("tab_24h", "24 h"), ("tab_7d", "7 Tage"), ("tab_4w", "4 Wochen")):
        klick(cfg[tab], cfg, pause=cfg["pause_nach_tab"])
        bild = bildschirm(cfg["durchschnitt"])
        wert, roh = lese_zahl(bild, ts)
        if wert:
            return wert, name
        log(f"   kein Preis bei {name} (gelesen: {roh})")
    speichere_debug(bildschirm(cfg["durchschnitt"]), "kein_preis")
    return None, None


def preis_eintragen(cfg, preis):
    klick(cfg["preis_feld"], cfg)
    pyautogui.hotkey("ctrl", "a")
    warte(0.1)
    pyautogui.press("backspace")
    # Sicherheitsnetz, falls Strg+A im Spiel nicht markiert: alte Zahl wegloeschen
    pyautogui.press("end")
    pyautogui.press("backspace", presses=12, interval=0.02)
    warte(0.1)
    # nur Ziffern, nie ein Komma: das setzt das Spiel selbst
    pyautogui.write(str(int(preis)), interval=cfg["tipp_intervall"])
    warte(cfg["pause_klick"])


def fenster_offen(cfg):
    return farbe_passt(cfg["create"], cfg["create_farbe"], cfg["farb_toleranz"], cfg)


def fenster_schliessen(cfg):
    if fenster_offen(cfg):
        klick(cfg["schliessen"], cfg, pause=0.8)


def plausibel(cfg, ts, preis):
    faktor = cfg["plausi_faktor"]
    if not faktor:
        return True
    feld, _ = lese_zahl(bildschirm(cfg["preis_feld_zahl"]), ts)
    if not feld:
        log("   Hinweis: Preisfeld nicht lesbar, Plausi-Pruefung uebersprungen")
        return True
    if preis > feld * faktor or preis * faktor < feld:
        log(f"   UNPLAUSIBEL: Durchschnitt {preis} vs. Feld {feld}, Item wird uebersprungen")
        speichere_debug(bildschirm(cfg["durchschnitt"]), "unplausibel")
        return False
    return True


def lauf(trocken):
    cfg = lade_config()
    if not cfg or "schliessen" not in cfg:
        print("Bitte zuerst kalibrieren (Menuepunkt 1).")
        sys.exit(1)
    ts = tesseract(cfg)
    starte_hotkeys()
    pyautogui.FAILSAFE = True

    abstand = [cfg["sell_2"][0] - cfg["sell_1"][0], cfg["sell_2"][1] - cfg["sell_1"][1]]
    modus = "TESTLAUF (ohne Create)" if trocken else "ECHTER LAUF"
    print("=" * 64)
    print(f" {modus}   Stopp: F8")
    print(" Wechsle jetzt ins Spiel. Start in 5 Sekunden ...")
    print("=" * 64)
    warte(5)
    log(f"--- Start {modus}")

    zeile = 0
    verkauft = 0
    uebersprungen = 0
    try:
        while True:
            if cfg["max_items"] and verkauft >= cfg["max_items"]:
                log(f"Maximum von {cfg['max_items']} Items erreicht.")
                break
            if zeile >= cfg["sichtbare_zeilen"]:
                log("Alle sichtbaren Zeilen abgearbeitet bzw. uebersprungen.")
                break
            sell = [cfg["sell_1"][0] + zeile * abstand[0], cfg["sell_1"][1] + zeile * abstand[1]]
            if not farbe_passt(sell, cfg["sell_farbe"], cfg["farb_toleranz"], cfg):
                log("Kein weiterer 'Sell'-Button gefunden: Inventar ist leer.")
                break

            klick(sell, cfg, pause=cfg["pause_nach_sell"])
            if not fenster_offen(cfg):
                log(f"Zeile {zeile + 1}: Verkaufsfenster ging nicht auf, uebersprungen")
                zeile += 1
                uebersprungen += 1
                continue

            preis, quelle = lese_durchschnitt(cfg, ts)
            if not preis or not plausibel(cfg, ts, preis):
                if not preis:
                    log(f"Zeile {zeile + 1}: kein Durchschnittspreis gefunden, uebersprungen")
                fenster_schliessen(cfg)
                zeile += 1
                uebersprungen += 1
                continue

            preis_eintragen(cfg, preis)
            if trocken:
                log(f"Zeile {zeile + 1}: WUERDE einstellen fuer {preis} ({quelle})")
                fenster_schliessen(cfg)
                zeile += 1  # Item bleibt im Inventar, also naechste Zeile
            else:
                klick(cfg["create"], cfg, pause=cfg["pause_nach_create"])
                fenster_schliessen(cfg)  # falls das Fenster offen geblieben ist
                log(f"Eingestellt fuer {preis} ({quelle})")
                # Das Item verschwindet aus der Liste, die naechste rutscht nach
            verkauft += 1
    except KeyboardInterrupt:
        log("Gestoppt.")
    except pyautogui.FailSafeException:
        log("Gestoppt (Maus in der Bildschirmecke).")
    log(f"--- Ende: {verkauft} {'getestet' if trocken else 'eingestellt'}, {uebersprungen} uebersprungen")


def ocr_test():
    cfg = lade_config()
    if not cfg:
        print("Bitte zuerst kalibrieren.")
        sys.exit(1)
    ts = tesseract(cfg)
    print("Oeffne ein Verkaufsfenster im Spiel. Messung in 5 Sekunden ...")
    time.sleep(5)
    for name in ("durchschnitt", "preis_feld_zahl"):
        bild = bildschirm(cfg[name])
        wert, roh = lese_zahl(bild, ts)
        pfad = speichere_debug(bild, name)
        print(f"{name}: {wert if wert else 'NICHT LESBAR'}  roh={roh}  Bild: {pfad}")


if __name__ == "__main__":
    befehl = sys.argv[1] if len(sys.argv) > 1 else ""
    if befehl == "kalibrieren":
        kalibrieren()
    elif befehl == "ocr-test":
        ocr_test()
    elif befehl == "trocken":
        lauf(trocken=True)
    elif befehl == "start":
        lauf(trocken=False)
    else:
        print(__doc__)
