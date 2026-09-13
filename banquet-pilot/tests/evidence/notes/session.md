> **HISTORICAL / WEAK ISOLATION (pre staged-A):** This session was produced under non-isolated conditions: `--no-sandbox`, `cleanChildEnv` via `{...process.env}` then delete, fixed ports 8877/9333, http.server without `--bind 127.0.0.1`, shared DISPLAY possible. Retained as historical REJECT-fix proof only; **not** valid isolation evidence. See `notes/isolation-staged-A.md`.

# T-003 REJECT-fix 证据说明

- 输入标注:
  - **mouse-sim** = native-sim CDP Input.dispatchMouseEvent
  - **touch-sim-native** = native-sim CDP Input.dispatchTouchEvent
  - **touch-sim-js** = JS-synthesized PointerEvent（仅证处理器语义）
- touch-sim: **是**
- 真机: **未测**
- 视口: {"360x640":{"innerWidth":360,"innerHeight":640,"dpr":1},"390x844":{"innerWidth":390,"innerHeight":844,"dpr":1}}
- 路径: {"l01_click":"ok","l01_drag":"ok","swap_undo":"ok","displace":"ok","invalid_drop":"ok","same_seat":"ok","pointercancel_native":"ok","pointercancel_js":"ok","interrupt":"ok","listener_teardown":"ok","visibility_cancel":"ok","center_click_swap":"ok","center_click_displace":"ok","multitouch_gate":"ok-cancel-safe","gesture_gate_seat":"ok","touch_tap_drag":"ok","l02_drag":"ok","l02_click":"ok"}
- 控制台 error/exception: 0
- 隔离: 干净临时 Chrome profile；子进程 env 剥离 GH_TOKEN/GITHUB_TOKEN/PAT

## REJECT 修复对照
1. pointercancel 独立取消路径（不复用 onUp/commit）— `paths.pointercancel_native` / `pointercancel_js`
2. 幂等手势收尾（监听归零、无残留 ghost/capture）— `paths.listener_teardown` / `interrupt=ok`
3. 已选角色后点被占座位中心完成 swap/displace — `paths.center_click_*`
4. 多指门禁 — `paths.multitouch_gate` / `gesture_gate_seat`

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
- pointercancel touch-sim-native: fox=null hist=0 gesture=false ghost=false activeListeners=0 ok=true
- after cancel, normal drag fox->A1 ok; commits=1
- pointercancel JS-synthesized: fox=null hist=0 activeListeners=0 ok=true
- blur mid-drag: gesture=false ghost=false active=0 reg=3 unreg=3
- after 3 blur cycles: active=0 reg=9 unreg=9 fox=null
- listener teardown ok; one-op-one-commit commits=1
- visibility cancel ok
- pre-center-swap asg={"fox":"A1","rabbit":"A2","crane":null,"otter":null}
- center-click swap: fox=A2 rabbit=A1 hist=3
- center-click displace: crane=A1 fox=null
- multi-touch mid: gesture=false hist=0 (was 0) fox=null
- multi-touch complete: fox=null hist=0 active=0
- multi-touch: primary cancelled safely (no commit); acceptable gate behavior
- seat click gated during gesture ok
- touch-sim tap place fox=A1
- touch-sim drag otter=A2
- L02 drag-path won=true {"fox":"A1","rabbit":"B1","crane":"B3","otter":"A2","tanuki":"B2","hedgehog":"A3"}
- L02 click-path won=true
- console errors: 0

## Supplemental touch-native proofs
- A after touchStart: gesture=true active=3 reg=3
- A mid-drag: ghost=true gesture=true
- A after blur: active=0 reg=3 unreg=3 fox=null hist=0 match=true ok=true
- B mid: gesture=true active=3 ghost=true
- B after drop: fox=A1 commits=1 active=0 reg/unreg=6/6 ok=true
- C selected=crane
- C gesture active=true selected=crane hist=0
- C seat gate ok (no commit while gesture active)
- D after 2nd finger: hist=0 (was 0) fox=null gesture=false active=0
- D cancelled by stack: fox=null active=0
- E after cancel then drag: fox=A1 active=0
- multitouch mode: cancel-safe
- interrupt: **ok** (blur mid-drag, listeners 0, no commit)
- listener register/unregister matched after teardown
