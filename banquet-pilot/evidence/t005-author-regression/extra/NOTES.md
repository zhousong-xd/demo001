# T-005 AUTHOR REGRESSION — extra matrix

**NOT independent QA.** Author-adjacent evidence only.

- productSha: f28893f3c419d794c6ba102bac67038683cb462c
- dist: 73182 / 19b8e65bbde285719ee43d74d83fcc60cdb3709ae7cc3ccc80d3f36d45d1bcf5
- mouse-sim: yes; touch-sim: no (this script); 真机: 未测

## Steps
- empty_seat_place: PASS 
- restart_reset: PASS 
- background_visibility_cancel: PASS visibilitychange mid-drag cancels gesture; not physical backgrounding
- post_background_restore_place: PASS 
- viewport_desktop_1280x800: PASS 
- console_errors_http_session: PASS 
- offline_file_load: PASS no network; Chrome --disable-background-networking + file://

## Log
- dist bytes=73182 sha256=19b8e65bbde285719ee43d74d83fcc60cdb3709ae7cc3ccc80d3f36d45d1bcf5
- http=36477 cdp=33255
- loaded http://127.0.0.1:36477/index.html
- empty-seat place fox→A1 ok=true
- reset ok=true hist=0 assign={"fox":null,"rabbit":null,"crane":null,"otter":null}
- background-visibility cancel ok=true fox=null gesture=false
- post-background restore place ok=true
- desktop 1280x800 ok=true {"innerWidth":1280,"innerHeight":800,"scrollWidth":1280,"scrollHeight":800,"scrollWidthOk":true,"seatCount":4,"overlaps":[]}
- console exceptions=0
- offline file:// seats=4 level=L01 embedded=true
