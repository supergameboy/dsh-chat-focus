# 经验文件索引

> 按 auto-task-experience-summarizer 技能维护；活跃经验 ≤5 份，超出时归档至 archive/。

| 文件 | 日期 | 主题 | 关键结论 |
|------|------|------|---------|
| [exp-20260824-design-review.md](exp-20260824-design-review.md) | 2026-08-24 | 设计文档审查 | `Measure-Object -Line` 不计空行；文档事实声明需行号级抽查；前置三文档缺失时的处理 |
| [migration-20260903-host-0.1.2-alpha.5-route-B.md](migration-20260903-host-0.1.2-alpha.5-route-B.md) | 2026-09-03 | 宿主 0.1.2-alpha.5 迁移（路线 B 聊天层化） | runtime 包删除后 fork 骑 ui-conversation 引擎行、替换 ui-chat 行；tsdown 打包会读 tsconfig paths 需 resolveId 指宿主 src；上游 turn-process 披露与自带折叠冲突需停用 |
