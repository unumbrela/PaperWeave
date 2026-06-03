import {
  select,
  type Selection,
  linkHorizontal,
  scaleLinear,
  axisBottom,
  format,
  max as d3max,
  rgb,
  easeCubicIn,
  easeCubicOut,
} from "d3";

import { overviewConfig, layerColorScales } from "./config";
import { getExtent, getLinkData } from "./draw-utils";
import type { Transformer, TransformerNode, LayerRanges, LayerMinMax, ScaleLevel, Scalar2D } from "./types";

const {
  nodeLength,
  numLayers,
  edgeOpacity,
  edgeInitColor,
  edgeStrokeWidth,
  residualEdgeColor,
  residualEdgeWidth,
  svgPaddings,
  gapRatio,
} = overviewConfig;

const formater = format(".4f");

export interface DrawContext {
  svg: Selection<SVGGElement, unknown, null, undefined>;
  transformer: Transformer;
  nodeCoordinate: { x: number; y: number }[][];
  transformerLayerRanges: LayerRanges & { output: [number, number] };
  transformerLayerMinMax: LayerMinMax[];
  selectedScaleLevel: ScaleLevel;
  detailedMode: boolean;
  hSpaceAroundGap: number;
  vSpaceAroundGap: number;
  width: number;
  height: number;
}

export function drawOutput(
  d: TransformerNode,
  image: SVGImageElement,
  range: number,
) {
  let colorScale: (t: number) => string;
  
  switch (d.type) {
    case "input":
      colorScale = layerColorScales.input;
      break;
    case "embedding":
      colorScale = layerColorScales.embedding;
      break;
    case "multihead-attention":
      colorScale = layerColorScales.attention;
      break;
    case "layer-norm":
      colorScale = layerColorScales.layerNorm;
      break;
    case "feed-forward":
      colorScale = layerColorScales.feedForward;
      break;
    case "output":
    default:
      colorScale = layerColorScales.output;
  }

  const output = d.output;
  const imageLength = typeof output === "number" ? 1 : (output as Scalar2D).length;

  const bufferCanvas = document.createElement("canvas");
  const bufferContext = bufferCanvas.getContext("2d")!;
  bufferCanvas.width = imageLength;
  bufferCanvas.height = imageLength;

  const imageSingle = bufferContext.getImageData(0, 0, imageLength, imageLength);
  const arr = imageSingle.data;

  if (imageLength === 1) {
    arr[0] = (output as number) * 255;
    arr[1] = (output as number) * 255;
    arr[2] = (output as number) * 255;
    arr[3] = 255;
  } else {
    const out2d = output as Scalar2D;
    const maxVal = Math.max(...out2d.flat());
    const minVal = Math.min(...out2d.flat());
    const valRange = maxVal - minVal || 1;
    
    for (let i = 0; i < arr.length; i += 4) {
      const pixelIndex = Math.floor(i / 4);
      const row = Math.floor(pixelIndex / imageLength);
      const column = pixelIndex % imageLength;
      const val = out2d[row]?.[column] || 0;
      const normalized = (val - minVal) / valRange;
      const color = rgb(colorScale(normalized));
      arr[i] = color.r;
      arr[i + 1] = color.g;
      arr[i + 2] = color.b;
      arr[i + 3] = 255;
    }
  }

  const largeCanvas = document.createElement("canvas");
  largeCanvas.width = nodeLength * 3;
  largeCanvas.height = nodeLength * 3;
  const largeCtx = largeCanvas.getContext("2d")!;

  bufferContext.putImageData(imageSingle, 0, 0);
  largeCtx.imageSmoothingEnabled = false;
  largeCtx.drawImage(
    bufferCanvas,
    0,
    0,
    imageLength,
    imageLength,
    0,
    0,
    nodeLength * 3,
    nodeLength * 3,
  );

  image.setAttribute("href", largeCanvas.toDataURL());
  bufferCanvas.remove();
  largeCanvas.remove();
}

function drawOutputScore(
  group: Selection<SVGGElement, TransformerNode, Element | null, unknown>,
  scale: (n: number) => number,
) {
  group
    .select("rect.output-rect")
    .transition("output")
    .delay(500)
    .duration(800)
    .ease(easeCubicIn)
    .attr("width", (d) => scale(d.output as number));
}

function getLegendGradient(
  svg: Selection<SVGGElement, unknown, null, undefined>,
  colorScale: (t: number) => string,
  gradientName: string,
) {
  const gradient = svg
    .append("defs")
    .append("linearGradient")
    .attr("id", gradientName)
    .attr("x1", "0%")
    .attr("y1", "100%")
    .attr("x2", "100%")
    .attr("y2", "100%")
    .attr("spreadMethod", "pad");
  const interpolation = 10;
  for (let i = 0; i < interpolation; i++) {
    const p = i / (interpolation - 1);
    gradient
      .append("stop")
      .attr("offset", `${p * 100}%`)
      .attr("stop-color", colorScale(p))
      .attr("stop-opacity", 1);
  }
}

export function computeLayerRanges(transformer: Transformer): {
  ranges: LayerRanges & { output: [number, number] };
  minMax: LayerMinMax[];
} {
  const local: number[] = [1];
  const minMax: LayerMinMax[] = [];
  let curRange: number | undefined;

  for (let l = 0; l < transformer.length - 1; l++) {
    const layer = transformer[l];
    const extents = layer.map((n) => getExtent(n.output as number | Scalar2D));
    const agg = extents.reduce(
      (acc, cur) => [Math.min(acc[0], cur[0]), Math.max(acc[1], cur[1])] as [number, number],
      [Infinity, -Infinity] as [number, number],
    );
    minMax.push({ min: agg[0], max: agg[1] });

    if (layer[0].type === "multihead-attention" || layer[0].type === "feed-forward") {
      const absAgg = agg.map(Math.abs) as [number, number];
      curRange = 2 * (0.1 + Math.round(Math.max(...absAgg) * 1000) / 1000);
    }
    if (curRange !== undefined) local.push(curRange);
  }
  local.push(1);
  minMax.push({ min: 0, max: 1 });

  const moduleRanges: number[] = [1];
  const numOfComponent = (numLayers - 2) / 4;
  for (let i = 0; i < numOfComponent; i++) {
    const curArr = local.slice(1 + 4 * i, 1 + 4 * i + 4);
    const m = Math.max(...curArr);
    for (let j = 0; j < 4; j++) moduleRanges.push(m);
  }
  moduleRanges.push(1);

  const global: number[] = [1];
  const gMax = Math.max(...local.slice(1, local.length - 1));
  for (let i = 0; i < numLayers - 2; i++) global.push(gMax);
  global.push(1);

  const output = [0, d3max(transformer[transformer.length - 1], (d) => {
    const out = d.output as Scalar2D;
    return Math.max(...out.flat());
  }) ?? 1] as [number, number];

  return {
    ranges: { local, module: moduleRanges, global, output },
    minMax,
  };
}

export interface NodeEventHandlers {
  onMouseOver: (event: MouseEvent, d: TransformerNode, index: number, group: SVGGElement[]) => void;
  onMouseLeave: (event: MouseEvent, d: TransformerNode, index: number, group: SVGGElement[]) => void;
  onClick: (event: MouseEvent, d: TransformerNode) => void;
  onHoverInfo?: (info: { show: boolean; text: string }) => void;
}

function drawLegends(
  ctx: DrawContext,
  legends: Selection<SVGGElement, unknown, null, undefined>,
  legendHeight: number,
) {
  const { transformerLayerRanges, nodeCoordinate, hSpaceAroundGap, selectedScaleLevel, detailedMode } = ctx;

  const gStart = 1;
  const gRange = transformerLayerRanges.global[gStart];
  const gs = scaleLinear()
    .range([0, (numLayers - 2) * nodeLength + (numLayers - 3) * hSpaceAroundGap + 2 * hSpaceAroundGap * gapRatio - 1.2])
    .domain([-gRange / 2, gRange / 2]);
  const ga = axisBottom(gs)
    .tickFormat(format(".2f"))
    .tickValues([-gRange / 2, -(gRange / 4), 0, gRange / 4, gRange / 2]);
  const gl = legends
    .append("g")
    .attr("class", "legend global-legend")
    .attr("id", "global-legend")
    .classed("hidden", !detailedMode || selectedScaleLevel !== "global")
    .attr("transform", `translate(${nodeCoordinate[gStart][0].x}, 0)`);
  gl.append("g").attr("transform", `translate(0, ${legendHeight - 3})`).call(ga);
  gl.append("rect")
    .attr("width", (numLayers - 2) * nodeLength + (numLayers - 3) * hSpaceAroundGap + 2 * hSpaceAroundGap * gapRatio)
    .attr("height", legendHeight)
    .style("fill", "url(#convGradient)");

  const outputRectScale = scaleLinear()
    .domain(transformerLayerRanges.output)
    .range([0, nodeLength - 1.2]);
  const outputAxis = axisBottom(outputRectScale)
    .tickFormat(format(".1f"))
    .tickValues([0, transformerLayerRanges.output[1]]);
  const ol = legends
    .append("g")
    .attr("class", "legend output-legend")
    .attr("id", "output-legend")
    .classed("hidden", !detailedMode)
    .attr("transform", `translate(${nodeCoordinate[numLayers - 1][0].x}, 0)`);
  ol.append("g").attr("transform", `translate(0, ${legendHeight - 3})`).call(outputAxis);
  ol.append("rect")
    .attr("width", nodeLength)
    .attr("height", legendHeight)
    .style("fill", "rgba(26, 23, 19, 0.5)");
}

export function drawTransformer(
  ctx: DrawContext,
  transformerGroup: Selection<SVGGElement, unknown, null, undefined>,
  handlers: NodeEventHandlers,
) {
  const { svg, transformer, width, height } = ctx;
  const nodeCoordinate = ctx.nodeCoordinate;

  ctx.hSpaceAroundGap = (width - nodeLength * numLayers) / (5 + 3 * gapRatio);
  const hSpaceAroundGap = ctx.hSpaceAroundGap;
  let leftAccumulated = 0;

  for (let l = 0; l < transformer.length; l++) {
    const curLayer = transformer[l];
    const isOutput = curLayer[0].type === "output";
    nodeCoordinate.push([]);

    if (isOutput || curLayer[0].type === "multihead-attention") {
      leftAccumulated += hSpaceAroundGap * gapRatio;
    } else {
      leftAccumulated += hSpaceAroundGap;
    }
    const left = leftAccumulated;

    const layerGroup = transformerGroup
      .append("g")
      .attr("class", "transformer-layer-group")
      .attr("id", `transformer-layer-group-${l}`);

    ctx.vSpaceAroundGap =
      (height - nodeLength * curLayer.length) / (curLayer.length + 1);
    const vSpaceAroundGap = ctx.vSpaceAroundGap;

    const nodeGroups = layerGroup
      .selectAll<SVGGElement, TransformerNode>("g.node-group")
      .data(curLayer, (d) => (d as TransformerNode).index)
      .enter()
      .append("g")
      .attr("class", "node-group")
      .style("cursor", isOutput ? "default" : "pointer")
      .style("pointer-events", "all")
      .attr("id", (d, i) => {
        const top =
          i * nodeLength + (i + 1) * vSpaceAroundGap + svgPaddings.top;
        nodeCoordinate[l].push({ x: left, y: top });
        return `layer-${l}-node-${i}`;
      });

    nodeGroups
      .on("mouseover", function (event: MouseEvent, d) {
        const parent = this.parentNode as SVGGElement;
        const siblings = Array.from(parent.children) as SVGGElement[];
        const i = siblings.indexOf(this);
        handlers.onMouseOver(event, d, i, siblings);
      })
      .on("mouseleave", function (event: MouseEvent, d) {
        const parent = this.parentNode as SVGGElement;
        const siblings = Array.from(parent.children) as SVGGElement[];
        const i = siblings.indexOf(this);
        handlers.onMouseLeave(event, d, i, siblings);
      })
      .on("click", function (event: MouseEvent, d) {
        handlers.onClick(event, d);
      });

    nodeGroups
      .append("image")
      .attr("class", "node-image")
      .attr("width", nodeLength)
      .attr("height", nodeLength)
      .attr("x", left)
      .attr("y", (_d, i) => nodeCoordinate[l][i].y);

    nodeGroups
      .append("rect")
      .attr("class", "bounding")
      .attr("width", nodeLength)
      .attr("height", nodeLength)
      .attr("x", left)
      .attr("y", (_d, i) => nodeCoordinate[l][i].y)
      .style("fill", "none")
      .style("stroke", "rgba(26, 23, 19, 0.45)")
      .style("stroke-width", 1)
      .classed("hidden", true);

    if (curLayer[0]?.hasResidual) {
      nodeGroups
        .append("rect")
        .attr("class", "residual-indicator")
        .attr("width", 6)
        .attr("height", 6)
        .attr("x", left + nodeLength - 8)
        .attr("y", (_d, i) => nodeCoordinate[l][i].y + 4)
        .style("fill", residualEdgeColor)
        .style("rx", 1);
    }

    leftAccumulated += nodeLength;
  }

  for (let l = 0; l < transformer.length; l++) {
    const range = ctx.transformerLayerRanges[ctx.selectedScaleLevel][l];
    svg
      .select<SVGGElement>(`g#transformer-layer-group-${l}`)
      .selectAll<SVGImageElement, TransformerNode>("image.node-image")
      .each(function (d) {
        drawOutput(d, this, range);
      });
  }

  const layerNames = transformer.map((layer) => ({
    name: layer[0].layerName,
    type: layer[0].type,
  }));

  const vGap = ctx.vSpaceAroundGap;

  const detailedLabels = svg
    .selectAll<SVGGElement, typeof layerNames[number]>("g.layer-detailed-label")
    .data(layerNames)
    .enter()
    .append("g")
    .attr("class", "layer-detailed-label")
    .attr("id", (_d, i) => `layer-detailed-label-${i}`)
    .classed("hidden", !ctx.detailedMode)
    .attr("transform", (_d, i) => {
      const x = nodeCoordinate[i][0].x + nodeLength / 2;
      const y = (svgPaddings.top + vGap) / 2 - 6;
      return `translate(${x}, ${y})`;
    });

  const detailedText = detailedLabels
    .append("text")
    .style("opacity", 0.75)
    .style("dominant-baseline", "middle")
    .style("text-anchor", "middle")
    .style("fill", "var(--ink-2)");
  detailedText
    .append("tspan")
    .style("font-size", "11px")
    .text((d) => d.name);

  const labels = svg
    .selectAll<SVGGElement, typeof layerNames[number]>("g.layer-label")
    .data(layerNames)
    .enter()
    .append("g")
    .attr("class", "layer-label")
    .attr("id", (_d, i) => `layer-label-${i}`)
    .classed("hidden", ctx.detailedMode)
    .attr("transform", (_d, i) => {
      const x = nodeCoordinate[i][0].x + nodeLength / 2;
      const y = (svgPaddings.top + vGap) / 2 + 5;
      return `translate(${x}, ${y})`;
    });
  labels
    .append("text")
    .style("dominant-baseline", "middle")
    .style("text-anchor", "middle")
    .style("opacity", 0.75)
    .style("fill", "var(--ink-2)")
    .style("font-size", "11px")
    .text((node) => {
      if (node.name.includes("mha")) return "MHA";
      if (node.name.includes("norm")) return "Norm";
      if (node.name.includes("ffn")) return "FFN";
      return node.name;
    });

  getLegendGradient(svg, layerColorScales.attention, "convGradient");

  const legendHeight = 5;
  const legends = svg
    .append("g")
    .attr("class", "color-legend")
    .attr(
      "transform",
      `translate(0, ${svgPaddings.top + vGap * 8 + vGap + nodeLength * 8})`,
    );

  drawLegends(ctx, legends, legendHeight);

  const linkData = getLinkData(nodeCoordinate, transformer);

  const edgeGroup = transformerGroup.append("g").attr("class", "edge-group");
  const residualEdgeGroup = transformerGroup.append("g").attr("class", "residual-edge-group");

  const linkGen = linkHorizontal<
    { source: { x: number; y: number }; target: { x: number; y: number } },
    { x: number; y: number }
  >()
    .x((d) => d.x)
    .y((d) => d.y);

  const normalLinks = linkData.filter((d) => !d.isResidual);
  const residualLinks = linkData.filter((d) => d.isResidual);

  edgeGroup
    .selectAll("path.edge")
    .data(normalLinks)
    .enter()
    .append("path")
    .attr(
      "class",
      (d) =>
        `edge edge-${d.targetLayerIndex} edge-${d.targetLayerIndex}-${d.targetNodeIndex}`,
    )
    .attr(
      "id",
      (d) =>
        `edge-${d.targetLayerIndex}-${d.targetNodeIndex}-${d.sourceNodeIndex}`,
    )
    .attr("d", (d) => linkGen({ source: d.source, target: d.target }))
    .style("fill", "none")
    .style("stroke-width", edgeStrokeWidth)
    .style("opacity", edgeOpacity)
    .style("stroke", edgeInitColor);

  residualEdgeGroup
    .selectAll("path.residual-edge")
    .data(residualLinks)
    .enter()
    .append("path")
    .attr(
      "class",
      (d) =>
        `residual-edge residual-edge-${d.targetLayerIndex}-${d.targetNodeIndex}`,
    )
    .attr("d", (d) => {
      const dx = d.target.x - d.source.x;
      const arcHeight = dx * 0.3;
      return `M ${d.source.x} ${d.source.y} C ${d.source.x + dx * 0.3} ${d.source.y - arcHeight}, ${d.target.x - dx * 0.3} ${d.target.y + arcHeight}, ${d.target.x} ${d.target.y}`;
    })
    .style("fill", "none")
    .style("stroke-width", residualEdgeWidth)
    .style("opacity", 0.7)
    .style("stroke", residualEdgeColor)
    .style("stroke-dasharray", "4 2");
}

export function updateTransformer(ctx: DrawContext) {
  const { svg, transformer, transformerLayerRanges, selectedScaleLevel } = ctx;

  for (let l = 0; l < transformer.length; l++) {
    const range = transformerLayerRanges[selectedScaleLevel][l];
    const layerGroup = svg.select<SVGGElement>(`g#transformer-layer-group-${l}`);
    const nodeGroups = layerGroup.selectAll<SVGGElement, TransformerNode>("g.node-group").data(transformer[l]);

    nodeGroups
      .transition("disappear")
      .duration(300)
      .ease(easeCubicOut)
      .style("opacity", 0)
      .on("end", function () {
        select(this)
          .selectAll<SVGImageElement, TransformerNode>("image.node-image")
          .each(function (d) {
            drawOutput(d, this, range);
          });
        select(this)
          .transition("appear")
          .duration(700)
          .ease(easeCubicIn)
          .style("opacity", 1);
      });
  }
}

export function updateColorScaleLevel(ctx: DrawContext, previous: ScaleLevel) {
  const { svg, selectedScaleLevel, transformerLayerRanges, detailedMode } = ctx;
  const indices = Array.from({ length: numLayers - 2 }, (_, i) => i + 1);
  
  indices.forEach((l) => {
    const range = transformerLayerRanges[selectedScaleLevel][l];
    svg
      .select<SVGGElement>(`g#transformer-layer-group-${l}`)
      .selectAll<SVGImageElement, TransformerNode>("image.node-image")
      .each(function (d) {
        drawOutput(d, this, range);
      });
  });

  svg.selectAll(`.${previous}-legend`).classed("hidden", true);
  svg.selectAll(`.${selectedScaleLevel}-legend`).classed("hidden", !detailedMode);
}

export function toggleDetailedMode(ctx: DrawContext) {
  const { svg, selectedScaleLevel, detailedMode } = ctx;
  svg.selectAll(`.${selectedScaleLevel}-legend`).classed("hidden", !detailedMode);
  svg.selectAll(".input-legend").classed("hidden", !detailedMode);
  svg.selectAll(".output-legend").classed("hidden", !detailedMode);
  svg.selectAll(".layer-detailed-label").classed("hidden", !detailedMode);
  svg.selectAll(".layer-label").classed("hidden", detailedMode);
}