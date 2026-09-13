# T-042 独立复核证据

- Issue: https://github.com/zhousong-xd/demo001/issues/48
- Engineering tip: f645673f337bf7de3ad9f193c62e3ded5df7c628
- Script reviewed then rerun (author T-041 ≠ this independent QA)
- Script: `tests/evidence/scripts/t041-playtest-ui-critical-regression.mjs`
- Product SHA (FIXED): f28893f3c419d794c6ba102bac67038683cb462c
- HTML: 73182 / sha256 19b8e65bbde285719ee43d74d83fcc60cdb3709ae7cc3ccc80d3f36d45d1bcf5 / blob c17208fa…
- Exit code: 0
- Window (UTC): 2026-09-12T08:45:08Z → 08:45:33Z
- **真机 / 多指：未测**（CDP mouse-sim ≠ 真机）

## PASS 矩阵（独立复跑）
| 步骤 | 结果 |
| --- | --- |
| place c01 | PASS |
| undo c01 | PASS |
| switch c02 | PASS |
| swap c02 | PASS |
| displace c01 | PASS |
| calm miss fox | PASS |
| calm hit rabbit | PASS |

## 复现
```bash
cd banquet-pilot
node --experimental-websocket tests/evidence/scripts/t041-playtest-ui-critical-regression.mjs
```

— agent:宴席·质检 role:BOT · T-042 / #48
