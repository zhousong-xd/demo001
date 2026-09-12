# Banquet Pilot — art candidates (T-006)

最小视觉样板候选。**未导入**正式 `assets/` / `dist/` / `src/`；风格待人类可再调。程序生成（Pillow PNG + 手写 SVG），暖色纸感、清楚轮廓、统一正面视角。

产品基准 SHA（勿改）：`f28893f3c419d794c6ba102bac67038683cb462c`

## 资产表

| name | size (px) | alpha | anchor | source/license | import-verified |
| --- | --- | --- | --- | --- | --- |
| phone_layout_390x844.png | 390×844 | no (opaque paper) | top-left (full frame) | procedural / original (Pillow) | no |
| rabbit_neutral.png (+ .svg) | 128×160 | yes | bottom-center (feet ~y=148) | procedural / original | no |
| rabbit_satisfied.png (+ .svg) | 128×160 | yes | bottom-center | procedural / original | no |
| rabbit_conflict.png (+ .svg) | 128×160 | yes | bottom-center | procedural / original | no |
| seat.png (+ .svg) | 96×80 | yes | bottom-center (legs) | procedural / original | no |
| calm_bell.png (+ .svg) | 64×64 | yes | center | procedural / original | no |

## 样板说明

- **角色**：团团（`rabbit` / 兔），三态 = 中性 / 满意 / 冲突；状态环 + 角标区分，轮廓一致。
- **构图**：桌上座位 A1 放团团；安心铃置于角色旁侧，不挡脸与座位标签；规则条与底栏操作区与桌面分区。
- **候选计数**：本批 6 项（布局 1 + 角色三态 1 套 + 座位 1 + 安心铃 1）；SVG 为同内容矢量副本，不计额外候选。
- **停点**：仅候选；不替换正式资产；不扩角色数量；不宣称已实现动画。

## 文件清单

```
banquet-pilot/candidates/art/
  ASSETS.md
  phone_layout_390x844.png
  rabbit_neutral.png / rabbit_neutral.svg
  rabbit_satisfied.png / rabbit_satisfied.svg
  rabbit_conflict.png / rabbit_conflict.svg
  seat.png / seat.svg
  calm_bell.png / calm_bell.svg
```
