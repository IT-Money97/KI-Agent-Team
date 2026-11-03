"""Preis-Erkennung (OCR) fuer das Albion Markt-Verkaufstool.

Reine Funktionen ohne Maus/Tastatur, damit sie auch ohne Spiel testbar sind.
"""
import re
import shutil
import os

from PIL import Image, ImageOps

# Erlaubt: 13250, 13,250, 1,234,567 oder 13.250 (je nach Spracheinstellung)
_ZAHL_RE = re.compile(r"^\d{1,3}(?:[,.]\d{3})+$|^\d{1,7}$")

_TESSERACT_STANDARD = [
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    os.path.expandvars(r"%LOCALAPPDATA%\Programs\Tesseract-OCR\tesseract.exe"),
]


def finde_tesseract(eigener_pfad=None):
    """Sucht tesseract.exe: erst eigener Pfad, dann Standardorte, dann PATH."""
    kandidaten = [eigener_pfad] if eigener_pfad else []
    kandidaten += _TESSERACT_STANDARD
    for pfad in kandidaten:
        if pfad and os.path.isfile(pfad):
            return pfad
    return shutil.which("tesseract")


def parse_preis(text):
    """Macht aus OCR-Text eine ganze Zahl ohne Komma. None, wenn kein sauberer Preis.

    Strenge Pruefung: lieber ein Item ueberspringen als falsch verkaufen.
    """
    if not text:
        return None
    t = text.strip().replace(" ", "").replace("\n", "")
    # typische OCR-Verwechsler bei Ziffern
    t = t.replace("O", "0").replace("o", "0").replace("l", "1").replace("I", "1")
    t = t.strip(".,")
    if not _ZAHL_RE.match(t):
        return None
    wert = int(re.sub(r"[,.]", "", t))
    return wert if wert > 0 else None


def _rand_ist_dunkel(bild):
    """True, wenn der Bildrand (=Hintergrund) ueberwiegend dunkel ist."""
    w, h = bild.size
    px = bild.load()
    rand = [px[x, 0] for x in range(w)] + [px[x, h - 1] for x in range(w)]
    rand += [px[0, y] for y in range(h)] + [px[w - 1, y] for y in range(h)]
    return sum(rand) / len(rand) < 128


def _hell_hintergrund(bild):
    """Sorgt fuer dunkle Schrift auf hellem Grund (das mag Tesseract)."""
    return ImageOps.invert(bild) if _rand_ist_dunkel(bild) else bild


def _varianten(bild):
    """Erzeugt mehrere aufbereitete Versionen des Ausschnitts fuer robustere OCR."""
    grau = ImageOps.grayscale(bild)
    gross = grau.resize((grau.width * 4, grau.height * 4), Image.LANCZOS)
    gross = _hell_hintergrund(ImageOps.autocontrast(gross))
    yield ImageOps.expand(gross, border=20, fill=255)
    for schwelle in (110, 140, 170):
        sw = _hell_hintergrund(gross.point(lambda p, s=schwelle: 255 if p > s else 0))
        yield ImageOps.expand(sw, border=20, fill=255)


def lese_zahl(bild, tesseract_pfad):
    """Liest eine Zahl aus einem Bildausschnitt. Gibt (wert, rohtext) zurueck.

    Es zaehlt nur ein Wert, den mindestens zwei Varianten gleich erkennen
    (oder die einzige gueltige Lesung, wenn nur eine klappt).
    """
    import pytesseract

    pytesseract.pytesseract.tesseract_cmd = tesseract_pfad
    konfig = "--psm 7 -c tessedit_char_whitelist=0123456789,."
    treffer = {}
    roh = []
    for variante in _varianten(bild):
        text = pytesseract.image_to_string(variante, config=konfig)
        roh.append(text.strip())
        wert = parse_preis(text)
        if wert is not None:
            treffer[wert] = treffer.get(wert, 0) + 1
    if not treffer:
        return None, roh
    bester = max(treffer, key=treffer.get)
    if treffer[bester] < 2 and len(treffer) > 1:
        return None, roh  # Varianten widersprechen sich: unsicher
    return bester, roh
