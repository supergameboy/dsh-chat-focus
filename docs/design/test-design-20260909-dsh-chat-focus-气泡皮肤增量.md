# 测试设计 - dsh-chat-focus - 气泡皮肤增量

> G8 门禁交付物。验收标准 → 测试用例；含**回归集**（R 前缀）保证既有行为不变。

## 文档信息

| 项目 | 内容 |
|------|------|
| 创建日期 | 2026-09-09 |
| 上游 | feature-design 规格卡（FEAT-101~112）、interaction-design |
| 状态 | 已定稿（G8） |

---

## 1. 自动化用例（`tests/skin.check.ts` + `tests/skin-store.check.ts`，node + tsx）

| 用例 | 覆盖 | 断言 |
|------|------|------|
| TC-12 | `clampSlice` 越界夹取 | `l+r > width` 时被夹取；负值归零 |
| TC-13 | `borderImageStyle` 输出 | borderWidth/slice/repeat/source 与输入几何一致；`fill` 存在 |
| TC-17 | `spriteFrames` 数学 | `frames=4` → `steps=3, end=-75%, duration=4/fps`；`frames=1` → `null` |
| TC-18 | `spriteElementWidth` | `frames=24` → `'2400%'` |
| TC-06 | `detectKind` 单文件图片 | PNG/JPG/WebP 静态 → `image` |
| TC-07 | `detectKind` 动画嗅探 | GIF 多帧、APNG `acTL`、WebP `ANIM` → `animated` |
| TC-08 | `detectKind` 视频/多文件 | mp4/webm → `video`；多文件 → `sequence` |
| TC-19 | `skinAssetUrl` | 含 id 与版本戳；特殊字符被编码 |
| TC-20 | 宿主校验函数 | 非法 id/超长 name/超限 base64 被拒；合法请求通过 |
| TC-23 | `validateSkinSave` 视频族 | `video/mp4`、`video/webm` 通过；`video/ogg` 被拒；kind 与 mime 不一致被拒 |
| TC-24 | `videoObjectFit` | `cover → cover`；`stretch → fill` |
| TC-25 | `parseByteRange` + 资产路由 | `bytes=2-5 → 206` 且 `content-range` 正确；`bytes=-3` 取尾部；越界 → 416；无 Range → 200 |

## 2. 手工用例（浏览器实测）

| 用例 | 覆盖 | 步骤 | 期望 |
|------|------|------|------|
| TC-01 | FEAT-101 | 助手气泡底纹不透明度拖到 40 | 背景透出会话底色；文字清晰；刷新保持 |
| TC-02 | FEAT-101 | 拖到 0 | 底纹完全不可见，文字仍可见 |
| TC-03 | FEAT-102 | 毛玻璃选「中」 | 气泡背后内容模糊；计算样式含 `backdrop-filter` |
| TC-04 | FEAT-101 | 设置背景图片 + 不透明度 50 | 图片半透明，文字清晰 |
| TC-05 | FEAT-102 | 不支持 backdrop-filter 的浏览器 | 无模糊但不报错 |
| TC-09 | FEAT-104 | 3 秒 mp4 → 24 帧抽取 | 进度推进到 24/24；产出精灵图 |
| TC-10 | FEAT-104 | 抽帧中取消 | 立即停止，回到待处理 |
| TC-11 | FEAT-105 | 8 张 PNG 合成 | 精灵图 8 帧，气泡内 12fps 循环 |
| TC-14 | FEAT-107 | 保存皮肤并应用助手 | 列表出现；助手气泡立即换肤 |
| TC-15 | FEAT-107 | 删除被引用皮肤 | 确认提示；删除后气泡回落默认 |
| TC-16 | FEAT-107 | 重命名皮肤 | 列表与气泡说明同步更新 |
| TC-21 | FEAT-109 | 重启 dsh / 换浏览器 | 皮肤仍在、可用 |
| TC-22 | FEAT-110 | 五标签切换（含键盘上下/左右键）+ 窄屏 | 内容与预览同步切换；焦点可见；窄屏导航转横向、预览可折叠 |
| TC-26 | FEAT-112 | 气泡外观「复制到另一侧」；高级「恢复全部默认」 | 另一侧视觉与源侧一致；重置后全部回到初始值；设置文件各只发生一次 revision 变更 |
| TC-27 | FEAT-111 | 制作器视频选「直接使用视频」并应用 | 气泡内静音循环播放、无控制条；滚动离开视口后 `video.paused === true`；资产请求 `206` 且可 seek |

## 3. 回归集（不得变化）

| 用例 | 项 | 断言 |
|------|----|------|
| R-01 | 折叠框 | 展开/收起、摘要计数、localStorage 键与行为不变 |
| R-02 | 默认气泡视觉 | 未做任何自定义时，气泡颜色/圆角/内边距与 0.3.0 一致 |
| R-03 | Markdown 渲染 | 代码块横向滚动、表格、引用、文件引用链接正常 |
| R-04 | 用户气泡 | 右侧对齐、图片组、图标操作、pending/echo 行正常 |
| R-05 | 设置页固定预览 | 滚动到任意位置预览仍可见（`paneHeight` 逻辑未破坏） |
| R-06 | 既有字段 | 背景色/边框/圆角/最大宽度/字体/字号/内边距/遮罩/渐变/模板 全部仍生效 |
| R-07 | 插件开关 | `focusEnabled=false` / `focusBubbles=false` 行为不变 |
| R-08 | 构建 | `pnpm run typecheck && pnpm run decl && pnpm run bundle` 通过 |
| R-09 | 既有单测 | `pnpm run test:engine` 全绿 |
| R-10 | 设置页布局 | 左标签栏在宽屏保持纵向、窄屏转横向；表单独立滚动；预览常驻不遮挡表单 |

## 4. 执行记录（2026-09-09）

| 项 | 结果 |
|----|------|
| 自动化 TC-06~08, 12, 13, 17~20 | ✅ `tests/skin.check.ts` 全绿 |
| 宿主资产库 TC-19~21 | ✅ `tests/skin-store.check.ts` 全绿（真实磁盘 + 伪造 connection seam：保存/列表/重命名/删除/404/HEAD/持久化/无 connection 时惰性） |
| 回归 R-09 | ✅ `tests/engine.check.ts` 全绿 |
| 回归 R-08 | ✅ `typecheck` + `decl` + `bundle` 通过 |
| TC-19~21（真实宿主） | ✅ 隔离 dsh 实例（独立 DSH_HOME + 8124 端口）经 curl 实测：`/api/chat-focus/skin-asset` 未鉴权 401、未知 id 404、保存后磁盘出现 `<id>.bin` 且经路由按 `image/png` 返回 |
| TC-01/02/03（真实浏览器） | ✅ 底纹不透明度滑条 → 计算样式 `opacity: 0.4`；毛玻璃「中」→ `backdrop-filter: blur(10px) saturate(1.4)`；设置落盘 `focusBubbleBackdropOpacity: 40`、`focusBubbleBackdropBlur: 10px` |
| TC-06~08, 12, 13, 14（真实浏览器） | ✅ 注入测试 PNG → 识别为静态图片 → 自动估算切片 18px（对 18px 圆角精确）→ 保存并应用到两侧 → 设置落盘 `focusBubbleSkin` / `focusUserBubbleSkin` |
| TC-11, 17（真实浏览器） | ✅ 注入 4 帧 PNG 序列 → 合成 960×180 精灵图（4 帧 · 12fps）→ 保存为「精灵 4 帧」皮肤；渲染层 `animation: cf-sprite-<id>-4 0.333s steps(3) infinite`、元素宽 = 4× 容器、圆角裁剪生效、关键帧规则已注入 |
| TC-22 | ✅ 页签渲染、切换、键盘方向键；皮肤接管态 10 行控件置灰（初版为四页签，D6′ 后为五标签） |
| 变更后重验（2026-09-09，D6′/D8′ 回溯） | ✅ TC-23/24（视频族校验 + `object-fit` 映射）、TC-25（Range/206/416）新增并通过；`typecheck` + `decl` + `bundle` 通过；`test:engine` / `test:skin` / `test:store` 三套全绿 |
| TC-22/26 重验（左标签栏 + 批量操作） | ⏳ 需真实浏览器复核：五标签切换、复制到另一侧、恢复全部默认、窄屏折叠（结构改动后由本轮交付验证） |
| 环境限制 | IAB 浏览器窗格的动画时间轴冻结（自建测试动画 `document.timeline.currentTime` 恒为 0），故精灵**运动**未能在该窗格观察；帧数学由单测覆盖，动画名/步进/关键帧已按计算样式核对 |

## 5. 折叠框展开空白回归（2026-09-09 用户反馈修复）

| 项 | 结果 |
|----|------|
| 现象 | 展开活动折叠框后向下滚动出现多余空白 |
| 根因 | `.body` 的 `overflow-x: hidden` + `overflow-y: auto` 让 Chromium 把内层滚动内容折进外层滚动器 scrollHeight（实测泄漏 1303px） |
| 修复 | `.body` 加 `contain: paint` + 折叠开关锚定/贴底补正 |
| 验证 | 真实 dsh 页面实测 `leak = 0`、`composerBottomGapAtFloor = 0`（内层仍有 1776px 溢出）；tsc/decl/bundle + 三套单测全绿 |

## 6. 验收判定

- 自动化用例全绿 + 手工用例全通过 + 回归集全绿 = 交付就绪（G8 通过）。
- 任一回归用例失败 → 阻断交付，按回溯机制修正。

## 6. 修正轮记录（2026-09-09，独立验证后）

独立验证子 Agent 报出 9 项阻断 + 若干非阻断，已全部处理：

| # | 阻断项 | 修正 |
|---|--------|------|
| 1 | 皮肤素材 404/解码失败无兜底 | `BubbleBackdrop.SkinBackdrop`：图片族用 `Image` 探测、视频用 `onError`，失败回落无皮肤底纹 + 每 URL 一次 `console.warn` |
| 2 | 视频「起点/时长」参数未接线 | `SkinMaker` 新增起点/时长输入 → `SpriteOptions.startSeconds/durationSeconds` |
| 3 | 序列帧单帧失败即整体失败 | `buildSpriteFromSequence` 跳过失败帧并返回 `skipped`，制作器显示跳过文件名 |
| 4 | 素材体积/帧数上限缺失且 16MB 与 8MB 矛盾 | 新增 `SKIN_MAX_SOURCE_BYTES = 16MB`（源文件上限，`detectMedia` 校验）；直用视频路线另校验 8MB 存储上限（`SKIN_MAX_ASSET_BYTES`） |
| 5 | kind 取值与 `.mov` 文档不符 | 文档改为 `'image' | 'animated' | 'sequence' | 'video'`；删除 mov（白名单只接受 mp4/webm） |
| 6 | UI 设计正文仍是四页签 | §1.1 骨架与承载表改写为五标签 + 宽窄屏规则 |
| 7 | 代码设计悬空 `GeneralPanel.tsx`、壳契约过期、追溯矩阵缺 FEAT-111/112 | §1 模块表、§6 契约、§7 矩阵全部回填 |
| 8 | 追溯矩阵指向不存在的 UI 章节 | FEAT-112 → UI §5.2 |
| 9 | 切片遮罩规格未实现 | `SliceEditor` 新增 `.sliceMask`（`box-shadow: 0 0 0 9999px rgba(0,0,0,.45)`） |

非阻断修正：底纹不透明度滑条改为「拖动只更新草稿、释放才写设置」（与遮罩滑条一致）；视频皮肤缩略图改为播放标记瓦片（不再用 `url(.mp4)` 作背景）；精灵关键帧 style 元素加 64 条上限重建；6 个文档计数/命名/数值项同步；新增 TC-23/24/25 自动化断言与 TC-26/27 手工用例。

修正后复核：`typecheck` + `decl` + `bundle` 通过，`test:engine` / `test:skin` / `test:store` 全绿。
