import { REF, ZR } from "../config";
import { DGM } from "../data";
import { boots, depthAt, pct } from "../lib/levels";
import { f1, fmtCm, fmtM, mono, pnp } from "../lib/format";
import { FH, fx, fy, hallSVG } from "../scene/hall";
import { FP, profSVG, py } from "../scene/profile";
import { HC, hcSVG, hy } from "../scene/hafencity";
import { $, S, type ViewBox } from "../state";
import type { ZoneKey } from "../types";
import { setT, stop } from "./timeline";

/** Ausschnitt des Hauptbilds so wählen, dass die Halle zwischen Titel und Zeitleiste passt. */
function targetVB(): ViewBox | null {
  const app = $("app");
  const W = app.clientWidth, H = app.clientHeight;
  if (!W || !H) return null;
  const top = $("topbar").offsetHeight + 4, dock = $("dock").offsetHeight;
  app.style.setProperty("--dockh", dock + "px");
  app.style.setProperty("--toph", top + "px");
  const band = Math.max(140, H - top - dock - 18);
  if (!S.zoomManual) {
    const auto = band / (ZR.hi - ZR.lo) < 11 ? "nah" : "halle";
    if (auto !== S.zoom) { S.zoom = auto; syncZoomBtn(); }
  }
  let k: number, zbot: number, uc: number;
  if (S.zoom === "nah") {
    const a = FH.latte - 3.7, b = FH.person + 3.4;
    k = Math.min(W / (b - a), band / 10.5); zbot = 0.3; uc = (a + b) / 2;
  } else {
    k = band / (ZR.hi - ZR.lo); zbot = ZR.lo; uc = FH.c;
    const wm = W / k, lo = FH.latte - 3.2, hi = FH.person + 3.6;
    if (uc - wm / 2 > lo) uc = lo + wm / 2;
    if (uc + wm / 2 < hi) uc = hi - wm / 2;
  }
  const wm = W / k, hm = H / k, ztop = zbot + band / k + top / k;
  return { x: fx(uc - wm / 2), y: fy(ztop), w: wm * 10, h: hm * 10, sf: Math.max(0.28, Math.min(1.3, 18 / k)) };
}

function applyVB(v: ViewBox) {
  const svg = $("hero") as unknown as SVGSVGElement;
  S.vb = v; S.sf = v.sf;
  svg.setAttribute("viewBox", `${f1(v.x)} ${f1(v.y)} ${f1(v.w)} ${f1(v.h)}`);
  svg.style.setProperty("--sf", v.sf.toFixed(3));
  svg.querySelectorAll<SVGGElement>(".lvl-s,.who-s").forEach((g) => {
    const ox = +(g.dataset.ox ?? 0), oy = +(g.dataset.oy ?? 0);
    g.setAttribute("transform", `translate(${ox} ${oy}) scale(${v.sf.toFixed(3)}) translate(${-ox} ${-oy})`);
  });
}

export function fitHero(animate = false) {
  const t = targetVB();
  if (!t) return;
  if (!animate || !S.vb || matchMedia("(prefers-reduced-motion: reduce)").matches) { applyVB(t); return; }
  const f = S.vb, t0 = performance.now(), D = 420;
  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / D), e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    applyVB({ x: f.x + (t.x - f.x) * e, y: f.y + (t.y - f.y) * e, w: f.w + (t.w - f.w) * e, h: f.h + (t.h - f.h) * e, sf: f.sf + (t.sf - f.sf) * e });
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function syncZoomBtn() {
  const b = $("zoom");
  b.setAttribute("aria-pressed", S.zoom === "nah" ? "true" : "false");
  b.querySelector("span")!.textContent = S.zoom === "nah" ? "Ganze Halle" : "Nah ran";
}
export function setZoom(z: "halle" | "nah") { S.zoom = z; S.zoomManual = true; syncZoomBtn(); fitHero(true); }

export function buildScenes() {
  $("hero").innerHTML = hallSVG();
  $("fish-prof").innerHTML = profSVG();
  $("scene-hc").innerHTML = hcSVG(S.d!.mhw);
  fitHero();
}

function setWater(svg: Element, y: number, ybot: number) {
  svg.querySelectorAll(".w-rect").forEach((r) => { r.setAttribute("y", f1(y)); r.setAttribute("height", f1(Math.max(0, ybot - y))); });
  svg.querySelectorAll(".w-line,.mk,.lvl").forEach((p) => p.setAttribute("transform", `translate(0 ${f1(y)})`));
}

/** Wasserstand lv (m NHN) in alle Zeichnungen und Kennzahlen übernehmen. */
export function updateScenes(lv: number) {
  const hero = $("hero");
  setWater(hero, fy(lv), fy(FH.zb - 1));
  const a = `${fmtM(lv)} NHN`, b = `Pegel St. Pauli ${pnp(lv)} cm`;
  hero.querySelector(".lvl-a")!.textContent = a;
  hero.querySelector(".lvl-b")!.textContent = b;
  hero.querySelector(".lvl-bg")!.setAttribute("width", f1(Math.max(mono(a, 7), mono(b, 4.4)) + 8));
  const d = depthAt(lv, REF.fore, REF.foreWet);
  const w = d > 0 ? `${fmtCm(d)} Wasser · ${boots(d).t}` : lv > REF.foreWet - 0.6 ? `trocken · noch ${fmtCm((REF.foreWet - lv) * 100)}` : "trocken";
  hero.querySelector(".who-t")!.textContent = w;
  const bw = mono(w, 6) + 8, bg = hero.querySelector(".who-bg")!;
  bg.setAttribute("width", f1(bw));
  bg.setAttribute("x", f1(fx(FH.person) - bw / 2));
  hero.classList.toggle("is-wet", d > 0);
  const fp = $("fish-prof");
  setWater(fp, py(lv), py(FP.zb - 1));
  const t = fp.querySelector(".lvl-t");
  if (t) t.textContent = `Wasserstand ${fmtM(lv)} NHN · Pegel St. Pauli ${pnp(lv)} cm`;
  setWater($("scene-hc"), hy(lv), hy(HC.zb - 1));
  facts("facts-fish", lv, REF.fore, REF.foreWet, "fish", "Vorplatz Fischauktionshalle", "Markt-Ebene am Fischmarkt");
  facts("facts-hc", lv, REF.dalm, REF.dalmWet, "hc", "Promenade Dalmannkai", "Promenaden HafenCity West", `Warft: noch ${fmtCm((REF.warft - lv) * 100)} bis +7,50 m.`);
}

function facts(id: string, lv: number, ground: number, wetFrom: number, zone: ZoneKey, place: string, zoneName: string, extra = "") {
  const d = depthAt(lv, ground, wetFrom), p = pct(DGM, zone, lv), b = boots(d);
  $(id).innerHTML = `
   <div class="fact"><span class="label">Pegel St. Pauli</span><b class="num">${pnp(lv)} cm</b><small>${fmtM(lv)} NHN</small></div>
   <div class="fact"><span class="label">${place}</span><b class="num">${d > 0 ? fmtCm(d) : "trocken"}</b><small>${d > 0 ? b.t : `Gelände ${fmtM(ground)}, nass ab ${fmtM(wetFrom)}`}</small></div>
   <div class="fact"><span class="label">${zoneName} unter Wasser</span><b class="num">${Math.round(p)} %</b><span class="bar"><i style="width:${Math.min(100, p).toFixed(1)}%"></i></span></div>
   ${extra ? `<p class="cap">${extra}</p>` : ""}`;
}

/* ---------- Gesten: wischen ändert die Zeit, doppeltippen zoomt ---------- */
export function initHeroGestures() {
  const hero = $("hero");
  let g: { x: number; y: number; t: number; drag: boolean; id: number } | null = null, lastTap = 0;
  hero.addEventListener("pointerdown", (e) => {
    if (!S.d) return;
    g = { x: e.clientX, y: e.clientY, t: S.t, drag: false, id: e.pointerId };
    hero.setPointerCapture(e.pointerId);
  });
  hero.addEventListener("pointermove", (e) => {
    if (!g || e.pointerId !== g.id) return;
    const dx = e.clientX - g.x;
    if (!g.drag && Math.abs(dx) > 8) { g.drag = true; stop(); hideHint(); }
    if (g.drag) setT(g.t + (dx / (hero.clientWidth || 1)) * 12 * 3600e3);
  });
  hero.addEventListener("pointerup", (e) => {
    if (!g) return;
    const moved = g.drag || Math.hypot(e.clientX - g.x, e.clientY - g.y) > 10;
    g = null;
    if (moved) return;
    const now = performance.now();
    if (now - lastTap < 320) { lastTap = 0; hideHint(); setZoom(S.zoom === "nah" ? "halle" : "nah"); }
    else lastTap = now;
  });
  hero.addEventListener("pointercancel", () => { g = null; });
  $("zoom").onclick = () => { hideHint(); setZoom(S.zoom === "nah" ? "halle" : "nah"); };
}

const HINT_KEY = "landunter-hint";
export function hideHint() {
  $("hint").classList.add("off");
  try { localStorage.setItem(HINT_KEY, "1"); } catch { /* Speicher nicht verfügbar */ }
}
export function showHintOnce() {
  let seen = false;
  try { seen = !!localStorage.getItem(HINT_KEY); } catch { /* Speicher nicht verfügbar */ }
  if (seen) return;
  const h = $("hint");
  h.classList.remove("off");
  setTimeout(() => h.classList.add("off"), 5000);
}
