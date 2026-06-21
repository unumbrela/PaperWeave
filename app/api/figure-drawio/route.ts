import { streamChat, aiNotConfiguredResponse } from "@/lib/ai/stream";
import { resolveKeys, hasAnyKey } from "@/lib/ai/keys";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  subject: z.string().min(2, "请填写图的主题").max(500),
  description: z.string().min(5, "请描述要画的节点 / 模块与它们的关系").max(4000),
  diagramType: z
    .enum(["architecture", "flowchart", "sequence", "er", "mindmap", "class"])
    .default("flowchart"),
  direction: z.enum(["LR", "TB"]).default("LR"),
  palette: z.string().max(300).optional().default(""),
  lang: z.enum(["zh", "en"]).default("zh"),
});

const TYPE_HINT: Record<string, string> = {
  architecture: "系统 / 模型架构图：模块为圆角矩形，分层/分组用容器，箭头表示数据流与调用关系",
  flowchart: "流程图：开始/结束用圆角端点，处理步骤用矩形，判断用菱形，箭头表流向",
  sequence: "时序图：参与者横向排列、各自一条生命线，消息为带箭头的横向连线（按时间自上而下）",
  er: "实体关系图(ER)：实体为矩形表，字段分行列出，连线标注 1—N / N—N 基数",
  mindmap: "思维导图：中心主题居中，分支向外放射，子节点逐级展开",
  class: "类图(UML)：类为三段矩形（类名 / 属性 / 方法），连线区分继承（空心三角）与关联",
};

const DIRECTION_HINT: Record<string, string> = {
  LR: "整体自左向右(LR)布局",
  TB: "整体自上而下(TB)布局",
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

  // 系统提示：只产出可直接导入 draw.io 的 mxfile XML，便于站内查看器渲染与下载 .drawio。
  const system = `你是一位精通 draw.io / diagrams.net 的图形工程师。你的唯一任务是把用户描述的图，输出成**合法、可直接被 draw.io 导入并渲染**的 mxfile XML。

输出铁律（务必严格遵守）：
- **只输出 XML 本身**：从 \`<mxfile\` 开始、到 \`</mxfile>\` 结束。不要任何前后说明文字、不要 Markdown 代码围栏、不要 \`\`\`xml。
- 结构必须是 \`<mxfile><diagram><mxGraphModel><root>…</root></mxGraphModel></diagram></mxfile>\`；\`<root>\` 内首两行固定为 \`<mxCell id="0"/>\` 与 \`<mxCell id="1" parent="0"/>\`，其余节点 parent="1"。
- 节点为 vertex（\`vertex="1"\`）并带 \`<mxGeometry x y width height as="geometry"/>\`；连线为 edge（\`edge="1"\` + \`source\`/\`target\`，几何用 \`<mxGeometry relative="1" as="geometry"/>\`）。
- **显式给坐标**，元素之间留足间距、不重叠、对齐整齐；节点宽高合理（如 120×50）。
- 文本里出现 \`& < > " '\` 必须转义为 \`&amp; &lt; &gt; &quot; &#39;\`，否则 XML 非法。
- 节点 \`value\` 用极简短标签，不要塞大段文字。

样式规范：
- 节点默认圆角矩形：\`style="rounded=1;whiteSpace=wrap;html=1;..."\`；判断/菱形/容器按图型选择对应 shape。
- 配色语义：主色用蓝色(填充 #dae8fc / 描边 #6c8ebf)与浅紫(填充 #e1d5e7 / 描边 #9673a6)，关键/强调节点用橙色(填充 #ffe6cc / 描边 #d79b00)。
- 连线用细线箭头，必要处加简短标签。`;

  const langLine =
    parsed.lang === "en"
      ? "图中节点标签用英文。"
      : "图中节点标签用中文（专有名词可保留英文）。";

  const prompt = `请据以下要素，生成一份 draw.io mxfile XML。

**图型**：${TYPE_HINT[parsed.diagramType]}
**主题**：${parsed.subject}
**要画的节点 / 模块与关系**：${parsed.description}
**布局方向**：${DIRECTION_HINT[parsed.direction]}
**配色**：${parsed.palette || "蓝色与浅紫为主色，橙色用于强调关键节点"}
**语言**：${langLine}

直接输出 XML（以 <mxfile 开头，以 </mxfile> 结尾），不要任何额外文字。`;

  const stream = await streamChat(
    [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    { temperature: 0.3, max_tokens: 4000 },
    keys,
  );

  return new Response(stream, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
