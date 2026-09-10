# 经验：气泡皮肤制作器实现（2026-09-09）

> 关联设计集：docs/design/2026-09-09 气泡皮肤增量系列（workflow-master / feature / solution / ui / interaction / code / task / test）。

## 1. 关键结论

| # | 结论 | 证据 |
|---|------|------|
| 1 | **`border-image-slice` 只接受无单位源图像素**：写 `18px` 会被判非法并**静默丢弃整条声明**（回落到默认 `100%`，九宫格失效，且无控制台报错）。`border-width` 才用长度。 | 隔离 dsh 实例实测：行内样式里 `border-image-slice` 直接消失，计算值 `100%`；改为 `18 18 18 18 fill` 后计算值正确 |
| 2 | **`background-image` 多图层不做区域裁剪**（每层绘制整张图，`background-size/position` 只做缩放定位），因此单图九宫格只能靠 `border-image`；而 `border-image` 不播放 GIF/APNG 动画。→ 结论：静态图走 `border-image` 九宫格，动态素材走整层背景/精灵动画。 | CSS 规范 + Chromium 现状；实现期放弃「9 层 background」方案 |
| 3 | **九宫格数值 = 源图像素 = 显示厚度**，所以素材必须归一化。制作器把静态素材压到最长边 ≤256px（WebP 0.92，回退 PNG），源像素与显示像素 1:1，切片数值即可直接当 `border-width`。 | 4001B / 120×120 测试素材：slice 18 → border-width 18px，渲染正确 |
| 4 | **圆角半径可由「外边缘首个不透明像素」解析求出**：圆角圆心 (r,r)、半径 r，首行 `y=1` 处 `x = r − √(2r−1)`，解出 `r = x + 1 + √(2x)`。对 18px 圆角估得 18，精确。 | 制作器「按内容自动估算」实测 18/18/18/18 |
| 5 | **精灵动画用 `steps(N−1)` + `translateX(−(N−1)/N × 100%)`**：元素宽 N×容器，`steps(N−1)` 的 N 个离散值恰好落在 N 个帧位；`background-position` 百分比在超宽背景上语义易错，`transform` 更稳。 | 单测 + 实测计算样式 `cf-sprite-<id>-4 0.333s steps(3) infinite`，元素宽 4×容器 |
| 6 | **宿主资产库走官方 seam**：写用 `connection.rpc.handle(channel, handler)`（channel 必须**单段**，如 `/chat-focus`，不能带 `/api` 前缀）；读用 `connection.fetch.register({ path: '/api/...', methods: ['GET','HEAD'] })`（仅 GET/HEAD，且必须位于 `/api/` 下）。两者都在 `/api` 信任栅栏 + 浏览器会话鉴权之后，不新增鉴权面。 | 隔离实例 curl 实测：未鉴权 401、未知 id 404、RPC 正常返回 |

## 2. 验证手法（可复用）

**隔离实例验证宿主半区改动**：宿主插件（`lib/index.js`）改动需要重启 dsh 才生效，但用户可能正在用。做法是另起一个实例：

```sh
# 1) 临时 DSH_HOME + junction 复用真实 profile 的 node_modules（不复制、不安装）
# 2) DSH_HOME=<tmp> node <host>/apps/cli/lib/bin.js web --port 8124 --no-open > /tmp/dsh.log 2>&1 &
# 3) 从日志取带 token 的 URL；curl -c jar "<url>" 换 cookie 后可直接打 RPC/资源路由
```

好处：不触碰用户实例、设置与皮肤库落在临时 home、可直接用 curl 验证宿主路由与 RPC 信封。

**IAB 浏览器窗格的限制**：其动画时间轴冻结（自建测试动画 `document.timeline.currentTime` 恒为 0），CSS 动画的**运动**无法在该窗格观察；改为核对计算样式（`animation-name` / `animation-timing-function` / `animation-duration`）与已注入的关键帧规则。另外该窗格的 Playwright「pointer probe」对部分按钮失败，必要时用 `evaluate` 做 DOM click、用 `cua.click` 做坐标点击。

**文件注入**：IAB 不支持真实上传（`fileChooser.setFiles` 直接报 capability_unsupported），但可在页面内用 `DataTransfer` + `input.files = ...` + `dispatchEvent(new Event('change'))` 驱动 React 的 file input，从而端到端跑通制作器（含 canvas 生成测试素材）。

## 3. 实现注意

- `exactOptionalPropertyTypes: true` 下，给宿主原语传 `undefined` 会报错：用 `{...(cond ? { prop } : {})}` 而不是 `prop={maybeUndefined}`。
- 项目同时含浏览器半区与 Node 半区，客户端 base tsconfig 默认隐藏 node 全局；本项目在 `tsconfig.json` 显式加 `"types": ["node", "client-build-environment"]`（客户端纯度仍由 tsdown 的 resolveId 守卫保证）。
- 加 node 类型后，`setTimeout` 返回 `NodeJS.Timeout`：浏览器代码统一用 `window.setTimeout` / `Ref<number>`，避免 `ReturnType<typeof setTimeout>` 漂移。
