# Level candidates catalog (design intent)

Product freeze: `f28893f3c419d794c6ba102bac67038683cb462c` (L01–L03 playable).  
This catalog does **not** assert 12 finished or implemented levels.

| ID | Title (working) | Status | Formal level | Focus (intent) | ruleVersion | Solution count |
| --- | --- | --- | --- | --- | --- | --- |
| C01 | 先让大家坐下 | brief+enum (shipped-ref) | L01 | `at` + `not_beside` intro | 0.1 | **1** |
| C02 | 隔桌也算陪伴 | brief+enum (shipped-ref) | L02 | `faces` + `end` + `same_row` | 0.1 | **1** |
| C03 | 不是所有矛盾都要换座 | brief+enum (shipped-ref) | L03 | calm_bell + `not_faces_unless` | 0.1 | **0** no-calm / **1** calm-rabbit |
| C04 | 自由入席 | brief+enum | — | fewer `at` / multi-solution OK | 0.1 | **8** |
| C05 | 两位都想靠边 | brief+enum | — | multiple `end` + faces exclusion | 0.1 | **2** |
| C06 | 隔桌传话 | brief+enum | — | two disjoint `faces` pairs | 0.1 | **4** |
| C07 | 一枚铃够不够 | brief+enum | — | calm_bell **target choice** (≥2 calmable) | 0.1 | **0** no-calm / **4** calm-rabbit / **4** calm-tanuki |
| C08 | 撤回来也没关系 | brief+enum | — | encourage try + **undo** (no forced path) | 0.1 | **4** |
| C09 | 同一桌的两种解 | brief+enum | — | **multiple / symmetric** legal solutions | 0.1 | **8** |
| C10 | 一个小误会 | brief | — | **pre-entry** story rule change (no mid-solve rewrite) | 0.1 | TBD |
| C11 | 合作开席 | brief | — | **multi-constraint / few anchors** (one-screen) | 0.1 | TBD |
| C12 | 掌席考核 | brief | — | **capstone** — all six kinds + calm_bell (design only) | 0.1 | TBD |

## Legend

- **brief+enum (shipped-ref)** — C01–C03 briefs (T-008) + candidate JSON drafts + enum counts (T-009) under `candidates/levels/`; still not formal `levels/`.
- **brief+enum** — C04–C06 briefs (T-010) + candidate JSON drafts + enum counts (T-011); multi-solution OK where design allows; still not formal `levels/`.
- **brief+enum** — also C07–C09 (T-012 briefs + T-013 JSON/enum); multi-solution OK; still not formal `levels/`.
- **brief** — C10–C12 (T-014); teaching goal + seats/rules sketch + tips + `ruleVersion` 0.1; solution **TBD**; no `known_solution`, no claim of unique solvability.
- **TBD** solution count — unknown until a dedicated enumerate task; C10–C12 remain TBD.
- Machine-checkable drafts: `c01.json`–`c09.json`; runner: `enumerate_candidates.py` (+ `.mjs`).

## Baseline §13 mapping (C04–C12)

| ID | Baseline title | Design intent (intent only) | Enum |
| --- | --- | --- | --- |
| C04 | 自由入席 | 减少固定席，接受多个合法解 | **8** / 720 (T-011) |
| C05 | 两位都想靠边 | 多个端位需求；靠排除与对面组合 | **2** / 720 (T-011) |
| C06 | 隔桌传话 | 两组对面关系；视觉关系线不混乱 | **4** / 720 (T-011) |
| C07 | 一枚铃够不够 | 道具的使用对象选择；≥2 可解除条件 | **0**/4/4 (T-013; wrong-target 0) |
| C08 | 撤回来也没关系 | 鼓励尝试与撤销；不强制指定步骤 | **4** / 720 (T-013) |
| C09 | 同一桌的两种解 | 接受对称或多种合法安排；结算等价 | **8** / 720 (T-013) |
| C10 | 一个小误会 | 用剧情改变**入场前**规则；禁止行动后改答案 | **TBD** |
| C11 | 合作开席 | 多约束组合但少固定席；一屏可读 | **TBD** |
| C12 | 掌席考核 | 综合运用六类规则和铃；理解而非手速 | **TBD** |

## Next gates (out of this slice)

1. Human / lead picks which briefs get JSON drafts, enum, or engineering promotion.
2. Each promoted level needs enumerate/tests evidence before touching `levels/`.
3. Style lock remains separate from level design.
4. C10–C12 solution counts remain TBD until a dedicated JSON+enum task.
