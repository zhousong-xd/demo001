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

Docs tip (T-007 skeleton, this board): see latest `bot/banquet-pilot` commit after push — product SHA above stays frozen.

**Hard rule:** do not modify `banquet-pilot/dist/` or change accepted gameplay in `src/` unless a real P0/P1 is discovered and documented. Product SHA and report/evidence SHAs must stay distinct.

## Closed tasks (#5–#10)

| Issue | Task | Result |
| --- | --- | --- |
| #5 | T-001 接单回执与只读环境核验 | done / closed |
| #6 | T-002 三关规则内核与可复现校验 | done / closed |
| #7 | T-003 手机排座、交换和可逆操作灰盒 | done / closed |
| #8 | T-004 安心铃、三关流程与离线可玩交付 | done / closed · product SHA frozen above |
| #9 | T-005 独立QA与三关回归报告 | done / closed · lead independent recheck ACCEPT |
| #10 | T-006 一角色一屏风格样板（按需释放） | done / closed · candidates only under `candidates/art/` |

Art candidates live under `banquet-pilot/candidates/art/` (+ `meishu/` alternate). Preview: `candidates/art/preview.html`. **Not** imported into formal assets / dist / src.

## Open risks

1. **真机未测** — mouse-sim / headless Chrome ≠ 真机触屏、多指、实体设备矩阵；门禁允许残留，不得伪称已测。
2. **Style not final** — T-006 候选已 ACCEPT 为样板，**人类风格点头未做**；不得批量扩 art，不得擅自导入正式 assets。
3. **PR #11 still draft / unmerged** — 工程与证据均在 `bot/banquet-pilot`；不自动 merge、不写 main、不强推、不公开部署。

## Next optional work

| Priority | Item | Notes |
| --- | --- | --- |
| Optional | Style lock | Needs human style nod; blocked for formal asset import |
| Optional | Asset import (post style) | Only after style lock; can draft import plan without touching product |
| Done (docs) | **#12 / T-007 12-level candidates skeleton** | Design intent only under `candidates/levels/` — **not** formal `levels/` |
| Optional next | Promote selected C04–C12 stubs | Separate engineering+QA tasks; still no style-locked asset import |
| Not started | Formal 12-level backlog implementation | No claim of 12 finished playable levels |

## Stop lines

- No merge of PR #11 without explicit human/lead decide.
- No art batch expansion beyond current T-006 candidates.
- No token / PAT in remotes, comments, or committed files.
