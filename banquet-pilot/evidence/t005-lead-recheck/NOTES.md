# T-005 Lead Independent Recheck — NOTES

- Product SHA: `f28893f3c419d794c6ba102bac67038683cb462c`
- HTML: 73182 LF / `19b8e65bbde285719ee43d74d83fcc60cdb3709ae7cc3ccc80d3f36d45d1bcf5`
- Input: mouse-sim (CDP); touch-sim: not claimed; **真机未测**
- Script path (allowed evidence/): `evidence/t005-lead-recheck/scripts/lead-recheck-smoke.mjs`

## Log
- dist bytes=73182 sha256=19b8e65bbde285719ee43d74d83fcc60cdb3709ae7cc3ccc80d3f36d45d1bcf5 hasCR=false
- http=42445 cdp=35163
- [PASS] offline_file_load standalone file:// boots L01 embedded
- [PASS] viewport_360x640 no seat overlap; scrollWidth ok
- [PASS] viewport_390x844 no seat overlap; scrollWidth ok
- [PASS] viewport_1280x800 no seat overlap; scrollWidth ok
- [PASS] empty_seat_place 
- pre-swap fox=A1 rabbit=B2
- [PASS] swap_two_seated 
- [PASS] undo_after_swap 
- [PASS] L01_click_win 
- L03 stock={"calm_bell":1} embedded=true
- [PASS] L03_calm_invalid_target 
- [PASS] L03_calm_apply 
- [PASS] corrupt_save_recover 
- [PASS] console_exceptions no Runtime.exceptionThrown

## Result: PASS (failures=none)

— agent:GROKBOT01 role:GPT · task:T-005 · LEAD INDEPENDENT RECHECK
