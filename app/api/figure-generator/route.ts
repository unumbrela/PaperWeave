import { streamText } from "ai";
import { getDeepSeek, MODELS, aiNotConfiguredResponse } from "@/lib/ai";
import { resolveKeys } from "@/lib/ai/keys";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  description: z.string().min(10, "请描述想画的图：内容、对比关系、想传达的结论").max(4000),
  data: z.string().max(8000).optional().default(""),
  library: z.enum(["matplotlib", "seaborn", "plotly", "tikz"]).default("matplotlib"),
  target: z.enum(["single", "double", "slide"]).default("single"),
});

const LIBRARY_HINT = {
  matplotlib: "matplotlib（纯 matplotlib，不依赖 seaborn；rcParams 显式设置）",
  seaborn: "seaborn（以 seaborn 为主，必要处用 matplotlib 微调）",
  plotly: "plotly（plotly.graph_objects，导出静态 PDF/SVG 用 kaleido）",
  tikz: "LaTeX TikZ / pgfplots（可直接 \\input 进论文的独立 .tex 片段）",
} as const;

const TARGET_HINT = {
  single: "期刊单栏图：宽约 3.5 in（88 mm），正文字号 8–9 pt，线宽与标记相应缩小",
  double: "期刊双栏跨栏图：宽约 7.0 in（180 mm），可容纳多子图（标注 (a)(b)(c)…）",
  slide: "演示幻灯片图：16:9 画幅，字号 ≥ 18 pt，元素大而稀疏，一图一结论",
} as const;

export async function POST(req: Request) {
  const { deepseek: dsKey } = resolveKeys(req);
  if (!dsKey) return aiNotConfiguredResponse();
  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "请求体格式错误", {
      status: 400,
    });
  }

  const system = `你是一个科研论文绘图专家，产出**可直接运行**的出版级绘图代码。铁律：
- 绝不编造实验数据。用户给了数据就严格用给定数据；没给就生成一段标注清楚的「示例数据（请替换为真实数据）」并把数据加载独立成函数，方便替换。
- 出版规范默认内置：色盲友好配色（优先 Okabe-Ito 调色板）、向量格式导出（PDF/SVG）、字体字号与目标排版尺寸匹配、坐标轴带单位、图例不遮挡数据、有不确定度时画误差棒/置信带。
- 输出使用中文说明 + 一个完整代码块，代码内注释精炼。`;

  const prompt = `请为下面的需求生成绘图代码。

**绘图库**：${LIBRARY_HINT[parsed.library]}
**排版目标**：${TARGET_HINT[parsed.target]}

**图的需求描述**：
${parsed.description}
${parsed.data.trim() ? `\n**数据（严格使用，不得改动数值）**：\n${parsed.data}` : "\n（用户未提供数据：生成清晰标注的示例数据段，并独立成可替换的加载函数。）"}

输出格式（严格遵守）：

## 图表方案
（一两句话：选择什么图型、为什么它最能传达该结论；如更优图型与用户描述不同，说明理由并按更优方案实现。）

## 代码
（一个完整代码块：从 import 到保存矢量文件结尾，可直接运行。）

## 设计要点
- 逐条说明关键设计决策（配色 / 尺寸字号 / 坐标处理 / 标注）。

## 投稿自查清单
- [ ] 列 4–6 条该图在投稿前应自查的具体项（如「导出 PDF 后放大 400% 检查文字不糊」）。`;

  const result = streamText({
    model: getDeepSeek(dsKey)(MODELS.chat),
    system,
    prompt,
    temperature: 0.3,
  });

  return result.toTextStreamResponse();
}
