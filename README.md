# PaperWeave · 研究型论文助手

[![CI](https://github.com/unumbrela/toolbox/actions/workflows/ci.yml/badge.svg)](https://github.com/unumbrela/toolbox/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)

> 把研究织起来，from **search** to **story**。
> 不替你写论文——让写论文**之外**的每一步都顺起来。

<!-- ⚠️ 待补：在这里放一张核心功能的演示 GIF（论文检索 → 入库 → PDF 批注 → AI 总结的端到端流程），
     这是决定访客是否 Star 的第一眼。建议尺寸 1280×720，放到 docs/demo.gif 后改成下面这行： -->
<!-- ![PaperWeave Demo](./docs/demo.gif) -->

<p align="center">
  <em>（演示 GIF 占位 — 见上方注释）</em>
</p>

---

## 这是什么

市面上"AI 帮你写论文"的工具已经够多了。PaperWeave 做的是**写论文之外的全链路**：把"查、读、想、验、画、讲、展"这 7 件事，从散落在 10 个网站之间的状态，收回到同一条工作流里——**上游的输出，就是下游的输入。**

```
查论文  →  读文献  →  生 idea  →  做验证  →  论文绘图  →  讲结果  →  可视化表达
```

首页把这 7 个阶段并排展开，点任意一环，下面的工具按阶段过滤。

## 技术栈

| 层 | 选型 |
| --- | --- |
| 框架 | `Next.js 16`（App Router）+ `React 19` + `TypeScript 5` |
| 样式 | `Tailwind v4` + 自研暖纸面设计系统 |
| AI | `Vercel AI SDK v5` 流式输出，默认 **DeepSeek**；论文分析支持 **OpenAI / Gemini** 切换 |
| 检索 | **OpenAlex** + **arXiv**（默认源，已通）；**Semantic Scholar** 已接入（可选，支持自带 API key）；IEEE / Scopus / PubMed / ACM / Web of Science 规划中 |
| 持久化 | **本地** `Dexie`（IndexedDB，含 PDF Blob，单一真相源）+ **可选云端** `Supabase`（Auth + Postgres + 行级隔离 RLS）跨设备同步 |
| 可视化 | `Three.js` / `@react-three/fiber`、`D3.js`、`TensorFlow.js`、`Framer Motion` |

---

## 核心能力

### 🔎 论文检索与论文库
- 多源聚合检索（OpenAlex + arXiv），预设领域包（CV / NLP / 多模态 / 机器人 / 强化学习 …）+ 自定义关键词
- **后端检索缓存**（可选）：配上 Supabase service-role 后，热门查询命中 Postgres 缓存直接返回（14 天 TTL），并在检索页展示「🔥 热门检索」——不配则透明降级为直连上游
- 结果直接组织成**论文库卡片网格**，一键入库
- 论文库 `/library`：元数据 + 全文 + 结构化总结 + 笔记 + 标签，本地优先、可云端同步

### 🕸️ 引用网络图谱
- 对任一 OpenAlex 论文，一键展开**引用网络**：参考文献（它引用谁）+ 被引文献（谁引用它）汇成一张 **D3 力导向图**
- 圆越大被引越多，支持缩放 / 拖拽 / 点击直达；从检索结果卡片对 OpenAlex 论文点「引用网络」即可带入

### 📑 引文导出 · 多篇对比 · 问你的论文库
- **BibTeX / 引文导出**：论文库每篇一键导出 BibTeX + APA / MLA / GB-T 7714；整库可一键导出 `.bib`（纯本地、无需 key）
- **多篇论文对比表** `/tools/paper-compare`：从库勾选 2-6 篇，AI 生成「研究问题/方法/数据集/指标/创新点/局限」横向对比矩阵，导出 Markdown
- **问你的论文库（语义检索 RAG）** `/tools/library-qa`：对入库论文建 **embedding 语义索引**（OpenAI / Gemini，向量在本机 Dexie 缓存、重复提问不重复计费），自然语言提问 → 检索 top-k → LLM 归纳出**带 [n] 引用、可溯源到具体论文**的答案

### 📊 统计看板 · 🔗 只读分享
- **统计看板** `/library/stats`：论文库的来源 / 年份 / 月度入库 / 批注分类分布、主题标签云、被引 Top5——纯本地（Dexie）、零配置即用
- **只读分享**（可选）：配上 Supabase service-role 后，单篇论文（含批注 + 笔记）或整库可一键生成**公开只读链接** `/share/[token]`（点击那刻的 JSON 快照，与本地后续编辑解耦，30 天有效）；未配置则分享入口自动隐藏

### 🛡️ 可靠性与可观测性
- **流式输出**：RAG 答案 / 多篇对比逐字流式（多供应商 DeepSeek→OpenAI→Gemini，首 token 前自动 fallback）
- **路由加固**：关键路由 `zod` 入参校验；免 key 公开路由（检索 / 引用图 / PDF 代理 / 分享）按 IP **内存滑动窗口限流**；OpenAlex 上游调用带超时
- **可观测性**：结构化 JSON 访问日志 + `/api/metrics` 聚合（调用量 / 错误率 / 平均耗时 / 缓存命中率 / 各 LLM 供应商占比，可用 `METRICS_TOKEN` 加门禁）
- **SEO/社交**：`sitemap.xml`（注册表驱动自动收录）+ `robots.txt` + 动态 OpenGraph 卡片

### 📖 PDF 阅读器 + 批注
- 内置 PDF 阅读器 `/viewer/[id]`，支持高亮 / 批注 / 笔记
- 标注分类（highlight / insight / todo / transferable），可沉淀为研究笔记

### 🧠 模型可视化（"讲结果"系列）
- **CNN 端到端讲解**：tiny-VGG 在浏览器里**真的跑** TF.js 推理，逐层看 feature map 流动
- **医学图像分割**：FWMamba-UNet 真实中间层激活离线预计算 + 交互回放
- **Transformer / GAN / 扩散模型**：注意力热图、潜向量交互、去噪过程逐步可视化

### 🧩 研究自动化
- **研究任务规划器**：把模糊想法拆成原子子问题 + 验收清单 + Runbook
- **研究自动化封装器**：产出可直接落地到 `~/.claude/skills` 的 `SKILL.md`，也可封装论文绘图流程
- **文献网页速读器 / 资料整理器**：URL 或 Word/PDF/HTML → 带 LaTeX 公式与表格的干净 Markdown

> 完整工具清单见 [`lib/tools-registry.ts`](./lib/tools-registry.ts) —— 这是全站工具的**单一事实源**。

---

## 设计哲学：注册表驱动

新增一个工具的**边际成本极低**：

1. 在 `lib/tools-registry.ts` 加一条数据（名称、阶段、图标、路由）
2. 写一个 `app/tools/<slug>/page.tsx`

过滤、搜索、排序、首页展示全部自动接管。欢迎照这个模式提 PR。

---

## 本地运行

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

构建 / 启动 / 校验：

```bash
pnpm build
pnpm start
pnpm lint          # 硬门禁：核心链路 0 error
pnpm test          # Vitest 单测（arXiv / 检索过滤 / OMML→LaTeX / 注册表 / 仓储层 / 检索缓存 / 引用构图 / 引文 / 对比 prompt / RAG 检索 / 分享快照 / 库统计 / 限流 / 指标）
pnpm test:e2e      # Playwright 浏览器级 happy-path（检索→入库→论文库；拦截 API 注入 fixture，不依赖外网）
```

> **零配置可用**：不配任何环境变量也能跑——论文库走纯本地 `IndexedDB`（Dexie），
> 检索→入库→阅读→批注→笔记全程不触达数据库。PDF 首次在线打开后会**静默缓存为本地 Blob**，
> 之后可离线阅读。`pnpm test` 中的仓储层用例为「不开云同步时绝不发起任何网络请求」盖了章。

### 环境变量

在项目根目录创建 `.env.local`：

```bash
# ── AI（论文分析与流式工具）────────────────────
DEEPSEEK_API_KEY=your_deepseek_key      # 默认 LLM
DEEPSEEK_API_URL=https://api.deepseek.com/v1
OPENAI_API_KEY=your_openai_key          # 可选，论文分析备选；语义检索 RAG 的 embedding 主供应商
GOOGLE_API_KEY=your_gemini_key          # 可选，论文分析备选；语义检索 RAG 的 embedding 备选（DeepSeek 无 embedding 接口）
AI_PROVIDER=openai                      # openai | gemini（论文分析走哪家）

# ── 登录与跨设备同步（可选，配上才显示登录入口）──────────
NEXT_PUBLIC_SUPABASE_URL=...            # Supabase 项目 URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=...       # Supabase anon key

# ── 后端检索缓存 / 只读分享（可选，仅服务端）──────────────
SUPABASE_SERVICE_ROLE_KEY=...           # ⚠️ service-role key，只放服务端，永不加 NEXT_PUBLIC_ 前缀

# ── 其它可选 ────────────────────────────────────────
NEXT_PUBLIC_SITE_URL=https://your.domain  # 站点绝对地址（sitemap / canonical / OG 用，默认占位域名）
METRICS_TOKEN=...                          # 配上则 /api/metrics 需 ?token= 才可访问（不配则公开只读聚合数）
```

> 只想跑前端工具和模型可视化？**只配 `DEEPSEEK_API_KEY` 即可**；不配任何 env 也能跑——论文库走纯本地 IndexedDB 模式。

需要跨设备同步时，去 Supabase 控制台执行 [`supabase/schema.sql`](./supabase/schema.sql) 建表（4 张表 + 行级隔离 RLS），详见 [`AUTH-SETUP.md`](./AUTH-SETUP.md)。

---

## 部署上线

一键部署到 **Vercel**（Next.js 官方平台，免费 Hobby 足够），完整步骤（含 Cloudflare 买域名、接 DNS）见 [`DEPLOY.md`](./DEPLOY.md)。

**AI = 访客自带 key**：公开部署时服务端默认不带任何 LLM key，访客在站内 **`/settings`**（右上角「API Key」）填入自己的 DeepSeek / OpenAI / Gemini key——只存本机 localStorage、经请求头转发、服务端不持久化。这样公开 demo **不花站长的钱、也不会被刷爆**；检索 / 阅读 / PDF 批注 / 模型可视化等功能**不需要 key 也能用**。

> 已做好 serverless 适配：PDF 走同源代理 `/api/pdf-proxy`（不再落盘）、AI 路由 `maxDuration` ≤ 60s（Hobby 上限）。

**登录 + 跨设备同步（可选）**：配上 Supabase（`NEXT_PUBLIC_SUPABASE_URL` + `ANON_KEY`）即可启用 Google / 邮箱 / 手机号登录,登录后论文库 / 批注 / 笔记跨设备同步、清缓存不丢(Auth + Postgres + 行级隔离 RLS,无需运维服务器)。不配则隐藏登录入口、退回纯本地。设置步骤见 [`AUTH-SETUP.md`](./AUTH-SETUP.md)。

---

## 项目结构

```text
app/
  api/                  # 流式与数据接口（解析 / 代理 / 调 LLM；缓存层可选）
    paper-search/       # 多源论文检索（OpenAlex + arXiv）+ hot/（热门检索词）
    citation-graph/     # 引用网络聚合（OpenAlex referenced_works + cites）
    compare-papers/     # 多篇论文 AI 横向对比
    library-qa/         # 语义检索 RAG：embed/（向量化）+ answer/（带引用归纳）
    share/              # 只读分享：建快照 + status + [token] 读取（service-role）
    metrics/            # 聚合指标快照（调用量/错误率/耗时/命中率）
    papers/import/      # arXiv / PDF 导入（纯内存解析，不持久化）
    pdf-proxy/          # 同源 PDF 代理（带 SSRF 防护 + 限流）
    analyze/  analyze-paper/   # AI 论文分析
    summarize/  markdown-convert/  markdown-summarize/
    idea-generator/  chunk-it-up/  skill-maker/  explain/
  tools/                # 各工具页（注册表驱动）
  library/  viewer/     # 论文库 + PDF 阅读器
  settings/             # 访客自带 key（BYOK）设置页
  layout.tsx  page.tsx  globals.css
components/
  tool-card.tsx  tool-shell.tsx
  pdf/  annotation/  sidebar/  auth/
  cnn/  transformer-explainer/  gan-explainer/  diffusion-explainer/  ...
lib/
  tools-registry.ts     # 工具元数据单一事实源 + Phase 枚举
  db/                   # repository.ts（Dexie 单一真相源）+ types.ts
  sync/  supabase/  auth/   # 可选云同步（Supabase Auth + Postgres + RLS）
  paper-search/  annotation/  workflow/  export/
  ai.ts  ai/            # LLM client wrappers（流式 + 非流式 fallback）
```

---

## 设计语言

- 暖纸面底 + 5 团慢速漂移的 radial blob + SVG `feTurbulence` 颗粒层
- 衬线斜体做强调，等宽做技术标签，sans 主体
- 极简卡片 + hairline 分隔，受 Raycast / Trae 启发
- 全局暖色动态背景由 `components/mesh-background.tsx` 提供

---

## 路线图

项目当前真实状态、已交付能力、关键设计决策与下一步行动，见 [`PROJECT-SUMMARY.md`](./PROJECT-SUMMARY.md)。

## 贡献

欢迎 PR。新增工具请遵循"注册表驱动"模式；提交前请确保 `pnpm lint` 与 `pnpm build` 通过。

## License

本项目以 [MIT License](./LICENSE) 开源。

「可视化表达」环内置的 HPI Potsdam 2025 iGEM 主页素材**版权归原作者所有**，建议在公开发布前以"外链引用"替代"代码内置"，规避授权风险。（原先内置的 Bruno Simon folio-2019、Pavel Dobryakov Fluid Simulation、HamishMW portfolio 等复刻作品已随资产工具一并从主仓移除。）
</content>
</invoke>
