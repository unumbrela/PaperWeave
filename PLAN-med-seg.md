# FWMamba 医学图像分割 · 端到端可视化 — 实施计划

> 目标：为 `reference_repos/ICIC_Mamba-UNet/` 里那套 **FWMamba-UNet**（频率-小波增强的 Mamba U-Net，在 ISIC 2018 皮肤病变数据集上做二分类分割）做一个交互式、端到端的可视化工具，风格对标刚做的 CNN Explainer，但容纳更复杂的 U-Net + Mamba + 频率分支。
>
> 路由：`/tools/med-seg-explainer`（中文标题：**医学图像分割 · 可视化**）
>
> 分类：学习 · 工具

---

## 一、关键决策

### 为什么不能浏览器端推理

- FWMamba-UNet 参数量 **30.21M**；包含 `SS2D`（Mamba 选择性扫描）算子，**没有成熟的 ONNX/TF.js 移植**；
- 输入是 256×256×3，输出是 256×256；就算量化也超 50MB；
- **CNN Explainer 那套"浏览器里跑 tiny-VGG"的路线在这里走不通**。

### 取舍：预计算 + 交互展示

- 写一个 **一次性 Python 导出脚本**，对 8 张精选 ISIC 验证集样本跑一次 forward；
- 用 `forward_pre_hook` / `forward_hook` 收集每个阶段的中间张量；
- 在 Python 侧把张量烘焙成 **PNG 缩略图**（用 matplotlib 的 cmap 直接上色，前端不再做归一化）；
- 再导出一个 **`manifest.json`**，记录每张样本每个阶段的资源 URL + 标量（α、β、Dice/IoU）；
- 前端只是 **纯静态渲染 + 交互动画**，不依赖运行时推理。

这样的好处：
1. 保留真实模型的真实激活（而不是训练一个 toy 模型骗人）；
2. 部署足够简单（Next.js 静态资源，~1-3 MB 总体积）；
3. 性能稳定，不会因为 TF.js 冷启动卡死。

### 视觉主题

- 沿用现在的 **paper / ink 暖色主题**（`--paper: #f4efe6`, `--ink: #1a1713`）；
- 激活图色标：`interpolateRdBu`（发散，负蓝正红）；
- DWT 频带：`interpolateGreys`（LL 深，高频带浅）；
- 边缘注意力：`interpolateOranges`（暖色，贴合主题）；
- GT/预测对比：ink 轮廓 + 半透明金黄填充。

---

## 二、要展示的内容（从 FWMamba 架构拆出来）

FWMamba-UNet 处理 ISIC 的全流程（256×256×3 → 256×256×1 binary mask）：

```
输入 256×256×3
  ├─ Patch Embed (stride 4) → 64×64×96
  ├─ Encoder Stage 1 [FWVSSBlock×2, dim=96]  →  skip[0]  →  PatchMerging → 32×32×192
  ├─ Encoder Stage 2 [FWVSSBlock×2, dim=192] →  skip[1]  →  PatchMerging → 16×16×384
  ├─ Encoder Stage 3 [FWVSSBlock×9, dim=384] →  skip[2]  →  PatchMerging → 8×8×768
  ├─ Encoder Stage 4 (Bottleneck) [FWVSSBlock×2, dim=768]
  ├─ Decoder Stage 1 (= 瓶颈输出)
  ├─ Decoder Stage 2: PatchExpand → 16×16×384, EAFFSkip(skip[2])
  ├─ Decoder Stage 3: PatchExpand → 32×32×192, EAFFSkip(skip[1])
  ├─ Decoder Stage 4: PatchExpand → 64×64×96,  EAFFSkip(skip[0])
  └─ Final PatchExpand ×4 + 1×1 Conv → 256×256×1 (logit) → sigmoid → threshold
```

每个 `FWVSSBlock` 内部：

```
x (B, H, W, C)
 ├── 分支 A  ┐
 │   LayerNorm → SS2D (Mamba) → f_mamba
 │
 ├── 分支 B  ┐
 │   permute → DWT → {LL, LH, HL, HH}
 │   高频 {LH,HL,HH} += depthwise_conv(.)
 │   MLP(GAP(x)) → [α_low, α_high]
 │   IDWT(α_low·LL, α_high·LH, α_high·HL, α_high·HH) → f_freq
 │
 └─ 融合：out = x + DropPath(f_mamba + β · f_freq)   (β 可学习，初值 0.1)
```

`EAFFSkip(enc, dec)`：

```
enc (B, H, W, C)
 └─ DWT → {LL, LH, HL, HH}
    边缘门：1×1 Conv(cat[LH,HL,HH]) → BN → Sigmoid → edge_attn (B, C, H/2, W/2)
    双线性上采样到 (H, W)
    输出：dec + enc + edge_attn · enc
```

### 可视化面板规划

| 面板 | 内容 | 难度 |
|---|---|---|
| **架构总览** | 横向 SVG，12 个节点（Patch Embed + 4 Enc + Bottleneck + 3 Dec + Final + Output），hover 高亮 | 中 |
| **阶段激活网格** | 选中阶段的 8-16 个代表通道，每个一张小热力图 | 低（全是静态 PNG） |
| **FW-Block 剖面** | 选中阶段的代表 block：spatial 分支 vs freq 分支 vs 融合输出，显示学到的 β | 中 |
| **DWT 四宫格** | 输入图 / 某阶段特征的 {LL, LH, HL, HH} 四频带 | 低 |
| **EAFF-Skip 分解** | encoder feat + decoder feat + edge attention + fused，共 4 张图 | 低 |
| **预测对比** | 原图、GT mask、FWMamba 预测、VM-UNet baseline 预测、attention overlay；Dice/IoU 数值 | 低 |
| **文章** | 中文讲解：为什么 Mamba 有低频偏差、DWT 怎么补、EAFFSkip 怎么帮边界 | 低 |

---

## 三、Python 导出脚本（新增）

### 新文件：`reference_repos/ICIC_Mamba-UNet/VM-UNet/scripts/export_viz.py`

职责：
1. 加载 FWMamba 权重（从 `results/ablation_E_*/checkpoints/best-*.pth`）
2. 加载 VM-UNet baseline 权重（从 `best-ckpt/best-vmunet-isic18.pth`）
3. 对每张精选样本跑一次 forward，注册 hooks 收集：
   - 所有 `FWVSSLayer` 的输入和输出（每个 stage 一对）
   - 选中一个代表 `FWVSSBlock`（每个 stage 的第一个）的内部：`f_mamba`, `f_freq`, `β`（可学习参数）
   - 所有 `FreqWaveletBranch` 的 DWT 输出 `{LL, LH, HL, HH}` 和学到的 `[α_low, α_high]`
   - 所有 3 个 `EAFFSkip` 的：`enc_feat`, `dec_feat`, `edge_attn`, `fused`
   - 最终 logits、sigmoid、阈值化后的 mask
4. 把每个张量降采样到 ≤ 64×64（或原尺寸，如果 ≤ 64），用 `matplotlib` 的 cmap 烘焙成 PNG 存盘
5. 算每张样本的 Dice 和 IoU
6. 写 `manifest.json`

### 输出目录结构

```
public/med-seg/
  manifest.json
  samples/
    ISIC_0012086/
      input.png
      gt.png
      fwmamba_pred.png
      vmunet_pred.png
      overlay.png                  # FWMamba attention overlay（直接取 results/outputs/*.png 或重新渲）
      stages/
        enc1_out_ch00.png ... ch15.png
        enc2_out_ch00.png ...
        ...
        dec4_out_ch15.png
      fw_blocks/
        enc1_b0_mamba.png
        enc1_b0_freq.png
        enc1_b0_fused.png
      dwt/
        enc1_b0_ll.png
        enc1_b0_lh.png
        enc1_b0_hl.png
        enc1_b0_hh.png
      eaff/
        skip_top_enc.png  skip_top_dec.png  skip_top_edge.png  skip_top_fused.png
        skip_mid_*.png
        skip_low_*.png
    ISIC_0012292/
      ...
    （共 8 张样本）
```

### `manifest.json` schema（示意）

```json
{
  "classLabel": "皮肤病变（二分类）",
  "inputSize": [256, 256],
  "samples": [
    {
      "id": "ISIC_0012086",
      "dice_fwmamba": 0.912,
      "iou_fwmamba": 0.838,
      "dice_vmunet": 0.887,
      "iou_vmunet": 0.800,
      "input": "samples/ISIC_0012086/input.png",
      "gt": "samples/ISIC_0012086/gt.png",
      "fwmambaPred": "samples/ISIC_0012086/fwmamba_pred.png",
      "vmunetPred": "samples/ISIC_0012086/vmunet_pred.png",
      "overlay": "samples/ISIC_0012086/overlay.png",
      "stages": [
        { "id": "enc1", "label": "Encoder 1", "shape": [64, 64, 96], "channels": [".../enc1_out_ch00.png", ...] },
        ...
      ],
      "fwBlocks": [
        { "stageId": "enc1", "beta": 0.11, "alphaLow": 0.58, "alphaHigh": 0.42,
          "mamba": ".../enc1_b0_mamba.png", "freq": ".../enc1_b0_freq.png", "fused": ".../enc1_b0_fused.png",
          "dwt": { "ll": "...", "lh": "...", "hl": "...", "hh": "..." } },
        ...
      ],
      "eaff": [
        { "level": "top", "enc": "...", "dec": "...", "edge": "...", "fused": "..." },
        ...
      ]
    },
    ...
  ]
}
```

### 关键实现要点

- 用 `torch.no_grad()`；模型 `.eval()`；
- hooks 收集时**要 detach + cpu**，避免显存爆；
- Mamba 分支输出在 `FWVSSBlock.forward` 里拆不到单独张量，所以**要 monkey-patch** 一个 `_last_fmamba` / `_last_ffreq` 属性，或改成一次性 hook `FWVSSBlock` 的两个子模块 `self_attention` 和 `freq_branch`；
- 通道选择策略：按 **激活能量（L2 范数）排序取前 8 个**，避免随机挑到死通道；
- 颜色归一化：每张热力图用该通道的 `[-max, +max]` 对称归一化（和 CNN Explainer "Unit" 色阶级别一致），保证正负对比清晰；
- α / β 参数从 `state_dict` 直接读；`freq_weight_mlp` 需要实际 forward 才能拿到 batch-wise 的 `[α_low, α_high]`；
- 注意 ISIC val 的 mask 值范围和归一化（参考 `datasets/isic_datasets.py`）；
- 脚本参数：`--num-samples 8 --output-dir /home/zihao/code/web/public/med-seg`；CPU 可跑但慢，建议 GPU。

### 选择样本的策略

- 从 `results/ablation_E_*/outputs/*.png` 里**挑出 FWMamba 和 VM-UNet 预测差异最大的 4 张**（FWMamba 表现显著更好的，用来证明"频率增强有效"）；
- 再挑 4 张"简单样本"（边界清晰的）做参照；
- 样本 index 硬编码进脚本。

---

## 四、前端结构

### 路由
- `app/tools/med-seg-explainer/page.tsx` — 入口（Server Component，直接渲染已标 `"use client"` 的容器）

### 组件（`components/med-seg/`）

```
MedSegExplainer.tsx       // 容器 + 全局状态
Hero.tsx                  // 页面头部：标题 + 副标题 + 返回
SampleGallery.tsx         // 8 张缩略图横排
ModelToggle.tsx           // VM-UNet / FWMamba / Both 切换
ArchitectureMap.tsx       // SVG 架构总览（12 节点 + 连线 + 选中高亮）
StageActivations.tsx      // 当前 stage 的通道网格
FWBlockDetail.tsx         // FW-Block 剖面：Mamba 分支 | Freq 分支 | Fused + β 数值
DWTPanel.tsx              // LL/LH/HL/HH 四宫格 + α_low/α_high 可视化条
EAFFSkipPanel.tsx         // Encoder + Decoder + EdgeAttn + Fused
PredictionCompare.tsx     // 原图 + GT + FWMamba pred + VM-UNet pred + 指标
Article.tsx               // 中文说明文章
```

### 工具库（`lib/med-seg/`）

```
types.ts                  // Manifest / Sample / Stage / FWBlock / EAFF 类型
manifest.ts               // 顶层 useManifest() hook
```

### 状态设计

```
selectedSampleId: string                       // 默认 manifest.samples[0].id
selectedStageId: 'enc1' | ... | 'dec4'          // 默认 'enc1'
modelView: 'fwmamba' | 'vmunet' | 'both'       // 默认 'fwmamba'
detailPanel: 'activations' | 'fwblock' | 'dwt' | 'eaff'  // 由 stage 决定默认值
```

---

## 五、分阶段交付（MVP → 完整）

### Phase 1 · MVP（不依赖 Python 导出，仅用已有 results）
- 注册表新增 `med-seg-explainer`；导航卡片
- 页面骨架：Hero + Article + SampleGallery
- SampleGallery 直接用 `results/ablation_E_*/outputs/*.png`（每张里已含 input+GT+pred+attention 的拼图）；
- PredictionCompare 只展示这张拼图 + 显示指标的数值（从训练 log 读/硬编码）
- **可立即上线**，无需 Python 运行

### Phase 2 · Python 导出脚本 + 架构总览
- 写 `export_viz.py`，用户跑一次
- 写 ArchitectureMap（SVG）、StageActivations
- 读 `public/med-seg/manifest.json`

### Phase 3 · FW-Block / DWT / EAFF 深度面板
- FWBlockDetail + DWTPanel + EAFFSkipPanel
- 架构图上更多交互细节（连线动画、stage label tooltip）

### Phase 4 · 视觉打磨
- 色阶图例、α/β 数值的可视化条、响应式（桌面 ≥1280 为主）
- 构建/lint 通过，dev 冒烟

---

## 六、实施顺序（任务列表）

1. **注册表 & 导航**：`lib/tools-registry.ts` + `components/tool-card.tsx` 新增条目
2. **页面骨架**：`app/tools/med-seg-explainer/page.tsx` + Hero + Article + 返回链接
3. **Phase 1 MVP**：SampleGallery 读取 8 张 `results/outputs/*.png`（先拷贝到 `public/med-seg/legacy/`），PredictionCompare 展示它们
4. **写 Python 导出脚本** `scripts/export_viz.py`（即使用户当前跑不动也先交付代码）
5. **前端：manifest 类型 + useManifest hook**
6. **ArchitectureMap**（SVG）
7. **StageActivations**（通道网格）
8. **FWBlockDetail + DWTPanel + EAFFSkipPanel**
9. **PredictionCompare 升级**（替换 MVP 版，加入 FWMamba vs VM-UNet 并排对比）
10. **构建验证 + lint + dev 冒烟**

---

## 七、风险 & 兜底

| 风险 | 兜底 |
|---|---|
| 用户环境跑不动 Python 脚本（timm/CUDA 问题） | Phase 1 MVP 已经能上线；后续面板留"数据缺失"占位提示 |
| `manifest.json` 和前端 schema 漂移 | 前端只消费 manifest 里显式声明的字段；ts 类型+文档是唯一契约 |
| Mamba 分支输出抓不到（SS2D 内部）| Monkey-patch `FWVSSBlock.forward` 暂存中间结果；或改在 `self_attention` 出口 hook |
| 静态资源过大（8 样本 × 大量 PNG） | 每张缩略图 64×64 PNG ≤ 5KB；总量目标 < 3 MB |
| ISIC 数据集路径用户机器不一致 | 脚本参数 `--dataset-dir`，默认相对路径 + 容错 |

---

## 八、不做 / 暂缓

- **浏览器端推理**（TF.js/ONNX runtime）——不可行，见"关键决策"
- **用户上传自定义图** —— 无法在线推理，没意义
- **3D 可视化 / Synapse / ACDC** —— 超出本次范围，聚焦 ISIC 2018 一个数据集
- **移动端优化** —— 桌面为主，< 1024 显示"Best on desktop"提示即可
- **α / β 滑块拖拽看变化** —— 需要在线推理，暂缓
- **实时对比动画**（像 CNN Explainer 的连线亮起）—— 架构图级别做 hover 高亮即可，不做数据流动画
