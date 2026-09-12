# Banquet Pilot — STATUS

Last updated: 2026-09-12 (UTC) · lead: demo001 (role:GPT) · exec: 宴席·工程 (role:BOT)

Polling / Cindy 十分钟巡检：**paused**（人类交接后不自动恢复）。本 STATUS 为人工/主导连续迭代看板，不替代 #4 总控台评论。

## Accepted product (frozen)

| Item | Value |
| --- | --- |
| Product commit SHA | `f28893f3c419d794c6ba102bac67038683cb462c` |
| Standalone HTML | `banquet-pilot/dist/banquet-pilot.html` |
| HTML bytes (LF) | `73182` |
| HTML SHA256 | `19b8e65bbde285719ee43d74d83fcc60cdb3709ae7cc3ccc80d3f36d45d1bcf5` |
| Levels in product | L01 / L02 / L03 |
| Branch (work) | `bot/banquet-pilot` |
| Draft PR | [#11](https://github.com/zhousong-xd/demo001/pull/11) — **open/draft, do not merge** |

Docs tip: see latest `bot/banquet-pilot` commit after T-021 — product SHA frozen; lessons: [`docs/LESSONS.md`](./LESSONS.md); PR #11 still draft.

**Hard rule:** do not modify `banquet-pilot/dist/` or change accepted gameplay in `src/` unless a real P0/P1 is discovered and documented. Product SHA and report/evidence SHAs must stay distinct.

## Closed tasks (#5–#21)

| Issue | Task | Result |
| --- | --- | --- |
| #5 | T-001 接单回执与只读环境核验 | done / closed |
| #6 | T-002 三关规则内核与可复现校验 | done / closed |
| #7 | T-003 手机排座、交换和可逆操作灰盒 | done / closed |
| #8 | T-004 安心铃、三关流程与离线可玩交付 | done / closed · product SHA frozen above |
| #9 | T-005 独立QA与三关回归报告 | done / closed · lead independent recheck ACCEPT |
| #10 | T-006 一角色一屏风格样板（按需释放） | done / closed · candidates only under `candidates/art/` |
| #12 | T-007 十二关候选设计目录骨架 | done / closed · skeleton under `candidates/levels/` |
| #13 | T-008 前三关候选设计 brief（c01–c03） | done / closed · briefs; ruleVersion 0.1 |
| #14 | T-009 候选 JSON 草稿 + enum 解数（c01–c03） | done / closed · `c01.json`–`c03.json` + enum; counts filled; **not** formal `levels/` |
| #15 | T-010 候选设计 brief（c04–c06） | done / closed · baseline §13 #04–#06; counts were TBD then filled by T-011 |
| #16 | T-011 候选 JSON 草稿 + enum 解数（c04–c06） | done / closed · `c04.json`–`c06.json` + enum; counts filled; multi-OK; **not** formal `levels/` |
| #17 | T-012 候选设计 brief（c07–c09） | done / closed · baseline §13 #07–#09; counts were TBD then filled by T-013 |
| #18 | T-013 候选 JSON 草稿 + enum 解数（c07–c09） | done / closed · `c07.json`–`c09.json` + enum; counts filled; multi-OK; **not** formal `levels/` |
| #19 | T-014 候选设计 brief（c10–c12） | done / closed · baseline §13 #10–#12; counts were TBD then filled by T-015 |
| #20 | T-015 候选 JSON 草稿 + enum 解数（c10–c12）+ SUMMARY | done / closed · `c10.json`–`c12.json` + enum + `SUMMARY.md`; counts filled; multi-OK; **not** formal `levels/` |
| #21 | T-016 仅候选试玩页（c01–c12） | done / closed · `candidates/playtest/`；选 JSON + 复用 src ESM；**不是** shipped levels |
| #22 | T-017 候选试玩说明 PLAYTEST.md（中文） | done / closed · `candidates/PLAYTEST.md`；产品 file:// vs 候选 server；c01–c12 / art preview / known gaps；UI 轻量标注 candidates |
| #23 | T-018 刷新 PR #11 中文人体摘要（仅文档） | superseded by #24 · 旧 GROKBOT01 跟踪单，待主导关闭 |
| #24 | T-018 刷新 PR #11 说明（人类可读现状） | done / awaiting ACCEPT · REST 刷新 PR #11 中文 body；负责人 宴席·工程；产品 SHA 未改 |
| #25 | T-019 候选 playtest 稳定性小修 | done / awaiting ACCEPT · 修 `history` 遮蔽 window.history + 切换竞态；smoke c01–c03；不改 dist |
| #27 | T-021 经验短卡收纳（近几环） | done / awaiting ACCEPT · `docs/LESSONS.md` 10 条；STATUS 已链；不改 dist |

Art candidates live under `banquet-pilot/candidates/art/` (+ `meishu/` alternate). Preview: `candidates/art/preview.html`. **Not** imported into formal assets / dist / src.

Level candidates: `banquet-pilot/candidates/levels/` — C01–C12 **brief+enum** (+ `SUMMARY.md`). **Not** formal `levels/`.

Candidates playtest (T-016): `banquet-pilot/candidates/playtest/` — select c01–c12 JSON via `../levels/`; relative ESM from `../../src/…`. **Not** shipped levels. Run: `cd banquet-pilot && python3 -m http.server 8761` → http://127.0.0.1:8761/candidates/playtest/?c=c01

Playtest guide (T-017): `banquet-pilot/candidates/PLAYTEST.md`（中文）— 已验收产品 `file://` HTML vs 候选试玩 server；如何打开 c01–c12；art preview；known gaps（真机未测 / style not final / PR #11 draft）。

### T-009 enum results (candidates only)

| Candidate | Perms | Solutions |
| --- | --- | --- |
| C01 | 24 | **1** |
| C02 | 720 | **1** |
| C03 no calm | 720 | **0** |
| C03 calm rabbit | 720 | **1** |
| C03 calm other targets | 720 each | **0** |

### T-011 enum results (candidates only)

| Candidate | Perms | Solutions |
| --- | --- | --- |
| C04 | 720 | **8** (multi-solution OK) |
| C05 | 720 | **2** |
| C06 | 720 | **4** |

Runner: `candidates/levels/enumerate_candidates.py` (+ `.mjs`). Product SHA / HTML hash unchanged.

### T-012 briefs (candidates only)

| Candidate | Baseline title | Design intent | Solution count |
| --- | --- | --- | --- |
| C07 | 一枚铃够不够 | calm_bell **item target choice** (≥2 calmable) | filled by T-013 |
| C08 | 撤回来也没关系 | encourage try + **undo** (no forced path) | filled by T-013 |
| C09 | 同一桌的两种解 | **multiple / symmetric** legal solutions | filled by T-013 |

### T-013 enum results (candidates only)

| Candidate | Perms | Solutions |
| --- | --- | --- |
| C07 no calm | 720 | **0** |
| C07 calm rabbit | 720 | **4** |
| C07 calm tanuki | 720 | **4** |
| C07 calm other | 720 each | **0** |
| C08 | 720 | **4** (multi-OK) |
| C09 | 720 | **8** (multi / symmetric OK) |

Runner: `candidates/levels/enumerate_candidates.py` (+ `.mjs`) covers c01–c09. Product SHA / HTML hash unchanged.

### T-014 briefs (candidates only)

| Candidate | Baseline title | Design intent | Solution count |
| --- | --- | --- | --- |
| C10 | 一个小误会 | **pre-entry** story rule change (no mid-solve rewrite) | filled by T-015 |
| C11 | 合作开席 | **multi-constraint / few anchors** (one-screen) | filled by T-015 |
| C12 | 掌席考核 | **capstone** — all six kinds + calm_bell | filled by T-015 |

### T-015 enum results (candidates only)

| Candidate | Perms | Solutions |
| --- | --- | --- |
| C10 | 720 | **8** (multi-OK) |
| C11 | 720 | **2** (multi-OK) |
| C12 no calm | 720 | **0** |
| C12 calm rabbit | 720 | **4** |
| C12 calm other | 720 each | **0** |

Runner: `candidates/levels/enumerate_candidates.py` (+ `.mjs`) covers c01–c12. Short table: `candidates/levels/SUMMARY.md`. Product SHA / HTML hash unchanged.

### T-016 candidates-only playtest

| Item | Value |
| --- | --- |
| Page | `candidates/playtest/index.html` + `playtest.js` |
| Levels loaded | `../levels/c01.json`–`c12.json` only |
| Reuse | read-only ESM `../../src/core/index.js`, `../../src/ui/board.js`, `labels.js`, `app.css` |
| Not imported | product `src/ui/app.js` (L01–L03 boot / save) |
| Smoke | opened C01 and placed fox→A1 (`?smoke=1` / `smoke.mjs`) |
| Claim | **not** shipped / not formal `levels/` |

How to run: `cd banquet-pilot && python3 -m http.server 8761` then open `/candidates/playtest/?c=c01`. file:// ESM/fetch usually blocked.

### T-017 playtest guide (candidates docs)

| Item | Value |
| --- | --- |
| Doc | `candidates/PLAYTEST.md`（中文） |
| Covers | 产品 `file://` HTML vs 候选 http.server；打开 c01–c12；art `candidates/art/preview.html`；known gaps |
| UI polish | playtest 横幅/标题/备注轻量标注 **candidates only**（非正式关） |
| Claim | **not** shipped / not formal `levels/` |

### T-018 PR #11 Chinese human summary (docs-only)

| Item | Value |
| --- | --- |
| Action | REST `PATCH pulls/11` — refresh PR body in **Chinese** for human handoff（#24 · 宴席·工程） |
| Covers | 已验收产品 SHA `f28893f3…` + 打开 `dist/banquet-pilot.html`；候选 c01–c12 SUMMARY / playtest / art preview / PLAYTEST.md；**未做**：merge、正式 levels 导入、最终 art style、真机 |
| Links | 总控台 [#4](https://github.com/zhousong-xd/demo001/issues/4)；跟踪 [#24](https://github.com/zhousong-xd/demo001/issues/24)；相关 closed #5–#22；旧 #23 superseded |
| Claim | **doc-only**；不 merge PR #11；不改 dist / 产品玩法 |

### T-019 candidates playtest stability (docs+loader)

| Item | Value |
| --- | --- |
| Scope | `candidates/playtest/playtest.js` + `smoke.mjs`；`docs/STATUS.md` |
| Fix | 玩法历史改名 `playHistory`，URL 用 `window.history.replaceState`；`loadGen` 防快速切换竞态；失败时提示 |
| Verify | `node candidates/playtest/smoke.mjs`；http.server + headless CDP：c01→c02→c03，URL `?c=` 同步，c03 可入座+安心铃 |
| Claim | **candidates only**；不改 dist / 产品 SHA；不 merge PR #11 |

### T-021 lessons short cards (docs-only)

| Item | Value |
| --- | --- |
| Doc | [`docs/LESSONS.md`](./LESSONS.md) |
| Covers | playHistory 遮蔽、loadGen、http.server、候选≠正式、真机未测表述、升正式须独检、质检无凭据、PR draft、ASSIGN 协议、PAT 勿入库 |
| Claim | **docs-only**；不改 dist / 不 merge |

## Open risks

1. **真机未测** — mouse-sim / headless Chrome ≠ 真机触屏、多指、实体设备矩阵；门禁允许残留，不得伪称已测。
2. **Style not final** — T-006 候选已 ACCEPT 为样板，**人类风格点头未做**；不得批量扩 art，不得擅自导入正式 assets。
3. **PR #11 still draft / unmerged** — 工程与证据均在 `bot/banquet-pilot`；不自动 merge、不写 main、不强推、不公开部署。
4. **C07–C09 enum filled** — JSON drafts + counts (T-013); still no formal `levels/` promotion without eng+QA.
5. **C10–C12 enum filled** — JSON drafts + counts (T-015) + `SUMMARY.md`; still no formal `levels/` promotion without eng+QA.
6. **Candidates playtest exists** — T-016 page can seat guests on draft JSON; still **not** 12 shipped levels.

## Next optional work

| Priority | Item | Notes |
| --- | --- | --- |
| Optional | Style lock | Needs human style nod; blocked for formal asset import |
| Optional | Asset import (post style) | Only after style lock; can draft import plan without touching product |
| Done (docs) | **#12 / T-007** candidates skeleton | Design intent under `candidates/levels/` |
| Done (docs) | **#13 / T-008** C01–C03 briefs | Learning goal / seats-rules sketch / tips / ruleVersion 0.1 |
| Done (candidates) | **#14 / T-009** C01–C03 JSON + enum | Counts filled; still not formal `levels/` |
| Done (docs) | **#15 / T-010** C04–C06 briefs | Baseline §13 #04–#06; still not formal `levels/` |
| Done (candidates) | **#16 / T-011** C04–C06 JSON + enum | Counts: C04=8, C05=2, C06=4; still not formal `levels/` |
| Done (docs) | **#17 / T-012** C07–C09 briefs | Baseline §13 #07–#09; counts filled by T-013 |
| Done (candidates) | **#18 / T-013** C07–C09 JSON + enum | Counts: C07=0/4/4, C08=4, C09=8; still not formal `levels/` |
| Done (docs) | **#19 / T-014** C10–C12 briefs | Baseline §13 #10–#12; counts filled by T-015 |
| Done (candidates) | **#20 / T-015** C10–C12 JSON + enum + SUMMARY | Counts: C10=8, C11=2, C12=0/4; `SUMMARY.md` c01–c12; still not formal `levels/` |
| Done (candidates) | **#21 / T-016** playtest page c01–c12 | `candidates/playtest/`; ESM reuse src; still not formal `levels/` |
| Done (docs) | **#22 / T-017** PLAYTEST.md + UI label polish | Chinese guide: product file:// vs candidates server; gaps; still not formal `levels/` |
| Done (docs) | **#24 / T-018** PR #11 Chinese body refresh | Human summary via REST `pulls/11`; still draft / do not merge · await demo001 ACCEPT |
| Done (candidates) | **#25 / T-019** playtest stability | `playHistory` + loadGen; smoke c01–c03; await ACCEPT |
| Done (docs) | **#27 / T-021** LESSONS short cards | `docs/LESSONS.md`; await ACCEPT |
| Not started | Formal 12-level backlog implementation | No claim of 12 finished playable levels |

## Stop lines

- No merge of PR #11 without explicit human/lead decide.
- No art batch expansion beyond current T-006 candidates.
- No token / PAT in remotes, comments, or committed files.
- No formal `levels/` edits from candidate briefs/JSON alone.
- No inventing counts beyond enum; C01–C12 candidates filled — still not formal levels.
- Candidates playtest ≠ shipped levels; do not promote via the playtest page alone.

## Process

See [LOOP.md](./LOOP.md) — human closed-loop + role checklist + digest shape (2026-09-12).
