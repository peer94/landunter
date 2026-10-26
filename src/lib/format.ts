const tz = { timeZone: "Europe/Berlin" } as const;

export const f1 = (v: number) => (+v).toFixed(1);
export const fmtM = (m: number | null | undefined, d = 2) =>
  m == null ? "–" : (m >= 0 ? "+" : "−") + Math.abs(m).toFixed(d).replace(".", ",") + " m";
export const fmtShort = (m: number) => fmtM(m).replace(" m", "");
export const fmtCm = (cm: number) => Math.round(cm) + " cm";
/** Ablesung am Pegel St. Pauli in cm (Pegelnull NHN −5,00 m). */
export const pnp = (lv: number) => Math.round(lv * 100 + 500);
/** Breite eines Monospace-Texts in SVG-Einheiten. */
export const mono = (txt: string, size: number) => txt.length * size * 0.6;

export const fDay = new Intl.DateTimeFormat("de-DE", { ...tz, weekday: "short", day: "2-digit", month: "2-digit" });
export const fTime = new Intl.DateTimeFormat("de-DE", { ...tz, hour: "2-digit", minute: "2-digit" });
export const fWD = new Intl.DateTimeFormat("de-DE", { ...tz, weekday: "short" });
const fHour = new Intl.DateTimeFormat("de-DE", { ...tz, hour: "2-digit", hourCycle: "h23" });
const fDM = new Intl.DateTimeFormat("de-DE", { ...tz, day: "2-digit", month: "2-digit" });

export const fFull = (t: number) => fWD.format(t) + " " + fTime.format(t);
export const hourOf = (t: number) => +fHour.format(t);
const sameDay = (a: number, b: number) => fDM.format(a) === fDM.format(b);

export function whenWord(t: number, now = Date.now()) {
  if (sameDay(t, now)) return "heute " + fTime.format(t);
  if (sameDay(t, now + 864e5)) return "morgen " + fTime.format(t);
  return fFull(t);
}
