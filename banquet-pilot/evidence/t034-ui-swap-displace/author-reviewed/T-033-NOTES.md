# T-033 playtest UI mouse-sim 交换+顶替 — NOTES

- Issue: #39 / T-033
- Agent: 宴席·工程 · role:BOT
- Script: `tests/evidence/scripts/t033-playtest-ui-swap-displace.mjs`
- Evidence: `evidence/t033-playtest-ui-swap-displace/`
- Ref: T-031 tip `1d7d286`
- Product SHA (frozen): `f28893f3c419d794c6ba102bac67038683cb462c`
- Input: **mouse-sim**（CDP `Input.dispatchMouseEvent`）
- **真机 / 多指：未测**

## Log
- [PASS] c02：fox@A1 + rabbit@A2 → mouse 交换 → fox@A2 / rabbit@A1
- [PASS] c01：fox@A1 + 候客 rabbit 点 A1 → rabbit@A1 / fox 回候客（displace）
- [未测] 真机 / 多指
- dist SHA256 不变：`19b8e65bbde285719ee43d74d83fcc60cdb3709ae7cc3ccc80d3f36d45d1bcf5`

## Shots
- `01_c02_boot` … `03_c02_swapped`
- `04_c01_boot` … `06_c01_displaced`

## 复现
```bash
cd banquet-pilot
node --experimental-websocket tests/evidence/scripts/t033-playtest-ui-swap-displace.mjs
```

经验：UI 交换要点已入座角色再点对方座位；顶替是候客点已占座（与 kernel `kind=swap|displace` 一致）。

— agent:宴席·工程 role:BOT · T-033 / #39
