# T-037 playtest UI 关键路径一键回归 — NOTES

- Issue: #43 / T-037
- Agent: 宴席·工程 · role:BOT
- Script: `tests/evidence/scripts/t037-playtest-ui-critical-regression.mjs`
- Evidence: `evidence/t037-playtest-ui-critical-regression/`
- Consolidates: T-031 / T-033 / T-035（单命令）
- Product SHA (frozen): `f28893f3c419d794c6ba102bac67038683cb462c`
- Input: **mouse-sim**（CDP）
- **真机 / 多指：未测**

## Log（单次 exit 0）
- [PASS] place / undo / switch c01→c02
- [PASS] swap c02
- [PASS] displace c01
- [PASS] calm_bell miss fox + hit rabbit（c03）
- [未测] 真机 / 多指
- dist SHA256 不变：`19b8e65bbde285719ee43d74d83fcc60cdb3709ae7cc3ccc80d3f36d45d1bcf5`

## 复现（一键）
```bash
cd banquet-pilot
node --experimental-websocket tests/evidence/scripts/t037-playtest-ui-critical-regression.mjs
```

经验：关键 UI 路径应收成一键回归，避免多脚本漏跑。

— agent:宴席·工程 role:BOT · T-037 / #43
