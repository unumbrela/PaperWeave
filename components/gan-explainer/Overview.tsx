"use client";

import { useEffect, useRef, useState } from "react";
import { select, easeCubicInOut, easeCubicOut } from "d3";

import { overviewConfig } from "@/lib/gan-explainer/config";
import {
  drawGAN,
  updateGAN,
  updateColorScaleLevel,
  toggleDetailedMode,
  computeLayerRanges,
  type DrawContext,
} from "@/lib/gan-explainer/overview-draw";
import type { GAN, GANNode, ScaleLevel } from "@/lib/gan-explainer/types";

const {
  svgPaddings,
  edgeInitColor,
  edgeHoverColor,
  edgeOpacity,
  edgeStrokeWidth,
} = overviewConfig;

interface OverviewProps {
  gan: GAN | null;
  scaleLevel: ScaleLevel;
  detailedMode: boolean;
  onHoverInfo?: (info: { show: boolean; text: string }) => void;
}

export function Overview({
  gan,
  scaleLevel,
  detailedMode,
  onHoverInfo,
}: OverviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const ctxRef = useRef<DrawContext | null>(null);
  const prevScaleRef = useRef<ScaleLevel>(scaleLevel);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!gan || !svgRef.current || !containerRef.current) return;
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

    const ganGroup = svg.append("g").attr("class", "gan-group");
    svg.append("g").attr("class", "underneath");

    const { ranges, minMax } = computeLayerRanges(gan);

    const ctx: DrawContext = {
      svg,
      gan,
      nodeCoordinate: [],
      ganLayerRanges: ranges,
      ganLayerMinMax: minMax,
      selectedScaleLevel: scaleLevel,
      detailedMode,
      hSpaceAroundGap: 0,
      vSpaceAroundGap: 0,
      width,
      height,
    };

    drawGAN(ctx, ganGroup, {
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

    ctxRef.current = ctx;
    prevScaleRef.current = scaleLevel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gan]);

  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx || !gan) return;
    if (ctx.gan === gan) return;
    const { ranges, minMax } = computeLayerRanges(gan);
    ctx.gan = gan;
    ctx.ganLayerRanges = ranges;
    ctx.ganLayerMinMax = minMax;
    updateGAN(ctx);
  }, [gan]);

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

function handleMouseOver(ctx: DrawContext, d: GANNode) {
  const { svg, gan } = ctx;
  const layerIndex = gan.findIndex((layer) => layer[0]?.layerName === d.layerName);
  if (layerIndex < 0) return;
  const nodeIndex = d.index;

  const edgeGroup = svg.select<SVGGElement>("g.gan-group").select<SVGGElement>("g.edge-group");
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
      const prevLayer = gan[prevLayerIndex];
      const hasFullConnection = d.inputLinks.length === prevLayer.length;
      
      if (hasFullConnection) {
        svg
          .select<SVGGElement>(`g#gan-layer-group-${prevLayerIndex}`)
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

function handleMouseLeave(ctx: DrawContext, d: GANNode) {
  const { svg, gan } = ctx;
  const layerIndex = gan.findIndex((layer) => layer[0]?.layerName === d.layerName);
  if (layerIndex < 0) return;
  const nodeIndex = d.index;

  const edgeGroup = svg.select<SVGGElement>("g.gan-group").select<SVGGElement>("g.edge-group");
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
      const prevLayer = gan[prevLayerIndex];
      const hasFullConnection = d.inputLinks.length === prevLayer.length;
      
      if (hasFullConnection) {
        svg
          .select<SVGGElement>(`g#gan-layer-group-${prevLayerIndex}`)
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