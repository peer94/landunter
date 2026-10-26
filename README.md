# Landunter

Beantwortet direkt die Frage **„Steht der Fischmarkt heute unter Wasser?“** – Ja, Nein oder Vielleicht – und zeigt die amtliche Wasserstandsvorhersage des BSH für den Pegel Hamburg-St. Pauli an einem maßstäblichen Bild der Fischauktionshalle: Pegellatte, Person in Gummistiefeln, Wasserstand zum gewählten Zeitpunkt. Kurve, Querschnitt, HafenCity und Tidentabelle liegen im „Mehr“-Fenster.

## Stack

- **Vite + TypeScript**, ohne UI-Framework. Die Seite ist ein einziges SVG-Bild mit wenig Bedienung; ein Framework brächte hier mehr Gewicht als Nutzen.
- **Hono** als kleiner Server-Dienst (`server/`): setzt die Antwort schon auf dem Server in die Seite ein (Titel, Beschreibung, sichtbarer Text, Vorschau-Tags), damit Google und Linkvorschauen sie sehen. Die CDN hält das Ergebnis 10 Minuten.
- **Vitest** für die Rechenlogik (Umrechnung der BSH-Daten, Interpolation, Einstufung, Antwort, Server-Ausgabe).
- **Python** (nur für die Datenaufbereitung) in `tools/dgm/`: erzeugt `src/data/dgm.json` aus den offenen Höhendaten Hamburgs.

## Loslegen

```bash
npm install
npm run dev        # Entwicklungsserver (nur Frontend, Antwort rechnet der Browser)
npm run dev:vercel # beide Dienste wie auf Vercel (braucht die Vercel-CLI)
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
server/              Dienst ssr: Startseite mit eingesetzter Antwort, robots.txt, sitemap.xml
shell.html           Seitenvorlage (heißt nicht index.html, damit "/" beim Dienst ssr landet)
tests/               Vitest, mit einer echten BSH-Antwort vom 26.10.2026 als Fixture
tools/dgm/           Aufbereitung der Höhendaten (Python)
```

## Daten

- **Wasserstand:** BSH, Wasserstandsvorhersage, Pegel Hamburg-St. Pauli (`operator_gauge_id=5952050`), CC BY 4.0. Werte in cm über Pegelnull (NHN −5,00 m), in der App in m NHN.
- **Messwerte des Tages:** PEGELONLINE (WSV), Pegel Hamburg St. Pauli, minütlich über 24 Stunden. Die BSH-Kurve reicht nur etwa 12 Stunden zurück.
- **Gelände:** DGM1 Hamburg 2022, LGV, dl-de/by-2.0. Eine Fläche gilt als nass, sobald der Wasserstand sie über tieferes Gelände von der Elbe aus erreicht. Flutschutzwände, Tore und Abflüsse sind nicht berücksichtigt.
- **Halle:** Umriss und Höhen aus bDOM 2022 und LoD2; Fenster und Schmuck nach Fotos gezeichnet. Die Pegellatte an der Kaimauer ist ergänzt.
- **Hochwassermarken:** HPA, Gewässerkundliche Information 2025.

Kein amtlicher Warndienst. Ab +4,50 m NHN gelten für Hamburg allein die Angaben des Hamburger Sturmflutwarndienstes (WADI).

## Antwortregel

Maßstab ist die Kante des Vorplatzes der Fischauktionshalle bei +3,70 m NHN. Bewertet werden die noch ausstehenden Hochwasser des Tages: amtliche Vorhersage ± Unsicherheit, sonst Spanne der Modellläufe + 10 cm. Ganz darüber = Ja, ganz darunter = Nein, sonst Vielleicht. Steht gerade Wasser auf dem Platz, heißt es „Ja – gerade jetzt“. Ist das letzte Hochwasser vorbei, entscheidet der höchste gemessene Stand des Tages.

## Deployment

Vercel-Projekt mit zwei Diensten (`vercel.json`):

- `app` – Vite, statische Dateien, öffentlich für alle Pfade außer den folgenden.
- `ssr` – Hono, öffentlich für `/`, `/robots.txt` und `/sitemap.xml`. Holt die Vorlage `shell.html` über das Binding `APP_URL` vom Dienst `app`.

Nur Produktion ist für Suchmaschinen freigegeben; Vorschau-Deployments liefern `noindex`.
