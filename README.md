# PaperWeave

[![CI](https://github.com/unumbrela/toolbox/actions/workflows/ci.yml/badge.svg)](https://github.com/unumbrela/toolbox/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-61dafb)](https://react.dev/)

**一个覆盖科研全流程的论文工作台。** 它不替你写论文，而是把写论文**之外**的每一步——查、读、想、验、画、讲、展——从散落在十几个网站之间的状态，收回到同一条工作流里。

```
查论文 → 读文献 → 生 idea → 做验证 → 论文绘图 → 讲结果 → 可视化表达
```

上游工具的输出，就是下游工具的输入。首页把这 7 个阶段并排展开，点任意一环即可按阶段过滤全部 18 个工具。

---

## ✨ 功能总览

### 🔎 查论文
- **多源聚合检索**（[`/tools/paper-search`](app/tools/paper-search/page.tsx)）：OpenAlex + arXiv 双源并发检索，`Promise.allSettled` 保证单源故障不拖垮整体；支持领域包（CV / NLP / Mamba / 扩散模型…）、必含/排除关键词、年份与会议过滤、检索中途取消。
- **服务端检索缓存**（可选）：配置 Supabase 后热门查询直接命中 Postgres 缓存（14 天 TTL），检索页展示「🔥 热门检索」；不配置则透明降级为直连上游。
- **引用网络图谱**（[`/tools/citation-graph`](app/tools/citation-graph/page.tsx)）：任选一篇 OpenAlex 论文，参考文献 + 被引文献汇成一张 **D3 力导向图**，圆越大被引越多，支持缩放/拖拽/点击直达。
- **研究方向发展族谱**（[`/tools/research-genealogy`](app/tools/research-genealogy/page.tsx)）：图谱看单篇，**族谱看整个方向**——配套的 [`research-genealogy`](skills/research-genealogy/SKILL.md) skill 在终端做多轮检索 + 引文滚雪球，产出「奠基 → 路线分叉 → 并行竞争 → 前沿」的发展族谱（每条 builds-on 边经真实引文核验，绝不凭记忆报论文）；产物 `lineage.json` 粘贴回站内即渲染成可点击的族谱树。

### 📚 论文库（本地优先）
- **入库即拥有**（[`/library`](app/library/page.tsx)）：元数据、摘要、AI 结构化总结、研究笔记、标签，全部存在浏览器 IndexedDB（Dexie），**无需注册、断网可用**。
- **PDF 阅读器 + 四类批注**（[`/viewer/[id]`](app/viewer/[id]/page.tsx)）：高亮 / 洞见 / 待办 / 可迁移四种标注，选区 AI 解释，阅读进度自动保存；PDF 首次在线打开后静默缓存为本地 Blob，之后**断网也能读**。
- **引文导出**：每篇一键导出 BibTeX + APA / MLA / GB/T 7714，整库一键导出 `.bib`——纯本地纯函数，无需任何 API key。
- **统计看板**（[`/library/stats`](app/library/stats/page.tsx)）：来源 / 年份 / 月度入库 / 批注分类分布、标签云、被引 Top 5，零配置即用。

### 🤖 AI 工作流
- **结构化总结 / Idea 生成 / 任务规划 / 论文绘图**：论文 Markdown → 关键点提取 → 差异化研究假设（含最小验证实验与风险清单）→ 原子子问题 + Runbook → 为验证实验生成**出版级绘图代码**（matplotlib / seaborn / plotly / TikZ，色盲友好配色 + 期刊单双栏尺寸 + 投稿自查清单），全程通过**一键流转**串联，零复制粘贴；产出可一键**回存**到论文条目，闭合工作流回环。
- **多篇论文对比**（[`/tools/paper-compare`](app/tools/paper-compare/page.tsx)）：从库中勾选 2–6 篇，AI 生成「研究问题 / 方法 / 数据集 / 指标 / 创新点 / 局限」横向对比矩阵，导出 Markdown。
- **问你的论文库（RAG）**（[`/tools/library-qa`](app/tools/library-qa/page.tsx)）：对入库论文建 embedding 语义索引（向量缓存在本机，重复提问不重复计费），自然语言提问 → 余弦检索 top-k → LLM 归纳出**带 [n] 引用、可溯源到具体论文**的答案，逐字流式输出；没配 embedding key 时**自动降级为本地 BM25 关键词检索**（零费用），只配 DeepSeek 也能用。
- **文献速读 / 资料整理**：URL 或 Word / PDF / HTML 文件 → 带 LaTeX 公式与表格的干净 Markdown（OMML→LaTeX 转换自研）。

### 🧠 模型可视化（讲结果系列）
- **CNN 端到端讲解**：tiny-VGG 用 TensorFlow.js **在浏览器里真实推理**，逐层查看 feature map 流动。
- **医学图像分割**：FWMamba-UNet 真实中间层激活离线预计算 + 交互回放。
- **Transformer / GAN / 扩散模型**：注意力热图、潜向量交互、逐步去噪可视化。
- **iGEM 交互叙事**：Three.js 3D 星图 + 三段式滚动叙事。

### 🔗 分享与协作
- **只读分享**（可选）：单篇论文（含批注 + 笔记）或整个论文库，一键生成公开只读链接 `/share/[token]`——内容是点击那一刻的 JSON 快照，与本地后续编辑解耦，30 天有效。

### 🧰 带出浏览器：Claude Code Skills
- 四个核心能力封装成可安装的 [Claude Code skills](./skills/README.md)：**`paper-search`**（终端里免 key 查 OpenAlex/arXiv）、**`research-genealogy`**（方向发展族谱：树 + 叙事报告，stdlib-only 脚本，免 key）、**`cite-paper`**（arXiv ID / DOI / 标题 → 真实元数据 → BibTeX + GB/T 7714）、**`paper-figure`**（出版级绘图规范 + 本地运行验证）。`cp -r skills/* ~/.claude/skills/` 即装即用。
- 「上游输出即下游输入」不止于站内：`research-genealogy` 在终端产出的 `lineage.json`，回到站内一键渲染成族谱树。
- 站内的「研究自动化封装器」可以继续生成你自己的 SKILL.md。

---

## 🏗️ 技术栈

| 层 | 选型 |
| --- | --- |
| 框架 | Next.js 16（App Router）· React 19 · TypeScript 5 |
| 样式 | Tailwind CSS v4 + 自研暖纸面设计系统 |
| AI | Vercel AI SDK 流式输出；非流式 **DeepSeek → OpenAI → Gemini** 三级自动 fallback；embedding 走 OpenAI / Gemini |
| 检索 | OpenAlex + arXiv 聚合（带超时与限流） |
| 持久化 | **本地** Dexie / IndexedDB（单一真相源，含 PDF Blob）＋ **可选云端** Supabase（Auth + Postgres + 行级隔离 RLS）跨设备同步 |
| 可视化 | D3.js · Three.js / React Three Fiber · TensorFlow.js |
| 测试 | Vitest（140 条单测）· Playwright（浏览器级 E2E）· GitHub Actions 四道硬门禁（lint / tsc / test / build） |

### 设计要点

- **本地优先**：clone 即用，不需要数据库、不需要注册。论文库的唯一真相源是浏览器 IndexedDB（[`lib/db/repository.ts`](lib/db/repository.ts)），云端只是可选的镜像层——仓储层单测明确保证「未开启云同步时零网络请求」。
- **访客自带 key（BYOK）**：公开部署时服务端可以不配任何 LLM key，访客在 `/settings` 填自己的 key，经请求头逐请求传递（[`lib/ai/keys.ts`](lib/ai/keys.ts)）。站长零成本，也不会被刷爆。
- **注册表驱动**：全站工具的单一事实源是 [`lib/tools-registry.ts`](lib/tools-registry.ts)。新增一个工具 = 加一条注册项 + 写一个 `app/tools/<slug>/page.tsx`，首页展示、阶段过滤、搜索、sitemap 全部自动接管。
- **优雅降级**：Supabase、LLM key、METRICS_TOKEN 全部可选——缺哪个就隐藏哪个入口或降级为直连，**任何环境变量都不配也能完整构建与运行**。

---

## 🚀 快速开始

```bash
# 要求 Node.js >= 20，包管理器 pnpm
pnpm install
pnpm dev          # http://localhost:3000
```

到这里**核心功能已经全部可用**：检索、入库、PDF 阅读批注、引文导出、统计看板都不需要任何配置。

### 可选配置（`.env.local`）

| 变量 | 作用 | 不配置时 |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | 流式 AI 工具默认可用 | 访客在 `/settings` 自带 key |
| `OPENAI_API_KEY` / `GOOGLE_API_KEY` | 非流式 fallback、embedding | 同上 |
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 登录 + 跨设备云同步 | 隐藏登录入口，纯本地模式 |
| `SUPABASE_SERVICE_ROLE_KEY` | 检索缓存 / 热门检索 / 只读分享 | 缓存降级直连，分享入口隐藏 |
| `METRICS_TOKEN` | 给 `/api/metrics` 加门禁 | 指标接口公开 |

登录与云同步的完整配置见 [`AUTH-SETUP.md`](./AUTH-SETUP.md)，部署上线（Vercel + Cloudflare）见 [`DEPLOY.md`](./DEPLOY.md)。

### 测试与检查

```bash
pnpm lint         # ESLint（CI 硬门禁）
pnpm exec tsc --noEmit
pnpm test         # Vitest 单测（16 个文件 / 140 条用例）
pnpm test:e2e     # Playwright E2E（检索→入库→论文库，API 拦截注入 fixture，不触外网）
pnpm build        # 任何 env 都不配也能构建
```

---

## 🛡️ 工程化与可靠性

- **路由加固**：关键路由 `zod` 入参校验；免 key 公开路由（检索 / 引用图 / PDF 代理 / 分享）按 IP 滑动窗口限流；上游调用全部带超时；PDF 代理带 SSRF 防护。
- **流式体验**：AI 输出逐字流式，支持中途停止并保留已生成文本；多供应商在首 token 前自动切换；未配 key 返回可读的 503 而不是中途断流。
- **可观测性**：结构化 JSON 访问日志 + [`/api/metrics`](app/api/metrics/route.ts) 聚合视图（调用量 / 错误率 / 平均耗时 / 缓存命中率 / 各 LLM 供应商占比）。
- **SEO**：注册表驱动自动生成 `sitemap.xml`、`robots.txt`、动态 OpenGraph 卡片。

---

## 📂 项目结构

```
app/                  # Next.js App Router
├── page.tsx          #   首页：7 环工作流走廊 + 工具网格
├── library/          #   论文库（列表 / 详情 / 统计看板）
├── viewer/[id]/      #   PDF 阅读器 + 批注
├── tools/<slug>/     #   18 个工具页（与注册表一一对应）
├── share/[token]/    #   只读分享页
└── api/              #   23 个 API 路由（检索 / AI / 分享 / 指标…）
components/           # UI 组件（按工具域分目录）
lib/
├── tools-registry.ts #   ★ 全站工具单一事实源
├── db/               #   ★ Dexie 仓储层（单一数据真相源）
├── ai/               #   ★ LLM 接入（流式 / 非流式 fallback / BYOK / embedding）
├── paper-search/     #   检索聚合 / 缓存 / 引用图构建
├── workflow/         #   工具间一键流转（handoff）
├── sync/ supabase/   #   可选云同步
└── export/ share/    #   引文导出 / 分享快照（纯函数）
skills/               # 可安装的 Claude Code skills（paper-search / research-genealogy / cite-paper / paper-figure）
test/                 # Vitest 单测      e2e/  Playwright
supabase/schema.sql   # 云端建表 + RLS（一次性粘贴运行）
```

## 🤝 贡献

新增工具的边际成本极低：在 [`lib/tools-registry.ts`](lib/tools-registry.ts) 加一条数据，写一个 `app/tools/<slug>/page.tsx`，其余全部自动接管。注册表的不变量（slug 唯一、页面文件存在、阶段合法）有单测守护。欢迎照此模式提 PR。

## 📄 License

[MIT](./LICENSE)
