/**
 * 研究方向族谱（lineage.json）—— 解析与树构建的纯函数层。
 *
 * lineage.json 由 `skills/research-genealogy` skill 在终端生成（OpenAlex 真实
 * 元数据 + 引文验证边）；本模块把它变成站内可渲染的行序列，闭合
 * 「终端 skill 产出 → 站内可视化」这一环。纯函数、无副作用、可单测。
 *
 * schema 与 skill 侧约定一致（见 skills/research-genealogy/README.md）：
 *   relation ∈ builds-on | inspired-by | parallel | supersedes
 *   一个节点可以有多个父节点——渲染时取「最近前驱」为主干，其余降为标注。
 */

export type Relation = "builds-on" | "inspired-by" | "parallel" | "supersedes";

export const RELATIONS: Relation[] = ["builds-on", "inspired-by", "parallel", "supersedes"];

export interface LineageNode {
  id: string;
  title: string;
  authors: string;
  year: number;
  venue?: string;
  citations?: number;
  problem?: string;
  contribution?: string;
  url?: string;
}

export interface LineageEdge {
  from: string;
  to: string;
  relation: Relation;
  /** verify.py 的引文核验结果：verified / unverified / reversed / cross-cite */
  verified?: string;
}

export interface Lineage {
  field: string;
  nodes: LineageNode[];
  edges: LineageEdge[];
}

/** 节点在族谱中的角色（仅用于展示）。 */
export type NodeRole = "founder" | "hub" | "frontier" | "normal";

/** 渲染行：先根后子的 DFS 顺序，depth 控制缩进。 */
export interface RenderRow {
  node: LineageNode;
  depth: number;
  /** 与主干父节点的关系；根节点为 undefined */
  relation?: Relation;
  /** 主干边是否经引文核验通过 */
  verified?: boolean;
  role: NodeRole;
  /** 主干之外的其余父节点（authors 列表），如 "→ builds-on: Marra et al." */
  extraParents: Array<{ relation: Relation; authors: string }>;
  /** 与本节点 parallel 的节点 authors 列表 */
  parallels: string[];
}

export interface LineageStats {
  count: number;
  minYear: number;
  maxYear: number;
  verifiedEdges: number;
  totalTreeEdges: number;
}

/** 解析并校验 lineage.json 文本；不合法时抛出带中文信息的 Error。 */
export function parseLineage(raw: string): Lineage {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("不是合法的 JSON 文本");
  }
  const obj = data as Record<string, unknown>;
  if (!obj || typeof obj !== "object") throw new Error("lineage 必须是 JSON 对象");
  if (!Array.isArray(obj.nodes) || obj.nodes.length === 0)
    throw new Error("缺少 nodes 数组（至少 1 个节点）");
  if (!Array.isArray(obj.edges)) throw new Error("缺少 edges 数组");

  const nodes: LineageNode[] = (obj.nodes as Array<Record<string, unknown>>).map((n, i) => {
    if (!n.id || !n.title || typeof n.year !== "number")
      throw new Error(`第 ${i + 1} 个节点缺少 id / title / year`);
    return {
      id: String(n.id),
      title: String(n.title),
      authors: String(n.authors ?? "unknown"),
      year: n.year,
      venue: n.venue ? String(n.venue) : undefined,
      citations: typeof n.citations === "number" ? n.citations : undefined,
      problem: n.problem ? String(n.problem) : undefined,
      contribution: n.contribution ? String(n.contribution) : undefined,
      url: n.url ? String(n.url) : undefined,
    };
  });

  const ids = new Set(nodes.map((n) => n.id));
  if (ids.size !== nodes.length) throw new Error("节点 id 有重复");

  const edges: LineageEdge[] = (obj.edges as Array<Record<string, unknown>>)
    .filter((e) => e && e.from && e.to)
    .map((e, i) => {
      const relation = String(e.relation ?? "builds-on") as Relation;
      if (!RELATIONS.includes(relation))
        throw new Error(`第 ${i + 1} 条边的 relation「${relation}」不合法`);
      if (!ids.has(String(e.from)) || !ids.has(String(e.to)))
        throw new Error(`第 ${i + 1} 条边指向不存在的节点`);
      return {
        from: String(e.from),
        to: String(e.to),
        relation,
        verified: e.verified ? String(e.verified) : undefined,
      };
    });

  return { field: String(obj.field ?? "未命名方向"), nodes, edges };
}

const isTreeRelation = (r: Relation) => r !== "parallel";

/**
 * 把 lineage 变成 DFS 渲染行。
 * - 多父节点：以「最近前驱」（年份最大的父节点）为主干，其余父节点降为标注；
 * - parallel 边不参与层级，仅作行内标注；
 * - 带 visited 防环，环中后到的边按标注处理。
 */
export function buildRows(lineage: Lineage): RenderRow[] {
  const byId = new Map(lineage.nodes.map((n) => [n.id, n]));
  const treeEdges = lineage.edges.filter((e) => isTreeRelation(e.relation));

  // 每个子节点的全部父边，按父节点年份降序（最近前驱优先）
  const parentEdges = new Map<string, LineageEdge[]>();
  for (const e of treeEdges) {
    const list = parentEdges.get(e.to) || [];
    list.push(e);
    parentEdges.set(e.to, list);
  }
  for (const list of parentEdges.values()) {
    list.sort((a, b) => (byId.get(b.from)?.year ?? 0) - (byId.get(a.from)?.year ?? 0));
  }

  // 主干 children：仅把每个节点挂在其主干父（最近前驱）下
  const children = new Map<string, LineageEdge[]>();
  for (const [to, list] of parentEdges) {
    const primary = list[0];
    const sibs = children.get(primary.from) || [];
    sibs.push({ ...primary, to });
    children.set(primary.from, sibs);
  }
  for (const list of children.values()) {
    list.sort(
      (a, b) =>
        (byId.get(a.to)?.year ?? 0) - (byId.get(b.to)?.year ?? 0) ||
        (byId.get(b.to)?.citations ?? 0) - (byId.get(a.to)?.citations ?? 0),
    );
  }

  // parallel 标注（双向展示）
  const parallels = new Map<string, string[]>();
  for (const e of lineage.edges.filter((x) => x.relation === "parallel")) {
    const a = byId.get(e.from);
    const b = byId.get(e.to);
    if (!a || !b) continue;
    parallels.set(a.id, [...(parallels.get(a.id) || []), b.authors]);
    parallels.set(b.id, [...(parallels.get(b.id) || []), a.authors]);
  }

  const roots = lineage.nodes
    .filter((n) => !parentEdges.has(n.id))
    .sort((a, b) => a.year - b.year || (b.citations ?? 0) - (a.citations ?? 0));

  const maxYear = Math.max(...lineage.nodes.map((n) => n.year));
  const role = (n: LineageNode, isRoot: boolean): NodeRole => {
    if (n.year >= maxYear - 1) return "frontier";
    if (isRoot && children.has(n.id)) return "founder";
    if ((children.get(n.id)?.length ?? 0) >= 2) return "hub";
    return "normal";
  };

  const rows: RenderRow[] = [];
  const visited = new Set<string>();

  const visit = (id: string, depth: number, edge?: LineageEdge) => {
    if (visited.has(id)) return; // 防环
    visited.add(id);
    const node = byId.get(id);
    if (!node) return;

    const extras = (parentEdges.get(id) || [])
      .slice(1)
      .map((e) => ({ relation: e.relation, authors: byId.get(e.from)?.authors ?? e.from }));

    rows.push({
      node,
      depth,
      relation: edge?.relation,
      verified: edge ? edge.verified === "verified" : undefined,
      role: role(node, depth === 0),
      extraParents: extras,
      parallels: parallels.get(id) || [],
    });

    for (const c of children.get(id) || []) visit(c.to, depth + 1, c);
  };

  for (const r of roots) visit(r.id, 0);
  // 环里挂不到根的剩余节点，作为根补在末尾（不静默丢节点）
  for (const n of lineage.nodes) if (!visited.has(n.id)) visit(n.id, 0);

  return rows;
}

/** 族谱头部统计（页面标题栏用）。 */
export function lineageStats(lineage: Lineage): LineageStats {
  const years = lineage.nodes.map((n) => n.year);
  const tree = lineage.edges.filter((e) => isTreeRelation(e.relation));
  return {
    count: lineage.nodes.length,
    minYear: Math.min(...years),
    maxYear: Math.max(...years),
    verifiedEdges: tree.filter((e) => e.verified === "verified").length,
    totalTreeEdges: tree.length,
  };
}
