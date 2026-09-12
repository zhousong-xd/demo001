# Banquet Pilot — level design candidates

**Scope:** design-intent docs under `banquet-pilot/candidates/levels/`.

**T-008:** filled **C01–C03** briefs (learning goal, seats/guests/rules sketch, tips, `ruleVersion` 0.1).  
**T-009:** machine-checkable candidate JSON drafts (`c01.json`–`c03.json`) + enum under `candidates/` only; briefs TBD→actual counts.  
**T-010:** filled **C04–C06** design briefs from #4 game-design baseline §13 (fewer fixed seats / multiple ends / two face pairs — **intent only**).  
**T-011:** machine-checkable candidate JSON drafts (`c04.json`–`c06.json`) + enum; briefs TBD→actual counts (multi-solution OK).  
**T-012:** filled **C07–C09** design briefs from baseline §13 (item target choice / encourage undo / multiple legal solutions — **intent only**).  
**T-013 (this slice):** machine-checkable candidate JSON drafts (`c07.json`–`c09.json`) + enum; briefs TBD→actual counts (multi-solution OK). C10–C12 remain stubs.

**Not in scope:**

- Writing or overwriting formal `banquet-pilot/levels/*.json`
- Changing accepted product SHA `f28893f3c419d794c6ba102bac67038683cb462c`
- Touching `dist/` or gameplay `src/`
- Claiming “12 finished levels” or playable backlog completion
- Inventing new rule kinds / props / geometry
- Inventing solution counts for C10–C12
- Art batch expansion / formal asset import (needs style lock)

## What “12 candidates” means

Twelve **design slots** (C01–C12).  
C01–C03 are **brief+enum shipped references** to L01–L03 (frozen product); JSON drafts live here only.  
C04–C06 are **brief+enum** (baseline §13 #04–#06); JSON drafts + exact counts live here only — not formal levels.  
C07–C09 are **brief+enum** (baseline §13 #07–#09); JSON drafts + exact counts live here only — not formal levels.  
C10–C12 are **stubs** for future design.

## Layout

```
banquet-pilot/candidates/levels/
  README.md                  ← this file (scope / stop lines)
  CATALOG.md                 ← index of C01–C12
  c01.md … c12.md            ← per-slot design intent / briefs
  c01.json … c09.json        ← machine-checkable candidate drafts (not formal levels/)
  enumerate_candidates.py    ← enum against candidates/ only (adapted; no product edit)
  enumerate_candidates.mjs   ← JS twin
```

## Rule vocabulary (existing kernel only)

Candidates must stick to shipped kinds unless a future engineering task explicitly extends the kernel:

`at` · `not_beside` · `faces` · `end` · `same_row` · `not_faces_unless` (+ optional `calm` / calm_bell as in L03)

**ruleVersion:** `0.1` for all current candidates.  
No new rule kinds in this folder.

## Stop lines

- Design docs ≠ playable levels.
- C01–C09 solution counts filled by T-009 / T-011 / T-013 enum; C10–C12 remain **TBD**.
- Do not copy these files into `levels/` without a separate, accepted engineering task.
- Do not expand art or import assets from this task.
