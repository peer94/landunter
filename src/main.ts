import "./styles.css";
import { fetchGauge } from "./lib/bsh";
import { $, S } from "./state";
import { renderChart } from "./ui/chart";
import { buildScenes, fitHero, initHeroGestures, showHintOnce } from "./ui/hero";
import { initSheet, renderEvents, renderLage, sheetOpen } from "./ui/sheet";
import { initTimeline, renderTimeline, setT } from "./ui/timeline";

const REFRESH_MS = 10 * 60e3;

function renderAll(t: number) {
  renderLage();
  buildScenes();
  renderTimeline();
  renderEvents();
  if (sheetOpen() && S.tab === "kurve") renderChart();
  setT(t);
}

async function load() {
  S.d = await fetchGauge();
}

async function start() {
  initTimeline();
  initHeroGestures();
  initSheet();
  try {
    await load();
  } catch (err) {
    console.error(err);
    $("tlabel").textContent = "BSH nicht erreichbar";
    $("tlevel").textContent = "bitte später neu laden";
    return;
  }
  renderAll(Date.now());
  showHintOnce();

  let rz: ReturnType<typeof setTimeout>;
  addEventListener("resize", () => {
    clearTimeout(rz);
    rz = setTimeout(() => { fitHero(); renderTimeline(); if (sheetOpen() && S.tab === "kurve") renderChart(); setT(S.t); }, 120);
  });
  setInterval(async () => {
    try { await load(); renderAll(S.t); } catch (err) { console.warn("Aktualisierung fehlgeschlagen", err); }
  }, REFRESH_MS);
}

start();
