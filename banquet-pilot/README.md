# Banquet Pilot — 规则内核（T-002）

纯规则与三关数据。**没有 UI**，不依赖浏览器、网络、随机数或大模型。无第三方依赖（仅 Python 3 标准库）。

## 目录

```
banquet-pilot/
  levels/          L01 / L02 / L03 JSON 关卡数据
  src/core/        几何、规则判定、校验、静态枚举
  tests/           单元测试与枚举脚本
  README.md
```

## 六种规则

| kind | 含义 |
| --- | --- |
| `at` | 指定座位 |
| `not_beside` | 不能同排紧挨 |
| `faces` | 必须面对面（异排同列） |
| `end` | 必须端位（按本关可用席） |
| `same_row` | 必须同排 |
| `not_faces_unless` | 无指定状态时不能对面；有状态则豁免 |

判定三态：`PENDING` / `SATISFIED` / `CONFLICT`。关系对象未入座 → `PENDING`（不是冲突，也不算通关满足）。

## 运行测试

在仓库根目录：

```bash
python3 banquet-pilot/tests/test_rules.py
python3 banquet-pilot/tests/enumerate_levels.py
```

## 验收数字（静态枚举）

| 关卡 | 排列数 | 期望解数 |
| --- | --- | --- |
| L01 | 24 | 1 |
| L02 | 720 | 1 |
| L03 无铃 | 720 | 0 |
| L03 团团 calm | 720 | 1 |
| L03 其他五人分别 calm | 720 | 各 0 |

## 未包含

- 任何 UI / 拖拽 / 浏览器页面
- 依赖安装、构建系统、CI
- T-003 及后续交互与道具流程实现（本任务只提供规则与 calm 状态输入接口）
