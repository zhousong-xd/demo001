# T-034 候选 playtest UI mouse-sim 交换+顶替 独立复核（质检·非真机）

> Issue: https://github.com/zhousong-xd/demo001/issues/40  
> 执行：宴席·质检 · role:BOT · work:qa  
> 作者工程自测（T-033 / #39）≠本环独立验收。  
> ACCEPT 由主导落盘；本文件只给候选 playtest UI mouse-sim 交换+顶替结论。

---

## Versions

| Role | Value |
|------|-------|
| **Engineering tip under test** | `639368b18c4d1d33fea288e8fdfdb725d92e2df0` |
| **Product SHA (FIXED)** | `f28893f3c419d794c6ba102bac67038683cb462c` |
| **HTML path** | `banquet-pilot/dist/banquet-pilot.html` |
| **HTML size (LF bytes)** | `73182` |
| **HTML sha256** | `19b8e65bbde285719ee43d74d83fcc60cdb3709ae7cc3ccc80d3f36d45d1bcf5` |
| **LF-only / no CR** | YES |
| **Working-tree blob == product SHA blob** | YES (`c17208faa0548c34cb8cc150a5dc4bce96a61b9c`) |
| **Product modified / rebuilt** | **NO** — verified before & after rerun |
| **Script** | `banquet-pilot/tests/evidence/scripts/t033-playtest-ui-swap-displace.mjs`（先审后复跑同一脚本） |
| **Script blob** | `4f2fd64c594a0370b4b6afd043215edd1a62bc74`（worktree == tip） |
| **Branch** | `bot/banquet-pilot` |

---

## 1. Product tree verification

| Check | Result |
|-------|--------|
| Product SHA exists | PASS `f28893f3…` |
| HTML bytes(LF) == 73182 | PASS |
| HTML sha256 == `19b8e65…d1bcf5` | PASS |
| LF-only (no CR) | PASS |
| `git hash-object dist` == blob @ product SHA | PASS |
| `f28893f3..HEAD` changes `dist/` or `src/` | **none** |
| After rerun: dist/src still clean | PASS |

本环测的是 `candidates/playtest` 浏览器 mouse-sim 交换+顶替，不是改正式包。锚点匹配，未 BLOCKED。

---

## 2. Environment

| Item | Value |
|------|-------|
| Host | Grok Bot box (Linux) |
| Node | v20.19.2 |
| Chrome | 151.0.7922.169 headless=new（CDP `Input.dispatchMouseEvent`） |
| Command | `cd banquet-pilot && node --experimental-websocket tests/evidence/scripts/t033-playtest-ui-swap-displace.mjs` |
| Window (UTC) | 2026-09-12T07:08:16Z → 07:08:39Z |
| Exit code | `0` |
| Banner | `[PASS] mouse swap on c02` / `[PASS] mouse displace on c01` |
| 作者证据审读 | PASS（shots 02→03 交换；05→06 顶替；summary snap 与脚本断言一致） |
| **真机 / 多指 / 触屏** | **未测**（CDP ≠ 真机；不得 PASS） |

---

## 3. 用例矩阵（PASS / FAIL / BLOCKED / 未测）

独立复跑同一脚本 + 抽检截图/snap；不照搬作者 T-033 报告。

| ID | 用例 | Result | 备注 / 证据 |
|----|------|--------|-------------|
| UI-SWAP | c02 已入座 fox@A1 + rabbit@A2 → 鼠标交换 | **PASS** | snap fox=A2 rabbit=A1 seated=2 historyLen=3；shot `03_c02_swapped.png` 兔@A1 狐@A2 |
| UI-DISPLACE | c01 候客 rabbit 点已占 A1 → 顶替 fox | **PASS** | snap rabbit=A1 fox=null seated=1 historyLen=2；shot `06_c01_displaced.png` 兔@A1、狐在候客区 |
| DEV | 真机 / 多指 / 实体触屏 | **未测** | 无实体机；CDP mouse-sim ≠ 真机 |

证据：`banquet-pilot/evidence/t034-ui-swap-displace/`（NOTES / command / rerun-summary / shots / dist-proof / author-reviewed）。

---

## 4. 缺陷（P0–P3）

| Severity | Findings |
|----------|----------|
| P0 | 无 |
| P1 | 无 |
| P2 | 无 |
| P3 | 无 |

说明（非缺陷）：交换路径=点已入座角色再点对方座位；顶替路径=候客点已占座（与 kernel `kind=swap|displace` 一致）。真机触屏手感仍属未测。

---

## 5. 已测 / 未测

**已测**

- 冻结产品 dist 锚点（SHA / bytes / sha256 / LF / blob）复跑前后一致
- 先审 T-033 脚本与作者证据，再独立复跑同一脚本（exit 0）
- c02 鼠标交换 fox↔rabbit（A1↔A2）
- c01 候客鼠标顶替：rabbit 占 A1、fox 回候客
- 抽检复跑截图 01–06 与 `__CANDIDATE_PLAYTEST__` snap

**未测（明确）**

- 真机
- 多指 / physical multitouch
- 正式关 / 合 PR / 升正式宣称（本环禁止）

---

## 6. Verdict

交换 / 顶替均 **PASS**；真机/多指记 **未测**（不记 PASS）。无 P0–P3。产品 dist 未改。

**VERDICT: PASS**（候选 playtest UI mouse-sim 交换+顶替视角。ACCEPT 由主导落盘。作者自测 ≠ 独立验收。）

---

## 7. 经验一行

试玩页换座/顶替鼠标操作在 headless CDP 下可独立复验且顺；真机触屏仍未测，正式包仍冻结。

---

## Honesty / limits

- CDP `Input.dispatchMouseEvent` ≠ 真机 / 触屏 / 多指。
- 未改 `dist/`、`src/`、candidates 玩法；未装新依赖；未 merge；未升正式关。
- 未把作者 T-033 自测当作本环验收依据；作者证据仅作审读对照。

— agent:宴席·质检 role:BOT · task:T-034 · UI SWAP+DISPLACE · issue:#40

## 8. 推送

- branch: `bot/banquet-pilot`
- tip: `e2cdce0aa5651c7f9e2ba14d4e246e08bf4aad9d`
- 仅 reports/qa + evidence/t034；dist/src 未改
