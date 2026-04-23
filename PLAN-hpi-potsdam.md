# HPI Potsdam 首页移植 · 实施计划

> 把 `reference_repos/hpi-potsdam/`（HPI Potsdam 2025 iGEM 队伍 BioComplete 项目 wiki）的首页**原样移植**到本站 `/tools/hpi-potsdam`，并附中文解读层。
>
> 交付形态：既是"展示"（忠实还原原作者的 3D 星图 + 滚动叙事），也是"解读"（新增一层中文 commentary 告诉读者每段在讲什么、技术上怎么做到的）。

---

## 一、工具注册信息

| 字段 | 值 |
|---|---|
| slug | `hpi-potsdam` |
| 路由 | `/tools/hpi-potsdam` |
| name | HPI Potsdam · iGEM 首页 |
| category | 学习 |
| icon | 🧬 |
| gradient | `from-[#4cc9f0] to-[#7c3aed]`（贴合原站深蓝紫色调） |
| description | 原样移植 HPI Potsdam 2025 iGEM 队伍 BioComplete 主页：Three.js 3D 星图浏览 iGEM Registry 嵌入空间 + 三段式滚动叙事，附中文解读。 |

---

## 二、范围

### ✅ 保留（忠实移植）
- **Starfield 3D 背景**：Three.js / react-three-fiber，~75k 粒子，真实数据来自 `igem-composite-3d.csv`（3.6MB，已包含）。基于相机距离（0→320）的单向 convergence 动画，shader 粒子、Bloom、Vignette、Noise 后处理。
- **三段式 Hero 文案**：`cameraDistance < 100` → "Lost in Parts"；`[100, 300)` → "Explore the iGEM Registry"；`≥ 300` → 出现 Legend + scroll arrow。
- **Part Type 图例**：12 种颜色编码，点击高亮对应类别、再点取消。
- **BioComplete intro section**：logo + 标题 + 副标题。
- **Vision 面板**：愿景三段。
- **Challenge–Solution 三对**：图标 + 箭头 SVG。
- **Highlights 七个 pillar card**（网格布局）。
- **Scroll arrows**（desktop + mobile 两套）。

### 🔧 改动
- `import.meta.env.BASE_URL` → 改成 `/hpi-potsdam/`（Next.js public 路径）。
- 七个 pillar card 内部链接（`/model` `/results` `/safety-and-security` …）在本站里并不存在 → 统一改为"演示链接"，点击后滚到本页顶部或打开一个小 toast 提示"此链接指向原站子页面，未一并移植"。
- 移除原项目的 React Router 上下文依赖 —— 原 `Home` 是作为某个 layout 的子页，会被外层 Navbar/Footer 包住；我们独立挂在本站的 paper/ink 背景上，所以要保留 `.home-container` 自带的暗色背景铺满 section。

### ➕ 新增（解读层）
1. **顶部 Breadcrumb Bar**（Raycast 风格小卡）：
   - 左侧：← 返回工具合集
   - 中部：元数据（Team: HPI Potsdam / Year: 2025 / Project: BioComplete / Category: Software）
   - 右侧：跳转原站 + 跳转 iGEM Wiki 的 outbound link
2. **中文导读段**（Hero 上方固定一小段，可折叠）：一段 3–4 行的中文，说明这是什么项目、做什么用、你即将看到什么。
3. **右侧浮动 Commentary rail**（`xl:` 以上显示）：滚动到不同 section 时高亮对应条目，每条是一行中文"这是在讲什么"。包含 5 个锚点：
   - Starfield Hero · 3D 嵌入空间
   - BioComplete 介绍
   - Vision
   - Challenge ↔ Solution
   - Highlights
4. **底部解读文章**（复用 `components/markdown.tsx` 的样式或自写 Article 组件）：
   - 项目是什么（iGEM 2025、合成生物学、HPI Potsdam 团队）
   - 首页在讲什么故事（"迷失 → 探索 → 解决"三幕）
   - 技术亮点：Three.js 粒子 shader 技巧、CSV 嵌入数据加载、基于 camera distance 的状态机叙事、convergence 动画
   - 值得学习的设计决策（把研究成果可视化成"可交互的星图"而不是 PPT 截图）

---

## 三、依赖新增

```json
{
  "dependencies": {
    "three": "^0.180.0",
    "@react-three/fiber": "^8.15.0",
    "@react-three/drei": "^9.88.0",
    "@react-three/postprocessing": "^2.16.0",
    "papaparse": "^5.5.3"
  },
  "devDependencies": {
    "@types/three": "^0.180.0",
    "@types/papaparse": "^5.3.16"
  }
}
```

> React 19 + @react-three/fiber 8 版本线需要验证。如果有 peer warning 就把 fiber 升到 9。

---

## 四、文件清单

### 新增
```
app/tools/hpi-potsdam/
  page.tsx              # server wrapper，import 全局 CSS + 设置 metadata
  landing.css           # 复制自 reference_repos/.../LandingPage.css（1775 行）

components/hpi-potsdam/
  Home.tsx              # 复制自 home.tsx，改 BASE_URL，"use client"
  StarField.tsx         # 复制自 StarField.tsx（1080 行），"use client"
  HpiPage.tsx           # 整合 Commentary + Home 的客户端外壳
  Commentary.tsx        # 右侧解读 rail（xl 及以上显示）
  TopBar.tsx            # 顶部 Breadcrumb 卡片
  Article.tsx           # 底部中文解读文章

public/hpi-potsdam/
  igem-composite-3d.csv # 3.6MB, 复制自参考仓库
  favicon.svg           # BioComplete logo
```

### 修改
```
lib/tools-registry.ts   # 注册新工具
package.json            # 新增依赖
```

---

## 五、CSS 隔离策略

原 `LandingPage.css` 1775 行，使用了许多通用类名（`.hero-section`, `.info-section`, `.info-panel`, `.hero-title`…）。不值得做完整的 CSS Module 改写（工作量大、易出错），也不值得加 prefix（同理）。

采用"**局部 import 即可**"：
- 在 `app/tools/hpi-potsdam/page.tsx`（server component）里 `import "./landing.css"`。Next.js 允许 route-local CSS，它会全局生效但仅在该 chunk 激活时下载。
- 这些 class 名在本站其他页面从不出现在 DOM 中，所以不会视觉冲突。
- 唯一风险：CSS 里的 `body`, `html`, `*` 等全局选择器会污染。原文件里只有 class selector 和 keyframes —— 先用 grep 确认，若有全局选择器就删掉或加 prefix。

---

## 六、SSR / 客户端边界

- `page.tsx`：server component，`export const metadata`，`import "./landing.css"`，渲染 `<HpiPage />`。
- `HpiPage.tsx` / `Home.tsx` / `StarField.tsx` / `Commentary.tsx` / `TopBar.tsx`：全部 `"use client"`（用了 `useRef` / `useState` / `window.matchMedia` / `Canvas`）。
- `Article.tsx`：可保持 server component（纯静态文本）。
- WebGL 兜底：原 StarField 有 ErrorBoundary + `checkWebGLSupport()`，保留原样；在不支持 WebGL 的机器上显示静态 fallback。

---

## 七、风险与决策

| 风险 | 应对 |
|---|---|
| CSV 3.6 MB 首次加载慢 | 接受（这是教学演示页面）；StarField 原生有 loading overlay |
| three + postprocessing ~ 1MB gz | 只在 `/tools/hpi-potsdam` 路由按需加载，不影响主页 |
| React 19 × fiber 8 peer 冲突 | 先按原版本号装；若 peer warning 挡路就 `fiber@^9` |
| pillar-card 内部链接失效 | 改为 `onClick={() => toast('此页未一并移植')}` 或统一 `href="#"` + `e.preventDefault()` |
| 原 CSS 用了深色 body 背景（`#02040a`） | 首页是 Raycast 暖 paper 风，本页面是深色 —— 在 `.home-container` 上铺满 viewport 的 fixed background 即可，解读层用半透明深色卡片 |
| 本站顶部已有全局 header（若有） | 已查看 `app/layout.tsx` —— 若有全局 header 要确认不被深色背景遮挡 |

---

## 八、工作节奏（预估）

1. 装依赖 + 拷贝 CSV/favicon（5 min）
2. 拷贝 + 适配 `StarField.tsx` / `Home.tsx` / `landing.css`（15 min）
3. 写 `HpiPage` + `TopBar` + `Commentary` + `Article`（25 min）
4. 注册 registry + `page.tsx`（5 min）
5. 本地 `pnpm dev` 调试：WebGL 正常、CSV 加载、三段文案、图例过滤、链接改写、响应式（10 min）
6. 整理与 lint（5 min）

---

## 九、确认点

- [ ] 工具名用 "HPI Potsdam · iGEM 首页" 还是你想要别的？
- [ ] 解读文章用中文写满（≈ 500 字），还是短注解？
- [ ] 移植后遇到的小交互 bug（比如 mobile legend 错位）要修，还是"原样保留缺陷"以示忠实移植？

---

_不同意任何一点直接说，改完再开工。_
