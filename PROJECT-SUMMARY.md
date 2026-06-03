# PaperWeave · 项目总结与状态

> 最后更新：2026-06-01（对齐真实代码状态 + 纳入定位/持久化两项决策）

本文档复盘项目当前的**真实**状态、已交付能力、关键设计决策。后续完善计划见 [`OPTIMIZATION-ROADMAP.md`](./OPTIMIZATION-ROADMAP.md)。

---

## 一、项目定位

**PaperWeave 是一个研究型论文助手，主张"不替你写论文，但让写论文之外的每一步都顺起来"。**

它把研究生命周期切成 7 环主线：

```
查论文  →  读文献  →  生 idea  →  做验证  →  论文绘图  →  讲结果  →  可视化表达
```

工具不是孤立功能列表，而是一条**上游输出即下游输入**的链路。这是 PaperWeave 区别于"AI 工具箱"类产品的根本切入点。

> **定位决策（2026-06-01）**：主仓**只保留科研工作流主线**。原"资产/复刻类"工具（Bruno 3D 沙盒、Fluid Simulation、Aurora、Hamish、算法可视化、Toolbox 背景、Web Beautifier）将拆到独立 showcase 仓库，避免定位分裂。详见路线图 P0.1。

---

## 二、已交付能力盘点（真实状态）

> 注意：早期文档把 paper-search / library / viewer / 部分 explainer 标为"占位/规划"，**实际代码均已落地**，本节按代码现状校正。

### 2.1 前端框架与设计系统
- **Next.js 16 App Router** + React 19 + Tailwind v4
- 暖纸面 + 5 团慢速漂移 blob + SVG 颗粒层的设计语言
- 设计组件本身被产品化到 `tools/web-beautifier`，可即插即用
- **注册表驱动架构**：新增工具 = 加一行数据 + 一个 page 文件

### 2.2 论文工作流核心（已落地）

| 能力 | 路由 / 模块 | 核心技术 | 状态 |
| --- | --- | --- | --- |
| 多源论文检索 | `app/tools/paper-search`（1100 行）+ `api/paper-search` | OpenAlex + arXiv 聚合，领域包 + 自定义关键词 | ✅ |
| 论文库 | `app/library`（734 行）+ `api/papers` | 元数据 + 全文 + 总结 + 笔记 + 标签 | ✅ |
| PDF 阅读器 + 批注 | `app/viewer/[id]`（506 行）+ `api/annotations` | react-pdf + 高亮/批注/笔记，标注分类 | ✅ |
| AI 论文分析 | `api/analyze` / `api/analyze-paper` | 抽取研究问题/方法/创新点/应用方向 | ✅ |
| arXiv / PDF 导入 | `api/papers/import/*` | arXiv 元数据 + PDF 下载入库 | ✅ |

### 2.3 读文献 / 做验证工具（已落地）

| 阶段 | 工具 | 核心技术 |
| --- | --- | --- |
| 读文献 | 文献网页速读器 | DeepSeek 流式 + cheerio 正文抽取 |
| 读文献 | 论文资料整理器 | turndown + mammoth + pdf2md + OMML→LaTeX |
| 做验证 | 研究任务规划器 | DeepSeek 结构化拆解 |
| 做验证 / 论文绘图 | 研究自动化封装器 | 输出可落地 SKILL.md |

### 2.4 模型可视化 ·"讲结果"系列（已落地）

| 工具 | 核心技术 |
| --- | --- |
| CNN 端到端讲解 | tiny-VGG + TF.js 浏览器内**真实推理** |
| 医学图像分割 | FWMamba-UNet 离线预计算激活回放 |
| Transformer 可视化 | D3.js 注意力权重热图 + 多头注意力 |
| GAN 生成对抗网络 | 潜向量交互 + 损失曲线动态图表 |
| 扩散模型可视化 | Canvas 动态噪声 + U-Net 去噪过程 |
| iGEM HPI Potsdam 2025 | three.js R3F + 三段式滚动叙事 |

### 2.5 仍为占位的工具（2 个）
- `idea-generator` · Idea 生成器（`comingSoon: true`）
- `markdown-summarize` · 论文内容结构化总结（`comingSoon: true`）

每个占位页用统一的 `<ComingSoon>` 组件交付，意图/输入/输出/衔接说明已写完，等接 backend。

---

## 三、技术栈与关键设计决策

| 决策 | 替代方案 | 选择理由 |
| --- | --- | --- |
| Next.js 16 App Router | Vite SPA / Nuxt / Astro | 多工具路由 + 流式 API + 注册表驱动天然吻合 |
| DeepSeek + Vercel AI SDK（流式工具） | OpenAI / Claude / Qwen | 价格最优，流式输出统一抽象 |
| OpenAI / Gemini（论文分析，可切换） | 单一供应商 | `AI_PROVIDER` 环境变量切换，留出冗余 |
| OpenAlex + arXiv 检索 | 单一 arXiv | 覆盖更广，OpenAlex 含引用图谱 |
| **本地 Dexie 优先 + 云端 Prisma/Postgres 可选** | 纯云端 / 纯本地 | clone 即用、零配置门槛；需要同步再配数据库 |
| TF.js 浏览器内推理 | 后端推理服务 | "真实推理"是产品差异点，零运维 |
| three.js + R3F | Babylon / 原生 WebGL | 生态最广，迁移成本最低 |
| 注册表驱动 | 路由文件即清单 | 元数据集中、过滤/搜索/排序统一处理 |

> **持久化决策（2026-06-01）**：当前 `lib/db/local-db.ts`(Dexie) 与 `lib/db/prisma.ts`(Postgres) 并存、library 页两边都调，存在数据真相源不唯一的隐患。已定方向为**本地优先 + 可选云同步**，统一工作见路线图 P1.1。

---

## 四、当前的局限与坑位

诚实列一下已知问题：

1. **定位分裂**：科研工作流 + 前端炫技资产两个产品混在一仓 → 已决定拆库（P0.1）。
2. **双持久层并存**：Dexie 与 Prisma/Postgres 数据源不唯一，易出脏状态 → 已定本地优先（P1.1）。
3. **两个核心工具仍占位**：idea-generator / markdown-summarize 是链路中段衔接点。
4. **全中文**：海外触达为零，无 i18n（P2.1）。
5. **第三方版权与缺 LICENSE**：内置了 Bruno / Fluid Sim / Hamish 等作品，有合规风险，且无正式协议（P0.3）。
6. **LLM 模型偏旧**：`lib/services/ai.ts` 仍在用 `gpt-3.5-turbo` / `gemini-pro`，且 LLM client 分散在三处（P3）。
7. **测试与 CI 基本为零**：只有手动 `pnpm build`（P1.2 / P2.2）。
8. **巨型组件**：paper-search 1100 行、library 734 行，难维护（P2.2）。
9. **3D 页面无性能降级**：低端机掉帧（P4）。
10. **无可观测性 / SEO**：错误率、token 消耗无埋点，无 OG 图 / sitemap（P2.3 / P4）。

---

## 五、下一步行动

详细优先级清单见 [`OPTIMIZATION-ROADMAP.md`](./OPTIMIZATION-ROADMAP.md)。当前聚焦 **P0 门面**：

1. 拆资产库，主仓收敛到科研工作流（定位）
2. README 配 Demo GIF + Live Demo（门面）
3. 补 LICENSE + 处理第三方版权（合规）
4. ~~修文档与代码不一致~~（README 已重写、本文档已校正）

---

## 一句话总结

**前端骨架 + 7 环主线已成型，论文检索 / 论文库 / PDF 批注 / AI 分析 / 5 个模型可视化均已跑通；接下来的瓶颈不在再写工具，而在收敛定位、统一持久层、补齐门面与合规，把"个人项目"打磨成爆款级开源项目。**
</content>
