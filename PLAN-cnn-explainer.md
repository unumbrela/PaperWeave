# CNN Explainer 集成计划（方案 B）

> 把 poloclub/cnn-explainer 的主 Overview 可视化 + 文章搬到本站 `/tools/cnn-explainer`，
> 采用方案 B：保留主页完整动画 + 真实 TF.js 推理，跳过 detail-view 展开动画。

---

## 1. 范围

### 保留
- [x] 12 层 CNN 总览图（input → conv×2 → relu×2 → pool → conv×2 → relu×2 → pool → output）
- [x] D3 驱动的节点画布 + 连边 + 图例
- [x] Hover 时边高亮 + 源/目标节点边框提亮（带 transition）
- [x] 10 张预设输入图片切换 → 客户端 TF.js 真实推理 → 重绘所有 feature map
- [x] 自定义图片上传（拖拽/URL）
- [x] 色阶粒度切换（Unit / Module / Global）
- [x] 详情模式（显示每层 tensor shape + 色阶图例）
- [x] 下方教学文章（翻译成中文）

### 不做（方案 B 跳过）
- [ ] 点击 conv 节点展开中间卷积动画（intermediate-draw.js 1700+ 行）
- [ ] 点击 relu/pool 节点的 ActivationAnimator / PoolAnimator
- [ ] 点击 output 的 SoftmaxView 和 Flatten 扇形动画
- [ ] HyperparameterView 滑块交互
- [ ] YouTube 教学视频嵌入（保留文字锚点）

> 若后续要加，属于方案 B+，会单独开 PLAN。

---

## 2. 路由与导航

- 新路由：`/tools/cnn-explainer`
- `TOOLS` 注册表加一项：`{ slug: 'cnn-explainer', category: '学习', icon: '🧠' }`
- 新增分类 `学习`（写作/编程/效率/学习），更新 `CATEGORIES`
- 该页不复用 `ToolShell`（非 AI I/O 工具），用独立 layout + 自定义 hero

---

## 3. 技术栈

| 依赖 | 版本 | 说明 |
|---|---|---|
| `d3` | ^7 | 模块化用法，把原 v5 的 `d3.event` 迁移到 `(event, d) => ...` |
| `@tensorflow/tfjs` | ^4 | 客户端运行 tiny-VGG 推理 |
| `@tensorflow/tfjs-backend-webgl` | ^4 | 默认 WebGL 后端 |

安装：`pnpm add d3 @types/d3 @tensorflow/tfjs`

---

## 4. 资源迁移

从 `reference_repos/cnn-explainer/public/assets/` 复制到 `public/cnn-explainer/assets/`：
- `data/model.json`（~5KB）
- `data/group1-shard1of1.bin`（tiny-VGG 权重，~100KB）
- `img/*.jpeg`（10 张预设图片 + 1 张 white.jpeg）
- `img/plus.svg`（自定义上传占位）

---

## 5. 文件结构

```
app/tools/cnn-explainer/
  page.tsx                    # 页面壳（SSR） + 动态引入客户端组件
  layout.tsx                  # 独立 layout：去掉 tool-shell 的边距约束
components/cnn-explainer/
  CNNExplainer.tsx            # 客户端总容器，组合 hero + overview + article
  Overview.tsx                # 核心 D3 可视化（最大的文件，~500 行）
  ImagePicker.tsx             # 10 图选择 + 上传
  Article.tsx                 # 下方科普文章（中文）
  Hero.tsx                    # 顶部标题条
  Legend.tsx                  # 色阶图例（可独立绘制的话）
  types.ts                    # CNN / Layer / Node 类型
lib/cnn-explainer/
  config.ts                   # overviewConfig：层参数、色阶、间距
  cnn-model.ts                # loadModel + constructCNN（tfjs 推理 + 图数据构建）
  draw-utils.ts               # getExtent / getLinkData / gappedColorScale
  overview-draw.ts            # drawCNN / drawOutput / updateCNN
  image-utils.ts              # getInputImageArray / imageDataTo3DTensor
public/cnn-explainer/assets/
  data/model.json + .bin
  img/*
```

总估算代码量 ~1800 行（其中 `Overview.tsx` + `overview-draw.ts` 占 60%）。

---

## 6. 视觉适配（原站浅色 → 本站 Raycast 深色）

| 元素 | 原 | 改 |
|---|---|---|
| 页面底 | `#fff` | `#0b0b0f` |
| SVG 背景 | `var(--light-gray) #eee` | `transparent`（露出深底） |
| 边初始色 | `rgb(230,230,230)` | `rgb(70,70,80)` + opacity 0.55 |
| 边 hover 色 | `rgb(130,130,130)` | `rgb(200,200,220)` + opacity 1 |
| 节点 bounding border | 浅灰 | `#2c2c3d` → hover `#4b8bff` |
| 层标签文本 | `#444` | `#EDEDF2` / `#9A9AA8` |
| 色阶 | `interpolateRdBu` | 保留（红蓝对深底对比良好） |
| 色阶图例文本 | 黑 | `#9A9AA8` |
| Hero 标题 | `Neucha` 手写体 | 站内 serif（Playfair/Fraunces） |
| 按钮样式 | Bulma | 站内玻璃按钮（现有 `.btn` 系） |

保留原站的**渐变 overlay 淡出**（intermediate view 切换时的柔和遮罩），深底下效果更佳。

---

## 7. D3 代码迁移要点

原站 D3 v5 → 本站 D3 v7：
- `d3.event` 全部改成事件处理器的第一个参数：`(event, d) => ...`
- `.selection.each((d, i, g) => {})` 仍可用，语义一致
- `d3.mouse(this)` 改成 `d3.pointer(event, this)`
- 色阶 chromatic 导入：`d3.interpolateRdBu` → 需 `import {interpolateRdBu} from 'd3-scale-chromatic'`

SVG 根节点挂到 React ref，在 `useEffect` 里初始化（仅一次，依赖空数组），图像切换时调 `updateCNN()`。**不要**在 React render 里动 D3 子树——D3 完全托管 SVG 内部。

---

## 8. 实施顺序

1. **脚手架**：新增路由、registry 项、layout、资源复制、依赖安装
2. **骨架组件**：`CNNExplainer.tsx` + `Hero.tsx` + `ImagePicker.tsx`（静态）
3. **模型加载**：`cnn-model.ts` + `image-utils.ts`，先用 console.log 确认推理 OK
4. **Overview 可视化**：按层画节点 + 画边（静态，不含动画）
5. **交互动画**：hover 高亮、边 transition、image 切换重绘 feature map
6. **色阶切换 + 详情模式**：Unit/Module/Global 切换、详情模式显图例
7. **文章**：翻译关键段落为中文，套站内排版
8. **打磨**：loading 骨架、错误态（模型加载失败）、移动端（提示"请在桌面浏览"或最小可用）
9. **构建验证**：`pnpm build` 无 TS / lint 错

---

## 9. 已知风险与决策

- **TF.js 首次推理耗时**（~1–2s）：加 loading 动画；模型权重小（~100KB）不构成带宽问题
- **SSR 与 TF.js**：客户端组件 + `dynamic(() => import(...), { ssr: false })`
- **d3 bundle size**：只 import 用到的子模块（d3-selection、d3-scale、d3-scale-chromatic、d3-shape、d3-transition、d3-array），不整包引入
- **移动端**：原站就只支持桌面，本站保持一致，<1024px 显示"桌面端查看"提示
- **许可**：原项目 MIT，在页脚标注 "Based on CNN Explainer (Wang et al., 2020)" + 链接

---

## 10. 验收

- [ ] 打开 `/tools/cnn-explainer`，1.5s 内出现可视化
- [ ] 切换任一预设图片，feature map 在 < 1s 内全量刷新
- [ ] Hover 任一节点，入边高亮 + 源节点提亮
- [ ] 色阶切换三档，对应层颜色映射正确变化
- [ ] "Show detail" 开关能显示每层 shape 与色阶图例
- [ ] 上传自定义图片，得到合理分类概率
- [ ] 页面整体视觉与站内其他工具页**不打架**
- [ ] `pnpm build` 无报错
