import { NextResponse } from "next/server";
import { z } from "zod";
import { chatCompletion } from "@/lib/ai/client";
import { resolveKeys, hasAnyKey } from "@/lib/ai/keys";
import { enforceRateLimit, fetchWithTimeout } from "@/lib/api/http";
import {
  parseLineage,
  RELATIONS,
  type Lineage,
  type LineageNode,
  type LineageEdge,
  type Relation,
} from "@/lib/genealogy/lineage";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * 研究脉络族谱 · 网页内一键生成。
 *
 * 「梳理」主干步：输入研究方向 → 从 OpenAlex 真实检索奠基（被引最高）+ 前沿（最新）论文作为
 * 节点（事实层），再让 LLM 在这些真实节点之上推断发展谱系的边（builds-on / inspired-by /
 * supersedes / parallel）与一句话定位（结构层）。节点全部来自 OpenAlex，不杜撰；边为 LLM
 * 综合、未经引文核验（verified 留空）。需要核验过的深度谱系，走终端 skill research-genealogy。
 *
 * 输出 schema 与 lib/genealogy/lineage.ts 一致，返回前用 parseLineage 校验，复用站内同一渲染层。
 */

const OA = "https://api.openalex.org";
const UA =
  "Mozilla/5.0 (compatible; PaperWeave/1.0; +https://github.com/unumbrela/toolbox)";
const SELECT =
  "id,title,publication_year,cited_by_count,authorships,primary_location";

const Body = z.object({
  direction: z.string().trim().min(2, "请输入研究方向（至少 2 个字）").max(120),
  maxNodes: z.number().optional(),
});

interface OAWork {
  id?: string;
  title?: string | null;
  publication_year?: number;
  cited_by_count?: number;
  authorships?: Array<{ author?: { display_name?: string } }>;
  primary_location?: { source?: { display_name?: string } | null } | null;
}

function stripId(raw?: string): string {
  return (raw || "").replace(/^https?:\/\/openalex\.org\//i, "").trim();
}

function authorLabel(w: OAWork): string {
  const a = w.authorships?.[0]?.author?.display_name;
  if (!a) return "unknown";
  return (w.authorships?.length ?? 0) > 1 ? `${a} et al.` : a;
}

/** 按某种排序从 OpenAlex 检索该方向的论文（仅取有摘要、像样的工作）。 */
async function searchOA(
  direction: string,
  sort: string,
  perPage: number,
): Promise<OAWork[]> {
  const url =
    `${OA}/works?search=${encodeURIComponent(direction)}` +
    `&filter=has_abstract:true,type:article` +
    `&sort=${sort}&per-page=${perPage}&select=${SELECT}`;
  const res = await fetchWithTimeout(url, { headers: { "User-Agent": UA } }, 15_000);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.results) ? (data.results as OAWork[]) : [];
}

/** 奠基（被引最高）+ 前沿（最新）两路检索，按 id 去重并按年份升序。 */
async function collectNodes(direction: string, maxNodes: number): Promise<LineageNode[]> {
  const foundationN = Math.ceil(maxNodes * 0.6);
  const frontierN = maxNodes; // 多取些前沿再裁，保证近年覆盖
  const [foundational, frontier] = await Promise.all([
    searchOA(direction, "cited_by_count:desc", foundationN),
    searchOA(direction, "publication_date:desc", frontierN),
  ]);

  const byId = new Map<string, LineageNode>();
  const add = (w: OAWork) => {
    const id = stripId(w.id || "");
    if (!id || !w.title || typeof w.publication_year !== "number") return;
    if (byId.has(id)) return;
    byId.set(id, {
      id,
      title: w.title,
      authors: authorLabel(w),
      year: w.publication_year,
      venue: w.primary_location?.source?.display_name || undefined,
      citations: w.cited_by_count,
      url: `https://openalex.org/${id}`,
    });
  };
  // 奠基优先占位，再用前沿补足
  foundational.forEach(add);
  frontier.forEach(add);

  return [...byId.values()]
    .sort((a, b) => a.year - b.year || (b.citations ?? 0) - (a.citations ?? 0))
    .slice(0, maxNodes);
}

/** 从 LLM 文本里抠出第一个 JSON 对象（容忍 ```json 代码围栏与前后噪声）。 */
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) throw new Error("AI 未返回 JSON");
  return body.slice(start, end + 1);
}

interface LLMEdge {
  from?: string;
  to?: string;
  relation?: string;
}
interface LLMNote {
  ref?: string;
  problem?: string;
  contribution?: string;
}

function buildPrompt(direction: string, nodes: LineageNode[]): string {
  const catalog = nodes
    .map(
      (n, i) =>
        `[n${i + 1}] ${n.title} — ${n.authors}, ${n.year}${
          typeof n.citations === "number" ? `, 被引 ${n.citations}` : ""
        }`,
    )
    .join("\n");

  return `下面是「${direction}」方向的真实论文清单（来自 OpenAlex，按年份升序），每篇前有编号 nK：

${catalog}

请仅基于这些论文，梳理该方向的发展脉络，输出严格 JSON（不要任何解释文字、不要代码围栏）：
{
  "field": "${direction}",
  "edges": [ { "from": "nK", "to": "nK", "relation": "builds-on" } ],
  "notes": [ { "ref": "nK", "problem": "≤20字它要解决的问题", "contribution": "≤20字它的关键贡献" } ]
}

规则：
- edges 表达「后者在前者之上发展」的关系，from=较早的前驱、to=较晚的后继；relation ∈ ${RELATIONS.join(" | ")}（builds-on 直接沿用/改进，inspired-by 受启发但路线不同，supersedes 取代，parallel 同期并行路线）。
- 只能引用清单里出现过的编号（n1…n${nodes.length}），不要新增论文。
- 形成一棵以奠基工作为根、逐步分叉到前沿的树：每个较晚的工作尽量挂到 1 个最贴近的前驱下；同期不同路线用 parallel。
- notes 给关键节点（尤其奠基/枢纽/前沿）补一句话定位即可，不必每篇都给。
- from/to 不能相同，不要制造明显的环。`;
}

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "research-genealogy", {
    windowMs: 60_000,
    max: 8,
  });
  if (limited) return limited;

  try {
    const parsed = Body.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "请求体格式错误" },
        { status: 400 },
      );
    }
    const { direction } = parsed.data;
    const maxNodes = Math.min(Math.max(Number(parsed.data.maxNodes) || 16, 6), 24);

    const keys = resolveKeys(request);
    if (!hasAnyKey(keys)) {
      return NextResponse.json(
        { success: false, error: "AI 服务未配置：请在右上角「API Key」填入你自己的 key" },
        { status: 503 },
      );
    }

    const nodes = await collectNodes(direction, maxNodes);
    if (nodes.length < 3) {
      return NextResponse.json(
        {
          success: false,
          error: `OpenAlex 未检索到足够论文（仅 ${nodes.length} 篇）。换更具体或更主流的方向词再试。`,
        },
        { status: 422 },
      );
    }

    // LLM 在真实节点之上推断结构（边 + 定位）
    const refMap = new Map(nodes.map((n, i) => [`n${i + 1}`, n.id]));
    const raw = await chatCompletion(
      [
        {
          role: "system",
          content:
            "你是严谨的科研综述助手，擅长把一个方向的代表论文梳理成发展谱系。只输出 JSON。",
        },
        { role: "user", content: buildPrompt(direction, nodes) },
      ],
      { temperature: 0.3, max_tokens: 2000 },
      keys,
    );

    let llm: { edges?: LLMEdge[]; notes?: LLMNote[] };
    try {
      llm = JSON.parse(extractJson(raw));
    } catch {
      return NextResponse.json(
        { success: false, error: "AI 返回的结构无法解析，请重试。" },
        { status: 502 },
      );
    }

    // 把 nK 引用映射回真实 OpenAlex id，丢弃越界/自环/非法关系
    const edges: LineageEdge[] = [];
    const edgeSeen = new Set<string>();
    for (const e of llm.edges ?? []) {
      const from = refMap.get(String(e.from));
      const to = refMap.get(String(e.to));
      const relation = String(e.relation ?? "builds-on") as Relation;
      if (!from || !to || from === to) continue;
      if (!RELATIONS.includes(relation)) continue;
      const key = `${from}->${to}`;
      if (edgeSeen.has(key)) continue;
      edgeSeen.add(key);
      edges.push({ from, to, relation });
    }

    // 一句话定位回填到对应节点
    for (const note of llm.notes ?? []) {
      const id = refMap.get(String(note.ref));
      if (!id) continue;
      const node = nodes.find((n) => n.id === id);
      if (!node) continue;
      if (note.problem) node.problem = String(note.problem).slice(0, 60);
      if (note.contribution) node.contribution = String(note.contribution).slice(0, 60);
    }

    const lineage: Lineage = { field: direction, nodes, edges };

    // 与站内渲染层同一把尺子校验，保证 page 能直接渲染
    const validated = parseLineage(JSON.stringify(lineage));

    return NextResponse.json({
      success: true,
      data: validated,
      meta: { mode: "web", verified: false, nodes: nodes.length, edges: edges.length },
    });
  } catch (error) {
    console.error("[Research Genealogy API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "生成研究族谱失败，请稍后重试。",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
