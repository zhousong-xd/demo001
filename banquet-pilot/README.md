# Banquet Pilot — 规则内核（T-002）

纯规则与三关数据。**没有 UI**。

**生产内核为原生 JavaScript（ESM）**，可用 Node 内置测试，也可在浏览器中直接 `import`（无需打包器）。Python 实现仅作参考，行为与 JS 对齐；生产以 JS 为准。

无第三方依赖：JS 仅 Node / 浏览器内置；Python 仅标准库。

## 目录

```
banquet-pilot/
  levels/          L01 / L02 / L03 JSON 关卡数据
  src/core/        几何、规则判定、校验、静态枚举
                   *.js = 生产内核（ESM）
                   *.py = 参考实现
  tests/           单元测试与枚举脚本（.mjs 生产 / .py 参考）
  README.md
```

## 公开入口

| 环境 | 入口 | 说明 |
| --- | --- | --- |
| 浏览器 | `./src/core/index.js` | geometry + rules + solver；**不含** `node:` 依赖 |
| Node 加载 JSON | `./src/core/loader.js` | 解析后调用 `validateLevel`，失败抛明确 Error |
| 规则 API | `./src/core/rules.js` | 可直接按需 import |

```js
// 浏览器（推荐）
import { isWin, evaluateLevel, validatePlayable } from "./src/core/index.js";

// Node 加载关卡 JSON
import { loadLevel } from "./src/core/loader.js";
import { evaluateLevel, isWin, validateLevel } from "./src/core/rules.js";
```

## 六种规则

| kind | 含义 |
| --- | --- |
| `at` | 指定座位 |
| `not_beside` | 不能同排紧挨 |
| `faces` | 必须面对面（异排同列） |
| `end` | 必须端位（按本关可用席） |
| `same_row` | 必须同排 |
| `not_faces_unless` | 无指定状态时不能对面；有状态则豁免 |

判定三态：`PENDING` / `SATISFIED` / `CONFLICT`。关系对象未入座（`null` / `undefined` / `''`）→ `PENDING`（不是冲突，也不算通关满足）。

## 统一校验：`validatePlayable`

唯一公开可玩校验入口：

1. `validateLevel`（配置非法即停止）
2. `resolveEffectiveCalm`（合并 explicit ∪ initial_calm，检查目标/库存）
3. `validateAssignment`（用 effectiveCalm）

返回 `{ ok, errors, effectiveCalm }`。`evaluateLevel` / `isWin` 复用同一路径，避免第二套校验。

`evaluateRule` 仅作已校验输入的低层函数；**UI 不得用它绕开公开评估入口**。

## `evaluateLevel` 结构化返回

始终同一形状，不混用「成功数组 / 失败对象」：

- 合法局面：`{ ok: true, errors: [], rules: [{ id, status }, ...] }`
- 非法配置或局面：`{ ok: false, errors: [...], rules: [] }`

非法输入**不会**返回 `SATISFIED`；合法但未坐满仍是 `ok: true`（相关规则 `PENDING`），`isWin` 为 `false`。

`isWin`：`evaluateLevel` 必须 `ok`，全员入座，且全部规则 `SATISFIED`。

## Calm / 结构校验要点

- 每个 calm id 必须在 `characters` 中
- 若 `props` 为空/缺省，任何非空 calm 非法
- 每个 calm id 必须出现在某个 prop 的 `valid_targets`（配置阶段校验**全部** targets，不论是否用到）
- calm 数量不得超过可授予 calm 的 props 的有效 `stock` 之和（L03 stock=1 时两个 calm 失败）
- `stock` 必须是 `typeof number && Number.isFinite && Number.isInteger && >= 0`（拒绝字符串 / NaN / 负数；不做 `Number()` 强转）
- `not_faces_unless.unless_state`：缺省 → 默认 `calm`；显式 `null` / `''` / 未知值（如 `sleepy`）拒绝；仅允许 `'calm'`
- 角色 / 座位 / `rules[].id` / `props[].id` 唯一；规则必填 `id`/`kind`/`subject`；`at` 需 `seat`；`not_beside`/`faces`/`same_row`/`not_faces_unless` 需 `other`

## 运行测试（生产 = JS）

在仓库根目录：

```bash
node --test banquet-pilot/tests/test_rules.mjs
node banquet-pilot/tests/enumerate_levels.mjs
```

参考（可选）：

```bash
python3 banquet-pilot/tests/test_rules.py
python3 banquet-pilot/tests/enumerate_levels.py
```

## 验收数字（静态枚举）

| 关卡 | 排列数 | 期望解数 |
| --- | --- | --- |
| L01 | 24 | 1 |
| L02 | 720 | 1 |
| L03 无铃 | 720 | 0 |
| L03 团团 calm | 720 | 1 |
| L03 其他五人分别 calm | 720 | 各 0 |

## 未包含

- 任何 UI / 拖拽 / 浏览器页面（真实浏览器未跑，仅静态模块图保证无 `node:`）
- 依赖安装、构建系统、CI
- T-003 及后续交互与道具流程实现（本任务只提供规则与 calm 状态输入接口）
