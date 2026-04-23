# Bruno Simon · folio-2019 移植 · 实施计划

> `reference_repos/bruno-folio-2019/` 是一个完整的 **3D 物理驱动沙盒游戏式作品集**：cannon.js 物理 + Three.js 渲染 + howler 音效 + dat.gui 调参 + 自己的 Zones / Tiles / Areas 分区加载架构（src/javascript/World/ 下 17 个子模块）。整码迁移等于重建项目本身。
>
> **务实选择**：采用 **iframe 嵌入原站 + 顶部 Breadcrumb + 下方中文源码解读** 的交付形态。这既让用户在**本站内**体验到完整原作、又能透过中文解读理解它的架构亮点。

---

## 一、工具注册信息

| 字段 | 值 |
|---|---|
| slug | `bruno-folio` |
| 路由 | `/tools/bruno-folio` |
| name | Bruno Simon · 3D 沙盒作品集 |
| category | 学习 |
| icon | 🚗 |
| gradient | `from-[#f97316] to-[#facc15]` |
| description | Bruno Simon 传奇 3D 沙盒作品集 folio-2019（开车探索）：页面内嵌原站，配中文源码解读，拆解 Zones / Tiles / Areas 三层架构。 |

---

## 二、为什么选 iframe 而不是整码迁移

| 事实 | 含义 |
|---|---|
| `src/javascript/World/` 含 17 个子模块（Area, Areas, Car, Controls, EasterEggs, Floor, Materials, Objects, Physics, Sections, Shadows, Sounds, Tiles, Walls, Zone, Zones） | 逻辑面巨大 |
| cannon.js（弃用仓库，推荐继任 cannon-es）+ 自研刚体适配 + 载具物理 | 物理栈很重 |
| 大量 `.glb` 模型、音频、贴图（`static/` ~数十 MB） | 资源量大 |
| Vite 插件 `vite-plugin-glsl`、`vite-plugin-restart` | 构建链深度耦合 Vite |
| dat.gui 调参界面、howler 空间音效 | 浏览器 UX 层额外依赖 |

**结论**：移植这一整个项目到 Next.js 单路由，工程量 ≈ 重写项目。让用户在本站内 iframe 访问 `https://bruno-simon.com/` 就能看到原作，**中文解读**聚焦在"他是怎么组织代码的"，比"看着像 folio-2019 的小半成品"更有价值。

---

## 三、范围

### ✅ 交付
- **顶部 Breadcrumb**：← 返回 / Team / Year / Project / 跳 GitHub / 跳原站。
- **iframe 主体**：高度 80vh，`src="https://bruno-simon.com/"`，`loading="lazy"`，边框 + 阴影。
- **iframe 上方一小段中文导读**：三行 "你会看到什么 / 怎么玩 / 看不到 3D 时怎么办"。
- **iframe fallback**：若 bruno-simon.com 禁止被 iframe（有 `X-Frame-Options: DENY`），右上角显示"在新标签页打开原站"按钮作为 fallback；预先实测，若真 deny，就直接不嵌 iframe，改放大截图 + 直达按钮。
- **下方中文源码解读 Article** ≈ 1000 字：
  - ① 整体架构：`Application` → `Camera` / `World` / `Resources` / `Passes` 四条线
  - ② `World/Zones` + `World/Areas`：整个地图按坐标分区加载模型，降低首屏成本
  - ③ `World/Tiles`：地上的 "引导虚线" —— 不用 UI 标注而用环境美术做引导，是这个站的灵魂
  - ④ `World/Physics` + cannon：车辆物理的最小可行 demo，没有轮胎打滑细节但足够好玩
  - ⑤ `World/Sounds` + howler：每个 easter egg 都配声音反馈，是"手感"的核心
  - ⑥ `Passes/` 自定义后处理：blur / glows / …
  - ⑦ 值得偷师的决策：不做一张"酷炫但无意义的 hero"，而是把整个作品集变成一个"地点"。

---

## 四、依赖

**无新增依赖**。

---

## 五、文件清单

### 新增
```
app/tools/bruno-folio/
  page.tsx              # server wrapper + metadata
  bruno.css             # 局部样式

components/bruno-folio/
  BrunoPage.tsx         # 外壳：<TopBar/> <IntroBar/> <iframe/> <Article/>
  Article.tsx           # 中文解读
```

### 修改
```
lib/tools-registry.ts
```

---

## 六、iframe 可用性预案

```html
<iframe
  src="https://bruno-simon.com/"
  allow="fullscreen; autoplay; microphone"
  loading="lazy"
  referrerPolicy="no-referrer-when-downgrade"
  sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-popups"
/>
```

实测步骤（实施阶段）：
1. 先挂 iframe，打开页面看是否 `refused to connect` / blank。
2. 若被 block → 改成：**一张大截图 + "原作者站 →" 大号按钮**，解读文章不变。

---

## 七、SSR / 客户端边界

- 整页几乎全是静态 + iframe —— 几乎不需要 `"use client"`。只 `TopBar` 里那个"返回顶部"按钮要客户端，或者直接用 `<a href="#">` 省掉。
- 如果做 fallback 探测（JS 侧监听 `onload` 判断是否 0×0），需要一个客户端组件。**先不做**，按最简实现。

---

## 八、风险与决策

| 风险 | 应对 |
|---|---|
| bruno-simon.com 有 X-Frame-Options DENY | fallback 到"大截图 + 跳转按钮" |
| iframe 加载慢，用户以为页面坏了 | iframe 上叠一个半透明 loading 文案，onLoad 后淡出 |
| 用户期望"完整移植" | PLAN 和页面顶部都**清楚说明这是 iframe + 解读方案**，避免误导 |
| Bruno 官网版本可能是 2019 版或 2025 版 | 最终用 `https://bruno-simon.com/` 根域，他自己会 redirect 到当前版本 |

---

## 九、确认点

- [ ] 可接受 "iframe + 中文解读"？→ **默认接受**，除非用户否决
- [ ] 中文解读长度 ≈ 1000 字
- [ ] 若 iframe 失败，展示什么截图？→ 从 `reference_repos/bruno-folio-2019/readme.md` 看是否有官方截图；没有的话用官网打开后用 Playwright 存一张，最坏用占位卡片
