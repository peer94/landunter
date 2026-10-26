import { describe, expect, it } from "vitest";
import fixture from "./fixtures/st-pauli-2026-10-26.json";
import { normalize, type RawGauge } from "../src/lib/bsh";
import { answerFor, callTide } from "../src/lib/answer";
import type { Gauge, TideEvent } from "../src/types";

const g = normalize((fixture as unknown as { features: { properties: RawGauge }[] }).features[0].properties);
const at = (s: string) => Date.parse(s);
const ev = (p: Partial<TideEvent>): TideEvent => ({ t: at("2026-10-27T05:00:00+01:00"), type: "HW", tide: 2.3, fc: null, unc: null, dev: null, official: false, mos: [], ...p });
const empty: Gauge = { ...g, curve: [], events: [] };

describe("callTide", () => {
  const now = at("2026-10-26T12:00:00+01:00");
  it("Vielleicht, wenn die Unsicherheit die Kante überspannt (Sturmflut 26.10., 16:22)", () => {
    const hw = g.events.find((e) => e.type === "HW" && e.t > now)!;
    const c = callTide(g, hw, now);
    expect(c.mid).toBeCloseTo(3.64, 2);
    expect(c.verdict).toBe("vielleicht"); // 3,39–3,89 um 3,70
  });
  it("Ja, wenn auch die untere Grenze über der Kante liegt", () => {
    expect(callTide(empty, ev({ fc: 4.2, unc: 25 }), now).verdict).toBe("ja");
  });
  it("Nein, wenn auch die obere Grenze darunter bleibt", () => {
    expect(callTide(empty, ev({ fc: 2.4, unc: 10 }), now).verdict).toBe("nein");
  });
  it("nimmt ohne amtliche Zahl die Modellspanne plus Sicherheitsabstand", () => {
    expect(callTide(empty, ev({ mos: [3.55, 3.62] }), now).verdict).toBe("vielleicht");
    expect(callTide(empty, ev({ mos: [3.0, 3.1] }), now).verdict).toBe("nein");
  });
  it("wertet vergangene Hochwasser nach der Messung", () => {
    const night = g.events.find((e) => e.type === "HW")!; // erstes HW in der Kurve
    const c = callTide(g, { ...night, t: at("2026-10-26T03:20:00+01:00") }, now);
    expect(c.measured).toBe(true);
    expect(c.verdict).toBe("ja"); // gemessen +4,31 m
  });
});

describe("answerFor", () => {
  it("mittags am 26.10.: Antwort zum Hochwasser 16:22 (vielleicht), die Nacht ist gemessen nass", () => {
    const a = answerFor(g, "heute", at("2026-10-26T12:30:00+01:00"));
    expect(a.verdict).toBe("vielleicht");
    expect(a.past?.verdict).toBe("ja");
    expect(a.past?.mid).toBeCloseTo(4.31, 1);
  });
  it("sind alle Hochwasser vorbei, entscheidet die Messung", () => {
    const a = answerFor({ ...g, events: [] }, "heute", at("2026-10-26T12:30:00+01:00"));
    expect(a.verdict).toBe("ja");
    expect(a.key?.measured).toBe(true);
  });
  it("morgen (27.10.): nein", () => {
    expect(answerFor(g, "morgen", at("2026-10-26T12:00:00+01:00")).verdict).toBe("nein");
  });
});
