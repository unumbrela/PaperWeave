/**
 * 内置示例 ——「扩散模型在 3D 点云生成上的可控性」。
 *
 * 用途：未配 key 的访客点「载入示例」即可离线走通 诊断→设计→收敛 全流程，
 * 无门槛看到象限图 + 评分卡片的最终效果。也作为有 key 时的输入预填。
 */

import type { Diagnosis, IdeaSet } from "./types";

export const EXAMPLE_INPUT = {
  direction: "扩散模型在 3D 点云生成上的可控性",
  references:
    "Point-E (Nichol et al., 2022): 文本到 3D 点云的两阶段扩散，先生成单视图图像再升维到点云，速度快但几何粗糙、缺乏细粒度可控。",
  baseline: "Point-E",
  resources: "单卡 4090，2 周，公开数据集 ShapeNet",
} as const;

/** 推荐勾选的透镜（与下方 ideas 对应）。 */
export const EXAMPLE_LENS_IDS = ["swap", "relax"] as const;

export const EXAMPLE_DIAGNOSIS: Diagnosis = {
  grounded: true,
  contributions: [
    "用「文本→单视图图像→点云」两阶段扩散，把昂贵的文本到 3D 拆成可控的子问题，推理只需约一分钟",
    "证明了在大规模图文与图-点云配对数据上预训练可迁移出可用的 3D 生成先验",
  ],
  assumptions: [
    { id: "a1", text: "单张参考视图足以约束完整 3D 几何（隐含「视图即条件」）" },
    { id: "a2", text: "点云的每个点独立去噪，不显式建模局部部件结构" },
  ],
  gaps: [
    { id: "g1", text: "文本与点云之间对齐弱，复杂指令难以精确落到几何上", tag: "可控性" },
    { id: "g2", text: "缺乏部件级 / 局部区域的可控编辑能力", tag: "可控性" },
    { id: "g3", text: "几何保真度偏低，表面噪声明显、细节缺失", tag: "保真度" },
    { id: "g4", text: "采样步数多，难以做到交互式实时生成", tag: "效率" },
  ],
};

export const EXAMPLE_IDEASET: IdeaSet = {
  priority:
    "先做 Idea 1：它复用成熟的 ControlNet 式条件注入范式，工程风险最低，又直接命中「部件级可控」这一最痛的空白，2 周内能在 ShapeNet 子集上跑出可量化对比。",
  ideas: [
    {
      id: "idea-1",
      title: "部件感知的 ControlNet 式条件注入，实现部件级可控生成",
      motivation:
        "Point-E 把点独立去噪、只靠全局文本/图像条件，导致「把椅子的扶手加长」这类局部指令无处落地。需要一种能在生成中途按部件区域注入条件的机制。",
      hypothesis:
        "我假设：为点云扩散加一个旁路的部件条件分支（仿 ControlNet），用部件分割掩码 + 局部文本作为条件，能显著提升局部编辑的精确度，因为条件信号被显式绑定到几何区域而非全局平均。",
      experiment:
        "在 ShapeNet 椅子/桌子子集（带部件标注）上，冻结一个小型点云扩散主干，只训练旁路分支。对比指标：部件级编辑成功率 + 全局 Chamfer Distance 不退化；规模约 3 类、各 2k 样本即可初步证伪。",
      resources: "单卡 4090 训旁路分支约 3–5 天，主干用公开预训练权重，落在预算内。",
      risk: "部件分割标注质量是瓶颈；若掩码噪声大，条件分支可能学不到对齐——先用合成掩码做消融验证可行性。",
      novelty: 4,
      feasibility: 5,
      lens: "机制替换",
    },
    {
      id: "idea-2",
      title: "潜空间一致性蒸馏，把采样压到个位数步以支持交互",
      motivation:
        "多步采样让「改一句话即时看到结果」的交互式工作流不可能。效率是可控性落地的隐性前提。",
      hypothesis:
        "我假设：对点云扩散做潜空间一致性蒸馏（consistency distillation），能把采样步数从数十步降到 4–8 步且质量损失可接受，因为点云的低频几何对步数不如图像敏感。",
      experiment:
        "蒸馏出 4 步 / 8 步学生模型，对比教师在 Chamfer / F-score 上的退化与单次生成耗时；ShapeNet 单类即可看出趋势。",
      resources: "蒸馏训练单卡 4090 约 4–6 天，推理提速立竿见影。",
      risk: "步数过低时高频细节崩坏；需配几何正则项兜底，否则可行性下降。",
      novelty: 3,
      feasibility: 4,
      lens: "约束松弛",
    },
    {
      id: "idea-3",
      title: "引入 SDF 几何监督，提升表面保真度",
      motivation:
        "逐点独立去噪不保证表面连续，结果常有噪点与孔洞。引入隐式几何先验可作硬约束。",
      hypothesis:
        "我假设：在扩散损失外加一项「点到拟合 SDF 的距离」监督，能压低表面噪声、提升 F-score，因为 SDF 提供了逐点的几何一致性梯度。",
      experiment:
        "对每个形状在线拟合粗 SDF 作辅助监督，对比有/无该项的 F-score 与法向一致性；先在单类小规模验证。",
      resources: "在线 SDF 拟合增加约 30% 训练开销，单卡 4090 两周偏紧但可行。",
      risk: "SDF 拟合不稳会引入错误梯度反伤生成；需先验证拟合鲁棒性，故可行性略低。",
      novelty: 4,
      feasibility: 3,
      lens: "跨域引入",
    },
  ],
};
