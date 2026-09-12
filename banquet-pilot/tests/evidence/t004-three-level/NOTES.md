# T-004 three-level evidence

- mouse-sim: yes (CDP Input.dispatchMouseEvent)
- touch-sim: no (this script)
- 真机未测
- standalone: banquet-pilot/dist/banquet-pilot.html size=68677 sha256=79001e426a8cc78327c16ac7d91e304919f6bdaf363e5d21052b924e3e11b3c1

## Log
- http=40391 cdp=33889
- L01 won=true feast=true
- advance L02
- hints tier=2
- L02 won=true
- L03 inventory={"calm_bell":1}
- invalid target stock=1 msg=安心铃只能对兔使用（无效目标，未消耗）
- calm applied {"calm":["rabbit"],"inv":{"calm_bell":0}}
- undo {"calm":[],"inv":{"calm_bell":1}}
- L03 won=true calm=rabbit
- replay stock=1
- corrupt recover level=L01 msg=存档损坏（JSON 无效） — 已恢复到开局。
- standalone embedded=true level=L03 stock=1
