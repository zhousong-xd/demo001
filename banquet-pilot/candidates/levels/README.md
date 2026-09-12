# Banquet Pilot — level design candidates (T-007)

**Scope:** design-intent skeleton only under `banquet-pilot/candidates/levels/`.

**Not in scope:**

- Writing or overwriting formal `banquet-pilot/levels/*.json`
- Changing accepted product SHA `f28893f3c419d794c6ba102bac67038683cb462c`
- Touching `dist/` or gameplay `src/`
- Claiming “12 finished levels” or playable backlog completion
- Art batch expansion / formal asset import (needs style lock)

## What “12 candidates” means

Twelve **design slots** (C01–C12) describing teaching intent, rule focus, and open questions.  
C01–C03 **reference** the already-shipped L01–L03 product levels (frozen).  
C04–C12 are **stubs** for future design; they are not level JSON and are not solvable claims.

## Layout

```
banquet-pilot/candidates/levels/
  README.md          ← this file (scope / stop lines)
  CATALOG.md         ← index of C01–C12
  c01.md … c12.md    ← per-slot design intent
```

## Rule vocabulary (existing kernel only)

Candidates must stick to shipped kinds unless a future engineering task explicitly extends the kernel:

`at` · `not_beside` · `faces` · `end` · `same_row` · `not_faces_unless` (+ optional `calm` / calm_bell as in L03)

No new rule kinds in this folder.

## Stop lines

- Design docs ≠ playable levels.
- Do not copy these stubs into `levels/` without a separate, accepted engineering task.
- Do not expand art or import assets from this task.
