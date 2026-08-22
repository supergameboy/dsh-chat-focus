# dsh-chat-focus

dsh web 对话界面插件：将文本回复之前的**连续运行时信息**（工具调用、思考、重试等）收纳进可展开的折叠框，文本回复以**聊天气泡**呈现，设置面板可配置。独立仓库分发，**宿主源码零改动**（以 bundle 补丁层替换宿主 `ui-conversation` 行）。

实现形式：复制宿主 `@deepseek-ai/dsh-client-ui-conversation`（rc.5 基线）并改造 chat 域（分组引擎 / 气泡 / 折叠框）+ 扩展设置 schema。

[English README](./README.en.md)

## 功能

- **折叠运行时信息**：每条文本回复之前的连续运行时节点（tool-call、思考、retry、context、command、compaction 等）收进一个可展开的折叠框；**思考内容（think）也收纳在折叠框内**，不再单独占行
- **最近 N 个回复保持展开**：`focusKeepVisible` 语义为「保持展开的最近回复数」——最近 N 个聊天气泡对应的运行时信息默认展开，这 N 个之前的旧运行时信息全部折叠；流式中尚未有回复的活动也保持可见
- **三种折叠策略**（设置页可选）：最近 N 个回复展开（keep-recent）/ 阈值折叠（条目数超过 N 才折叠，threshold）/ 全部折叠（always）
- **聊天气泡**：助手回复左侧气泡（DeepSeek 鱼形 logo + HH:MM 时间，跨天显示日期），默认样式与用户气泡一致（DeepSeek 主题蓝、22px 圆角）；用户消息沿用宿主气泡
- **折叠框摘要**：分类计数（工具/思考/其他）+ 去重工具名列表（最多 5 个）；展开状态按组持久化（localStorage，策略变化自动失效旧状态）；长运行时组**窗口化渲染**（虚拟列表，恒定渲染成本）
- **高度自定义**（设置页『对话显示』→ 外观）：
  - 助手/用户气泡各 14 项：背景色、边框色、圆角、最大宽度、背景图片、背景适配（cover/contain/stretch）、文字颜色、字体、字号、内边距（任意 CSS 值）——两侧同构，均可独立设置
  - 字体下拉预设（真实存在、视觉差异明显）：跟随主题 / 楷体 KaiTi / 宋体 SimSun / 黑体 SimHei / 微软雅黑（≈默认）/ 衬线 Georgia / 等宽 Consolas
  - 字号预设：12 / 14 / 16 / 18 / 20 / 24px（16px 为主题默认）
  - 背景图片支持**本地上传 + 裁剪弹层**（拖拽移动/缩放裁剪框，canvas 导出，上传自动压缩 ≤1200px、≤2MB），自动 `url()` 包装保证生效
  - 渐变编辑器：启用渐变背景（起始/结束颜色 + 角度），与背景图片互斥（设置图片自动关闭渐变）
  - 6 套内置模板一键套用：默认 / 浅蓝 / 薄荷绿 / 渐变 / 暗夜 / 纹理
  - 助手气泡/用户气泡设置块可**折叠/展开**；下方有**恢复默认**按钮
- **上下分栏设置面板**：上方分组设置可滚动，下方实时预览（折叠框 + 助手气泡 + 用户气泡三段示例）**固定可见**，滚动到任何位置都能看到效果
- **渲染错误边界**：某行渲染异常时显示错误卡片而非整面板白屏，可刷新恢复

## 效果截图

| 对话界面：折叠运行时信息 + 聊天气泡 | 设置面板：上下分栏 + 固定实时预览 |
| --- | --- |
| ![对话界面](https://raw.githubusercontent.com/supergameboy/dsh-chat-focus/master/docs/screenshots/conversation.png) | ![设置面板](https://raw.githubusercontent.com/supergameboy/dsh-chat-focus/master/docs/screenshots/settings.png) |

## 安装

宿主提供官方插件管理命令 `dsh plugin --profile <name> <pnpm args...>`（pnpm 转发 + 自动把声明 `dsh.bundle` 的依赖加入 `dsh.profile.bundles` 层列表）。

从 npm 安装（推荐）：

```sh
dsh plugin --profile web add dsh-chat-focus
```

本地开发方式（一键脚本，含备份与校验）：

```sh
node scripts/install.mjs          # 默认 web profile
node scripts/install.mjs --profile web --plugin-path E:\dsh-chat-focus
```

等价手动步骤（本地方式）：

```sh
pnpm run bundle                                                  # 先构建 lib/client.js
dsh plugin --profile web add "link:E:\dsh-chat-focus"            # 安装并自动加入 bundle 层
# 重启 dsh web
```

bundle 的 patch 层（`cordis.patch.yml`）由 loader 自动应用：宿主 `ui-conversation` 行被禁用，`chat-focus` 行挂载 fork；其他宿主插件（ui-tool、ui-plan、ui-commands 等）注册进 fork 声明的同名槽位，功能不变。

**注意：安装之后需要重启dsh**

## 卸载

官方命令形式（推荐）：

```sh
dsh plugin --profile web remove dsh-chat-focus   # 移除依赖 + bundle 层，重启后宿主 ui-conversation 行自动恢复
```

一键脚本（node 全平台，含备份、残留校验与可选设置清理）：

```sh
node scripts/uninstall.mjs                 # 内部即执行 dsh plugin --profile web remove dsh-chat-focus；保留设置字段残留（无害）
node scripts/uninstall.mjs --clean-settings  # 同时清理 settings.yaml 的 focus* 字段
```

移除 bundle 层后，宿主 `ui-conversation` 行自动恢复（补丁层机制：层不应用即回到宿主行）。残留（均无害）：设置文件 `ui-conversation` 命名空间中的 focus 字段（宿主 schema 放行未知键，`--clean-settings` 可清理）；localStorage `dsh.chat-focus.fold.*`（浏览器端）。会话记录零污染（插件仅 UI 渲染，不写 session log）。

## 与 dsh-web-ui-all（皮肤）共存

已知冲突：**切换皮肤后宿主启动报错** `failed to parse overlay .../cordis.patch.yml: YAMLException: end of the stream or a document separator is expected`。

原因：profile 启动补丁模板自带一个 `[]` 占位；皮肤管理（`dsh-client-ui-skin-center`）把皮肤行**追加**到占位之后——YAML flow 序列后面不能跟顶层行，解析失败。皮肤管理器本身对"无占位的补丁文件"完全正常（与 dsh-chat-focus 无关，任何 profile 都会触发）。

修复（一次性，幂等；**不修改第三方包**，升级 web-ui-all 不受影响）：

```sh
node scripts/patch-skin-center.mjs          # 默认 web profile
node scripts/patch-skin-center.mjs --profile web
```

脚本移除 profile 补丁文件里的 `[]` 占位（自动备份 `.bak`）。**修改后需重启 dsh web**——之后皮肤切换写入的都是合法 YAML，皮肤功能正常。

## 设置说明

入口：右上角 **设置** → **对话显示**。面板为**上下分栏**：上方为分组设置（可滚动），下方为实时预览（固定可见，滚动到任何位置都能看到效果）。

### 基础

- **插件开关**：关闭后对话按原始顺序显示（运行时信息不再折叠、无气泡）
- **聊天气泡**：文本回复以气泡呈现；关闭则按宿主原始样式显示

### 折叠

- **最近 N 个回复展开**：最近 N 个聊天气泡对应的运行时信息默认展开，更早的自动折叠（流式中尚未有回复的活动保持可见）
- **折叠框默认展开**：勾选后所有折叠框默认展开
- **折叠策略**：最近 N 个回复展开（默认）/ 阈值折叠（条目数超过 N 才折叠）/ 全部折叠
- **思考纳入折叠**：纯思考步骤（无文本回复）并入运行时组折叠，不单独占行

### 外观

- **气泡模板**：默认 / 浅蓝 / 薄荷绿 / 渐变 / 暗夜 / 纹理——一键套用组合，之后仍可微调
- **渐变**：勾选「启用渐变背景」→ 起始/结束颜色（色盘 + 文本框）+ 角度（步进 15°）；启用后覆盖背景图片（上传图片会自动关闭渐变）
- **助手气泡 / 用户气泡**（标题可折叠/展开，各 14 项同构）：
  - 背景色、边框色：色盘 + 文本框
  - 圆角、最大宽度：预设下拉（圆角 10/14/18/22px；宽度 480/600/720/840px）+ 自定义
  - 背景图片：「上传」→ 裁剪弹层（拖动/缩放手柄 + 网格，导出 ≤1200px）→ 确定；或直接粘贴 URL；「清空」移除
  - 背景适配：cover（铺满裁剪）/ contain（完整显示）/ stretch（拉伸）
  - 文字颜色：色盘 + 文本框
  - 字体：下拉预设（跟随主题 / 楷体 / 宋体 / 黑体 / 微软雅黑 / 衬线 / 等宽）
  - 字号：12 / 14 / 16 / 18 / 20 / 24px（16px 为主题默认，选它不会有视觉变化）
  - 内边距：6x10 / 10x14 / 14x18px + 自定义
  - 「恢复默认」：一键清空该侧全部自定义
- **实时预览**：折叠框 + 助手气泡 + 用户气泡三段示例，所有修改即时反映

## 配置

设置字段（命名空间 `ui-conversation`，扩展 schema；宿主 api-proxy 白名单已放行）：

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| focusEnabled | boolean | true | 总开关；关闭后对话按原始顺序显示 |
| focusBubbles | boolean | true | 聊天气泡 |
| focusKeepVisible | number(0-10) | 1 | 保持展开的最近回复数 N |
| focusDefaultOpen | boolean | false | 折叠框默认展开 |
| focusSummary | boolean | true | 折叠框摘要（计数+工具名） |
| focusStrategy | keep-recent/threshold/always | keep-recent | 折叠策略（最近 N 回复展开 / 阈值折叠 / 全部折叠） |
| focusBubbleStyle | default/compact | default | 气泡密度 |
| focusReasoning | boolean | true | 纯思考步骤纳入运行时组折叠 |
| focusBubbleBg / Border / Radius / MaxWidth / BgImage / BgSize | string | '' / cover | 助手气泡自定义（背景色/边框色/圆角/最大宽度/背景图/适配模式） |
| focusBubbleTextColor / Font / FontSize / Padding | string | '' | 助手气泡文字自定义（颜色/字体/字号/内边距） |
| focusBubbleGradientFrom / GradientTo / GradientAngle | string | '' / '' / '135' | 助手气泡渐变（起始/结束颜色、角度） |
| focusBubblePreset | string | '' | 气泡模板 id |
| focusUserBubble*（Bg / Border / Radius / MaxWidth / BgImage / BgSize / TextColor / Font / FontSize / Padding / Gradient* / Preset） | string | '' / cover | 用户气泡自定义（与助手同构 14 项） |

## 构建

```sh
pnpm install        # 宿主仓库（rc.5 基线）作为跨仓库 workspace 成员提供 @deepseek-ai/* 依赖
pnpm run typecheck  # tsc --noEmit（类型契约来自宿主 lib/types 构建产物）
pnpm run bundle     # tsdown：lib/index.js（node 半区）+ lib/client.js（浏览器 bundle）
pnpm run test:engine # 分组引擎行为检查（tsx）
```

> 开发环境说明：`pnpm-workspace.yaml` 将 `../deepseek-harness/packages/*/*` 与 `../deepseek-harness/vendor/*` 列为 workspace 成员（精确 rc.5 契约）。若 pnpm 因跨目录 workspace 未生成 node_modules，按 `node scripts/setup-junctions.mjs` 手工链接构建依赖。**不要**在本仓库运行会改写宿主 node_modules 的 pnpm 命令。

## 版本配对（上游适配）

| 宿主版本 | fork 版本 | 说明 |
|---------|----------|------|
| rc.5（2026-08-16 基线） | 0.2.0 | 当前基线（v0.2：折叠策略全模式、背景图上传/裁剪/适配、折叠框虚拟化） |

宿主升级后按以下流程适配：
1. 逐项核对 `docs/design/ui-design-20260816-dsh-chat-focus-模块1-基底复制域.md` §2.3 槽位契约保持表（21 槽位 + `conversation` 服务 + 节点数据模型）；
2. 更新 `tsconfig.json` 的 paths（lib/types 入口可能变化）；
3. `pnpm run typecheck && pnpm run bundle`，并在宿主环境做 test:gui 同构冒烟；
4. 更新本表。

宿主处于 pre-release（契约随时可漂移）——若适配成本超出维护能力，备选方案（视图附加型，零手术纯插件行）见 `docs/design/solution-design-20260816-dsh-chat-focus-备选方案-视图附加型.md`。

## 已知限制（v0.2）

- 设置页预览为内置示例数据（settings.section 为 root scope，无会话数据通道；真实会话预览按反馈暂缓）
- 折叠框虚拟化使用估算行高（固定 56px 行距），行高校准（ResizeObserver 实测）为 v0.3 项
- 字体预设依赖系统字体：楷体/宋体/黑体在 Windows 与 macOS 均内置，Linux 可能缺失（缺字体时回退到系统默认）

## 许可证

MIT。fork 自 `@deepseek-ai/dsh-client-ui-conversation`（MIT），保留上游版权声明。
