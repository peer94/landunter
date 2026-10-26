import type { CurvePoint, DgmData, TideEvent, ZoneKey } from "../types";

export interface Level {
  v: number;
  s: "gemessen" | "Vorhersage" | "astron. Tide";
}

/** Bester verfügbarer Wert eines Kurvenpunkts: Messung vor Vorhersage vor Tide. */
export function best(c: CurvePoint): Level | null {
  if (c.meas != null) return { v: c.meas, s: "gemessen" };
  if (c.auto != null) return { v: c.auto, s: "Vorhersage" };
  if (c.tide != null) return { v: c.tide, s: "astron. Tide" };
  return null;
}

/** Linear interpolierter Wasserstand zum Zeitpunkt t. */
export function levelAt(curve: CurvePoint[], t: number): Level | null {
  if (!curve.length) return null;
  if (curve.length === 1) return best(curve[0]);
  let i = curve.findIndex((x) => x.t >= t);
  if (i <= 0) i = i === -1 ? curve.length - 1 : 1;
  const a = curve[i - 1], b = curve[i];
  const A = best(a), B = best(b);
  if (!A || !B) return A || B;
  const k = Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t || 1)));
  return { v: A.v + (B.v - A.v) * k, s: k < 0.5 ? A.s : B.s };
}

/** Sturmflut-Einstufung nach Höhe über mittlerem Hochwasser (m). */
export function cls(over: number) {
  if (over >= 3.5) return { c: 3, t: "Sehr schwere Sturmflut" };
  if (over >= 2.5) return { c: 2, t: "Schwere Sturmflut" };
  if (over >= 1.5) return { c: 1, t: "Sturmflut" };
  return { c: 0, t: over >= 0.75 ? "Erhöhtes Hochwasser" : "Normales Hochwasser" };
}

/** Wert eines Hoch- oder Niedrigwassers: amtlich, sonst Mittel der Modellläufe, sonst Tide. */
export function evLevel(e: TideEvent): number {
  if (e.fc != null) return e.fc;
  if (e.mos.length) return e.mos.reduce((a, b) => a + b, 0) / e.mos.length;
  return e.tide ?? NaN;
}

/** Gummistiefel-Index: Wassertiefe in cm in Worten. */
export function boots(cm: number) {
  if (cm <= 0) return { t: "trocken", k: 0 };
  if (cm < 5) return { t: "nasse Sohlen", k: 1 };
  if (cm < 15) return { t: "knöcheltief", k: 1 };
  if (cm < 35) return { t: "Gummistiefel-Grenze", k: 1 };
  if (cm < 55) return { t: "knietief, Stiefel laufen voll", k: 2 };
  if (cm < 95) return { t: "hüfthoch", k: 2 };
  if (cm < 140) return { t: "brusthoch", k: 2 };
  return { t: "Schwimmen", k: 2 };
}

/** Wassertiefe (cm) über einem Gelände, das erst ab wetFrom mit der Elbe verbunden ist. */
export function depthAt(lv: number, ground: number, wetFrom: number) {
  return lv >= wetFrom && lv > ground ? (lv - ground) * 100 : 0;
}

/** Zeitraum rund um ein Hochwasser, in dem der Wasserstand über ground liegt. */
export function wetSpan(curve: CurvePoint[], ground: number, around: number) {
  let lo: number | null = null, hi: number | null = null, peak = -1e9;
  for (const x of curve) {
    if (Math.abs(x.t - around) > 4 * 3600e3) continue;
    const b = best(x);
    if (!b) continue;
    if (b.v > ground) { if (lo == null) lo = x.t; hi = x.t; }
    if (b.v > peak) peak = b.v;
  }
  return { lo, hi, peak };
}

/** Anteil einer Zone (in %), der bei Wasserstand lv nass ist. Unter 3,0 m linear bis 0 bei 2,14 m. */
export function pct(dgm: DgmData, zone: ZoneKey, lv: number) {
  const L = dgm.levels, P = dgm[zone].pct;
  if (lv <= L[0]) return Math.max(0, (P[0] * (lv - 2.14)) / (L[0] - 2.14));
  if (lv >= L[L.length - 1]) return P[P.length - 1];
  const i = Math.min(L.length - 2, Math.floor((lv - L[0]) / (L[1] - L[0]) + 1e-9));
  const k = (lv - L[i]) / (L[i + 1] - L[i]);
  return P[i] + (P[i + 1] - P[i]) * k;
}
