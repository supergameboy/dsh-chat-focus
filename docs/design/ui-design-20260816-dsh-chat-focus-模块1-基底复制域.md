# UI 设计 - dsh-chat-focus - 模块1：基底复制域

## 文档信息

| 项目 | 内容 |
|------|------|
| 模块ID | M1 |
| 创建日期 | 2026-08-16 15:55 |
| 模块类型 | 基底复制域（contract/ + base/） |
| 状态 | 草稿 |

---

## 1. 模块概述

### 1.1 在系统组合中的位置

本模块是 fork 替换型架构的**契约底座**：宿主 `@deepseek-ai/dsh-client-ui-conversation`（rc.5 基线）被本插件的 bundle 补丁禁用后，宿主全部既有插件（ui-tool、ui-plan、ui-model-selection、ui-commands、ui-input-trigger、ui-jobs、ui-message-feedback、ui-deliverables、ui-workflow-run、ui-agent-preset、session-log-export 等）的槽位注册与服务注入，都改由本模块声明的同名槽位/服务承接。槽位契约任何一处不一致，相关插件会在加载时失败。

### 1.2 决策记录

| 序号 | 时间戳 | 决策点 | 方案A | 方案B | 方案C | 用户选择 | 选择理由 |
|------|--------|--------|-------|-------|-------|----------|----------|
| 9 | 15:35 | 复制范围（引用 L0-3 决策） | 最小覆盖包 | fork 替换型 | fork 替换增强版 | fork 替换增强版 | 用户指定"复制原对话模块+改造"，改造后界面即默认对话界面 |
| 10 | 15:53 | 包内组织（引用 L1-01 决策） | 最小覆盖包 | 单包域划分 | 双包分离 | 单包域划分 | 与宿主先例一致，域间无零乱依赖 |

### 1.3 消费者清单（原则3）

| 消费者 | 消费方式 |
|--------|---------|
| 宿主 ui-tool | 注册进入 `conversation.chat.node`（keyed）与 `conversation.details.tool` |
| 宿主 ui-plan / ui-model-selection | 注册进入 `conversation.input.plan` / `conversation.input.model` |
| 宿主 ui-commands / ui-input-trigger | 注册进入 `conversation.input.overlay` / `conversation.input.left/right` |
| 宿主 ui-jobs / ui-message-feedback / ui-deliverables / ui-workflow-run | `conversation.session.header.actions/utilities`、`conversation.chat.assistant-actions`、`conversation.chat.turnTail`、`conversation.chat.node` |
| 宿主 ui-agent-preset | 注入 `conversation` 服务 |
| 宿主 ui-workspace / ui-goal / ui-skill / ui-subagent / ui-user-questions | hero / dock / composer 各槽位 |

---

## 2. 复制清单（上游基线）

### 2.1 上游基线

- 宿主仓库：deepseek-harness，基线提交日期 2026-08-16（版本 rc.5）；
- 复制源包：`packages/client/ui-conversation`；
- 同步策略：fork 后上游不再自动合并；README 记录「升级适配流程」：宿主升级 → 逐项核对下方契约表与文件清单 → 更新基线版本号。

### 2.2 复制文件清单（全量复制，不改动）

| 源文件（宿主） | 复制目标（本包） | 说明 |
|---------------|-----------------|------|
| src/index.ts | src/index.ts | node 半区：settings 命名空间注册（**扩展后**见 M5） |
| src/invariant.ts | src/invariant.ts | 包不变量（名称改 @dsh-chat-focus） |
| src/submission-settings.ts | src/settings/schema.ts | **改造**：扩展为 M5 的 8 字段 schema |
| src/client/apply.ts | src/client/apply.ts | **改造**：注册 M5 设置 section、M3/M4 组件 |
| src/client/contract/* | src/client/contract/* | 原样（slots.ts 类型面） |
| src/client/conversation-nodes/* | src/client/conversation-nodes/* | 原样（节点定义与快照构建） |
| src/client/skeleton/* | src/client/base/skeleton/* | 原样（ConversationRoot/Session/Header/InputBar/DetailsPanel 等） |
| src/client/input/* | src/client/base/input/* | 原样（输入机器） |
| src/client/queue/* | src/client/base/queue/* | 原样 |
| src/client/service.ts | src/client/base/service.ts | 原样（ConversationController 服务） |
| src/client/stores.ts | src/client/stores.ts | 原样（chat store） |
| src/client/locales.ts | src/client/locales.ts | **改造**：新增 M2-M5 文案键 |
| src/client/settings/EnterBehaviorRow.* | src/client/settings/EnterBehaviorRow.* | 原样 |
| src/client/chat/MessageIconActions.* 等非改造文件 | src/client/chat/* | 原样（见 M3/M4 的改造清单） |

### 2.3 槽位契约保持表（强制，任何升级必须逐项核对）

`conversation`（single/session-maybe）、`conversation.session`（single/session）、`conversation.session.header`（single/session）、`conversation.session.header.actions/utilities`（list/session）、`conversation.composer`（chain/session）、`conversation.composer.bar`（single/session-maybe）、`conversation.input.overlay`（list/session）、`conversation.input.dock`（list/session）、`conversation.input.plan`（single/session）、`conversation.input.model`（single/session）、`conversation.composer.dock`（list/session）、`conversation.input.left/right`（list/session）、`conversation.hero.workspace`（single/root）、`conversation.hero.agentPreset`（single/root）、`conversation.view`（list/session，id=chat）、`conversation.chat.node`（keyed/session + inject turnData）、`conversation.chat.commandview`（keyed/session）、`conversation.chat.turnTail`（chain/session）、`conversation.chat.assistant-actions`（list/session）、`details`（single/session）、`conversation.details.tool`（single/session）。

> 计数口径：本表为 21 个槽位名（19 行）；宿主实际声明 24 个（另含 settings.general.item 等非 conversation 域）。下文"全接缝"即指本表全部槽位。

### 2.4 服务保持

- 提供 `conversation` 服务（ConversationController 等价物）——宿主 ui-agent-preset 硬注入，缺失则其激活失败；
- 提供 `settingsScope` 绑定、`conversationEvents`、`conversationViews` 注册（apply.ts 原样）。

---

## 3. 失败场景（原则4）

| 场景 | 表现 | 处理 |
|------|------|------|
| 宿主升级后某槽位契约漂移 | 相关插件加载失败 | README 适配流程 + 契约表逐项核对；发布前跑宿主 test:gui 同构冒烟 |
| 宿主 api-proxy 白名单变更 | 设置命名空间不可用 | settingsScope 快照 status=unavailable → 插件按默认值运行（M5） |
| fork 后宿主新增节点 kind | 新 kind 无渲染器 | 沿用宿主 fallback（JsonBlock unknown 行） |

### 3.1 卸载与回滚（已实测宿主机制）

| 层 | 动作 | 残留 | 处理 |
|----|------|------|------|
| 组合层 | 从 profile 的 bundle 列表移除本 bundle（补丁层整体不再应用）→ **宿主 ui-conversation 行自动恢复**（宿主架构：layers apply 到空条目列表，补丁按 id 定位，可叠加可移除） | 无 | 若用户以手动 patch 分发，需手动删插入行 + 恢复 disabled |
| 运行时 | 插件卸载，全部注册（槽位/服务/监听）随 fiber 自动释放 | 无 | — |
| 会话数据 | fork 仅 UI 渲染，不写 session log | 无 | — |
| 设置 | 扩展的 'ui-conversation' 命名空间字段 ×8 残留在宿主设置文件 | 无害：schemastery object 非严格模式对未声明键 `merge(result, data)` 放行（vendor/schemastery/src/index.ts L752-763），宿主恢复注册后 busyEnter 照常工作 | 可手动清理或忽略 |
| localStorage | 折叠展开状态键 `dsh.chat-focus.fold.*` | 无害（几字节） | 忽略 |
| 视图选择 | 宿主 store 残留 `view` 指向不存在视图 | 宿主 `resolveActiveView` 自动回退 chat（ui-conversation/skeleton/ConversationSession.tsx L23-30） | 无需处理 |

### 3.2 更新兼容性（pre-release 阶段适配成本）

宿主当前处于 pre-release（AGENTS.md：foundation over blast radius，契约随时可漂移）。fork 版对宿主升级的适配是**全接缝**的：§2.3 契约表全部槽位 spec + `conversation` 服务面 + 节点数据模型任一变化都可能需要 fork 发新版。缓解措施：
- README 维护**版本配对表**（宿主版本 → fork 适配版本 → 契约核对清单）；
- 发布前跑宿主 test:gui 同构冒烟（加载失败是响亮的、可测的）；
- 备选方案（视图附加型，见备选方案文档）适配面小一半且有宿主视图兜底——若更新频率超出维护能力，按备选方案文档 §4 触发条件切换。

---

## 4. 行业标准合规（原则6）

- 包结构遵循宿主 client 包规范（exports 面、dsh.client manifest、invariant 伴侣、tsdown clientBundle）；
- 测试跟随宿主测试分层（组件规格 + real-composition 测试）；
- 本模块无自定义协议；不新增命名空间（复用 'ui-conversation'，见 M5）。

---

## 5. stub 清单（原则7）

| stub 位置 | 用途 | 消除里程碑 | 消除方案 |
|-----------|------|-----------|---------|
| 无 | — | — | — |

（本模块为全量复制，不引入 stub；升级适配流程属维护流程而非 stub。）
