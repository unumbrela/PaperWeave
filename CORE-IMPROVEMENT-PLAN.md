# PaperWeave · 核心功能改进计划

> 目标：**优先保障核心功能完整、流畅**——把"查 → 读 → 想 → 验"这条主线链路做到 clone 即用、零配置可跑、操作顺滑、失败有兜底。
> 创建 2026-06-03 ｜ 角度区别于 [`OPTIMIZATION-ROADMAP.md`](./OPTIMIZATION-ROADMAP.md)（后者偏定位/门面/传播；本文档只盯**功能与体验**）。
>
> **排序原则**：按"对核心链路能否跑通、用起来是否流畅"的影响排序，与工作量无关。
> **执行方式**：每完成一项勾掉 `[ ]`，并在该项下记录实际改动文件与验收结果。

---

## 当前真实状态（2026-06-03 核验）

| 维度 | 状态 | 说明 |
| --- | --- | --- |
| `pnpm build` | ✅ 通过 | 52 页全部生成 |
| `pnpm lint` | ❌ 98 errors / 73 warnings | CI 暂 `continue-on-error`（P4.2 处理） |
| 持久层 | ✅ **已统一**（2026-06-03） | Dexie 为单一真相源；Prisma 降为可选云同步；`data/papers/*.json` 已删除 |
| 主线链路 | ⚠️ 工具各自能跑，**未串联** | 上游输出无法一键送下游 |
| LLM 接入 | ⚠️ 散在 3 处 | `lib/ai.ts` / `lib/ai/client.ts` / `lib/services/ai.ts`，部分旧模型 |
| 巨型组件 | ⚠️ | paper-search 1100 行 / library 734 / viewer 506 |
| 错误兜底 | ⚠️ 薄弱 | API 失败、空状态、超时多数无统一处理 |

---

# 🔴 P0 · 数据底座统一（一切流畅的地基）

> 这是本计划的**第一优先级**。论文库是跨工具的数据中枢，地基不稳，下游所有串联与体验都不可靠。

## P0.1 收敛三套持久层为"本地优先 + 可选云同步"
**现状**：同一份论文数据有三个真相源——
- `lib/db/local-db.ts`(Dexie/IndexedDB) + `lib/paper/cache-service.ts`（浏览器端）
- `lib/db/prisma.ts`(Postgres)（`app/api/papers/route.ts` 调用）
- `data/papers/*.json` 文件（`app/api/papers/route.ts` 同时在读写）

`app/library/page.tsx` 走 `/api/papers`（服务端），却又 import 了 Dexie 的 `cache-service`，两条路径混用 → 易出"本地有云端没有 / 列表与详情不一致"的脏状态。

**目标**：确立 **Dexie(IndexedDB) 为唯一真相源**，云端(Prisma)降为可选同步层；删除 `data/papers/*.json` 文件存储这条野路子。

**动作**：
- [x] 抽一个统一仓储接口 `lib/db/repository.ts`（`listPapers / getPaper / savePaper / updatePaper / deletePaper / listAnnotations / createAnnotation / getNote / saveNote / ...`），内部封装"先写本地、再可选推云端"
- [x] `app/library/page.tsx`、`app/library/[id]/page.tsx`、`app/viewer/[id]/ViewerClient.tsx`、`app/tools/paper-search/page.tsx`、`lib/annotation/hooks.ts` 全部改为只调这一个仓储接口，不再直接 `fetch('/api/papers')` 与 `cache-service` 混用
- [x] 删除 `app/api/papers/route.ts`、`app/api/papers/[id]/route.ts`、`import/arxiv`、`import/pdf`、`analyze` 里的 `data/papers/*.json` 文件读写逻辑
- [x] `/api/papers` 系列改为"仅在配置了 `DATABASE_URL` 时启用"的可选同步端点；import 路由改为无状态助手（拉元数据/下 PDF/解析，不持久化）
- [x] 删除碎片化遗留模块 `lib/paper/cache-service.ts`、`lib/paper/save-paper.ts`

**验收**：✅ library 列表、`/library/[id]` 详情、viewer、paper-search 入库全部读写同一个 Dexie 仓储，论文集合一致；标注/笔记 hooks 也走 Dexie。`pnpm build` ✅ / `tsc` ✅。

## P0.2 跑通"零配置纯本地"降级路径
**现状**：library 依赖 `/api/papers` → Prisma；未配 `DATABASE_URL` 时 `lib/db/prisma.ts` 走 fallback `new PrismaClient()`（无 adapter），实际查询会报错。clone 下来不配数据库，论文库很可能直接挂。

**目标**：**只配 `DEEPSEEK_API_KEY`（甚至什么都不配）也能完整使用论文库**——检索、入库、阅读、批注、笔记全部走浏览器本地 Dexie。

**动作**：
- [x] 未配 `DATABASE_URL` / `NEXT_PUBLIC_ENABLE_CLOUD_SYNC=false` 时，仓储层直接走 Dexie，**完全不触达** Prisma（路径分流：`CLOUD_SYNC_ENABLED` 门控 `pushToCloud`，服务端路由 `CLOUD_ENABLED` 门控后优雅降级）
- [x] `.env.example` 新增 `NEXT_PUBLIC_ENABLE_CLOUD_SYNC` 开关并说明纯本地默认
- [ ] PDF 文件：纯本地模式当前仍走服务端下载到 `public/papers/` 并以 URL 提供（可用）；后续可选改存 Dexie `pdfBlob` 实现真离线（已在 `savePaper` 预留 `pdfBlob` 入参）
- [ ] 手动验证：删掉 `.env.local` 里的 `DATABASE_URL`，走完"检索→入库→阅读→批注→笔记"全流程不报错（待本地起服务实测）

**验收**：构建层已保证不触达 Prisma；运行时纯本地路径已打通，待手动跑一遍端到端确认。

## P0.3 数据模型对齐
**现状**：`CachedPaper`(Dexie) 与 `prisma/schema.prisma` 字段可能漂移；`Annotation.rects` 是 `any`。

**动作**：
- [x] 新建 `lib/db/types.ts` 定义共享领域类型（`Paper / Annotation / ResearchNote / Rect / AnnotationType`），Dexie 接口对齐它；全站 UI/hooks 的 `@prisma/client` 类型导入改指向它（解耦 Prisma，无 DB 也能编译）
- [x] `Annotation.rects` 改为 `Rect[]`，消除 `any`；统一标注四分类 `highlight|insight|todo|transferable`（修复 Dexie 与 Prisma 标注类型不一致的隐患）
- [x] 同步策略注释落到 `repository.ts` 顶部（本地优先 + best-effort 异步推云端 + 失败不影响本地）

**验收**：✅ 共享类型单一事实源；标注矩形与类型不再有 `any`/类型分裂；`tsc --noEmit` 0 error。

---

# 🟠 P1 · 主线链路打通（让"工作流"名副其实）

> 当前 7 环工具各自能跑，但彼此**不连通**。这是 PaperWeave 区别于"AI 工具箱"的核心承诺所在。

## P1.1 上游输出"一键发往下一环"
**现状**：`markdown-convert → markdown-summarize → idea-generator` 三步要手动复制粘贴中转。

**动作**：
- [ ] 在每个工具输出区加"➡️ 发往下一环"按钮，用 `sessionStorage` 或 URL `useSearchParams` 传递 payload
- [ ] 下游页面挂载时检测并自动填充上游输入（带"来自上一环"提示条，可清除）
- [ ] 链路：`paper-search 选中论文 → library 入库 → 详情 AI 总结 → markdown-summarize 结构化 → idea-generator 生 idea`

**验收**：从论文库选一篇，不复制粘贴，三次点击走到"生 idea"。

## P1.2 论文库作为链路中枢
**现状**：库里的论文与下游工具是断开的。

**动作**：
- [ ] 论文详情页加"用此论文生成 idea / 做结构化总结"入口，直接带着该论文上下文跳转
- [ ] 下游工具产出（总结、idea）可"回存"到对应论文条目（写回 `summary` / `notes` 字段）

**验收**：一篇论文被 ≥2 个下游工具消费，且产出沉淀回库。

---

# 🟡 P2 · 核心工具体验流畅化

> 功能在 ≠ 用得顺。这一层专治"卡顿、白屏、报错没提示、操作没反馈"。

## P2.1 统一加载 / 空 / 错误三态
**动作**：
- [ ] 抽 `<LoadingState>` / `<EmptyState>` / `<ErrorState>` 三个通用组件
- [ ] library、paper-search、viewer 的列表与详情统一接入（骨架屏替代白屏）
- [ ] 所有 `fetch` 失败给可读的中文提示 + 重试按钮，而非 `console.error` 吞掉

**验收**：断网 / 后端报错时，每个核心页面都有明确的失败反馈与重试，无白屏。

## P2.2 流式工具的中断与反馈
**动作**：
- [ ] AI 流式工具（summarize / markdown-summarize / idea-generator / analyze）统一支持"停止生成"
- [ ] 首 token 前显示"思考中"指示，避免点了没反应的错觉
- [ ] 流式出错（断流 / 限流 / key 失效）给具体提示并可一键重试

**验收**：每个流式工具可中途停止；失败提示能区分"网络/限流/未配 key"。

## P2.3 PDF 阅读器流畅度
**现状**：`app/viewer/[id]/ViewerClient.tsx` 506 行，react-pdf + 批注层。

**动作**：
- [ ] 大 PDF 分页懒加载 / 虚拟化，避免一次性渲染全部页卡死
- [ ] 翻页、缩放、批注创建有即时反馈；阅读进度自动保存（`progressDB` 已具备，接上 UI）
- [ ] PDF 加载失败（坏文件 / 跨域）给降级提示与"重新下载"

**验收**：打开 30+ 页论文滚动不明显卡顿；批注创建即时可见。

## P2.4 检索体验
**现状**：`app/tools/paper-search/page.tsx` 1100 行。

**动作**：
- [ ] 检索请求加超时与取消（切换关键词时取消上一次）
- [ ] 单源（arXiv / OpenAlex）失败不拖垮整体，部分结果照常展示并标注"某源失败"
- [ ] 结果分页 / 无限滚动，避免一次塞太多 DOM

**验收**：快速切换关键词不堆叠请求；一个源挂了仍出另一个源的结果。

---

# 🟢 P3 · AI 接入层统一与健壮

> 输出质量是这类工具的命根子；接入层散乱 + 模型偏旧直接拉低体验。

## P3.1 收敛三处 LLM client
**现状**：`lib/ai.ts`、`lib/ai/client.ts`、`lib/services/ai.ts` 三套，`lib/services/ai.ts` 还在用 `gpt-3.5-turbo` / `gemini-pro`。

**动作**：
- [ ] 抽统一 provider 接口 `lib/ai/provider.ts`，三处调用收敛到一处
- [ ] 升级到当前主力模型（DeepSeek 主，OpenAI/Gemini 备）
- [ ] 主供应商失败时自动 fallback 到备用，单点故障不致全站 AI 瘫痪

**验收**：全站 AI 调用经同一入口；停掉 DeepSeek key，备用供应商能接管。

## P3.2 API 路由健壮性
**动作**：
- [ ] 所有 `app/api/*/route.ts` 统一：入参 Zod 校验、超时、限流友好错误、未配 key 时返回明确 4xx 而非 500
- [ ] 统一错误响应格式 `{ success: false, error: { code, message } }`

**验收**：未配 key / 入参非法时返回可读错误码，前端能据此给提示。

---

# 🔵 P4 · 工程质量（支撑可持续改进，不阻塞功能）

## P4.1 拆巨型组件
- [ ] `paper-search/page.tsx`(1100) / `library/page.tsx`(734) / `viewer/ViewerClient.tsx`(506) 拆成自定义 hooks + 子组件（数据逻辑入 `hooks/`，UI 入 `components/`）

## P4.2 清偿 lint 债务
- [ ] 分批修 98 errors：`no-explicit-any`(主力) → `react-hooks/*` → `no-unescaped-entities` → `no-require-imports`
- [ ] 修完把 CI 的 lint 从 `continue-on-error: true` 改回硬门禁

## P4.3 关键路径测试
- [ ] Vitest 覆盖纯逻辑：`lib/services/arxiv.ts` 解析、Markdown 转换链、`tools-registry` 不变量（slug 唯一 / href 一致）、新仓储层
- [ ] Playwright 跑 1 条 happy path：检索 → 入库 → 阅读 → 总结
- [ ] 纳入 CI

---

## 执行顺序建议

```
P0.1 → P0.2 → P0.3   （先把数据底座统一、纯本地跑通——这是所有流畅的前提）
        ↓
P1.1 → P1.2          （再把链路串起来，兑现"工作流"承诺）
        ↓
P2.* 并行            （逐个核心页面做三态 + 流畅度，可单独提交）
        ↓
P3.* / P4.*          （接入层收敛与工程质量，随手补，不阻塞主线）
```

> **每步独立可提交、可验收**。建议每完成一个 P 小节就 `pnpm build` + 手动走查一遍核心流程，再提交。

---

## 验收总目标（Definition of Done）

1. **零配置可用**：只 `pnpm install && pnpm dev`，不配任何数据库 / 云存储，论文库全流程零报错。
2. **数据一致**：列表 / 详情 / 入库三处论文集合完全一致，无脏状态。
3. **链路连通**：从一篇论文，不靠复制粘贴，三次点击走到"生 idea"。
4. **失败有兜底**：任一核心页面在断网 / 后端错 / 未配 key 时都有可读提示与重试，无白屏。
5. **构建与门禁绿**：`pnpm build` ✅ 且 `pnpm lint` 0 error，CI 硬门禁通过。
