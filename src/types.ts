export interface CurvePoint {
  t: number;
  tide: number | null;
  meas: number | null;
  auto: number | null;
}

export interface TideEvent {
  t: number;
  type: "HW" | "NW" | string;
  tide: number | null;
  fc: number | null;
  unc: number | null;
  dev: string | null;
  official: boolean;
  mos: number[];
}

export interface Gauge {
  mhw: number;
  curve: CurvePoint[];
  events: TideEvent[];
  fcTime: number;
  curveTime: number;
  text: string;
  warn: string;
}

export interface Zone {
  pct: number[];
  area: number;
}

export interface DgmData {
  levels: number[];
  fish: Zone;
  hc: Zone;
  scene: { u0: number; quay: number[]; fore: number[]; sky_u0: number; sky: (number | null)[] };
  dalmann: [number, number][];
  fishprof: [number, number][];
}

export type ZoneKey = "fish" | "hc";
