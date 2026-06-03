"use client";

import { useEffect, useRef, useState } from "react";
import { select, easeCubicInOut, easeCubicOut } from "d3";

import { overviewConfig } from "@/lib/transformer-explainer/config";
import {
  drawTransformer,
  updateTransformer,
  updateColorScaleLevel,
  toggleDetailedMode,
  computeLayerRanges,
  type DrawContext,
} from "@/lib/transformer-explainer/overview-draw";
import type { Transformer, TransformerNode, ScaleLevel } from "@/lib/transformer-explainer/types";

const {
  svgPaddings,
  edgeInitColor,
  edgeHoverColor,
  edgeOpacity,
  edgeStrokeWidth,
} = overviewConfig;

interface OverviewProps {
  transformer: Transformer | null;
  scaleLevel: ScaleLevel;
  detailedMode: boolean;
  showResidual?: boolean;
  hoveredAttentionCell?: { row: number; col: number } | null;
  tokenCount?: number;
  onHoverInfo?: (info: { show: boolean; text: string }) => void;
}

export function Overview({
  transformer,
  scaleLevel,
  detailedMode,
  showResidual = true,
  hoveredAttentionCell,
  tokenCount = 8,
  onHoverInfo,
}: OverviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const ctxRef = useRef<DrawContext | null>(null);
  const prevScaleRef = useRef<ScaleLevel>(scaleLevel);
  const initializedRef = useRef(false);
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);

  useEffect(() => {
    setHoveredCell(hoveredAttentionCell || null);
  }, [hoveredAttentionCell]);

  useEffect(() => {
    if (!transformer || !svgRef.current || !containerRef.current) return;
    if (initializedRef.current) return;
    initializedRef.current = true;

    const wholeSvg = select(svgRef.current);
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

    const transformerGroup = svg.append("g").attr("class", "transformer-group");
    svg.append("g").attr("class", "underneath");

    const { ranges, minMax } = computeLayerRanges(transformer);

    const ctx: DrawContext = {
      svg,
      transformer,
      nodeCoordinate: [],
      transformerLayerRanges: ranges,
      transformerLayerMinMax: minMax,
      selectedScaleLevel: scaleLevel,
      detailedMode,
      hSpaceAroundGap: 0,
      vSpaceAroundGap: 0,
      width,
      height,
    };

    drawTransformer(ctx, transformerGroup, {
      onMouseOver: (event, d) => {
        void event;
        handleMouseOver(ctx, d);
      },
      onMouseLeave: (event, d) => {
        void event;
        handleMouseLeave(ctx, d);
      },
      onClick: () => {},
      onHoverInfo,
    });

    updateResidualVisibility(ctx, showResidual);
    updateTokenOpacity(ctx, tokenCount);

    ctxRef.current = ctx;
    prevScaleRef.current = scaleLevel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transformer]);

  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx || !transformer) return;
    if (ctx.transformer === transformer) return;
    const { ranges, minMax } = computeLayerRanges(transformer);
    ctx.transformer = transformer;
    ctx.transformerLayerRanges = ranges;
    ctx.transformerLayerMinMax = minMax;
    updateTransformer(ctx);
    updateTokenOpacity(ctx, tokenCount);
  }, [transformer, tokenCount]);

  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    if (prevScaleRef.current === scaleLevel) return;
    const prev = prevScaleRef.current;
    ctx.selectedScaleLevel = scaleLevel;
    updateColorScaleLevel(ctx, prev);
    prevScaleRef.current = scaleLevel;
  }, [scaleLevel]);

  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.detailedMode = detailedMode;
    toggleDetailedMode(ctx);
  }, [detailedMode]);

  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    updateResidualVisibility(ctx, showResidual);
  }, [showResidual]);

  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx || !hoveredCell) return;
    
    highlightAttentionConnection(ctx, hoveredCell.row, hoveredCell.col);
    
    return () => {
      unhighlightAttentionConnection(ctx);
    };
  }, [hoveredCell]);

  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    updateTokenOpacity(ctx, tokenCount);
  }, [tokenCount]);

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

function updateResidualVisibility(ctx: DrawContext, show: boolean) {
  ctx.svg
    .selectAll("g.residual-edge-group")
    .transition()
    .duration(300)
    .style("opacity", show ? 0.7 : 0);
}

function updateTokenOpacity(ctx: DrawContext, count: number) {
  for (let l = 0; l < ctx.transformer.length; l++) {
    ctx.svg
      .select<SVGGElement>(`g#transformer-layer-group-${l}`)
      .selectAll<SVGGElement, TransformerNode>("g.node-group")
      .transition()
      .duration(300)
      .style("opacity", (_, i) => (i < count ? 1 : 0.3));
  }
}

function highlightAttentionConnection(ctx: DrawContext, row: number, col: number) {
  const mhaLayerIndices: number[] = [];
  ctx.transformer.forEach((layer, index) => {
    if (layer[0]?.type === "multihead-attention") {
      mhaLayerIndices.push(index);
    }
  });

  mhaLayerIndices.forEach((layerIndex) => {
    ctx.svg
      .selectAll(`path.edge-${layerIndex}-${row}`)
      .transition()
      .duration(200)
      .style("stroke", "#f4c25a")
      .style("stroke-width", 2)
      .style("opacity", 1);
  });
}

function unhighlightAttentionConnection(ctx: DrawContext) {
  ctx.svg
    .selectAll("path.edge")
    .transition()
    .duration(200)
    .style("stroke", edgeInitColor)
    .style("stroke-width", edgeStrokeWidth)
    .style("opacity", edgeOpacity);
}

function handleMouseOver(ctx: DrawContext, d: TransformerNode) {
  const { svg, transformer } = ctx;
  const layerIndex = transformer.findIndex((layer) => layer[0]?.layerName === d.layerName);
  if (layerIndex < 0) return;
  const nodeIndex = d.index;

  const edgeGroup = svg.select<SVGGElement>("g.transformer-group").select<SVGGElement>("g.edge-group");
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

  if (d.inputLinks.length > 0) {
    const prevLayerIndex = layerIndex - 1;
    if (prevLayerIndex >= 0) {
      const prevLayer = transformer[prevLayerIndex];
      const hasFullConnection = d.inputLinks.length === prevLayer.length;
      
      if (hasFullConnection) {
        svg
          .select<SVGGElement>(`g#transformer-layer-group-${prevLayerIndex}`)
          .selectAll<SVGRectElement, unknown>("rect.bounding")
          .classed("hidden", false);
      } else {
        d.inputLinks.forEach((link) => {
          const srcIndex = link.source.index;
          svg
            .select<SVGGElement>(`g#layer-${prevLayerIndex}-node-${srcIndex}`)
            .select("rect.bounding")
            .classed("hidden", false);
        });
      }
    }
  }
}

function handleMouseLeave(ctx: DrawContext, d: TransformerNode) {
  const { svg, transformer } = ctx;
  const layerIndex = transformer.findIndex((layer) => layer[0]?.layerName === d.layerName);
  if (layerIndex < 0) return;
  const nodeIndex = d.index;

  const edgeGroup = svg.select<SVGGElement>("g.transformer-group").select<SVGGElement>("g.edge-group");
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

  if (d.inputLinks.length > 0) {
    const prevLayerIndex = layerIndex - 1;
    if (prevLayerIndex >= 0) {
      const prevLayer = transformer[prevLayerIndex];
      const hasFullConnection = d.inputLinks.length === prevLayer.length;
      
      if (hasFullConnection) {
        svg
          .select<SVGGElement>(`g#transformer-layer-group-${prevLayerIndex}`)
          .selectAll<SVGRectElement, unknown>("rect.bounding")
          .classed("hidden", true);
      } else {
        d.inputLinks.forEach((link) => {
          const srcIndex = link.source.index;
          svg
            .select<SVGGElement>(`g#layer-${prevLayerIndex}-node-${srcIndex}`)
            .select("rect.bounding")
            .classed("hidden", true);
        });
      }
    }
  }
}