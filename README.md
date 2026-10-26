# Landunter

Zeigt die amtliche Wasserstandsvorhersage des BSH für den Pegel Hamburg-St. Pauli an einem maßstäblichen Bild der Fischauktionshalle: Pegellatte, Person in Gummistiefeln, Wasserstand zum gewählten Zeitpunkt. Kurve, Querschnitt, HafenCity und Tidentabelle liegen im „Mehr“-Fenster.

## Stack

- **Vite + TypeScript**, ohne UI-Framework. Die Seite ist ein einziges SVG-Bild mit wenig Bedienung; ein Framework brächte hier mehr Gewicht als Nutzen.
- **Vitest** für die Rechenlogik (Umrechnung der BSH-Daten, Interpolation, Einstufung, Überflutungsanteile).
- **Python** (nur für die Datenaufbereitung) in `tools/dgm/`: erzeugt `src/data/dgm.json` aus den offenen Höhendaten Hamburgs.
- Kein Backend: Die BSH-Schnittstelle erlaubt Abrufe direkt aus dem Browser (CORS `*`).

## Loslegen

```bash
npm install
npm run dev        # Entwicklungsserver
npm test           # Tests
npm run build      # Typprüfung und Build nach dist/
npm run preview    # Build lokal ansehen
```

Node 20 oder neuer.

## Aufbau

```
src/
  config.ts          feste Größen (API, Geländehöhen, historische Marken, Schwellen)
  types.ts
  data/dgm.json      vorberechnete Geländedaten (siehe tools/dgm)
  lib/               Logik ohne DOM: BSH-Abruf, Formatierung, Wasserstände
  scene/             SVG-Zeichnungen: Halle (Ansicht), Querschnitt, HafenCity
  ui/                Hauptbild, Zeitleiste, Kurve, Mehr-Fenster
  main.ts            Start, Aktualisierung alle 10 Minuten
tests/               Vitest, mit einer echten BSH-Antwort vom 26.10.2026 als Fixture
tools/dgm/           Aufbereitung der Höhendaten (Python)
```

## Daten

- **Wasserstand:** BSH, Wasserstandsvorhersage, Pegel Hamburg-St. Pauli (`operator_gauge_id=5952050`), CC BY 4.0. Werte in cm über Pegelnull (NHN −5,00 m), in der App in m NHN.
- **Gelände:** DGM1 Hamburg 2022, LGV, dl-de/by-2.0. Eine Fläche gilt als nass, sobald der Wasserstand sie über tieferes Gelände von der Elbe aus erreicht. Flutschutzwände, Tore und Abflüsse sind nicht berücksichtigt.
- **Halle:** Umriss und Höhen aus bDOM 2022 und LoD2; Fenster und Schmuck nach Fotos gezeichnet. Die Pegellatte an der Kaimauer ist ergänzt.
- **Hochwassermarken:** HPA, Gewässerkundliche Information 2025.

Kein amtlicher Warndienst. Ab +4,50 m NHN gelten für Hamburg allein die Angaben des Hamburger Sturmflutwarndienstes (WADI).

## Deployment

Statische Seite. Auf Vercel: Framework „Vite“, Build `npm run build`, Ausgabe `dist`.
