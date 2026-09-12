# 生动分层可动素材（T-067 / #73）

路径：`candidates/presentation-sample/assets/vivid/`
风格：GenerateImage 正式感；品红抠透明 PNG。
正式三关 / `/frozen/` **未动**。不加新规则。

## 结构

| 目录 | 内容 |
|------|------|
| `fox/` `rabbit/` `crane/` | **身/头/肢套件** + **过渡态全身** + **换头表** |
| （根目录 `*_idle.png` 等） | 工程 T-068 分帧 strip 占位，可另合；本单主交付为子目录分层 |

## 每角色文件

| 文件 | 用途 |
|------|------|
| `parts_kit.png` | 身（无头）+ 头 + 左右肢 横排可裁切叠放 |
| `heads.png` | 情绪换头：中性 / 怒或尴尬 / 开心（同角色同比例） |
| `pose_sit.png` | 坐下 |
| `pose_rise.png` | 起身过渡 |
| `pose_walk.png` | 走路 / 侧身 |
| `pose_refuse.png` | 拒坐站立（抱臂）；狐·兔有 |
| `pose_mad.png` / `pose_greet.png` | 情绪与身体同拍（非只换脸） |

### 狐 `fox/`
`parts_kit` · `heads` · `pose_sit` · `pose_rise` · `pose_walk` · `pose_refuse` · `pose_mad`

### 兔 `rabbit/`
`parts_kit` · `heads` · `pose_sit` · `pose_rise` · `pose_walk` · `pose_refuse` · `pose_greet`

### 鹤 `crane/`
`parts_kit` · `heads` · `pose_sit` · `pose_rise` · `pose_walk`

## 工程合入约定

1. **优先用全身过渡态**做状态机切换；`parts_kit`/`heads` 供伪 3D 部件叠放或后续裁切。
2. 与 T-068 strip 并存时：strip 管帧动画；本目录管高清单帧/部件。
3. 叠放顺序：身 → 肢 → 头；fx 最上。

## 浏览

`catalog.html`（本目录）
