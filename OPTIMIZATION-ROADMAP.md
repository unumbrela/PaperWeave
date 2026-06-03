# PaperWeave · 改进优化路线图

> 目标：把 PaperWeave 打磨成 **GitHub 爆款级**开源项目。
> 创建 2026-06-01 ｜ 最近整理 2026-06-01（第三轮：已完成/待做分区 + 待办精修）
>
> **唯一主题**：科研论文工作流 —— 查论文 → 读文献 → 生 idea → 做验证 → 论文绘图 → 讲结果 → 可视化表达。
> 凡是与这条主线无关的内容（前端特效、第三方作品复刻、通用小工具），一律拆到第二仓库，不在主仓占位。
>
> 排序原则：**不按工作量，按"对主线完整度 / Star 数 / 可用性的影响"**。

---

# 一、已完成 ✅

### 文档对齐
- [x] 重写 README（中文，对齐真实代码：双层持久化 + 三家 AI + 多源检索；移除"零后端依赖"过时说法）
- [x] 校正 `PROJECT-SUMMARY.md`（paper-search / library / viewer / 5 个 explainer 从"占位"改为"已落地"）
- [x] 清除 README 死链（`TECH-RESEARCH` / `TALK` / `PLAN-paper-assistant-v2` 三个不存在的文档已不再被引用，已核实无残留）
- [x] 产出并持续维护本路线图

### 决策拍板
- [x] **定位**：主仓只保留科研工作流主线，资产/复刻类拆到第二仓库
- [x] **持久化方向**：本地 IndexedDB(Dexie) 优先 + 可选云端(Prisma/Postgres) 同步

### 工程基建（零风险增量）
- [x] `LICENSE`（MIT + 第三方 NOTICE 声明）
- [x] `.env.example` + `.gitignore` 放开 `!.env.example`
- [x] GitHub Actions CI：`.github/workflows/ci.yml`（lint 非阻塞 / tsc / build）
- [x] README 加 CI / License / Next.js 三个 badge
- [x] `package.json` 改名 `paperweave` + `engines.node >=20`
- [x] `CONTRIBUTING.md` + Issue（bug/feature）/ PR 模板
- [x] ESLint 忽略 vendored `public/**`

### 修复真实 build 阻塞（项目此前 `pnpm build` 失败）
- [x] `app/api/analyze-paper/route.ts`：删除重构残留的游离 prompt 片段 + 修正未定义的 `apiKey` 守卫
- [x] `components/ganlab/DistributionView.tsx`：闭包内 `canvas` 可空 → 改用 `ctx.canvas`
- [x] `components/ganlab/LayeredDistributions.tsx`：ASI 缺分号导致 IIFE 被当函数调用 → 补分号
- [x] `lib/sampler.ts`：`Distribution` 类型补 `moons` 并实现双月牙采样，消除与 `DistributionSelector` 的类型分裂
- [x] 结果：`pnpm exec tsc --noEmit` ✅ ／ `pnpm build` ✅（50 页全部生成）

> ⚠️ **以上改动尚未 commit**。提交计划见下方 [P1.3](#p13-提交未跟踪文件)。

---

# 二、待做 🚧

## 🔴 P0 · 门面与定位（决定别人是否会 Star）

### 0.1 拆资产/复刻库，收敛到唯一主题
当前 `lib/tools-registry.ts` 里 `资产` 阶段挂了 9 个与"论文工作流"无关的工具，稀释定位。

- [ ] **特效/复刻类（7 个）→ 迁出到第二仓库**（建议命名 `web-effects-gallery`）：
  `beautiful-aurora`、`web-beautifier`、`toolbox-background`、`fluid-sim`、`hamish-portfolio`、`bruno-folio`、`algorithm-visualizer`
  - 连同各自的 `app/tools/<slug>/` 页面、专属 `components/` 与 `lib/` 一起迁走
  - 主仓 README 末尾用一行链接引用第二仓库即可
- [ ] **通用 AI 小工具（2 个）`explain-code`、`optimize-prompt` → 二选一处理**：
  - 默认：一并迁出（它们与"论文"弱相关，对应 `app/api/explain`、`app/api/optimize` 同步迁走）
  - 或：若坚持保留，必须重新归入主线阶段并贴合科研语境（如 `explain-code` 归"做验证"，定位为"读实验代码"），不再用 `资产` 标签
- [ ] **删除 `资产` 这个 Phase**：移除 `lib/tools-registry.ts` 第 9 行 `Phase` 联合类型里的 `"资产"`，以及 `PHASES` 数组里的 `"资产"`
- [ ] 迁出后跑一遍 `pnpm build` 确认无断引用
- **为什么**：爆款必须一句话说清"它是什么"。"科研工具"和"前端炫技集"两个产品混在一仓，谁都火不了；拆开后两边各自都更清晰。

### 0.2 README 配 Demo（需你本人操作录制）
- [ ] 录端到端核心流程 GIF（检索 → 入库 → PDF 批注 → AI 总结），放 `docs/demo.gif`，替换 README 顶部占位注释
- [ ] 补 3–4 张静态截图（论文库 `/library`、PDF 阅读器 `/viewer`、CNN/Transformer 可视化）
- [ ] 部署公开 Live Demo（Vercel），README 顶部加 "🔗 Live Demo" 链接
- **为什么**：GitHub "3 秒决定 Star"靠顶部那张 hero GIF；工具类项目没有 live demo 很难火。你有大量现成可视化，不展示是浪费。

### 0.3 第三方版权收尾（与 0.1 协同，避免重复劳动）
0.1 把 Bruno / Fluid Sim / Hamish 迁走后，主仓的第三方版权风险已大幅缩小，**只剩以下需处理**：
- [ ] `hpi-potsdam`（HPI Potsdam iGEM 站点克隆，挂在"可视化表达"环）：要么换成**自制的原创可视化 demo**，要么在页面显著处标注原作者与许可，并在 LICENSE NOTICE 保留条目
- [ ] 核对 `public/` 下重资源来源合规：`pdf.worker.min.mjs`（标准库，OK）、CNN tiny-VGG 权重、医学分割激活数据（确认有权再分发）
- **为什么**：把别人的作品打包进公开仓库有 DMCA 与原创性质疑风险。

---

## 🟠 P1 · 补齐主线、打通数据底座

### 1.1 补齐链路中段两个占位工具（最贴主题的必做项）
7 环主线此前**有两处断链**：`idea-generator`（生 idea）和 `markdown-summarize`（读文献的结构化总结）都是 `comingSoon` 且无后端。
- [x] `markdown-summarize`：新建 `app/api/markdown-summarize/route.ts`，输入论文 Markdown + 提取侧重（均衡/方法/实验/综述），DeepSeek 流式抽取「研究问题 / 方法 / 实验设置 / 关键引文」，输出结构对齐 `idea-generator` 输入
- [x] `idea-generator`：新建 `app/api/idea-generator/route.ts`，输入方向 + 参考摘要 + baseline + 资源约束，用 `deepseek-reasoner` 流式输出 3–5 条「差异化假设 + 最小验证实验 + 资源开销 + 风险」+ 优先级建议；Zod 校验入参
- [x] 两个工具页改写为流式 UI（`useStream` + `StreamOutput` + `ToolShell`），注册表去掉 `comingSoon`；`tsc` / `build` 通过
- [ ] 在 `markdown-convert → markdown-summarize → idea-generator` 之间加"一键发往下一环"按钮（用 `useSearchParams` 接收上游输出），把链路在 UI 上显化
- **为什么**：这是产品核心承诺所在，比任何外围优化都更能体现"PaperWeave 与普通 AI 工具箱的区别"。

### 1.2 统一持久层
`lib/db/local-db.ts`(Dexie) 与 `lib/db/prisma.ts`(Postgres) 并存，`app/library/page.tsx` 两边都调，数据真相源不唯一，易出"本地有云端没有"的脏状态。
- [ ] 按已定方向落地：**Dexie 为真相源**，云端为可选同步层；梳理 `library/page.tsx`、`viewer/[id]/ViewerClient.tsx` 的读写路径
- [ ] 写一段简明同步策略（何时写本地、何时推云端、冲突如何解决），落到 `lib/db/` 的注释或独立 doc
- [ ] 未配 `DATABASE_URL` 时，论文库须能纯本地正常工作（验证降级路径）
- **为什么**：这是"论文库作为跨工具数据底座"的地基，地基不稳后续所有串联都不可靠。

### 1.3 提交未跟踪文件
当前 `git status` 有几十个未跟踪文件（paper-search / viewer / library / explainer）叠加本轮新增，全在工作区未提交。
- [ ] 分批有意义地提交：建议 `chore: LICENSE/CI/模板`、`fix: 修复 build 阻塞的类型/语法错误`、`docs: README+路线图`、`feat: 论文检索/库/阅读器` 等几个独立 commit
- **为什么**：未提交 = 成果随时可能丢失，且无法触发 CI 验证。

---

## 🟡 P2 · 工程质量与传播

### 2.1 清偿 lint 债务
现存约 100 个 lint error，CI 暂设 `continue-on-error`。
- [ ] 按规则逐批修：63 个 `no-explicit-any`（补类型）、17 个 `react-hooks/set-state-in-effect`、12 个 `no-unescaped-entities`、7 个 `no-this-alias`、4 个 `no-require-imports`（改 ESM import）
- [ ] 修完把 `.github/workflows/ci.yml` 的 lint 步骤从 `continue-on-error: true` 改回硬门禁
- **为什么**：绿色且真实的 CI 是开源信任感来源；`any` 满天飞也劝退贡献者。

### 2.2 拆巨型组件
- [ ] `app/tools/paper-search/page.tsx`(1100 行)、`app/library/page.tsx`(734 行)、`app/viewer/[id]/ViewerClient.tsx`(506 行) 拆成自定义 hooks + 子组件
- **为什么**：单文件过大难维护、难 review，直接抬高外部贡献门槛。

### 2.3 核心测试
- [ ] Vitest 单测覆盖纯逻辑：`lib/services/arxiv.ts`（解析）、Markdown 转换链路、`lib/tools-registry.ts` 不变量（slug 唯一、href 与 slug 一致）
- [ ] Playwright 跑首页 + 1 条完整链路（检索→入库→总结）的 happy path
- [ ] 测试纳入 CI
- **为什么**：有测试的项目贡献者才敢改；链路 E2E 还能防止"改一处断一片"。

### 2.4 SEO 与分享
- [ ] 用 `@vercel/og` 给首页 + 各工具页动态生成 OG 图（首页突出"7 环工作流"骨架）
- [ ] 加 `app/sitemap.ts` 与 `robots.txt`
- **为什么**：决定项目被分享到社媒/群里时的卡片观感与可被搜索发现性。

### 2.5 国际化（若目标含海外 Star）
- [ ] 接入 `next-intl`，UI 中英双语；产出英文 README
- [ ] 关键 LLM prompt 支持双语输出
- **为什么**：GitHub Star 基本盘在英文世界，全中文几乎放弃海外触达。

---

## 🟢 P3 · 单工具能力升级（提升输出质量 = 提升留存）

### 3.1 统一并升级 LLM 接入层
现在 LLM client 分散三处：`lib/ai.ts`、`lib/ai/client.ts`、`lib/services/ai.ts`，且 `lib/services/ai.ts` 还在用过时的 `gpt-3.5-turbo` / `gemini-pro`。
- [ ] 抽一个统一 provider 接口，收敛三处 client
- [ ] 升级到当前主力模型；DeepSeek 主、备用供应商 fallback（单点故障不致全站瘫痪）
- **为什么**：输出质量是这类工具的命根子，模型过时直接拉低体验；三处分散是真实技术债。

### 3.2 PDF 解析升级
- [ ] 评估 GROBID / Marker / Nougat 处理双栏、公式密集、表格的复杂 layout（当前 `@opendocsg/pdf2md` 在这类论文上退化明显），作为可选高质量通道
- **为什么**："读文献"是核心环节，复杂论文解析准确率直接决定可用性。

### 3.3 更多检索源落地
`lib/paper-search/types.ts` 已列出 8 个源，实际只有 OpenAlex + arXiv 通。
- [ ] 优先接免鉴权/免费源：Semantic Scholar（引用图谱）、PubMed
- [ ] 需 API key 的源（IEEE / Scopus / Web of Science / ACM）做成"填 key 才启用"，UI 已有 Settings 入口
- **为什么**：检索覆盖面是"查论文"环的核心竞争力，且已有占位，落地成本可控。

### 3.4 论文绘图 skill 模板库
- [ ] 把方法总览图 / 模块图 / 对比图 / 消融图沉淀为可参数化的 drawio + matplotlib `SKILL.md`，与 `skill-maker` 形成生态
- **为什么**：填实"论文绘图"环，让 `skill-maker` 的"做验证↔论文绘图"双复用真正成立。

---

## 🔵 P4 · 性能与可观测性

- [ ] **iGEM 3D 性能档位**（拆库后主仓只剩 `hpi-potsdam` 这一个重 3D 页）：用 `detect-gpu` 检测 GPU tier，低端机 fallback 到 2D 静态 + CSS 动效
- [ ] **可观测性**：接 Vercel Analytics + 各 API 路由记录 input/output tokens、latency、error
- [ ] **重资源 CDN**：CNN tiny-VGG 权重、医学分割激活数据走 Vercel Blob / R2，避免阻塞首屏（3D 贴图类已随资产库拆出）
- **为什么**：性能与埋点是从"能跑"到"可运营"的门槛，但优先级低于把主线做完整。

---

## ⚪ P5 · 未来探索（不承诺时间）

- [ ] 论文库 + 引用关系画成 force-directed graph（`d3` 已在依赖里）
- [ ] Agent 化：把"找论文 → 总结 → 生 idea → 拆任务"做成一条可触发的 pipeline
- [ ] CLI 版本：`paperweave search "diffusion 3d" --limit 20`
- [ ] 浏览器内本地 LLM（webllm），让任务规划器等纯文本工具脱离 API 依赖

---

# 三、衡量成功的指标

不要只盯功能数量与 Star 绝对值，盯这些：

- **README → Demo 的转化**：访客看完顶部 GIF 是否点进 Live Demo
- **链路完成率**：用户从"查论文"一路走到"讲结果"的 session 占比（P1.1 做完才有意义）
- **跨工具引用次数**：一个论文库条目被几个下游工具消费
- **贡献者增长**：是否有外部 PR（CONTRIBUTING + 注册表模式是否真的降低了门槛）
