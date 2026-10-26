import { API } from "../config";
import type { Gauge, TideEvent } from "../types";

/** Rohdaten-Ausschnitt der BSH-Schnittstelle (nur die genutzten Felder). */
export interface RawGauge {
  gaugezero_relative_to_nhn: number | string;
  mean_high_water: number | string;
  forecast_timestamp: string;
  automated_curveforecast_timestamp: string;
  forecast_text?: { de?: string };
  automated_gauge_warning?: string;
  official_warning_level_region?: string;
  curve?: Record<string, string | undefined>[];
  high_water_low_water?: Record<string, string | number | null>[];
}

const ts = (s: unknown) => Date.parse(String(s).replace(" ", "T"));
const num = (v: unknown): number | null => (v === undefined || v === null || v === "" ? null : +v);

/** Wandelt die BSH-Antwort in m NHN um. Die Schnittstelle liefert cm über Pegelnull. */
export function normalize(p: RawGauge): Gauge {
  const zero = +p.gaugezero_relative_to_nhn;
  const toM = (cm: number | null) => (cm == null ? null : (cm + zero) / 100);
  const curve = (p.curve ?? [])
    .map((c) => ({
      t: ts(c.timestamp),
      tide: toM(num(c.tidal_prediction)),
      meas: toM(num(c.measurement)),
      auto: toM(num(c.automated_curve_forecast)),
    }))
    .filter((c) => !isNaN(c.t))
    .sort((a, b) => a.t - b.t);
  const events: TideEvent[] = (p.high_water_low_water ?? [])
    .map((e) => {
      const mos = [0, 1, 2, 3, 4, 5]
        .map((i) => num(e[`mos_forecast_r${i}_value`]))
        .filter((v): v is number => v != null)
        .map((v) => toM(v) as number);
      return {
        t: ts(e.event_timestamp),
        type: String(e.event),
        tide: toM(num(e.tidal_prediction_value)),
        fc: toM(num(e.forecast_value)),
        unc: num(e.forecast_uncertainty),
        dev: (e.forecast_deviation as string) || (e.mos_forecast_r0_deviation as string) || null,
        official: num(e.forecast_value) != null,
        mos,
      };
    })
    .filter((e) => !isNaN(e.t))
    .sort((a, b) => a.t - b.t);
  return {
    mhw: toM(+p.mean_high_water) as number,
    curve,
    events,
    fcTime: ts(p.forecast_timestamp),
    curveTime: ts(p.automated_curveforecast_timestamp),
    text: p.forecast_text?.de ?? "",
    warn: p.automated_gauge_warning || p.official_warning_level_region || "",
  };
}

/** Holt die aktuelle Vorhersage für den Pegel St. Pauli. */
export async function fetchGauge(timeoutMs = 15000): Promise<Gauge> {
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(API, { signal: ctl.signal });
    if (!r.ok) throw new Error(`BSH antwortet mit ${r.status}`);
    const j = (await r.json()) as { features?: { properties: RawGauge }[] };
    const f = j.features?.[0];
    if (!f) throw new Error("BSH lieferte keinen Pegel");
    return normalize(f.properties);
  } finally {
    clearTimeout(to);
  }
}
