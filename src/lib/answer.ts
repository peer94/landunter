import { REF } from "../config";
import type { Gauge, TideEvent } from "../types";
import { best, wetSpan } from "./levels";

export type Verdict = "ja" | "nein" | "vielleicht";

export interface TideCall {
  event: TideEvent;
  verdict: Verdict;
  lo: number; // untere Grenze der erwarteten Höhe (m NHN)
  hi: number; // obere Grenze
  mid: number; // bester Schätzwert
  measured: boolean; // Hochwasser liegt in der Vergangenheit und ist gemessen
  from: number | null; // Zeitraum, in dem der Vorplatz nass ist (laut Kurve)
  to: number | null;
}

export interface DayAnswer {
  day: "heute" | "morgen";
  verdict: Verdict;
  key: TideCall | null; // das Hochwasser, das die Antwort bestimmt
  calls: TideCall[]; // noch ausstehende (oder ungemessene) Hochwasser des Tages
  past: TideCall | null; // höchster gemessener Stand des Tages bis jetzt
}

/** Zusätzliche Unsicherheit, wenn es nur Modellläufe ohne amtliche Zahl gibt (m). */
const MOS_MARGIN = 0.1;
/** Grobe Unsicherheit, wenn nur die astronomische Tide bekannt ist (m). */
const TIDE_MARGIN = 0.3;

const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" });

function judge(lo: number, hi: number, limit: number): Verdict {
  if (lo >= limit) return "ja";
  if (hi < limit) return "nein";
  return "vielleicht";
}

/** Bewertung eines Hochwassers: gemessen, amtlich ± Unsicherheit, Modellspanne oder Tide. */
export function callTide(g: Gauge, e: TideEvent, now: number, limit = REF.foreWet): TideCall {
  // Vergangenes Hochwasser: höchster Messwert in ±2 h
  if (e.t < now) {
    const meas = g.curve.filter((c) => Math.abs(c.t - e.t) <= 2 * 3600e3 && c.meas != null).map((c) => c.meas as number);
    if (meas.length) {
      const peak = Math.max(...meas);
      const span = wetSpan(g.curve, limit, e.t);
      return { event: e, verdict: peak >= limit ? "ja" : "nein", lo: peak, hi: peak, mid: peak, measured: true, from: peak >= limit ? span.lo : null, to: peak >= limit ? span.hi : null };
    }
  }
  let lo: number, hi: number, mid: number;
  if (e.fc != null) {
    const u = (e.unc ?? 0) / 100;
    lo = e.fc - u; hi = e.fc + u; mid = e.fc;
  } else if (e.mos.length) {
    lo = Math.min(...e.mos) - MOS_MARGIN; hi = Math.max(...e.mos) + MOS_MARGIN;
    mid = e.mos.reduce((a, b) => a + b, 0) / e.mos.length;
  } else {
    const t = e.tide ?? NaN;
    lo = t - TIDE_MARGIN; hi = t + TIDE_MARGIN; mid = t;
  }
  const verdict = judge(lo, hi, limit);
  const span = verdict === "nein" ? { lo: null, hi: null } : wetSpan(g.curve, limit, e.t);
  return { event: e, verdict, lo, hi, mid, measured: false, from: span.lo, to: span.hi };
}

const rank: Record<Verdict, number> = { nein: 0, vielleicht: 1, ja: 2 };

/** Höchster gemessener Stand eines Tages bis jetzt, als Bewertung. */
function measuredPeak(g: Gauge, target: string, now: number, limit: number): TideCall | null {
  const pts = g.curve.filter((c) => c.meas != null && c.t <= now && dayKey.format(c.t) === target);
  if (!pts.length) return null;
  const top = pts.reduce((a, b) => ((b.meas as number) > (a.meas as number) ? b : a));
  const peak = top.meas as number, wet = peak >= limit;
  const span = wet ? wetSpan(g.curve, limit, top.t) : { lo: null, hi: null };
  const e: TideEvent = { t: top.t, type: "HW", tide: top.tide, fc: null, unc: null, dev: null, official: false, mos: [] };
  return { event: e, verdict: wet ? "ja" : "nein", lo: peak, hi: peak, mid: peak, measured: true, from: span.lo, to: span.hi };
}

/**
 * Antwort für einen Kalendertag (Europe/Berlin).
 * Maßgeblich sind die noch ausstehenden Hochwasser (ja schlägt vielleicht schlägt nein).
 * Sind alle vorbei, entscheidet der höchste gemessene Stand des Tages.
 */
export function answerFor(g: Gauge, day: "heute" | "morgen", now = Date.now(), limit = REF.foreWet): DayAnswer {
  const target = dayKey.format(now + (day === "morgen" ? 864e5 : 0));
  const past = day === "heute" ? measuredPeak(g, target, now, limit) : null;
  const calls = g.events
    .filter((e) => e.type === "HW" && dayKey.format(e.t) === target)
    .map((e) => callTide(g, e, now, limit))
    .filter((c) => !c.measured); // gemessene stecken schon in past
  if (calls.length) {
    const key = calls.reduce((a, b) => (rank[b.verdict] > rank[a.verdict] || (rank[b.verdict] === rank[a.verdict] && b.hi > a.hi) ? b : a));
    return { day, verdict: key.verdict, key, calls, past };
  }
  if (past) return { day, verdict: past.verdict, key: past, calls, past };
  return { day, verdict: "nein", key: null, calls, past };
}

/** Steht gerade jetzt Wasser auf dem Vorplatz? */
export function wetNow(g: Gauge, now = Date.now(), limit = REF.foreWet) {
  const past = g.curve.filter((c) => c.t <= now);
  const last = past[past.length - 1];
  const b = last ? best(last) : null;
  return !!b && b.v >= limit && now - last.t < 30 * 60e3;
}

/** Heute steht kein Hochwasser mehr aus: dann auch morgen zeigen. */
export function todayIsOver(a: DayAnswer) {
  return a.calls.length === 0;
}
