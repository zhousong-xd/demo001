# T-049 候选 playtest UI 抽样（c05/c08/c11）独立复核（质检·非真机）

> Issue: https://github.com/zhousong-xd/demo001/issues/55  
> 执行：宴席·质检 · role:BOT · work:qa  
> 作者工程自测（T-048 / tip `b6f1987…`）≠本环独立验收。  
> ACCEPT 由主导落盘；本文件只给候选 playtest UI 后段抽样（放+撤）结论。

---

## Versions

| Role | Value |
|------|-------|
| **Engineering tip under test** | `b6f1987728662223788249701ad8d02eaf59a5de` |
| **Product SHA (FIXED)** | `f28893f3c419d794c6ba102bac67038683cb462c` |
| **HTML path** | `banquet-pilot/dist/banquet-pilot.html` |
| **HTML size (LF bytes)** | `73182` |
| **HTML sha256** | `19b8e65bbde285719ee43d74d83fcc60cdb3709ae7cc3ccc80d3f36d45d1bcf5` |
| **LF-only / no CR** | YES |
| **Working-tree blob == product SHA blob** | YES (`c17208faa0548c34cb8cc150a5dc4bce96a61b9c`) |
| **Product modified / rebuilt** | **NO** — verified before & after rerun |
| **Script** | `banquet-pilot/tests/evidence/scripts/t048-playtest-ui-sample-c05-c08-c11.mjs`（先审后复跑同一脚本） |
| **Script blob** | `d455ed86e95401fc291bc6b6ba6221eb75336348`（worktree == tip） |
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

本环测的是 `candidates/playtest` 后段抽样 UI 短冒烟（CDP mouse-sim 放+撤），不是改正式包。锚点匹配，未 BLOCKED。

---

## 2. Environment

| Item | Value |
|------|-------|
| Host | Grok Bot box (Linux) |
| Node | v20.19.2 |
| Chrome | 151.0.7922.169 headless=new（CDP `Input.dispatchMouseEvent`） |
| Command | `cd banquet-pilot && node --experimental-websocket tests/evidence/scripts/t048-playtest-ui-sample-c05-c08-c11.mjs` |
| Window (UTC) | 2026-09-12T09:11:05Z → 09:11:32Z |
| Exit code | `0` |
| Banner | c05/c08/c11 各 place + undo 均 `[PASS]`；真机/多指记未测 |
| 作者证据审读 | PASS（`evidence/t048-playtest-ui-sample-c05-c08-c11/`：脚本覆盖 c05/c08/c11 放撤；expected sha256 与冻结锚点一致） |
| **真机 / 多指 / 触屏** | **未测**（CDP ≠ 真机；不得 PASS） |

---

## 3. 用例矩阵（PASS / FAIL / BLOCKED / 未测）

独立复跑同一脚本 + 抽检截图；不照搬作者 T-048 自测结论。

| ID | 用例 | Result | 备注 / 证据 |
|----|------|--------|-------------|
| UI-C05-PLACE | c05 放：fox→A1 | **PASS** | assignment.fox=A1；shot `c05_placed.png` |
| UI-C05-UNDO | c05 撤：撤销后空桌 | **PASS** | seated=0 historyLen=0；shot `c05_undo.png` |
| UI-C08-PLACE | c08 放：fox→A1 | **PASS** | assignment.fox=A1；shot `c08_placed.png` |
| UI-C08-UNDO | c08 撤：撤销后空桌 | **PASS** | seated=0 historyLen=0；shot `c08_undo.png` |
| UI-C11-PLACE | c11 放：fox→A1 | **PASS** | assignment.fox=A1；shot `c11_placed.png` |
| UI-C11-UNDO | c11 撤：撤销后空桌 | **PASS** | seated=0 historyLen=0；shot `c11_undo.png` |
| DEV | 真机 / 多指 / 实体触屏 | **未测** | 无实体机；CDP mouse-sim ≠ 真机 |

证据：`banquet-pilot/evidence/t049-playtest-ui-sample/`（NOTES / command / rerun-stdout / shots / dist-proof / script-summary）。

---

## 4. 缺陷（P0–P3）

| Severity | Findings |
|----------|----------|
| P0 | 无 |
| P1 | 无 |
| P2 | 无 |
| P3 | 无 |

说明（非缺陷）：抽样脚本以 CDP mouse-sim 覆盖后段三关放/撤；真机触屏手感仍属未测。

---

## 5. 已测 / 未测

**已测**

- 冻结产品 dist 锚点（SHA / bytes / sha256 / LF / blob）复跑前后一致
- 先审 T-048 脚本，再独立复跑同一脚本（exit 0）
- c05 / c08 / c11 各 place fox→A1 + undo 共 6 步全部 PASS
- 抽检复跑截图 boot/placed/undo ×3 + 脚本 summary.results

**未测（明确）**

- 真机
- 多指 / physical multitouch
- 正式关 / 合 PR / 升正式宣称（本环禁止）

---

## 6. Verdict

c05/c08/c11 放+撤均 **PASS**；真机/多指记 **未测**（不记 PASS）。无 P0–P3。产品 dist 未改。exit code `0`。

**VERDICT: PASS**（候选 playtest UI 后段抽样放撤视角。ACCEPT 由主导落盘。作者自测 ≠ 独立验收。）

---

## 7. 经验一行

候选后段抽样关界面放撤顺——c05/c08/c11 六步全绿；真机触屏仍未测，正式包仍冻结。

---

## Honesty / limits

- 本环为独立质检复跑，非作者自测拷贝。
- 输入路径仅为 headless Chrome CDP mouse-sim，不等于真机触屏。
- dist 只读；未 merge；未装新依赖。
- shippedClaim=false；不升正式宣称。

## Push

- tip: `2683b8202a9a2f1c24c2b54b5b5836427e0813ce` on `bot/banquet-pilot` (reports/evidence only)
- issue comment: https://github.com/zhousong-xd/demo001/issues/55#issuecomment-5644939536
