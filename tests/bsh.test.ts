import { describe, expect, it } from "vitest";
import fixture from "./fixtures/st-pauli-2026-10-26.json";
import { normalize, type RawGauge } from "../src/lib/bsh";
import { API } from "../src/config";

const raw = (fixture as unknown as { features: { properties: RawGauge }[] }).features[0].properties;

describe("normalize", () => {
  const g = normalize(raw);

  it("rechnet cm über Pegelnull in m NHN um", () => {
    expect(g.mhw).toBeCloseTo(2.14, 2);
    const hw = g.events.find((e) => e.type === "HW")!;
    expect(hw.fc).toBeCloseTo(3.64, 2); // 864 cm PNP
    expect(hw.unc).toBe(25);
  });

  it("sortiert die Kurve zeitlich und behält Messung und Vorhersage", () => {
    expect(g.curve.length).toBeGreaterThan(500);
    for (let i = 1; i < g.curve.length; i++) expect(g.curve[i].t).toBeGreaterThan(g.curve[i - 1].t);
    expect(g.curve.some((c) => c.meas != null)).toBe(true);
    expect(g.curve.some((c) => c.auto != null)).toBe(true);
  });

  it("liest die sechs Modellläufe", () => {
    expect(g.events[0].mos).toHaveLength(6);
  });
});

describe("API-Adresse", () => {
  it("enthält lang, damit der BSH-Server nicht ohne CORS-Header umleitet", () => {
    expect(new URL(API).searchParams.get("lang")).toBeTruthy();
  });
});
