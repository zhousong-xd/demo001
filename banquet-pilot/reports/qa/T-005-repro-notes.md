# T-005 AUTHOR REGRESSION — repro notes (NOT independent QA)

Product FIXED at `f28893f3c419d794c6ba102bac67038683cb462c`  
HTML `banquet-pilot/dist/banquet-pilot.html` 73182 / `19b8e65bbde285719ee43d74d83fcc60cdb3709ae7cc3ccc80d3f36d45d1bcf5`  
**Do not rebuild.**

## Reproduce interactive author-regression evidence

From repo root on branch `bot/banquet-pilot`:

```bash
node --experimental-websocket banquet-pilot/tests/evidence/scripts/t005-simple-interactive-smoke.mjs
node --experimental-websocket banquet-pilot/tests/evidence/scripts/t005-t004-three-level-smoke.mjs
node --experimental-websocket banquet-pilot/tests/evidence/scripts/t005-extra-matrix-smoke.mjs
```

Outputs land in `banquet-pilot/evidence/t005-author-regression/{simple-interactive,t004-three-level,extra}/`.

## Units (reuse / same-SHA check)

```bash
node --test banquet-pilot/tests/test_rules.mjs banquet-pilot/tests/test_board.mjs banquet-pilot/tests/test_t004.mjs
```

## Limits

- 真机 / physical multitouch: 未测
- CDP touch ≠ 真机

— agent:GROKBOT01 role:BOT
