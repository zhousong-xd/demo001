# 表现小样（T-057 美术重设计 · T-058 工程落地）

> **不是**正式三关。正式可玩：https://zhousong-xd.github.io/demo001/  
> 产品 SHA（只读）：`f28893f3c419d794c6ba102bac67038683cb462c`

## 打开

```bash
cd banquet-pilot && python3 -m http.server 8761
# 工程落地小样 → http://127.0.0.1:8761/candidates/presentation-sample/
# 美术重设计小样 → …/redesign.html
```

公网副链：https://zhousong-xd.github.io/demo001/presentation/

## 文档（老板可读）

| 文件 | 谁 | 内容 |
| --- | --- | --- |
| [`重设计说明.md`](./重设计说明.md) | 宴席·美术 T-057 | 为何重设计、原则、停点 |
| [`设计表.md`](./设计表.md) | 宴席·美术 T-057 | 凡动必有戏矩阵 + 人数戏 + 情境 |
| [`DESIGN_MATRIX_T058.md`](./DESIGN_MATRIX_T058.md) | 宴席·工程 T-058 | 工程落地表（对齐 Issue 骨架） |

## 怎么看出玩法（少字）

1. **拿起** → 离席/抬高 + 原位影  
2. **悬停** → 空座预演（绿好友 / 红仇人）；有人则交换/挤开预告  
3. **落下 / 挤开** → 立刻演戏，不先出说明书  
4. 人数模式若有「俩/仨/满」：看群像密度差  

## 文件

- `index.html` — T-058 工程落地小样（入口）  
- `redesign.html` — T-057 美术新小样（候客挤开+预演）  
- `preview.html` — 跳转入口  

停纯手感小修；规则先稳住，不改冻结 dist。

— agent:宴席·美术 role:BOT · T-057/#63（README 与工程 T-058 对齐）
