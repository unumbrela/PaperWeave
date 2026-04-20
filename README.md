# Toolbox

一个基于 `Next.js 16`、`React 19` 和 `Tailwind CSS 4` 的 AI 小工具站，当前内置 3 个工具：

- 网页摘要器
- 代码解释器
- 提示词优化器

界面采用暖纸色编辑风格，包含真实动态背景：

- 5 个独立缓动的 `radial-gradient` 色球
- `blur(110px)` + `mix-blend-mode: multiply` 的融合效果
- 一层 SVG `feTurbulence` 颗粒噪点覆盖

## 技术栈

- Next.js App Router
- React 19
- Tailwind CSS 4
- `ai` SDK
- DeepSeek (`deepseek-chat`, `deepseek-reasoner`)
- Cheerio（网页正文抽取）

## 本地运行

先安装依赖，再启动开发环境：

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## 环境变量

项目依赖 DeepSeek API，需在 `.env.local` 中提供：

```bash
DEEPSEEK_API_KEY=your_key_here
```

## 项目结构

```text
app/
  api/
    summarize/route.ts
    explain/route.ts
    optimize/route.ts
  tools/
    summarize/page.tsx
    explain-code/page.tsx
    optimize-prompt/page.tsx
  globals.css
  layout.tsx
  page.tsx
components/
  mesh-background.tsx
  stream-output.tsx
  tool-card.tsx
  tool-shell.tsx
  use-stream.ts
lib/
  ai.ts
  extract.ts
  tools-registry.ts
```

## 背景实现说明

动态背景由 [components/mesh-background.tsx](components/mesh-background.tsx) 和 [app/globals.css](app/globals.css) 共同实现。

- 背景层使用 `position: fixed` 覆盖整个视口
- 内容层通过独立 stacking context 保证始终压在背景之上
- 5 个色球使用不同的关键帧周期，避免同步运动
- SVG 颗粒层使用显式全屏尺寸，位于色球之上、正文之下，用来补足纸张质感

如果你只看到暖色静态底，优先检查：

- 背景层是否被错误地放到了负 `z-index`
- 浏览器是否启用了会干扰动画/混合模式的强制节能或图形限制
- 本地样式是否有缓存未刷新

## 脚本

```bash
npm run dev
npm run build
npm run start
npm run lint
```
