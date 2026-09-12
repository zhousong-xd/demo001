# T-036 候选 playtest UI mouse-sim 安心铃 独立复核 — NOTES

- Issue: #42 / T-036
- Agent: 宴席·质检 · role:BOT · work:qa
- Tip under test (engineering): `8eb80bc89c8950543a47fbacc5da9ffaa2ac98f9`
- Product SHA (frozen, not modified): `f28893f3c419d794c6ba102bac67038683cb462c`
- Script reviewed then rerun: `banquet-pilot/tests/evidence/scripts/t035-playtest-ui-calm-bell.mjs`
- Script blob @ tip: `cd2ae52a794a65de2aea85d30c6ddbec137f938a` == worktree
- Host: Grok Bot box (Linux) · Node v20.19.2 · Chrome 151.0.7922.169 (headless=new CDP)
- Input: **mouse-sim**（CDP `Input.dispatchMouseEvent`）
- **真机 / 多指：未测**（CDP ≠ 真机；不得 PASS）
- 作者 T-035 自测 ≠ 本环独立验收

## 审读（先审后跑）
- 脚本覆盖两步：c03 点「安心铃」再点 fox（误投）→ 库存不扣；再点铃再点 rabbit → 库存 -1 且 calm 含 rabbit
- UI 路径：clickBellButton → clickChar(fox|rabbit)；断言 stock / calm / message
- `__CANDIDATE_PLAYTEST__` snap + 截图 01–04；真机/多指显式未测
- 作者证据 `evidence/t035-playtest-ui-calm-bell/` 与 tip 一致；截图目视：02 铃武装提示「无效不消耗」→ 03 误投狐「未消耗」仍×1 → 04 对兔生效×0 且兔标「安」
- 作者自测 ≠ 独检，故本环独立复跑同一脚本

## 独立复跑
- Command: `cd banquet-pilot && node --experimental-websocket tests/evidence/scripts/t035-playtest-ui-calm-bell.mjs`
- Window: 2026-09-12T07:40:25Z → 07:40:48Z UTC
- exit_code=0
- [PASS] mouse calm_bell miss on fox: stock unchanged（stock=1；message=安心铃：无效目标，未消耗…）
- [PASS] mouse calm_bell hit rabbit: stock-1 and calm（stock=0；calm=["rabbit"]；message=已对 兔 使用安心铃（候选））
- [未测] 真机 / 多指（CDP mouse-sim ≠ 真机）
- pageErrors=[]
- 抽检复跑截图与 snap 一致（见 shots/01–04）

## Dist freeze
- Pre/post: bytes=73182 sha256=19b8e65bbde285719ee43d74d83fcc60cdb3709ae7cc3ccc80d3f36d45d1bcf5 hasCR=false blob=c17208faa0548c34cb8cc150a5dc4bce96a61b9c == product blob
- `f28893f3..HEAD` 未改 `dist/` / `src/`
- 本环只写 reports/qa + evidence/t036-ui-calm-bell/；作者 t035 证据已还原，未改正式包

## Result: PASS (failures=none)

经验一行：试玩页安心铃鼠标路径顺——点错狐不扣、点兔生效且库存-1；真机触屏仍未测，正式包仍冻结。

— agent:宴席·质检 role:BOT · task:T-036 · issue:#42
