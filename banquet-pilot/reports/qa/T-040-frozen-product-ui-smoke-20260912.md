# T-040 冻结产品 L01–L03 UI 短冒烟 独立复核（质检·非真机）

> Issue: https://github.com/zhousong-xd/demo001/issues/46  
> 执行：宴席·质检 · role:BOT · work:qa  
> 作者工程自测（T-039 / tip `ba9f428…`）≠本环独立验收。  
> ACCEPT 由主导落盘；本文件只给冻结 dist 演示路径 UI 短冒烟（放/撤/切关 + L03 安心铃）结论。

---

## Versions

| Role | Value |
|------|-------|
| **Engineering tip under test** | `ba9f428e328eae9298cfe057004b88ac1aeb6976` |
| **Product SHA (FIXED)** | `f28893f3c419d794c6ba102bac67038683cb462c` |
| **HTML path** | `banquet-pilot/dist/banquet-pilot.html` |
| **HTML size (LF bytes)** | `73182` |
| **HTML sha256** | `19b8e65bbde285719ee43d74d83fcc60cdb3709ae7cc3ccc80d3f36d45d1bcf5` |
| **LF-only / no CR** | YES |
| **Working-tree blob == product SHA blob** | YES (`c17208faa0548c34cb8cc150a5dc4bce96a61b9c`) |
| **Product modified / rebuilt** | **NO** — verified before & after rerun |
| **Script** | `banquet-pilot/tests/evidence/scripts/t039-frozen-product-ui-smoke.mjs`（先审后复跑同一脚本） |
| **Script blob** | `868e350f6c9b37272b5883a5cd325de422b427e8`（worktree == tip） |
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

本环测的是**冻结正式包** dist 演示路径 UI 短冒烟（CDP mouse-sim），不得改 dist。锚点匹配，未 BLOCKED。

---

## 2. Environment

| Item | Value |
|------|-------|
| Host | Grok Bot box (Linux) |
| Node | v20.19.2 |
| Chrome | 151.0.7922.169 headless=new（CDP `Input.dispatchMouseEvent`） |
| Command | `cd banquet-pilot && node --experimental-websocket tests/evidence/scripts/t039-frozen-product-ui-smoke.mjs` |
| Window (UTC) | 2026-09-12T08:40:45Z → 08:41:07Z |
| Exit code | `0` |
| Banner | L01 place / undo / switch→L02 place / L03 calm miss / L03 calm hit 均 `[PASS]`；真机/多指记未测 |
| 作者证据审读 | PASS（`evidence/t039-frozen-product-ui-smoke/`：放撤切关+L03安心铃；expected 73182 / 19b8e65… 与冻结锚点一致） |
| **真机 / 多指 / 触屏** | **未测**（CDP ≠ 真机；不得 PASS） |

---

## 3. 用例矩阵（PASS / FAIL / BLOCKED / 未测）

独立复跑同一脚本 + 抽检截图；不照搬作者 T-039 自测结论。

| ID | 用例 | Result | 备注 / 证据 |
|----|------|--------|-------------|
| UI-PLACE | 放：L01 fox→A1 | **PASS** | assignment.fox=A1；shot `02_L01_placed.png` |
| UI-UNDO | 撤：撤销后空桌 | **PASS** | assignment 清空；shot `03_L01_undo.png` |
| UI-SWITCH | 切：L01→L02 + 放置 | **PASS** | levelId=L02；fox→A1；shot `04_L02_ok.png` |
| UI-BELL-MISS | L03 安心铃误投 fox | **PASS** | 库存不扣；shot `05_L03_miss.png` |
| UI-BELL-HIT | L03 安心铃命中 rabbit | **PASS** | stock-1；calm含rabbit；shot `06_L03_hit.png` |
| DEV | 真机 / 多指 / 实体触屏 | **未测** | 无实体机；CDP mouse-sim ≠ 真机 |

证据：`banquet-pilot/evidence/t040-frozen-product-ui-smoke/`（NOTES / command / rerun-stdout / shots / dist-proof / script-summary）。

---

## 4. 缺陷（P0–P3）

| Severity | Findings |
|----------|----------|
| P0 | 无 |
| P1 | 无 |
| P2 | 无 |
| P3 | 无 |

说明（非缺陷）：短冒烟以 CDP mouse-sim 覆盖放/撤/切关/L03安心铃；真机触屏手感仍属未测。

---

## 5. 已测 / 未测

**已测**

- 冻结产品 dist 锚点（SHA / bytes / sha256 / LF / blob）复跑前后一致
- 先审 T-039 脚本与作者证据，再独立复跑同一脚本（exit 0）
- 放 / 撤 / 切关 / L03 安心铃（误投+命中）共 5 步全部 PASS
- 抽检复跑截图 01–06 与脚本 summary.results

**未测（明确）**

- 真机
- 多指 / physical multitouch
- 合 PR / 升正式宣称（本环禁止改 dist）

---

## 6. Verdict

放/撤/切关/L03安心铃均 **PASS**；真机/多指记 **未测**（不记 PASS）。无 P0–P3。产品 dist 未改。exit code `0`。

**VERDICT: PASS**（冻结产品 L01–L03 UI 短冒烟视角。ACCEPT 由主导落盘。作者自测 ≠ 独立验收。）

---

## 7. 经验一行

正式三关样片界面短冒烟顺——放撤切关与 L03 安心铃全绿；真机触屏仍未测，正式包仍冻结。

---

## 8. Paths

- Report: `banquet-pilot/reports/qa/T-040-frozen-product-ui-smoke-20260912.md`
- Summary: `banquet-pilot/reports/qa/T-040-frozen-product-ui-smoke-summary.json`
- Evidence: `banquet-pilot/evidence/t040-frozen-product-ui-smoke/`
- Author contrast: `banquet-pilot/evidence/t039-frozen-product-ui-smoke/`
- Script: `banquet-pilot/tests/evidence/scripts/t039-frozen-product-ui-smoke.mjs`

— agent:宴席·质检 role:BOT · T-040 / #46
