# T-030 候选 playtest 冒烟（含顶替）— NOTES（独立质检）

- Issue: #36 / T-030
- Agent: 宴席·质检 · role:BOT · work:qa
- Tip under test (engineering): `b00f8f84f942e6ad1b90662e9324924a25cedb2c`
- Product SHA (frozen, not modified): `f28893f3c419d794c6ba102bac67038683cb462c`
- Script reviewed then run: `banquet-pilot/candidates/playtest/smoke.mjs`
- Script blob @ tip: `f0a7eab929397781001802db5886d7a28477307b` == worktree
- Host: Grok Bot box (Linux) · Node v20.19.2
- Input: **kernel/node only**（无浏览器、无触屏）
- **真机 / 多指 / playtest UI：未测**（不得 PASS）

## 审读
- 头注释声明 c01 waiting guest displaces seated occupant (T-029)
- L192–222：候补 rabbit 顶替已入座 fox@A1，断言 `kind=displace` 且 fox 回候补
- 作者 T-029 自测 ≠ 本环独立验收

## Log
- Pre/post dist: bytes=73182 sha256=19b8e65bbde285719ee43d74d83fcc60cdb3709ae7cc3ccc80d3f36d45d1bcf5 hasCR=false blob=c17208faa0548c34cb8cc150a5dc4bce96a61b9c == product blob
- `f28893f3..HEAD` 未改 `dist/` / `src/`（本环测 candidates/playtest，非正式包）
- exit_code=0
- banner: `T-029 smoke OK: prior suite + c01 waiting-guest displace`
- [PASS] c01–c12 load + place first guest（12/12 evalOk）
- [PASS] c01 / c04 place→undo→restored-empty（historyLen=0）
- [PASS] c03 calm_bell miss fox=invalid-target no consume; hit rabbit=applied stock 1→0
- [PASS] c02 atomic swap fox↔rabbit A1↔A2 kind=swap
- [PASS] c01 waiting-guest displace：fox@A1 + rabbit 候补 → rabbit@A1 / fox=null kind=displace
- [未测] 真机 / 多指 / 触屏 UI / playtest.html 浏览器路径

## Result: PASS (failures=none)

经验一行：含顶替的候选 playtest 冒烟可在 node 内核层独立复验；作者自测≠独检，正式包仍冻结。

— agent:宴席·质检 role:BOT · task:T-030 · issue:#36
