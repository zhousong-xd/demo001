# Banquet Pilot — 规则内核（T-002）

纯规则与三关数据。**没有 UI**。

**生产内核为原生 JavaScript（ESM）**，可用 Node 内置测试，也可在浏览器中直接 `import`（无需打包器）。Python 实现仅作参考，行为与 JS 对齐。

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

## 六种规则

| kind | 含义 |
| --- | --- |
| `at` | 指定座位 |
| `not_beside` | 不能同排紧挨 |
| `faces` | 必须面对面（异排同列） |
| `end` | 必须端位（按本关可用席） |
| `same_row` | 必须同排 |
| `not_faces_unless` | 无指定状态时不能对面；有状态则豁免 |

判定三态：`PENDING` / `SATISFIED` / `CONFLICT`。关系对象未入座 → `PENDING`（不是冲突，也不算通关满足）。

## Calm 校验（effective = explicit ∪ initial_calm）

- 每个 id 必须在 `characters` 中
- 若 `props` 为空/缺省，任何非空 calm 非法
- 每个 calm id 必须出现在某个 prop 的 `valid_targets`
- calm 数量不得超过可授予 calm 的 props 的 `stock` 之和（L03 stock=1 时两个 calm 失败）

关卡结构校验（`validateLevel`）：角色/座位/规则 id 唯一（重复报错，禁止静默覆盖）；规则 kind 仅六种；subject/other/seat 引用必须合法。`evaluateLevel` / `isWin` 按规则**列表**逐条判定，不按 id 覆盖。

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

## 浏览器复用

```js
import { isWin, evaluateLevel, validateLevel } from "./src/core/index.js";
// 或按需：
import { adjacent, faces } from "./src/core/geometry.js";
```

关卡为纯 JSON（`levels/*.json`）；无需 bundler 即可在支持 ESM 的页面中引用。Node 专用的 `loader.js`（fs）在浏览器中请改为 `fetch` / 静态 import JSON。

## 验收数字（静态枚举）

| 关卡 | 排列数 | 期望解数 |
| --- | --- | --- |
| L01 | 24 | 1 |
| L02 | 720 | 1 |
| L03 无铃 | 720 | 0 |
| L03 团团 calm | 720 | 1 |
| L03 其他五人分别 calm | 720 | 各 0 |

## 未包含

- 任何 UI / 拖拽 / 浏览器页面
- 依赖安装、构建系统、CI
- T-003 及后续交互与道具流程实现（本任务只提供规则与 calm 状态输入接口）
