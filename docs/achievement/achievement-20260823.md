# Achievement 2026-08-23 — subagent 目录 UI 缺失（丢失 subagent 状态）根因修复

- **技能**: bug-hunter-fractal v2.0（L0→L5 五层递归 + 子 Agent 独立验证）
- **排查报告**: [docs/debug/bug-hunt-20260823.md](../debug/bug-hunt-20260823.md)

## 问题

后台 `subagent` 工具调用启动后，DSH Web GUI 完全看不到 subagent 相关界面（无目录入口、无法打开子代理会话）。用户反馈出现在 dsh-chat-focus v0.5.0 / 宿主 dsh-v0.1.1-rc.2 之后。

## 根因

fork 通过 `cordis.patch.yml` 禁用宿主 ui-conversation 并整体替换。上游在 fork 分叉点（rc.5）之后新增了 `conversation.session.header.lineage` 子插槽（声明于 ui-conversation apply.ts children 表，渲染于 ConversationSession 面包屑），ui-subagent 的目录组件 SubagentHeaderLineage 经 `slots.inject` 等待该声明才注册；SlotRegistry.inject 对未声明插槽**静默等待**（runtime slots.ts:172）→ 目录 UI 永不挂载。

## 修复（恢复与上游逐字节等价的契约）

| 文件 | 变更 |
|------|------|
| `src/client/contract/slots.ts` | 新增 `ConversationHeaderLineageOwnerProps`、SlotMap lineage 行、header props renderSlot 联合 |
| `src/client/apply.ts` | header children 表补 `'conversation.session.header.lineage': { kind: 'single', scope: 'session' }` |
| `src/client/skeleton/ConversationSession.tsx` | Breadcrumb 增加 `subagent` 标记；按上游在 `(last \|\| subagent)` 面包屑渲染 lineage 插槽（fallback=标题按钮/null） |
| `src/client/skeleton/ConversationRoot.module.css` | 补 `.crumbSubagent` 样式 |

## 验证

- `tsc --noEmit` 0 错误；decl + tsdown bundle 构建成功；`test:engine` 全部通过
- 子 Agent 独立审查：**PASS**（三方对齐 owner props、fallback 语义一致、无重复声明）

## 遗留/建议

- 需重启 Web GUI（或重载插件 bundle）使新 `lib/client.js` 生效后实测目录按钮。
- 后续可考虑：升级宿主时 diff 上游 children 声明表；把 ui-subagent 等 `slots.inject` 目标键当作必须持续供给的契约面。
