# 迁移记录：宿主 0.1.2-alpha.5 契约（路线 B：聊天层化）

> 2026-09-03。状态：**方案定稿、机械层已落盘、chat 层迁移待执行**。
> 背景：宿主 master 合并 0.1.2-alpha.5（2026-09-02，删除 `@deepseek-ai/dsh-client-runtime`，commit be531688f3 2026-08-22）后，dsh-chat-focus v0.2.6 客户端 bundle 里外置的 `require("@deepseek-ai/dsh-client-runtime/client")` 在新宿主模块表查无此模块，插件入口被拒载：`client-modules: require(...) missed the module table`。

## 1. 用户决策

- **路线 B**：fork 收敛为「聊天层插件」，骑在宿主 `@deepseek-ai/dsh-client-ui-conversation` 行（alpha.5 的引擎+会话框架）之上；`cordis.patch.yml` 改为 disable 宿主 **ui-chat** 行；fork 把自己的 chat 视图目标/渲染器/设置注册进引擎的 `ConversationViewSnapshotMap['chat']`（即 alpha.5 ui-chat 的现行姿态）。放弃整行替换与 fork 自持引擎（路线 A 需移植 ~2400 行引擎，已否决）。

## 2. 已落盘的机械层改动（本仓库，未提交）

| 文件 | 改动 |
|---|---|
| scripts/setup-junctions.mjs | 基线注释 rc.5→0.1.2-alpha.5；删除 dsh-client-runtime（悬空），新增 store/ui-conversation/session/llm/util-workspace-path/util-crypto/api-session-controller/api-workspace-controller 链接（已执行） |
| package.json | peer/dev 移除 `@deepseek-ai/dsh-client-runtime`，补 alpha.5 契约包；`dsh.client.inject` 删 runtime 行 |
| tsdown.config.ts | PLATFORM_MODULES 对齐 alpha.5 platform.ts（新增 `@deepseek-ai/dsh-client-store`，8 词）；删 RUNTIME_STORE_EXEMPTION；INLINE_SAFE 换成宿主现行白名单（file-reference/session/llm/tools/brand/deque/typert-protocol/util-crypto/util-values/util-workspace-path + token-meter/client + agent-presets/display） |
| tsconfig.json | 补 dsh-session/{types,surface,chunk-rows}、api-session-controller/{client,types}、api-workspace-controller/{client,types}、llm/message paths |

## 3. 关键架构事实（全部在宿主源码核实）

1. **模块表（种子词）**= `packages/client/web/src/platform.ts` 的 PLATFORM_MODULES：react 四件套 + cordis + **dsh-client-store** + ui-slots + ui-primitives。loader 的 require 只认种子词/已物化图行/已注册 factory（modules/src/client/system.ts）。
2. **runtime 包的继承者**：store 引擎 → `@deepseek-ai/dsh-client-store`（种子词，导出 defineStore/EngineStoreHandle/createSnapshotStore/SnapshotStore/ObservableSnapshot/BoundActions/shallowEqual/notifySubscribers）；表面事件 → `@deepseek-ai/dsh-session/surface`（内联）；会话门面 → `@deepseek-ai/dsh-api-session-controller/client`（ISessions/SessionFace/SessionBinding/SessionListState/SessionSummary/UseProjection/PendingSubmission/SessionSnapshot…）、`@deepseek-ai/dsh-session/types`（SessionId/SessionSeq/SessionEvent）、`dsh-workspace/types`（WorkspaceId）；工作区路径 → `@deepseek-ai/dsh-util-workspace-path`（workspaceTitleOf/resolveWorkspacePath）。
3. **类型权威**：全部节点/视图型别（AssistantBlock、AssistantMessageNode、CommandNode、CompactionSummaryNode、ContextMessageNode、SteeringMessageNode、UserMessageNode、ModelRetryNode、RunningToolCall、ToolCallBlock、ToolResultNode、TurnErrorNode、TurnMaxTokensNode、UnknownSurfaceNode、ConversationNode、PartialAssistant、ConversationLocation/Match/NodeContext/NodeDefinition、ConversationViewBuilder/ViewDefinition/TimelineSnapshot、ConversationPreviousContext、ConversationViewNode、ConversationTurnDataMap、TurnLocation、KnownContextForm、ContextProvenanceView…）由 **`@deepseek-ai/dsh-client-ui-conversation/client`** 权威导出（ui-chat contract/snapshot.ts 的再导出清单可证）。
4. **alpha.5 拆分**：ui-conversation 包 = 引擎（assembler 916 / assembly 288 / definition、event、view registry / location-index 582 / contract/conversation.ts 297）+ 会话框架（skeleton/input/queue/settings）；ui-chat 包 = 气泡视图层（chat/ 视图、conversation-nodes/ 业务定义、本地 contract/{chat-nodes,snapshot,turn-metrics,slots}、conversation-nodes/event-projection.ts 纯函数集）。ui-chat **inject** ui-conversation 行，其 snapshot.ts 以模块增广把 `ConversationViewSnapshotMap['chat']` 键进 ui-conversation/client。
5. **fork 基线**：fork src 快照早于 dsh-v0.1.1-rc.2（部分文件时间 08-16），并非 rc.2/rc.5 精确基线；fork 的定制集中在 chat 域 + settings。
6. **turn-error 语义冲突**：fork 特性「retry 链存在时抑制 terminal turn-error 行（hidden/retryTurn）」与 alpha.5 上游语义相反（上游注释：retries run inside the failing turn，model-retry 行单独渲染、不抑制）。路线 B 建议跟随上游（删除抑制逻辑），除非产品上仍要该行为。

## 4. 路线 B 执行清单（待做）

### 4.1 fork 形态（对齐 alpha.5 ui-chat 包，ui-chat 即模板）

- 保留文件（chat 域，alpha.5 版整树替换 + fork 定制重放）：
  - 上游近同（直接采用 alpha.5 ui-chat 版本）：conversation-nodes/{assistant,command,compaction,fallback,inbox,message,retry,tool,turn-error,turn-max-tokens,turn-tail,common,chat-snapshot-builder,register}.ts、chat/{ChatNodeSeat,ContextBody,ContextInjectionRow,AssistantMarkdown,turn-assistant,StatsLine?}.tsx、contract/{chat-nodes,snapshot,turn-metrics,slots,store?}.ts、conversation-nodes/event-projection.ts、stores.ts、chat-settings?/locale.ts、image-labels.ts
  - fork 定制（rc 版文件上做 import 重指 + 按 §3.2 映射；深度合并，需 App 验证）：chat/ChatView.tsx（+494 行级改动：fold/分组）、chat/MessageItem.tsx、chat/StatsLine.tsx、chat/bubbles/{ChatBubble,RuntimeFoldBox}(+module.css)、chat/grouping/engine.ts、settings/{ChatFocusSection,ImageCropper}(+css)、locales(zh 增补)、conversation-nodes/turn-error.ts（见 §3.6）
- 删除（宿主 ui-conversation 行提供，避免重复注册）：apply.ts 的 frame 半区、service.ts、stores.ts 旧版、input/*、queue/*、skeleton/*（除 chat 域相关）、contract/views.ts、contract/queue.ts、contract/composer-submission.ts、settings/EnterBehaviorRow.tsx、submission-settings.ts 如无引用
- apply.ts 重写：仿 ui-chat apply.ts（chat 视图目标注册 + 渲染器 + StatsLine dock + details 等）+ fork 设置行（ChatFocusSection 等）+ fork 的 `inject` 服务数组
- index.ts：仿 ui-chat index.ts（type-only 导出 + ChatNodeDataMap 公开合并面）

### 4.2 清单文件

- package.json `dsh.client.inject`：对齐 ui-chat 的注入行集（api-session-controller、api-workspace-controller、locale、**ui-conversation**、ui-layout、ui-renderer、ui-session、ui-settings、ui-workspace，去掉 connection/remotes/旧列表，保留 fork 需要者）
- cordis.patch.yml：`- id: ui-chat / disabled: true` + insert chat-focus（行 id 需与宿主 profile 实际行核对）
- peerDependencies：增 dsh-client-ui-conversation（+ engine 行依赖）

### 4.3 import 重指表（fork 全部 runtime/client import 的归宿，40 处已盘点）

- 引擎值/型：`defineStore/EngineStoreHandle/createSnapshotStore/SnapshotStore/ObservableSnapshot/shallowEqual` → `@deepseek-ai/dsh-client-store`
- 事件谓词：`isAppendSurfaceEvent/isReplacementSurfaceEvent` → `@deepseek-ai/dsh-session/surface`
- 纯函数助手（ui-chat 已本地化，fork 同样本地化，直接拷 alpha.5 ui-chat conversation-nodes/event-projection.ts）：`emptyAssistantBlock/isTokenDelta/toAssistantBlock/toAssistantBlocks/sessionRecallLabels/contextForm/contextProvenance/displayFailure`
- 工作区路径：`workspaceTitleOf/resolveWorkspacePath` → `@deepseek-ai/dsh-util-workspace-path`
- 会话门面型别 → `@deepseek-ai/dsh-api-session-controller/client` / `@deepseek-ai/dsh-session/types` / `@deepseek-ai/dsh-workspace/types`
- 节点/视图/引擎型别 → `@deepseek-ai/dsh-client-ui-conversation/client`（type-only）
- 设置面 `SettingsScope` → `@deepseek-ai/dsh-client-ui-settings/client`
- 本地契约：contract/chat-nodes.ts（+本地 ChatConversationViewNode 定义）与新增 contract/snapshot.ts = alpha.5 ui-chat 对应文件 verbatim（含 ConversationViewSnapshotMap['chat'] 增广）
- fork 模块增广目标从 `@deepseek-ai/dsh-client-runtime/client` → 本地 `../contract/chat-nodes.ts`（对话节点）；引擎快照增广目标 `@deepseek-ai/dsh-client-ui-conversation/client`

### 4.4 验证

1. `pnpm run typecheck` 归零
2. `pnpm run bundle`；grep lib/client.js 确认无 runtime require、external 只剩 8 平台词
3. 宿主 App 启动：插件入口不再报 `missed the module table`；会话打开后验证 chat 视图目标注册、折叠框/分组/气泡渲染、设置页皮肤项、frame（宿主 InputBar/EmptyHero）正常

## 6. B1 基座执行记录（2026-09-03，已完成）

- fork `src/client/` 已整树替换为 alpha.5 ui-chat 客户端（同形同源）；删除 frame 半区（input/queue/skeleton/service/locales/contract 旧件等），node 半区换成 ui-chat 的 src/index.ts + src/chat-settings.ts（设置命名空间 'chat'）。
- cordis.patch.yml 改为 disable 宿主 **ui-chat** 行（保留 ui-conversation 引擎行）；package.json `dsh.client.inject` 换成 ui-chat 式 9 行注入集。
- 产物验证：`tsc --noEmit` / `tsc -p tsconfig.decl.json` / tsdown 全绿；lib/client.js 外部 require 只剩 5 个平台种子词；`dsh-client-runtime` 引用 0。
- **解析层教训**：① tsdown 打包仍会读 tsconfig paths——凡带 path 映射的包若被**值导入**，会解析进 lib/types 的 d.ts 树（其内部 `.ts` 后缀 import 不可打包）。对策：值导入的内联包（token-meter/client、dsh-session/surface、dsh-util-workspace-path）在 tsdown.config.ts 用 resolveId 插件直指宿主 src；**dsh-session/types 的 path 映射已删除**（SessionSeq 是运行时构造函数，需走 junction 的 types.js），tsc/decl 经 junction 的 types 条件解析 d.ts 正常。② @types/react-dom 需 junction（script 已补）。
- 遗留（B2 回归）：tests/engine.check.ts 引用的 chat/grouping 引擎暂删，`test:engine` 待 B2 恢复后生效；fork 定制文件备份在 /tmp/fork-custom/（bubbles/、grouping/、settings/ChatFocusSection、ImageCropper、locales.ts、整个 fork chat/ 目录）。

## 7. B2 执行清单（fork 特性回归，按此顺序）

**已完成（2026-09-03 晚）**
- **分组引擎回归**：src/client/chat/grouping/engine.ts 已按 alpha.5 世界移植（用结构化 `FocusNode {key,kind,data}` 解耦——alpha 的 ChatConversationViewNode 不含 kind/data，kind/data 在 ChatNode 上）；tests/engine.check.ts 恢复，`node --import tsx/esm tests/engine.check.ts` 全过。语义与 v0.2.6 一致（user/steering→user 行；带 text 的 assistant-step→reply 且其 reasoning 块折入前置 runtime-run；turn-tail→tail；其余 kind 默认 runtime）。
- **设置 schema 扩展**：src/chat-settings.ts 在宿主 'ui-chat' 命名空间（fork 替换 ui-chat 行后归 fork 所有）加入全部 ~45 个 focus 字段（折叠策略/分组开关/reasoning 开关 + 双侧气泡皮肤字段与默认值）+ `DEFAULT_CHAT_SETTINGS` 全量默认对象；node 半区沿用现有注册自动生效；`ChatFocusSettings` 别名导出。原 'ui-conversation' 命名空间随旧 submission-settings.ts 删除（宿主 ui-conversation 行接管）。
- **折叠集成（编译绿，待实载视觉验证）**：ChatView 的 ChatNodeList 接缝已接入 `buildGroups`——runtime-run 渲染外层锚定行 + `RuntimeFoldBox`（native details、按组 localStorage 持久化、策略盐、长组虚拟化），其余行照旧走 keyed seat；`ChatFocusPolicy`（仿 TranscriptViewPolicy）在 apply 绑定 'ui-chat' 范围，`ChatViewInjected.chatFocus`（verbatim 字段，InjectFace 非 hooks 成员原样透传）下行；`ChatNodeOwnerProps.chatFocus` 让 keyed 渲染器直接订阅 store；AssistantNodeView 在 focusEnabled 时抑制气泡内 reasoning（引擎已把 thinking 折入折叠盒），避免双重渲染。locale zh/en 增补 focus.fold* 三键。

- **气泡皮肤与设置页（B2d，编译绿）**：`chat/bubbles/ChatBubble.tsx`（统一双侧 chrome）+ `bubbles/chrome.ts`（`bubbleCustom`/`assistantBubbleCustom`/`userBubbleChrome` 构建器）；AssistantNodeView 在 `focusBubbles` 时把 markdown 包进 ChatBubble（role=assistant，time 取 data.time）；MessageItem 的 UserStyleBubble 增加可选 `chrome`，UserMessageNodeView 从 chatFocus store 推导，PendingSteering/SubmissionBubble 与 ChatView 的 pending 行同步接入（`pendingChrome`）。设置页 `settings/ChatFocusSection.tsx`（845 行）+ `ImageCropper.tsx` 已移植：`PropsLocale<'chat-focus'>` 独立命名空间（`settings/focus-locale.ts`，95 键 + focus.close，apply 内 `locale.register(FOCUS_NS, …)`），`settings.section` 注册 id 'chat-focus' order 20（与旧版一致），注入面 `hooks: { focusSettings }` → `useFocusSettings` + `setFocusField(field: keyof ChatSettings, value: unknown)`（ChatFocusPolicy.setField 落盘）。RuntimeFoldBox 的 `t` 放宽为结构型 `FoldBoxTranslator`（fold 三键在两个命名空间都存在），使 view（chat ns）与设置页（chat-focus ns）可共用。locale 命名空间经 contract/slots.ts 的 LocaleNamespaceMap 增广声明。

**实载反馈修复（2026-09-03，用户报告两例）**
1. **「活动中有气泡」**：B2d 把气泡包进了 AssistantNodeView（所有 assistant-step），导致折叠盒内的纯思考活动行也带气泡 chrome。修复：`isReply = blocks.some(kind === 'text')`，仅回复行（引擎同判定）套 ChatBubble；文本无回复的运行时成员在盒内以无 chrome 的思考行呈现（与 v0.2.6 一致——旧 fork 的气泡只加在 reply 组外层行）。
2. **「有活动显示不全」**（两个叠加原因）：
   - **上游 turn-process 披露冲突**：compact 转录视图（默认）会把 turn 的过程成员行 `hidden=until-found` 隐藏，而折叠盒又要显示它们 → 盒内成员集体消失。修复：fork 视图内 `compactTranscript={false}` 停用上游披露（折叠归折叠盒独占），并过滤 `turn-process` 控制器行（避免空行与计数噪声）；随之失效的宿主 `transcript-view` 设置行（settings.general.item）连同 TranscriptViewPolicy/组件/文案一并移除（schema 字段保留，持久化数据兼容）。
   - **reasoning 隐藏过宽**：`reasoningHidden = focusEnabled || …` 让盒内纯思考活动行也被隐藏（渲染为空行）→ 修复为 `focusEnabled && isReply`（回复的思考已由引擎折入前置运行组，盒内成员行的思考必须可见）。
   - 另移除 RuntimeFoldBox 的固定高度虚拟化（56px 估算对工具/思考行的真实高度严重低估，导致滚动可达范围与内容不符、长组显示不全）；现按自然高度渲染，盒内 max-height 360px 内部滚动。

**待做**
1. **宿主 app 复验**：折叠盒内活动应完整可见（含思考与工具行）、无气泡混入；回复行气泡正常；设置页『对话显示』可用。
2. 若仍有显示问题，优先核对：工具行（宿主 ui-tool 渲染器）在盒内的自适应、超长组的盒内滚动。

## 5. 备注

- 宿主 checkout 停在 0.1.2-alpha.5（HEAD 49a606bc5b）。rc 时代代码可从 tag dsh-v0.1.1-rc.2 取（含 packages/client/runtime）。
- 机械层改动未提交；下一执行会话从 §4 开始。
