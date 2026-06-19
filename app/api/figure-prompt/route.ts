import { streamChat, aiNotConfiguredResponse } from "@/lib/ai/stream";
import { resolveKeys, hasAnyKey } from "@/lib/ai/keys";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  subject: z.string().min(2, "请填写图的主题").max(500),
  content: z.string().min(5, "请描述图中要展示的关键内容 / 步骤").max(4000),
  figureType: z
    .enum(["graphical-abstract", "workflow", "mechanism", "experimental-design", "architecture", "concept"])
    .default("graphical-abstract"),
  layout: z.string().max(200).optional().default(""),
  palette: z.string().max(300).optional().default(""),
  style: z.string().max(1000).optional().default(""),
  lang: z.enum(["zh", "en", "both"]).default("zh"),
  model: z.enum(["generic", "midjourney", "dalle", "jimeng"]).default("generic"),
});

const FIGURE_TYPE_HINT: Record<string, string> = {
  "graphical-abstract": "论文图形摘要（Graphical Abstract）：一图概括全文核心流程/发现，期刊投稿常用",
  workflow: "流程示意图：清晰呈现一套方法或实验的步骤先后与数据流向",
  mechanism: "机制示意图：刻画分子/细胞/系统层面的作用机理与相互关系",
  "experimental-design": "实验设计图：分组、处理、时间线与读出指标一目了然",
  architecture: "模型 / 系统架构图：模块、数据流、组件关系（适合方法论文）",
  concept: "概念示意图：把抽象概念或假设可视化表达",
};

const LAYOUT_HINT: Record<string, string> = {
  horizontal: "从左到右的横向流程布局，阶段间用箭头串联",
  vertical: "自上而下的纵向流程布局，阶段间用箭头串联",
  radial: "以核心主题居中、要素环绕的中心放射布局",
  cycle: "环形循环布局，强调步骤首尾相接、可迭代",
  grid: "分区网格布局，把并列的要素清晰分块",
};

const MODEL_HINT: Record<string, string> = {
  generic: "通用文生图模型（DALL·E / GPT-image / 即梦 / 可灵等均适用），输出纯自然语言描述，不加任何模型专属参数。",
  midjourney: "Midjourney：在提示词末尾追加合适参数（如 --ar 16:9 适配图形摘要横幅、--style raw 提升写实克制度、--v 6）。",
  dalle: "DALL·E / GPT-image：纯自然语言，强调‘干净的矢量科研插图、白底、无多余文字’，不要参数。",
  jimeng: "即梦 / 可灵等中文文生图：用流畅中文描述，强调画面干净、矢量插画风、白底。",
};

export async function POST(req: Request) {
  const keys = resolveKeys(req);
  if (!hasAnyKey(keys)) return aiNotConfiguredResponse();
  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "请求体格式错误", { status: 400 });
  }

  const langInstruction =
    parsed.lang === "en"
      ? "提示词正文用**英文**撰写（文生图模型对英文描述通常更准）。"
      : parsed.lang === "both"
        ? "先给**中文**提示词，再给一份等价的**英文**提示词（各自独立成块）。"
        : "提示词正文用**中文**撰写。";

  // 系统提示编码「论文图形摘要提示词」的写法范式（呼应用户给的示例三段式结构）。
  const system = `你是一位科研可视化专家，专门为文生图模型撰写「适合论文发表的科研插图/图形摘要」提示词。

你产出的提示词必须是一段**连贯、具体、可直接粘贴**的描述，遵循如下三段式范式（自然融合，不要写成 1/2/3 列表）：
1) 开篇点明这是「适合论文发表的科研图形（图形摘要 / 示意图）」+ 主题，然后用一两句叙述画面要展示的关键内容与要素（把抽象步骤翻译成可画的小场景/图标）。
2) 布局与组织：明确空间布局（横向/纵向/放射/环形/网格），依次说明各阶段/区块呈现什么，用箭头或连线表达流程与关系；每个阶段用简洁的科研图标或小场景表达。
3) 风格与约束：强调专业、清晰、层级明确、具有**矢量化科研插图质感**；指定背景与配色（主色 + 强调色及其语义）；并给出克制性约束——画面干净、避免过度装饰、**不要出现大段文字说明**。

铁律：
- 只描述「怎么画」，不要编造论文里没有的实验数字或结论。
- 默认白色背景、矢量插画风、无大段文字；用户另有指定则尊重用户。
- 配色要落到具体语义（哪种颜色代表什么），而非泛泛“好看”。
- 输出使用中文说明骨架，但**提示词正文遵循指定语言**。`;

  const prompt = `请基于以下要素，生成一条科研绘图提示词。

**图类型**：${FIGURE_TYPE_HINT[parsed.figureType]}
**主题**：${parsed.subject}
**要展示的关键内容 / 步骤**：${parsed.content}
**布局偏好**：${parsed.layout ? LAYOUT_HINT[parsed.layout] ?? parsed.layout : "由你根据内容选择最能表达流程/关系的布局"}
**配色**：${parsed.palette || "以蓝色与浅紫色为主色，橙色用于强调关键结果，白色背景"}
**额外风格 / 约束**：${parsed.style || "（无，套用论文图形摘要的默认克制风格）"}
**目标模型**：${MODEL_HINT[parsed.model]}
**语言**：${langInstruction}

输出格式（严格遵守）：

## 科研绘图提示词
\`\`\`
（这里是可直接复制粘贴给文生图模型的完整提示词，遵循上述三段式范式，连贯成段）
\`\`\`
${parsed.lang === "both" ? "\n（中文块之后再给一个等价的英文提示词代码块。）\n" : ""}
## 可微调要点
- 列 3–5 条可按需调整的参数（如画幅比例、主色/强调色替换、信息密度、加/减某个阶段），帮用户快速迭代。`;

  const stream = await streamChat(
    [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    { temperature: 0.6, max_tokens: 2200 },
    keys,
  );

  return new Response(stream, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
