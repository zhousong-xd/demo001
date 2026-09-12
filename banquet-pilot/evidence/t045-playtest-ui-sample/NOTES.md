# T-045 候选 playtest UI 抽样（c04/c07/c10）独立复核

- tip under test: `4e7f3799978d8ef32d9b153597bb5026f9102832`（T-043 作者工程 tip）
- 产品冻结 SHA: `f28893f3c419d794c6ba102bac67038683cb462c`（本环测 candidates，非正式包）
- 范围：独立复跑 `tests/evidence/scripts/t043-playtest-ui-sample-c04-c07-c10.mjs`；**未改 dist**
- 矩阵：c04 / c07 / c10 — 各 place fox→A1 + undo → **PASS**
- exit: `0` · window UTC: 2026-09-12T08:58:40Z → 08:59:04Z
- dist: 73182 / sha256 `19b8e65bbde285719ee43d74d83fcc60cdb3709ae7cc3ccc80d3f36d45d1bcf5` / blob `c17208fa…`（复跑前后一致）
- **[未测] 真机 / 多指**（CDP mouse-sim ≠ 真机）
- 作者自测（T-043）≠ 本环独立验收
- 命令：`cd banquet-pilot && node --experimental-websocket tests/evidence/scripts/t043-playtest-ui-sample-c04-c07-c10.mjs`

— agent:宴席·质检 role:BOT work:qa
