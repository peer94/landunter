import { RANGE_H, REF, STEP } from "../config";
import { best, cls, levelAt } from "../lib/levels";
import { f1, fFull, fmtM, fWD, hourOf } from "../lib/format";
import { $, S } from "../state";
import { updateCursor } from "./chart";
import { updateScenes } from "./hero";

let TL: { X: (t: number) => number; Y: (v: number) => number; t0: number; t1: number } | null = null;

/** Darstellbarer Zeitraum: Beginn der Kurve bis höchstens RANGE_H Stunden später. */
export function tRange(): [number, number] {
  const c = S.d!.curve;
  return [c[0].t, Math.min(c[c.length - 1].t, c[0].t + RANGE_H * 3600e3)];
}

/** Tidenkurve als Spur der Zeitleiste; rot = Vorplatz nass. */
export function renderTimeline() {
  const box = $("tl");
  const W = box.clientWidth || 300, H = box.clientHeight || 48;
  const [t0, t1] = tRange();
  const pts = S.d!.curve.filter((x) => x.t <= t1).flatMap((x) => { const b = best(x); return b ? [[x.t, b.v] as [number, number]] : []; });
  const vs = pts.map((p) => p[1]);
  const y0 = Math.min(...vs) - 0.2, y1 = Math.max(...vs, REF.foreWet) + 0.3;
  const X = (t: number) => ((t - t0) / (t1 - t0)) * W, Y = (v: number) => 3 + ((y1 - v) / (y1 - y0)) * (H - 6);
  TL = { X, Y, t0, t1 };
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">`;
  for (let t = Math.ceil(t0 / 3600e3) * 3600e3; t <= t1; t += 3600e3) {
    if (hourOf(t) === 0) s += `<line x1="${f1(X(t))}" x2="${f1(X(t))}" y1="0" y2="${H}" style="stroke:var(--line)"/><text x="${f1(X(t) + 3)}" y="${H - 3}" font-size="9" style="fill:var(--muted)">${fWD.format(t)}</text>`;
  }
  const yT = Y(REF.foreWet), d = "M" + pts.map((p) => f1(X(p[0])) + " " + f1(Y(p[1]))).join(" L");
  const xe = f1(X(pts[pts.length - 1][0])), xs = f1(X(pts[0][0]));
  s += `<clipPath id="tlc"><rect x="0" y="0" width="${W}" height="${f1(yT)}"/></clipPath>`;
  s += `<path d="${d} L${xe} ${H} L${xs} ${H} Z" style="fill:var(--water);opacity:.22"/>`;
  s += `<path clip-path="url(#tlc)" d="${d} L${xe} ${f1(yT)} L${xs} ${f1(yT)} Z" style="fill:var(--danger);opacity:.55"/>`;
  s += `<path d="${d}" style="fill:none;stroke:var(--water-hi);stroke-width:1.6"/>`;
  s += `<line x1="0" x2="${W}" y1="${f1(yT)}" y2="${f1(yT)}" style="stroke:var(--danger);stroke-width:1" stroke-dasharray="3 3"/>`;
  const now = Date.now();
  if (now > t0 && now < t1) s += `<line x1="${f1(X(now))}" x2="${f1(X(now))}" y1="0" y2="${H}" style="stroke:var(--ink);stroke-width:1;opacity:.45"/>`;
  s += `<line id="tl-cur" x1="0" x2="0" y1="0" y2="${H}" style="stroke:var(--ink);stroke-width:2"/><circle id="tl-dot" r="4.5" cx="0" cy="0" style="fill:var(--ink);stroke:var(--surface);stroke-width:2"/></svg>`;
  box.innerHTML = s;
  $<HTMLInputElement>("t").max = String(Math.round((t1 - t0) / STEP));
}

/** Zeitpunkt setzen und alles nachziehen. */
export function setT(t: number) {
  if (!S.d) return;
  const [t0, t1] = tRange();
  t = Math.max(t0, Math.min(t1, t));
  S.t = t;
  const L = levelAt(S.d.curve, t);
  if (!L) return;
  const over = L.v - S.d.mhw, k = cls(over);
  $("tlabel").textContent = fFull(t);
  $("tsrc").textContent = L.s;
  $("tlevel").textContent = fmtM(L.v) + " NHN";
  const chip = $("tchip");
  chip.className = "chip c" + k.c;
  chip.textContent = k.c > 0 ? k.t : over >= 0.75 ? "erhöht" : "normal";
  if (TL) {
    const x = f1(TL.X(t));
    const cu = $("tl-cur"), dt = $("tl-dot");
    cu.setAttribute("x1", x); cu.setAttribute("x2", x);
    dt.setAttribute("cx", x); dt.setAttribute("cy", f1(TL.Y(L.v)));
  }
  const sl = $<HTMLInputElement>("t");
  sl.value = String(Math.round((t - t0) / STEP));
  sl.setAttribute("aria-valuetext", `${fFull(t)}, ${fmtM(L.v)} NHN`);
  updateScenes(L.v);
  updateCursor(t, L.v);
}

const ICON_PLAY = '<svg viewBox="0 0 16 16" width="16" height="16"><path d="M4 2 L14 8 L4 14 Z" fill="currentColor"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 16 16" width="16" height="16"><rect x="3" y="2" width="3.5" height="12" fill="currentColor"/><rect x="9.5" y="2" width="3.5" height="12" fill="currentColor"/></svg>';
function setPlayIcon(on: boolean) {
  const b = $("play");
  b.innerHTML = on ? ICON_PAUSE : ICON_PLAY;
  b.setAttribute("aria-label", on ? "Pause" : "Abspielen");
}
export function stop() {
  if (S.playing) { clearInterval(S.playing); S.playing = null; setPlayIcon(false); }
}

export function initTimeline() {
  $<HTMLInputElement>("t").addEventListener("input", (e) => { stop(); setT(tRange()[0] + +(e.target as HTMLInputElement).value * STEP); });
  $("play").onclick = () => {
    if (S.playing) return stop();
    const [t0, t1] = tRange();
    if (S.t >= t1 - STEP) S.t = t0;
    setPlayIcon(true);
    const ms = matchMedia("(prefers-reduced-motion: reduce)").matches ? 250 : 110;
    S.playing = setInterval(() => { if (S.t >= tRange()[1]) return stop(); setT(S.t + STEP); }, ms);
  };
  $("nowbtn").onclick = () => { stop(); setT(Date.now()); };
}
