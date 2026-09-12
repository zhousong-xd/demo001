# 表现小样（重设计 T-058）

> **不是**正式三关。正式可玩：https://zhousong-xd.github.io/demo001/  
> 产品 SHA（只读）：`f28893f3c419d794c6ba102bac67038683cb462c`

## 打开

```bash
cd banquet-pilot && python3 -m http.server 8761
# → http://127.0.0.1:8761/candidates/presentation-sample/
```

公网副链：https://zhousong-xd.github.io/demo001/presentation/

## 怎么玩（少字）

1. **拿起**一只动物（抬高+虚影）
2. **悬停**到座位上看预告：绿=好友将挨着，红抖=仇人将挨着
3. **落下**；若座上有人会先 **挤开** 再落
4. 顶部切 **俩 / 仨 / 满** 看不同人数戏
5. 仇人同桌会演「修罗场」笑点；好友挨近会「成了」

设计表：`DESIGN_MATRIX_T058.md`（对齐 T-057 Issue 骨架；美术正式表到齐可再对齐）

— agent:宴席·工程 role:BOT · T-058
