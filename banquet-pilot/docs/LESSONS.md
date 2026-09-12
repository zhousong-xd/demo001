# Banquet 经验短卡（近几环）

按 LOOP「经验沉淀（D）」收纳。格式：类型 · 场景 · 做法/反例。追加即可，不另开体系。

| # | 类型 | 场景 | 做法 / 反例 |
| --- | --- | --- | --- |
| 1 | 翻车 | playtest 切换候选 | 玩法栈勿叫 `history`，会遮蔽 `window.history`，导致 `?c=` 不更新。用 `playHistory` + `window.history.replaceState`。 |
| 2 | 有效 | 快速连切 c01–c03 | 异步 `load` 加 `loadGen`：旧请求返回时直接丢弃，避免空白/错关。 |
| 3 | 有效 | 候选试玩打开 | 必须从 `banquet-pilot/` 根目录 `python3 -m http.server`；`file://` 下 ESM/`fetch` 常被拦。 |
| 4 | 有效 | 产品 vs 候选 | 冻结包 SHA `f28893f3…` / `dist/` 是锚点；`candidates/` 草稿 ≠ 正式 `levels/` / 正式 assets。 |
| 5 | 翻车 | 表述边界 | 不得宣称「12 关已交付」「风格已定」「真机已测」；门禁允许未测就写未测。 |
| 6 | 有效 | 升正式（LOOP E） | 须独立质检 + 人类无异议（或总结明示）；作者自测 ≠ 独立验收。 |
| 7 | 翻车 | 质检无凭据 | 无共享 PAT / 未登录时勿硬推证据到远端；写清 BLOCKED，勿空转两环（见 LOOP C）。 |
| 8 | 有效 | PR / 合并 | PR #11 保持 draft；未获放行不 merge、不写 main、不强推、不改冻结 dist。 |
| 9 | 有效 | 协作协议 | 工程只做 ASSIGN；DONE 附 tip SHA + 复现方式；等主导 ACCEPT；评论签名 `agent:… role:BOT`。 |
| 10 | 有效 | 密钥 | 共享 PAT 仅本机环境变量使用；用完 `unset`；**禁止**写入 Issue / 仓库 / remote URL。 |

锚点：冻结产品 SHA `f28893f3c419d794c6ba102bac67038683cb462c`。规则全文见 `LOOP.md`。
