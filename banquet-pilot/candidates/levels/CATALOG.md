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
| C07 | 铃只有一次机会 | stub | — | calm timing / single stock | 0.1 | TBD |
| C08 | 谁先入座 | stub | — | constrained `at` chain | 0.1 | TBD |
| C09 | 隔位不算旁边 | stub | — | `not_beside` geometry clarity | 0.1 | TBD |
| C10 | 两排各自成局 | stub | — | dual-row composition | 0.1 | TBD |
| C11 | 安心之后还要换 | stub | — | calm + post-move checks | 0.1 | TBD |
| C12 | 小满桌收官 | stub | — | mixed rules capstone (design only) | 0.1 | TBD |

## Legend

- **brief+enum (shipped-ref)** — C01–C03 briefs (T-008) + candidate JSON drafts + enum counts (T-009) under `candidates/levels/`; still not formal `levels/`.
- **brief+enum** — C04–C06 briefs (T-010) + candidate JSON drafts + enum counts (T-011); multi-solution OK where design allows; still not formal `levels/`.
- **stub** — teaching goal + suggested rule mix + open questions only; no `known_solution`, no claim of unique solvability.
- **TBD** solution count — unknown until a dedicated enumerate task; C07–C12 remain TBD.
- Machine-checkable drafts: `c01.json`–`c06.json`; runner: `enumerate_candidates.py` (+ `.mjs`).

## Baseline §13 mapping (C04–C06)

| ID | Baseline title | Design intent (intent only) | Enum (T-011) |
| --- | --- | --- | --- |
| C04 | 自由入席 | 减少固定席，接受多个合法解 | **8** / 720 |
| C05 | 两位都想靠边 | 多个端位需求；靠排除与对面组合 | **2** / 720 |
| C06 | 隔桌传话 | 两组对面关系；视觉关系线不混乱 | **4** / 720 |

## Next gates (out of this slice)

1. Human / lead picks which stubs get JSON drafts, enum, or engineering promotion.
2. Each promoted level needs enumerate/tests evidence before touching `levels/`.
3. Style lock remains separate from level design.
