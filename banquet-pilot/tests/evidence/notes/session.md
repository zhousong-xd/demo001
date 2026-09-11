# T-003 证据说明

- 输入标注: **mouse-sim**（CDP Input.dispatchMouseEvent）
- touch-sim: 否
- 真机: **未测**
- 视口: {"360x640":{"innerWidth":360,"innerHeight":640,"dpr":1},"390x844":{"innerWidth":390,"innerHeight":844,"dpr":1}}
- 路径: {"l01_click":"ok","l01_drag":"ok","swap_undo":"ok","displace":"ok","invalid_drop":"ok","same_seat":"ok","interrupt":"attempted","l02_drag":"ok","l02_click":"ok"}
- 控制台 error/exception: 0

## 操作笔记
- viewport 360x640: {"innerWidth":360,"innerHeight":640,"dpr":1}
- overflow 360x640: false
- viewport 390x844: {"innerWidth":390,"innerHeight":844,"dpr":1}
- overflow 390x844: false
- L01 click-path won=true asg={"fox":"A1","rabbit":"B2","crane":"B1","otter":"A2"}
- L01 drag-path won=true
- swap: fox=A2 rabbit=A1
- undo after swap: {"fox":"A1","rabbit":"A2","crane":null,"otter":null}
- displace: crane=A1 fox=null
- invalid drop history 2 -> 2
- same-seat history 0 -> 0
- interrupt gesture exercised (visibility/blur); see notes
- L02 drag-path won=true {"fox":"A1","rabbit":"B1","crane":"B3","otter":"A2","tanuki":"B2","hedgehog":"A3"}
- L02 click-path won=true
- console errors: 0

- interrupt(blur mid-drag then release on seat): **ok** — fox仍候客, history=0
