"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { CitationGraph as Graph, GraphNode } from "@/lib/paper-search/citation-graph";

type SimNode = GraphNode & d3.SimulationNodeDatum;
type SimLink = d3.SimulationLinkDatum<SimNode>;

const COLORS: Record<GraphNode["relation"], string> = {
  seed: "#b14bff",
  reference: "#4bb3ff",
  citation: "#ff7a59",
};

/** D3 力导向引用网络图。种子在中心，引文/施引文献环绕，半径随被引数变化。 */
export function CitationGraph({
  graph,
  onSelect,
}: {
  graph: Graph;
  onSelect?: (node: GraphNode) => void;
}) {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const W = 760;
    const H = 520;
    const svg = d3.select(el);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${W} ${H}`);

    // 深拷贝，避免 d3 给原数据塞 x/y/vx/vy 等仿真字段
    const nodes: SimNode[] = graph.nodes.map((n) => ({ ...n }));
    const links: SimLink[] = graph.edges.map((e) => ({ source: e.source, target: e.target }));

    const maxCite = d3.max(nodes, (n) => n.citations || 0) || 1;
    const radius = (n: SimNode) =>
      n.relation === "seed" ? 16 : 6 + 10 * Math.sqrt((n.citations || 0) / maxCite);

    const root = svg.append("g");

    // 缩放/平移
    svg.call(
      d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 4])
        .on("zoom", (event) => root.attr("transform", event.transform)),
    );

    const link = root
      .append("g")
      .attr("stroke", "#1a1713")
      .attr("stroke-opacity", 0.12)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 1);

    const node = root
      .append("g")
      .selectAll<SVGCircleElement, SimNode>("circle")
      .data(nodes)
      .join("circle")
      .attr("r", radius)
      .attr("fill", (d) => COLORS[d.relation])
      .attr("fill-opacity", (d) => (d.relation === "seed" ? 0.95 : 0.78))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .on("click", (_e, d) => onSelect?.(d));

    node.append("title").text((d) => `${d.title}${d.year ? ` (${d.year})` : ""}`);

    const label = root
      .append("g")
      .selectAll<SVGTextElement, SimNode>("text")
      .data(nodes)
      .join("text")
      .text((d) => {
        const t = d.title.length > 28 ? d.title.slice(0, 27) + "…" : d.title;
        return d.relation === "seed" ? t : d.author || t;
      })
      .attr("font-size", (d) => (d.relation === "seed" ? 12 : 9.5))
      .attr("fill", "#1a1713")
      .attr("fill-opacity", 0.7)
      .attr("text-anchor", "middle")
      .attr("dy", (d) => -radius(d) - 4)
      .style("pointer-events", "none");

    const sim = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3.forceLink<SimNode, SimLink>(links).id((d) => d.id).distance(90).strength(0.4),
      )
      .force("charge", d3.forceManyBody().strength(-260))
      .force("center", d3.forceCenter(W / 2, H / 2))
      .force("collide", d3.forceCollide<SimNode>((d) => radius(d) + 14))
      .on("tick", () => {
        link
          .attr("x1", (d) => (d.source as SimNode).x ?? 0)
          .attr("y1", (d) => (d.source as SimNode).y ?? 0)
          .attr("x2", (d) => (d.target as SimNode).x ?? 0)
          .attr("y2", (d) => (d.target as SimNode).y ?? 0);
        node.attr("cx", (d) => d.x ?? 0).attr("cy", (d) => d.y ?? 0);
        label.attr("x", (d) => d.x ?? 0).attr("y", (d) => d.y ?? 0);
      });

    const drag = d3
      .drag<SVGCircleElement, SimNode>()
      .on("start", (event, d) => {
        if (!event.active) sim.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) sim.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
    node.call(drag);

    return () => {
      sim.stop();
    };
  }, [graph, onSelect]);

  return (
    <div className="w-full">
      <svg ref={ref} className="w-full" style={{ height: 520 }} />
      <div className="mt-2 flex flex-wrap items-center gap-4 text-[12px] text-ink-3">
        <Legend color={COLORS.seed} label="种子论文" />
        <Legend color={COLORS.reference} label="它引用的文献（参考文献）" />
        <Legend color={COLORS.citation} label="引用它的文献（被引）" />
        <span className="text-ink-4">· 圆越大被引越多 · 滚轮缩放 · 拖拽节点 · 点击打开</span>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
