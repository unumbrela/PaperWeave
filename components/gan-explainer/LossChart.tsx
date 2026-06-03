"use client";

import { useMemo, useEffect, useState, useRef } from "react";
import * as d3 from "d3";
import type { TrainingStats } from "@/lib/gan-explainer/types";

interface LossChartProps {
  stats: TrainingStats;
  onHover?: (iteration: number) => void;
  selectedIteration?: number;
}

export function LossChart({ stats, onHover, selectedIteration }: LossChartProps) {
  const [isClient, setIsClient] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const { generatorLoss, discriminatorLoss } = stats;
  const width = 280;
  const height = 160;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };

  useEffect(() => {
    if (!isClient || !svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;

    const xScale = d3.scaleLinear()
      .domain([0, generatorLoss.length - 1])
      .range([0, innerWidth]);

    const yMax = Math.max(...generatorLoss, ...discriminatorLoss);
    const yMin = Math.min(...generatorLoss, ...discriminatorLoss);
    const yScale = d3.scaleLinear()
      .domain([yMin - 0.2, yMax + 0.2])
      .range([innerHeight, 0]);

    const g = svg
      .append("g")
      .attr("transform", `translate(${padding.left}, ${padding.top})`);

    g.append("g")
      .call(d3.axisLeft(yScale).ticks(4));

    g.append("g")
      .attr("transform", `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(5));

    const genLine = d3.line<number>()
      .x((_, i) => xScale(i))
      .y((d) => yScale(d))
      .curve(d3.curveMonotoneX);

    const discLine = d3.line<number>()
      .x((_, i) => xScale(i))
      .y((d) => yScale(d))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(generatorLoss)
      .attr("fill", "none")
      .attr("stroke", "#22c55e")
      .attr("stroke-width", 2)
      .attr("d", genLine);

    g.append("path")
      .datum(discriminatorLoss)
      .attr("fill", "none")
      .attr("stroke", "#ef4444")
      .attr("d", discLine);

    const tooltip = d3.select("body")
      .append("div")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background", "#1a1713")
      .style("color", "white")
      .style("padding", "8px 12px")
      .style("border-radius", "6px")
      .style("font-size", "12px")
      .style("pointer-events", "none");

    g.selectAll("circle.gen-point")
      .data(generatorLoss)
      .enter()
      .append("circle")
      .attr("class", "gen-point")
      .attr("cx", (_, i) => xScale(i))
      .attr("cy", (d) => yScale(d))
      .attr("r", 3)
      .attr("fill", "#22c55e")
      .style("opacity", 0)
      .on("mouseover", function(event, d) {
        const i = generatorLoss.indexOf(d);
        d3.select(this).transition().attr("r", 5);
        tooltip.style("visibility", "visible")
          .html(`Iteration: ${i}<br>Gen Loss: ${d.toFixed(2)}<br>Disc Loss: ${discriminatorLoss[i].toFixed(2)}`);
        onHover?.(i);
      })
      .on("mousemove", function(event) {
        tooltip.style("top", (event.pageY - 10) + "px")
          .style("left", (event.pageX + 10) + "px");
      })
      .on("mouseout", function() {
        d3.select(this).transition().attr("r", 3);
        tooltip.style("visibility", "hidden");
        onHover?.(-1);
      });

  }, [generatorLoss, discriminatorLoss, isClient, onHover]);

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-40 text-ink-3">
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <svg ref={svgRef} width={width} height={height} />
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-2">
          <span className="w-3 h-0.5 bg-[#22c55e]" />
          <span className="text-xs text-ink-3">Generator Loss</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-0.5 bg-[#ef4444]" />
          <span className="text-xs text-ink-3">Discriminator Loss</span>
        </div>
      </div>
      {selectedIteration !== undefined && selectedIteration >= 0 && (
        <div className="mt-2 text-xs text-ink-3">
          当前迭代: {selectedIteration}
        </div>
      )}
    </div>
  );
}