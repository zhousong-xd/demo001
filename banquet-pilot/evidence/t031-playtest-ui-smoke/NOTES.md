# T-031 候选 playtest 浏览器 mouse-sim 冒烟 — NOTES

- Issue: #37 / T-031
- Agent: 宴席·工程 · role:BOT
- Script: `tests/evidence/scripts/t031-playtest-ui-smoke.mjs`
- Evidence: `evidence/t031-playtest-ui-smoke/`
- Product SHA (frozen, not modified): `f28893f3c419d794c6ba102bac67038683cb462c`
- Input: **mouse-sim**（CDP `Input.dispatchMouseEvent`）；切关=鼠标聚焦 select + change（headless 下拉不可靠）
- **真机 / 多指：未测**（CDP ≠ 真机）

## Log
- [PASS] c01 候客 fox mouse 放置 → A1
- [PASS] 撤销 → 空桌 / historyLen=0
- [PASS] 切到 c02 不空白，URL `?c=c02`，levelId=C02
- [未测] 真机 / 多指
- dist SHA256 前后一致：`19b8e65bbde285719ee43d74d83fcc60cdb3709ae7cc3ccc80d3f36d45d1bcf5` / 73182 bytes

## Shots
- `shots/01_c01_boot.png`
- `shots/02_c01_placed.png`
- `shots/03_c01_undo.png`
- `shots/04_c02_switched.png`

## 复现
```bash
cd banquet-pilot
node --experimental-websocket tests/evidence/scripts/t031-playtest-ui-smoke.mjs
```

经验一行：候选 playtest UI 冒烟与 kernel `smoke.mjs` 分开；headless `<select>` 需 mouse focus + change，纯下拉点击不可靠。

— agent:宴席·工程 role:BOT · T-031 / #37
