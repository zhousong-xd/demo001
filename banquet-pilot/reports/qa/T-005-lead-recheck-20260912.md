# T-005 Lead Independent Recheck — ACCEPT package

> **LEAD INDEPENDENT RECHECK** (human transferred ACCEPT authority; GPT01 paused)  
> Executor: GROKBOT01 acting as **role:GPT** for this recheck only.  
> Author package `5643426367` is evidence input — **not** acceptance by itself.  
> This document is the independent recheck + gate decision.

---

## Versions

| Role | Value |
|------|-------|
| **Product under test (FIXED)** | `f28893f3c419d794c6ba102bac67038683cb462c` |
| **HTML path** | `banquet-pilot/dist/banquet-pilot.html` |
| **HTML size (LF bytes)** | `73182` |
| **HTML sha256** | `19b8e65bbde285719ee43d74d83fcc60cdb3709ae7cc3ccc80d3f36d45d1bcf5` |
| **Author tip (pre-recheck)** | `780373a26862c54e72bfbcba5c198cc4cd070128` |
| **Author evidence package** | `ff71a7aa1d642bb5439aae90307176413cc49938` |
| **Lead recheck report SHA** | *(this commit after push)* |
| **Product modified / rebuilt** | **NO** — verified before & after |

---

## 1. Product tree verification

| Check | Result |
|-------|--------|
| `git fetch`; tip still `780373a…` before lead files | PASS |
| HTML @ HEAD == HTML @ product SHA (bytes + sha256) | PASS (73182 / `19b8e65…`) |
| LF-only (no CR) | PASS |
| Diff `f28893f3..780373a` excluding reports/evidence | **SCOPE FINDING** (see §2) — product `dist/` / `src/` **unchanged** |
| Report commits altered product/HTML | **NO** |

---

## 2. Scope finding (author package) — for lead note

DECIDE `5643375947` allowed writes under `banquet-pilot/reports/qa/` and `banquet-pilot/evidence/`.

Author delivery also added:

- `banquet-pilot/tests/evidence/scripts/t005-simple-interactive-smoke.mjs`
- `banquet-pilot/tests/evidence/scripts/t005-t004-three-level-smoke.mjs`
- `banquet-pilot/tests/evidence/scripts/t005-extra-matrix-smoke.mjs`

**Finding:** QA wrapper scripts landed under `tests/evidence/scripts/` (outside the strict allowed report dirs).  
**Action this recheck:** **documented only — not deleted**. Product HTML/kernel untouched. Lead recheck scripts placed under allowed `banquet-pilot/evidence/t005-lead-recheck/scripts/`.

---

## 3. Environment (this recheck)

| Item | Value |
|------|-------|
| Host | Grok Bot box (Linux) |
| Node | v20.19.2 |
| Chrome | `/usr/bin/google-chrome` 151.0.7922.169 headless=new, sandbox ON |
| Input | **mouse-sim** (CDP `Input.dispatchMouseEvent`) |
| touch-sim | not claimed in this recheck |
| **真机** | **未测** (no physical phone; CDP ≠ 真机) |
| Branch | `bot/banquet-pilot` |
| Evidence | `banquet-pilot/evidence/t005-lead-recheck/` |

---

## 4. Independent execution

### 4.1 Units @ product SHA (58)

```bash
node --test banquet-pilot/tests/test_rules.mjs \
  banquet-pilot/tests/test_board.mjs banquet-pilot/tests/test_t004.mjs
```

**Result: 58 pass / 0 fail** (independent reconfirm at unchanged product tree).

### 4.2 Gap browser checks (GPT01 DECIDE gaps)

Script (allowed dir):

```bash
node --experimental-websocket \
  banquet-pilot/evidence/t005-lead-recheck/scripts/lead-recheck-smoke.mjs
```

| ID | Item | Result | Input | Notes / evidence |
|----|------|--------|-------|------------------|
| R01 | Offline `file://` load FIXED HTML | **PASS** | boot | embedded L01; `shots/offline_file_L01.png` |
| R02 | Viewport 360×640 | **PASS** | layout | scrollWidthOk; overlaps=[]; `shots/viewport_360x640.png` |
| R03 | Viewport 390×844 | **PASS** | layout | same; `shots/viewport_390x844.png` |
| R04 | Viewport 1280×800 | **PASS** | layout | same; `shots/viewport_1280x800.png` |
| R05 | Empty-seat place | **PASS** | mouse-sim | fox→A1; `shots/empty_seat_place.png` |
| R06 | Swap two seated | **PASS** | mouse-sim | fox↔rabbit; `shots/after_swap.png` |
| R07 | Undo after swap | **PASS** | mouse-sim | restored; `shots/after_undo.png` |
| R08 | L01 click-path win + feast | **PASS** | mouse-sim | `shots/L01_feast.png` |
| R09 | L03 calm invalid target (no consume) | **PASS** | mouse-sim | msg 无效目标，未消耗; stock=1; `shots/L03_invalid_calm.png` |
| R10 | L03 calm apply to rabbit | **PASS** | mouse-sim | calm=[rabbit], stock=0; `shots/L03_calm_apply.png` |
| R11 | Corrupt-save recovery | **PASS** | reload | msg 存档损坏…已恢复到开局; all waiting; `shots/corrupt_save_recover.png` |
| R12 | Console exceptions | **PASS** | n/a | exceptionCount=0 |
| R13 | 真机 / physical multitouch | **未测** | 真机 | residual risk explicitly accepted for gate |

Machine summary: `banquet-pilot/evidence/t005-lead-recheck/summary.json` · NOTES: `…/NOTES.md`.

Author matrix PASS rows were **reviewed** and used as secondary evidence; interactive gap rows above were **independently re-executed** (not copy-paste of author screenshots).

---

## 5. Defects

| Severity | Findings |
|----------|----------|
| P0 | none |
| P1 | none |
| P2 (understanding/touch) | none found in executed scope |
| P3 | none |
| Scope hygiene | scripts under `tests/evidence/scripts/t005-*` (author) — document only |

---

## 6. Gate decision

Gate criteria:

- no P0/P1 → **met**
- understanding/touch P2 fixed or human-accepted → **N/A (none)**
- 真机 remains 未测 → **OK** (explicit)

**VERDICT: ACCEPT** as role:GPT for T-005 / #9 against fixed product SHA `f28893f3c419d794c6ba102bac67038683cb462c`.

Guidance:

- Close / label #9 **status:done** after this ACCEPT comment.
- Do **not** merge PR #11 from this comment alone if human prefers separate merge step; product SHA remains the engineering baseline.
- **#10 stays blocked** — style ACCEPT not authorized by T-005.
- Do not start #10 from this recheck.

---

## Honesty / limits

- CDP mouse-sim ≠ 真机; physical multitouch **未测**.
- Background/OS app-switch not re-claimed here (author synthetic visibility noted).
- No product rebuild; no assertion relaxation; no secrets in evidence.
- Lead scripts live under `evidence/t005-lead-recheck/` (allowed).

— agent:GROKBOT01 role:GPT · task:T-005 · LEAD INDEPENDENT RECHECK · ACCEPT
