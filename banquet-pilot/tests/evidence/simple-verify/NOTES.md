# T-003 simple verify (GROKBOT01) — 2026-09-12

Human-authorized **non-isolation** simple verification for Banquet Pilot (issue #7 / draft PR #11).
真机未测。

## How to run
```bash
# from repo root
node --test banquet-pilot/tests/test_rules.mjs banquet-pilot/tests/test_board.mjs
node banquet-pilot/tests/enumerate_levels.mjs
python3 -m http.server 8760 --bind 127.0.0.1 --directory banquet-pilot
# browser: http://127.0.0.1:8760/?level=L01  and  ?level=L02
```

## Unit / enum results
- `node --test …test_rules.mjs …test_board.mjs`: **38/38 pass**, fail 0
- `enumerate_levels.mjs`: L01 24→1; L02 720→1; L03 no calm 0; L03 calm rabbit 1 (expected)

## Browser evidence (Chrome headless, sandbox ON, no isolation launcher)
Screenshots (committed here):
- `L01_360x640.png`, `L01_390x844.png`
- `L02_360x640.png`, `L02_390x844.png`

CDP page console: `console_cdp.json`
- `pageErrors`: [] for L01 and L02
- Informational `[banquet] level L01/L02` logs only
- Network: `favicon.ico` 404 only (benign; no app asset failures)
- Chrome host stderr dbus/cpufreq noise ignored (not page JS)

Greybox initial states visible: L01 0/4 seated + waiting fox/rabbit/crane/otter; L02 0/6 + six characters; rule PENDING rows render.

## Not run / gaps
- Isolation launcher / `run-evidence.mjs` REJECT-fix paths: **not re-run** (human: simple verify OK without isolation)
- Interaction paths (click/drag win, swap/undo, touch-sim): **not re-exercised** in this simple pass (prior evidence under `tests/evidence/l01|l02|…` retained)
- 真机未测
