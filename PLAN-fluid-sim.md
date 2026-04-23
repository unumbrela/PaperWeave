# Pavel Dobryakov · WebGL Fluid Simulation 移植 · 实施计划

> 把 `reference_repos/pavel-fluid/`（16k+ stars 的经典交互流体）的核心运行时**原样嵌入**到本站 `/tools/fluid-sim`，并附中文解读层。
>
> 交付形态：一个占满首屏的全局 canvas，鼠标拖动喷射彩色流体；下方是中文解读文章，讲 Navier–Stokes → 分步 shader → framebuffer ping-pong 这条线。

---

## 一、工具注册信息

| 字段 | 值 |
|---|---|
| slug | `fluid-sim` |
| 路由 | `/tools/fluid-sim` |
| name | 流体模拟 · Fluid Simulation |
| category | 学习 |
| icon | 🌊 |
| gradient | `from-[#ff4f8b] to-[#4bb3ff]` |
| description | 原样移植 Pavel Dobryakov 的 16k-star 经典：GPU Navier–Stokes 流体，鼠标拖出彩色液体，附 Bloom / Sunrays 后处理；附中文源码解读。 |

---

## 二、范围

### ✅ 保留
- `script.js` 1645 行全部运行时（GL context 创建、shader compile、双缓冲 framebuffer、Navier–Stokes 6 步管线、Bloom、Sunrays、pointer 事件处理、splat / splat random / splat pointer）。
- 原默认 config（`SIM_RESOLUTION`, `DYE_RESOLUTION`, `DENSITY_DISSIPATION`, `VELOCITY_DISSIPATION`, `CURL`, `SPLAT_RADIUS`, `BLOOM`, `SUNRAYS` …）。

### 🔧 改动
- 去掉 `dat.gui`（页面上不放控制面板，默认参数已经很好看）。
- 去掉原 `index.html` 里的 app badge / Google Play 推广 banner / 微信图标字体。
- 全局 `html, body { overflow: hidden }` → 改成作用于**本路由 root 容器**，不污染全站。
- `script.js` 用的 `var canvas = document.getElementsByTagName('canvas')[0]` → 改成 `useRef` 传引用。
- `window.requestAnimationFrame` 卸载时要 cancel（原 demo 没卸载逻辑，SPA 切路由会内存泄漏）。

### ➕ 新增（解读层）
1. **顶部 Breadcrumb**（复用 HPI Potsdam 风格）：← 返回 / 项目元数据 / 跳 GitHub。
2. **Hero 覆盖层**：canvas 上层叠一段半透明文案："拖动鼠标 / 触摸 — 看 Navier–Stokes 在 GPU 上实时求解"。
3. **中文解读 Article**（位于 canvas 下方，滚动即可到达）：
   - ① 什么是流体模拟：ρ∂u/∂t = −(u·∇)u − ∇p + ν∇²u + f
   - ② 为什么在 GPU 上做：每一个像素对应一个网格点，fragment shader 并行
   - ③ 管线六步：Advection → Divergence → Curl → Vorticity → Pressure (Jacobi 20 迭代) → GradientSubtract
   - ④ 双缓冲 framebuffer "ping-pong"：不能自读自写，所以 A→B、B→A 交替
   - ⑤ Bloom / Sunrays 后处理让颜色"发光"
   - ⑥ splatPointer：鼠标拖动距离 → 一个高斯核的"力"和"染料"

---

## 三、依赖

**无新增依赖**。原项目只用了原生 WebGL 2 + `dat.gui`（我们移除）。

---

## 四、文件清单

### 新增
```
app/tools/fluid-sim/
  page.tsx              # server wrapper + metadata + 局部 CSS
  fluid.css             # 局部样式（canvas 全屏、topbar、article）

components/fluid-sim/
  FluidPage.tsx         # 客户端外壳：<TopBar/> <FluidCanvas/> <Article/>
  FluidCanvas.tsx       # "use client"，把 script.js 的逻辑 useEffect 化
  Article.tsx           # 中文解读文章（纯静态）
```

### 修改
```
lib/tools-registry.ts   # 注册
```

---

## 五、移植核心：script.js → FluidCanvas.tsx 的做法

**最小改动原则**：不拆 1645 行 JS，整体包进一个 `useEffect`，GL context 绑 canvas ref，rAF 在 cleanup 里 cancel。

```tsx
useEffect(() => {
  if (!canvasRef.current) return;
  const canvas = canvasRef.current;
  // ... 粘贴 script.js（去掉 dat.gui 相关），全部变成闭包局部变量
  let rafId: number;
  function update () { ...; rafId = requestAnimationFrame(update); }
  update();
  return () => { cancelAnimationFrame(rafId); /* 清理事件 */ };
}, []);
```

TypeScript 处理：
- `script.js` 里很多隐式 any，目标是能编译就行 —— 把 `FluidCanvas.tsx` 第一行加 `// @ts-nocheck` 覆盖这整个文件，保留类型安全在组件边界。
- 或者：把它改成 `.js` 文件 + 一个 `.d.ts`，但太啰嗦，`@ts-nocheck` 更务实。

---

## 六、SSR / 客户端边界

- `page.tsx`：server component，`import "./fluid.css"`，`<FluidPage />`。
- `FluidCanvas.tsx`：`"use client"`，用 `useRef` / `useEffect` / WebGL。
- `TopBar.tsx` / `Article.tsx`：server component（纯静态）。
- 不支持 WebGL 2 的浏览器：script.js 原生有回退到 WebGL 1 的逻辑，保留。

---

## 七、风险与决策

| 风险 | 应对 |
|---|---|
| `@ts-nocheck` 覆盖一大片代码 | 接受，边界在 `FluidCanvas.tsx` 内部，不外泄 |
| 全屏 canvas 挡住我们的顶部 Header | 顶部 Breadcrumb 用 `position: sticky` + 高 z-index，canvas 用 fixed 铺满 viewport |
| 首次切到此路由立刻跑 WebGL，可能卡 | 默认不懒加载 —— 本来就是这个工具的主体；lighthouse 分数可以牺牲 |

---

## 八、确认点

- [ ] 默认参数用原版（偏鲜艳、Bloom 开），还是调到更克制？→ **默认用原版**
- [ ] 是否保留 GUI 控制面板？→ **不保留**
- [ ] 中文解读的长度 ≈ 600 字，按六步拆段 + 一段结语
