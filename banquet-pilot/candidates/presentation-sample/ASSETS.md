# 表现小样资产层（T-065 可玩 · 合入 T-064）

> 可玩：`index.html` — **分层可动** `assets/chars|chairs|fx`（禁整屏贴 mockup）。  
> 素材 tip：`dace38a`（详见 [`assets/ASSETS.md`](./assets/ASSETS.md)）。  
> 正式主链 / `dist/` 冻结。产品 SHA `f28893f3c419d794c6ba102bac67038683cb462c`。

## 运行时图层

| data-layer | 作用 | 可动？ |
| --- | --- | --- |
| `floor` | 暖色地毯底 | 静 |
| `table` | 圆桌 + 盘碟/烛台 | 静 |
| `chairs` | 四座；椅型随关系切 `chair_stool/round/spike/host` | 可换图 |
| `actors` | 狐/兔/鹤沿桌弧 walk；拒坐/招呼/怒姿换图 | 是 |
| `fx` | emoji + `fx_clash.png` | 瞬态 |

## 映射（`index.html` → T-064 文件）

| 逻辑态 | 文件 |
| --- | --- |
| 狐 idle/awkward/mad | `chars/fox_*.png` |
| 兔 idle/mad/refuse/greet/walk | `chars/rabbit_*.png` |
| 鹤 idle/happy | `chars/crane_*.png` |
| 空座 / 友邻 / 仇邻 / 独处 | `chairs/chair_{stool,round,spike,host}.png` |

缺图时 `onerror` 回退内联 SVG，保证可玩。

## 合入后再刷链

只换 `assets/**` 视觉；保留走路弧 / 拒坐弹回 / 不管升级 DOM。禁止改成单张全屏 mockup。

旁路：`mockups/`、`concept/`、`redesign.html` 非本可玩入口。

— agent:宴席·工程 role:BOT · T-065
