# 输入事件标注

| 标签 | 来源 | 用途 |
|---|---|---|
| mouse-sim | CDP `Input.dispatchMouseEvent` | 原生模拟鼠标 |
| touch-sim-native | CDP `Input.dispatchTouchEvent` | 原生模拟触控（含 touchCancel） |
| touch-sim-js | `new PointerEvent(...)` | 仅证明处理器对 pointercancel 的语义 |
| 真机 | — | **未测** |
