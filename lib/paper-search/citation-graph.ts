/**
 * 引用网络图的领域类型 + 纯函数构图层。
 *
 * 数据来自 OpenAlex：一篇「种子论文」+ 它「引用的文献」(referenced_works) +
 * 「引用它的文献」(cites:种子)。buildGraph 把这三组 OpenAlex work 折叠成
 * 去重的 {nodes, edges}，供 D3 力导向图渲染。纯函数、无副作用、可单测。
 */

/** 节点相对种子论文的关系。 */
export type GraphRelation = "seed" | "reference" | "citation";

export interface GraphNode {
  id: string;
  title: string;
  year?: number;
  citations?: number;
  author?: string;
  url: string;
  relation: GraphRelation;
}

export interface GraphEdge {
  /** 引用方（施引）。 */
  source: string;
  /** 被引方。 */
  target: string;
}

export interface CitationGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  seedId: string;
}

/** OpenAlex work 的最小投影（buildGraph 只依赖这些字段）。 */
export interface OAWork {
  id?: string;
  title?: string | null;
  publication_year?: number;
  cited_by_count?: number;
  authorships?: Array<{ author?: { display_name?: string } }>;
}

/** 把 "https://openalex.org/W123" / "W123" 归一化为 "W123"。 */
export function stripOpenAlexId(raw: string): string {
  return (raw || "").replace(/^https?:\/\/openalex\.org\//i, "").trim();
}

function firstAuthor(w: OAWork): string | undefined {
  return w.authorships?.[0]?.author?.display_name || undefined;
}

function toNode(w: OAWork, relation: GraphRelation): GraphNode | null {
  const id = stripOpenAlexId(w.id || "");
  if (!id) return null;
  return {
    id,
    title: w.title || "(无标题)",
    year: w.publication_year,
    citations: w.cited_by_count,
    author: firstAuthor(w),
    url: `https://openalex.org/${id}`,
    relation,
  };
}

/**
 * 构图：
 * - 种子节点 relation=seed
 * - references：种子「引用」的文献，边 种子 → 引文（施引→被引）
 * - citations：「引用」种子的文献，边 施引 → 种子
 * 节点按 id 去重（种子优先级最高，其次 reference，最后 citation）。
 */
export function buildGraph(
  seed: OAWork,
  references: OAWork[],
  citations: OAWork[],
): CitationGraph {
  const seedId = stripOpenAlexId(seed.id || "");
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const edgeSeen = new Set<string>();

  const seedNode = toNode(seed, "seed");
  if (seedNode) nodes.set(seedNode.id, seedNode);

  const addEdge = (source: string, target: string) => {
    if (!source || !target || source === target) return;
    const key = `${source}->${target}`;
    if (edgeSeen.has(key)) return;
    edgeSeen.add(key);
    edges.push({ source, target });
  };

  for (const w of references) {
    const n = toNode(w, "reference");
    if (!n) continue;
    if (!nodes.has(n.id)) nodes.set(n.id, n); // 不覆盖种子
    addEdge(seedId, n.id);
  }

  for (const w of citations) {
    const n = toNode(w, "citation");
    if (!n) continue;
    if (!nodes.has(n.id)) nodes.set(n.id, n);
    addEdge(n.id, seedId);
  }

  // 只保留与种子有边相连的节点（防止孤立点；种子本身始终保留）
  const connected = new Set<string>([seedId]);
  for (const e of edges) {
    connected.add(e.source);
    connected.add(e.target);
  }

  return {
    seedId,
    nodes: [...nodes.values()].filter((n) => connected.has(n.id)),
    edges,
  };
}
