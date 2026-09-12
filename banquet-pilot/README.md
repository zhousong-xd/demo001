# Banquet Pilot — 规则内核 + 交互灰盒

**生产内核为原生 JavaScript（ESM）**。T-002：纯规则；T-003：L01/L02 灰盒；T-004：L03 安心铃 / 三关推进 / 三级提示 / 本地存档 / 离线单文件 HTML。

无第三方依赖：JS 仅 Node / 浏览器内置；Python 仅标准库（参考实现）。

## 目录

```
banquet-pilot/
  index.html              模块化灰盒入口（需本地静态服务器）
  dist/banquet-pilot.html 离线自包含单文件（T-004 交付物）
  levels/                 L01 / L02 / L03 JSON
  src/core/               几何、规则、校验、枚举（*.js 生产 / *.py 参考）
  src/ui/                 board / app / hints / save
  scripts/build-standalone.mjs
  tests/                  单元测试与 evidence/
  README.md
```

## 离线单文件（推荐试玩）

```bash
# 重新构建（可选）
node banquet-pilot/scripts/build-standalone.mjs

# 直接用浏览器打开（无需服务器）
xdg-open banquet-pilot/dist/banquet-pilot.html
# 或
python3 -m http.server 8760 --directory banquet-pilot/dist
# 打开 http://127.0.0.1:8760/banquet-pilot.html
```

产物元数据见 `dist/banquet-pilot.meta.json`（path / bytes / sha256）。目标 ≤8MB，完全离线、无需登录。

## 模块化灰盒

```bash
cd banquet-pilot
python3 -m http.server 8760
# 浏览器打开 http://127.0.0.1:8760/
# 指定关卡：?level=L03
```

### T-004 行为摘要

- **三关** L01 / L02 / L03；开席成功一次推进；可下一关 / 重玩 / 返回
- **安心铃**（L03）：库存 1；仅 `rabbit` 有效；无效目标不消耗；已安心再点不额外消耗；calm 跟随角色；撤销恢复效果+库存；重玩恢复初始库存（不可刷）
- **三级免费提示**：每关 3 档，无惩罚、无付费墙
- **本地存档**：`banquet-pilot-save-v1` 版本校验；损坏 → 恢复开局并提示；存储不可用 → 明确提示，仍可游玩
- 通关仅经 `isWin` / `evaluateLevel`（传入 calm）；UI 不调用 `evaluateRule`

## 公开内核入口

| 环境 | 入口 | 说明 |
| --- | --- | --- |
| 浏览器 | `./src/core/index.js` | geometry + rules + solver；**不含** `node:` |
| Node 加载 JSON | `./src/core/loader.js` | 含 `node:fs` |
| 灰盒 board | `./src/ui/board.js` | 座位 + calm/库存快照，可单测 |

## 运行测试

仓库根目录：

```bash
node --test banquet-pilot/tests/test_rules.mjs banquet-pilot/tests/test_board.mjs banquet-pilot/tests/test_t004.mjs
node banquet-pilot/tests/enumerate_levels.mjs
# T-004 三关证据（mouse-sim；真机未测）
node --experimental-websocket banquet-pilot/tests/evidence/scripts/t004-three-level-smoke.mjs
```

## 验收数字（静态枚举）

| 关卡 | 排列数 | 期望解数 |
| --- | --- | --- |
| L01 | 24 | 1 |
| L02 | 720 | 1 |
| L03 无铃 | 720 | 0 |
| L03 团团 calm | 720 | 1 |

## 未包含

- 素材生成、新规则种类、真机触屏（证据标注「真机未测」）
- npm 依赖、打包器（仅自研 concat 脚本）、CI、公开部署
