# Banquet Pilot — level design candidates

**Scope:** design-intent docs under `banquet-pilot/candidates/levels/`.

**T-008 (this slice):** fill **C01–C03** briefs only (learning goal, seats/guests/rules sketch, solution count **TBD**, tips outline, `ruleVersion` 0.1). C04–C12 remain stubs.

**Not in scope:**

- Writing or overwriting formal `banquet-pilot/levels/*.json`
- Changing accepted product SHA `f28893f3c419d794c6ba102bac67038683cb462c`
- Touching `dist/` or gameplay `src/`
- Claiming “12 finished levels” or playable backlog completion
- Inventing new rule kinds / props / geometry
- Art batch expansion / formal asset import (needs style lock)

## What “12 candidates” means

Twelve **design slots** (C01–C12).  
C01–C03 are **brief-filled shipped references** to L01–L03 (frozen product).  
C04–C12 are **stubs** for future design; they are not level JSON and are not solvable claims.

## Layout

```
banquet-pilot/candidates/levels/
  README.md          ← this file (scope / stop lines)
  CATALOG.md         ← index of C01–C12
  c01.md … c12.md    ← per-slot design intent / briefs
```

## Rule vocabulary (existing kernel only)

Candidates must stick to shipped kinds unless a future engineering task explicitly extends the kernel:

`at` · `not_beside` · `faces` · `end` · `same_row` · `not_faces_unless` (+ optional `calm` / calm_bell as in L03)

**ruleVersion:** `0.1` for all current candidates.  
No new rule kinds in this folder.

## Stop lines

- Design docs ≠ playable levels.
- Solution counts in briefs are **TBD** until enum.
- Do not copy these files into `levels/` without a separate, accepted engineering task.
- Do not expand art or import assets from this task.
