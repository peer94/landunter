import { REF } from "../config";
import { DGM } from "../data";
import { boots, cls, depthAt, evLevel, pct, wetSpan } from "../lib/levels";
import { fDay, fFull, fmtCm, fmtM, fTime, whenWord } from "../lib/format";
import { $, S } from "../state";
import type { TideEvent, ZoneKey } from "../types";
import { renderChart } from "./chart";
import { setT } from "./timeline";

/** Nur <b> aus dem BSH-Vorhersagetext übernehmen. */
const safeText = (s: string) => s.replace(/<(?!\/?b>)[^>]*>/g, "");

/** Lage-Reiter, Titelzeilen-Link und Quellenhinweis. */
export function renderLage() {
  const d = S.d!, now = Date.now();
  const src = $("src");
  src.className = "src live";
  src.querySelector("span")!.textContent = "live vom BSH";
  $("stamp").textContent = `Vorhersage ${fDay.format(d.fcTime)} ${fTime.format(d.fcTime)} · Kurve ${fTime.format(d.curveTime)}`;

  const hws = d.events.filter((e) => e.type === "HW");
  const next = hws.find((e) => e.t > now - 45 * 60e3) ?? hws[hws.length - 1];
  if (!next) return;
  const lv = evLevel(next), over = lv - d.mhw, k = cls(over);
  S.next = next;
  const meas = d.curve.filter((c) => c.meas != null);
  const last = meas[meas.length - 1];
  const peak = meas.reduce((a, c) => ((c.meas ?? -99) > (a.meas ?? -99) ? c : a), meas[0]);
  $("lead").innerHTML = `
    <span class="label">Nächstes Hochwasser · ${whenWord(next.t)}</span>
    <div class="big num">${fmtM(lv)}<small>NHN</small></div>
    <span class="chip c${k.c}">${k.t}</span>
    <p><b>${fmtM(over).replace(" m", "")} m über mittlerem Hochwasser</b>${next.unc ? ` (± ${next.unc} cm)` : ""}. ${next.official ? "Amtliche Vorhersage des BSH." : "Noch keine amtliche Zahl, Mittel der Modellläufe."}
    ${last ? ` Zuletzt gemessen: <span class="num">${fmtM(last.meas)}</span> um ${fTime.format(last.t)}.` : ""}
    ${peak && peak.meas != null && peak.meas - d.mhw > 1 ? ` Höchststand der letzten Stunden: <span class="num">${fmtM(peak.meas)}</span> (${fFull(peak.t)}).` : ""}</p>
    ${d.text ? `<p class="fc-text">${safeText(d.text)}</p>` : ""}`;
  card("card-fish", "Vorplatz Fischauktionshalle", REF.fore, REF.foreWet, "fish", "der Markt-Ebene", next);
  card("card-hc", "Promenade Dalmannkai", REF.dalm, REF.dalmWet, "hc", "der Promenaden West", next);
}

function card(id: string, name: string, ground: number, wetFrom: number, zone: ZoneKey, zoneName: string, ev: TideEvent) {
  const lv = evLevel(ev), depth = depthAt(lv, ground, wetFrom), b = boots(depth), p = pct(DGM, zone, lv);
  const span = wetSpan(S.d!.curve, wetFrom, ev.t);
  const el = $(id);
  el.className = "card" + (depth > 0 ? (b.k > 1 ? " deep" : " wet") : "");
  const when = depth > 0 && span.lo != null && span.hi != null
    ? `nass ca. ${fTime.format(span.lo)} bis ${fTime.format(span.hi)}`
    : `noch ${fmtCm((wetFrom - lv) * 100)} bis ${fmtM(wetFrom)}`;
  el.innerHTML = `<span class="label">${name} · ${fTime.format(ev.t)}</span>
    <h3>${b.t}</h3>
    <div class="depth-n num">${depth > 0 ? fmtCm(depth) : "0 cm"}</div>
    <span class="verdict">${Math.round(p)} % ${zoneName} unter Wasser</span>
    <span class="when">${when}${ev.unc ? ` · Vorhersage ± ${ev.unc} cm` : ""}</span>`;
}

/** Tabelle der nächsten Hoch- und Niedrigwasser. */
export function renderEvents() {
  const d = S.d!, now = Date.now();
  const rows = d.events.filter((e) => e.t > now - 8 * 3600e3).slice(0, 12);
  let h = `<thead><tr><th>Zeit</th><th>Tide</th><th>astron.</th><th>Vorhersage</th><th>über MHW</th><th>Modellspanne</th><th>Markt-Ebene</th><th></th></tr></thead><tbody>`;
  for (const e of rows) {
    const lv = evLevel(e), over = lv - d.mhw, k = cls(over), hw = e.type === "HW";
    const span = e.mos.length ? Math.round((Math.max(...e.mos) - Math.min(...e.mos)) * 100) + " cm" : "–";
    const fish = pct(DGM, "fish", lv);
    h += `<tr class="${e.t < now ? "past" : ""}"><td>${fFull(e.t)}</td><td>${hw ? "Hochwasser" : "Niedrigwasser"}</td><td>${fmtM(e.tide)}</td>
      <td>${fmtM(lv)}${e.official ? "" : " *"}</td><td>${hw ? fmtM(over) : "–"}</td><td>${span}</td>
      <td>${hw ? (fish >= 0.5 ? Math.round(fish) + " % nass" : "trocken") : "–"}</td>
      <td>${hw && k.c > 0 ? `<span class="chip c${k.c}">${k.t}</span>` : ""}</td></tr>`;
  }
  h += `</tbody><caption style="caption-side:bottom;text-align:left;font-size:.78rem;color:var(--muted);padding-top:6px">* ohne amtliche Zahl: Mittel der Modellläufe</caption>`;
  $("events").innerHTML = h;
}

/* ---------- Mehr-Fenster ---------- */
export const sheetOpen = () => !$("sheet").hidden;

export function openSheet(tab?: string) {
  $("sheet").hidden = false;
  $("scrim").hidden = false;
  showTab(tab || S.tab || "lage");
  $("close").focus();
}
export function closeSheet() {
  $("sheet").hidden = true;
  $("scrim").hidden = true;
  $("more").focus();
}
function showTab(tab: string) {
  S.tab = tab;
  const sheet = $("sheet");
  sheet.querySelectorAll<HTMLElement>("[data-tab]").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === tab ? "true" : "false"));
  sheet.querySelectorAll<HTMLElement>("[data-pane]").forEach((p) => { p.hidden = p.dataset.pane !== tab; });
  if (tab === "kurve") { renderChart(); setT(S.t); }
  $("sheet-body").scrollTop = 0;
}

export function initSheet() {
  const sheet = $("sheet");
  $("more").onclick = () => openSheet();
  $("close").onclick = closeSheet;
  $("scrim").onclick = closeSheet;
  sheet.querySelectorAll<HTMLElement>("[data-tab]").forEach((b) => { b.onclick = () => showTab(b.dataset.tab!); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && sheetOpen()) closeSheet(); });
  // Blatt am Griff nach unten ziehen schließt es
  const grab = $("grab");
  let y0: number | null = null;
  grab.addEventListener("pointerdown", (e) => { y0 = e.clientY; grab.setPointerCapture(e.pointerId); sheet.style.transition = "none"; });
  grab.addEventListener("pointermove", (e) => { if (y0 != null) sheet.style.transform = `translateY(${Math.max(0, e.clientY - y0)}px)`; });
  const up = (e: PointerEvent) => {
    if (y0 == null) return;
    const dy = e.clientY - y0; y0 = null;
    sheet.style.transition = ""; sheet.style.transform = "";
    if (dy > 90) closeSheet();
  };
  grab.addEventListener("pointerup", up);
  grab.addEventListener("pointercancel", up);
}
