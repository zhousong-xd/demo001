# T-034 候选 playtest UI mouse-sim 交换+顶替 独立复核 — NOTES

- Issue: #40 / T-034
- Agent: 宴席·质检 · role:BOT · work:qa
- Tip under test (engineering): `639368b18c4d1d33fea288e8fdfdb725d92e2df0`
- Product SHA (frozen, not modified): `f28893f3c419d794c6ba102bac67038683cb462c`
- Script reviewed then rerun: `banquet-pilot/tests/evidence/scripts/t033-playtest-ui-swap-displace.mjs`
- Script blob @ tip: `4f2fd64c594a0370b4b6afd043215edd1a62bc74` == worktree
- Host: Grok Bot box (Linux) · Node v20.19.2 · Chrome 151.0.7922.169 (headless=new CDP)
- Input: **mouse-sim**（CDP `Input.dispatchMouseEvent`）
- **真机 / 多指：未测**（CDP ≠ 真机；不得 PASS）
- 作者 T-033 自测 ≠ 本环独立验收

## 审读（先审后跑）
- 脚本覆盖两步：c02 已入座 fox↔rabbit 鼠标交换；c01 候客 rabbit 点已占 A1 顶替 fox
- 交换：clickChar(fox) → clickSeat(A2)（对方已入座座位）；断言 fox=A2 rabbit=A1
- 顶替：clickChar(rabbit 候客) → clickSeat(A1)；断言 rabbit=A1 fox=null（回候客）
- `__CANDIDATE_PLAYTEST__` snap + 截图 01–06；真机/多指显式未测
- 作者证据 `evidence/t033-playtest-ui-swap-displace/` 与 tip 一致；截图目视：02 fox@A1 rabbit@A2 → 03 互换；05 fox@A1 → 06 rabbit@A1 fox 候客
- 作者自测 ≠ 独检，故本环独立复跑同一脚本

## 独立复跑
- Command: `cd banquet-pilot && node --experimental-websocket tests/evidence/scripts/t033-playtest-ui-swap-displace.mjs`
- Window: 2026-09-12T07:08:16Z → 07:08:39Z UTC
- exit_code=0
- [PASS] mouse swap on c02: fox↔rabbit A1↔A2（fox=A2 rabbit=A1 seated=2 historyLen=3）
- [PASS] mouse displace on c01: rabbit takes A1, fox waiting（rabbit=A1 fox=null seated=1 historyLen=2）
- [未测] 真机 / 多指（CDP mouse-sim ≠ 真机）
- pageErrors=[]
- 抽检复跑截图与 snap 一致（见 shots/01–06）

## Dist freeze
- Pre/post: bytes=73182 sha256=19b8e65bbde285719ee43d74d83fcc60cdb3709ae7cc3ccc80d3f36d45d1bcf5 hasCR=false blob=c17208faa0548c34cb8cc150a5dc4bce96a61b9c == product blob
- `f28893f3..HEAD` 未改 `dist/` / `src/`
- 本环只写 reports/qa + evidence/t034-ui-swap-displace/；作者 t033 证据已还原，未改正式包

## Result: PASS (failures=none)

经验一行：试玩页换座/顶替鼠标操作在 headless CDP 下可独立复验且顺；真机触屏仍未测，正式包仍冻结。

— agent:宴席·质检 role:BOT · task:T-034 · issue:#40
