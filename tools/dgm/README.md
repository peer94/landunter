# Geländedaten aufbereiten

`build_dgm.py` lädt aus den Hamburger Open-Data-Archiven nur die nötigen Kacheln (per HTTP-Range, Cache in `cache/`) und schreibt `src/data/dgm.json`:

- Anteil der Markt-Ebene am Fischmarkt und der Promenaden HafenCity West, der bei einem Wasserstand nass ist (3,00–6,00 m NHN in 5-cm-Schritten)
- Höhe der Kaikante und des Vorplatzes entlang der Halle
- Häuserkante des Elbhangs hinter der Halle (aus dem bDOM)
- Geländeprofile durch die Halle und am Dalmannkai

```bash
python -m venv .venv && . .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r tools/dgm/requirements.txt
python tools/dgm/build_dgm.py
```

Laufzeit etwa 1,5 Minuten, Download etwa 30 MB.
