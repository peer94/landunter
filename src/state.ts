import type { Gauge, TideEvent } from "./types";

export interface ViewBox { x: number; y: number; w: number; h: number; sf: number }

/** Gemeinsamer Zustand der Seite. */
export const S = {
  d: null as Gauge | null,
  t: 0,
  playing: null as ReturnType<typeof setInterval> | null,
  next: null as TideEvent | null,
  tab: "lage",
  zoom: "halle" as "halle" | "nah",
  zoomManual: false,
  vb: null as ViewBox | null,
  sf: 1,
};

/** Kurzform für getElementById mit Typ. */
export const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
