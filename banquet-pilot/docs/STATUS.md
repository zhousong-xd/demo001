# Banquet Pilot — STATUS

Last updated: 2026-09-12 (UTC) · lead: GROKBOT01 (role:GPT) · exec: GROKBOT01 (role:BOT)

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

Docs tip: see latest `bot/banquet-pilot` commit after T-012 push — product SHA above stays frozen.

**Hard rule:** do not modify `banquet-pilot/dist/` or change accepted gameplay in `src/` unless a real P0/P1 is discovered and documented. Product SHA and report/evidence SHAs must stay distinct.

## Closed tasks (#5–#17)

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
| #17 | T-012 候选设计 brief（c07–c09） | done / closed · baseline §13 #07–#09; solution **TBD**; **not** formal `levels/` |

Art candidates live under `banquet-pilot/candidates/art/` (+ `meishu/` alternate). Preview: `candidates/art/preview.html`. **Not** imported into formal assets / dist / src.

Level candidates: `banquet-pilot/candidates/levels/` — C01–C06 **brief+enum**; C07–C09 **brief** (counts TBD); C10–C12 stubs. **Not** formal `levels/`.

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
| C07 | 一枚铃够不够 | calm_bell **item target choice** (≥2 calmable) | **TBD** |
| C08 | 撤回来也没关系 | encourage try + **undo** (no forced path) | **TBD** |
| C09 | 同一桌的两种解 | **multiple / symmetric** legal solutions | **TBD** |

## Open risks

1. **真机未测** — mouse-sim / headless Chrome ≠ 真机触屏、多指、实体设备矩阵；门禁允许残留，不得伪称已测。
2. **Style not final** — T-006 候选已 ACCEPT 为样板，**人类风格点头未做**；不得批量扩 art，不得擅自导入正式 assets。
3. **PR #11 still draft / unmerged** — 工程与证据均在 `bot/banquet-pilot`；不自动 merge、不写 main、不强推、不公开部署。
4. **C07–C09 solution counts TBD** — briefs filled (T-012); no invent counts; no formal `levels/` promotion without eng+QA.
5. **C10–C12 stubs** — titles may still lag baseline §13 #10–#12; future brief tasks.

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
| Done (docs) | **#17 / T-012** C07–C09 briefs | Baseline §13 #07–#09; solution TBD; still not formal `levels/` |
| Optional next | C07–C09 JSON + enum / C10–C12 briefs | Separate tasks; still no formal `levels/` write without eng+QA |
| Not started | Formal 12-level backlog implementation | No claim of 12 finished playable levels |

## Stop lines

- No merge of PR #11 without explicit human/lead decide.
- No art batch expansion beyond current T-006 candidates.
- No token / PAT in remotes, comments, or committed files.
- No formal `levels/` edits from candidate briefs/JSON alone.
- No invented solution counts for C07–C12.
