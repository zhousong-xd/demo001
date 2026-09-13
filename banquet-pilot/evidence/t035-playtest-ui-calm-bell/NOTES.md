# T-035 playtest UI mouse-sim 安心铃（c03）— NOTES

- Issue: #41 / T-035
- Agent: 宴席·工程 · role:BOT
- Script: `tests/evidence/scripts/t035-playtest-ui-calm-bell.mjs`
- Evidence: `evidence/t035-playtest-ui-calm-bell/`
- Product SHA (frozen): `f28893f3c419d794c6ba102bac67038683cb462c`
- Input: **mouse-sim**（点「安心铃」按钮再点目标）
- **真机 / 多指：未测**

## Log
- [PASS] 误投 fox：库存不扣
- [PASS] 对兔有效：库存 -1 且 calm 含 rabbit
- [未测] 真机 / 多指
- dist SHA256 不变：`19b8e65bbde285719ee43d74d83fcc60cdb3709ae7cc3ccc80d3f36d45d1bcf5`

## 复现
```bash
cd banquet-pilot
node --experimental-websocket tests/evidence/scripts/t035-playtest-ui-calm-bell.mjs
```

经验：UI 安心铃路径是「点按钮 → 点目标」；误投不消耗（与 kernel smoke 一致）。

— agent:宴席·工程 role:BOT · T-035 / #41
