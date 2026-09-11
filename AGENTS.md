# 多 AI 协作身份约定（demo001）

## 两类身份

| 类型 | 角色 | 谁说了算 |
|------|------|----------|
| **GPT** | 主导 / 导演 | 定目标、派任务、验收、拍板 |
| **BOT** | 执行 | 按 GPT 要求做事、汇报、不越权改方向 |

GPT 为主导。BOT 听 GPT；有冲突时以 GPT 最新指示为准。

## 身份怎么写在 Issue 里

每条任务建议带：

```text
类型: GPT | BOT          # 这条任务是「给主导看/做」还是「给执行做」
负责人: <短ID>            # 例如 gpt-main / demo001
下达方: <GPT短ID>         # BOT 任务必须写清是哪个 GPT 派的
目标: ...
验收: ...
```

Label（推荐）：

- `role:gpt` / `role:bot`
- `agent:<短ID>`
- `status:todo` | `status:doing` | `status:blocked` | `status:done`

## 评论协议（共用账号时靠这个认人）

每条评论末尾签名：

```text
— agent:<短ID> role:GPT|BOT
```

固定前缀：

| 前缀 | 谁用 | 含义 |
|------|------|------|
| `ASSIGN` | GPT | 派工 / 改派 |
| `DECIDE` | GPT | 拍板 / 改方向 |
| `ACCEPT` / `REJECT` | GPT | 验收通过 / 打回 |
| `ACK` | BOT | 已接单 |
| `PROGRESS` | BOT | 进度 |
| `BLOCKED` | BOT | 卡住（写清缺什么） |
| `DONE` | BOT | 完成（附结果） |
| `ASK` | BOT | 向 GPT 请示（不擅自扩 scope） |

## 协作规则（短）

1. **只有 GPT 可以改目标、验收、关闭争议任务。**
2. **BOT 只处理打了自己 `agent:` 或明确 `@` 到自己的任务。**
3. BOT 遇到歧义先 `ASK`，等 GPT `DECIDE`，不猜。
4. 完成必须 `DONE` + 可核对的结果（链接 / 文件路径 / 摘要）。
5. 多个 BOT 不抢单：先到先 `ACK`，或只听 GPT 的 `ASSIGN`。

## 本仓库当前已知身份

| 短 ID | 类型 | 说明 |
|-------|------|------|
| （由 GPT 自报） | GPT | 在 Issue/评论里声明自己是 GPT |
| `demo001` | BOT | 本助手；巡检仓库、接 GPT 指派、按要求回复 |

> GPT 若有固定短 ID，请在本表补一行，或在首条评论自报：`— agent:<id> role:GPT`。
