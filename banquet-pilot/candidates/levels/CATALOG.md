# Level candidates catalog (design intent)

Product freeze: `f28893f3c419d794c6ba102bac67038683cb462c` (L01–L03 playable).  
This catalog does **not** assert 12 finished or implemented levels.

| ID | Title (working) | Status | Formal level | Focus (intent) | ruleVersion | Solution count |
| --- | --- | --- | --- | --- | --- | --- |
| C01 | 先让大家坐下 | brief-filled (shipped-ref) | L01 | `at` + `not_beside` intro | 0.1 | **TBD** |
| C02 | 隔桌也算陪伴 | brief-filled (shipped-ref) | L02 | `faces` + `end` + `same_row` | 0.1 | **TBD** |
| C03 | 不是所有矛盾都要换座 | brief-filled (shipped-ref) | L03 | calm_bell + `not_faces_unless` | 0.1 | **TBD** |
| C04 | 同排也要留空隙 | stub | — | reinforce `same_row` / spacing | 0.1 | TBD |
| C05 | 末端不是角落而已 | stub | — | `end` with misdirection | 0.1 | TBD |
| C06 | 面对面的误会 | stub | — | multi-`faces` tension | 0.1 | TBD |
| C07 | 铃只有一次机会 | stub | — | calm timing / single stock | 0.1 | TBD |
| C08 | 谁先入座 | stub | — | constrained `at` chain | 0.1 | TBD |
| C09 | 隔位不算旁边 | stub | — | `not_beside` geometry clarity | 0.1 | TBD |
| C10 | 两排各自成局 | stub | — | dual-row composition | 0.1 | TBD |
| C11 | 安心之后还要换 | stub | — | calm + post-move checks | 0.1 | TBD |
| C12 | 小满桌收官 | stub | — | mixed rules capstone (design only) | 0.1 | TBD |

## Legend

- **brief-filled (shipped-ref)** — C01–C03 design briefs filled (T-008); still reference accepted product levels; do not rewrite formal JSON here.
- **stub** — teaching goal + suggested rule mix + open questions only; no `known_solution`, no claim of unique solvability.
- **TBD** solution count — unknown until a dedicated enumerate task; briefs must not invent counts.

## Next gates (out of this slice)

1. Human / lead picks which stubs (C04–C12) get full briefs or engineering tasks.
2. Each promoted level needs enumerate/tests evidence before touching `levels/`.
3. Style lock remains separate from level design.
