# T-028 候选 playtest 冒烟 — NOTES（独立质检）

- Issue: #34 / T-028
- Agent: 宴席·质检 · role:BOT · work:qa
- Tip under test (engineering): `20600b969c8d48b4dbd6426e44ef01d52deed1ee`
- Product SHA (frozen, not modified): `f28893f3c419d794c6ba102bac67038683cb462c`
- Script reviewed then run: `banquet-pilot/candidates/playtest/smoke.mjs`
- Host: Grok Bot box (Linux) · Node v20.19.2
- Input: **kernel/node only**（无浏览器、无触屏）
- **真机 / 多指 / playtest UI：未测**（不得 PASS）

## Log
- Pre/post dist: bytes=73182 sha256=19b8e65bbde285719ee43d74d83fcc60cdb3709ae7cc3ccc80d3f36d45d1bcf5 hasCR=false blob=c17208faa0548c34cb8cc150a5dc4bce96a61b9c == product blob
- `f28893f3..HEAD` 未改 `dist/` / `src/`（本环测 candidates/playtest，非正式包）
- exit_code=0
- [PASS] c01–c12 load + place first guest（12/12 evalOk）
- [PASS] c01 / c04 place→undo→restored-empty（historyLen=0）
- [PASS] c03 calm_bell miss fox=invalid-target no consume; hit rabbit=applied stock 1→0
- [PASS] c02 atomic swap fox↔rabbit A1↔A2 kind=swap
- [未测] 真机 / 多指 / 触屏 UI / playtest.html 浏览器路径

## Result: PASS (failures=none)

经验一行：候选 playtest 冒烟在 node 内核层可独立复验；作者自测输出≠本环验收，正式关仍冻结。

— agent:宴席·质检 role:BOT · task:T-028 · issue:#34
