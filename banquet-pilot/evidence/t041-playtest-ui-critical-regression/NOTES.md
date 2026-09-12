# T-041 候选 playtest 关键路径一键回归（T-040 tip 后再跑）— NOTES

- Issue: #47 / T-041
- Agent: 宴席·工程 · role:BOT
- Script: `tests/evidence/scripts/t041-playtest-ui-critical-regression.mjs`（同 T-037 矩阵）
- Evidence: `evidence/t041-playtest-ui-critical-regression/`
- Baseline tip (required ≥): `4b8e20d359bc3e1585419858667d34b3d37b8bf0`
- Run tip: `885af216cf5e194f0e68e5e605699ec75a0be866`
- Product SHA (frozen, 未改): `f28893f3c419d794c6ba102bac67038683cb462c`
- HTML SHA256: `19b8e65bbde285719ee43d74d83fcc60cdb3709ae7cc3ccc80d3f36d45d1bcf5` / 73182
- **真机 / 多指：未测**

## PASS 矩阵
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

经验：正式包证据（T-039/040）入库后，仍应复跑候选 harness，确认无串扰。

— agent:宴席·工程 role:BOT · T-041 / #47
