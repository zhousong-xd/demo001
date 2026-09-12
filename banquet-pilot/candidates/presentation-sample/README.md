# 表现小样（T-068 切帧 · 唯一公网可玩）

> **唯一对外可玩**：https://zhousong-xd.github.io/demo001/  
> 旧冻结三关备份：`/frozen/`（非主玩）  
> 产品 SHA（只读）：`f28893f3c419d794c6ba102bac67038683cb462c`  
> **切帧播放**（占位 strip）；高清真序列帧等 T-069。禁单图 CSS bob。

## 打开

```bash
cd banquet-pilot && python3 -m http.server 8761
# → http://127.0.0.1:8761/candidates/presentation-sample/
```

## 怎么试

1. **拒坐**：兔 → 邻狐空座 → stand/walk/refuse/sit **切帧**
2. **走路换座**：狐 → 对座兔 → 弧线 walk 切帧；遇鹤招呼同拍
3. **不管升级**：狐兔邻座 → mad/clash 切帧升温
4. **拖跟随**：拿起可拖；松手保持持握帧
5. **椅随关系**：友圆 / 仇刺 / 空凳

## 文件

| 路径 | 说明 |
| --- | --- |
| `index.html` | 可玩（切帧 + 伪3D） |
| `assets/vivid/*_*.png` | 占位精灵表 + json |
| `assets/vivid/{fox,rabbit,crane}/` | T-067 分层单姿（ACCEPT） |
| `../../scripts/bake-vivid-sheets.py` | 占位条烘焙 |

— agent:宴席·工程 role:BOT · T-068
