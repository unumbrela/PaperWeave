# PaperWeave · 项目地图（面向 Agent / 开发者）

> 本文档是给 AI Agent 与新接手开发者的**代码现状地图**：架构、关键模块、约定与不变量、已知问题。凡描述与代码冲突，以代码为准。
> 最后核对：2026-06-11（基于当时 HEAD `0605146`，约 3.0 万行 TS/TSX，361 个 git 跟踪文件）。

---

## 1. 一句话定位

研究型论文助手 Web 应用（Next.js 全栈）：把科研流程切成 7 环主线「查论文 → 读文献 → 生 idea → 做验证 → 论文绘图 → 讲结果 → 可视化表达」，18 个工具挂在主线上，上游输出可一键流转为下游输入。**本地优先**（IndexedDB 单一真相源，零配置可用），云端（Supabase）与 LLM key 全部可选、缺失时优雅降级。

## 2. 常用命令

```bash
pnpm dev            # 开发服务器（Node >= 20，包管理器必须用 pnpm）
pnpm lint           # ESLint，CI 硬门禁；vendored 可视化代码在 eslint.config.mjs ignores 内
pnpm exec tsc --noEmit
pnpm test           # Vitest：test/ 下 16 文件 140 用例，~0.6s 跑完
pnpm test:e2e       # Playwright：e2e/happy-path.spec.ts，API 被 page.route 拦截、不触外网
pnpm build          # next build --webpack；不配任何环境变量也必须能通过
```

## 3. 架构总览

### 3.1 数据流（最重要的心智模型）

```
UI / hooks ──只调──> lib/db/repository.ts（仓储层）──读写──> Dexie/IndexedDB（唯一真相源）
                              │                                ├─ papers / annotations / notes / progress / embeddings
                              │                                └─ pdfBlobs（v3 起 PDF 二进制独立表，列表查询不触达）
                              └─（仅登录且配置 Supabase 时）void cloudSync.push*() 不 await、
                                 fire-and-forget 镜像到 Supabase Postgres（RLS 按 user_id 隔离）
```

铁律：
- **UI 永远不直接 fetch 论文数据接口**，一切论文/标注/笔记/进度读写经 `repository`。
- 云同步失败不影响本地；门控是**登录态**（`setCloudSyncUser`），未登录/未配置时 cloudSync 全 no-op；`test/repository.test.ts` 用单测保证默认全程零网络请求。
- PDF Blob 永不上云，且存在独立 `pdfBlobs` 表（v2→v3 迁移见 `test/local-db-migration.test.ts`）；`stripLocal` 在仓储层出口剥离本地元字段。

### 3.2 LLM 接入（两路 + BYOK）

| 路 | 模块 | 说明 |
| --- | --- | --- |
| 流式 | `lib/ai.ts` + `lib/ai/stream.ts` | Vercel AI SDK，仅 DeepSeek（`deepseek-chat`）；未配 key 时路由前置守卫返回可读 503（`aiNotConfiguredResponse`），不中途断流 |
| 非流式 | `lib/ai/client.ts` | DeepSeek → OpenAI(`gpt-4o-mini`) → Gemini(`gemini-2.0-flash`) 顺序尝试，首个成功即返回；每家带 30s 超时 |
| Embedding | `lib/ai/embeddings.ts` | OpenAI `text-embedding-3-small`(1536d) 主 → Gemini `text-embedding-004`(768d) 备；返回带 `model` 标识，**不同模型的向量禁止互比** |

**BYOK（访客自带 key）**：`lib/ai/keys.ts` 的 `resolveKeys(req)` 按「请求头 `x-deepseek-key`/`x-openai-key`/`x-gemini-key` 优先 → 环境变量兜底」解析；前端对应 `lib/ai/user-keys.ts` + `/settings` 页。占位 key（`ci-placeholder` 等，见各模块 `PLACEHOLDERS` 集合）视为未配置。

### 3.3 注册表驱动

`lib/tools-registry.ts` 是全站工具的单一事实源（`TOOLS` 数组，18 项）。首页过滤/搜索、`app/sitemap.ts` 全部由它驱动。不变量由 `test/tools-registry.test.ts` 守护：slug 唯一、`app/tools/<slug>/page.tsx` 文件必须存在、phase 必须合法。**新增工具 = 注册表加一项 + 写一个页面**，别的不用动。

### 3.4 工具间流转（handoff）

`lib/workflow/handoff.ts`：上游 `stageHandoff(targetSlug, payload)` 写 sessionStorage 后跳转，下游挂载时 `consumeHandoff(slug)` 一次性消费。payload 可携带 `sourcePaperId`，下游产出经 `SaveToLibrary` 组件回存到该论文条目（总结写 `summary`、idea 追加 `notes`），闭合「论文 → 生成 → 回存」回环。

已连通的链路：`markdown-convert → markdown-summarize → idea-generator → { prompt-chunker（拆验证计划）, figure-generator（设计结果图） }`；论文库详情页可直发 summarize / idea-generator。链路也跨出浏览器：`skills/research-genealogy` 在终端产出 `lineage.json` → `/tools/research-genealogy` 页渲染成族谱树（粘贴导入，无后端参与）。

## 4. 目录与关键模块速查

```
app/
├── page.tsx                     # 首页（7 环走廊 + 工具网格，注册表驱动）
├── library/{page,| [id],stats}  # 论文库列表 / 详情（链路中枢）/ 统计看板
├── viewer/[id]/                 # PDF 阅读器（react-pdf）+ 四类批注
├── share/[token]/page.tsx       # 只读分享页
├── settings/page.tsx            # 访客自带 key 设置
├── opengraph-image.tsx, sitemap.ts, robots.ts
├── tools/<slug>/page.tsx        # 18 个工具页
└── api/                         # 23 个 route.ts，全部 runtime=nodejs、maxDuration≤60（Vercel Hobby 上限）
    ├── paper-search{,/hot}      # 聚合检索 + 热门检索（需 service-role，否则空列表）
    ├── citation-graph           # OpenAlex 引用网络
    ├── analyze, analyze-paper   # AI 论文分析（共享 lib/ai/analyze.ts 的 prompt/解析）
    ├── summarize, markdown-summarize, idea-generator, chunk-it-up, skill-maker, figure-generator  # 流式工具
    ├── compare-papers           # 多篇对比（流式）
    ├── library-qa/{embed,answer}# RAG：批量 embedding / 检索+流式作答
    ├── markdown-convert         # docx/pdf/html → Markdown（mammoth/pdf2md/turndown + 自研 OMML→LaTeX）
    ├── papers/import/{arxiv,pdf}# 无状态导入助手（拉元数据/解析，不持久化）
    ├── pdf-proxy                # 同源 PDF 代理（SSRF 防护：域名白名单）
    ├── share{,/[token],/status} # 快照分享（需 service-role）
    ├── explain                  # 选区 AI 解释（被 lib/annotation/hooks.ts 调用）
    └── metrics                  # 内存指标聚合（可选 METRICS_TOKEN 门禁）

lib/
├── tools-registry.ts            # ★ 工具单一事实源
├── db/{local-db,repository,types}.ts   # ★ Dexie 表定义 / 仓储层 / 共享领域类型（Paper/Annotation/ResearchNote/Rect）
├── ai/…                         # ★ 见 §3.2
├── paper-search/
│   ├── search-service.ts        # OpenAlex+arXiv 查询构造/过滤/摘要还原（纯函数可测）
│   ├── cache.ts                 # Postgres 检索缓存：cacheKey 归一化（maxResults 不进 key）、14 天 TTL、best-effort
│   └── citation-graph.ts        # OpenAlex works → {nodes,edges} 纯函数构图
├── library-qa/retrieval.ts      # RAG 纯函数层：buildDoc / textHash(djb2) / cosineSim / topK；向量缓存在 Dexie
│                                #   + keywordTopK：BM25 关键词降级（无 embedding key 时页面自动切换，零网络）
├── genealogy/lineage.ts         # 研究方向族谱：lineage.json 解析 + DFS 树构建（纯函数）；数据由
│                                #   skills/research-genealogy 在终端产出，/tools/research-genealogy 页渲染
├── export/citations.ts          # BibTeX / APA / MLA / GB-T 7714，纯函数无网络
├── share/snapshot.ts            # 分享快照构造（冻结副本，与本地编辑解耦），纯函数
├── library-stats/stats.ts       # 统计看板聚合，纯本地
├── api/{http,log}.ts            # 内存滑动窗口限流 / clientIp / 带超时 fetch；结构化 JSON 日志 + 内存指标
├── sync/cloud-sync.ts           # Supabase 镜像（未配置/未登录时全 no-op）；登录瞬间 pushAllLocal + pullAll 合并
├── supabase/{client,server}.ts  # 浏览器端 anon client / 服务端 service-role（均未配置安全降级为 null）
├── auth/auth-context.tsx        # AuthProvider + useAuth（Google / 邮箱 / 手机 OTP）
├── workflow/handoff.ts          # 见 §3.4
├── convert-{docx,html,pdf}.ts, omml-to-latex.ts, extract.ts   # 文档转换链
└── {cnn,gan,diffusion,transformer}-explainer/, med-seg/, ganlab…  # 可视化（部分 vendored，lint ignores 内）

components/                      # 按工具域分目录；通用件：states.tsx（三态）、use-stream.ts（流式 hook，支持 stop()）、
                                 # stream-output.tsx、tool-shell.tsx、workflow/handoff-controls.tsx
skills/                          # 可安装的 Claude Code skills（paper-search / research-genealogy / cite-paper /
                                 #   paper-figure），与 Web 端共享同一套领域规则（见 skills/README.md），两边互相同步；
                                 #   research-genealogy 为内置拷贝（上游 unumbrela/research-genealogy，自带 Python 脚本）
supabase/schema.sql              # 4 表（papers/annotations/research_notes/read_progress）+ RLS + 第 5、6 张：search_cache/shares
test/  e2e/                      # Vitest 单测；Playwright 1 条 happy-path
```

## 5. 环境变量行为矩阵

| 变量 | 配置后 | 缺失时（必须保持可用） |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | 流式 AI 默认可用 | 503 可读提示，引导访客自带 key |
| `OPENAI_API_KEY` / `GOOGLE_API_KEY` | fallback + embedding | 同上 |
| `NEXT_PUBLIC_SUPABASE_URL` + `_ANON_KEY` | 显示登录入口，登录即双向同步 | 登录入口隐藏，纯本地 |
| `SUPABASE_SERVICE_ROLE_KEY`（+`SUPABASE_URL`） | 检索缓存、热门检索、只读分享 | 缓存透明降级直连；分享入口隐藏（前端经 `/api/share/status` 探测） |
| `METRICS_TOKEN` | `/api/metrics?token=` 门禁 | 指标接口公开 |

> 云同步的真实门控是**登录态**（`lib/sync/cloud-sync.ts` 的 `setCloudSyncUser`），没有独立的开关环境变量；未登录即零网络请求（有单测盖章）。

## 6. 约定与不变量（改代码前必读）

1. **零配置构建**：`pnpm build` 在无任何 env 时必须通过——所有外部依赖初始化必须惰性 / 可空降级。
2. **best-effort 外围**：检索缓存、云同步、日志指标，失败一律吞掉，绝不影响主功能返回。
3. **纯函数优先**：可测逻辑（构图、引文、快照、RAG 检索、缓存键、限流）一律抽成无副作用纯函数放 `lib/`，路由只做编排——这是本仓百余条单测得以轻量的原因，新逻辑请沿用。
4. **类型来源**：领域类型一律从 `lib/db/types.ts` 导入，不在页面里重复声明 `Paper`/`Author`。
5. **公开免 key 路由必须限流**：用 `enforceRateLimit`（`lib/api/http.ts`），上游 fetch 必须带超时。
6. **maxDuration ≤ 60**：Vercel Hobby 上限，新路由不要超。
7. 中文注释 / 中文 UI 是既定风格；commit message 用 `type: 中文描述`。

## 7. 测试现状

- **单测**（Vitest，140 条）：arXiv 解析、检索过滤/去重/容错、缓存键稳定性、引用图构图、引文格式、RAG 检索、分享快照、统计聚合、限流、指标、OMML→LaTeX、注册表不变量、仓储层（含「零配置零网络」盖章）、Dexie v2→v3 迁移。
- **E2E**（Playwright，1 条）：首页 → 检索（fixture 注入）→ 入库 → 论文库断言，覆盖真实 Dexie 写读。
- CI（`.github/workflows/ci.yml`）：build job 四道硬门禁（lint / tsc / test / build）+ 独立 e2e job。

## 8. 已知问题 / 坑位（按优先级）

1. **内存态的限流与指标**：滑动窗口限流和 `/api/metrics` 都是每实例一份，serverless 多实例下不汇总（设计上接受，README/代码注释已声明；要强一致需上 Upstash/Sentry）。
2. **检索缓存 / 分享需要 service-role**：这两个功能在未配 `SUPABASE_SERVICE_ROLE_KEY` 的部署上不可见，演示前需确认环境。
3. **全中文无 i18n**；vendored 可视化代码（transformer/gan/diffusion explainer、ganlab、`hooks/useGANTraining`）在 eslint ignores 内，历史 lint 债务未清。
4. `hpi-potsdam` 工具内置第三方素材（iGEM），公开发布需注意授权；其余素材自有。
5. PDF Blob 不入云（v1 设计）：换设备后需重新在线打开一次 PDF 才能离线读。
6. 「可视化表达」环内容偏 showcase（仅 hpi-potsdam + citation-graph 挂靠），与其余 6 环的「工具」属性有张力，待充实或并环。

## 9. 文档索引

- `README.md` — 面向访客的功能/上手介绍
- `DEPLOY.md` — Vercel + Cloudflare 部署步骤（代码侧适配已完成，剩人工账号操作）
- `AUTH-SETUP.md` — Supabase 登录 + 云同步配置步骤
- `supabase/schema.sql` — 云端建表 + RLS，控制台一次性运行
