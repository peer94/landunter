"""Erzeugt src/data/dgm.json aus den offenen Höhendaten der Stadt Hamburg.

Quellen (Landesbetrieb Geoinformation und Vermessung, dl-de/by-2.0):
  - DGM1 2022 (Geländemodell, 1-m-Raster, GeoTIFF, m NHN / DHHN2016)
  - bDOM 2022 (Oberflächenmodell mit Gebäuden) für den Elbhang hinter der Halle
  - LoD2 2026 (3D-Gebäudemodell) für Lage und Ausrichtung der Fischauktionshalle

Aus den Zip-Archiven (1–3,5 GB) werden per HTTP-Range nur die benötigten
1-km-Kacheln geladen und unter tools/dgm/cache/ abgelegt.

Aufruf:  python tools/dgm/build_dgm.py
"""
from __future__ import annotations

import json
import math
import re
from pathlib import Path

import numpy as np
import pyproj
import rasterio
from lxml import etree
from remotezip import RemoteZip
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
CACHE = Path(__file__).resolve().parent / "cache"
OUT = ROOT / "src" / "data" / "dgm.json"

DGM_ZIP = "https://daten-hamburg.de/opendata/fernerkundung_hoehenmodelle/dgm/dgm1_hh_2022-04-30.zip"
BDOM_ZIP = "https://daten-hamburg.de/opendata/Digitales_Hoehenmodell_bDOM/dom1_hh_2022-11-21.zip"
LOD2_ZIP = "https://daten-hamburg.de/opendata/3d_stadtmodell_lod2/LoD2-DE_HH_2026-04-28.zip"

# Ausschnitt (UTM32, km-Kacheln): Fischmarkt 562–563, HafenCity 565–567
TILES_X = range(562, 568)
TILES_Y = (5932, 5933)
X0, Y1 = 562_000, 5_934_000  # linke obere Ecke des Mosaiks
HALL_ID = "DEHHALKAP0000vvs"  # Fischauktionshalle im LoD2
HALL_NEAR = (563_060, 5_933_300)
WATER_LEVEL_IN_DGM = 2.0  # Wasserflächen sind im DGM1 als Ebene auf +2,00 m eingetragen

TO_UTM = pyproj.Transformer.from_crs(4326, 25832, always_xy=True)


def fetch(zip_url: str, pattern: str, dest: Path) -> list[Path]:
    """Lädt alle Zip-Einträge, deren Name auf pattern passt, nach dest (mit Cache)."""
    dest.mkdir(parents=True, exist_ok=True)
    rx = re.compile(pattern)
    out: list[Path] = []
    with RemoteZip(zip_url) as z:
        for name in z.namelist():
            if not rx.search(name):
                continue
            target = dest / Path(name).name
            if not target.exists():
                target.write_bytes(z.read(name))
            out.append(target)
    return out


def mosaic(files: list[Path]) -> np.ndarray:
    a = np.full((len(TILES_Y) * 1000, len(TILES_X) * 1000), np.nan, dtype=np.float32)
    for f in files:
        m = re.search(r"_32_(\d+)_(\d+)_1", f.name)
        x, y = int(m[1]), int(m[2])
        d = rasterio.open(f).read(1).astype(np.float32)
        d[d < -100] = np.nan
        r0, c0 = Y1 - (y + 1) * 1000, x * 1000 - X0
        a[r0:r0 + 1000, c0:c0 + 1000] = d
    return a


def flood_levels(a: np.ndarray, water: np.ndarray) -> np.ndarray:
    """Für jede Zelle: ab welchem Wasserstand sie über tieferes Gelände mit der Elbe verbunden ist."""
    fl = np.full(a.shape, np.nan, np.float32)
    for lv in np.round(np.arange(2.1, 8.0001, 0.05), 2):
        low = (a < lv) | water
        lab, _ = ndimage.label(low)
        ids = np.unique(lab[water])
        ids = ids[ids > 0]
        hit = np.isin(lab, ids) & ~water & np.isnan(fl)
        fl[hit] = lv
    return fl


def window(lon0, lat0, lon1, lat1):
    x0, y0 = TO_UTM.transform(lon0, lat0)
    x1, y1 = TO_UTM.transform(lon1, lat1)
    return slice(int(Y1 - y1), int(Y1 - y0)), slice(int(x0 - X0), int(x1 - X0))


def hypsometry(fl, big, bbox, maxfl, levels):
    r, c = window(*bbox)
    v = fl[r, c][big[r, c]]
    v = v[~np.isnan(v) & (v <= maxfl)]
    return [round(float((v <= lv + 1e-6).mean() * 100), 1) for lv in levels], int(v.size)


def hall_axis(lod2: Path):
    """Mittelpunkt, Längsachse (nach Osten) und Normale (zur Elbe) der Halle aus dem LoD2."""
    t = etree.parse(str(lod2))
    ns = {k: v for k, v in t.getroot().nsmap.items() if k}
    bld = [b for b in t.getroot().iterfind(".//bldg:Building", ns) if b.get(f"{{{ns['gml']}}}id") == HALL_ID]
    pts = []
    for g in bld[0].iter(f"{{{ns['bldg']}}}GroundSurface"):
        for pl in g.iter(f"{{{ns['gml']}}}posList"):
            pts.append(np.array(pl.text.split(), float).reshape(-1, 3))
    xy = np.vstack(pts)[:, :2]
    c = xy.mean(0)
    w, v = np.linalg.eigh(np.cov((xy - c).T))
    ax = v[:, np.argmax(w)]
    n = np.array([ax[1], -ax[0]])
    if n[1] > 0:
        n = -n  # Normale zeigt zur Elbe (Süden)
    if ax[0] < 0:
        ax = -ax
    return c, ax, n


def main() -> None:
    tile_rx = "|".join(f"_32_{x}_{y}_1_hh_2022" for x in TILES_X for y in TILES_Y)
    dgm_files = fetch(DGM_ZIP, rf"dgm1(?:{tile_rx})\.tif$", CACHE / "dgm")
    bdom = fetch(BDOM_ZIP, r"dom1_32_563_5933_1_hh_2022\.tif$", CACHE / "bdom")[0]
    lod2 = fetch(LOD2_ZIP, r"LoD2_32_563_5933_1_HH\.gml$", CACHE / "lod2")[0]

    a = mosaic(dgm_files)
    water = np.abs(a - WATER_LEVEL_IN_DGM) < 0.005
    fl = flood_levels(a, water)

    land = ~water & ~np.isnan(a)
    lab, n = ndimage.label(land)
    sizes = ndimage.sum(land, lab, range(1, n + 1))
    big = np.isin(lab, np.where(sizes > 20_000)[0] + 1)  # schwimmende Pontons fallen heraus

    levels = [float(x) for x in np.round(np.arange(3.0, 6.0001, 0.05), 2)]
    fish, fish_n = hypsometry(fl, big, (9.9460, 53.5432, 9.9600, 53.5468), 5.0, levels)
    hc, hc_n = hypsometry(fl, big, (9.9840, 53.5392, 9.9990, 53.5432), 5.5, levels)

    def at(arr, p):
        return float(arr[int(Y1 - p[1]), int(p[0] - X0)])

    c, ax, nrm = hall_axis(lod2)
    quay = [round(max(at(a, c + u * ax + s * nrm) for s in (18.5, 19, 19.5)), 2) for u in range(-56, 57)]
    fore = [round(float(np.median([at(a, c + u * ax + s * nrm) for s in (14, 15, 16)])), 2) for u in range(-56, 57)]
    fishprof = [[float(s), round(float(np.median([at(a, c + u * ax + s * nrm) for u in (-38, -36, -34)])), 2)]
                for s in np.arange(34, -20.5, -0.5)]

    dom = rasterio.open(bdom)
    dd = dom.read(1).astype(float)
    dd[dd < -100] = np.nan

    def at_dom(p):
        col, row = int(p[0] - dom.bounds.left), int(dom.bounds.top - p[1])
        return dd[row, col] if 0 <= row < dd.shape[0] and 0 <= col < dd.shape[1] else np.nan

    sky = []
    for u in range(-60, 61):
        v = np.array([at_dom(c + u * ax + s * nrm) for s in np.arange(-22, -120, -1.0)])
        sky.append(None if np.all(np.isnan(v)) else round(float(np.nanmax(v)), 1))

    dx, dy = TO_UTM.transform(9.9891795, 53.5408829)  # Dalmannkai
    dalmann = [[d, round(at(a, (dx, dy + d)), 2)] for d in range(-16, 27)]

    out = {
        "levels": levels,
        "fish": {"pct": fish, "area": fish_n},
        "hc": {"pct": hc, "area": hc_n},
        "scene": {"u0": -56, "quay": quay, "fore": fore, "sky_u0": -60, "sky": sky},
        "dalmann": dalmann,
        "fishprof": fishprof,
    }
    OUT.write_text(json.dumps(out, separators=(",", ":"), allow_nan=False))
    print(f"geschrieben: {OUT.relative_to(ROOT)}  (Markt-Ebene {fish_n} m², Promenaden {hc_n} m²)")


if __name__ == "__main__":
    main()
