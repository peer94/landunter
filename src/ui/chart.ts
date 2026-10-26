import { RANGE_H, REF } from "../config";
import { best } from "../lib/levels";
import { fDay, fmtM, hourOf } from "../lib/format";
import { $, S } from "../state";
import type { CurvePoint } from "../types";
import { setT, stop } from "./timeline";

let CH: { X: (t: number) => number; Y: (v: number) => number; t0: number; t1: number; W: number; m: { l: number; r: number; t: number; b: number } } | null = null;

/** Ausführliche Kurve mit Modellfächer und amtlicher Vorhersage. */
export function renderChart() {
  const box = $("chart"), d = S.d!, c = d.curve;
  const W = Math.max(320, box.clientWidth || 700), H = W < 520 ? 260 : 300;
  const m = { l: 44, r: 10, t: 12, b: 28 };
  const t0 = c[0].t, t1 = Math.min(c[c.length - 1].t, t0 + RANGE_H * 3600e3);
  const vals: number[] = [];
  c.forEach((x) => { if (x.t <= t1) [x.tide, x.meas, x.auto].forEach((v) => { if (v != null) vals.push(v); }); });
  d.events.forEach((e) => { if (e.t <= t1) { vals.push(...e.mos); if (e.fc != null) vals.push(e.fc + (e.unc || 0) / 100); } });
  const y0 = Math.floor(Math.min(...vals) - 0.2), y1 = Math.ceil(Math.max(...vals, REF.foreWet, REF.dalmWet) + 0.2);
  const X = (t: number) => m.l + ((t - t0) / (t1 - t0)) * (W - m.l - m.r);
  const Y = (v: number) => m.t + ((y1 - v) / (y1 - y0)) * (H - m.t - m.b);
  CH = { X, Y, t0, t1, W, m };
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Wasserstandskurve Pegel St. Pauli">`;
  for (let v = y0; v <= y1; v++) s += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}" style="stroke:var(--line)"/><text x="${m.l - 6}" y="${Y(v) + 3}" font-size="10" text-anchor="end" style="fill:var(--muted)">${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v)}</text>`;
  for (let t = Math.ceil(t0 / 3600e3) * 3600e3; t <= t1; t += 3600e3) {
    const hr = hourOf(t);
    if (hr === 0) s += `<line x1="${X(t)}" x2="${X(t)}" y1="${m.t}" y2="${H - m.b}" style="stroke:var(--line)"/><text x="${X(t) + 4}" y="${H - m.b + 16}" font-size="10" style="fill:var(--muted)">${fDay.format(t)}</text>`;
    else if (hr === 12 && W > 480) s += `<text x="${X(t)}" y="${H - m.b + 16}" font-size="9" text-anchor="middle" style="fill:var(--line)">12</text>`;
  }
  const th = (v: number, l: string, col: string) => `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}" style="stroke:${col};stroke-width:1.2" stroke-dasharray="5 4"/><text x="${m.l + 4}" y="${Y(v) - 4}" font-size="10" style="fill:${col}">${l}</text>`;
  s += th(d.mhw, "mittleres Hochwasser", "var(--muted)");
  s += th(REF.foreWet, "Vorplatz Fischauktionshalle nass", "var(--brick)");
  s += th(REF.dalmWet, "Dalmannkai-Promenade nass", "var(--water-hi)");
  const pts = c.filter((x) => x.t <= t1).flatMap((x) => { const b = best(x); return b ? [[X(x.t), Y(b.v)]] : []; });
  const yW = Y(REF.foreWet);
  s += `<clipPath id="above"><rect x="0" y="0" width="${W}" height="${yW}"/></clipPath>`;
  s += `<path clip-path="url(#above)" d="M${pts[0][0]} ${yW} L${pts.map((p) => p.join(" ")).join(" L")} L${pts[pts.length - 1][0]} ${yW} Z" style="fill:var(--brick);fill-opacity:.22"/>`;
  const path = (key: keyof Omit<CurvePoint, "t">) => {
    let p = "", on = false;
    c.forEach((x) => { if (x.t > t1) return; const v = x[key]; if (v == null) { on = false; return; } p += (on ? "L" : "M") + X(x.t).toFixed(1) + " " + Y(v).toFixed(1) + " "; on = true; });
    return p;
  };
  s += `<path d="${path("tide")}" style="fill:none;stroke:var(--muted);stroke-width:1.3" stroke-dasharray="4 3"/>`;
  s += `<path d="${path("auto")}" style="fill:none;stroke:var(--water-hi);stroke-width:2.6"/>`;
  s += `<path d="${path("meas")}" style="fill:none;stroke:var(--ink);stroke-width:2.2"/>`;
  d.events.forEach((e) => {
    if (e.t < t0 || e.t > t1) return;
    const x = X(e.t);
    if (e.mos.length) { const lo = Math.min(...e.mos), hi = Math.max(...e.mos); s += `<rect x="${x - 3}" y="${Y(hi) - 1}" width="6" height="${Math.max(2, Y(lo) - Y(hi) + 2)}" rx="1" style="fill:var(--signal)"/>`; }
    if (e.fc != null) {
      const u = (e.unc || 0) / 100;
      s += `<line x1="${x + 8}" x2="${x + 8}" y1="${Y(e.fc + u)}" y2="${Y(e.fc - u)}" style="stroke:var(--danger);stroke-width:1.5"/><rect x="${x + 4.5}" y="${Y(e.fc) - 3.5}" width="7" height="7" transform="rotate(45 ${x + 8} ${Y(e.fc)})" style="fill:var(--danger)"/>`;
      if (e.type === "HW" && e.fc - d.mhw >= 1.5) s += `<text x="${x + 14}" y="${Y(e.fc) + 3}" font-size="10" style="fill:var(--danger)">${fmtM(e.fc).replace(" m", "")}</text>`;
    }
  });
  const now = Date.now();
  if (now > t0 && now < t1) s += `<line x1="${X(now)}" x2="${X(now)}" y1="${m.t}" y2="${H - m.b}" style="stroke:var(--ink);stroke-width:1"/><text x="${X(now) + 3}" y="${m.t + 9}" font-size="9" style="fill:var(--ink)">jetzt</text>`;
  s += `<g id="cursor"><line id="cur-l" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}" style="stroke:var(--signal);stroke-width:2"/><circle id="cur-d" r="5" cx="0" cy="0" style="fill:var(--signal);stroke:var(--surface);stroke-width:2"/></g></svg>`;
  box.innerHTML = s;
}

export function updateCursor(t: number, lv: number) {
  if (!CH) return;
  const l = document.getElementById("cur-l"), d = document.getElementById("cur-d");
  if (!l || !d) return;
  const x = String(CH.X(t));
  l.setAttribute("x1", x); l.setAttribute("x2", x);
  d.setAttribute("cx", x); d.setAttribute("cy", String(CH.Y(lv)));
}

export function initChart() {
  const el = $("chart");
  const scrub = (ev: PointerEvent) => {
    if (!CH) return;
    const r = el.getBoundingClientRect(), px = ((ev.clientX - r.left) / r.width) * CH.W;
    stop();
    setT(CH.t0 + ((px - CH.m.l) / (CH.W - CH.m.l - CH.m.r)) * (CH.t1 - CH.t0));
  };
  el.addEventListener("pointerdown", (e) => { scrub(e); el.setPointerCapture(e.pointerId); });
  el.addEventListener("pointermove", (e) => { if (e.buttons) scrub(e); });
}
