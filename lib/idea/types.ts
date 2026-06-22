/**
 * 创新点工坊（idea-generator）的领域类型 ——「诊断 → 设计 → 收敛」三阶段共享。
 *
 * 诊断阶段产出 Diagnosis（贡献 / 假设 / 空白），用户在其上勾选要攻击的支点；
 * 设计阶段按所选「创新透镜」跑 propose→critique→refine，产出带 创新性/可行性
 * 评分的 Idea[]，供收敛阶段画象限图与卡片。
 */

/** 诊断出的一条可勾选支点（假设或空白）。 */
export interface DiagnosisItem {
  id: string;
  text: string;
  /** 仅 gap 有：一个短标签（如「可控性」「效率」），用于 chip 着色与归类。 */
  tag?: string;
}

/** 参考论文 / 方向现状的结构化诊断（研究地形图）。 */
export interface Diagnosis {
  /** 参考资料是否充足；不足时 contributions 可能为空，gaps 基于方向常识。 */
  grounded: boolean;
  /** 现有创新点 / 贡献（只读展示）。 */
  contributions: string[];
  /** 承重假设 —— 反转它们往往就是创新口（可勾选）。 */
  assumptions: DiagnosisItem[];
  /** 局限 / 未解决的研究空白（可勾选，作为攻击目标）。 */
  gaps: DiagnosisItem[];
}

/** 一条评分后的候选 idea。 */
export interface Idea {
  id: string;
  title: string;
  /** 问题定义与动机。 */
  motivation: string;
  /** 与 baseline 的差异化假设（「我假设 X 能带来 Y，因为 Z」）。 */
  hypothesis: string;
  /** 最小验证实验（数据 / 设置 / 看哪个指标 / 多大规模）。 */
  experiment: string;
  /** 预期资源开销。 */
  resources: string;
  /** 最可能的失败模式 / 风险点。 */
  risk: string;
  /** 创新性评分 1–5（越高越新）。 */
  novelty: number;
  /** 可行性评分 1–5（在给定资源下越高越易跑通）。 */
  feasibility: number;
  /** 这条 idea 主要由哪个创新透镜驱动（透镜 id 或名称）。 */
  lens?: string;
}

/** 设计阶段的完整产出。 */
export interface IdeaSet {
  ideas: Idea[];
  /** 推荐优先级说明（一句话：先做哪条 + 理由）。 */
  priority: string;
  /** 若结构化解析失败，这里给出原始文本用于兜底 Markdown 渲染。 */
  raw?: string;
}

/** 创新透镜 —— 引导发散的显式策略（接地 SCAMPER / TRIZ / 类比推理）。 */
export interface Lens {
  id: string;
  name: string;
  /** 一个 emoji 图标，纯展示。 */
  icon: string;
  /** 给用户看的一句话解释。 */
  hint: string;
  /** 注入设计阶段 prompt 的策略指令，指导模型按该透镜发散。 */
  promptHint: string;
}
