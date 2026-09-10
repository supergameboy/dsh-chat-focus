# 代码设计 - dsh-chat-focus - 气泡皮肤增量

> G6 门禁交付物。以模块 / 类型 / 接口契约为主，不含完整伪代码。所有实现类设计必须回填
> [feature-design](feature-design-20260909-dsh-chat-focus-气泡皮肤增量.md) 的功能追溯矩阵（FP-002）。

## 文档信息

| 项目 | 内容 |
|------|------|
| 创建日期 | 2026-09-09 |
| 上游 | feature-design / solution-design / ui-design / interaction-design（均已定稿） |
| 状态 | 已定稿（G6） |

---

## 1. 模块结构

| 模块 | 文件 | 职责 | 功能 |
|------|------|------|------|
| 契约（双半共享） | `src/skin-contract.ts` | 皮肤记录、切片/内边距几何、RPC 载荷、路径常量 | FEAT-109 |
| 宿主资产库 | `src/skins/host.ts` | 磁盘读写 + RPC 端点 + GET 素材路由 | FEAT-109 |
| 宿主接入 | `src/index.ts` | 有 `connection` 时安装资产库 | FEAT-109 |
| 设置契约 | `src/chat-settings.ts` | 6 个新持久字段（默认值/接口/schema） | FEAT-101,102,108 |
| 皮肤库 store | `src/client/skins/registry.ts` | 列表加载、保存/删除/改名、素材 URL、状态机 | FEAT-107,109 |
| 素材识别 | `src/client/skins/detect.ts` | 文件头嗅探：静态/动画/视频/序列 | FEAT-103 |
| 精灵合成 | `src/client/skins/sprite.ts` | 视频抽帧、序列帧合成、精灵图导出 | FEAT-104,105 |
| 几何计算 | `src/client/skins/geometry.ts` | 切片 → 边框/内边距/精灵步进参数（纯函数） | FEAT-106,108 |
| 底纹渲染 | `src/client/chat/bubbles/BubbleBackdrop.tsx` | 三类素材的底纹绘制 | FEAT-101,102,108 |
| 气泡容器 | `src/client/chat/bubbles/ChatBubble.tsx` | 底纹层 + 内容层结构 | FEAT-101,102,108 |
| 皮肤装配 | `src/client/chat/bubbles/chrome.ts` | 设置 → 渲染样式（含皮肤解析） | FEAT-108 |
| 内置皮肤 | `src/client/chat/bubbles/builtin-skins.ts` | 3 套内置 SVG 皮肤 | FEAT-107 |
| 设置壳 | `src/client/settings/ChatFocusSection.tsx` | 左标签栏骨架 + 常驻预览 + 窄屏折叠 | FEAT-110 |
| 基础面板 | `src/client/settings/BasicPanel.tsx` | 总开关 + 气泡密度 | FEAT-110 |
| 折叠面板 | `src/client/settings/FoldPanel.tsx` | 折叠策略与披露默认 | FEAT-110 |
| 外观面板 | `src/client/settings/AppearancePanel.tsx` | 助手/用户分段开关 + 复制到另一侧 | FEAT-110,112 |
| 高级面板 | `src/client/settings/AdvancedPanel.tsx` | 皮肤库状态 + 资产路径 + 恢复全部默认 | FEAT-110,112 |
| 气泡侧面板 | `src/client/settings/BubbleSidePanel.tsx` | 单侧气泡全部控件 | FEAT-101,102,108 |
| 皮肤面板 | `src/client/settings/SkinsPanel.tsx` | 皮肤库网格 + 制作入口 | FEAT-107 |
| 制作器 | `src/client/settings/SkinMaker.tsx` | 五步向导 + 实时预览 + 视频双路线 | FEAT-103~107,111 |
| 切片编辑器 | `src/client/settings/SliceEditor.tsx` | 参考线拖拽 + 数值输入 + 区域遮罩 | FEAT-106 |
| 皮肤渲染投影 | `src/client/chat/bubbles/skin-render.ts` | 库条目 → 扁平渲染描述 | FEAT-108,111 |
| 控件库 | `src/client/settings/controls.tsx` | Row/Checkbox/ColorField/Select/Slider | FEAT-110 |
| 文案 | `src/client/settings/focus-locale.ts` | zh/en 词条 | 全部 |

## 2. 数据契约（`src/skin-contract.ts`）

```ts
/** 皮肤素材种类：静态图（可九宫格）/ 动画图（整层）/ 精灵图（帧序列）。 */
export type SkinKind = 'image' | 'animated' | 'sprite'

/** 九宫格四向内缩量（素材像素）。 */
export interface SkinSlice { left: number; top: number; right: number; bottom: number }
/** 内容内边距（CSS 像素）。 */
export interface SkinPadding { top: number; right: number; bottom: number; left: number }

/** 一条皮肤记录（宿主 index.json 的元素，也是客户端渲染输入）。 */
export interface SkinRecord {
  id: string                      // /^[a-z0-9][a-z0-9-]{5,63}$/
  name: string                    // 1..40 字符
  kind: SkinKind
  mime: string                    // 素材 MIME（image/png|image/jpeg|image/gif|image/apng|image/webp|video/*）
  width: number; height: number   // 单帧像素尺寸
  frames: number                  // 1（image/animated 用 1 表示整图）或精灵帧数
  fps: number                     // 精灵帧率；非精灵为 0
  slice: SkinSlice                // kind==='image' 时有效
  padding: SkinPadding
  radius: number                  // 圆角裁剪像素；kind==='image' 时为 0
  fit: 'cover' | 'stretch'        // kind==='animated' 时有效
  textColor: string               // '' = 使用用户设置
  bytes: number
  createdAt: number; updatedAt: number
}

/** 宿主 index.json 根对象。 */
export interface SkinIndex { version: 1; skins: SkinRecord[] }

/** RPC 载荷。 */
export interface SkinSaveRequest {
  id?: string                     // 省略 = 新建
  name: string
  kind: SkinKind
  mime: string
  width: number; height: number
  frames: number; fps: number
  slice: SkinSlice
  padding: SkinPadding
  radius: number
  fit: 'cover' | 'stretch'
  textColor: string
  asset: string                   // base64（不含 data: 前缀）
}
export interface SkinDeleteRequest { id: string }
export interface SkinRenameRequest { id: string; name: string }
export interface SkinListResult { records: SkinRecord[] }
export interface SkinSaveResult { record: SkinRecord }

export const SKIN_RPC_CHANNEL = '/chat-focus'          // 单段前缀（宿主 CHANNEL_PATTERN 约束）
export const SKIN_ASSET_PATH = '/api/chat-focus/skin-asset'
export const SKIN_MAX_ASSET_BYTES = 8 * 1024 * 1024
export const SKIN_MAX_INDEX_BYTES = 256 * 1024
export const SKIN_MAX_FRAMES = 60

/** 素材 URL（带版本戳，可长缓存）。 */
export function skinAssetUrl(id: string, updatedAt: number): string
```

## 3. 宿主资产库（`src/skins/host.ts`）

### 3.1 存储布局

```
<DSH_HOME>/chat-focus/skins/
  index.json      # SkinIndex（UTF-8 JSON）
  <id>.bin        # 素材原始字节
```

`DSH_HOME` 解析：`$DSH_HOME` → `~/.dsh`（与宿主 `resolveDshHome` 同序；本地实现 4 行，避免新增 peer 依赖）。

### 3.2 接口

| 端点 | 方法 | 输入 | 输出 |
|------|------|------|------|
| `skins.list` | RPC | `{}` | `{ records: SkinRecord[] }` |
| `skins.save` | RPC | `SkinSaveRequest` | `{ record: SkinRecord }` |
| `skins.delete` | RPC | `SkinDeleteRequest` | `{ deleted: boolean }` |
| `skins.rename` | RPC | `SkinRenameRequest` | `{ record: SkinRecord }` |
| `GET /api/chat-focus/skin-asset` | HTTP | `?id=&v=` | 素材字节（含 `Content-Type`/`Cache-Control`/`ETag`） |

### 3.3 关键行为

| 行为 | 规格 |
|------|------|
| 校验 | id 正则、name 长度、kind 枚举、mime 白名单、slice/padding 非负整数且不超过素材尺寸、base64 解码后 ≤ 8MB |
| 原子写 | 素材先写 `<id>.bin.tmp` 再 rename；index.json 同理（避免半写状态） |
| 并发 | 单进程内串行队列（同一时刻只有一次写）；不做跨进程锁（宿主 settings 已用文件锁，皮肤库独立目录） |
| 失败 | 返回 `{ ok: false, error: { code, message, details } }`；不抛出到 RPC 外层 |
| 素材响应 | `200` + 字节；未知 id → `404`；`HEAD` 返回同头无体 |
| 缓存 | `Cache-Control: private, max-age=31536000, immutable`（URL 含 `v=updatedAt`） |

### 3.4 安装

```ts
// src/index.ts（宿主半）
export function apply(ctx: Context): void {
  ctx.inject(['settings'], settingsCtx => { /* 既有 schema 注册 */ })
  ctx.inject(['connection'], connectionCtx => { installSkinStore(connectionCtx) })
}
```

`installSkinStore` 内部：`ctx.connection.rpc.handle(SKIN_RPC_CHANNEL, handler)` +
`ctx.connection.fetch.register({ path: SKIN_ASSET_PATH, methods: ['GET', 'HEAD'], fetch })`，
两者均由 cordis effect 托管（插件卸载自动注销）。`connection` 不存在时静默跳过。

## 4. 客户端渲染契约

### 4.1 皮肤状态机（`registry.ts`）

```ts
export interface SkinState {
  status: 'idle' | 'loading' | 'ready' | 'unavailable'
  records: readonly SkinRecord[]
  error?: string
}
export interface SkinEntry { record: SkinRecord; url: string; builtin: boolean }

export class SkinRegistry {
  readonly state: SnapshotStore<SkinState>
  constructor(builtins: readonly SkinEntry[])
  /** 拉取宿主列表；网络/404 失败 → status='unavailable'（一次重试）。 */
  load(): Promise<void>
  save(request: SkinSaveRequest): Promise<SkinRecord>
  remove(id: string): Promise<void>
  rename(id: string, name: string): Promise<void>
  /** 按 id 解析可渲染条目（含内置）。 */
  resolve(id: string): SkinEntry | undefined
  /** 素材 URL（内置皮肤返回内联 data URI）。 */
  urlOf(entry: SkinEntry): string
}
```

### 4.2 渲染输入（`ChatBubbleCustomStyle` 增量）

```ts
/** 已解析的皮肤渲染描述（由 chrome.ts 从 SkinEntry 构造）。 */
export interface SkinRender {
  readonly id: string
  readonly url: string
  readonly kind: SkinKind
  readonly slice: SkinSlice
  readonly padding: SkinPadding
  readonly radius: number
  readonly fit: 'cover' | 'stretch'
  readonly frames: number
  readonly fps: number
  readonly textColor: string
}

export interface ChatBubbleCustomStyle {
  // …既有字段…
  /** 底纹整层不透明度百分比（'' 或 '100' = 不透明）。 */
  readonly backdropOpacity?: string
  /** 底纹毛玻璃预设（'' | '4px' | '10px' | '18px'）。 */
  readonly backdropBlur?: string
  /** 皮肤底纹；存在时接管背景色/图片/渐变/圆角/边框。 */
  readonly skin?: SkinRender | undefined
}
```

### 4.3 几何计算（`geometry.ts`，纯函数）

| 函数 | 输入 | 输出 | 规则 |
|------|------|------|------|
| `clampSlice(slice, width, height)` | 四向切片 + 素材尺寸 | 合法切片 | `l+r ≤ width`、`t+b ≤ height`，逐向夹取 |
| `borderImageStyle(skin)` | image 类皮肤 | `{ borderWidth, borderImageSlice, borderImageSource, borderImageRepeat }` | `borderWidth = "<t>px <r>px <b>px <l>px"`（显示长度）；`borderImageSlice = "<t> <r> <b> <l> fill"`（**源图像素，无单位**——长度值在该属性上非法会被静默丢弃）；repeat = `stretch` |
| `spriteFrames(frames, fps)` | 帧数/帧率 | `{ steps, endPercent, durationSeconds } \| null` | `frames ≤ 1 → null`；`steps = frames-1`；`endPercent = -(frames-1)/frames*100`；`duration = frames/fps` |
| `spriteElementWidth(frames)` | 帧数 | `string` | `${frames * 100}%` |
| `normalizeArtwork(file, maxEdge)` | 静态素材文件 | 归一化后的 Blob + 尺寸 | 最长边 > 256px 时重编码（WebP 0.92，回退 PNG）；否则原样透传——保证「源像素 = 显示像素」，切片数值即显示厚度 |

**步进推导**：精灵元素宽 = N×W；显示第 k 帧需平移 −k·W = −(k/N)·100%（元素自身宽度百分比）；
`steps(N−1)` 给出 N 个离散值 `−i/N·100%`（i=0..N−1），故终点取 `−((N−1)/N)·100%`。

### 4.4 渲染结构（`ChatBubble.tsx` / `BubbleBackdrop.tsx`）

```
.content (position: relative; border-radius; 文字变量)
  ├─ .backdrop (position: absolute; inset: 0; border-radius: inherit; z-index: 0)
  │    ├─ 皮肤：image → border-image 九宫格（border-width = 切片）
  │    │        animated → background-size: cover|100% 100%
  │    │        sprite   → 子元素 width: N×100% + steps() 动画
  │    └─ 无皮肤：background-color / background-image / 渐变 / 遮罩 / opacity / backdrop-filter
  └─ .body (position: relative; z-index: 1; padding; 内容)
```

| 规则 | 说明 |
|------|------|
| 底纹层渲染条件 | 恒渲染（单一代码路径）；无自定义时绘制主题默认色，与旧版视觉一致 |
| 皮肤优先级 | `skin !== undefined` 时忽略 `bg/bgImage/gradient/radius/border` |
| 内边距 | 有皮肤时用 `skin.padding`，否则用用户 `padding` |
| 文字颜色 | 皮肤 `textColor !== ''` 时优先 |
| 圆角 | 皮肤 `radius > 0` 时作用于底纹层并 `overflow: hidden` |
| 精灵关键帧 | 按皮肤 id 注入一次 `@keyframes cf-sprite-<id>` 到 `<style data-plugin="dsh-chat-focus">` |
| 兜底 | 素材加载失败（`onError`）→ 底纹层回落无皮肤绘制 + 控制台一次告警 |

## 5. 制作器契约（`SkinMaker.tsx`）

```ts
type MakerStep = 'source' | 'prepare' | 'geometry' | 'text' | 'save'
type MakerSource =
  | { kind: 'image'; file: File; animated: boolean; width: number; height: number; previewUrl: string }
  | { kind: 'sequence'; frames: { file: File; url: string }[]; width: number; height: number }
  | { kind: 'video'; file: File; url: string; duration: number; width: number; height: number }

interface MakerState {
  step: MakerStep
  source?: MakerSource
  /** 处理产物：精灵图 dataURL/Blob + 帧数/帧率，或原图。 */
  asset?: { blob: Blob; mime: string; width: number; height: number; frames: number; fps: number }
  slice: SkinSlice
  padding: SkinPadding
  radius: number
  fit: 'cover' | 'stretch'
  textColor: string
  name: string
  applyTo: 'assistant' | 'user' | 'both' | 'none'
  progress?: { done: number; total: number; label: string }
  error?: string
}
```

| 事件 | 迁移 |
|------|------|
| 选文件完成 | `source` 置位 → `prepare` |
| 处理完成 | `asset` 置位 → `geometry` |
| 参数变更 | `asset` 失效 → 停留当前步并重处理 |
| 下一步 | 依 source.kind 决定 `geometry` 步形态（image=切片；animated/sprite=圆角+适配） |
| 保存成功 | 关闭向导 → 刷新皮肤库 → 可选写入设置字段 |
| 保存失败 | 停留 `save` 步 + 内联错误 |

## 6. 设置页壳契约（`ChatFocusSection.tsx`）

```ts
type FocusTab = 'basic' | 'fold' | 'appearance' | 'skins' | 'advanced'
interface ChatFocusSectionInjected {
  hooks: { focusSettings: SnapshotStore<ChatSettings> }
  setFocusField: (field: keyof ChatSettings, value: unknown) => void
  /** 批量写入（复制到另一侧 / 恢复全部默认），一次原子 mutate。 */
  setFocusFields: (patch: Partial<ChatSettings>) => void
  /** 皮肤库（状态 + 写操作）。 */
  skins: SkinRegistry
}
```

预览区随标签切换：`basic`/`fold` → 折叠框 + 助手气泡；`appearance`/`skins` → 助手 + 用户气泡（长文本）；`advanced` → 折叠框 + 双侧气泡。

## 7. 功能追溯矩阵（实现侧回填）

| 模块 | 承载功能 | 测试 |
|------|----------|------|
| skin-contract.ts | FEAT-109,111 | TC-19,20,23,24 |
| skins/host.ts | FEAT-109,111 | TC-19,20,21,25 |
| chat-settings.ts | FEAT-101,102,108 | TC-01,02,03 |
| skins/registry.ts | FEAT-107,109 | TC-14,15,16 |
| skins/detect.ts | FEAT-103,111 | TC-06,07,08 |
| skins/sprite.ts | FEAT-104,105 | TC-09,10,11 |
| skins/geometry.ts | FEAT-106,108,111 | TC-12,13,17,18,24 |
| BubbleBackdrop.tsx | FEAT-101,102,108,111 | TC-04,17,18,27 |
| chrome.ts | FEAT-108 | TC-17 |
| skin-render.ts | FEAT-108,111 | TC-17 |
| SkinMaker.tsx | FEAT-103~106,111 | TC-06~13,27 |
| ChatFocusSection + Basic/Fold/Appearance/Advanced 面板 | FEAT-110,112 | TC-22,26 |

---

## 6. 变更记录（D6′/D8′/D9，2026-09-09 用户裁决后）

### 6.1 契约增量（`src/skin-contract.ts`）

| 符号 | 变更 |
|------|------|
| `SkinKind` | 新增 `'video'` |
| `SKIN_MIME_WHITELIST` | 追加 `video/mp4`、`video/webm` |
| `SKIN_VIDEO_MIME_WHITELIST` | 新增：仅 `video` 族接受的 mime 集合 |
| `validateSkinSave` | 新增 kind ↔ mime 一致性校验（视频族必须视频 mime，图片族必须图片 mime） |
| `SkinRecord.fit` / `SkinSaveRequest.fit` | 语义扩展到 `kind === 'video'` |

### 6.2 宿主半区（`src/skins/host.ts`）

| 符号 | 说明 |
|------|------|
| `parseByteRange(header, length)` | 纯函数：解析单区间 `bytes=start-end` / `start-` / `-suffix`；返回窗口、`undefined`（无 Range/不支持）或 `'unsatisfiable'` |
| 资产路由 | 响应头补 `accept-ranges: bytes`；命中窗口 → `206` + `content-range` + 精确 `content-length`；越界 → `416` + `content-range: bytes */len`；无 Range → 原 `200` 行为 |

### 6.3 客户端皮肤运行时

| 模块 | 变更 |
|------|------|
| `skins/geometry.ts` | 新增 `videoObjectFit(fit)`：`cover → cover`、`stretch → fill` |
| `skins/detect.ts` | 新增 `VideoInfo` + `inspectVideo(file)`：经 `<video preload="metadata">` 读宽高与时长 |
| `chat/bubbles/BubbleBackdrop.tsx` | 新增 `VideoLayer`：静音循环 `<video>`，`IntersectionObserver`（120px 余量）控制播放/暂停，`prefers-reduced-motion` 下仅首帧 |
| `chat/bubbles/skin-render.ts` | `SkinRender.kind` 透传 `'video'`（无需改结构） |

### 6.4 设置域重构

| 模块 | 变更 |
|------|------|
| `settings/ChatFocusSection.tsx` | 重写为「左标签栏 + 表单 + 右侧预览」；`ResizeObserver` 实测宽度切换窄屏布局；`paneHeight` 测量逻辑保留 |
| `settings/BasicPanel.tsx` / `FoldPanel.tsx` | 由 `GeneralPanel.tsx` 拆分（后者删除）：基础开关与折叠行为各占一页 |
| `settings/AppearancePanel.tsx` | 新增：助手/用户分段开关 + 复制到另一侧（19 字段）+ 皮肤库不可用提示 |
| `settings/AdvancedPanel.tsx` | 新增：皮肤库状态 + 资产路径 + 恢复全部默认（二次确认） |
| `chat-focus-policy.ts` | 新增 `setFields(patch)`：一次本地快照 + 一次 `SettingsScope.mutate`（`SettingsPathOpView[]`） |
| `client/apply.ts` | 注入面新增 `setFocusFields` |
| `settings/SkinMaker.tsx` | 视频源新增「处理方式」双路线；`Draft.videoMode`；`skinKindOf(draft)` |
| `settings/focus-locale.ts` | 新增五标签、分段开关、复制、高级页、视频路线词条（zh/en 同步） |
