/** Feste Größen der Darstellung. Alle Höhen in m NHN (DHHN2016). */

export const API =
  "https://gdi.bsh.de/ldproxy/rest/services/WaterLevelForecast/collections/waterlevelforecastdata/items?f=json&operator_gauge_id=5952050";

/** Höchststände am Pegel St. Pauli (HPA, Gewässerkundliche Information 2025; 1962 gerundet). */
export const HIST = [
  { y: 1962, m: 5.7 },
  { y: 1976, m: 6.45 },
  { y: 2013, m: 6.08, n: "Xaver" },
  { y: 2022, m: 5.86 },
] as const;

/** Amtliche Schwellen aus dem Merkblatt Flutschutz HafenCity. */
export const OFFICIAL = [
  { m: 4.5, t: "WADI zuständig" },
  { m: 5.5, t: "Umleitung" },
  { m: 6.5, t: "Räumung" },
  { m: 7.3, t: "sehr schwere SF" },
] as const;

/** Geländehöhen aus dem DGM1 2022 (siehe tools/dgm). */
export const REF = {
  fore: 3.66, // Vorplatz Fischauktionshalle, Median
  foreWet: 3.7, // ab hier über tiefere Stellen mit der Elbe verbunden
  dalm: 4.35, // Promenade Dalmannkai, Median
  dalmWet: 4.3,
  warft: 7.5, // amtlicher Schutz der HafenCity-Warften
} as const;

/** Zeitraster und dargestellter Zeitraum. */
export const STEP = 10 * 60e3;
export const RANGE_H = 90;

/** Senkrechter Ausschnitt der Gesamtansicht. */
export const ZR = { lo: -2, hi: 30.6 } as const;
