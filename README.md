# PaperWeave

[![CI](https://github.com/unumbrela/toolbox/actions/workflows/ci.yml/badge.svg)](https://github.com/unumbrela/toolbox/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-61dafb)](https://react.dev/)

**一个本地优先的论文精读与研究推进工作台。** 它不替你写论文，而是把写一篇论文**之外**的每一步——从找到它，到读懂它、想清楚、写下来、画出来——从散落在十几个网站之间的状态，收回到同一条工作流里，以**浏览器内的论文库**为唯一真相源。

```
检索 → 精读 → 梳理 → 立论 → 撰写 → 制图
```

主线是一条二字动词链，读下来就是一篇论文从无到有的旅程：**检索**最新文献 → 入库 **精读** 批注 → 结构化 **梳理** 要点 → 在已有创新点之上 **立论** → 把素材搭成结构 **撰写** → 出版级 **制图**。上游工具的输出，就是下游工具的输入；首页把这条主线并排展开，点任意一环即可按阶段过滤全部工作流工具。论文进库即拥有，在库里读 / 批注 / 问，基于库内容生成（梳理 / 对比 / 立论 / 撰写 / 制图），产出再一键回存论文条目——闭合「检索—精读—生成—回存」回环。

> 此外另设一个**可视化展厅**（CNN / Transformer / GAN / 扩散模型 / 医学分割等交互式教学演示）：浏览器内真实推理 / 回放，纯粹用来「看懂」与「讲清」。它**独立于工作流**，不入论文库、不参与一键流转。

> **本文是仓库唯一文档**：既面向访客介绍功能与上手，也给接手开发者一份代码现状地图（架构、约定、不变量、已知问题）和运维手册（登录云同步、部署上线）。凡描述与代码冲突，以代码为准。

---

## ✨ 功能总览

### 🔎 检索
- **文献检索 · 多源聚合**（[`/tools/paper-search`](app/tools/paper-search/page.tsx)）：OpenAlex + arXiv + Crossref + Europe PMC 多源并发检索，`Promise.allSettled` 保证单源故障不拖垮整体；支持领域包（CV / NLP / Mamba / 扩散模型…）、必含/排除关键词、年份与会议过滤、「🆕 近一年」新论文通道、检索中途取消。可选的**查询扩展**把研究目标拆成多条子查询跨源 fan-out 再重排（无 LLM key 自动降级单查询）。**一键速览**：LLM 把当前结果打包成一次批量调用，逐篇生成「一句话总结 + 方向定位」（入库时随 `summary` 落库供下游复用）；每条结果可**一键阅读**——自动入库去重后直达 PDF 阅读器。
- **服务端检索缓存**（可选）：配置 Supabase 后热门查询直接命中 Postgres 缓存（14 天 TTL），检索页展示「🔥 热门检索」；不配置则透明降级为直连上游。
- **引文网络图谱**（[`/tools/citation-graph`](app/tools/citation-graph/page.tsx)）：任选一篇 OpenAlex 论文，参考文献 + 被引文献汇成一张 **D3 力导向图**，圆越大被引越多，支持缩放/拖拽/点击直达。
- **研究脉络族谱**（[`/tools/research-genealogy`](app/tools/research-genealogy/page.tsx)）：图谱看单篇，**族谱看整个方向**——配套的 [`research-genealogy`](skills/research-genealogy/SKILL.md) skill 在终端做多轮检索 + 引文滚雪球，产出「奠基 → 路线分叉 → 并行竞争 → 前沿」的发展族谱（每条 builds-on 边经真实引文核验，绝不凭记忆报论文）；产物 `lineage.json` 粘贴回站内即渲染成可点击的族谱树。

### 📖 精读 · 论文库（本地优先）
- **入库即拥有**（[`/library`](app/library/page.tsx)）：元数据、摘要、AI 要点提炼、研究笔记、标签，全部存在浏览器 IndexedDB（Dexie），**无需注册、断网可用**。
- **PDF 阅读器 + 四类批注 + 页面便签**（[`/viewer/[id]`](app/viewer/[id]/page.tsx)）：高亮 / 洞见 / 待办 / 可迁移四种标注，选区 AI 解释，阅读进度自动保存；**📒 页面便签**——点击页面任意位置贴一个便签，点开即写（段落大意 / 名词解释），可拖动移位，侧边栏汇总可跳页，随精读导出与只读分享；PDF 首次在线打开后静默缓存为本地 Blob，之后**断网也能读**。
- **引文导出**：每篇一键导出 BibTeX + APA / MLA / GB/T 7714，整库一键导出 `.bib`——纯本地纯函数，无需任何 API key。
- **统计看板**（[`/library/stats`](app/library/stats/page.tsx)）：来源 / 年份 / 月度入库 / 批注分类分布、标签云、被引 Top 5，零配置即用。

### 🤖 梳理 · 立论 · 撰写 · 制图（AI 工作流）
- **要点梳理 → 创新点立论 → 结构撰写 → 图表制图**：论文 Markdown → 结构化梳理关键点 → 在已有创新点之上立起差异化假设（含最小验证实验与风险清单）→ 把素材搭成论文结构与段落脚手架（[`paper-writer`](app/tools/paper-writer/page.tsx)，**只搭骨架、给段落级写作建议，不代写连贯正文**）→ 为方法与结果生成**出版级绘图代码**（matplotlib / seaborn / plotly / TikZ，色盲友好配色 + 期刊单双栏尺寸 + 投稿自查清单），全程通过**一键流转**串联，零复制粘贴；产出可一键**回存**到论文条目，闭合工作流回环。
- **文献对比矩阵**（[`/tools/paper-compare`](app/tools/paper-compare/page.tsx)）：从库中勾选 2–6 篇，AI 生成「研究问题 / 方法 / 数据集 / 指标 / 创新点 / 局限」横向对比矩阵，导出 Markdown。
- **文库问答（RAG）**（[`/tools/library-qa`](app/tools/library-qa/page.tsx)）：对入库论文建 embedding 语义索引（向量缓存在本机，重复提问不重复计费），自然语言提问 → 余弦检索 top-k → LLM 归纳出**带 [n] 引用、可溯源到具体论文**的答案，逐字流式输出；没配 embedding key 时**自动降级为本地 BM25 关键词检索**（零费用），只配 DeepSeek 也能用。
- **网页文献速览 / 文献格式转译**：URL 或 Word / PDF / HTML 文件 → 带 LaTeX 公式与表格的干净 Markdown（OMML→LaTeX 转换自研）。

### 🧠 可视化展厅（独立于工作流的交互式教学演示）
> 这一组**不属于上面的主线工作流**，不入论文库、不参与一键流转——它们是用来「看懂」一个模型、「讲清」一个项目的交互式演示，单独在首页展厅区呈现。
- **CNN 端到端讲解**：tiny-VGG 用 TensorFlow.js **在浏览器里真实推理**，逐层查看 feature map 流动。
- **医学图像分割**：FWMamba-UNet 真实中间层激活离线预计算 + 交互回放。
- **Transformer / GAN / 扩散模型**：注意力热图、潜向量交互、逐步去噪可视化。

### 🔗 分享与协作
- **只读分享**（可选）：单篇论文（含批注 + 笔记）或整个论文库，一键生成公开只读链接 `/share/[token]`——内容是点击那一刻的 JSON 快照，与本地后续编辑解耦，30 天有效。

### 🧰 带出浏览器：Claude Code Skills
- 四个核心能力封装成可安装的 [Claude Code skills](./skills/README.md)：**`paper-search`**（终端里免 key 查 OpenAlex/arXiv）、**`research-genealogy`**（方向发展族谱：树 + 叙事报告，stdlib-only 脚本，免 key）、**`cite-paper`**（arXiv ID / DOI / 标题 → 真实元数据 → BibTeX + GB/T 7714）、**`paper-figure`**（出版级绘图规范 + 本地运行验证）。`cp -r skills/* ~/.claude/skills/` 即装即用。
- 「上游输出即下游输入」不止于站内：`research-genealogy` 在终端产出的 `lineage.json`，回到站内一键渲染成族谱树。
- 站内的「技能封装」工具可以继续生成你自己的 SKILL.md。

---

## 🏗️ 技术栈与架构

| 层 | 选型 |
| --- | --- |
| 框架 | Next.js 16（App Router）· React 19 · TypeScript 5 |
| 样式 | Tailwind CSS v4 + 自研暖纸面设计系统 |
| AI | 流式与非流式全部走 **DeepSeek → OpenAI → Gemini** 三级自动 fallback（任一家 key 即可用全部 AI 工具）；embedding 走 OpenAI / Gemini |
| 检索 | OpenAlex + arXiv + Crossref + Europe PMC 聚合（带超时与限流，跨源去重） |
| 持久化 | **本地** Dexie / IndexedDB（单一真相源，含 PDF Blob）＋ **可选云端** Supabase（Auth + Postgres + 行级隔离 RLS）跨设备同步 |
| 可视化 | D3.js · Three.js / React Three Fiber · TensorFlow.js |
| 测试 | Vitest（~240 条单测 / 24 文件）· Playwright（2 条浏览器级 E2E）· GitHub Actions 四道硬门禁（lint / tsc / test / build） |

规模：约 3 万行 TS/TSX，工具注册表 **23 项**，**28** 个 API 路由。

### 数据流（最重要的心智模型）

```
UI / hooks ──只调──> lib/db/repository.ts（仓储层）──读写──> Dexie/IndexedDB（唯一真相源）
                              │                                ├─ papers / annotations / notes / progress / embeddings
                              │                                └─ pdfBlobs（PDF 二进制独立表，列表查询不触达）
                              └─（仅登录且配置 Supabase 时）void cloudSync.push*() 不 await、
                                 fire-and-forget 镜像到 Supabase Postgres（RLS 按 user_id 隔离）
```

铁律：
- **UI 永远不直接 fetch 论文数据接口**，一切论文/标注/笔记/进度读写经 [`lib/db/repository.ts`](lib/db/repository.ts)。
- 云同步失败不影响本地；门控是**登录态**（`setCloudSyncUser`），未登录/未配置时 cloudSync 全 no-op；`test/repository.test.ts` 用单测保证默认全程零网络请求。
- PDF Blob 永不上云，且存在独立 `pdfBlobs` 表；`stripLocal` 在仓储层出口剥离本地元字段。

### LLM 接入（两路 + BYOK）

| 路 | 模块 | 说明 |
| --- | --- | --- |
| 流式 | [`lib/ai/stream.ts`](lib/ai/stream.ts) 的 `streamChat()` | DeepSeek → OpenAI → Gemini 顺序 fallback，首 token 前自动切换；未配 key 时路由前置守卫返回可读 503，不中途断流；`idea-generator` 可走 reasoner 深度推理档 |
| 非流式 | [`lib/ai/client.ts`](lib/ai/client.ts) | 同序 fallback，每家带 30s 超时，首个成功即返回 |
| Embedding | [`lib/ai/embeddings.ts`](lib/ai/embeddings.ts) | OpenAI `text-embedding-3-small`(1536d) 主 → Gemini `text-embedding-004`(768d) 备；返回带 `model` 标识，**不同模型的向量禁止互比** |

**BYOK（访客自带 key）**：[`lib/ai/keys.ts`](lib/ai/keys.ts) 的 `resolveKeys(req)` 按「请求头 `x-deepseek-key`/`x-openai-key`/`x-gemini-key` 优先 → 环境变量兜底」解析；前端对应 `lib/ai/user-keys.ts` + `/settings` 页。占位 key（`ci-placeholder` 等）视为未配置。公开部署时服务端可以不配任何 LLM key，站长零成本、也不会被刷爆。

### 注册表驱动

全站工具的单一事实源是 [`lib/tools-registry.ts`](lib/tools-registry.ts)（`TOOLS` 数组，**23 项**），用 `track` 字段分四档：

- `workflow`（8）：挂在 6 环主线、参与一键流转闭环的工具。
- `utility`（3）：与主干松耦合的外围工具（网页速览 / 文库问答 / 格式转译），首页下放 Utilities 区，phases 为空。
- `gallery`（6）：交互式教学演示（模型可视化），独立于工作流。
- `lab`（2）：命令行 / 自动化扩展（任务规划器 / 自动化封装器），phases 为空。

首页过滤/搜索、`app/sitemap.ts` 全部由它驱动。不变量由 `test/tools-registry.test.ts` 守护：slug 唯一、`app/tools/<slug>/page.tsx` 必须存在、phase 合法、各 track 完整划分 TOOLS。**新增工具 = 注册表加一项 + 写一个页面**，别的不用动。

### 工具间流转（handoff）

[`lib/workflow/handoff.ts`](lib/workflow/handoff.ts)：上游 `stageHandoff(targetSlug, payload)` 写 sessionStorage 后跳转，下游挂载时 `consumeHandoff(slug)` 一次性消费。payload 可携带 `sourcePaperId`，下游产出经 `SaveToLibrary` 组件回存到该论文条目，闭合「论文 → 生成 → 回存」回环。链路也跨出浏览器：`skills/research-genealogy` 在终端产出 `lineage.json` → `/tools/research-genealogy` 页渲染成族谱树（粘贴导入，无后端参与）。

---

## 🔒 约定与不变量（改代码前必读）

1. **零配置构建**：`pnpm build` 在无任何 env 时必须通过——所有外部依赖初始化必须惰性 / 可空降级。
2. **best-effort 外围**：检索缓存、云同步、日志指标，失败一律吞掉，绝不影响主功能返回。
3. **纯函数优先**：可测逻辑（构图、引文、快照、RAG 检索、缓存键、限流、fan-out 重排）一律抽成无副作用纯函数放 `lib/`，路由只做编排——这是本仓百余条单测得以轻量的原因，新逻辑请沿用。
4. **类型来源**：领域类型一律从 [`lib/db/types.ts`](lib/db/types.ts) 导入，不在页面里重复声明 `Paper`/`Author`。
5. **公开免 key 路由必须限流**：用 `enforceRateLimit`（[`lib/api/http.ts`](lib/api/http.ts)），上游 fetch 必须带超时；PDF 代理带 SSRF 防护（域名白名单）。
6. **maxDuration ≤ 60**：Vercel Hobby 上限，新路由不要超。
7. 中文注释 / 中文 UI 是既定风格；commit message 用 `type: 中文描述`。

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
| `DEEPSEEK_API_KEY` | 流式 AI 默认可用（idea 生成可用 reasoner 深度推理） | 503 可读提示，引导访客在 `/settings` 自带 key |
| `OPENAI_API_KEY` / `GOOGLE_API_KEY` | 与 DeepSeek 等效的 fallback + embedding | 同上 |
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 显示登录入口，登录即双向云同步 | 登录入口隐藏，纯本地模式 |
| `SUPABASE_SERVICE_ROLE_KEY`（+ `SUPABASE_URL`） | 检索缓存、热门检索、只读分享 | 缓存透明降级直连；分享入口隐藏 |
| `METRICS_TOKEN` | 给 `/api/metrics` 加门禁 | 指标接口公开 |

> 云同步的真实门控是**登录态**（[`lib/sync/cloud-sync.ts`](lib/sync/cloud-sync.ts) 的 `setCloudSyncUser`），没有独立开关环境变量；未登录即零网络请求（有单测盖章）。**任何环境变量都不配也能完整构建与运行。**

### 测试与检查

```bash
pnpm lint                 # ESLint（CI 硬门禁；vendored 可视化代码在 eslint.config.mjs ignores 内）
pnpm exec tsc --noEmit
pnpm test                 # Vitest 单测（~240 条 / 24 文件，~0.6s 跑完）
pnpm test:e2e             # Playwright E2E（2 条，API 经 page.route 拦截注入 fixture，不触外网）
pnpm build                # next build --webpack；任何 env 都不配也能构建
```

---

## 🔑 登录与云同步（可选 · Supabase）

登录后论文库可跨设备 / 换浏览器同步、清缓存不丢。用 **Supabase**（Auth + Postgres + 行级隔离 RLS），全部托管，通过环境变量插到现有部署上。代码已全部接好；下面是需要你**在 Supabase / Vercel 控制台操作**的步骤（约 15 分钟）。**没做这些之前，站点照常以「纯本地模式」运行，登录入口不显示。**

1. **建 Supabase 项目**：https://supabase.com → New project（选近的区域，如 Singapore）→ **Project Settings → API** 记下 **Project URL** 与 **anon public** key。
2. **建表 + 开 RLS**：控制台 **SQL Editor** → 把 [`supabase/schema.sql`](./supabase/schema.sql) 整段粘贴运行。建 4 张用户表（papers / annotations / research_notes / read_progress）并开启 RLS——每个用户只能读写自己的数据。
3. **配登录方式**（**Authentication → Providers**）：
   - **邮箱**：默认开启。
   - **Google 一键登录**：在 Google Cloud Console 建 OAuth 2.0 Web 客户端，已授权重定向 URI 填 `https://<你的项目>.supabase.co/auth/v1/callback`，拿到 Client ID / Secret 填回 Supabase 的 Google provider。
   - **手机号**（可选）：需接付费 SMS 服务商（Twilio 等）；没接时登录框的手机方式报错属正常，邮箱 / Google 不受影响。
4. **回跳地址白名单（最重要——邮件确认打不开多半在这）**：**Authentication → URL Configuration** → **Site URL** 填生产域名（如 `https://www.z1ha0.com`，若仍是 `localhost:3000` 则所有确认邮件回跳到本地打不开）；**Redirect URLs** 加上 `https://<生产域名>/**`、`http://localhost:3000/**`、`https://*.vercel.app/**`。回跳统一落到 `/auth/callback`。
5. **在 Vercel 配环境变量**（Production + Preview 都加），保存后 Redeploy 一次：
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://<你的项目>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = <anon public key>
   ```
   > anon key 受 RLS 保护，放前端没问题。
6. **（可选）后端检索缓存 + 热门检索 + 只读分享**：`schema.sql` 另建两张「全站共享、仅 service-role 可读写」的表 `search_cache` / `shares`。要启用，再加一条**仅服务端**变量：
   ```
   SUPABASE_SERVICE_ROLE_KEY = <service_role key>
   ```
   > ⚠️ service-role key 拥有完全权限，**永远不要加 `NEXT_PUBLIC_` 前缀、不要进前端**。不配则检索照常直连上游、热门检索与分享入口自动隐藏。

**工作原理**：本地仍是即时真相源（写操作先落 Dexie，零延迟可离线）；登录后每次写 best-effort 镜像到 Supabase（带 `user_id`，RLS 隔离），登录瞬间先上推本地已攒的库、再拉云端全量合并 → 换设备 / 清缓存后登录即恢复。**v1 限制**：PDF 文件本身不入云（只同步元数据），换设备时 arXiv 论文经 `/api/pdf-proxy` 自动重拉、本地上传的 PDF 需原设备仍在；冲突合并是「最后写入者优先」（按 `updated_at`），适合单人多设备。

---

## 🌐 部署上线（Vercel + Cloudflare）

目标：部署成「任何人打开链接就能用」的公开站点。平台 **Vercel**（Next.js 官方，免费 Hobby 足够）+ 域名 **Cloudflare**（成本价）+ AI **访客自带 key**（公开零成本、不会被刷爆）。代码层适配已完成，下面是需要你**亲自操作**（登录账号 / 付费）的步骤。

1. **推 GitHub**：`git push`（仓库已在 `github.com/unumbrela/toolbox`）。
2. **部署到 Vercel**（约 5 分钟）：vercel.com 用 GitHub 登录 → **Add New → Project** → 选仓库 Import → Framework 自动识别 Next.js（默认即可）→ **环境变量推荐全部留空**（走 BYOK：访客在 `/settings` 自带 key；想让 AI 默认可用且自己付费，再加 `DEEPSEEK_API_KEY` 并在后台设预算上限）→ **Deploy**。之后每次 `git push` 到 main 自动重新部署。
3. **买域名**（Cloudflare，约 $10/年）：dash.cloudflare.com → **Domain Registration → Register Domains** → 搜名字付款。
4. **接域名到 Vercel**（约 5 分钟）：Vercel **Settings → Domains** 输入域名 Add → 按它给出的 DNS 记录（根域 `A → 76.76.21.21`、`www CNAME → cname.vercel-dns.com`，以页面实际为准）回 Cloudflare **DNS → Records** 添加 → **关键**：把这两条记录的代理状态设为 **DNS only（灰色云朵）**，否则 Cloudflare 代理与 Vercel 证书冲突 → 等几分钟生效，Vercel 自动签发 HTTPS。

**AI 成本模型**：服务端默认不带任何 LLM key；访客 key 只存其本机 localStorage，调用时经请求头转发给模型厂商，我们的服务器不持久化——公开 demo 不花你的钱、不会被刷爆，检索/阅读/批注/可视化等不依赖 key 的功能照常可用。

**上线前诚实清单**：① Vercel Hobby = 个人非商业用途、函数超时 60s（所有 AI 路由 `maxDuration` 已压到 60；长文本生成偶发超时可升 Pro 放宽到 300s）；② 第三方素材版权——公开发布前注意内置第三方素材的授权；③ 全中文无 i18n，海外门槛高，可先出英文落地页。

---

## 📂 项目结构

```
app/                  # Next.js App Router
├── page.tsx          #   首页：6 环工作流走廊 + 工具网格（注册表驱动）+ 可视化展厅 + Lab
├── library/          #   论文库（列表 / 详情（链路中枢）/ 统计看板）
├── viewer/[id]/      #   PDF 阅读器（react-pdf）+ 四类批注
├── settings/         #   访客自带 key 设置
├── share/[token]/    #   只读分享页
├── tools/<slug>/     #   工具页（与注册表一一对应：workflow / utility / gallery / lab）
├── opengraph-image.tsx, sitemap.ts, robots.ts
└── api/              #   28 个 route.ts（检索 / AI / 分享 / 指标…），全部 runtime=nodejs、maxDuration≤60
components/           # UI 组件（按工具域分目录）；通用件 states / use-stream（可 stop）/ tool-shell / workflow 控件
lib/
├── tools-registry.ts #   ★ 全站工具单一事实源（23 项，4 track）
├── db/               #   ★ Dexie 表定义 / 仓储层 / 共享领域类型（types.ts）
├── ai/               #   ★ LLM 接入（流式 stream.ts / 非流式 client.ts / BYOK keys.ts / embedding）
├── paper-search/     #   多源检索聚合 / 缓存 / 引用图构建 / 查询扩展 / fan-out 重排（纯函数）
├── library-qa/       #   RAG 检索（cosine top-k + BM25 降级，纯函数）
├── genealogy/        #   研究方向族谱：lineage.json 解析 + DFS 树（纯函数）
├── workflow/         #   工具间一键流转（handoff）
├── sync/ supabase/   #   可选云同步（未配/未登录全 no-op）
├── api/              #   内存滑动窗口限流 / clientIp / 带超时 fetch / 结构化日志 + 指标
└── export/ share/    #   引文导出 / 分享快照（纯函数）
skills/               # 可安装的 Claude Code skills（paper-search / research-genealogy / cite-paper / paper-figure）
supabase/schema.sql   # 云端建表 + RLS（4 用户表 + search_cache + shares，控制台一次性运行）
test/  e2e/           # Vitest 单测（~240 条）  ·  Playwright（happy-path + ai-tools）
```

---

## 🛡️ 工程化与可靠性

- **路由加固**：关键路由 `zod` 入参校验；免 key 公开路由（检索 / 引用图 / PDF 代理 / 分享）按 IP 滑动窗口限流；上游调用全部带超时；PDF 代理带 SSRF 防护。
- **流式体验**：AI 输出逐字流式，支持中途停止并保留已生成文本；多供应商在首 token 前自动切换；未配 key 返回可读 503 而不是中途断流。
- **可观测性**：结构化 JSON 访问日志 + [`/api/metrics`](app/api/metrics/route.ts) 聚合视图（调用量 / 错误率 / 平均耗时 / 缓存命中率 / 各 LLM 供应商占比）。
- **SEO**：注册表驱动自动生成 `sitemap.xml`、`robots.txt`、动态 OpenGraph 卡片。

### 🗒️ 已知问题 / 坑位

1. **内存态的限流与指标**：滑动窗口限流和 `/api/metrics` 都是每实例一份，serverless 多实例下不汇总（设计上接受；要强一致需上 Upstash/Sentry）。
2. **检索缓存 / 分享需要 service-role**：这两个功能在未配 `SUPABASE_SERVICE_ROLE_KEY` 的部署上不可见，演示前需确认环境。
3. **全中文无 i18n**；vendored 可视化代码（部分 explainer / ganlab）在 eslint ignores 内，历史 lint 债务未清。
4. **PDF Blob 不入云**（v1 设计）：换设备后需重新在线打开一次 PDF 才能离线读。
5. 公开发布注意内置第三方素材的授权；其余素材自有。

---

## 🤝 贡献

新增工具的边际成本极低：在 [`lib/tools-registry.ts`](lib/tools-registry.ts) 加一条数据，写一个 `app/tools/<slug>/page.tsx`，首页展示、阶段过滤、搜索、sitemap 全部自动接管。注册表的不变量（slug 唯一、页面文件存在、track/phase 合法）有单测守护。欢迎照此模式提 PR。

## 📄 License

[MIT](./LICENSE)
