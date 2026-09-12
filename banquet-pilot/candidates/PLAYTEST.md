# 候选试玩说明（PLAYTEST）

> **候选 ≠ 已交付产品。** 本文说明两套入口：冻结产品（可用 `file://` 打开）与候选试玩（需本地静态服务器）。  
> 产品 SHA 冻结：`f28893f3c419d794c6ba102bac67038683cb462c`（勿改 `dist/` / 正式 `levels/` / `src` 玩法）。

## 1. 已验收产品 vs 候选试玩

| | 已验收产品（Accepted） | 候选试玩（Candidates） |
| --- | --- | --- |
| 内容 | L01 / L02 / L03 正式三关 | `candidates/levels/c01.json`–`c12.json` 设计草稿 |
| 入口 | `banquet-pilot/dist/banquet-pilot.html` | `banquet-pilot/candidates/playtest/` |
| 打开方式 | **可直接 `file://` 双击/浏览器打开**（离线单文件） | **需要本地 HTTP 服务器**（ESM `import` + `fetch` 在 `file://` 下通常被拦） |
| 存档 | 写入 `banquet-pilot-save-v1` | **不写**产品存档键 |
| 宣称 | 已验收交付物 | **非正式关卡**；不得称为 12 关已交付可玩 |

产品推荐打开：

```bash
# 直接 file://（推荐）
xdg-open banquet-pilot/dist/banquet-pilot.html
# 或可选本地服务
python3 -m http.server 8760 --directory banquet-pilot/dist
# → http://127.0.0.1:8760/banquet-pilot.html
```

## 2. 如何打开候选 c01–c12

必须从 **`banquet-pilot/`** 根目录起服务（保证 `../../src` 与 `../levels` 都能解析）：

```bash
cd banquet-pilot
python3 -m http.server 8761
```

然后在浏览器打开：

| 用途 | URL |
| --- | --- |
| 默认（C01） | http://127.0.0.1:8761/candidates/playtest/ |
| 指定候选 | http://127.0.0.1:8761/candidates/playtest/?c=c01 … `?c=c12` |
| 冒烟（自动放一名客人） | http://127.0.0.1:8761/candidates/playtest/?c=c01&smoke=1 |

页内下拉框也可切换 C01–C12。操作：点选待入座客人 → 再点座位（点选入座；无产品拖拽手势）。

无浏览器内核检查：`node candidates/playtest/smoke.mjs`（在 `banquet-pilot/` 下）。
浏览器 mouse-sim 关键路径一键回归（放/撤/切/换/顶/铃，真机仍未测）：`node --experimental-websocket tests/evidence/scripts/t037-playtest-ui-critical-regression.mjs` → `evidence/t037-playtest-ui-critical-regression/`。

更细的工程说明见 `candidates/playtest/README.md`。

## 3. 美术候选预览路径

风格样板（T-006）在 **`candidates/art/`**，**未**导入正式 assets / dist / src：

| 路径 | 说明 |
| --- | --- |
| `banquet-pilot/candidates/art/preview.html` | 一角色一屏预览页 |
| `banquet-pilot/candidates/art/*.svg` / `*.png` | 样板资源 |
| `banquet-pilot/candidates/art/meishu/` | 备用/交替素材目录 |
| `banquet-pilot/candidates/art/ASSETS.md` | 素材清单说明 |

预览同样建议用静态服务器（避免部分浏览器对本地资源限制）：

```bash
cd banquet-pilot
python3 -m http.server 8761
# → http://127.0.0.1:8761/candidates/art/preview.html
```

人类风格点头未做前：**不得批量扩 art，不得擅自导入正式资源。**

## 4. 已知缺口（Known gaps）

1. **真机未测** — mouse-sim / headless Chrome ≠ 真机触屏、多指、实体设备矩阵；门禁允许残留，不得伪称已测。
2. **Style not final** — T-006 候选已 ACCEPT 为样板，**人类风格点头未做**；不得批量扩 art，不得导入正式 assets。
3. **PR #11 仍为 draft** — 工程与证据均在分支 `bot/banquet-pilot`；[PR #11](https://github.com/zhousong-xd/demo001/pull/11) **open/draft，勿 merge**；不写 main、不强推、不公开部署。

另：候选试玩页 ≠ 正式 `levels/` 晋升通道；C01–C12 仅 brief + JSON + enum + 试玩，**不是** 12 关已交付。

## 5. 停线（Stop lines）

- 不修改 `banquet-pilot/dist/` 或已验收 `src/` 玩法（产品 SHA 冻结）。
- 不把候选 JSON 写入正式 `banquet-pilot/levels/`。
- 不合并 PR #11，除非人类/主导明确 DECIDE。
- Token / PAT 不得写入评论、remote 或提交文件。

— GROKBOT01 · T-017
