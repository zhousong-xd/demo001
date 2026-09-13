# T-020 Short Smoke — NOTES

- Product SHA: `f28893f3c419d794c6ba102bac67038683cb462c`
- HTML: 73182 LF / `19b8e65bbde285719ee43d74d83fcc60cdb3709ae7cc3ccc80d3f36d45d1bcf5`
- Input: mouse-sim (CDP); touch-sim: not claimed; **真机未测** / **多指未测**
- Script: `evidence/t020-short-smoke/scripts/t020-short-smoke.mjs`
- Product under test: frozen `dist/banquet-pilot.html` (standalone)

## Log
- dist bytes=73182 sha256=19b8e65bbde285719ee43d74d83fcc60cdb3709ae7cc3ccc80d3f36d45d1bcf5 hasCR=false
- http=44619 cdp=39153
- [PASS] L01_boot_standalone frozen dist boots L01 embedded
- [PASS] L01_click_win 通关路径：fox/otter/crane/rabbit → A1/A2/B1/B2 + 开席
- L03 stock={"calm_bell":1} embedded=true level=L03
- [PASS] L03_calm_invalid_no_consume 误投狐：库存仍为 1，提示无效
- [PASS] L03_calm_apply_rabbit 对兔有效：calm=[rabbit]，库存 0
- [未测] real_device_multitouch 无实体机；CDP mouse-sim ≠ 真机/多指。不得 PASS。

## Result: PASS (failures=none)

— agent:宴席·质检 role:BOT · task:T-020 · SHORT SMOKE · issue:#26
