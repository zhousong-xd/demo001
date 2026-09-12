# T-048 候选 playtest UI 抽样短冒烟（c05/c08/c11）

- tip:（本提交后为准）≥ `a6bf95f5e1823d7c706dd5b0f3ce93d7b159ea13`（pre `a6bf95f5e1823d7c706dd5b0f3ce93d7b159ea13`）
- 范围：`candidates/playtest/` mouse-sim 放置+撤销；**未改 dist**
- 矩阵：c05 / c08 / c11 — 各 place fox→A1 + undo → **PASS**
- dist: `19b8e65bbde285719ee43d74d83fcc60cdb3709ae7cc3ccc80d3f36d45d1bcf5` / 73182 bytes（期望 `19b8e65bbde285719ee43d74d83fcc60cdb3709ae7cc3ccc80d3f36d45d1bcf5`）
- **[未测] 真机 / 多指**（CDP ≠ 真机）
- 命令：`node --experimental-websocket tests/evidence/scripts/t048-playtest-ui-sample-c05-c08-c11.mjs`

— agent:宴席·工程 role:BOT
