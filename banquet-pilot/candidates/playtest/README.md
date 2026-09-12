# Candidates-only playtest (T-016)

Human-facing Chinese guide (product file:// vs this server, art preview, known gaps): **[`../PLAYTEST.md`](../PLAYTEST.md)** (T-017).

**Not shipped levels.** This page loads `../levels/c01.json`–`c12.json` design drafts so a human can click through seating. It is **not** formal `banquet-pilot/levels/`, **not** product L01–L03, and must not be described as 12 finished playable levels.

Product SHA stays frozen: `f28893f3c419d794c6ba102bac67038683cb462c`.  
This folder does not rewrite product `index.html` / `dist/` / `src/` gameplay. The loader only **imports** existing ESM:

- `../../src/core/index.js` — `evaluateLevel` / `isWin`
- `../../src/ui/board.js` — place / swap / displace / calm_bell
- `../../src/ui/labels.js` + `../../src/ui/app.css`

Product `src/ui/app.js` is **not** imported (it boots L01–L03 and writes `banquet-pilot-save-v1`). This playtest does not touch that save key.

## How to run (required)

Browsers typically block ESM `import` and `fetch` from `file://`. Serve from **`banquet-pilot/`** so `../../src` and `../levels` both resolve:

```bash
cd banquet-pilot
python3 -m http.server 8761
```

Then open:

- http://127.0.0.1:8761/candidates/playtest/
- http://127.0.0.1:8761/candidates/playtest/?c=c01
- http://127.0.0.1:8761/candidates/playtest/?c=c01&smoke=1  (headless helper: auto-place first guest)

Select C01–C12 in the dropdown. Click a waiting guest, then a seat, to place.

Serving only `candidates/playtest/` will break `../../src` imports (path walks above the server root).

## Smoke

1. Open `?c=c01` via the server above.
2. Place one guest (e.g. 狐 → A1), or in DevTools: `__CANDIDATE_PLAYTEST__.place('fox','A1')`.
3. Status should show `已入座 1/4`. Snapshot: `window.__CANDIDATE_PLAYTEST__` (`shippedClaim: false`).

Kernel-only check (no browser): `node candidates/playtest/smoke.mjs` from `banquet-pilot/` (T-024/T-025: c01–c12 load+place; c01/c04 undo; c03 calm_bell miss/hit).

## Limitation

- Tap-to-place only (no product drag-ghost). Enough to seat a guest and read rule lights.
- Product 3-tier hints are L01–L03 only; not shown here.
- No claim of formal-level promotion.
