/**
 * Gemessene Wasserstände Pegel Hamburg-St. Pauli von PEGELONLINE (WSV), minütlich, 24 Stunden.
 * Die BSH-Kurve reicht nur etwa 12 Stunden zurück; für "heute schon nass?" braucht es den ganzen Tag.
 */
export const PEGELONLINE =
  "https://www.pegelonline.wsv.de/webservices/rest-api/v2/stations/d488c5cc-4de9-4631-8ce1-0db0e700b546/W/measurements.json?start=P1D";
/** Pegelnull St. Pauli laut PEGELONLINE (m NHN). */
const GAUGE_ZERO = -5.004;

export interface Measurement { t: number; v: number }

export function normalizeMeasurements(raw: { timestamp: string; value: number }[]): Measurement[] {
  return raw
    .map((m) => ({ t: Date.parse(m.timestamp), v: m.value / 100 + GAUGE_ZERO }))
    .filter((m) => !isNaN(m.t) && isFinite(m.v))
    .sort((a, b) => a.t - b.t);
}

/** Liefert eine leere Liste, wenn PEGELONLINE nicht antwortet – die Antwort kommt dann nur aus der BSH-Kurve. */
export async function fetchMeasurements(timeoutMs = 8000): Promise<Measurement[]> {
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(PEGELONLINE, { signal: ctl.signal });
    if (!r.ok) return [];
    return normalizeMeasurements(await r.json());
  } catch {
    return [];
  } finally {
    clearTimeout(to);
  }
}
