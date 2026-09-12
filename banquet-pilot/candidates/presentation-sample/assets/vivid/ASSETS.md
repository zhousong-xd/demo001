\# 生动精灵表（T-069 / #75 · 接 T-067 缺口）

# 生动可动素材（T-067 / #73）· 硬门槛 · T-069 同名替换

**禁止单图 CSS bob。** 交付为**水平精灵表 + json**（帧序 / fps）。

## 主交付：`sheets/`（HD 192×224 格）

| 文件 | 帧数 | 建议 fps | 帧序 |
|------|------|----------|------|
| `{who}_walk.png` | 4 | **8** | contact_L → pass_A → contact_R → pass_B |
| `{who}_idle.png` | 6 | **6** | open → open → half → closed → half → open |
| `{who}_rise.png` | 3 | **8** | sit → rising → stand |
| `{who}_sit.png` | 3 | **8** | stand → lowering → sit |
| `{who}_refuse.png` | 3 | **6** | hesitate → cross_arms → refuse_hold |

`who` ∈ `fox` / `rabbit` / `crane`。同名 `.json`：`frameW` `frameH` `count` `fpsHint` `order`。

### 怎么验「真动」
播放 `*_walk`：左右脚前后交换，臂对侧摆；一眼不是整图上下晃。

## 工程兼容：根目录 96×112 strip

`fox_walk.png` 等与 `sheets/` 同源缩小，json 含 `source` 指向 HD。可直接 `background-position` / `drawImage` 切帧。

## 模型眨眼加成

| 文件 | 说明 |
|------|------|
| `sheets/fox_idle_model.png` | GenerateImage 眨眼 4 帧 |
| `sheets/rabbit_idle_model.png` | 同上 |

**说明：** 出图模型无法稳定产出「每帧肢位不同」的走循环（易复成同姿）。走/起坐/拒坐以程序分帧精灵表为准，满足硬门槛；静姿分层仍见 `fox|rabbit|crane/` 子目录。

## 浏览

`sheets/catalog.html`
