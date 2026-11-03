@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title Albion Markt-Verkaufstool

where py >nul 2>nul && (set "PY=py -3") || (set "PY=python")
%PY% --version >nul 2>nul
if errorlevel 1 (
  echo Python wurde nicht gefunden.
  echo Installiere es mit:  winget install Python.Python.3.12
  echo oder von https://www.python.org/downloads/  ^(Haken bei "Add to PATH" setzen^)
  pause
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  echo Erster Start: richte Python-Umgebung ein ...
  %PY% -m venv .venv
)
".venv\Scripts\python.exe" -m pip install -q --disable-pip-version-check -r requirements.txt
if errorlevel 1 (
  echo Installation der Pakete fehlgeschlagen.
  pause
  exit /b 1
)

if not exist "C:\Program Files\Tesseract-OCR\tesseract.exe" (
  where tesseract >nul 2>nul
  if errorlevel 1 (
    echo.
    echo Tesseract-OCR fehlt ^(liest die Preise vom Bildschirm^).
    choice /c JN /m "Jetzt mit winget installieren"
    if not errorlevel 2 (
      where winget >nul 2>nul
      if errorlevel 1 (
        echo winget gibt es auf diesem PC nicht. Ich oeffne die Download-Seite.
        echo Dort "tesseract-ocr-w64-setup-....exe" laden, installieren ^(immer Weiter^)
        echo und danach start.bat neu starten.
        start "" "https://github.com/UB-Mannheim/tesseract/wiki"
        pause
        exit /b 1
      ) else (
        winget install -e --id UB-Mannheim.TesseractOCR
      )
    )
  )
)

:menu
echo.
echo ================ ALBION MARKT-VERKAUFSTOOL ================
echo  ACHTUNG: Klick-Automatik verstoesst gegen die Albion-Regeln.
echo           Benutzung auf eigenes Risiko ^(Bann moeglich^).
echo.
echo  1  Kalibrieren ^(einmalig, oder nach Aufloesungswechsel^)
echo  2  OCR-Test ^(liest nur den Preis im offenen Fenster^)
echo  3  Testlauf ^(alles ausser "Create"^)
echo  4  START ^(stellt wirklich ein^)
echo  5  Beenden
echo.
echo  Stopp waehrend des Laufs: F8
echo ===========================================================
choice /c 12345 /n /m "Auswahl: "
if errorlevel 5 exit /b 0
if errorlevel 4 (".venv\Scripts\python.exe" markt_bot.py start & goto menu)
if errorlevel 3 (".venv\Scripts\python.exe" markt_bot.py trocken & goto menu)
if errorlevel 2 (".venv\Scripts\python.exe" markt_bot.py ocr-test & goto menu)
if errorlevel 1 (".venv\Scripts\python.exe" markt_bot.py kalibrieren & goto menu)
goto menu
