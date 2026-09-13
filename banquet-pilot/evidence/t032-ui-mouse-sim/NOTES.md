# T-032 候选 playtest UI mouse-sim 独立复核 — NOTES

- Issue: #38 / T-032
- Agent: 宴席·质检 · role:BOT · work:qa
- Tip under test (engineering): `1d7d2860fecfdeb1b866653149a0ef6be85cb9a3`
- Product SHA (frozen, not modified): `f28893f3c419d794c6ba102bac67038683cb462c`
- Script reviewed then rerun: `banquet-pilot/tests/evidence/scripts/t031-playtest-ui-smoke.mjs`
- Script blob @ tip: `9813ccc216aa222ec7a667589a296af8594ed1b9` == worktree
- Host: Grok Bot box (Linux) · Node v20.19.2 · Chrome 151.0.7922.169 (headless=new CDP)
- Input: **mouse-sim**（CDP `Input.dispatchMouseEvent`）；切关=鼠标聚焦 select + change（headless 下拉不可靠）
- **真机 / 多指：未测**（CDP ≠ 真机；不得 PASS）
- 作者 T-031 自测 ≠ 本环独立验收

## 审读（先审后跑）
- 脚本覆盖三步：c01 候客 fox 鼠标点选→A1；点「撤销」恢复空桌；切到 c02 不空白 / URL `?c=c02`
- 放置/撤销：真实 `Input.dispatchMouseEvent` press+release（候客 `.char[data-char]`、座位 `.seat[data-seat]`、按钮「撤销」）
- 切关：mouse click 聚焦 `.cand-pick select`，再 `s.value=id` + `change` Event。作者已写明 headless `<select>` 原生下拉不可靠。本环按同一脚本复跑，不另造切关路径。
- `__CANDIDATE_PLAYTEST__` snap 断言 assignment / historyLen / fileId / URL；截图 01–04
- 作者证据 `evidence/t031-playtest-ui-smoke/` 与 tip 一致；截图目视：01 空桌 0/4、02 狐@A1 1/4、03 撤销空桌、04 C02 六座六候客
- 作者自测 ≠ 独检，故本环独立复跑同一脚本

## 独立复跑
- Command: `cd banquet-pilot && node --experimental-websocket tests/evidence/scripts/t031-playtest-ui-smoke.mjs`
- Window: 2026-09-12T06:44:39Z → 06:45:01Z UTC
- exit_code=0
- [PASS] mouse place fox→A1 on c01（assignment.fox=A1 seated=1 historyLen=1）
- [PASS] mouse undo restores empty board（seated=0 historyLen=0）
- [PASS] switch c01→c02 not blank; url ?c=c02（fileId=c02 levelId=C02 title=隔桌也算陪伴 seated=0/6）
- [未测] 真机 / 多指（CDP mouse-sim ≠ 真机）
- pageErrors=[]
- 抽检复跑截图与 snap 一致（见 shots/01–04）

## Dist freeze
- Pre/post: bytes=73182 sha256=19b8e65bbde285719ee43d74d83fcc60cdb3709ae7cc3ccc80d3f36d45d1bcf5 hasCR=false blob=c17208faa0548c34cb8cc150a5dc4bce96a61b9c == product blob
- `f28893f3..HEAD` 未改 `dist/` / `src/`
- 本环只写 reports/qa + evidence/t032-ui-mouse-sim/；作者 t031 证据已还原，未改正式包

## Result: PASS (failures=none)

经验一行：候选试玩页鼠标点放置/撤销可独立复验；切关在 headless 走 mouse-focus+change，真机/多指仍未测。

— agent:宴席·质检 role:BOT · task:T-032 · issue:#38
