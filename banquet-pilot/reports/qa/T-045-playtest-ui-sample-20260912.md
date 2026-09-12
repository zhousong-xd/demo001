# T-045 候选 playtest UI 抽样（c04/c07/c10）独立复核（质检·非真机）

> Issue: https://github.com/zhousong-xd/demo001/issues/51  
> 执行：宴席·质检 · role:BOT · work:qa  
> 作者工程自测（T-043 / tip `4e7f379…`）≠本环独立验收。  
> ACCEPT 由主导落盘；本文件只给候选 playtest UI 中段抽样（放+撤）结论。

---

## Versions

| Role | Value |
|------|-------|
| **Engineering tip under test** | `4e7f3799978d8ef32d9b153597bb5026f9102832` |
| **Product SHA (FIXED)** | `f28893f3c419d794c6ba102bac67038683cb462c` |
| **HTML path** | `banquet-pilot/dist/banquet-pilot.html` |
| **HTML size (LF bytes)** | `73182` |
| **HTML sha256** | `19b8e65bbde285719ee43d74d83fcc60cdb3709ae7cc3ccc80d3f36d45d1bcf5` |
| **LF-only / no CR** | YES |
| **Working-tree blob == product SHA blob** | YES (`c17208faa0548c34cb8cc150a5dc4bce96a61b9c`) |
| **Product modified / rebuilt** | **NO** — verified before & after rerun |
| **Script** | `banquet-pilot/tests/evidence/scripts/t043-playtest-ui-sample-c04-c07-c10.mjs`（先审后复跑同一脚本） |
| **Script blob** | `04aa773082806e08e65c3de545bc412f61f39f12`（worktree == tip） |
| **Branch** | `bot/banquet-pilot` |

---

## 1. Product tree verification

| Check | Result |
|-------|--------|
| Product SHA exists | PASS `f28893f3…` |
| HTML bytes(LF) == 73182 | PASS |
| HTML sha256 == `19b8e65…d1bcf5` | PASS |
| LF-only (no CR) | PASS |
| `git hash-object dist` == blob @ product SHA | PASS (`c17208fa…`) |
| `f28893f3..HEAD` changes `dist/` or `src/` | **none** |
| After rerun: dist/src still clean | PASS |

本环测的是 `candidates/playtest` 中段抽样 UI 短冒烟（CDP mouse-sim 放+撤），不是改正式包。锚点匹配，未 BLOCKED。

---

## 2. Environment

| Item | Value |
|------|-------|
| Host | Grok Bot box (Linux) |
| Node | v20.19.2 |
| Chrome | 151.0.7922.169 headless=new（CDP `Input.dispatchMouseEvent`） |
| Command | `cd banquet-pilot && node --experimental-websocket tests/evidence/scripts/t043-playtest-ui-sample-c04-c07-c10.mjs` |
| Window (UTC) | 2026-09-12T08:58:40Z → 08:59:04Z |
| Exit code | `0` |
| Banner | c04/c07/c10 各 place + undo 均 `[PASS]`；真机/多指记未测 |
| 作者证据审读 | PASS（`evidence/t043-playtest-ui-sample-c04-c07-c10/`：脚本覆盖 c04/c07/c10 放撤；expected sha256 与冻结锚点一致） |
| **真机 / 多指 / 触屏** | **未测**（CDP ≠ 真机；不得 PASS） |

---

## 3. 用例矩阵（PASS / FAIL / BLOCKED / 未测）

独立复跑同一脚本 + 抽检截图；不照搬作者 T-043 自测结论。

| ID | 用例 | Result | 备注 / 证据 |
|----|------|--------|-------------|
| UI-C04-PLACE | c04 放：fox→A1 | **PASS** | assignment.fox=A1；shot `c04_placed.png` |
| UI-C04-UNDO | c04 撤：撤销后空桌 | **PASS** | seated=0 historyLen=0；shot `c04_undo.png` |
| UI-C07-PLACE | c07 放：fox→A1 | **PASS** | assignment.fox=A1；shot `c07_placed.png` |
| UI-C07-UNDO | c07 撤：撤销后空桌 | **PASS** | seated=0 historyLen=0；shot `c07_undo.png` |
| UI-C10-PLACE | c10 放：fox→A1 | **PASS** | assignment.fox=A1；shot `c10_placed.png` |
| UI-C10-UNDO | c10 撤：撤销后空桌 | **PASS** | seated=0 historyLen=0；shot `c10_undo.png` |
| DEV | 真机 / 多指 / 实体触屏 | **未测** | 无实体机；CDP mouse-sim ≠ 真机 |

证据：`banquet-pilot/evidence/t045-playtest-ui-sample/`（NOTES / command / rerun-stdout / shots / dist-proof / script-summary）。

---

## 4. 缺陷（P0–P3）

| Severity | Findings |
|----------|----------|
| P0 | 无 |
| P1 | 无 |
| P2 | 无 |
| P3 | 无 |

说明（非缺陷）：抽样脚本以 CDP mouse-sim 覆盖中段三关放/撤；真机触屏手感仍属未测。

---

## 5. 已测 / 未测

**已测**

- 冻结产品 dist 锚点（SHA / bytes / sha256 / LF / blob）复跑前后一致
- 先审 T-043 脚本，再独立复跑同一脚本（exit 0）
- c04 / c07 / c10 各 place fox→A1 + undo 共 6 步全部 PASS
- 抽检复跑截图 boot/placed/undo ×3 + 脚本 summary.results

**未测（明确）**

- 真机
- 多指 / physical multitouch
- 正式关 / 合 PR / 升正式宣称（本环禁止）

---

## 6. Verdict

c04/c07/c10 放+撤均 **PASS**；真机/多指记 **未测**（不记 PASS）。无 P0–P3。产品 dist 未改。exit code `0`。

**VERDICT: PASS**（候选 playtest UI 中段抽样放撤视角。ACCEPT 由主导落盘。作者自测 ≠ 独立验收。）

---

## 7. 经验一行

候选中段抽样关界面放撤顺——c04/c07/c10 六步全绿；真机触屏仍未测，正式包仍冻结。

---

## Honesty / limits

- 本环为独立质检复跑，非作者自测拷贝。
- 输入路径仅为 headless Chrome CDP mouse-sim，不等于真机触屏。
- dist 只读；未 merge；未装新依赖。
- shippedClaim=false；不升正式宣称。

## Push

- tip: `7c76617714138e7ba6b680f986c6f0eea9524130` on `bot/banquet-pilot` (reports/evidence only)
- issue comment: https://github.com/zhousong-xd/demo001/issues/51#issuecomment-5644882989
