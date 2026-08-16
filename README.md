# dsh-chat-focus

dsh web 对话界面插件：将文本回复之前的**连续运行时信息**（工具调用、思考、重试等）收纳进可展开的折叠框，文本回复以**聊天气泡**呈现，设置面板可配置。独立仓库分发，**宿主源码零改动**（以 bundle 补丁层替换宿主 `ui-conversation` 行）。

实现形式：复制宿主 `@deepseek-ai/dsh-client-ui-conversation`（rc.5 基线）并改造 chat 域（分组引擎 / 气泡 / 折叠框）+ 扩展设置 schema。

[English README](./README.en.md)

## 功能

- **折叠运行时信息**：每条文本回复之前的连续运行时节点（tool-call、思考、retry、context、command、compaction 等）收进一个可展开的折叠框；**思考内容（think）也收纳在折叠框内**，不再单独占行
- **最近 N 个回复保持展开**：`focusKeepVisible` 语义为「保持展开的最近回复数」——最近 N 个聊天气泡对应的运行时信息默认展开，这 N 个之前的旧运行时信息全部折叠；流式中尚未有回复的活动也保持可见
- **聊天气泡**：助手回复左侧气泡（DeepSeek 鱼形 logo + HH:MM 时间，跨天显示日期），默认样式与用户气泡一致（DeepSeek 主题蓝、22px 圆角）；用户消息沿用宿主气泡
- **折叠框摘要**：分类计数（工具/思考/其他）+ 去重工具名列表（最多 5 个）；展开状态按组持久化（localStorage，策略变化自动失效旧状态）
- **高度自定义**（设置页『对话显示』→ 外观）：
  - 助手气泡 9 项：背景色、边框色、圆角、最大宽度、背景图片、文字颜色、字体、字号、内边距（任意 CSS 值）
  - 用户气泡 3 项：背景色、文字颜色、字体
  - 6 套内置模板一键套用：默认 / 浅蓝 / 薄荷绿 / 渐变 / 暗夜 / 纹理
  - 实时预览：折叠框 + 助手气泡 + 用户气泡三段示例

## 安装

宿主提供官方插件管理命令 `dsh plugin --profile <name> <pnpm args...>`（pnpm 转发 + 自动把声明 `dsh.bundle` 的依赖加入 `dsh.profile.bundles` 层列表）。

一键脚本（推荐，含备份与校验）：

```sh
node scripts/install.mjs          # 默认 web profile
node scripts/install.mjs --profile web --plugin-path E:\dsh-chat-focus
```

等价手动步骤：

```sh
pnpm run bundle                                                  # 先构建 lib/client.js
dsh plugin --profile web add "link:E:\dsh-chat-focus"            # 安装并自动加入 bundle 层
# 重启 dsh web
```

bundle 的 patch 层（`cordis.patch.yml`）由 loader 自动应用：宿主 `ui-conversation` 行被禁用，`chat-focus` 行挂载 fork；其他宿主插件（ui-tool、ui-plan、ui-commands 等）注册进 fork 声明的同名槽位，功能不变。

## 卸载

```sh
node scripts/uninstall.mjs                 # 保留设置字段残留（无害）
node scripts/uninstall.mjs --clean-settings  # 同时清理 settings.yaml 的 focus* 字段
```

等价手动步骤：`dsh plugin --profile web remove dsh-chat-focus` + 重启。

移除 bundle 层后，宿主 `ui-conversation` 行自动恢复（补丁层机制：层不应用即回到宿主行）。残留（均无害）：设置文件 `ui-conversation` 命名空间中的 focus 字段（宿主 schema 放行未知键，`--clean-settings` 可清理）；localStorage `dsh.chat-focus.fold.*`（浏览器端）。会话记录零污染（插件仅 UI 渲染，不写 session log）。

## 配置

设置字段（命名空间 `ui-conversation`，扩展 schema；宿主 api-proxy 白名单已放行）：

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| focusEnabled | boolean | true | 总开关；关闭后对话按原始顺序显示 |
| focusBubbles | boolean | true | 聊天气泡 |
| focusKeepVisible | number(0-10) | 1 | 保持展开的最近回复数 N |
| focusDefaultOpen | boolean | false | 折叠框默认展开 |
| focusSummary | boolean | true | 折叠框摘要（计数+工具名） |
| focusStrategy | keep-recent/threshold/always | keep-recent | 折叠策略（v0.1 仅实现 keep-recent；其余选项禁用并标注即将上线） |
| focusBubbleStyle | default/compact | default | 气泡密度 |
| focusReasoning | boolean | true | 纯思考步骤纳入运行时组折叠 |
| focusBubbleBg / Border / Radius / MaxWidth / BgImage | string | '' | 助手气泡自定义（背景色/边框色/圆角/最大宽度/背景图） |
| focusBubbleTextColor / Font / FontSize / Padding | string | '' | 助手气泡文字自定义（颜色/字体/字号/内边距） |
| focusBubblePreset | string | '' | 气泡模板 id |
| focusUserBubbleBg / TextColor / Font | string | '' | 用户气泡自定义（背景色/文字颜色/字体） |

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
| rc.5（2026-08-16 基线） | 0.1.0 | 当前基线 |

宿主升级后按以下流程适配：
1. 逐项核对 `docs/design/ui-design-20260816-dsh-chat-focus-模块1-基底复制域.md` §2.3 槽位契约保持表（21 槽位 + `conversation` 服务 + 节点数据模型）；
2. 更新 `tsconfig.json` 的 paths（lib/types 入口可能变化）；
3. `pnpm run typecheck && pnpm run bundle`，并在宿主环境做 test:gui 同构冒烟；
4. 更新本表。

宿主处于 pre-release（契约随时可漂移）——若适配成本超出维护能力，备选方案（视图附加型，零手术纯插件行）见 `docs/design/solution-design-20260816-dsh-chat-focus-备选方案-视图附加型.md`。

## 已知限制（v0.1）

- `focusStrategy` 的 `threshold`/`always` 未实现（设置页禁用，历史值按 keep-recent 降级）
- 设置页预览为内置示例数据（settings.section 为 root scope，无会话数据通道；v0.2 通过 inject 提供真实会话通道）
- 折叠框内节点列表为普通渲染（内部滚动容器；窗口虚拟化与行高校准为 v0.2 项）
- 用户气泡为宿主渲染，可自定义背景色/文字颜色/字体（经 CSS 变量继承），圆角/字号等宿主固定值暂不可调

## 许可证

MIT。fork 自 `@deepseek-ai/dsh-client-ui-conversation`（MIT），保留上游版权声明。
