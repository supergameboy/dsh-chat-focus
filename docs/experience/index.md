# 经验文件索引

> 按 auto-task-experience-summarizer 技能维护；活跃经验 ≤5 份，超出时归档至 archive/。

| 文件 | 日期 | 主题 | 关键结论 |
|------|------|------|---------|
| [exp-20260909-bubble-skin-implementation.md](exp-20260909-bubble-skin-implementation.md) | 2026-09-09 | 气泡皮肤制作器实现 | `border-image-slice` 只收无单位源像素（写 px 静默丢弃）；background 图层不裁剪→静态图 border-image、动态素材整层/精灵；素材归一化 ≤256px 使切片数值=显示厚度；圆角半径可由首行不透明像素解析；宿主资产库走 connection RPC+GET 路由；隔离 DSH_HOME 实例可验证宿主半区 |
| [exp-20260824-design-review.md](exp-20260824-design-review.md) | 2026-08-24 | 设计文档审查 | `Measure-Object -Line` 不计空行；文档事实声明需行号级抽查；前置三文档缺失时的处理 |
| [migration-20260903-host-0.1.2-alpha.5-route-B.md](migration-20260903-host-0.1.2-alpha.5-route-B.md) | 2026-09-03 | 宿主 0.1.2-alpha.5 迁移（路线 B 聊天层化） | runtime 包删除后 fork 骑 ui-conversation 引擎行、替换 ui-chat 行；tsdown 打包会读 tsconfig paths 需 resolveId 指宿主 src；上游 turn-process 披露与自带折叠冲突需停用 |
