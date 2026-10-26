import dgmJson from "./dgm.json";
import type { DgmData } from "../types";

/** Vorberechnete Geländedaten aus dem DGM1 2022 (erzeugt mit tools/dgm/build_dgm.py). */
export const DGM = dgmJson as unknown as DgmData;
