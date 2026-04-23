# Hamish Williams · Portfolio 移植 · 实施计划

> 从 `reference_repos/hamish-portfolio/`（2k+ stars，Hamish Williams 的个人作品集）中**抽取 Intro 场景**（DisplacementSphere + DecoderText），移植到本站 `/tools/hamish-portfolio`，附中文解读层。
>
> 交付形态：一个占满首屏的 Intro hero —— 背景是受 simplex noise 扰动的 3D 球体（会跟鼠标转动），前景是"假姓名 + 角色"的解码器文字动画；下方中文解读拆 shader 和 decoder 两个亮点。

---

## 一、工具注册信息

| 字段 | 值 |
|---|---|
| slug | `hamish-portfolio` |
| 路由 | `/tools/hamish-portfolio` |
| name | Hamish Portfolio · 位移球体首页 |
| category | 学习 |
| icon | 🪐 |
| gradient | `from-[#0ea5e9] to-[#8b5cf6]` |
| description | 从 HamishMW/portfolio 抽取核心 Intro：MeshPhongMaterial + simplex noise 扰动的位移球体 + 日文假名解码器文字动画，附中文源码解读。 |

---

## 二、范围

### ✅ 保留（原样移植）
- **DisplacementSphere**：`three` + MeshPhongMaterial，通过 `onBeforeCompile` 注入自写的 vertex / fragment GLSL。球体 radius 32、128×128 分段。
- **顶点着色器**：完整 245 行 simplex noise（`snoise`）+ 法线位移（通过 `pnoise_with_normal` 方法），原样保留。
- **片元着色器**：81 行，保留。
- **DecoderText**：日文片假名字符序列，spring-based shuffle 动画。
- **Intro 布局**：左上角 "uppercase name"、主标题 + 一行"职业 + 学科列表（5 秒轮播）"。

### 🔧 改动
- **姓名与学科列表**改成我们自己的 demo 数据（展示用）：
  - name: `"Hamish Williams · Demo Port"`
  - role: `"Designer + Developer"`
  - disciplines: `["Designer", "Developer", "Animator", "Illustrator", "Modder"]`
- **`config.json` / `useTheme`**：原项目有 dark/light 主题 —— 本页固定深色。
- **`Transition` / `useHydrated` / `useReducedMotion`**：简化，直接用 `useEffect` + `useState(false→true)`。
- **Remix `RouterLink`** → Next.js `<a href="#">` / `Link`。
- **Framer Motion useSpring**：保留（已在 HPI 风格下引入，本项目也用了 framer-motion）→ 需装 `framer-motion`（已在项目）。
- **PropTypes / useInViewport / useWindowSize**：自己写精简版 hooks（~30 行）。

### ➕ 新增（解读层）
1. **Breadcrumb**：← 返回 / 项目元数据 / 跳 GitHub `HamishMW/portfolio`。
2. **中文解读 Article**（hero 下方）：
   - ① 为什么不用 ShaderMaterial：保留了 MeshPhong 的光照，又通过 `onBeforeCompile` 注入位移逻辑
   - ② Simplex Noise：4D 噪声 + 时间维度 = 球体表面"流动"
   - ③ pnoise\_with\_normal：同时拿到高度场和法线场，位移后光照不失真
   - ④ spring-based 文字解码：Framer Motion `useSpring` 把整数从 0 → `text.length`，每帧按进度决定"这个字符用真值还是随机片假名"
   - ⑤ 鼠标视差：把鼠标 x/y 归一化后喂给 sphere.rotation.x/y（spring 平滑）

---

## 三、依赖

```json
{
  "dependencies": {
    "framer-motion": "^11.0.0"  // 若已通过其他工具装过，复用；否则新增
  }
}
```

`three` 已在 HPI Potsdam 时装好；无需再动。

---

## 四、文件清单

### 新增
```
app/tools/hamish-portfolio/
  page.tsx                      # server wrapper
  hamish.css                    # 局部样式（暗色底、intro 布局、decoder 样式）

components/hamish-portfolio/
  HamishPage.tsx                # 客户端外壳
  DisplacementSphere.tsx        # 对应原 displacement-sphere.jsx（Next.js 化）
  DecoderText.tsx               # 对应原 decoder-text.jsx
  Intro.tsx                     # 对应原 intro.jsx（Hero 布局）
  TopBar.tsx                    # Breadcrumb
  Article.tsx                   # 中文解读
  shaders.ts                    # 两个 .glsl 的内容作为字符串常量导出
```

### 修改
```
lib/tools-registry.ts   # 注册
package.json            # 若还没有 framer-motion，加上
```

---

## 五、Shader 处理策略

原项目用 Vite 的 `?raw` import：
```js
import fragmentShader from './displacement-sphere-fragment.glsl?raw';
```

Next.js webpack 里能做，但要加 loader 配置。**我们选最省事的：把 GLSL 内容直接粘到 `shaders.ts` 做字符串常量导出**。

```ts
// components/hamish-portfolio/shaders.ts
export const VERTEX_SHADER = /* glsl */ `
  // ... 245 行原文
`;
export const FRAGMENT_SHADER = /* glsl */ `
  // ... 81 行原文
`;
```

---

## 六、SSR / 客户端边界

- `page.tsx`：server component，`import "./hamish.css"`。
- `HamishPage.tsx` / `DisplacementSphere.tsx` / `DecoderText.tsx` / `Intro.tsx`：`"use client"`。
- `TopBar.tsx` / `Article.tsx`：server component。

---

## 七、风险与决策

| 风险 | 应对 |
|---|---|
| 原项目 Transition 组件很花哨 | 简化：只用 `status = 'entered'` 走完即可 |
| useTheme 决定光照强度 | 固定 `theme = 'dark'`，省去主题切换 |
| 原 CSS 用了大量 `var(--textLight)` 等设计 tokens | 在 `hamish.css` 里定义一套局部变量（或用内联十六进制） |
| `onBeforeCompile` hook 在 three r160+ 有变化 | 项目已用 three 0.180，实测即可（原项目用的是 three 0.161）|

---

## 八、确认点

- [ ] 保留完整 5 学科轮播，还是减到 3 个？→ **保留 5 个**
- [ ] 中文解读 ≈ 500 字
- [ ] 是否需要把下面的 "Projects" 区也一起搬？→ **不搬，只做 Intro**（Projects 区涉及图像资源、大量 CSS 和文案，价值不对等）
