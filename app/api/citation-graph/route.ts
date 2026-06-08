import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buildGraph,
  stripOpenAlexId,
  type OAWork,
} from "@/lib/paper-search/citation-graph";
import { enforceRateLimit, fetchWithTimeout } from "@/lib/api/http";

export const maxDuration = 30;

const OA = "https://api.openalex.org";
const UA =
  "Mozilla/5.0 (compatible; PaperWeave/1.0; +https://github.com/unumbrela/toolbox)";
const SELECT = "id,title,publication_year,cited_by_count,authorships";

const Body = z.object({
  id: z.string().optional(),
  openAlexId: z.string().optional(),
  maxRefs: z.number().optional(),
  maxCiting: z.number().optional(),
});

/** 上游单篇取详情（含 referenced_works）。 */
async function fetchWork(id: string): Promise<OAWork & { referenced_works?: string[] }> {
  const res = await fetchWithTimeout(`${OA}/works/${id}?select=${SELECT},referenced_works`, {
    headers: { "User-Agent": UA },
  });
  if (!res.ok) throw new Error(`OpenAlex work ${id} → ${res.status}`);
  return res.json();
}

/** 批量取多篇（filter=openalex_id:W1|W2|…，每批 ≤50），各批并行。 */
async function fetchBatch(ids: string[]): Promise<OAWork[]> {
  if (ids.length === 0) return [];
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50));

  const settled = await Promise.allSettled(
    chunks.map(async (chunk) => {
      const url = `${OA}/works?filter=openalex_id:${chunk.join("|")}&select=${SELECT}&per-page=50`;
      const res = await fetchWithTimeout(url, { headers: { "User-Agent": UA } });
      if (!res.ok) return [] as OAWork[]; // 单批失败不致全图失败
      const data = await res.json();
      return Array.isArray(data.results) ? (data.results as OAWork[]) : [];
    }),
  );
  return settled.flatMap((s) => (s.status === "fulfilled" ? s.value : []));
}

/** 取引用种子的文献（cites:种子，按被引降序，top N）。 */
async function fetchCiting(seedId: string, limit: number): Promise<OAWork[]> {
  const url = `${OA}/works?filter=cites:${seedId}&select=${SELECT}&sort=cited_by_count:desc&per-page=${limit}`;
  const res = await fetchWithTimeout(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.results) ? data.results : [];
}

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "citation-graph", { windowMs: 60_000, max: 20 });
  if (limited) return limited;

  try {
    const parsed = Body.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "请求体格式错误" }, { status: 400 });
    }
    const body = parsed.data;
    const id = stripOpenAlexId(String(body.id || body.openAlexId || ""));

    if (!/^W\d+$/i.test(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "需要 OpenAlex 论文 ID（形如 W123…）。该功能目前仅支持来自 OpenAlex 源的论文。",
        },
        { status: 400 },
      );
    }

    const maxRefs = Math.min(Math.max(Number(body.maxRefs) || 30, 1), 50);
    const maxCiting = Math.min(Math.max(Number(body.maxCiting) || 15, 0), 50);

    const seed = await fetchWork(id);
    const refIds = (seed.referenced_works || [])
      .map(stripOpenAlexId)
      .filter(Boolean)
      .slice(0, maxRefs);

    const [references, citations] = await Promise.all([
      fetchBatch(refIds),
      maxCiting > 0 ? fetchCiting(id, maxCiting) : Promise.resolve([]),
    ]);

    const graph = buildGraph(seed, references, citations);

    return NextResponse.json({ success: true, data: graph });
  } catch (error) {
    console.error("[Citation Graph API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "构建引用网络失败",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
