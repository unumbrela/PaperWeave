"use client";

import { useEffect, useRef } from "react";
import { select, easeCubicInOut, easeCubicOut } from "d3";

import { overviewConfig } from "@/lib/cnn-explainer/config";
import {
  drawCNN,
  updateCNN,
  updateColorScaleLevel,
  toggleDetailedMode,
  computeLayerRanges,
  type DrawContext,
} from "@/lib/cnn-explainer/overview-draw";
import type { CNN, CNNNode, ScaleLevel } from "@/lib/cnn-explainer/types";

const {
  svgPaddings,
  edgeInitColor,
  edgeHoverColor,
  edgeOpacity,
  edgeStrokeWidth,
} = overviewConfig;

interface OverviewProps {
  cnn: CNN | null;
  scaleLevel: ScaleLevel;
  detailedMode: boolean;
  onHoverInfo?: (info: { show: boolean; text: string }) => void;
}

export function Overview({
  cnn,
  scaleLevel,
  detailedMode,
  onHoverInfo,
}: OverviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const ctxRef = useRef<DrawContext | null>(null);
  const prevScaleRef = useRef<ScaleLevel>(scaleLevel);
  const initializedRef = useRef(false);

  // INITIAL DRAW (once when first cnn arrives)
  useEffect(() => {
    if (!cnn || !svgRef.current || !containerRef.current) return;
    if (initializedRef.current) return;
    initializedRef.current = true;

    const wholeSvg = select(svgRef.current);
    // Clear prior content (defensive)
    wholeSvg.selectAll("*").remove();

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    wholeSvg.attr("width", containerWidth).attr("height", containerHeight);

    const svg = wholeSvg
      .append("g")
      .attr("class", "main-svg")
      .attr("transform", `translate(${svgPaddings.left}, 0)`);

    const width = containerWidth - svgPaddings.left - svgPaddings.right;
    const height = containerHeight - svgPaddings.top - svgPaddings.bottom;

    const cnnGroup = svg.append("g").attr("class", "cnn-group");
    svg.append("g").attr("class", "underneath");

    const { ranges, minMax } = computeLayerRanges(cnn);

    const ctx: DrawContext = {
      svg,
      cnn,
      nodeCoordinate: [],
      cnnLayerRanges: ranges,
      cnnLayerMinMax: minMax,
      selectedScaleLevel: scaleLevel,
      detailedMode,
      hSpaceAroundGap: 0,
      vSpaceAroundGap: 0,
      width,
      height,
    };

    drawCNN(ctx, cnnGroup, {
      onMouseOver: (event, d) => {
        void event;
        handleMouseOver(ctx, d);
      },
      onMouseLeave: (event, d) => {
        void event;
        handleMouseLeave(ctx, d);
      },
      onClick: () => {
        // Detail-view click-through not implemented in scope B.
      },
      onHoverInfo,
    });

    ctxRef.current = ctx;
    prevScaleRef.current = scaleLevel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cnn]);

  // UPDATE on cnn change (image swap → new activations)
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx || !cnn) return;
    if (ctx.cnn === cnn) return;
    const { ranges, minMax } = computeLayerRanges(cnn);
    ctx.cnn = cnn;
    ctx.cnnLayerRanges = ranges;
    ctx.cnnLayerMinMax = minMax;
    updateCNN(ctx);
  }, [cnn]);

  // UPDATE scale level
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    if (prevScaleRef.current === scaleLevel) return;
    const prev = prevScaleRef.current;
    ctx.selectedScaleLevel = scaleLevel;
    updateColorScaleLevel(ctx, prev);
    prevScaleRef.current = scaleLevel;
  }, [scaleLevel]);

  // UPDATE detailed mode
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.detailedMode = detailedMode;
    toggleDetailedMode(ctx);
  }, [detailedMode]);

  return (
    <div
      ref={containerRef}
      className="w-full"
      style={{ height: "clamp(440px, 62vh, 640px)" }}
    >
      <svg
        ref={svgRef}
        className="block"
        style={{ width: "100%", height: "100%", overflow: "visible" }}
      />
    </div>
  );
}

function handleMouseOver(ctx: DrawContext, d: CNNNode) {
  const { svg, cnn } = ctx;
  const layerIndex = cnn.findIndex((layer) => layer[0]?.layerName === d.layerName);
  if (layerIndex < 0) return;
  const nodeIndex = d.index;

  const edgeGroup = svg.select<SVGGElement>("g.cnn-group").select<SVGGElement>("g.edge-group");
  edgeGroup
    .selectAll<SVGPathElement, unknown>(`path.edge-${layerIndex}-${nodeIndex}`)
    .raise()
    .transition()
    .ease(easeCubicInOut)
    .duration(400)
    .style("stroke", edgeHoverColor)
    .style("stroke-width", 1)
    .style("opacity", 1);

  svg
    .select<SVGGElement>(`g#layer-${layerIndex}-node-${nodeIndex}`)
    .select("rect.bounding")
    .classed("hidden", false);

  if (d.inputLinks.length === 1) {
    const src = d.inputLinks[0].source;
    const srcLayerIndex = cnn.findIndex((layer) => layer[0]?.layerName === src.layerName);
    if (srcLayerIndex >= 0) {
      svg
        .select<SVGGElement>(`g#layer-${srcLayerIndex}-node-${src.index}`)
        .select("rect.bounding")
        .classed("hidden", false);
    }
  } else if (d.inputLinks.length > 1 && layerIndex > 0) {
    svg
      .select<SVGGElement>(`g#cnn-layer-group-${layerIndex - 1}`)
      .selectAll<SVGRectElement, unknown>("rect.bounding")
      .classed("hidden", false);
  }

  if (d.layerName === "output") {
    svg
      .select<SVGGElement>(`g#layer-${layerIndex}-node-${nodeIndex}`)
      .select<SVGTextElement>("text.output-text")
      .style("opacity", 0.9)
      .style("text-decoration", "underline");
  }
}

function handleMouseLeave(ctx: DrawContext, d: CNNNode) {
  const { svg, cnn } = ctx;
  const layerIndex = cnn.findIndex((layer) => layer[0]?.layerName === d.layerName);
  if (layerIndex < 0) return;
  const nodeIndex = d.index;

  const edgeGroup = svg.select<SVGGElement>("g.cnn-group").select<SVGGElement>("g.edge-group");
  edgeGroup
    .selectAll<SVGPathElement, unknown>(`path.edge-${layerIndex}-${nodeIndex}`)
    .transition()
    .ease(easeCubicOut)
    .duration(200)
    .style("stroke", edgeInitColor)
    .style("stroke-width", edgeStrokeWidth)
    .style("opacity", edgeOpacity);

  svg
    .select<SVGGElement>(`g#layer-${layerIndex}-node-${nodeIndex}`)
    .select("rect.bounding")
    .classed("hidden", true);

  if (d.inputLinks.length === 1) {
    const src = d.inputLinks[0].source;
    const srcLayerIndex = cnn.findIndex((layer) => layer[0]?.layerName === src.layerName);
    if (srcLayerIndex >= 0) {
      svg
        .select<SVGGElement>(`g#layer-${srcLayerIndex}-node-${src.index}`)
        .select("rect.bounding")
        .classed("hidden", true);
    }
  } else if (d.inputLinks.length > 1 && layerIndex > 0) {
    svg
      .select<SVGGElement>(`g#cnn-layer-group-${layerIndex - 1}`)
      .selectAll<SVGRectElement, unknown>("rect.bounding")
      .classed("hidden", true);
  }

  if (d.layerName === "output") {
    svg
      .select<SVGGElement>(`g#layer-${layerIndex}-node-${nodeIndex}`)
      .select<SVGTextElement>("text.output-text")
      .style("opacity", 0.6)
      .style("text-decoration", "none");
  }
}
