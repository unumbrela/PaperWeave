/**
 * 「结构撰写」内置端到端示例。
 *
 * 仿 `lib/figure/drawio-example.ts`：给一组真实输入 + 一段**预生成**的脚手架产出，
 * 让用户「点一下就看到好的产出长什么样」。输入字段的取值与 `app/tools/paper-writer/page.tsx`
 * 的选项词表一致（venueType / sections / language），页面据此一键回填并用 recap 还原展示。
 *
 * 主题沿用站内占位例「基于 Mamba 的轻量医学图像小样本分割」，覆盖六个阶段，方便对照方法论面板。
 */

export const PAPER_WRITER_EXAMPLE = {
  topic: "基于 Mamba 的轻量医学图像小样本分割",
  innovation:
    "1) 用线性复杂度的状态空间模型(Mamba)替代自注意力，在长序列医学体数据上降低显存与算力；2) 设计跨切片方向扫描，让 1D 选择性扫描捕获 3D 解剖连续性；3) 小样本 episodic 训练 + 原型对齐，5-shot 即可迁移到未见器官。",
  references:
    "SAM / MedSAM（大模型分割，需大量标注）、UNETR / Swin-UNETR（Transformer 分割，显存高）、PA-Net / SSL-ALPNet（医学小样本分割原型方法）、Vision Mamba / U-Mamba（Mamba 用于视觉与分割的近作）",
  venueType: "会议论文（CVPR/NeurIPS/ACL 等）",
  sections: ["intro", "related", "method", "experiments"],
  audience: "CV / 医学影像方向审稿人，关注效率与标注成本",
  language: "zh-en",

  /** 预生成的 Markdown 脚手架产出（仅骨架与表述建议，不含成段正文）。 */
  output: `## 一、一句话故事线 + 贡献

**故事线**：医学体数据标注极贵且器官千变万化 → 现有 Transformer 分割要么吃显存、要么依赖大量标注 → 我们用线性复杂度的 Mamba + 跨切片扫描，在 5-shot 下迁移到未见器官 → 在三个数据集上以 1/4 显存逼近全监督 SOTA。

**一句话贡献**（平行书写、与实验一一对应）：
- 提出跨切片方向扫描，使 1D 选择性扫描捕获 3D 解剖连续性 —— 收益：mIoU↑ 而算力线性。
- 设计 episodic 原型对齐，5-shot 迁移到未见器官 —— 收益：免去逐器官重训。
- 在 BCV / CHAOS / 自建集上以约 1/4 显存达到全监督 95% 性能 —— 收益：可上消费级显卡。

> 指引：摘要先写本段「故事线」的五句压缩版，末句放最强数字；勿在摘要出现未定义缩写。

## 二、章节大纲（会议论文体例）

- **Introduction** — 让审稿人相信「小样本 + 低显存医学分割」值得做，并自然导出 Mamba 方案。
- **Related Work** — 定位本文于「大模型分割 / Transformer 分割 / 医学小样本 / 视觉 Mamba」四条线之间。
- **Method** — 先总览数据流，再分模块讲跨切片扫描与原型对齐，强调每个设计的必要性。
- **Experiments** — 用每个表/图回答一个问题：主结果、消融、效率、可视化。
- **Conclusion** — 收束贡献，诚实交代局限与未来方向。

## 三、逐节要点 + 段落脚手架

### Introduction（四段式故事线）
- **本节要点**：重要性 → 现有局限 → 洞察+方法 → 贡献+结果。
- **段落脚手架**
  1. *主题句意图*：点明医学体数据标注昂贵、器官多样，分割需求迫切。*应含*：现实成本、临床价值，一两句收窄到「小样本 + 体数据」。*过渡*：自然引到「现有方法够用吗」。
     - EN topic sentence 模板：\`Accurate segmentation of volumetric medical images is critical for X, yet dense annotation remains prohibitively expensive.\`
  2. *主题句意图*：指出现有两条路线的共同缺口。*应含*：大模型分割吃标注、Transformer 分割吃显存；二者都难在低标注体数据上。*过渡*：用 *However* 引出缺口。
     - 建议连接词：\`However\` / \`In contrast\`。
  3. *主题句意图*：抛出核心洞察并据此给方法。*应含*：线性复杂度选择性扫描可廉价建模长序列；跨切片扫描注入 3D 连续性。*过渡*：用 *To this end* 接出方法。
     - EN topic sentence 模板：\`To this end, we propose …, which …\`
  4. *主题句意图*：列贡献 + 一句结果。*应含*：3 条平行贡献 + 「1/4 显存达 95% 性能」。*过渡*：收束到论文组织。

### Method（先动机后细节）
- **本节要点**：总览 → 跨切片扫描 → 原型对齐 → 训练目标。
- **段落脚手架**
  1. *主题句意图*：一段讲清整体数据流与设计动机。*应含*：输入→编码(Mamba)→跨切片扫描→原型匹配→输出；指引配一张 overview 图说明「数据如何流动」。*过渡*：「下面分别展开」。
  2. *主题句意图*：解释为何需要跨切片扫描（先必要性）。*应含*：1D 扫描丢失层间连续性的问题，方向扫描如何补上；符号定义统一。*过渡*：*Building on this*。
     - 建议连接词：\`Specifically\` / \`Building on this\`。

> 边界提醒：以上只给主题句意图与英文模板骨架，**请勿**让我替你写出成段连贯正文。

## 四、Related Work 分组

- **大模型分割（SAM / MedSAM）** — 共性：强泛化但依赖海量标注/提示。与本工作关系：*对比* —— 我们走免重标注的小样本路线。
- **Transformer 分割（UNETR / Swin-UNETR）** — 共性：长程建模强但显存随分辨率二次增长。关系：*补足* —— 用线性复杂度替代自注意力。
- **医学小样本分割（PA-Net / SSL-ALPNet）** — 共性：原型 + episodic 训练。关系：*继承并改进* —— 引入 3D 连续性建模。
- **视觉 Mamba（Vision Mamba / U-Mamba）** — 共性：将选择性扫描引入视觉。关系：*区分* —— 首次面向小样本体数据并设计跨切片扫描。*需补充该组最新代表工作核验引用。*

## 五、英语科技写作 · 句式与病句提醒

- **主题句先行**：每段首句即结论，例 \`Our cross-slice scan captures 3D continuity at linear cost.\`
- **已知→新**：句尾新信息接下句句首，例 \`… yields a prototype. This prototype then guides …\`
- **平行贡献**：三条贡献统一为 “We + 动词 + 收益” 句式。
- **简洁**：删 \`due to the fact that\`→\`because\`、\`in order to\`→\`to\`。
- **限定**：未充分验证处用 \`may / suggest\`，主结果用肯定语气并附数字。

## 六、投稿前自查清单（会议论文）

1. 摘要末句是否给出最强量化结论且无未定义缩写？
2. Introduction 的 motivation 是否自然导出方法？贡献是否与实验一一对应、不夸大？
3. Related Work 是否覆盖关键近作并清楚区分最接近的工作？
4. Method 每个组件是否都讲清了「为什么需要」，符号是否统一、可复现？
5. 实验对比是否公平（同 backbone/同标注预算）？消融是否支撑每条贡献？
6. 每个图/表是否只回答一个问题且被正文引用解读？
7. 结论是否诚实交代局限，且与正文一致？
8. 全文术语/缩写首次出现是否定义、是否前后一致？`,
} as const;
