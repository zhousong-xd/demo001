# Banquet Pilot — 规则内核 + 交互灰盒

**生产内核为原生 JavaScript（ESM）**。T-002：纯规则；T-003：L01/L02 可操作手机灰盒（占位图形）。

无第三方依赖：JS 仅 Node / 浏览器内置；Python 仅标准库（参考实现）。

## 目录

```
banquet-pilot/
  index.html       灰盒入口（需本地静态服务器）
  levels/          L01 / L02 / L03 JSON
  src/core/        几何、规则、校验、枚举（*.js 生产 / *.py 参考）
  src/ui/          T-003 灰盒：board 状态机 + 渲染/输入
  tests/           单元测试与 evidence/
  README.md
```

## 浏览器灰盒（T-003）

在 `banquet-pilot/` 目录启动静态服务后打开 `index.html`：

```bash
cd banquet-pilot
python3 -m http.server 8760
# 浏览器打开 http://127.0.0.1:8760/
```

- 关卡切换 L01 / L02；初始全员在候客区
- 拖拽入座；或先点角色再点座位
- 空座移动；两入座原子交换；候客挤占 → 原住回候客
- 无效落点 / 原座点击不入撤销；后台中断取消未完成手势
- 规则三态：○待定 / ✓满足 / ✗冲突（符号+文本）；可点规则关联高亮
- 通关：`isWin`（`evaluateLevel.ok` 且全员入座且全部 `SATISFIED`）
- UI **只**通过 `evaluateLevel` / `isWin` 评估，不调用 `evaluateRule` 绕开内核

## 公开内核入口

| 环境 | 入口 | 说明 |
| --- | --- | --- |
| 浏览器 | `./src/core/index.js` | geometry + rules + solver；**不含** `node:` |
| Node 加载 JSON | `./src/core/loader.js` | 含 `node:fs` |
| 灰盒 board | `./src/ui/board.js` | 纯状态，可单测 |

## 运行测试

仓库根目录：

```bash
node --test banquet-pilot/tests/test_rules.mjs banquet-pilot/tests/test_board.mjs
node banquet-pilot/tests/enumerate_levels.mjs
```

## 验收数字（静态枚举）

| 关卡 | 排列数 | 期望解数 |
| --- | --- | --- |
| L01 | 24 | 1 |
| L02 | 720 | 1 |
| L03 无铃 | 720 | 0 |
| L03 团团 calm | 720 | 1 |

## 未包含

- 道具 / calm 流程（#8）、素材生成、新规则
- npm 依赖、打包器、CI、公开部署
- 真机触屏（证据中标注「未测」）
