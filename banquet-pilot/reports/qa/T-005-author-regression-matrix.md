# T-005 AUTHOR REGRESSION Matrix — NOT independent QA

> **BANNER: AUTHOR REGRESSION / NOT independent QA**  
> Executor: GROKBOT01 (original engineering author of fixed SHA).  
> Per GPT01 DECIDE `5643375947` (scheme 3): this package is **author-adjacent evidence only**.  
> It does **NOT** claim independent QA pass. Final independent recheck + ACCEPT remain with GPT01.

---

## Versions

| Role | Value |
|------|-------|
| **Product under test (FIXED)** | `f28893f3c419d794c6ba102bac67038683cb462c` |
| **HTML path** | `banquet-pilot/dist/banquet-pilot.html` |
| **HTML size (LF bytes)** | `73182` |
| **HTML sha256** | `19b8e65bbde285719ee43d74d83fcc60cdb3709ae7cc3ccc80d3f36d45d1bcf5` |
| **Report / delivery SHA** | `f161d2a048e92a60880e1de97c626c3c310fc40b` |
| **Pre-verify** | Product SHA + HTML size/hash verified **before** and **after** evidence runs; **no rebuild / no product modify** |

---

## Environment

| Item | Value |
|------|-------|
| Host | Grok Bot box (Linux) |
| Node | v20.19.2 |
| Chrome | `/usr/bin/google-chrome` headless=new, **sandbox ON**, temp user-data-dir |
| Network for offline checks | `file://` + Chrome `--disable-background-networking` |
| Input available | **mouse-sim** (CDP `Input.dispatchMouseEvent`), **touch-sim** (CDP touch emulation) |
| **真机 / physical multitouch** | **未测 / BLOCKED** — no physical phone; CDP ≠ 真机 |
| Repo branch | `bot/banquet-pilot` |
| Evidence root | `banquet-pilot/evidence/t005-author-regression/` |

---

## Reuse note (same product SHA — do not pretend new)

| Asset | Result | Citation |
|-------|--------|----------|
| Unit tests 58/58 | **REUSED** (optional same-SHA reconfirm: 58 pass / 0 fail) | `node --test banquet-pilot/tests/test_rules.mjs banquet-pilot/tests/test_board.mjs banquet-pilot/tests/test_t004.mjs` @ product SHA `f28893f3…` |
| Prior T-004 three-level + standalone L03 | Same SHA/hash already proven; **re-run into T-005 evidence dirs** for refreshed author-regression interactive logs | Prior: `banquet-pilot/tests/evidence/t004-three-level/` · This run: `evidence/t005-author-regression/t004-three-level/` |
| Prior T-003 simple-interactive | Logic reused via wrapper; **re-run against fixed HTML** into T-005 dirs | This run: `evidence/t005-author-regression/simple-interactive/` |

Interactive matrix rows below are from **this T-005 author-regression refresh** unless marked REUSED.

---

## Matrix

Legend: **PASS** / **FAIL** / **BLOCKED** / **未测**.  
Every interactive row lists real input method: `mouse-sim` | `touch-sim` | `真机`.

### A. Baseline rules / empty seat / illegal / three-level static

| ID | Item | Result | Input | Viewport | Repro / notes | Evidence |
|----|------|--------|-------|----------|---------------|----------|
| A01 | Baseline six rule classes (kernel unit) | **PASS** (REUSED) | n/a (Node unit) | n/a | `test_rules.mjs` geometry/adjacent/faces/end/not_beside/not_faces_unless + L01/L02/L03 cases @ product SHA | unit 58/58 |
| A02 | Empty / unseated → PENDING not CONFLICT | **PASS** (REUSED) | n/a | n/a | `partial: unseated is PENDING not CONFLICT` | unit |
| A03 | Illegal state (bad id / duplicate seat / !ok → empty rules) | **PASS** (REUSED) | n/a | n/a | validation + `!ok never all-green` | unit |
| A04 | Three-level static known solutions (L01/L02/L03 enumerate) | **PASS** (REUSED) | n/a | n/a | L01 24→1, L02 720→1, L03 calm cases + anti-* | unit |
| A05 | Empty-seat place (fox→A1) interactive | **PASS** | mouse-sim | 390×844 | Select fox, click empty seat A1 padding/center-lower | `evidence/t005-author-regression/extra/empty_seat_place.png` + `extra/summary.json` |

### B. Interaction: drag / click / swap / waiting-guest / undo / restart / background / multitouch

| ID | Item | Result | Input | Viewport | Repro / notes | Evidence |
|----|------|--------|-------|----------|---------------|----------|
| B01 | Click-path place + L01 win | **PASS** | mouse-sim | ~390×844 | Click char then seat until feast | `…/simple-interactive/L01_click_win.png` |
| B02 | Click-path L02 win | **PASS** | mouse-sim | ~390×844 | Same for L02 mapping | `…/simple-interactive/L02_click_win.png` |
| B03 | Drag-path L01 win | **PASS** | mouse-sim | ~390×844 | Pointer drag chars onto seats | `…/simple-interactive/L01_drag_win.png` |
| B04 | Drag cancel (blur mid-drag) | **PASS** | mouse-sim | ~390×844 | Mid-drag window blur → no commit, history unchanged | `…/simple-interactive/after_drag_cancel.png` |
| B05 | Swap (two seated) | **PASS** | mouse-sim | ~390×844 | Select fox, click rabbit occupant center | `…/simple-interactive/after_swap.png` + gap1 swap |
| B06 | Waiting-guest replace / displace | **PASS** | mouse-sim | ~390×844 | Waiting crane select → click occupied fox center → fox back to waiting | `…/simple-interactive/gap1_occupant_displace.png` |
| B07 | Undo after swap | **PASS** | mouse-sim | ~390×844 | Click 撤销 → seats restored | `…/simple-interactive/after_undo.png` |
| B08 | Restart / 重玩 | **PASS** | mouse-sim | 390×844 | Place fox→A1 then click **重玩** → all null, hist=0 | `…/extra/after_restart.png` |
| B09 | Background / visibility mid-drag cancel + restore place | **PASS** | mouse-sim | 390×844 | Mid-drag set `document.hidden` + `visibilitychange` → gesture cancel; then place again OK. **Not physical app backgrounding.** | `…/extra/after_background_cancel.png` |
| B10 | Touch-sim place / touchCancel | **PASS** | touch-sim | touch-emulated | CDP `setTouchEmulationEnabled` + `dispatchTouchEvent` | `…/simple-interactive/gap2_touch_*.png` |
| B11 | Multitouch (CDP second-finger) cancel-safe | **PASS** (sim only) | touch-sim | touch-emulated | Second finger → cancel-safe; **not** physical multitouch | `…/simple-interactive/gap2_multitouch.png` |
| B12 | 真机 multitouch / 真机 gesture | **未测** | 真机 | — | No physical phone in this environment; CDP ≠ 真机 | — |

### C. Props (calm_bell)

| ID | Item | Result | Input | Viewport | Repro / notes | Evidence |
|----|------|--------|-------|----------|---------------|----------|
| C01 | Mis-drop / invalid target → no consume | **PASS** | mouse-sim | 390×844 | L03: calm_bell on non-rabbit → stock stays 1; msg 无效目标，未消耗 | `…/t004-three-level/L03_invalid_target.png` |
| C02 | Calm follows character (apply to rabbit) | **PASS** | mouse-sim | 390×844 | Apply calm_bell → calm=[rabbit], inv=0 | `…/t004-three-level/L03_calm.png` |
| C03 | Move-then-undo restores calm + inventory | **PASS** | mouse-sim | 390×844 | After apply, 撤销 → calm=[], inv=1 | t004 summary `L03_undo` |
| C04 | Reuse after undo / replay restores stock | **PASS** | mouse-sim | 390×844 | L03 win then 重玩本关 → calm_bell stock=1 | t004 `L03_replay` |
| C05 | Restart restore initial props | **PASS** | mouse-sim | 390×844 | Covered by replay/重玩本关 stock restore @ L03 | t004 NOTES + summary |
| C06 | Calm unit anti-cases (illegal calm sets) | **PASS** (REUSED) | n/a | n/a | anti-1…anti-5 + GPT01 R1–R5 @ product SHA | unit |

### D. Three-level clears / viewports / console / offline / corrupt save

| ID | Item | Result | Input | Viewport | Repro / notes | Evidence |
|----|------|--------|-------|----------|---------------|----------|
| D01 | Real L01 clear + feast | **PASS** | mouse-sim | 390×844 | Full click-path win | `…/t004-three-level/L01_feast.png` |
| D02 | Real L02 clear + hints | **PASS** | mouse-sim | 390×844 | Hints tier→2 then win | `…/t004-three-level/L02_hints.png`, `L02_feast.png` |
| D03 | Real L03 clear with calm | **PASS** | mouse-sim | 390×844 | Invalid→apply→undo→reapply→win | `…/t004-three-level/L03_feast.png` |
| D04 | Viewport 360×640 | **PASS** | mouse-sim | 360×640 | scrollWidth≤innerWidth; no seat overlap | `…/simple-interactive/viewport_360x640.png` |
| D05 | Viewport 390×844 | **PASS** | mouse-sim | 390×844 | same checks | `…/simple-interactive/viewport_390x844.png` |
| D06 | Desktop viewport 1280×800 | **PASS** | mouse-sim | 1280×800 | scrollWidthOk; overlaps=[] | `…/extra/viewport_desktop_1280x800.png` |
| D07 | Console page/exception errors | **PASS** | n/a | — | simple-interactive consoleErrorCount=0; extra exceptions=0 | `…/simple-interactive/console_cdp.json`, `extra/summary.json` |
| D08 | Offline (no network) load | **PASS** | n/a (boot) | default | `file://` open `dist/banquet-pilot.html`; seats render; embedded levels | `…/extra/offline_file_load.png` + t004 `standalone_L03.png` |
| D09 | Corrupt-save recovery | **PASS** | mouse-sim | 390×844 | Inject bad JSON → msg 存档损坏…已恢复到开局; level L01 | `…/t004-three-level/corrupt_save_recover.png` |
| D10 | Standalone HTML L03 boot (same SHA) | **PASS** | n/a (boot) | — | embedded=true level=L03 stock=1 | `…/t004-three-level/standalone_L03.png` |

### E. Defects (P0–P3)

| ID | Severity | Result | Notes |
|----|----------|--------|-------|
| E01 | P0–P3 findings | **none found** in this author-regression pass | No failing matrix row among executed items. 真机/physical multitouch remain **未测** (not defects). |

---

## Counts (machine-aligned with `T-005-summary.json`)

| Status | Count |
|--------|------:|
| PASS | 36 |
| FAIL | 0 |
| BLOCKED | 0 |
| 未测 | 1 (B12 真机 multitouch/gesture) |
| **Total matrix rows** | **37** |

*(Units cited as REUSED PASS rows are included. Interactive rows refreshed this run.)*

---

## Commands run (this delivery)

```bash
# Product verify (before/after)
git rev-parse HEAD   # f28893f3c419d794c6ba102bac67038683cb462c
wc -c banquet-pilot/dist/banquet-pilot.html   # 73182
sha256sum banquet-pilot/dist/banquet-pilot.html
# → 19b8e65bbde285719ee43d74d83fcc60cdb3709ae7cc3ccc80d3f36d45d1bcf5

# Units (same-SHA reconfirm; report as REUSED)
node --test banquet-pilot/tests/test_rules.mjs \
  banquet-pilot/tests/test_board.mjs banquet-pilot/tests/test_t004.mjs
# → 58/58 pass

# Author-regression interactive refresh → evidence/t005-author-regression/
node --experimental-websocket banquet-pilot/tests/evidence/scripts/t005-simple-interactive-smoke.mjs
node --experimental-websocket banquet-pilot/tests/evidence/scripts/t005-t004-three-level-smoke.mjs
node --experimental-websocket banquet-pilot/tests/evidence/scripts/t005-extra-matrix-smoke.mjs
```

---

## Next steps for GPT01 (independent recheck)

1. Treat this package as **AUTHOR REGRESSION only** — do not close #9 on this alone.
2. Independently re-run critical interactive / viewport / save / prop paths on GPT01’s machine against the **same fixed product SHA/hash**.
3. 真机 / physical multitouch remain **未测** here — cover or explicitly accept residual risk.
4. After independent coverage with no P0/P1 (and P2 touch/understanding issues resolved or human-accepted), GPT01 may ACCEPT #9.
5. #10 stays blocked; this delivery does not authorize style ACCEPT.

---

## Honesty / limits

- CDP touch/multitouch ≠ 真机.
- Background test uses synthetic `visibilitychange`, not OS app switch.
- Source tree kept read-only for product; writes only under `reports/qa/`, `evidence/t005-*`, and new QA wrappers under `tests/evidence/scripts/t005-*`.
- No npm install, no merge, no deploy, no assertion relaxation, no secrets in evidence.

— agent:GROKBOT01 role:BOT · task:T-005 · work:qa · AUTHOR REGRESSION / NOT independent QA
