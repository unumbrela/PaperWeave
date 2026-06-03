# 贡献指南 · Contributing to PaperWeave

感谢你愿意为 PaperWeave 出一份力！本项目最大的特点是**注册表驱动**——新增一个工具的边际成本极低。

## 本地开发

```bash
pnpm install
cp .env.example .env.local   # 至少填 DEEPSEEK_API_KEY
pnpm dev                     # http://localhost:3000
```

提交前请确保：

```bash
pnpm lint            # ESLint
pnpm exec tsc --noEmit   # 类型检查
pnpm build           # 构建通过
```

CI 会在 PR 上自动跑这三项，全绿才能合并。

## 新增一个工具（核心流程）

只需两步：

1. **在 `lib/tools-registry.ts` 的 `TOOLS` 数组加一条**：

   ```ts
   {
     slug: "your-tool",
     name: "你的工具名",
     description: "一句话说明它做什么。",
     phases: ["读文献"],          // 选 1+ 个研究阶段
     icon: "🔧",
     gradient: "from-[#ff4f8b] to-[#b14bff]",
     href: "/tools/your-tool",
     comingSoon: true,            // 还没接 backend 时设 true，会渲染占位页
   }
   ```

2. **新建 `app/tools/your-tool/page.tsx`**，用 `ToolShell` 包裹页面，保持设计语言一致。

首页的过滤、搜索、排序、卡片展示会**自动接管**，无需改动其他地方。

### 阶段（Phase）说明

工具按研究生命周期的 7 环主线归类：`查论文 / 读文献 / 生 idea / 做验证 / 论文绘图 / 讲结果 / 可视化表达`。一个工具可同时属于多个阶段（如"研究自动化封装器"同时挂"做验证"和"论文绘图"）。

> 注：原"资产/复刻"类工具正计划拆到独立 showcase 仓库（见 `OPTIMIZATION-ROADMAP.md` P0.1），新工具请优先归入科研工作流主线。

## 代码约定

- TypeScript 严格模式，避免 `any`
- 客户端组件才加 `"use client"`，能用 Server Component 就用
- LLM 调用走 `lib/ai.ts` / `lib/ai/client.ts`，流式输出用 Vercel AI SDK
- 样式用 Tailwind + 既有设计 token（`text-ink` / `surface` / `serif-italic` 等），不要硬编码新色板
- 单文件过长（>400 行）请拆分 hooks / 子组件

## 提交规范

- 分支命名：`feat/xxx`、`fix/xxx`、`docs/xxx`
- commit message 用简洁的祈使句描述改动
- 一个 PR 聚焦一件事，附上动机说明；涉及 UI 改动请贴截图

## 路线图

想找事做？看 [`OPTIMIZATION-ROADMAP.md`](./OPTIMIZATION-ROADMAP.md)，里面按优先级列了所有待办，欢迎认领。
