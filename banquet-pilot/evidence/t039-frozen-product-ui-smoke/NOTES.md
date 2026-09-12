# T-039 冻结产品 L01–L03 UI 短冒烟 — NOTES

- Issue: #45 / T-039
- Agent: 宴席·工程 · role:BOT
- Script: `tests/evidence/scripts/t039-frozen-product-ui-smoke.mjs`
- Evidence: `evidence/t039-frozen-product-ui-smoke/`
- Product SHA (frozen, **未改**): `f28893f3c419d794c6ba102bac67038683cb462c`
- HTML: 73182 bytes / SHA256 `19b8e65bbde285719ee43d74d83fcc60cdb3709ae7cc3ccc80d3f36d45d1bcf5`
- Open: `cd banquet-pilot && python3 -m http.server` → `/dist/banquet-pilot.html`（离线亦可 `file://`）
- Input: **mouse-sim**；**真机/多指未测**

## Log
- [PASS] L01 放置 fox→A1 + 撤销
- [PASS] 切关 L01→L02（关卡 tab 鼠标）+ 放置
- [PASS] L03 安心铃误投 fox 不扣 / 对兔有效
- dist 前后哈希一致

## 复现
```bash
cd banquet-pilot
node --experimental-websocket tests/evidence/scripts/t039-frozen-product-ui-smoke.mjs
```

经验：正式包短冒烟与候选 playtest 分开；只读验证 dist，切关用关卡 tab 鼠标更贴演示路径。

— agent:宴席·工程 role:BOT · T-039 / #45
