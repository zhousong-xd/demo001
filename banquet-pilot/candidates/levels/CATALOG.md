# Level candidates catalog (design intent)

Product freeze: `f28893f3c419d794c6ba102bac67038683cb462c` (L01–L03 playable).  
This catalog does **not** assert 12 finished or implemented levels.

| ID | Title (working) | Status | Formal level | Focus (intent) |
| --- | --- | --- | --- | --- |
| C01 | 先让大家坐下 | shipped-ref | L01 | `at` + `not_beside` intro |
| C02 | 隔桌也算陪伴 | shipped-ref | L02 | `faces` + `end` + `same_row` |
| C03 | 不是所有矛盾都要换座 | shipped-ref | L03 | calm_bell + `not_faces_unless` |
| C04 | 同排也要留空隙 | stub | — | reinforce `same_row` / spacing |
| C05 | 末端不是角落而已 | stub | — | `end` with misdirection |
| C06 | 面对面的误会 | stub | — | multi-`faces` tension |
| C07 | 铃只有一次机会 | stub | — | calm timing / single stock |
| C08 | 谁先入座 | stub | — | constrained `at` chain |
| C09 | 隔位不算旁边 | stub | — | `not_beside` geometry clarity |
| C10 | 两排各自成局 | stub | — | dual-row composition |
| C11 | 安心之后还要换 | stub | — | calm + post-move checks |
| C12 | 小满桌收官 | stub | — | mixed rules capstone (design only) |

## Legend

- **shipped-ref** — documents the accepted product level; do not rewrite formal JSON here.
- **stub** — teaching goal + suggested rule mix + open questions only; no `known_solution`, no claim of unique solvability.

## Next gates (out of this skeleton)

1. Human / lead picks which stubs become real engineering tasks.
2. Each promoted level needs enumerate/tests evidence before touching `levels/`.
3. Style lock remains separate from level design.
