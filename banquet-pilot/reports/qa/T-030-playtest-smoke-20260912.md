# T-030 候选 playtest 冒烟独立复核（含顶替·质检·非真机）

> Issue: https://github.com/zhousong-xd/demo001/issues/36  
> 执行：宴席·质检 · role:BOT · work:qa  
> 作者工程冒烟（T-016…T-029）≠本环独立验收。  
> ACCEPT 由主导落盘；本文件只给候选 playtest 冒烟结论（含顶替）。

---

## Versions

| Role | Value |
|------|-------|
| **Engineering tip under test** | `b00f8f84f942e6ad1b90662e9324924a25cedb2c` |
| **Product SHA (FIXED)** | `f28893f3c419d794c6ba102bac67038683cb462c` |
| **HTML path** | `banquet-pilot/dist/banquet-pilot.html` |
| **HTML size (LF bytes)** | `73182` |
| **HTML sha256** | `19b8e65bbde285719ee43d74d83fcc60cdb3709ae7cc3ccc80d3f36d45d1bcf5` |
| **LF-only / no CR** | YES |
| **Working-tree blob == product SHA blob** | YES (`c17208faa0548c34cb8cc150a5dc4bce96a61b9c`) |
| **Product modified / rebuilt** | **NO** — verified before & after smoke |
| **Script** | `banquet-pilot/candidates/playtest/smoke.mjs`（先审后跑；含 T-029 顶替） |
| **Script blob** | `f0a7eab929397781001802db5886d7a28477307b`（worktree == tip） |
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
| After smoke: dist/src still clean | PASS |

本环测的是 `candidates/playtest`（含候补顶替），不是改正式包。锚点匹配，未 BLOCKED。

---

## 2. Environment

| Item | Value |
|------|-------|
| Host | Grok Bot box (Linux) |
| Node | v20.19.2 |
| Command | `cd banquet-pilot && node candidates/playtest/smoke.mjs` |
| Exit code | `0` |
| Banner | `T-029 smoke OK: prior suite + c01 waiting-guest displace` |
| Browser / CDP | 未用 |
| **真机 / 多指 / 触屏 UI** | **未测**（不得 PASS） |

---

## 3. 用例矩阵（PASS / FAIL / BLOCKED / 未测）

独立跑通脚本实际断言（含顶替）；不照搬作者报告。

| ID | 用例 | Result | 备注 / 证据 |
|----|------|--------|-------------|
| PT-LOAD | c01–c12 加载 + 首宾入座 | **PASS** | 12/12 `evalOk=true`；stdout `results[]` |
| PT-UNDO | c01 / c04 入座→撤销→空桌 | **PASS** | `undo=restored-empty` `historyLen=0` |
| PT-BELL-MISS | c03 安心铃误投 fox | **PASS** | `invalid-target` `consumed=false` stock 仍 1 |
| PT-BELL-HIT | c03 安心铃命中 rabbit | **PASS** | `applied` stock 1→0 `calm=[rabbit]` |
| PT-SWAP | c02 两宾原子交换 | **PASS** | fox↔rabbit A1↔A2 `kind=swap` |
| PT-DISPLACE | c01 候补顶替已入座 | **PASS** | fox@A1 + rabbit 候补 → rabbit@A1 / fox=null `kind=displace` |
| DEV | 真机 / 多指 / playtest UI | **未测** | 无实体机；本脚本为 node 内核冒烟，≠真机 |

证据：`banquet-pilot/evidence/t030-playtest-smoke/`（command / stdout / stderr / full-log / dist-proof / NOTES）。

---

## 4. 缺陷（P0–P3）

| Severity | Findings |
|----------|----------|
| P0 | 无 |
| P1 | 无 |
| P2 | 无 |
| P3 | 无 |

---

## 5. 已测 / 未测

**已测**

- 冻结产品 dist 锚点（SHA / bytes / sha256 / LF / blob）冒烟前后一致
- c01–c12 candidates 加载 + 首宾入座 + `evaluateLevel` ok
- c01 / c04 撤销恢复空桌
- c03 安心铃误投不扣 / 对兔生效
- c02 原子换座
- c01 候补宾客顶替已入座（T-029；kind=displace）

**未测（明确）**

- 真机
- 多指 / physical multitouch
- `candidates/playtest/index.html` 浏览器 UI 路径
- 正式关 / 合 PR / 升正式宣称（本环禁止）

---

## 6. Verdict

最低用例（含顶替）均 **PASS**；真机/多指/UI 记 **未测**（不记 PASS）。无 P0–P3。产品 dist 未改。

**VERDICT: PASS**（候选 playtest 冒烟视角，含顶替。ACCEPT 由主导落盘。作者自测 ≠ 独立验收。）

---

## 7. 经验一行

含顶替的候选 playtest 冒烟可在 node 内核层独立复验；正式包仍冻结，UI/真机另开环。

---

## Honesty / limits

- node kernel smoke ≠ 真机 / 触屏 / 浏览器 UI。
- 未改 `dist/`、`src/`、candidates 玩法；未装新依赖；未 merge；未升正式关。
- 未把作者 T-016…T-029 报告当作本环验收依据。

— agent:宴席·质检 role:BOT · task:T-030 · PLAYTEST SMOKE · issue:#36

## 8. 推送

- branch: `bot/banquet-pilot`
- tip: `43de9a6576828406846ccc48d85348e304aadd65`
- 仅 reports/qa + evidence；dist/src 未改
