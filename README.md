# dsh-chat-focus

dsh web 对话界面插件：将文本回复之前的**连续运行时信息**（工具调用、思考、重试等）收纳进可展开的折叠框，文本回复以**聊天气泡**呈现，设置面板可配置。独立仓库分发，**宿主源码零改动**（以 bundle 补丁层停用宿主 `ui-chat` 气泡行，聊天层注册进宿主 `ui-conversation` 引擎与会话框架）。

> **0.4.0（2026-09-09）**：**半透明气泡**（底纹整层不透明度 + 毛玻璃）、**气泡皮肤制作器**（用自己的图片/GIF/APNG/PNG 序列帧/视频做气泡背景，静态图走九宫格切片、动态素材走整层/精灵动画/视频图层），设置页重组为**左侧标签栏 + 右侧固定预览**五页。设计文档见 docs/design/（2026-09-09 气泡皮肤增量系列）。
>
> **0.3.0（2026-09-03）**：按宿主 **0.1.2-alpha.5** 契约完成路线 B 迁移——fork 收敛为聊天层插件，骑在宿主 `ui-conversation` 引擎与会话框架之上，替换宿主 `ui-chat` 气泡行；fork 专属特性（折叠/分组/气泡皮肤/设置页）全部回归。迁移记录见 docs/experience/migration-20260903-host-0.1.2-alpha.5-route-B.md。

[English README](./README.en.md)

## 功能

- **折叠运行时信息**：每条文本回复之前的连续运行时节点（tool-call、思考、retry、context、command、compaction 等）收进一个可展开的折叠框；**思考内容（think）也收纳在折叠框内**，不再单独占行
- **最近 N 个回复保持展开**：`focusKeepVisible` 语义为「保持展开的最近回复数」——最近 N 个聊天气泡对应的运行时信息默认展开，这 N 个之前的旧运行时信息全部折叠；流式中尚未有回复的活动也保持可见
- **三种折叠策略**（设置页可选）：最近 N 个回复展开（keep-recent）/ 阈值折叠（条目数超过 N 才折叠，threshold）/ 全部折叠（always）
- **聊天气泡**：助手回复左侧气泡（DeepSeek 鱼形 logo + HH:MM 时间，跨天显示日期），默认样式与用户气泡一致（DeepSeek 主题蓝、22px 圆角）；用户消息沿用宿主气泡
- **折叠框摘要**（展开/收起不跳动：保持摘要行位置，贴底时自动回到最新）：分类计数（工具/思考/其他）+ 去重工具名列表（最多 5 个）；展开状态按组持久化（localStorage，策略变化自动失效旧状态）；长运行时组在盒内独立滚动（不撑开外层会话流）
- **高度自定义**（设置页『对话显示』）：
  - 助手/用户气泡各 16 项：背景色、边框色、圆角、最大宽度、背景图片、背景适配（cover/contain/stretch）、**底纹不透明度**、**毛玻璃**、文字颜色、字体、字号、内边距（任意 CSS 值）——两侧同构，均可独立设置
  - **半透明气泡**：底纹不透明度滑条（0~100%）作用于整层（颜色/图片/渐变），文字始终不透明；毛玻璃预设（无/弱/中/强）模糊气泡背后的内容
  - 字体下拉预设（真实存在、视觉差异明显）：跟随主题 / 楷体 KaiTi / 宋体 SimSun / 黑体 SimHei / 微软雅黑（≈默认）/ 衬线 Georgia / 等宽 Consolas
  - 字号预设：12 / 14 / 16 / 18 / 20 / 24px（16px 为主题默认）
  - 背景图片支持**本地上传 + 裁剪弹层**（拖拽移动/缩放裁剪框，canvas 导出，上传自动压缩 ≤1200px、≤2MB），自动 `url()` 包装保证生效
  - 渐变编辑器：启用渐变背景（起始/结束颜色 + 角度），与背景图片互斥（设置图片自动关闭渐变）
  - 6 套内置配色模板一键套用：默认 / 浅蓝 / 薄荷绿 / 渐变 / 暗夜 / 纹理
  - 每侧**恢复默认**按钮；皮肤接管时相关控件置灰并给出说明
- **气泡皮肤制作器**（设置页『对话显示』→ 皮肤）：
  - 五步向导：选素材 → 处理素材 → 切片与几何 → **外观与文字** → 保存并应用；右侧固定**三档长度实时预览**（短/中/长）
  - **纯参数皮肤**：源步可直接「不使用素材」，只打包样式参数成皮肤（无素材文件，设置里只保留皮肤 id）
  - 素材支持：PNG / JPG / WebP / GIF / APNG / SVG；多选 PNG 合成**序列帧**；MP4 / WebM **视频**；静态素材自动归一化 ≤256px
  - **几何步**：**背景适配**（铺满裁剪 / 完整显示 / 拉伸填满）+ **焦点**（铺满裁剪时拖动裁剪框选中必须始终可见的部分，气泡永远把该点留在可视范围内）+ 圆角 + 内容内边距
  - GIF / APNG → 保留原生动画，整层绘制（圆角裁剪 + 覆盖/拉伸）
  - 视频 → 两种路线：**抽帧合成横向精灵图**（默认，体积小、无解码开销，运行时 `steps()` 步进动画）或**直接使用视频**（静音循环 `<video>` 图层，保留原画质与时长，仅在气泡进入视口时解码、离开视口自动暂停）
  - PNG 序列帧 → 抽帧合成**横向精灵图**（帧宽/帧率/帧数可调，含进度与取消）
  - **皮肤 = 现有编辑功能的打包套用**：外观与文字步用同一套气泡编辑控件编辑打包样式（底色/渐变/边框/不透明度/毛玻璃/可读性遮罩/文字色/字体/字号），应用时与皮肤 id 一起原子写入该侧设置，之后仍可在「气泡外观」继续微调；皮肤只接管素材与其几何（九宫格/圆角/内边距）
  - 皮肤库：内置 3 套 + 自制皮肤；应用（助手/用户/两者）、改名、删除；素材存于 `~/.dsh/chat-focus/skins/`，经宿主 `/api` 鉴权路由提供（视频支持 Range 请求），跨浏览器可用
- **设置页：左标签栏 + 右侧固定预览**：基础 / 折叠 / 气泡外观 / 皮肤 / 高级 五个标签；宽屏时左侧导航、中间表单、右侧实时预览常驻，窄屏时导航转为横向、预览可折叠
  - **气泡外观**用「助手 / 用户」分段开关复用同一套编辑器，并支持**复制到另一侧**（一次原子写入）
  - **高级**提供恢复全部默认设置、皮肤库状态与素材存储位置
- **渲染错误边界**：某行渲染异常时显示错误卡片而非整面板白屏，可刷新恢复

## 效果截图

| 对话界面：折叠运行时信息 + 聊天气泡 | 设置面板：上下分栏 + 固定实时预览 |
| --- | --- |
| ![对话界面](https://raw.githubusercontent.com/supergameboy/dsh-chat-focus/master/docs/screenshots/conversation.png) | ![设置面板](https://raw.githubusercontent.com/supergameboy/dsh-chat-focus/master/docs/screenshots/settings.png) |

## 安装

统一使用宿主官方插件管理命令 `dsh plugin --profile <name> <pnpm args...>`（pnpm 转发 + 自动把声明 `dsh.bundle` 的依赖加入 `dsh.profile.bundles` 层列表）。本项目不提供、也不需要任何包装脚本。

从 npm 安装（推荐）：

```sh
dsh plugin --profile web add dsh-chat-focus
```

本地开发方式（官方命令直装本地目录）：

```sh
pnpm run bundle                                                  # 先构建 lib/client.js
dsh plugin --profile web add "link:E:\dsh-chat-focus"            # 官方命令，自动加入 bundle 层
# 重启 dsh web
```

bundle 的 patch 层（`cordis.patch.yml`）由 loader 自动应用：宿主 `ui-chat` 气泡行被禁用，`chat-focus` 行挂载 fork 并注册进宿主 `ui-conversation` 引擎的 `chat` 视图目标；其他宿主插件（ui-tool、ui-plan、ui-commands 等）注册进同名槽位，功能不变。

**注意：安装之后需要重启dsh**

## 卸载

只使用官方命令：

```sh
dsh plugin --profile web remove dsh-chat-focus   # 移除依赖 + bundle 层，重启后宿主 ui-chat 行自动恢复
```

官方命令之后的两处可选手动清理（均为惰性残留，不影响运行；是否清理自行决定）：

```powershell
# 1) 仅 link: 方式安装才会留下的 node_modules 目录链接（加载器不会读取）：
Remove-Item C:\Users\super\.dsh\profiles\web\node_modules\dsh-chat-focus -Force -Recurse

# 2) settings.yaml 中 ui-chat: 命名空间的 focus* 自定义字段（fork 的 schema 提供这些键；
#    保留它，重装后气泡自定义原样恢复）——按需手动删除对应行
```

自制皮肤素材（`~/.dsh/chat-focus/`）独立于插件，卸载后仍保留；确认不再需要时手动删除整个目录即可。

浏览器端 localStorage `dsh.chat-focus.fold.*`（服务端任何工具都触达不到）：在 dsh 页面 F12 Console 执行
`Object.keys(localStorage).filter(k=>k.startsWith('dsh.chat-focus.')).forEach(k=>localStorage.removeItem(k))`，或直接清除 dsh 站点数据。会话记录零污染（插件仅 UI 渲染，不写 session log）。

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

入口：右上角 **设置** → **对话显示**。面板为**左标签栏 + 右侧固定预览**：左侧五个标签（基础 / 折叠 / 气泡外观 / 皮肤 / 高级），中间表单可滚动，右侧实时预览常驻；窗口较窄时导航转为横向、预览可通过右上角按钮折叠。

### 基础

- **插件开关**：关闭后对话按原始顺序显示（运行时信息不再折叠、无气泡）
- **聊天气泡**：文本回复以气泡呈现；关闭则按宿主原始样式显示
- **气泡样式**：标准 / 紧凑（两侧同时生效）

### 折叠

- **折叠策略**：最近 N 个回复展开 / 阈值折叠 / 全部折叠
- **保持展开的最近回复数 N**、**折叠框默认展开**、**折叠框摘要**、**思考纳入折叠**

### 气泡外观（助手 / 用户分段切换，两侧同构）

- **编辑哪一侧**：助手 / 用户分段开关；**复制到另一侧**把这一侧的全部设置（含皮肤）一次写入对方
- **样式来源**：气泡皮肤（见下）/ 配色模板（默认 / 浅蓝 / 薄荷绿 / 渐变 / 暗夜 / 纹理）
- **底纹**：背景色、**底纹不透明度**（0~100%，作用于整层）、**毛玻璃**（无/弱/中/强）、背景图片（上传+裁剪或 URL）、背景适配、裁剪对齐、渐变、文字可读性遮罩
- **文字**：文字颜色、字体、字号、内边距
- **几何**：圆角、最大宽度、边框色
- **恢复默认**：一键清空该侧全部自定义
- **皮肤接管**：选中皮肤后，背景/圆角/边框等控件置灰并显示说明——皮肤素材决定气泡形状；文字颜色仍可调整（皮肤未指定时生效）

### 皮肤

- **制作新皮肤**：打开五步向导（选素材 → 处理素材 → 切片与几何 → 外观与文字 → 保存并应用），右侧固定三档长度实时预览
  - 素材：PNG / JPG / WebP / GIF / APNG / SVG；多选 PNG → 序列帧；MP4 / WebM → 视频
  - 静态图片：九宫格切片（沿用背景图裁剪交互：九宫格中心框移动 + 四边拖拽 + 数值输入 + 「按内容自动估算」），素材自动归一化到 ≤256px 以保证切片比例
  - GIF / APNG：保留原生动画，整层绘制（圆角 + 覆盖/拉伸）
  - 视频：**抽帧合成精灵图**（默认）或**直接使用视频**（静音循环播放，视口内解码）
  - 序列帧：抽帧合成横向精灵图（帧宽 / 帧率 / 帧数可调，含进度与取消）
- **皮肤库**：内置 3 套（柔和蓝 / 玻璃拟态 / 暗夜）+ 自制皮肤；每个皮肤可「应用」到助手/用户/两者，自制皮肤可改名、删除
- 皮肤素材存于 `~/.dsh/chat-focus/skins/`（`index.json` + `<id>.bin`），经宿主 `/api/chat-focus/skin-asset` 鉴权路由提供（支持 `Range` 请求，视频可 seek/循环），带版本戳长缓存；宿主未提供 connection 服务时皮肤库置为不可用，静态背景图片仍可正常使用

### 高级

- **皮肤库状态**：是否已连接宿主、自制皮肤数量、失败原因与重试
- **皮肤资产存储位置**：`~/.dsh/chat-focus/skins/`
- **恢复全部默认设置**：清空气泡外观、皮肤与折叠的全部自定义（一次原子写入，需二次确认）

## 配置

设置字段（命名空间 `ui-chat`，扩展 schema；宿主 api-proxy 白名单已放行）：

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
| focusBubbleBackdropOpacity | number(0-100) | 100 | 助手气泡底纹整层不透明度 |
| focusBubbleBackdropBlur | '' / 4px / 10px / 18px | '' | 助手气泡毛玻璃 |
| focusBubbleSkin | string | '' | 助手气泡皮肤 id（'' = 自定义） |
| focusBubblePreset | string | '' | 气泡配色模板 id |
| focusUserBubble*（Bg / Border / Radius / MaxWidth / BgImage / BgSize / TextColor / Font / FontSize / Padding / Gradient* / BackdropOpacity / BackdropBlur / Skin / Preset） | string / number | '' / 100 / cover | 用户气泡自定义（与助手同构） |

皮肤库不走设置文件：素材与元数据存于 `~/.dsh/chat-focus/skins/`，设置里只保留皮肤 id。

## 构建

```sh
pnpm install        # 宿主仓库（0.1.2-alpha.5 基线）作为跨仓库 workspace 成员提供 @deepseek-ai/* 依赖
pnpm run typecheck  # tsc --noEmit（类型契约来自宿主 lib/types 构建产物）
pnpm run bundle     # tsdown：lib/index.js（node 半区）+ lib/client.js（浏览器 bundle）
pnpm test           # 分组引擎 + 皮肤几何/嗅探/校验 + 宿主资产库集成（tsx，无需 vitest）
```

> 开发环境说明：`pnpm-workspace.yaml` 将 `../deepseek-harness/packages/*/*` 与 `../deepseek-harness/vendor/*` 列为 workspace 成员（精确 0.1.2-alpha.5 契约）。若 pnpm 因跨目录 workspace 未生成 node_modules，按 `node scripts/setup-junctions.mjs` 手工链接构建依赖。**不要**在本仓库运行会改写宿主 node_modules 的 pnpm 命令。

## 版本配对（上游适配）

| 宿主版本 | fork 版本 | 说明 |
|---------|----------|------|
| 0.1.2-alpha.5 | 0.4.0 | 半透明气泡 + 气泡皮肤制作器 + 设置页左标签栏重组（宿主契约未变，纯增量） |
| rc.5（2026-08-16 基线） | 0.2.0 | v0.2 基线（折叠策略全模式、背景图上传/裁剪/适配、折叠框虚拟化） |
| 0.1.2-alpha.5（2026-09-02） | 0.3.0 | 路线 B 迁移：宿主删除 `dsh-client-runtime`，fork 收敛为聊天层（骑 `ui-conversation` 引擎行、替换 `ui-chat` 气泡行）；引擎符号改走 `dsh-client-store` 种子词，事件谓词改走 `dsh-session/surface`，折叠盒移除估算行高虚拟化 |
| 0.1.1-rc.2 | 0.2.5 | 适配 attachment 插件化（`ImageGallery` 等原子不再从平台模块表导出）：用户气泡改走与助手同构的 `ChatBubble` 统一管线；消息图片/输入区附件改经 `conversation.message.images` / `conversation.input.attachments` 槽位；移植 `referenceLabels` 引用投影与新参考 chip 样式 |

宿主升级后按以下流程适配：
1. 逐项核对 `docs/design/ui-design-20260816-dsh-chat-focus-模块1-基底复制域.md` §2.3 槽位契约保持表（21 槽位 + `conversation` 服务 + 节点数据模型）；
2. 更新 `tsconfig.json` 的 paths（lib/types 入口可能变化）；
3. `pnpm run typecheck && pnpm run bundle`，并在宿主环境做 test:gui 同构冒烟；
4. 更新本表。

宿主处于 pre-release（契约随时可漂移）——若适配成本超出维护能力，备选方案（视图附加型，零手术纯插件行）见 `docs/design/solution-design-20260816-dsh-chat-focus-备选方案-视图附加型.md`。

## 已知限制（v0.4）

- 设置页预览为内置示例数据（settings.section 为 root scope，无会话数据通道；真实会话预览按反馈暂缓）
- 字体预设依赖系统字体：楷体/宋体/黑体在 Windows 与 macOS 均内置，Linux 可能缺失（缺字体时回退到系统默认）
- 九宫格切片只适用于静态图片：GIF/APNG、精灵图与视频整层绘制（圆角 + 覆盖/拉伸），因为浏览器不对 `border-image` 播放动画
- 视频精灵路线在制作时抽帧固化，运行时不再解码视频；精灵动画随气泡尺寸拉伸，建议素材比例接近常见气泡比例
- 「直接使用视频」路线每个可见气泡占一个视频解码器（离开视口自动暂停）；长会话里大量视频气泡会明显吃 GPU/内存，建议只在少量气泡上使用
- 皮肤素材跨浏览器共享（同机），但不随设置文件同步到其他机器；跨机迁移请手动复制 `~/.dsh/chat-focus/`

## 许可证

MIT。fork 自 `@deepseek-ai/dsh-client-ui-conversation`（MIT），保留上游版权声明。
