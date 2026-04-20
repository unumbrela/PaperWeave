# AI 小工具集 · 项目规划

> 一个 AI 驱动的"工具箱"网站：首页聚合多个小工具，每个工具独立解决一个具体问题。
> 视觉上向 Raycast 官网看齐（克制、暗色、渐变点缀、微动效）。

---

## 1. 目标与定位

- **受众**：自己 + 有相似需求的开发者/内容创作者。
- **北极星**：让每个工具在 10 秒内能被理解、30 秒内能产出可用结果。
- **价值主张**：
  1. 精选、聚合——进来就能用，不用挑模型、配 key。
  2. 风格统一——所有工具共用同一套输入/输出/历史骨架。
  3. 逐步生长——先 3 个，之后每周加 1 个。

---

## 2. 技术栈

| 层 | 选型 | 理由 |
|---|---|---|
| 框架 | Next.js 15（App Router）+ TypeScript | 路由、流式、RSC 全家桶 |
| 样式 | Tailwind CSS v4 | 工具链最稳，配合 Raycast 风格够用 |
| 组件 | shadcn/ui（按需拷入） | 可控、可改、不绑定 |
| 字体 | Inter（变量字体）+ JetBrains Mono（代码） | 与 Raycast 同门 |
| AI | Vercel AI SDK v5 + `@ai-sdk/deepseek` | 流式 + `useChat` + provider 统一抽象 |
| 模型 | DeepSeek（默认 `deepseek-chat`；代码工具可切 `deepseek-reasoner`） | 便宜 + 中文好 |
| 运行 | Node 22 / pnpm | 环境已就绪 |

---

## 3. 视觉设计（Raycast 质感）

**核心元素**：
- **底色**：近黑 `#0b0b0f`，卡片 `#121218` 带 1px `#1f1f2a` 边框。
- **强调渐变**：`from-[#FF4F8B] via-[#B14BFF] to-[#4B8BFF]`（粉→紫→蓝）。
  只用在：首页 hero 标题、主 CTA、当前工具图标光晕。
- **文本**：主文 `#EDEDF2`，次文 `#9A9AA8`，禁用 `#55555E`。
- **圆角**：卡片 `rounded-2xl`，按钮 `rounded-xl`，输入 `rounded-lg`。
- **阴影**：只给弹层，卡片用边框+轻微内阴影。
- **微动效**：hover 时卡片边框从 `#1f1f2a` → `#2c2c3d`，渐变光晕微微上浮；全站统一 `transition-[150ms]`。
- **导航**：顶部 `backdrop-blur` + 半透明，`border-b` 1px。
- **空白**：大胆留白，首屏 hero padding-y 至少 `96px`。

**视觉参考清单**（自查）：
- [ ] 标题字重 600 + 字距 `-0.02em`
- [ ] 所有按钮有 1px inner highlight（`inset 0 1px 0 rgba(255,255,255,.06)`）
- [ ] 工具卡片左上角放 emoji 或 lucide 图标，带渐变背景方块
- [ ] 键盘提示样式（`<kbd>` 标签）

---

## 4. 信息架构

```
/                       首页：工具网格 + hero
/tools/summarize        网页摘要器
/tools/explain-code     代码解释器
/tools/optimize-prompt  提示词优化器
```

之后新增工具只要放到 `app/tools/<slug>/page.tsx` + 在工具注册表加一项。

---

## 5. 页面结构

### 5.1 首页 `/`
- **Hero**：一行主标题（渐变文字）+ 一句副标题 + 搜索框（`⌘K` 提示）。
- **分类 Tab**：全部 / 写作 / 编程 / 效率（目前只有写作+编程+效率三个一一对应）。
- **工具网格**：3 列，卡片含图标、标题、一句话描述、"打开 →"。
- **底部**：一行版权 + 由 DeepSeek 驱动。

### 5.2 工具页通用骨架
```
┌──────────────────────────────────────────────┐
│  ← 返回   工具图标  工具名                     │
├──────────────────────────────────────────────┤
│  左侧输入区 (≈40%)     │ 右侧流式输出区 (≈60%) │
│  - 主输入                │ - 结果卡片           │
│  - 可选配置              │ - 复制/重试按钮     │
│  - 提交按钮              │                      │
└──────────────────────────────────────────────┘
```
移动端堆叠为上下布局。

---

## 6. 三个工具的详细设计

### 6.1 网页摘要器 `/tools/summarize`
- **输入**：URL（必填）+ 长度偏好（短/中/长）。
- **流程**：
  1. 服务端 fetch URL，用简易文本提取（`<p>`/`<h*>` 拼接 + 去脚本）。
  2. 传给 DeepSeek，要求结构化返回：`TL;DR · 关键点（3-5 条） · 值得引用的原句（2-3 条） · 可能的反方观点`。
  3. 前端流式渲染每一块。
- **错误处理**：URL 非法、抓不到内容、内容过长自动截断。

### 6.2 代码解释器 `/tools/explain-code`
- **输入**：代码（多行）+ 语言下拉（自动检测为默认）+ 解释粒度（逐行/逐段/整体）。
- **流程**：
  1. 前端用 `highlight.js`/`shiki` 做轻量高亮。
  2. 发送到后端，DeepSeek 生成：`总体目的 · 逐段解释 · 时间/空间复杂度 · 潜在坑`。
  3. 右侧输出用 Markdown 渲染，代码块保留语法高亮。
- **模型**：默认 `deepseek-chat`，"复杂度分析"开关打开时切 `deepseek-reasoner`。

### 6.3 提示词优化器 `/tools/optimize-prompt`
- **输入**：原始 prompt + 目标模型类别（对话/图像/代码）。
- **流程**：
  1. DeepSeek 根据 category 套用不同最佳实践（结构化、角色、示例、输出格式）。
  2. 返回：`优化后 prompt · 逐条改动说明（类 diff 样式） · 可直接复制按钮`。
- **展示**：上下对比 + 差异点高亮；右上角"复制优化版"。

---

## 7. 共享代码

```
components/
  ui/           ← shadcn 拷入（button / input / textarea / card / tabs / kbd ...）
  tool-shell.tsx        工具页骨架（左输入右输出）
  tool-card.tsx         首页卡片
  gradient-text.tsx     渐变标题
  stream-output.tsx     流式输出容器（复制/重试）
lib/
  ai.ts                 DeepSeek 客户端初始化
  tools-registry.ts     工具元数据集中注册（id/slug/icon/desc/category）
  extract.ts            URL 正文提取
app/
  api/
    summarize/route.ts
    explain/route.ts
    optimize/route.ts
```

### 工具注册表示例
```ts
export const TOOLS = [
  { slug: 'summarize',       name: '网页摘要器', category: '写作', icon: '📰', desc: '把任意网页压成 30 秒能读完的要点。' },
  { slug: 'explain-code',    name: '代码解释器', category: '编程', icon: '🔎', desc: '粘贴代码，拿到逐段讲解与复杂度分析。' },
  { slug: 'optimize-prompt', name: '提示词优化器', category: '效率', icon: '✨', desc: '把粗糙的 prompt 升级成结构化版本。' },
] as const;
```

---

## 8. 环境变量

`.env.local`（不提交）：
```
DEEPSEEK_API_KEY=sk-xxx
```
`.gitignore` 必含 `.env*.local`。

---

## 9. 实施顺序

1. Scaffold + 安装依赖
2. 全局主题（背景/字体/色板/Tailwind 配置）
3. 共享组件：`tool-shell`、`tool-card`、`gradient-text`
4. 首页：hero + 网格
5. 三个工具的 UI（先静态）
6. 三条 API route + 串流连通
7. 细节打磨：键盘提示、loading 骨架、空状态、错误提示
8. 跑一次 `pnpm build` 确认无 TS/lint 错

---

## 10. 后续可扩展（先不做）

- 登录 + BYOK（让别人用自己的 key）
- 历史记录（本地 IndexedDB）
- 更多工具：JSON 修复、SQL → 自然语言、图像 alt 生成、英文润色
- 主题切换（深浅两套）
- 键盘调色板（⌘K 打开工具跳转，贴近 Raycast 交互）
