import { describe, expect, it } from "vitest";
import { DGM } from "../src/data";
import { boots, cls, depthAt, evLevel, levelAt, pct } from "../src/lib/levels";
import type { CurvePoint, TideEvent } from "../src/types";

const P = (t: number, v: Partial<CurvePoint>): CurvePoint => ({ t, tide: null, meas: null, auto: null, ...v });

describe("levelAt", () => {
  const c = [P(0, { meas: 1 }), P(10, { meas: 3 }), P(20, { auto: 5 })];
  it("interpoliert linear", () => expect(levelAt(c, 5)!.v).toBeCloseTo(2));
  it("nimmt Messung vor Vorhersage", () => expect(levelAt(c, 10)!.s).toBe("gemessen"));
  it("klemmt an den Rändern", () => {
    expect(levelAt(c, -100)!.v).toBeCloseTo(1);
    expect(levelAt(c, 100)!.v).toBeCloseTo(5);
  });
});

describe("Einstufung und Tiefe", () => {
  it("stuft nach Höhe über MHW ein", () => {
    expect(cls(1.49).c).toBe(0);
    expect(cls(1.5).t).toBe("Sturmflut");
    expect(cls(2.5).c).toBe(2);
    expect(cls(3.5).c).toBe(3);
  });
  it("Vorplatz bleibt trocken, bis er mit der Elbe verbunden ist", () => {
    expect(depthAt(3.68, 3.66, 3.7)).toBe(0);
    expect(depthAt(4.31, 3.66, 3.7)).toBeCloseTo(65);
  });
  it("übersetzt Tiefe in Gummistiefel-Worte", () => {
    expect(boots(0).t).toBe("trocken");
    expect(boots(65).t).toBe("hüfthoch");
  });
  it("nutzt ohne amtliche Zahl das Mittel der Modellläufe", () => {
    const e: TideEvent = { t: 0, type: "HW", tide: 2.4, fc: null, unc: null, dev: null, official: false, mos: [2, 3] };
    expect(evLevel(e)).toBeCloseTo(2.5);
  });
});

describe("pct (Geländemodell)", () => {
  it("steigt monoton mit dem Wasserstand", () => {
    let prev = -1;
    for (let lv = 2; lv <= 6.5; lv += 0.05) { const p = pct(DGM, "fish", lv); expect(p).toBeGreaterThanOrEqual(prev); prev = p; }
  });
  it("trifft die Werte der Sturmflut vom 26.10.2026", () => {
    expect(pct(DGM, "fish", 3.64)).toBeLessThan(10);
    expect(pct(DGM, "fish", 4.31)).toBeGreaterThan(65);
    expect(pct(DGM, "fish", 5.0)).toBe(100);
  });
});
