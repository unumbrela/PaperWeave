/**
 * 研究方向族谱 —— 确定性布局模型（纯函数，可单测）。
 *
 * 在 `buildRows` 的 DFS 行序之上，把每一行落到平面坐标：
 *   y = rowIndex × ROW_H（自上而下时间顺序）
 *   x = depth × LANE_W （分支泳道缩进）
 * 同一份布局同时驱动三处、坐标天然一致：
 *   ① 站内 HTML 卡片（绝对定位）；
 *   ② 卡片下方的 SVG 连线层（主干折线 + parallel 横连）；
 *   ③ 导出用的自包含 SVG（见 lib/genealogy/export.ts）。
 * 无 DOM 测量、无副作用——这样布局可在测试里直接断言。
 */

import {
  buildRows,
  type Lineage,
  type RenderRow,
  type Relation,
} from "./lineage";

/** 行高 / 泳道宽 / 左侧年份轴宽 / 节点圆点中心相对行左侧的偏移。 */
export const ROW_H = 76;
export const LANE_W = 30;
export const AXIS_W = 64;
export const NODE_DX = 12;
/** 卡片相对圆点的水平起点（圆点 + 间距）。 */
export const CARD_DX = 26;

export interface XY {
  x: number;
  y: number;
}

/** 一行的完整布局：渲染行 + 坐标 + 圆点中心。 */
export interface LayoutRow extends RenderRow {
  index: number;
  /** 行左上角（不含年份轴）相对画布的坐标 */
  x: number;
  y: number;
  /** 节点圆点中心坐标（连线锚点） */
  dot: XY;
}

/** 主干父→子连线段（肘形：父圆点 ↓ 到子行高度 → 子圆点）。 */
export interface Connector {
  from: XY;
  to: XY;
  relation: Relation;
  /** 主干边是否经引文核验通过（仅终端深度模式有） */
  verified?: boolean;
  fromId: string;
  toId: string;
}

/** parallel 边的两端锚点（横向点线，同期并行路线）。 */
export interface ParallelLink {
  a: XY;
  b: XY;
  aId: string;
  bId: string;
}

/** 时代带：按年份分组的纵向区段，用于左轴刻度与隔行底色。 */
export interface EraBand {
  year: number;
  yStart: number;
  yEnd: number;
  /** 该年份的行数 */
  rows: number;
}

export interface GenealogyLayout {
  rows: LayoutRow[];
  connectors: Connector[];
  parallelLinks: ParallelLink[];
  eraBands: EraBand[];
  maxCitations: number;
  /** 画布尺寸（不含年份轴的内容宽 / 总高） */
  width: number;
  height: number;
  maxDepth: number;
}

/** 把 lineage 排成带坐标的布局模型。 */
export function buildLayout(lineage: Lineage): GenealogyLayout {
  const renderRows = buildRows(lineage);

  const rows: LayoutRow[] = renderRows.map((r, i) => {
    const x = r.depth * LANE_W;
    const y = i * ROW_H;
    return {
      ...r,
      index: i,
      x,
      y,
      dot: { x: x + NODE_DX, y: y + ROW_H / 2 },
    };
  });

  const byNodeId = new Map(rows.map((r) => [r.node.id, r]));

  // 主干连线：每个非根行与其主干父（relation 存在）连一段肘形线。
  // 主干父 = 在已排出的行里、id 与本行 relation 对应的「最近前驱」。
  // buildRows 已把节点挂在主干父下（DFS），父就是「往上找到的、depth 比自己小 1
  // 且最靠近的行」。这与 buildRows 的 children 构造一致。
  const connectors: Connector[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.relation) continue;
    // 往上找 depth === row.depth - 1 的最近一行，即主干父
    let parent: LayoutRow | undefined;
    for (let j = i - 1; j >= 0; j--) {
      if (rows[j].depth === row.depth - 1) {
        parent = rows[j];
        break;
      }
      if (rows[j].depth < row.depth - 1) break;
    }
    if (!parent) continue;
    connectors.push({
      from: parent.dot,
      to: row.dot,
      relation: row.relation,
      verified: row.verified,
      fromId: parent.node.id,
      toId: row.node.id,
    });
  }

  // parallel 连线：用 lineage 原始 parallel 边，落到两端行的圆点。
  const parallelLinks: ParallelLink[] = [];
  const seenPar = new Set<string>();
  for (const e of lineage.edges) {
    if (e.relation !== "parallel") continue;
    const a = byNodeId.get(e.from);
    const b = byNodeId.get(e.to);
    if (!a || !b) continue;
    const key = [e.from, e.to].sort().join("|");
    if (seenPar.has(key)) continue;
    seenPar.add(key);
    parallelLinks.push({ a: a.dot, b: b.dot, aId: a.node.id, bId: b.node.id });
  }

  // 时代带：连续同年的行并成一段（行已按 DFS 序，非严格年序，故按 year 聚合相邻段）。
  const eraBands: EraBand[] = [];
  for (const row of rows) {
    const last = eraBands[eraBands.length - 1];
    if (last && last.year === row.node.year) {
      last.yEnd = row.y + ROW_H;
      last.rows += 1;
    } else {
      eraBands.push({
        year: row.node.year,
        yStart: row.y,
        yEnd: row.y + ROW_H,
        rows: 1,
      });
    }
  }

  const maxCitations = Math.max(
    1,
    ...lineage.nodes.map((n) => n.citations ?? 0),
  );
  const maxDepth = rows.reduce((m, r) => Math.max(m, r.depth), 0);

  return {
    rows,
    connectors,
    parallelLinks,
    eraBands,
    maxCitations,
    width: (maxDepth + 1) * LANE_W,
    height: rows.length * ROW_H,
    maxDepth,
  };
}

/** 每个节点的祖先 / 后代集合（沿主干 + inspired-by + supersedes 边，不含 parallel）。 */
export interface Kin {
  ancestors: Set<string>;
  descendants: Set<string>;
}

/**
 * 计算每个节点的整条「祖先→后代」血缘，供悬停时高亮整条发展路径。
 * 纯 BFS over tree edges（builds-on / inspired-by / supersedes），不含 parallel。
 */
export function relatives(lineage: Lineage): Map<string, Kin> {
  const childrenOf = new Map<string, string[]>();
  const parentsOf = new Map<string, string[]>();
  for (const e of lineage.edges) {
    if (e.relation === "parallel") continue;
    (childrenOf.get(e.from) ?? childrenOf.set(e.from, []).get(e.from)!).push(e.to);
    (parentsOf.get(e.to) ?? parentsOf.set(e.to, []).get(e.to)!).push(e.from);
  }

  const reach = (start: string, adj: Map<string, string[]>): Set<string> => {
    const seen = new Set<string>();
    const queue = [...(adj.get(start) ?? [])];
    while (queue.length) {
      const id = queue.shift()!;
      if (seen.has(id)) continue;
      seen.add(id);
      for (const next of adj.get(id) ?? []) if (!seen.has(next)) queue.push(next);
    }
    return seen;
  };

  const map = new Map<string, Kin>();
  for (const n of lineage.nodes) {
    map.set(n.id, {
      ancestors: reach(n.id, parentsOf),
      descendants: reach(n.id, childrenOf),
    });
  }
  return map;
}
