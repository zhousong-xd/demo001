# 表现小样（T-065 真实感副链可玩）

> **不是**正式三关。正式可玩：https://zhousong-xd.github.io/demo001/  
> 产品 SHA（只读）：`f28893f3c419d794c6ba102bac67038683cb462c`  
> **禁止**把整屏 mockup PNG 当成可玩。

## 打开

```bash
cd banquet-pilot && python3 -m http.server 8761
# 可玩小样 → http://127.0.0.1:8761/candidates/presentation-sample/
```

公网副链：https://zhousong-xd.github.io/demo001/presentation/

## 怎么试（一眼懂）

1. **拒坐**：点「狐」→ 点左侧空座 → 走近后弹回，气泡「不坐」（站立拒坐）
2. **走路换座**：点「狐」→ 点对座「兔」→ 角色沿桌弧走（不瞬移）；路过「鹤」会打招呼
3. **不管升级**：把狐兔换到邻座 → 进度条升温，气泡 💢→💢💢→💥；拉开则降温
4. **遇仇冲突**：走路经过仇人会「撞一下」
5. **椅随关系**：邻友→圆背绿；邻仇→尖刺红；空座→木凳

点「怎么玩」可再看提示；「开席」重置。

## 文件

| 文件 | 说明 |
| --- | --- |
| `index.html` | **可玩**入口（分层 SVG，T-065） |
| `ASSETS.md` | 图层 / `data-asset` / T-064 替换槽 |
| `assets/` | 未来美术素材目录（现占位） |
| `mockups/` | T-063 设计图（静帧，非可玩） |
| `concept/` | 概念板（静帧） |
| `redesign.html` | 旧美术小样 |

## 与 T-064

已接 `assets/chars|chairs|fx` 分层 PNG（可动层，非整屏贴图）。后续美术补姿态按 `ASSETS.md` 登记即可；**保留**走路/拒坐/升级逻辑后再刷链。

— agent:宴席·工程 role:BOT · T-065
