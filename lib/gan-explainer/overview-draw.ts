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
import type { GAN, GANNode, LayerRanges, LayerMinMax, ScaleLevel, Scalar2D } from "./types";

const {
  nodeLength,
  numLayers,
  edgeOpacity,
  edgeInitColor,
  edgeStrokeWidth,
  gradientEdgeColor,
  gradientStrokeWidth,
  svgPaddings,
  gapRatio,
} = overviewConfig;

const formater = format(".4f");

export interface DrawContext {
  svg: Selection<SVGGElement, unknown, null, undefined>;
  gan: GAN;
  nodeCoordinate: { x: number; y: number }[][];
  ganLayerRanges: LayerRanges & { output: [number, number] };
  ganLayerMinMax: LayerMinMax[];
  selectedScaleLevel: ScaleLevel;
  detailedMode: boolean;
  hSpaceAroundGap: number;
  vSpaceAroundGap: number;
  width: number;
  height: number;
}

export function drawOutput(
  d: GANNode,
  image: SVGImageElement,
  range: number,
) {
  let colorScale: (t: number) => string;
  
  switch (d.type) {
    case "noise":
      colorScale = layerColorScales.noise;
      break;
    case "generator-layer":
      colorScale = layerColorScales.generatorLayer;
      break;
    case "generated-image":
    case "real-image":
      colorScale = layerColorScales.generator;
      break;
    case "discriminator-layer":
      colorScale = layerColorScales.discriminatorLayer;
      break;
    case "output":
    default:
      colorScale = layerColorScales.output;
  }

  const output = d.output;
  const imageLength = typeof output === "number" ? 1 : Math.min((output as Scalar2D).length, 16);

  const bufferCanvas = document.createElement("canvas");
  const bufferContext = bufferCanvas.getContext("2d")!;
  bufferCanvas.width = imageLength;
  bufferCanvas.height = imageLength;

  const imageSingle = bufferContext.getImageData(0, 0, imageLength, imageLength);
  const arr = imageSingle.data;

  if (imageLength === 1) {
    const val = (output as number + 1) / 2;
    const color = rgb(colorScale(val));
    arr[0] = color.r;
    arr[1] = color.g;
    arr[2] = color.b;
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

export function computeLayerRanges(gan: GAN): {
  ranges: LayerRanges & { output: [number, number] };
  minMax: LayerMinMax[];
} {
  const local: number[] = [1];
  const minMax: LayerMinMax[] = [];
  let curRange: number | undefined;

  for (let l = 0; l < gan.length - 1; l++) {
    const layer = gan[l];
    const extents = layer.map((n) => getExtent(n.output as number | Scalar2D));
    const agg = extents.reduce(
      (acc, cur) => [Math.min(acc[0], cur[0]), Math.max(acc[1], cur[1])] as [number, number],
      [Infinity, -Infinity] as [number, number],
    );
    minMax.push({ min: agg[0], max: agg[1] });

    if (layer[0].type === "generator-layer" || layer[0].type === "discriminator-layer") {
      const absAgg = agg.map(Math.abs) as [number, number];
      curRange = 2 * (0.1 + Math.round(Math.max(...absAgg) * 1000) / 1000);
    }
    if (curRange !== undefined) local.push(curRange);
  }
  local.push(1);
  minMax.push({ min: 0, max: 1 });

  const moduleRanges: number[] = [1];
  const genMax = Math.max(...local.slice(1, 5));
  for (let i = 0; i < 4; i++) moduleRanges.push(genMax);
  const discMax = Math.max(...local.slice(5, 9));
  for (let i = 0; i < 4; i++) moduleRanges.push(discMax);
  moduleRanges.push(1);

  const global: number[] = [1];
  const gMax = Math.max(...local.slice(1, local.length - 1));
  for (let i = 0; i < numLayers - 2; i++) global.push(gMax);
  global.push(1);

  const output = [0, d3max(gan[gan.length - 1], (d) => {
    const out = d.output;
    if (typeof out === "number") {
      return out;
    }
    return Math.max(...(out as Scalar2D).flat());
  }) ?? 1] as [number, number];

  return {
    ranges: { local, module: moduleRanges, global, output },
    minMax,
  };
}

export interface NodeEventHandlers {
  onMouseOver: (event: MouseEvent, d: GANNode, index: number, group: SVGGElement[]) => void;
  onMouseLeave: (event: MouseEvent, d: GANNode, index: number, group: SVGGElement[]) => void;
  onClick: (event: MouseEvent, d: GANNode) => void;
  onHoverInfo?: (info: { show: boolean; text: string }) => void;
}

function drawLegends(
  ctx: DrawContext,
  legends: Selection<SVGGElement, unknown, null, undefined>,
  legendHeight: number,
) {
  const { ganLayerRanges, nodeCoordinate, hSpaceAroundGap, selectedScaleLevel, detailedMode } = ctx;

  const gStart = 1;
  const gRange = ganLayerRanges.global[gStart];
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
    .style("fill", "url(#genGradient)");

  const outputRectScale = scaleLinear()
    .domain(ganLayerRanges.output)
    .range([0, nodeLength - 1.2]);
  const outputAxis = axisBottom(outputRectScale)
    .tickFormat(format(".1f"))
    .tickValues([0, ganLayerRanges.output[1]]);
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

export function drawGAN(
  ctx: DrawContext,
  ganGroup: Selection<SVGGElement, unknown, null, undefined>,
  handlers: NodeEventHandlers,
) {
  const { svg, gan, width, height } = ctx;
  const nodeCoordinate = ctx.nodeCoordinate;

  ctx.hSpaceAroundGap = (width - nodeLength * numLayers) / (5 + 3 * gapRatio);
  const hSpaceAroundGap = ctx.hSpaceAroundGap;
  let leftAccumulated = 0;

  for (let l = 0; l < gan.length; l++) {
    const curLayer = gan[l];
    const isOutput = curLayer[0].type === "output";
    nodeCoordinate.push([]);

    if (isOutput || curLayer[0].type === "generated-image" || curLayer[0].type === "real-image") {
      leftAccumulated += hSpaceAroundGap * gapRatio;
    } else {
      leftAccumulated += hSpaceAroundGap;
    }
    const left = leftAccumulated;

    const layerGroup = ganGroup
      .append("g")
      .attr("class", "gan-layer-group")
      .attr("id", `gan-layer-group-${l}`);

    ctx.vSpaceAroundGap =
      (height - nodeLength * curLayer.length) / (curLayer.length + 1);
    const vSpaceAroundGap = ctx.vSpaceAroundGap;

    const nodeGroups = layerGroup
      .selectAll<SVGGElement, GANNode>("g.node-group")
      .data(curLayer, (d) => (d as GANNode).index)
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

    if (curLayer[0].type === "generated-image") {
      nodeGroups
        .append("rect")
        .attr("class", "generated-indicator")
        .attr("width", 6)
        .attr("height", 6)
        .attr("x", left + 4)
        .attr("y", (_d, i) => nodeCoordinate[l][i].y + 4)
        .style("fill", "#22c55e")
        .style("rx", 1);
    }
    if (curLayer[0].type === "real-image") {
      nodeGroups
        .append("rect")
        .attr("class", "real-indicator")
        .attr("width", 6)
        .attr("height", 6)
        .attr("x", left + 4)
        .attr("y", (_d, i) => nodeCoordinate[l][i].y + 4)
        .style("fill", "#ef4444")
        .style("rx", 1);
    }

    leftAccumulated += nodeLength;
  }

  for (let l = 0; l < gan.length; l++) {
    const range = ctx.ganLayerRanges[ctx.selectedScaleLevel][l];
    svg
      .select<SVGGElement>(`g#gan-layer-group-${l}`)
      .selectAll<SVGImageElement, GANNode>("image.node-image")
      .each(function (d) {
        drawOutput(d, this, range);
      });
  }

  const layerNames = gan.map((layer) => ({
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
      if (node.name.includes("noise")) return "Noise";
      if (node.name.includes("gen_")) return `Gen_${node.name.split("_")[1]}`;
      if (node.name.includes("generated")) return "Generated";
      if (node.name.includes("real")) return "Real";
      if (node.name.includes("disc_")) return `Disc_${node.name.split("_")[1]}`;
      return node.name;
    });

  getLegendGradient(svg, layerColorScales.generatorLayer, "genGradient");

  const legendHeight = 5;
  const legends = svg
    .append("g")
    .attr("class", "color-legend")
    .attr(
      "transform",
      `translate(0, ${svgPaddings.top + vGap * Math.max(...gan.map(l => l.length)) + vGap + nodeLength * Math.max(...gan.map(l => l.length))})`,
    );

  drawLegends(ctx, legends, legendHeight);

  const linkData = getLinkData(nodeCoordinate, gan);

  const edgeGroup = ganGroup.append("g").attr("class", "edge-group");

  const linkGen = linkHorizontal<
    { source: { x: number; y: number }; target: { x: number; y: number } },
    { x: number; y: number }
  >()
    .x((d) => d.x)
    .y((d) => d.y);

  const gradientLinks = linkData.filter((d) => d.isGradient);
  const normalLinks = linkData.filter((d) => !d.isGradient);

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

  edgeGroup
    .selectAll("path.gradient-edge")
    .data(gradientLinks)
    .enter()
    .append("path")
    .attr(
      "class",
      (d) =>
        `gradient-edge gradient-edge-${d.targetLayerIndex}-${d.targetNodeIndex}`,
    )
    .attr("d", (d) => {
      const dx = d.target.x - d.source.x;
      return `M ${d.source.x} ${d.source.y} C ${d.source.x + dx * 0.5} ${d.source.y - 20}, ${d.target.x - dx * 0.5} ${d.target.y + 20}, ${d.target.x} ${d.target.y}`;
    })
    .style("fill", "none")
    .style("stroke-width", gradientStrokeWidth)
    .style("opacity", 0.6)
    .style("stroke", gradientEdgeColor)
    .style("stroke-dasharray", "6 3");
}

export function updateGAN(ctx: DrawContext) {
  const { svg, gan, ganLayerRanges, selectedScaleLevel } = ctx;

  for (let l = 0; l < gan.length; l++) {
    const range = ganLayerRanges[selectedScaleLevel][l];
    const layerGroup = svg.select<SVGGElement>(`g#gan-layer-group-${l}`);
    const nodeGroups = layerGroup.selectAll<SVGGElement, GANNode>("g.node-group").data(gan[l]);

    nodeGroups
      .transition("disappear")
      .duration(300)
      .ease(easeCubicOut)
      .style("opacity", 0)
      .on("end", function () {
        select(this)
          .selectAll<SVGImageElement, GANNode>("image.node-image")
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
  const { svg, selectedScaleLevel, ganLayerRanges, detailedMode } = ctx;
  const indices = Array.from({ length: numLayers - 2 }, (_, i) => i + 1);
  
  indices.forEach((l) => {
    const range = ganLayerRanges[selectedScaleLevel][l];
    svg
      .select<SVGGElement>(`g#gan-layer-group-${l}`)
      .selectAll<SVGImageElement, GANNode>("image.node-image")
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
  svg.selectAll(".output-legend").classed("hidden", !detailedMode);
  svg.selectAll(".layer-detailed-label").classed("hidden", !detailedMode);
  svg.selectAll(".layer-label").classed("hidden", detailedMode);
}