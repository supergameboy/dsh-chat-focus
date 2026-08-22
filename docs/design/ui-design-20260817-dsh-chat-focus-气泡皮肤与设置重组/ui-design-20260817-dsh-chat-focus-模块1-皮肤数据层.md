# UI 设计 - dsh-chat-focus - 模块1：皮肤数据层

## 文档信息

| 项目 | 内容 |
|------|------|
| 模块ID | M1 |
| 创建日期 | 2026-08-17 21:50 |
| 模块类型 | 方案设计轨道（数据基础设施） |
| 状态 | 定稿（v1.1.0 修订：新增 §8 草稿缓存文件） |
| 上游 | 总规划 §4（组合视图）§5.2（manifest 契约）；总规划决策 #10（§5.4 草稿契约） |

---

## 1. 模块概述

### 1.1 在系统组合中的位置

M1 是皮肤功能的资产底座：所有皮肤图片/帧/动图文件存浏览器 OPFS，settings.yaml 只存激活的皮肤 id。上游写入方：M3 制作器（新建/编辑保存）、M4 管理器（导入 .dshskin / 删除）；下游读取方：M2 渲染层（聊天流 + 预览 + 管理器缩略图经 M2 组件）。不含任何 UI。

v1.1.0 起 M1 同时承载**草稿缓存文件**（`draft.json`，总规划决策 #10）：持久化存储用户当前皮肤选择与在其基础上自定义的叠加参数（未保存修改）——它是「预览 · 示例」所渲染草稿的持久化载体（防误关页面丢失、跨会话恢复），与皮肤库同为 OPFS 持久化，但生命周期独立（「保存」/「放弃更改」即清除）。注意：页面运行期的未保存状态是组件工作副本（内存、易失），不是缓存文件，也不作为其降级层；契约见 §8。

### 1.2 决策记录

| 序号 | 时间戳 | 决策点 | 方案A | 方案B | 方案C | 用户选择 | 选择理由 |
|------|--------|--------|-------|-------|-------|----------|----------|
| 1.1 | 21:46 | .dshskin 容器格式 | JSON+base64 单文件 | **ZIP（fflate 打包）** | 私有二进制 | 方案B | 标准容器可人工解包检查；base64 膨胀 33% 不可取；fflate ~8KB MIT |
| 1.2 | 21:46 | 索引方式 | 每次遍历目录读 manifest | **index.json + 损坏时全量重建** | localStorage 缓存 | 方案B | 列表读取一次 IO；重建逻辑兜底索引与目录漂移 |
| 1.3 | 21:47 | 资产 URL 分发 | data URI 内联 | FileReader→dataURI | **createObjectURL + LRU 缓存（≤8 皮肤驻留）** | 方案C | 大资产零拷贝；LRU 控制内存；页面卸载统一 revoke |
| 1.4 | 21:47 | 持久化策略 | 不申请 | **navigator.storage.persist() 首次写皮肤时申请** | 每次启动申请 | 方案B | 防浏览器驱逐皮肤资产；一次申请长期有效 |

> 以上 L2 决策按 L0-#4（OPFS+标准包）指引取推荐值定稿，未逐项发起用户选择；如需调整在实现评审提出。

### 1.3 消费者清单（原则3）

| 消费者 | 消费方式 |
|--------|---------|
| M2 皮肤渲染层 | `resolveSkin(id)` 取 manifest + 资产对象 URL；`watchSkins()` 订阅库变更刷新 |
| M3 皮肤制作器 | `saveSkin(draft)` 写入；`readSkin(id)` 载入库内皮肤编辑；`openPackage(file)`/`packSkin(draft)` 编辑器级不落盘打开与导出（决策 #9） |
| M4 皮肤管理器 | `listSkins()` / `deleteSkin(id)` / `importPackage(file)` / `exportSkin(id)` |
| 设置「预览 · 示例」（M6） | 经 M2 组件间接消费；并直接消费 `DraftStore`（§8）：打开页面 `load()` 恢复草稿态、编辑去抖 `save()`、「保存/放弃更改」`clear()` |
| 聊天流（ChatView） | 仅消费**已保存**设置快照中的 skinId（草稿不影响聊天，决策 #10） |

> openPackage 与 importPackage 的分工：前者面向编辑器（校验+解包为草稿即止，不碰皮肤库——编辑-分享-再编辑闭环不经过库）；后者面向管理器（校验+解包+落盘一步到位）。readSkin 与 resolveSkin 的分工：前者面向编辑器（返回原始 Blob，可修改后回写），后者面向渲染（返回即用对象 URL，走 LRU）；皮肤库自身不区分调用方。

---

## 2. 存储布局（OPFS）

```text
<dsh-chat-focus 专用根目录>/
  index.json                 # 皮肤元数据索引（数组，SkinMeta 契约见总规划 §5.2）
  draft.json                 # 草稿缓存：『对话显示』未保存修改整值快照（决策 #10，契约见 §8）
  skins/
    <skinId>/
      manifest.json          # 单皮肤元数据（契约见总规划 §5.2）
      assets/
        bg.png | bg.gif | bg.apng | bg.webp     # 主资产（nine-patch / animated-image）
        f000.png f001.png …                      # frame-sequence 逐帧资产
```

效果要求：
- `listSkins()` 只读 index.json（一次 IO 返回全部元数据）；
- index.json 缺失/解析失败/与目录不一致时，遍历 `skins/*/manifest.json` 重建索引并回写；
- skinId 为 uuid（crypto.randomUUID），导入包时**重新生成 id** 避免覆盖本地同 id 皮肤。

## 3. 对外接口（TS 签名 = 契约，非实现）

```typescript
interface SkinStore {
  supported: boolean                                  // OPFS 特性检测结果
  listSkins(): Promise<SkinMeta[]>                    // 索引读取（损坏自动重建）
  resolveSkin(id: string): Promise<SkinRecord | null> // manifest + 各资产对象 URL（LRU 缓存）
  readSkin(id: string): Promise<SkinDraft | null>     // 载入编辑：manifest + 原始资产 Blob（不经 URL 缓存）
  saveSkin(draft: SkinDraft): Promise<SkinMeta>       // 新建/覆盖写（manifest + 资产）
  deleteSkin(id: string): Promise<void>               // 删目录 + 索引移除
  importPackage(file: File): Promise<SkinMeta>        // .dshskin 校验+解包+落盘
  openPackage(file: File): Promise<SkinDraft>         // .dshskin 校验+解包为草稿，零落盘（M3「打开皮肤包」进编辑器，决策 #9）
  exportSkin(id: string): Promise<Blob>               // 打包 .dshskin（ZIP）
  packSkin(draft: SkinDraft): Promise<Blob>            // 打包草稿为 .dshskin，不落盘（M3 编辑器直接导出，决策 #9）
  watchSkins(cb: () => void): () => void              // 库变更通知（保存/删除/导入后触发）
}
interface SkinRecord { manifest: SkinManifest; objectUrls: Record<string, string> }

// —— 草稿缓存文件（v1.1.0 新增，总规划决策 #10，详见 §8）——
interface SettingsDraft { version: 1; updatedAt: string; values: Record<string, unknown> }
interface DraftStore {
  available: boolean                        // 持久层可用性（OPFS / localStorage 至少其一；皆不可用 = false，页面回落即时提交，见 §8）
  load(): Promise<SettingsDraft | null>     // 打开设置页调用；null = 无未保存草稿
  save(draft: SettingsDraft): Promise<void> // 每次草稿编辑去抖 ~300ms 整文件覆写（M6 触发）
  clear(): Promise<void>                    // 「保存」提交设置域成功后 / 「放弃更改」后清除
}
```

## 4. .dshskin 标准包

- 容器：标准 ZIP；内容 = `manifest.json` + `assets/*`（与 OPFS 目录内布局一致，导出即目录快照，导入即解包落盘 + 重生成 id + `createdAt` 刷新）；
- 打包/解包依赖：fflate（加入 dependencies，bundle 体积增量 ~8KB）；
- manifest 校验（导入/打开包时，失败即拒绝、零落盘）：
  - 必填字段齐全且类型正确（id 重生成故不要求匹配）；
  - `type` 与资产存在性一致（nine-patch/animated-image 必有主资产；frame-sequence 必有 ≥2 帧）；
  - 解压后总大小 ≤ 20MB、frame-sequence 帧数 ≤ 120、fps ≤ 24；
  - 图片资产魔数校验（PNG/GIF/APNG/WebP 签名），不信任扩展名。

## 5. 失败场景（原则4）

| 场景 | 行为 | 上层反馈（M2/M4 消费） |
|------|------|----------------------|
| OPFS 不可用 | `supported=false`，全部方法 reject `SkinStoreUnavailableError` | M4 顶部横幅禁用皮肤区；M2 渲染按无皮肤处理；其余功能不受影响 |
| 写入/导入配额满 | 事务回滚（先写临时目录，成功后原子 rename；失败清理） | M3/M4 行内错误「存储空间不足，请删除旧皮肤后重试」 |
| 单皮肤目录损坏（manifest 损坏/资产缺失） | 索引标记 `damaged: true`；resolveSkin 返回 null | M2 降级无皮肤；M4 卡片置灰标「已损坏」，可删除 |
| 导入包校验失败 | 拒绝落盘，错误对象携带具体缺项 | M4 行内错误指出缺项（如「缺少 assets/bg.png」） |
| 对象 URL 泄漏防护 | LRU 淘汰即 revoke；页面 beforeunload 全量 revoke | — |

## 6. 与现有 bgImage 字段的关系

现行（v0.2.5）的 `focusBubbleBgImage`（data URI ≤2MB，上传压缩见 `ImageCropper.tsx`）**保留不动**，作为轻量背景图入口；皮肤是独立的、更强的背景层（决策 #8：皮肤激活时替换背景层——bgImage 字段让位但不清值，取消皮肤后恢复）。两者存储互不迁移。

## 7. 内置皮肤（决策 #9：预设功能的替换去向）

- 原 6 套 BUBBLE_PRESETS 字段模板废弃；其中视觉可迁移的 4 套（默认 / 浅蓝 / 薄荷绿 / 暗夜）转为**随包内置 .dshskin**（打包进 lib 资产，nine-patch 类型纯色+圆角+切片图，程序化生成无需美工）；
- 首次访问皮肤库时自动注册内置皮肤（固定 id 前缀 `builtin-`，幂等：已存在不重复写）；
- 用户删除内置皮肤后可通过 M4「恢复内置皮肤」重新注册（导出过的内置包与自制包同规格，无特权）；
- 内置皮肤的 manifest 标记 `builtin: true` 仅供卡片徽标展示，数据通路与自制皮肤完全一致。

## 8. 草稿缓存文件（v1.1.0 新增，总规划决策 #10）

需求原文「缓存皮肤文件」的落地物：一个独立于设置域（settings.yaml）的暂存文件，存储用户**当前皮肤选择**（两侧 skinId）与**在其基础上自定义的叠加参数**（仍生效字段的最新值）。它是「预览 · 示例」所渲染草稿的**持久化载体**（防误关页面丢失、跨会话恢复）；点「保存」之前永不影响聊天流。

设计要点：

- **内容形态**：单文件整值快照（非增量 diff）——`values` 覆盖『对话显示』四分组全字段（插件总开关除外），自愈简单、无字段级合并逻辑；选择皮肤 = 写入对应侧 `skinId`；在皮肤基础上自定义参数 = 更新 `values` 中对应字段（文字色/字体/遮罩/半透明等让位模型下的生效字段）；
- **存储策略（与内存严格区分）**：草稿缓存文件只有两级**持久层**——主存 OPFS `<根>/draft.json`，OPFS 不可用降级 localStorage（键 `dsh-chat-focus:draft`，JSON 体量远小于配额）；到此为止。页面运行期的未保存状态只是组件工作副本（内存、易失、随刷新消失），仅服务本会话交互与「预览 · 示例」渲染——它不是缓存文件，也不作为缓存文件的降级层；
- **持久层皆不可用**：`DraftStore.available = false`，设置页不进入两段式，回落当前 v0.2.5 的逐字段即时提交模式（M6 横幅说明）——宁可不暂存，不以内存冒充缓存文件；
- **生命周期**：打开设置页 `load()` 命中即恢复草稿态（横幅「有未保存的更改」）；编辑先更新工作副本、再去抖 ~300ms `save()` 落缓存文件；「保存」= 草稿全量提交 settings.yaml 成功后 `clear()`；「放弃更改」= 直接 `clear()` 并回读已保存值重建工作副本；
- **并发立场**：多标签页后写覆盖（`updatedAt` 仅用于展示「最后编辑时间」，不做字段级合并——单用户场景足够）；
- **版本兼容**：`version` 前向兼容——未知键忽略、缺失键取 schema 默认值；解析失败视为无草稿并静默清除损坏文件。

失败场景（原则4）：

| 场景 | 行为 | 上层反馈（M6 消费） |
|------|------|-------------------|
| draft.json 解析失败/结构损坏 | 视为无草稿，清除损坏文件后正常进入常规编辑模式 | 无感知 |
| save() 配额满/IO 失败 | 仅该次持久化失败；工作副本与「预览 · 示例」照常（二者本就不依赖缓存文件），后续编辑自动重试写入 | 一次性提示「更改暂存失败，刷新后未保存修改将丢失」，不阻塞编辑 |
| OPFS 与 localStorage 均不可用 | `available=false`：不产生草稿缓存文件，设置页回落逐字段即时提交（当前 v0.2.5 行为） | 横幅「更改暂存不可用，已切换为即时生效模式」 |
| 草稿引用的 skinId 对应皮肤已被删除 | `load()` 不校验资产存在性（交由 M2 渲染降级）；M4 删除时联动清空草稿 skinId（见 M4 §5） | 预览按无皮肤渲染，不白屏 |
