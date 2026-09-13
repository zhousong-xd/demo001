# T-038 候选 playtest UI 一键关键回归 独立复核（质检·非真机）

> Issue: https://github.com/zhousong-xd/demo001/issues/44  
> 执行：宴席·质检 · role:BOT · work:qa  
> 作者工程自测（T-037 / tip `b3dd7ce…`）≠本环独立验收。  
> ACCEPT 由主导落盘；本文件只给候选 playtest UI 一键回归（放/撤/切/换/顶/铃）结论。

---

## Versions

| Role | Value |
|------|-------|
| **Engineering tip under test** | `b3dd7cee7f0f0610a6bdee42eaed243593454b22` |
| **Product SHA (FIXED)** | `f28893f3c419d794c6ba102bac67038683cb462c` |
| **HTML path** | `banquet-pilot/dist/banquet-pilot.html` |
| **HTML size (LF bytes)** | `73182` |
| **HTML sha256** | `19b8e65bbde285719ee43d74d83fcc60cdb3709ae7cc3ccc80d3f36d45d1bcf5` |
| **LF-only / no CR** | YES |
| **Working-tree blob == product SHA blob** | YES (`c17208faa0548c34cb8cc150a5dc4bce96a61b9c`) |
| **Product modified / rebuilt** | **NO** — verified before & after rerun |
| **Script** | `banquet-pilot/tests/evidence/scripts/t037-playtest-ui-critical-regression.mjs`（先审后复跑同一脚本） |
| **Script blob** | `acb47d098e3ae471f17885c66661cba205bc0598`（worktree == tip） |
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

本环测的是 `candidates/playtest` 一键 UI 关键回归（CDP mouse-sim），不是改正式包。锚点匹配，未 BLOCKED。

---

## 2. Environment

| Item | Value |
|------|-------|
| Host | Grok Bot box (Linux) |
| Node | v20.19.2 |
| Chrome | 151.0.7922.169 headless=new（CDP `Input.dispatchMouseEvent`） |
| Command | `cd banquet-pilot && node --experimental-websocket tests/evidence/scripts/t037-playtest-ui-critical-regression.mjs` |
| Window (UTC) | 2026-09-12T08:12:41Z → 08:13:06Z |
| Exit code | `0` |
| Banner | place / undo / switch / swap / displace / calm miss / calm hit 均 `[PASS]`；真机/多指记未测 |
| 作者证据审读 | PASS（脚本覆盖放撤切换顶铃；consolidates T-031/033/035；expected sha256 与冻结锚点一致） |
| **真机 / 多指 / 触屏** | **未测**（CDP ≠ 真机；不得 PASS） |

---

## 3. 用例矩阵（PASS / FAIL / BLOCKED / 未测）

独立复跑同一脚本 + 抽检截图；不照搬作者 T-037 自测结论。

| ID | 用例 | Result | 备注 / 证据 |
|----|------|--------|-------------|
| UI-PLACE | 放：c01 fox→A1 | **PASS** | assignment.fox=A1；shot `02_c01_placed.png` |
| UI-UNDO | 撤：撤销后空桌 | **PASS** | seated=0 historyLen=0；shot `03_c01_undo.png` |
| UI-SWITCH | 切：c01→c02 | **PASS** | fileId=c02 levelId=C02 url含c=c02；shot `04_c02_switched.png` |
| UI-SWAP | 换：c02 fox/rabbit 互换 | **PASS** | fox=A2 rabbit=A1；shot `05_c02_swapped.png` |
| UI-DISPLACE | 顶：c01 rabbit 顶 fox@A1 | **PASS** | rabbit=A1 fox=null；shot `06_c01_displaced.png` |
| UI-BELL-MISS | 铃误投：c03 安心铃→fox | **PASS** | 库存不扣；shot `07_c03_miss.png` |
| UI-BELL-HIT | 铃命中：c03 安心铃→rabbit | **PASS** | stock-1；calm含rabbit；shot `08_c03_hit.png` |
| DEV | 真机 / 多指 / 实体触屏 | **未测** | 无实体机；CDP mouse-sim ≠ 真机 |

证据：`banquet-pilot/evidence/t038-ui-critical-regression/`（NOTES / command / rerun-stdout / shots / dist-proof / script-summary）。

---

## 4. 缺陷（P0–P3）

| Severity | Findings |
|----------|----------|
| P0 | 无 |
| P1 | 无 |
| P2 | 无 |
| P3 | 无 |

说明（非缺陷）：一键脚本以 CDP mouse-sim 覆盖放/撤/切/换/顶/铃；真机触屏手感仍属未测。

---

## 5. 已测 / 未测

**已测**

- 冻结产品 dist 锚点（SHA / bytes / sha256 / LF / blob）复跑前后一致
- 先审 T-037 脚本，再独立复跑同一脚本（exit 0）
- 放 / 撤 / 切 / 换 / 顶 / 铃（误投+命中）共 7 步全部 PASS
- 抽检复跑截图 01–08 与脚本 summary.results

**未测（明确）**

- 真机
- 多指 / physical multitouch
- 正式关 / 合 PR / 升正式宣称（本环禁止）

---

## 6. Verdict

放/撤/切/换/顶/铃均 **PASS**；真机/多指记 **未测**（不记 PASS）。无 P0–P3。产品 dist 未改。exit code `0`。

**VERDICT: PASS**（候选 playtest UI 一键关键回归视角。ACCEPT 由主导落盘。作者自测 ≠ 独立验收。）

---

## 7. 经验一行

试玩页关键操作一键回归顺——放撤切换顶铃七步全绿；真机触屏仍未测，正式包仍冻结。

---

## Honesty / limits

- 本环为独立质检复跑，非作者自测拷贝。
- 输入路径仅为 headless Chrome CDP mouse-sim，不等于真机触屏。
- dist 只读；未 merge；未装新依赖。
- shippedClaim=false；不升正式宣称。

## Push

- tip: `efba6df2d74f619604fb2cc70ac3627387ab5293` on `bot/banquet-pilot` (reports/evidence only)
- issue comment: https://github.com/zhousong-xd/demo001/issues/44#issuecomment-5644665449
