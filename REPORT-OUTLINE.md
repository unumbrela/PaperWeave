# Web 课程大作业实验报告大纲 · PaperWeave 研究型论文助手

> 本文是实验报告的**写作大纲**：每节列出应覆盖的内容要点、可直接取材的代码/数据证据、建议插入的截图。
> 正文撰写时按本大纲展开即可；「📷」标记处建议配图，「📁」标记处给出取材的代码位置。

---

## 摘要（写作放最后）

- 一段话：选题（科研全流程论文工作台）、技术路线（Next.js 全栈 + 本地优先持久化 + 多供应商 LLM）、核心成果（18 个工具 / 23 个 API 路由 / 约 3 万行 TypeScript / 140 条单测 + E2E + CI）。
- 关键词：Next.js、React、IndexedDB、Supabase、RAG、流式输出、CI/CD

## 1. 选题背景与需求分析

### 1.1 背景与动机
- 痛点：科研流程（查、读、想、验、画、讲、展）散落在十几个网站/工具之间，上下游靠复制粘贴衔接。
- 定位差异：市面工具多为「AI 替你写论文」，本项目做「写论文之外的全链路」，上游输出即下游输入。

### 1.2 需求分析
- 功能需求：按 7 环主线逐环列出（检索、文献管理与批注、AI 总结/生 idea/对比/RAG 问答、模型可视化、分享）。
- 非功能需求：**零配置可用**（无账号无数据库可跑）、离线可用、流式响应体验、公开部署的成本与安全（限流、BYOK）、可测试性。
- 用户角色：游客（免 key 功能）、自带 key 用户、注册用户（云同步）。
- 📷 用例图 / 7 环工作流示意图（可截首页走廊，📁 `app/page.tsx`）。

## 2. 相关技术介绍（每项 2-4 句 + 在本项目中的用途）

- **Next.js 16 App Router + React 19 + TypeScript 5**：同构全栈框架，文件式路由 + Route Handler 做后端 API。
- **Tailwind CSS v4**：原子化样式 + 自研暖纸面设计系统。
- **Dexie (IndexedDB)**：浏览器端结构化存储，本项目的单一数据真相源，含 PDF 二进制 Blob。
- **Supabase**：托管 Postgres + Auth + 行级安全（RLS），承担可选云同步 / 检索缓存 / 分享快照。
- **Vercel AI SDK 与多供应商 LLM**：DeepSeek / OpenAI / Gemini，流式输出与自动 fallback。
- **Embedding 与 RAG**：text-embedding-3-small、余弦相似度检索、带引用溯源的生成。
- **可视化**：D3.js（力导向图、注意力热图）、Three.js/R3F（3D 叙事）、TensorFlow.js（浏览器内真实推理）。
- **测试与工程化**：Vitest、Playwright、ESLint、GitHub Actions。

## 3. 系统总体设计

### 3.1 总体架构
- 📷 架构图：浏览器（React UI + Dexie + TF.js 推理）↔ Next.js Route Handlers（检索聚合 / AI 代理 / 限流）↔ 外部服务（OpenAlex、arXiv、三家 LLM、Supabase）。
- 阐述「本地优先 + 云端可选」的分层：UI → 仓储层 → Dexie，云同步为 fire-and-forget 镜像（📁 `lib/db/repository.ts` 头注释）。

### 3.2 模块划分
- 注册表驱动的工具体系：单一事实源 + 自动接管过滤/搜索/sitemap（📁 `lib/tools-registry.ts`）。
- 七大功能域：检索、论文库、阅读批注、AI 工作流、可视化、分享、设置/账户。
- 📷 模块关系图或目录结构图（可引用 README「项目结构」一节）。

### 3.3 数据模型设计
- 本地：Dexie 六张表 papers / annotations / notes / readProgress / embeddings / pdfBlobs（PDF 二进制独立表）（📁 `lib/db/local-db.ts`、`lib/db/types.ts`）。
- 云端：Supabase 六张表（前四张同构 + search_cache + shares），全部 RLS 按 user_id 隔离（📁 `supabase/schema.sql`）。
- 📷 E-R 图；说明「本地 id 即云端主键」的同步对齐设计。

### 3.4 API 设计
- 表格列出 23 个路由：路径 / 方法 / 功能 / 是否流式 / 是否限流 / 鉴权方式（📁 `app/api/**/route.ts`）。
- 统一约定：zod 入参校验、`maxDuration ≤ 60`、超时与限流策略。

## 4. 详细设计与实现（报告的主体，挑 4-6 个最有含金量的点展开）

### 4.1 多源检索聚合与服务端缓存
- 查询构造、`Promise.allSettled` 容错、OpenAlex 倒排摘要还原（📁 `lib/paper-search/search-service.ts`）。
- 缓存键归一化设计（maxResults 不进 key）、14 天 TTL、best-effort 降级（📁 `lib/paper-search/cache.ts`）。
- 📷 检索页 + 热门检索截图。

### 4.2 本地优先持久化与离线 PDF
- 仓储层如何隔离 UI 与存储、PDF Blob 独立表（列表查询不载入大对象，含 v2→v3 迁移）、云同步 fire-and-forget（📁 `lib/db/repository.ts`）。
- PDF 首次在线打开后静默缓存 Blob → 断网可读的实现。
- 亮点论证：「未开云同步时零网络请求」由单测盖章（📁 `test/repository.test.ts`）。

### 4.3 LLM 接入层：流式、fallback 与 BYOK
- 流式/非流式两路分工；DeepSeek→OpenAI→Gemini 顺序 fallback（📁 `lib/ai/client.ts`）。
- 访客自带 key：请求头优先 → 环境变量兜底，公开部署零成本（📁 `lib/ai/keys.ts`）。
- 前端流式体验：可中断、错误归类、未配 key 的可读 503（📁 `components/use-stream.ts`、`lib/ai.ts`）。
- 📷 流式输出 + 中断按钮截图。

### 4.4 论文库语义问答（RAG）
- 文档构造（buildDoc 有界折叠）→ embedding（双供应商、维度隔离）→ 余弦 top-k → 带 [n] 引用的流式作答（📁 `lib/library-qa/retrieval.ts`、`lib/ai/embeddings.ts`）。
- 向量缓存在本机 Dexie + textHash 判断重嵌，省钱设计。
- 📷 提问 → 带引用答案截图。

### 4.5 引用网络图谱与模型可视化（选讲）
- OpenAlex 三组数据折叠成去重 {nodes, edges} 纯函数构图 + D3 力导向渲染（📁 `lib/paper-search/citation-graph.ts`）。
- TF.js 浏览器内 tiny-VGG 真实推理的取舍：零运维 vs 后端推理（📁 `lib/cnn-explainer/`）。
- 📷 力导向图 + CNN feature map 截图。

### 4.6 工作流串联与回存闭环
- sessionStorage 一次性 handoff、`sourcePaperId` 回存机制（📁 `lib/workflow/handoff.ts`）。
- 📷 「整理 → 总结 → 生 idea → 拆验证计划 / 设计图表 → 回存论文」链路的连续截图。

### 4.7 安全与可靠性设计
- 内存滑动窗口限流、PDF 代理 SSRF 防护、上游超时、RLS 行级隔离、METRICS_TOKEN 门禁（📁 `lib/api/http.ts`、`app/api/pdf-proxy/route.ts`）。
- 结构化日志 + `/api/metrics` 聚合指标（📁 `lib/api/log.ts`）。

## 5. 系统测试

### 5.1 测试方案
- 单元测试：16 个文件 140 条用例的覆盖面清单（解析、过滤、构图、引文、快照、限流、仓储…）（📁 `test/`）。
- E2E：Playwright happy-path「首页→检索→入库→论文库」，API 拦截注入 fixture、不依赖外网（📁 `e2e/happy-path.spec.ts`）。
- 📷 `pnpm test` 全绿输出截图。

### 5.2 功能测试
- 按 §1.2 的功能需求逐项给出测试用例表（操作步骤 / 预期 / 实际）。
- 重点场景：零配置首跑、断网阅读 PDF、未配 key 的降级提示、限流 429、登录后跨设备同步。

### 5.3 CI/CD
- GitHub Actions 四道硬门禁（lint / tsc / test / build）+ 独立 E2E job（📁 `.github/workflows/ci.yml`）。
- 📷 CI 通过截图。

## 6. 部署上线

- 部署架构：Vercel serverless + Supabase 托管 Postgres + Cloudflare 域名（📁 `DEPLOY.md`、`AUTH-SETUP.md`）。
- serverless 适配要点：只读文件系统（PDF 走代理/Blob 不落盘）、`maxDuration ≤ 60`、零 env 可构建。
- 成本与安全策略：BYOK + 免 key 路由限流，公开 demo 零成本不被刷爆。
- 📷 线上站点截图 + 域名。

## 7. 总结与展望

### 7.1 完成情况总结
- 对照 §1.2 需求逐条勾验；量化指标（工具数 / 路由数 / 代码量 / 测试数）。

### 7.2 遇到的问题与解决（挑 3-5 个写成「问题 → 分析 → 方案」）
- 候选素材：三套持久化并存收敛为 Dexie 单一真相源；Vercel 只读文件系统导致 PDF 落盘失败 → 同源代理 + Blob；流式中途断流体验 → 前置守卫 + 可中断；IndexedDB 未建索引字段 orderBy 抛 SchemaError → 内存排序；巨型组件拆分。

### 7.3 不足与展望
- 国际化缺失、限流/指标为单实例内存态、PDF Blob 不入云需重新缓存、移动端适配、更多检索源（IEEE / PubMed）。

## 参考文献

- 框架与库官方文档（Next.js / React / Tailwind / Dexie / Supabase / Vercel AI SDK / D3 / Three.js / TF.js / Vitest / Playwright）。
- 开放学术 API：OpenAlex、arXiv API 文档。
- 可视化参考：CNN Explainer (Wang et al., IEEE TVCG 2020)、GAN Lab (Kahng et al.)、RAG (Lewis et al., NeurIPS 2020)。

## 附录

- A. 完整 API 路由清单（路径 / 功能 / 参数）
- B. 环境变量配置说明（对照 README 配置表）
- C. 数据库建表 SQL（📁 `supabase/schema.sql`）
- D. 主要页面截图集
