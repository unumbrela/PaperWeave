# PaperWeave · 项目总结与状态

> 最后更新：2026-06-03（对齐 P0–P4.2 全部落地后的真实代码状态）

本文档复盘项目当前的**真实**状态、已交付能力与关键设计决策。它以"代码现状"为唯一依据校正——凡文档与代码冲突，以代码为准。

---

## 一、项目定位

**PaperWeave 是一个研究型论文助手，主张"不替你写论文，但让写论文之外的每一步都顺起来"。**

它把研究生命周期切成 7 环主线：

```
查论文  →  读文献  →  生 idea  →  做验证  →  论文绘图  →  讲结果  →  可视化表达
```

工具不是孤立的功能列表，而是一条**上游输出即下游输入**的链路。这是 PaperWeave 区别于"AI 工具箱"类产品的根本切入点——首页把 7 个阶段并排展开，点任意一环，下面的工具按阶段过滤。

> **架构基石 · 注册表驱动**：全站工具的单一事实源是 `lib/tools-registry.ts`。新增一个工具 = 加一条数据 + 写一个 `app/tools/<slug>/page.tsx`，过滤 / 搜索 / 排序 / 首页展示全部自动接管，边际成本极低。

---

## 二、已交付能力盘点（真实状态）

### 2.1 前端框架与设计系统
- **Next.js 16 App Router** + React 19 + TypeScript 5 + Tailwind v4
- 暖纸面底 + 5 团慢速漂移 radial blob + SVG `feTurbulence` 颗粒层的设计语言
- 设计组件本身被产品化进 `tools/web-beautifier`，可即插即用
- `pnpm build` ✅ 52 页全部生成；`tsc --noEmit` ✅ 0 error

### 2.2 论文工作流核心（已落地）

| 能力 | 路由 / 模块 | 核心技术 | 状态 |
| --- | --- | --- | --- |
| 多源论文检索 | `app/tools/paper-search` + `api/paper-search` | OpenAlex + arXiv 聚合，领域包 + 自定义关键词 | ✅ |
| 论文库 | `app/library` + 可选 `api/papers` | 元数据 + 全文 + 总结 + 笔记 + 标签 | ✅ |
| PDF 阅读器 + 批注 | `app/viewer/[id]` + `api/annotations` | react-pdf + 高亮/批注/笔记，四类标注 | ✅ |
| AI 论文分析 | `api/analyze` / `api/analyze-paper` | 抽取研究问题 / 方法 / 创新点 / 应用方向 | ✅ |
| arXiv / PDF 导入 | `api/papers/import/*` | 无状态助手：拉元数据 / 下 PDF / 解析，不持久化 | ✅ |

### 2.3 读文献 / 生 idea / 做验证工具（已落地）

| 阶段 | 工具 | 核心技术 |
| --- | --- | --- |
| 读文献 | 文献网页速读器 `summarize` | DeepSeek 流式 + cheerio 正文抽取 |
| 读文献 | 论文资料整理器 `markdown-convert` | turndown + mammoth + pdf2md + OMML→LaTeX |
| 读文献 | 论文内容结构化总结 `markdown-summarize` | 流式结构化提取（**已接后端，不再占位**） |
| 生 idea | Idea 生成器 `idea-generator` | 差异化假设 + 最小验证实验 + 风险清单（**已接后端，不再占位**） |
| 做验证 | 研究任务规划器 `prompt-chunker` | 原子子问题 + 验收清单 + Runbook |
| 做验证 / 论文绘图 | 研究自动化封装器 `skill-maker` | 输出可落地 `SKILL.md` |

### 2.4 模型可视化 ·"讲结果"系列（已落地）

| 工具 | 核心技术 |
| --- | --- |
| CNN 端到端讲解 | tiny-VGG + TF.js 浏览器内**真实推理**，逐层看 feature map |
| 医学图像分割 | FWMamba-UNet 离线预计算激活回放 |
| Transformer 可视化 | D3.js 注意力权重热图 + 多头注意力 |
| GAN 生成对抗网络 | 潜向量交互 + 中间特征图演变 |
| 扩散模型可视化 | Canvas 动态噪声 + U-Net 去噪过程逐步可视化 |
| iGEM HPI Potsdam 2025 | three.js R3F 3D 星图 + 三段式滚动叙事 |

### 2.5 资产 / 复刻类工具（已从主仓收敛移除）
原先归在「资产」阶段的 9 个前端炫技 / 通用工具（`beautiful-aurora`、`web-beautifier`、`toolbox-background`、`fluid-sim`、`hamish-portfolio`、`bruno-folio`、`algorithm-visualizer`、`explain-code`、`optimize-prompt`）与科研主线定位有张力，**已整体移除**：删除注册表项、`app/tools/*` 页面、`components/*` 与 `lib/beautifier` 资产代码、`app/api/optimize` 路由，并清理 `app/layout.tsx` 里泄漏到全局的资产 CSS。`Phase` 类型与 `PHASES` 不再有「资产」枚举。主仓自此只剩 7 环科研主线。

> 注：`/api/explain` 路由予以保留——它同时被 PDF 批注层（`lib/annotation/hooks.ts`）作为「AI 解释选区」能力调用，并非资产专属。被删资产代码仍可从 git 历史（本次移除前的提交）取回，供未来独立 showcase 仓库使用。

> 没有任何工具仍标 `comingSoon: true`——原先的两个占位（`idea-generator` / `markdown-summarize`）已在 P1 接通后端并并入主线链路。

---

## 三、技术栈与关键设计决策

| 决策 | 替代方案 | 选择理由 |
| --- | --- | --- |
| Next.js 16 App Router | Vite SPA / Nuxt / Astro | 多工具路由 + 流式 API + 注册表驱动天然吻合 |
| DeepSeek + Vercel AI SDK（流式） | OpenAI / Claude / Qwen | 价格最优，流式输出统一抽象 |
| **本地 Dexie 单一真相源 + 可选云端 Prisma 同步** | 纯云端 / 纯本地 / 三套并存 | clone 即用、零配置门槛；需要同步再配数据库 |
| 非流式多供应商 fallback（DeepSeek→OpenAI→Gemini） | 单一供应商 | 主供应商失败自动切换，单点故障不致全站 AI 瘫痪 |
| OpenAlex + arXiv 检索 | 单一 arXiv | 覆盖更广，OpenAlex 含引用图谱 |
| TF.js 浏览器内推理 | 后端推理服务 | "真实推理"是产品差异点，零运维 |
| three.js + R3F | Babylon / 原生 WebGL | 生态最广，迁移成本最低 |
| 注册表驱动 | 路由文件即清单 | 元数据集中、过滤 / 搜索 / 排序统一处理 |

### 关键架构模块（P0–P3 沉淀）
- **`lib/db/repository.ts`** —— 统一仓储层，论文工作流的「单一数据真相源」。本地 Dexie 优先 + best-effort 异步推云端，云同步由 `NEXT_PUBLIC_ENABLE_CLOUD_SYNC` 门控，默认关闭、未配数据库时完全不触达 Prisma。
- **`lib/db/types.ts`** —— 共享领域类型（`Paper / Annotation / ResearchNote / Rect / AnnotationType`），全站 UI/hooks 从此取类型，解耦 `@prisma/client`（无 DB 也能编译）。
- **`lib/workflow/handoff.ts`** —— 「上游输出一键发往下一环」，用 sessionStorage 一次性传递 payload，让 7 环链路在 UI 上真正连通。
- **`lib/ai.ts`（流式）+ `lib/ai/client.ts`（非流式）** —— LLM 接入收敛为清晰两路；主力模型升级为 `deepseek-chat` / `gpt-4o-mini` / `gemini-2.0-flash`；占位 key 视为未配置。

---

## 四、近期完成（2026-06-03 · P0–P4.2）

| 阶段 | 主题 | 成果 |
| --- | --- | --- |
| **P0** | 持久层统一 | 把「Dexie + Prisma + `data/papers/*.json`」三套并存，收敛为「Dexie 单一真相源 + 可选云同步」。新增 `repository.ts` / `types.ts`；删除 `cache-service.ts` / `save-paper.ts` 与全部 JSON 文件存储；统一标注四分类、`rects` 去 `any`。**零配置纯本地可用**。 |
| **P1** | 主线链路打通 | 新增 `handoff.ts` + `handoff-controls.tsx`；`markdown-convert →（发往）→ markdown-summarize →（发往）→ idea-generator` 三步零复制粘贴贯通；论文库详情页变链路中枢，一键带论文上下文跳转下游。 |
| **P2** | 体验流畅化 | 三态组件 `states.tsx`（骨架 / 空 / 错误重试），library 接入消除白屏；`useStream` 增 `stop()` 中断保留文本 + 「思考中」指示 + `friendlyError` 错误归类，7 个流式工具统一接入；PDF 阅读进度自动保存 / 恢复；检索 `AbortController` 取消 + `Promise.allSettled` 单源失败不拖垮整体。 |
| **P3** | AI 接入层收敛 | 删死代码 `lib/services/ai.ts`（消除 `gpt-3.5-turbo` / `gemini-pro` 旧模型债务）；非流式 fallback 多供应商；6 个流式路由加「未配 key」前置守卫返回可读 503，不再中途断流。 |
| **P4.2** | lint 清零（核心） | 核心路径（`lib/db`、`lib/ai`、`lib/workflow`、library、viewer、paper-search、papers/analyze API 等）现 **0 lint error**。 |
| **P5（本轮）** | 核心页打磨 + 去重 + 拆分 | (A) library / library[id] / viewer 及子组件（Sidebar / FloatingMenu / PDFViewerDynamic）从原生灰蓝/暗色全量换为暖纸面 token，消除画风割裂；(B) 去掉 library[id] 用随机数伪造的 PDF 下载进度条，改为诚实状态；(C) 三页 `Paper`/`Author` 改用 `lib/db/types` 单一类型源，抽 `lib/ai/analyze.ts` 收敛 `/api/analyze` 与 `/api/analyze-paper` 的重复 prompt/解析；(D) 拆分三个巨型组件（详见 §五·4）。 |

---

## 五、当前的局限与坑位（诚实清单）

1. ~~定位张力~~（**已解决**）：原「资产」阶段 9 个前端炫技 / 通用工具已整体从主仓移除（注册表项 + 页面 + `components` / `lib/beautifier` 资产代码 + `app/api/optimize` + 全局泄漏的资产 CSS），主仓收敛为纯 7 环科研主线。被删代码可从 git 历史取回供独立 showcase 仓库使用。
2. ~~链路回存缺口~~（**已解决**）：下游产出可一键"回存"到对应论文条目——`handoff` 携带 `sourcePaperId`，新增 `SaveToLibrary` 组件，结构化总结回写 `summary`、idea 追加进 `notes`（详情页新增「研究笔记」区展示）。从一篇论文出发「生成 → 回存」的工作流闭环已打通。
3. **纯本地端到端待实测（P0.2 未竟）**：构建层已保证不触达 Prisma，但"删 `DATABASE_URL` 后走完 检索→入库→阅读→批注→笔记"尚未手动跑一遍确认；PDF 仍走服务端下载到 `public/papers/` 提供 URL，真离线 `pdfBlob` 入参已预留未启用。
4. ~~巨型组件未拆~~（**已解决** · P4.1）：`paper-search`（1109→431）、`library`（672→369）、`viewer/ViewerClient`（505→387）已拆出 7 个聚焦子组件（`paper-search/{ApiSettings,SearchForm,ResultCard}`、`library/{ImportModal,PaperCard}`、`viewer/{ViewerHeader,PdfToolbar}`，均 ≤286 行）；状态/处理器仍留页内，回归风险最小。
5. **vendored 可视化代码 lint 未清**：核心已 0 error，但 explainer（transformer/gan/diffusion）、ganlab 等 vendored 代码仍有 lint errors；CI lint 暂为 `continue-on-error`，未翻硬门禁。
6. **测试基本为零（P4.3 未竟）**：无 Vitest / Playwright，验收靠手动 `pnpm build` + 走查。关键纯逻辑（arXiv 解析、Markdown 转换链、注册表不变量、仓储层）与 1 条 happy-path E2E 待补。
7. **全中文，无 i18n**：海外触达为零。
8. **第三方版权**：`LICENSE`（MIT）已补；资产拆分后仅余 iGEM HPI Potsdam 主页（「可视化表达」环）仍内置第三方素材，公开发布前建议以"外链引用"替代"代码内置"规避授权风险。
9. **统一错误 envelope 未全量**：非 AI 路由的 `{ success, error: { code, message } }` 统一响应格式留作后续。
10. **无可观测性 / SEO**：错误率、token 消耗无埋点；无 OG 图 / sitemap。
11. ~~文档引用悬空~~（**已解决**）：`README.md` 原链接已删除的 `OPTIMIZATION-ROADMAP.md` / `CORE-IMPROVEMENT-PLAN.md`、以及 CI 注释里的同名引用 —— 已分别修正为指向 `PROJECT-SUMMARY.md`，License 小节亦已对齐已补的 MIT `LICENSE`。

---

## 六、下一步行动建议

按"对核心链路价值 / 可见度"排序（链路回存与定位收敛已完成，见 §五·1、§五·2）：

1. **手动验证纯本地端到端（P0.2）** —— 删 `DATABASE_URL` 跑全流程，给"零配置可用"盖章。
2. **门面与首因** —— README Demo GIF（检索→入库→批注→总结→生 idea→回存）+ Vercel Live Demo（纯本地模式无需数据库），补上"访客 0 秒能看见的价值"。
3. **拆巨型组件（P4.1）+ 补关键路径测试（P4.3）** —— 为后续可持续迭代与开源协作铺路，并把 CI lint/test 翻成硬门禁。
4. **传播放大** —— i18n（至少 README 英文版）、iGEM 第三方素材改外链、技术故事 + 可玩 demo 投 HN / Reddit。

---

## 一句话总结

**7 环主线骨架已成型，论文检索 / 论文库 / PDF 批注 / AI 分析 / 6 个模型可视化均已跑通；P0–P4.2 把数据底座统一为 Dexie 单一真相源、把读文献三步串成零复制粘贴链路、把核心体验做出兜底、把 LLM 接入收敛成两路带 fallback；随后又闭合了「论文 → 总结/idea → 回存论文条目」的工作流回环，并把主仓从前端炫技资产收敛为纯 7 环科研主线。接下来的瓶颈不在再写工具，而在补门面（Demo/Live Demo）、拆巨型组件补测试、做传播，把"个人项目"打磨成可持续的开源爆款。**
