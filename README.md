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
| 检索 | **OpenAlex** + **arXiv**（已通）；Semantic Scholar / IEEE / Scopus / PubMed / ACM / Web of Science（接入中） |
| 持久化 | **本地** `Dexie`（IndexedDB，含 PDF Blob）+ **云端** `Prisma` + `PostgreSQL` + `Supabase Storage` |
| 可视化 | `Three.js` / `@react-three/fiber`、`D3.js`、`TensorFlow.js`、`Framer Motion` |

---

## 核心能力

### 🔎 论文检索与论文库
- 多源聚合检索（OpenAlex + arXiv），预设领域包（CV / NLP / 多模态 / 机器人 / 强化学习 …）+ 自定义关键词
- 结果直接组织成**论文库卡片网格**，一键入库
- 论文库 `/library`：元数据 + 全文 + 结构化总结 + 笔记 + 标签，本地优先、可云端同步

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

构建 / 启动：

```bash
pnpm build
pnpm start
pnpm lint
```

### 环境变量

在项目根目录创建 `.env.local`：

```bash
# ── AI（论文分析与流式工具）────────────────────
DEEPSEEK_API_KEY=your_deepseek_key      # 默认 LLM
DEEPSEEK_API_URL=https://api.deepseek.com/v1
OPENAI_API_KEY=your_openai_key          # 可选，论文分析备选
GOOGLE_API_KEY=your_gemini_key          # 可选，论文分析备选
AI_PROVIDER=openai                      # openai | gemini（论文分析走哪家）

# ── 数据库与存储（论文库云端同步，可选）──────────
DATABASE_URL=postgresql://...           # PostgreSQL（Prisma）
NEXT_PUBLIC_SUPABASE_URL=...            # Supabase（PDF 文件存储）
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

> 只想跑前端工具和模型可视化？**只配 `DEEPSEEK_API_KEY` 即可**，论文库会自动退化到纯本地 IndexedDB 模式。

数据库初始化（需要云端论文库时）：

```bash
pnpm prisma generate
pnpm prisma migrate dev
```

---

## 项目结构

```text
app/
  api/                  # 流式与数据接口
    paper-search/       # 多源论文检索
    papers/             # 论文库 CRUD + arXiv/PDF 导入
    annotations/  research-notes/
    analyze/  analyze-paper/   # AI 论文分析
    summarize/  markdown-convert/  chunk-it-up/  skill-maker/
  tools/                # 各工具页（注册表驱动）
  library/  viewer/     # 论文库 + PDF 阅读器
  layout.tsx  page.tsx  globals.css
components/
  tool-card.tsx  tool-shell.tsx  coming-soon.tsx
  pdf-viewer/  annotation/  sidebar/
  cnn/  transformer-explainer/  gan-explainer/  diffusion-explainer/  ...
lib/
  tools-registry.ts     # 工具元数据单一事实源 + Phase 枚举
  db/                   # local-db(Dexie) + prisma
  services/             # arxiv / storage / ai
  paper-search/  paper/  annotation/  research-note/
  ai.ts  ai/            # LLM client wrappers
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
