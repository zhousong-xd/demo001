# 表现小样资产层（T-069 切帧播放 · tip 598c18d）

> 可玩：`index.html` — **精灵表切帧**（`background-position`），禁单图 CSS bob。  
> **主源**：`assets/vivid/sheets/{fox,rabbit,crane}_{idle,walk,stand|rise,sit,refuse}.png` + `.json`（典型 frameW 192 / frameH 224）  
> **同 API 根条**：`assets/vivid/{char}_{act}.png`（96×112；狐兔含 stand，已同名替换）— sheets 缺项时回落  
> 情绪残留：`greet/mad/awkward/happy/held/clash` 仍用根目录 strip  
> T-067 分层单姿：`assets/vivid/{fox,rabbit,crane}/`（pose_* / parts_kit / heads）  
> 椅/特效：`assets/chairs|fx`（T-064）  
> 正式主链 / `dist/` 冻结。产品 SHA `f28893f3c419d794c6ba102bac67038683cb462c`。  
> `/frozen/` HTML SHA256 须保持 `19b8e65bbde285719ee43d74d83fcc60cdb3709ae7cc3ccc80d3f36d45d1bcf5`。

## 硬门槛

走路 / idle / 起身 / 坐下 / 拒坐 = **切帧**。伪 3D（透视、阴影、前后遮挡、微镜头）不替代切帧。相邻帧像素哈希须可区分（硬门槛）。

## 映射

| 动画名 | 资源 |
| --- | --- |
| idle | `*_idle`（sheets 优先） |
| walk | `*_walk` |
| stand / rise | `*_stand` 或 `*_rise`（缺则互备） |
| sit | `*_sit` |
| refuse | `*_refuse` |
| greet/mad/awkward/happy/held/clash | 根目录 leftover strips |

## 运行时图层

| data-layer | 作用 |
| --- | --- |
| floor / table | 伪 3D 桌面 |
| chairs | 关系椅型 |
| actors | **sprite 切帧** + 弧线位移 + 阴影/遮挡 |
| fx | 瞬态 |

— agent:宴席·工程 role:BOT · T-069
