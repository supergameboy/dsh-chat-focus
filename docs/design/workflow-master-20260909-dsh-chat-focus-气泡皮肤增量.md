# 工作流主控文档 - dsh-chat-focus - 气泡皮肤增量

> WF-INCREMENT（增量迭代工作流）主控文档。跨会话续跑的唯一状态载体：
> 每阶段完成 / 门禁放行 / 回溯事件立即回填本台账。

## 0. 项目画像与工作流选择

| 维度 | 判定 | 依据 |
|------|------|------|
| 项目性质 | 已有商用系统做功能增量 | dsh-chat-focus 0.3.0 已发布、已在宿主 0.1.2-alpha.5 上线运行 |
| 功能规模 | 中（3 个功能域、1 个新子系统） | 半透明气泡 / 皮肤制作器 / 设置重组 |
| 技术面 | 中高（浏览器媒体管线 + 宿主资产服务） | Canvas 抽帧、精灵动画、宿主 HTTP/RPC seam、磁盘资产库 |
| 质量属性 | 中（性能与降级要求明确） | 动态素材体积、按浏览器渲染开销、宿主不可用降级 |

**选定工作流：WF-INCREMENT**（增量迭代）。理由：本次不是新项目，而是在既有插件上做功能增量；
WF-COMPLETE/WF-LEAN 的"从零到一"链路不适用。

**自主决策声明**：本次执行处于 autonomous 模式（用户不在线，AskUserQuestion 会阻塞交付）。
fractal-designer 的"决策点必须 AskUserQuestion"约束以**三方案 + 决策记录表**形式落地：
每个效果类决策点列出 A/B/C 三套实质差异方案，Agent 按"重实现效果"原则选定并记录理由与时间戳，
全部决策记录在 [solution-design](solution-design-20260909-dsh-chat-focus-气泡皮肤增量.md) §3。

## 1. 阶段台账（门禁 G0~G8 增量版）

| 门禁 | 阶段 | 交付物 | 状态 | 定稿时间 |
|------|------|--------|------|----------|
| G0 | 影响分析 | 本文件 §2 影响面清单 | ✅ 定稿 | 2026-09-09 |
| G1 | 增量需求整理 | 需求条目并入 feature-design §1 | ✅ 定稿 | 2026-09-09 |
| G2 | 增量功能设计 | feature-design（功能清单 FEAT-101~112 + 规格卡 + 追溯矩阵） | ✅ 定稿 | 2026-09-09 |
| G3 | 增量方案设计 | solution-design（三方案 + 决策记录 D1~D8） | ✅ 定稿 | 2026-09-09 |
| G4 | 双轨汇合（UI ↔ 交互 ↔ 契约对齐） | ui-design + interaction-design + code-design 契约表 | ✅ 定稿 | 2026-09-09 |
| G5 | 全局定稿 | 设计集齐备、功能追溯矩阵回填完成 | ✅ 定稿 | 2026-09-09 |
| G6 | 增量代码设计 | code-design（模块/类型/接口契约） | ✅ 定稿 | 2026-09-09 |
| G7 | 增量任务规划 | task-plan（T1~T7） | ✅ 定稿 | 2026-09-09 |
| G8 | 回归测试设计 | test-design（TC-01~TC-27，含回归集） | ✅ 定稿 | 2026-09-09 |

## 2. 影响分析（G0）

### 2.1 受影响的既有资产

| 既有资产 | 影响类型 | 增量动作 |
|----------|----------|----------|
| `src/chat-settings.ts` | 契约扩展 | 新增 6 个持久字段（每侧：底纹不透明度 + 毛玻璃；每侧：皮肤 id），默认值/接口/schema 同步 |
| `src/client/chat/bubbles/ChatBubble.tsx` | 渲染重构 | 内容层拆为「底纹层 + 内容层」；新增 `skin` 入参 |
| `src/client/chat/bubbles/ChatBubble.module.css` | 样式重构 | 底纹层独立定位/裁剪/动画 |
| `src/client/chat/bubbles/chrome.ts` | 数据装配 | 皮肤解析 + 新增字段透传 |
| `src/client/settings/ChatFocusSection.tsx` | 拆解重构 | 845 行单文件拆为 shell + 3 面板 + 控件库 |
| `src/client/settings/focus-locale.ts` | 文案扩展 | 新增约 60 个词条（zh/en） |
| `src/index.ts`（宿主半） | 新增子系统 | 皮肤资产库服务（磁盘 + RPC + GET 路由） |
| `src/client/apply.ts` | 注入扩展 | 皮肤库 store 注入会话视图与设置页 |
| `src/client/contract/slots.ts` | 契约扩展 | `ChatNodeOwnerProps` / `ChatViewInjected` 增加 `skins` |
| `README.md` / `README.en.md` | 文档 | 功能、设置说明、卸载清理章节更新 |

### 2.2 不受影响（回归基线）

- 折叠引擎（`grouping/engine.ts`）、会话节点投影、详情面板、统计行：零改动，必须保持行为不变。
- 宿主 `ui-chat` 行停用与 bundle 补丁机制：零改动。
- `focusBubble*` 既有 14×2 字段语义与优先级：保持不变（新增字段只在皮肤/不透明度维度叠加）。

### 2.3 风险与缓解

| 风险 | 等级 | 缓解 |
|------|------|------|
| 动态素材体积撑爆设置文件 | 高 | 素材不入 settings.yaml，走宿主资产库（D4） |
| 宿主无 `connection` 服务 | 中 | 能力探测 + 制作器降级提示；静态内联背景图片路径保持可用 |
| 每个气泡多渲染一层 DOM | 中 | 底纹层仅在需要时渲染（有皮肤/不透明/毛玻璃/图片/渐变之一） |
| 视频抽帧阻塞主线程 | 中 | 逐帧 seek + 分片 await 让出事件循环 + 进度条 + 帧数上限 |
| 精灵动画与 steps() 数学错误 | 中 | 单测覆盖 `spriteKeyframes()` 的帧数→步进映射 |

## 3. 变更回溯记录

| 时间 | 事件 | 溯源 | 传播 | 门禁重验 |
|------|------|------|------|----------|
| 2026-09-09 | 初版设计集 | — | — | G0~G8 全通过 |
| 2026-09-09 | 实现期发现 `border-image-slice` 只接受无单位源像素（写 `px` 被静默丢弃，九宫格失效） | D2 调研结论 → code-design §4.3 | solution-design 调研表 + code-design 契约表 + geometry 实现 + 单测 TC-13 | G3/G6 重验 ✅ |
| 2026-09-09 | 实现期新增「静态素材归一化 ≤256px」（保证源像素=显示像素，切片数值即显示厚度） | D2 渲染机制 | code-design §4.3 + UI 设计皮肤页 + 实现 normalizeArtwork | G4/G6 重验 ✅ |
| 2026-09-09 | 交付验证（自动化 + 真实宿主 + 真实浏览器）全绿 | test-design §4 执行记录 | — | G8 重验 ✅ |
| 2026-09-09 | **用户裁决 D6**：设置页形态改为「左标签栏 + 右侧固定预览」五标签（基础/折叠/气泡外观/皮肤/高级），气泡外观用助手/用户分段开关复用同一编辑器 | 用户答复（2026-09-09 09:25） | solution-design §5 D6′ + feature-design FEAT-110 重述 + ui-design + 实现（ChatFocusSection 重写 + BasicPanel/FoldPanel/AppearancePanel/AdvancedPanel） | G3/G4/G6 重验 ✅ |
| 2026-09-09 | **用户裁决 D8**：新增运行时视频图层（`kind='video'`，静音循环 `<video>`，视口内播放）；抽帧精灵图保留为默认路线 | 用户答复（2026-09-09 09:25） | solution-design §5 D8′ + feature-design FEAT-111 + skin-contract 白名单 + skins/host Range + BubbleBackdrop VideoLayer + 制作器双路线 + 单测 TC-23~25 | G2/G3/G6 重验 ✅ |
| 2026-09-09 | 资产路由补 `Range`/`206` 支持（视频 seek/循环必需） | D8′ 视频图层 | skins/host.ts parseByteRange + 单测 TC-25 | G6 重验 ✅ |

## 4. 交付物清单（WF-007）

| # | 交付物 | 状态 |
|---|--------|------|
| 1 | 主控文档（本文件） | ✅ |
| 2 | 功能设计（FEAT-101~112 + 追溯矩阵） | ✅ |
| 3 | 方案设计（D1~D8 + 变更 D6′/D8′ + D9） | ✅ |
| 4 | UI 设计（设置重组 + 制作器） | ✅ |
| 5 | 交互设计（IX-1~IX-7） | ✅ |
| 6 | 代码设计（模块/契约/几何） | ✅ |
| 7 | 任务计划（T1~T7） | ✅ |
| 8 | 测试设计（TC-01~27 + R-01~10 + 执行记录） | ✅ |
| 9 | 实现（宿主资产库 + 客户端皮肤库 + 制作器 + 设置重组 + 内置皮肤 + 视频图层） | ✅ |
| 10 | 自动化测试（engine / skin / skin-store） | ✅ 全绿 |
| 11 | 构建（typecheck + decl + bundle） | ✅ 通过 |
