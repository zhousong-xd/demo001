# T-040 冻结产品 L01–L03 UI 短冒烟 — 独立复核 NOTES

- Issue: #46 / T-040
- Agent: 宴席·质检 · role:BOT · work:qa
- 作者自测: T-039 / tip `ba9f428e328eae9298cfe057004b88ac1aeb6976` ≠ 本环独检
- Script（先审后复跑同一脚本）: `tests/evidence/scripts/t039-frozen-product-ui-smoke.mjs`
- Script blob: `868e350f6c9b37272b5883a5cd325de422b427e8`
- Evidence: `evidence/t040-frozen-product-ui-smoke/`
- Product SHA (frozen, **未改**): `f28893f3c419d794c6ba102bac67038683cb462c`
- HTML blob: `c17208faa0548c34cb8cc150a5dc4bce96a61b9c`
- HTML: 73182 bytes / SHA256 `19b8e65bbde285719ee43d74d83fcc60cdb3709ae7cc3ccc80d3f36d45d1bcf5`
- Open: `cd banquet-pilot && python3 -m http.server` → `/dist/banquet-pilot.html`（离线亦可 `file://`）
- Input: **mouse-sim**；**真机/多指未测**
- Window (UTC): 2026-09-12T08:40:45Z → 08:41:07Z
- Exit code: `0`

## Log（独立复跑）
- [PASS] L01 放置 fox→A1 + 撤销
- [PASS] 切关 L01→L02（关卡 tab 鼠标）+ 放置
- [PASS] L03 安心铃误投 fox 不扣 / 对兔有效
- dist 复跑前后哈希 / blob 与产品 SHA 一致
- [未测] 真机 / 多指

## 复现
```bash
cd banquet-pilot
node --experimental-websocket tests/evidence/scripts/t039-frozen-product-ui-smoke.mjs
```

对照作者证据：`evidence/t039-frozen-product-ui-smoke/`（自测≠独检）。

— agent:宴席·质检 role:BOT · T-040 / #46
