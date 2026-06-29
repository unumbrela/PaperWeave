# PaperWeave

**中文** · [English](./README.en.md)

[![CI](https://github.com/unumbrela/PaperWeave/actions/workflows/ci.yml/badge.svg)](https://github.com/unumbrela/PaperWeave/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-61dafb)](https://react.dev/)

**PaperWeave 是一个本地优先的论文阅读与研究工作台。** 它不替你写论文，而是把写论文之外的每一步——找到论文、读懂论文、整理思路、写出结构、画出图表——集中到同一条工作流里完成。所有论文数据都存在浏览器本地的论文库中，这个论文库是唯一的数据来源（single source of truth）。

```
检索 → 精读 → 梳理 → 立论 → 撰写 → 制图
```

主线由六个步骤组成，对应一篇论文从检索到成稿的完整过程：**检索**最新文献 → 入库后**精读**批注 → 结构化**梳理**要点 → 在已有创新点之上**立论** → 把素材搭成结构后**撰写** → 生成出版级**制图**。每一步工具的输出，就是下一步工具的输入。首页把这六步并排展示，点击其中任意一步，即可按阶段筛选全部工作流工具。论文入库后即可在库内阅读、批注、问答，并基于库内容生成结果（梳理、对比、立论、撰写、制图）；生成的结果可以一键存回对应的论文条目，形成「检索—精读—生成—回存」的闭环。

![PaperWeave 首页](docs/screenshots/home-hero.png)

> 项目另外提供一个**可视化展厅**（CNN / Transformer / GAN / 扩散模型 / 医学分割等交互式教学演示），在浏览器内做真实推理或回放，用来理解和讲解模型。展厅**独立于工作流**，不进入论文库，也不参与一键流转。

> **本文是仓库的唯一文档**：既面向使用者介绍功能与上手方式，也给接手的开发者提供一份代码现状说明（架构、约定、不变量、已知问题）和运维手册（登录云同步、部署上线）。如果文档描述与代码不一致，以代码为准。

---

## ✨ 功能总览

### 🔎 检索

- **文献检索 · 多源聚合**（[`/tools/paper-search`](app/tools/paper-search/page.tsx)）：同时检索 OpenAlex、arXiv、Crossref、Europe PMC 四个来源，用 `Promise.allSettled` 保证单个来源失败不影响整体结果；支持领域包（CV / NLP / Mamba / 扩散模型…）、必含/排除关键词、年份与会议过滤、「🆕 近一年」新论文通道，以及检索中途取消。可选的**查询扩展**会把研究目标拆成多条子查询，跨来源并发检索后再重排（没有 LLM key 时自动降级为单条查询）。**一键速览**会把当前结果打包成一次批量调用，让 LLM 逐篇生成「一句话总结 + 方向定位」（入库时随 `summary` 一起保存，供下游复用）；每条结果也支持**一键阅读**——自动入库去重后直接打开 PDF 阅读器。
- **服务端检索缓存**（可选）：配置 Supabase 后，热门查询直接命中 Postgres 缓存（14 天有效期），检索页会显示「🔥 热门检索」；不配置则透明降级为直连上游来源。
- **引文网络图谱**（[`/tools/citation-graph`](app/tools/citation-graph/page.tsx)）：任选一篇 OpenAlex 论文，把它的参考文献和被引文献画成一张 **D3 力导向图**，圆越大表示被引越多，支持缩放、拖拽、点击跳转。
- **研究脉络族谱**（[`/tools/research-genealogy`](app/tools/research-genealogy/page.tsx)）：图谱看的是单篇论文，**族谱看的是整个研究方向**。配套的 [`research-genealogy`](skills/research-genealogy/SKILL.md) skill 在终端做多轮检索加引文滚雪球，产出「奠基 → 路线分叉 → 并行竞争 → 前沿」的发展族谱（每一条 builds-on 关系都经过真实引文核验，不靠模型记忆报论文）；产物 `lineage.json` 粘贴回站内即可渲染成可点击的族谱树。

| 多源文献检索 | 引文网络图谱 |
| --- | --- |
| ![文献检索](docs/screenshots/paper-search.png) | ![引文图谱](docs/screenshots/citation-graph.png) |

### 📖 精读 · 论文库（本地优先）

- **入库即拥有**（[`/library`](app/library/page.tsx)）：元数据、摘要、AI 要点、研究笔记、标签，全部存在浏览器的 IndexedDB（Dexie）里，**无需注册、断网可用**。
- **PDF 阅读器 + 四类批注 + 页面便签**（[`/viewer/[id]`](app/viewer/[id]/page.tsx)）：支持高亮、洞见、待办、可迁移四种标注，选中文字可让 AI 解释，阅读进度自动保存；**📒 页面便签**可以在页面任意位置贴一个便签，点开即写（段落大意、名词解释），可拖动位置，侧边栏汇总后可跳页，并随精读一起导出和只读分享；PDF 第一次在线打开后会静默缓存为本地 Blob，之后**断网也能读**。
- **引文导出**：每篇论文一键导出 BibTeX + APA / MLA / GB/T 7714，整库一键导出 `.bib`——全部是本地纯函数，不需要任何 API key。
- **统计看板**（[`/library/stats`](app/library/stats/page.tsx)）：展示来源、年份、月度入库、批注分类的分布，以及标签云和被引 Top 5，零配置即可使用。

| 论文库 | 统计看板 |
| --- | --- |
| ![论文库](docs/screenshots/library.png) | ![统计看板](docs/screenshots/library-stats.png) |

### 🤖 梳理 · 立论 · 撰写 · 制图（AI 工作流）

- **要点梳理 → 创新点立论 → 结构撰写 → 图表制图**：论文 Markdown → 结构化梳理关键点 → 在已有创新点之上提出差异化假设（含最小验证实验和风险清单）→ 把素材搭成论文结构和段落脚手架（[`paper-writer`](app/tools/paper-writer/page.tsx)，**只搭骨架、给段落级写作建议，不代写连贯正文**）→ 为方法和结果生成**出版级绘图代码**（matplotlib / seaborn / plotly / TikZ，附色盲友好配色、期刊单双栏尺寸、投稿自查清单）。整个过程通过**一键流转**串联，不需要复制粘贴；产出可以一键**存回**论文条目，闭合工作流。
- **文献对比矩阵**（[`/tools/paper-compare`](app/tools/paper-compare/page.tsx)）：从库中勾选 2–6 篇论文，AI 生成「研究问题 / 方法 / 数据集 / 指标 / 创新点 / 局限」的横向对比矩阵，可导出 Markdown。
- **文库问答（RAG）**（[`/tools/library-qa`](app/tools/library-qa/page.tsx)）：为入库论文建立 embedding 语义索引（向量缓存在本机，重复提问不重复计费），自然语言提问后先做余弦检索取 top-k，再让 LLM 归纳出**带 [n] 引用、可追溯到具体论文**的答案，逐字流式输出；没有配 embedding key 时**自动降级为本地 BM25 关键词检索**（零费用），只配 DeepSeek 也能用。
- **网页文献速览 / 文献格式转译**：输入 URL 或上传 Word / PDF / HTML 文件，转成带 LaTeX 公式和表格的干净 Markdown（OMML→LaTeX 转换为自研实现）。

![创新点立论](docs/screenshots/idea-generator.png)

### 🧠 可视化展厅（独立于工作流的交互式教学演示）

> 这一组工具**不属于上面的主线工作流**，不进入论文库，也不参与一键流转。它们用来理解一个模型、讲清一个项目，单独在首页的展厅区呈现。

- **CNN 端到端讲解**：tiny-VGG 用 TensorFlow.js **在浏览器里真实推理**，可逐层查看 feature map 的变化。（交互与教学路径**改编自 Georgia Tech 王等人的开源项目「CNN Explainer」**。）
- **医学图像分割**：FWMamba-UNet 的真实中间层激活离线预计算后做交互回放。（基于作者自己的 FWMamba-UNet 论文。）
- **Transformer / GAN / 扩散模型**：自建的端到端 next-token 流水线、潜向量交互、逐步去噪可视化。

| Transformer 讲解 | 扩散模型讲解 |
| --- | --- |
| ![Transformer](docs/screenshots/transformer-explainer.png) | ![扩散模型](docs/screenshots/diffusion-explainer.png) |

### 🔗 分享与协作

- **只读分享**（可选）：单篇论文（含批注和笔记）或整个论文库，一键生成公开只读链接 `/share/[token]`。内容是点击那一刻的 JSON 快照，与本地后续编辑互不影响，30 天有效。

### 🧰 带出浏览器：Claude Code Skills

- 四个核心能力封装成可安装的 [Claude Code skills](./skills/README.md)：**`paper-search`**（终端里免 key 查 OpenAlex / arXiv）、**`research-genealogy`**（研究方向发展族谱，输出树状结构加叙事报告，纯 stdlib 脚本，免 key）、**`cite-paper`**（arXiv ID / DOI / 标题 → 真实元数据 → BibTeX + GB/T 7714）、**`paper-figure`**（出版级绘图规范 + 本地运行验证）。执行 `cp -r skills/* ~/.claude/skills/` 即可安装使用。
- 「上游输出即下游输入」不止于站内：`research-genealogy` 在终端产出的 `lineage.json`，回到站内一键渲染成族谱树。
- 站内的「技能封装」工具可以继续生成你自己的 SKILL.md。

---

## 🏗️ 技术栈与架构

| 层 | 选型 |
| --- | --- |
| 框架 | Next.js 16（App Router）· React 19 · TypeScript 5 |
| 样式 | Tailwind CSS v4 + 自研暖纸面设计系统 |
| AI | 默认 **DeepSeek → OpenAI → Gemini** 三级自动 fallback（任意一家 key 即可用全部 AI 工具）；另接 **ZenMux** 网关，一个 key 解锁更高级模型——经 ZenMux 可路由 Claude / GPT / Gemini / DeepSeek / Qwen 等（在 `/settings` 选型，选中即作为主供应商，失败时回退默认链路）；embedding 走 OpenAI / Gemini |
| 检索 | OpenAlex + arXiv + Crossref + Europe PMC 聚合（带超时与限流，跨来源去重） |
| 持久化 | **本地** Dexie / IndexedDB（唯一数据来源，含 PDF Blob）＋ **可选云端** Supabase（Auth + Postgres + 行级隔离 RLS）跨设备同步 |
| 可视化 | D3.js · Three.js / React Three Fiber · TensorFlow.js |
| 测试 | Vitest（约 240 条单测 / 24 文件）· Playwright（2 条浏览器级 E2E）· GitHub Actions 四道门禁（lint / tsc / test / build） |

规模：约 3 万行 TS/TSX，工具注册表 **19 项**，**28** 个 API 路由。

### 工作流主线

首页把六步主线并排展开，每一步都标注它的输入和产出，相邻两步首尾相接。

![六步工作流](docs/screenshots/home-corridor.png)

### 数据流（最重要的理解）

```
UI / hooks ──只调──> lib/db/repository.ts（仓储层）──读写──> Dexie/IndexedDB（唯一数据来源）
                              │                                ├─ papers / annotations / notes / progress / embeddings
                              │                                └─ pdfBlobs（PDF 二进制独立表，列表查询不触达）
                              └─（仅登录且配置 Supabase 时）void cloudSync.push*() 不 await、
                                 fire-and-forget 镜像到 Supabase Postgres（RLS 按 user_id 隔离）
```

必须遵守的约定：

- **UI 永远不直接 fetch 论文数据接口**，所有论文/标注/笔记/进度的读写都经过 [`lib/db/repository.ts`](lib/db/repository.ts)。
- 云同步失败不影响本地；它的开关是**登录态**（`setCloudSyncUser`），未登录或未配置时 cloudSync 全部为 no-op；`test/repository.test.ts` 用单测保证默认情况下全程零网络请求。
- PDF Blob 永不上云，且存在独立的 `pdfBlobs` 表；`stripLocal` 在仓储层出口剥离本地元字段。

### LLM 接入（两路 + BYOK）

| 路 | 模块 | 说明 |
| --- | --- | --- |
| 流式 | [`lib/ai/stream.ts`](lib/ai/stream.ts) 的 `streamChat()` | 访客若选定 ZenMux 模型则优先用它，否则按 DeepSeek → OpenAI → Gemini 顺序 fallback，在首个 token 之前自动切换；未配 key 时由路由前置守卫返回可读的 503，不会中途断流；`idea-generator` 可走 reasoner 深度推理档 |
| 非流式 | [`lib/ai/client.ts`](lib/ai/client.ts) | 同样的顺序（ZenMux 选型优先 → DeepSeek/OpenAI/Gemini）fallback，每家带 30s 超时，第一个成功的即返回 |
| 模型网关 | [`lib/ai/zenmux.ts`](lib/ai/zenmux.ts) · [`lib/ai/models.ts`](lib/ai/models.ts) | ZenMux 是 OpenAI 兼容网关（baseURL `https://zenmux.ai/api/v1`），精选清单 `ZENMUX_MODELS`（`vendor/model` 形式的 id，已校验可调用）经 `x-zenmux-model` 头传入；闭源模型无需额外开通即可路由 |
| Embedding | [`lib/ai/embeddings.ts`](lib/ai/embeddings.ts) | OpenAI `text-embedding-3-small`(1536d) 为主 → Gemini `text-embedding-004`(768d) 为备；返回值带 `model` 标识，**不同模型的向量禁止互相比较** |

**BYOK（访客自带 key）**：[`lib/ai/keys.ts`](lib/ai/keys.ts) 的 `resolveKeys(req)` 按「请求头 `x-deepseek-key`/`x-openai-key`/`x-gemini-key`/`x-zenmux-key`（加选型 `x-zenmux-model`）优先 → 环境变量兜底」的顺序解析；前端对应 `lib/ai/user-keys.ts` 和 `/settings` 页。占位 key（如 `ci-placeholder`）视为未配置。公开部署时服务端可以不配任何 LLM key，站长零成本，也不会被刷爆。

### 注册表驱动

全站工具的单一数据来源是 [`lib/tools-registry.ts`](lib/tools-registry.ts)（`TOOLS` 数组，**19 项**），用 `track` 字段分成四档：

- `workflow`（8）：挂在六步主线、参与一键流转闭环的工具。
- `utility`（3）：与主干松耦合的外围工具（网页速览 / 文库问答 / 格式转译），在首页下放到 Utilities 区，phases 为空。
- `gallery`（6）：交互式教学演示（模型可视化），独立于工作流。
- `lab`（2）：命令行 / 自动化扩展（任务规划器 / 自动化封装器），phases 为空。

首页的过滤、搜索，以及 `app/sitemap.ts` 全部由它驱动。不变量由 `test/tools-registry.test.ts` 守护：slug 唯一、`app/tools/<slug>/page.tsx` 必须存在、phase 合法、各 track 完整划分 TOOLS。**新增一个工具 = 注册表加一项 + 写一个页面**，其他都不用动。

### 工具间流转（handoff）

[`lib/workflow/handoff.ts`](lib/workflow/handoff.ts)：上游 `stageHandoff(targetSlug, payload)` 写入 sessionStorage 后跳转，下游挂载时 `consumeHandoff(slug)` 一次性消费。payload 可携带 `sourcePaperId`，下游产出经 `SaveToLibrary` 组件存回该论文条目，闭合「论文 → 生成 → 回存」的流转。这条链路也能跨出浏览器：`skills/research-genealogy` 在终端产出 `lineage.json`，再到 `/tools/research-genealogy` 页渲染成族谱树（粘贴导入，无后端参与）。

---

## 🔒 约定与不变量（改代码前必读）

1. **零配置构建**：`pnpm build` 在没有任何 env 时必须通过——所有外部依赖的初始化都必须惰性、可空降级。
2. **best-effort 外围**：检索缓存、云同步、日志指标，失败一律吞掉，绝不影响主功能返回。
3. **纯函数优先**：可测逻辑（构图、引文、快照、RAG 检索、缓存键、限流、fan-out 重排）一律抽成无副作用的纯函数放在 `lib/`，路由只做编排——这是本仓百余条单测得以轻量的原因，新逻辑请沿用。
4. **类型来源**：领域类型一律从 [`lib/db/types.ts`](lib/db/types.ts) 导入，不在页面里重复声明 `Paper`/`Author`。
5. **公开免 key 路由必须限流**：用 `enforceRateLimit`（[`lib/api/http.ts`](lib/api/http.ts)），上游 fetch 必须带超时；PDF 代理带 SSRF 防护（域名白名单）。
6. **maxDuration ≤ 60**：Vercel Hobby 的上限，新路由不要超。
7. 中文注释、中文 UI 是既定风格；commit message 用 `type: 中文描述`。

---

## 🚀 快速开始

```bash
# 要求 Node.js >= 20，包管理器 pnpm
pnpm install
pnpm dev          # http://localhost:3000
```

到这里**核心功能已经全部可用**：检索、入库、PDF 阅读批注、引文导出、统计看板都不需要任何配置。

### 环境变量行为矩阵（`.env.local`，全部可选）

| 变量 | 配置后 | 缺失时（必须保持可用） |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | 流式 AI 默认可用（idea 生成可用 reasoner 深度推理） | 返回可读的 503 提示，引导访客在 `/settings` 自带 key |
| `OPENAI_API_KEY` / `GOOGLE_API_KEY` | 与 DeepSeek 等效的 fallback + embedding | 同上 |
| `ZENMUX_API_KEY` | 解锁更高级模型（Claude / GPT / Gemini / DeepSeek / Qwen 等，经 ZenMux 网关，在 `/settings` 选型） | 不影响默认链路，照常用 DeepSeek/OpenAI/Gemini |
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 显示登录入口，登录即双向云同步 | 登录入口隐藏，纯本地模式 |
| `SUPABASE_SERVICE_ROLE_KEY`（加 `SUPABASE_URL`） | 检索缓存、热门检索、只读分享 | 缓存透明降级直连；分享入口隐藏 |
| `METRICS_TOKEN` | 给 `/api/metrics` 加门禁 | 指标接口公开 |

> 云同步真正的开关是**登录态**（[`lib/sync/cloud-sync.ts`](lib/sync/cloud-sync.ts) 的 `setCloudSyncUser`），没有独立的开关环境变量；未登录时零网络请求（有单测保证）。**任何环境变量都不配，也能完整构建与运行。**

### 测试与检查

```bash
pnpm lint                 # ESLint（CI 门禁；vendored 可视化代码在 eslint.config.mjs ignores 内）
pnpm exec tsc --noEmit
pnpm test                 # Vitest 单测（约 240 条 / 24 文件，约 0.6s 跑完）
pnpm test:e2e             # Playwright E2E（2 条，API 经 page.route 拦截注入 fixture，不触外网）
pnpm build                # next build --webpack；任何 env 都不配也能构建
```

---

## 🔑 登录与云同步（可选 · Supabase）

登录后论文库可以跨设备、换浏览器同步，清缓存也不丢。云端用 **Supabase**（Auth + Postgres + 行级隔离 RLS），全部托管，通过环境变量接到现有部署上。代码已经全部接好；下面是需要你**在 Supabase / Vercel 控制台操作**的步骤（约 15 分钟）。**做这些之前，站点照常以「纯本地模式」运行，登录入口不显示。**

1. **建 Supabase 项目**：打开 https://supabase.com → New project（选近的区域，如 Singapore）→ **Project Settings → API** 记下 **Project URL** 和 **anon public** key。
2. **建表 + 开 RLS**：控制台 **SQL Editor** → 把 [`supabase/schema.sql`](./supabase/schema.sql) 整段粘贴运行。它会建 4 张用户表（papers / annotations / research_notes / read_progress）并开启 RLS——每个用户只能读写自己的数据。
3. **配登录方式**（**Authentication → Providers**）：
   - **邮箱**：默认开启。
   - **Google 一键登录**：在 Google Cloud Console 建一个 OAuth 2.0 Web 客户端，已授权重定向 URI 填 `https://<你的项目>.supabase.co/auth/v1/callback`，拿到 Client ID / Secret 填回 Supabase 的 Google provider。
   - **手机号**（可选）：需要接付费 SMS 服务商（如 Twilio）；没接时登录框的手机方式会报错，属正常，邮箱 / Google 不受影响。
4. **回跳地址白名单（最容易出问题的一步——邮件确认打不开多半在这）**：**Authentication → URL Configuration** → **Site URL** 填生产域名（如 `https://www.z1ha0.com`；如果仍是 `localhost:3000`，所有确认邮件会回跳到本地打不开）；**Redirect URLs** 加上 `https://<生产域名>/**`、`http://localhost:3000/**`、`https://*.vercel.app/**`。回跳统一落到 `/auth/callback`。
5. **在 Vercel 配环境变量**（Production + Preview 都加），保存后 Redeploy 一次：
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://<你的项目>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = <anon public key>
   ```
   > anon key 受 RLS 保护，放在前端没问题。
6. **（可选）后端检索缓存 + 热门检索 + 只读分享**：`schema.sql` 另外会建两张「全站共享、仅 service-role 可读写」的表 `search_cache` / `shares`。要启用，再加一条**仅服务端**的变量：
   ```
   SUPABASE_SERVICE_ROLE_KEY = <service_role key>
   ```
   > ⚠️ service-role key 拥有完全权限，**永远不要加 `NEXT_PUBLIC_` 前缀、不要进前端**。不配则检索照常直连上游，热门检索和分享入口自动隐藏。

**工作原理**：本地始终是即时数据来源（写操作先落 Dexie，零延迟、可离线）；登录后每次写操作 best-effort 镜像到 Supabase（带 `user_id`，RLS 隔离），登录瞬间先上推本地已有的库，再拉云端全量合并 → 换设备或清缓存后登录即可恢复。**v1 限制**：PDF 文件本身不入云（只同步元数据），换设备时 arXiv 论文经 `/api/pdf-proxy` 自动重拉，本地上传的 PDF 需要原设备仍在；冲突合并是「最后写入者优先」（按 `updated_at`），适合单人多设备。

---

## 🌐 部署上线（Vercel + Cloudflare）

目标：部署成「任何人打开链接就能用」的公开站点。平台用 **Vercel**（Next.js 官方，免费 Hobby 足够）+ 域名用 **Cloudflare**（成本价）+ AI 用**访客自带 key**（公开零成本、不会被刷爆）。代码层的适配已完成，下面是需要你**亲自操作**（登录账号 / 付费）的步骤。

1. **推 GitHub**：`git push`（仓库已在 `github.com/unumbrela/PaperWeave`）。
2. **部署到 Vercel**（约 5 分钟）：打开 vercel.com 用 GitHub 登录 → **Add New → Project** → 选仓库 Import → Framework 自动识别为 Next.js（默认即可）→ **环境变量推荐全部留空**（走 BYOK：访客在 `/settings` 自带 key；想让 AI 默认可用且自己付费，再加 `DEEPSEEK_API_KEY` 并在后台设预算上限）→ **Deploy**。之后每次 `git push` 到 main 自动重新部署。
3. **买域名**（Cloudflare，约 $10/年）：打开 dash.cloudflare.com → **Domain Registration → Register Domains** → 搜名字付款。
4. **接域名到 Vercel**（约 5 分钟）：Vercel **Settings → Domains** 输入域名 Add → 按它给出的 DNS 记录（根域 `A → 76.76.21.21`、`www CNAME → cname.vercel-dns.com`，以页面实际为准）回到 Cloudflare **DNS → Records** 添加 → **关键一步**：把这两条记录的代理状态设为 **DNS only（灰色云朵）**，否则 Cloudflare 代理与 Vercel 证书会冲突 → 等几分钟生效，Vercel 自动签发 HTTPS。

**AI 成本模型**：服务端默认不带任何 LLM key；访客的 key 只存在他本机的 localStorage，调用时经请求头转发给模型厂商，我们的服务器不持久化——公开 demo 不花你的钱、不会被刷爆，检索 / 阅读 / 批注 / 可视化等不依赖 key 的功能照常可用。

**上线前的诚实清单**：① Vercel Hobby = 个人非商业用途，函数超时 60s（所有 AI 路由的 `maxDuration` 已压到 60；长文本生成偶发超时可升 Pro 放宽到 300s）；② 第三方素材版权——公开发布前注意内置第三方素材的授权；③ 全中文、无 i18n，海外门槛较高，可以先做一个英文落地页。

---

## 📂 项目结构

```
app/                  # Next.js App Router
├── page.tsx          #   首页：6 步工作流走廊 + 工具网格（注册表驱动）+ 可视化展厅 + Lab
├── library/          #   论文库（列表 / 详情（链路中枢）/ 统计看板）
├── viewer/[id]/      #   PDF 阅读器（react-pdf）+ 四类批注
├── settings/         #   访客自带 key 设置
├── share/[token]/    #   只读分享页
├── tools/<slug>/     #   工具页（与注册表一一对应：workflow / utility / gallery / lab）
├── opengraph-image.tsx, sitemap.ts, robots.ts
└── api/              #   28 个 route.ts（检索 / AI / 分享 / 指标…），全部 runtime=nodejs、maxDuration≤60
components/           # UI 组件（按工具域分目录）；通用件 states / use-stream（可 stop）/ tool-shell / workflow 控件
lib/
├── tools-registry.ts #   ★ 全站工具单一数据来源（19 项，4 track）
├── db/               #   ★ Dexie 表定义 / 仓储层 / 共享领域类型（types.ts）
├── ai/               #   ★ LLM 接入（流式 stream.ts / 非流式 client.ts / BYOK keys.ts / embedding）
├── paper-search/     #   多源检索聚合 / 缓存 / 引用图构建 / 查询扩展 / fan-out 重排（纯函数）
├── library-qa/       #   RAG 检索（cosine top-k + BM25 降级，纯函数）
├── genealogy/        #   研究方向族谱：lineage.json 解析 + DFS 树（纯函数）
├── workflow/         #   工具间一键流转（handoff）
├── sync/ supabase/   #   可选云同步（未配 / 未登录全 no-op）
├── api/              #   内存滑动窗口限流 / clientIp / 带超时 fetch / 结构化日志 + 指标
└── export/ share/    #   引文导出 / 分享快照（纯函数）
skills/               # 可安装的 Claude Code skills（paper-search / research-genealogy / cite-paper / paper-figure）
supabase/schema.sql   # 云端建表 + RLS（4 用户表 + search_cache + shares，控制台一次性运行）
test/  e2e/           # Vitest 单测（约 240 条）  ·  Playwright（happy-path + ai-tools）
```

---

## 🛡️ 工程化与可靠性

- **路由加固**：关键路由用 `zod` 校验入参；免 key 的公开路由（检索 / 引用图 / PDF 代理 / 分享）按 IP 滑动窗口限流；上游调用全部带超时；PDF 代理带 SSRF 防护。
- **流式体验**：AI 输出逐字流式，支持中途停止并保留已生成文本；多供应商在首个 token 之前自动切换；未配 key 返回可读的 503，而不是中途断流。
- **可观测性**：结构化 JSON 访问日志 + [`/api/metrics`](app/api/metrics/route.ts) 聚合视图（调用量 / 错误率 / 平均耗时 / 缓存命中率 / 各 LLM 供应商占比）。
- **SEO**：注册表驱动，自动生成 `sitemap.xml`、`robots.txt`、动态 OpenGraph 卡片。

### 🗒️ 已知问题 / 注意点

1. **内存态的限流与指标**：滑动窗口限流和 `/api/metrics` 都是每个实例一份，serverless 多实例下不汇总（设计上接受；要强一致需上 Upstash / Sentry）。
2. **检索缓存 / 分享需要 service-role**：这两个功能在未配 `SUPABASE_SERVICE_ROLE_KEY` 的部署上不可见，演示前需确认环境。
3. **全中文、无 i18n**；vendored 可视化代码（部分 explainer / ganlab）在 eslint ignores 内，历史 lint 债务未清。
4. **PDF Blob 不入云**（v1 设计）：换设备后需要重新在线打开一次 PDF 才能离线读。
5. 公开发布时注意内置第三方素材的授权；其余素材自有。

---

## 🤝 贡献

新增工具的成本很低：在 [`lib/tools-registry.ts`](lib/tools-registry.ts) 加一条数据，写一个 `app/tools/<slug>/page.tsx`，首页展示、阶段过滤、搜索、sitemap 全部自动接管。注册表的不变量（slug 唯一、页面文件存在、track/phase 合法）有单测守护。欢迎照这个模式提 PR。

## 📄 License

[MIT](./LICENSE)
