# 表现小样资产层（T-068 切帧播放 · 占位条）

> 可玩：`index.html` — **精灵表切帧**（`background-position`），禁单图 CSS bob。  
> 切帧条：`assets/vivid/{fox,rabbit,crane}_{idle,walk,stand,sit,...}.png` + `.json`  
> T-067 分层单姿（已 ACCEPT）：`assets/vivid/{fox,rabbit,crane}/`（pose_* / parts_kit / heads）  
> 椅/特效：`assets/chairs|fx`（T-064）  
> 正式主链 / `dist/` 冻结。产品 SHA `f28893f3c419d794c6ba102bac67038683cb462c`。  
> `/frozen/` HTML SHA256 须保持 `19b8e65bbde285719ee43d74d83fcc60cdb3709ae7cc3ccc80d3f36d45d1bcf5`。

## 硬门槛

走路 / idle / 起身 / 坐下 / 拒坐 = **切帧**。伪 3D（透视、阴影、前后遮挡、微镜头）不替代切帧。

## 盘点

| 项 | 状态 |
| --- | --- |
| T-064 chars 静帧 | 备查；运行时不拿单图 bob |
| T-067 分层单姿 | **ACCEPT**（`vivid/{char}/pose_*`）— 仍非序列帧条 |
| 真序列帧高清 | **T-069**（未到） |
| 本环占位 strip | SVG 分帧烘焙 → `vivid/*_walk.png` 等，供真切帧播放落地 1–6 |

## 烘焙

```bash
python3 banquet-pilot/scripts/bake-vivid-sheets.py
```

T-069 到位后：同名替换 strip（保持 `frameW=96 frameH=112` 与 `.json` count），或改 json 对齐新几何。

## 运行时图层

| data-layer | 作用 |
| --- | --- |
| floor / table | 伪 3D 桌面 |
| chairs | 关系椅型 |
| actors | **sprite 切帧** + 弧线位移 + 阴影/遮挡 |
| fx | 瞬态 |

— agent:宴席·工程 role:BOT · T-068
