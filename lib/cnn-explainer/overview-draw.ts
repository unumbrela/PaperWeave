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
import type { CNN, CNNNode, LayerRanges, LayerMinMax, ScaleLevel, Scalar2D } from "./types";

const {
  nodeLength,
  numLayers,
  edgeOpacity,
  edgeInitColor,
  edgeStrokeWidth,
  svgPaddings,
  gapRatio,
  classLists,
} = overviewConfig;

const formater = format(".4f");

export interface DrawContext {
  svg: Selection<SVGGElement, unknown, null, undefined>;
  cnn: CNN;
  nodeCoordinate: { x: number; y: number }[][];
  cnnLayerRanges: LayerRanges & { output: [number, number] };
  cnnLayerMinMax: LayerMinMax[];
  selectedScaleLevel: ScaleLevel;
  detailedMode: boolean;
  hSpaceAroundGap: number;
  vSpaceAroundGap: number;
  width: number;
  height: number;
}

/**
 * Render a node's output (feature map / fc score) as an <image> href,
 * using an offscreen canvas to upscale crispy.
 */
export function drawOutput(
  d: CNNNode,
  image: SVGImageElement,
  range: number,
) {
  // Pick the color scale for the layer type.
  let colorScale: (t: number) => string;
  if (d.type === "input") {
    colorScale = layerColorScales.input[d.index];
  } else if (d.type === "conv" || d.type === "relu" || d.type === "pool") {
    colorScale = layerColorScales.conv;
  } else if (d.type === "fc") {
    colorScale = layerColorScales.fc;
  } else {
    colorScale = layerColorScales.fc;
  }

  const output = d.output;
  const imageLength =
    typeof output === "number" ? 1 : (output as Scalar2D).length;

  const bufferCanvas = document.createElement("canvas");
  const bufferContext = bufferCanvas.getContext("2d")!;
  bufferCanvas.width = imageLength;
  bufferCanvas.height = imageLength;

  const imageSingle = bufferContext.getImageData(0, 0, imageLength, imageLength);
  const arr = imageSingle.data;

  if (imageLength === 1) {
    arr[0] = output as number;
    arr[1] = output as number;
    arr[2] = output as number;
    arr[3] = 255;
  } else {
    const out2d = output as Scalar2D;
    for (let i = 0; i < arr.length; i += 4) {
      const pixelIndex = Math.floor(i / 4);
      const row = Math.floor(pixelIndex / imageLength);
      const column = pixelIndex % imageLength;
      let color;
      if (d.type === "input" || d.type === "fc") {
        color = rgb(colorScale(1 - out2d[row][column]));
      } else {
        color = rgb(colorScale((out2d[row][column] + range / 2) / range));
      }
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
  group: Selection<SVGGElement, CNNNode, Element | null, unknown>,
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

export function computeLayerRanges(cnn: CNN): {
  ranges: LayerRanges & { output: [number, number] };
  minMax: LayerMinMax[];
} {
  const local: number[] = [1];
  const minMax: LayerMinMax[] = [];
  let curRange: number | undefined;

  for (let l = 0; l < cnn.length - 1; l++) {
    const layer = cnn[l];
    const extents = layer.map((n) => getExtent(n.output as number | Scalar2D));
    const agg = extents.reduce(
      (acc, cur) => [Math.min(acc[0], cur[0]), Math.max(acc[1], cur[1])] as [number, number],
      [Infinity, -Infinity] as [number, number],
    );
    minMax.push({ min: agg[0], max: agg[1] });

    if (layer[0].type === "conv" || layer[0].type === "fc") {
      const absAgg = agg.map(Math.abs) as [number, number];
      curRange = 2 * (0.1 + Math.round(Math.max(...absAgg) * 1000) / 1000);
    }
    if (curRange !== undefined) local.push(curRange);
  }
  local.push(1);
  minMax.push({ min: 0, max: 1 });

  const moduleRanges: number[] = [1];
  const numOfComponent = (numLayers - 2) / 5;
  for (let i = 0; i < numOfComponent; i++) {
    const curArr = local.slice(1 + 5 * i, 1 + 5 * i + 5);
    const m = Math.max(...curArr);
    for (let j = 0; j < 5; j++) moduleRanges.push(m);
  }
  moduleRanges.push(1);

  const global: number[] = [1];
  const gMax = Math.max(...local.slice(1, local.length - 1));
  for (let i = 0; i < numLayers - 2; i++) global.push(gMax);
  global.push(1);

  const output = [0, d3max(cnn[cnn.length - 1], (d) => d.output as number) ?? 1] as [number, number];

  return {
    ranges: { local, module: moduleRanges, global, output },
    minMax,
  };
}

export interface NodeEventHandlers {
  onMouseOver: (event: MouseEvent, d: CNNNode, index: number, group: SVGGElement[]) => void;
  onMouseLeave: (event: MouseEvent, d: CNNNode, index: number, group: SVGGElement[]) => void;
  onClick: (event: MouseEvent, d: CNNNode) => void;
  onHoverInfo?: (info: { show: boolean; text: string }) => void;
}

function drawLegends(
  ctx: DrawContext,
  legends: Selection<SVGGElement, unknown, null, undefined>,
  legendHeight: number,
) {
  const { cnnLayerRanges, nodeCoordinate, hSpaceAroundGap, selectedScaleLevel, detailedMode } = ctx;

  for (let i = 0; i < 2; i++) {
    const start = 1 + i * 5;
    const range1 = cnnLayerRanges.local[start];
    const range2 = cnnLayerRanges.local[start + 2];

    const s1 = scaleLinear()
      .range([0, 2 * nodeLength + hSpaceAroundGap - 1.2])
      .domain([-range1 / 2, range1 / 2]);
    const s2 = scaleLinear()
      .range([0, 3 * nodeLength + 2 * hSpaceAroundGap - 1.2])
      .domain([-range2 / 2, range2 / 2]);
    const a1 = axisBottom(s1).tickFormat(format(".2f")).tickValues([-range1 / 2, 0, range1 / 2]);
    const a2 = axisBottom(s2).tickFormat(format(".2f")).tickValues([-range2 / 2, 0, range2 / 2]);

    const l1 = legends
      .append("g")
      .attr("class", "legend local-legend")
      .attr("id", `local-legend-${i}-1`)
      .classed("hidden", !detailedMode || selectedScaleLevel !== "local")
      .attr("transform", `translate(${nodeCoordinate[start][0].x}, 0)`);
    l1.append("g").attr("transform", `translate(0, ${legendHeight - 3})`).call(a1);
    l1.append("rect")
      .attr("width", 2 * nodeLength + hSpaceAroundGap)
      .attr("height", legendHeight)
      .style("fill", "url(#convGradient)");

    const l2 = legends
      .append("g")
      .attr("class", "legend local-legend")
      .attr("id", `local-legend-${i}-2`)
      .classed("hidden", !detailedMode || selectedScaleLevel !== "local")
      .attr("transform", `translate(${nodeCoordinate[start + 2][0].x}, 0)`);
    l2.append("g").attr("transform", `translate(0, ${legendHeight - 3})`).call(a2);
    l2.append("rect")
      .attr("width", 3 * nodeLength + 2 * hSpaceAroundGap)
      .attr("height", legendHeight)
      .style("fill", "url(#convGradient)");
  }

  for (let i = 0; i < 2; i++) {
    const start = 1 + i * 5;
    const range = cnnLayerRanges.module[start];
    const s = scaleLinear()
      .range([0, 5 * nodeLength + 3 * hSpaceAroundGap + hSpaceAroundGap * gapRatio - 1.2])
      .domain([-range / 2, range / 2]);
    const a = axisBottom(s)
      .tickFormat(format(".2f"))
      .tickValues([-range / 2, -(range / 4), 0, range / 4, range / 2]);
    const g = legends
      .append("g")
      .attr("class", "legend module-legend")
      .attr("id", `module-legend-${i}`)
      .classed("hidden", !detailedMode || selectedScaleLevel !== "module")
      .attr("transform", `translate(${nodeCoordinate[start][0].x}, 0)`);
    g.append("g").attr("transform", `translate(0, ${legendHeight - 3})`).call(a);
    g.append("rect")
      .attr("width", 5 * nodeLength + 3 * hSpaceAroundGap + hSpaceAroundGap * gapRatio)
      .attr("height", legendHeight)
      .style("fill", "url(#convGradient)");
  }

  const gStart = 1;
  const gRange = cnnLayerRanges.global[gStart];
  const gs = scaleLinear()
    .range([0, 10 * nodeLength + 6 * hSpaceAroundGap + 3 * hSpaceAroundGap * gapRatio - 1.2])
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
    .attr("width", 10 * nodeLength + 6 * hSpaceAroundGap + 3 * hSpaceAroundGap * gapRatio)
    .attr("height", legendHeight)
    .style("fill", "url(#convGradient)");

  // Output legend
  const outputRectScale = scaleLinear()
    .domain(cnnLayerRanges.output)
    .range([0, nodeLength - 1.2]);
  const outputAxis = axisBottom(outputRectScale)
    .tickFormat(format(".1f"))
    .tickValues([0, cnnLayerRanges.output[1]]);
  const ol = legends
    .append("g")
    .attr("class", "legend output-legend")
    .attr("id", "output-legend")
    .classed("hidden", !detailedMode)
    .attr("transform", `translate(${nodeCoordinate[11][0].x}, 0)`);
  ol.append("g").attr("transform", `translate(0, ${legendHeight - 3})`).call(outputAxis);
  ol.append("rect")
    .attr("width", nodeLength)
    .attr("height", legendHeight)
    .style("fill", "rgba(26, 23, 19, 0.5)");

  // Input legend
  const inputScale = scaleLinear().range([0, nodeLength - 1.2]).domain([0, 1]);
  const inputAxis = axisBottom(inputScale)
    .tickFormat(format(".1f"))
    .tickValues([0, 0.5, 1]);
  const il = legends
    .append("g")
    .attr("class", "legend input-legend")
    .classed("hidden", !detailedMode)
    .attr("transform", `translate(${nodeCoordinate[0][0].x}, 0)`);
  il.append("g").attr("transform", `translate(0, ${legendHeight - 3})`).call(inputAxis);
  il.append("rect")
    .attr("x", 0.3)
    .attr("width", nodeLength - 0.3)
    .attr("height", legendHeight)
    .attr("transform", `rotate(180, ${nodeLength / 2}, ${legendHeight / 2})`)
    .style("stroke", "rgba(26, 23, 19, 0.25)")
    .style("stroke-width", 0.3)
    .style("fill", "url(#inputGradient)");
}

export function drawCNN(
  ctx: DrawContext,
  cnnGroup: Selection<SVGGElement, unknown, null, undefined>,
  handlers: NodeEventHandlers,
) {
  const { svg, cnn, width, height } = ctx;
  const nodeCoordinate = ctx.nodeCoordinate;

  ctx.hSpaceAroundGap = (width - nodeLength * numLayers) / (8 + 5 * gapRatio);
  const hSpaceAroundGap = ctx.hSpaceAroundGap;
  let leftAccumulated = 0;

  // Draw each layer's nodes
  for (let l = 0; l < cnn.length; l++) {
    const curLayer = cnn[l];
    const isOutput = curLayer[0].layerName === "output";
    nodeCoordinate.push([]);

    if (isOutput || curLayer[0].type === "conv") {
      leftAccumulated += hSpaceAroundGap * gapRatio;
    } else {
      leftAccumulated += hSpaceAroundGap;
    }
    const left = leftAccumulated;

    const layerGroup = cnnGroup
      .append("g")
      .attr("class", "cnn-layer-group")
      .attr("id", `cnn-layer-group-${l}`);

    ctx.vSpaceAroundGap =
      (height - nodeLength * curLayer.length) / (curLayer.length + 1);
    const vSpaceAroundGap = ctx.vSpaceAroundGap;

    const nodeGroups = layerGroup
      .selectAll<SVGGElement, CNNNode>("g.node-group")
      .data(curLayer, (d) => (d as CNNNode).index)
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
        if (isOutput) {
          handlers.onHoverInfo?.({
            show: true,
            text: `${classLists[d.index]} · ${formater(d.output as number)}`,
          });
        }
      })
      .on("mouseleave", function (event: MouseEvent, d) {
        const parent = this.parentNode as SVGGElement;
        const siblings = Array.from(parent.children) as SVGGElement[];
        const i = siblings.indexOf(this);
        handlers.onMouseLeave(event, d, i, siblings);
        if (isOutput) {
          handlers.onHoverInfo?.({ show: false, text: "" });
        }
      })
      .on("click", function (event: MouseEvent, d) {
        handlers.onClick(event, d);
      });

    if (!isOutput) {
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
    } else {
      nodeGroups
        .append("rect")
        .attr("class", "output-rect")
        .attr("x", left)
        .attr("y", (_d, i) => nodeCoordinate[l][i].y + nodeLength / 2 + 8)
        .attr("height", nodeLength / 4)
        .attr("width", 0)
        .style("fill", "rgba(26, 23, 19, 0.55)");
      nodeGroups
        .append("text")
        .attr("class", "output-text")
        .attr("x", left)
        .attr("y", (_d, i) => nodeCoordinate[l][i].y + nodeLength / 2)
        .style("dominant-baseline", "middle")
        .style("font-size", "11px")
        .style("fill", "var(--ink)")
        .style("opacity", 0.6)
        .text((...args) => classLists[args[1]]);
    }
    leftAccumulated += nodeLength;
  }

  // Initial output score bars
  const outputRectScale = scaleLinear()
    .domain(ctx.cnnLayerRanges.output)
    .range([0, nodeLength]);

  for (let l = 0; l < cnn.length; l++) {
    const range = ctx.cnnLayerRanges[ctx.selectedScaleLevel][l];
    svg
      .select<SVGGElement>(`g#cnn-layer-group-${l}`)
      .selectAll<SVGImageElement, CNNNode>("image.node-image")
      .each(function (d) {
        drawOutput(d, this, range);
      });
  }

  svg
    .selectAll<SVGGElement, CNNNode>("g#cnn-layer-group-11 > g.node-group")
    .each(function () {
      drawOutputScore(select<SVGGElement, CNNNode>(this), outputRectScale);
    });

  // Labels
  const layerNames = cnn.map((layer) => {
    if (layer[0].layerName === "output") {
      return { name: layer[0].layerName, dimension: `(${layer.length})` };
    }
    const out = layer[0].output as Scalar2D;
    return {
      name: layer[0].layerName,
      dimension: `(${out.length}, ${out.length}, ${layer.length})`,
    };
  });

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
    .style("font-size", "12px")
    .text((d) => d.name);
  detailedText
    .append("tspan")
    .style("font-size", "8px")
    .style("font-weight", "normal")
    .attr("x", 0)
    .attr("dy", "1.5em")
    .text((d) => d.dimension);

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
    .style("font-size", "12px")
    .text((node) => {
      if (node.name.includes("conv")) return "conv";
      if (node.name.includes("relu")) return "relu";
      if (node.name.includes("max_pool")) return "max_pool";
      return node.name;
    });

  // Color-scale gradients for legends
  getLegendGradient(svg, layerColorScales.conv, "convGradient");
  getLegendGradient(svg, layerColorScales.input[0], "inputGradient");

  const legendHeight = 5;
  const legends = svg
    .append("g")
    .attr("class", "color-legend")
    .attr(
      "transform",
      `translate(0, ${svgPaddings.top + vGap * 10 + vGap + nodeLength * 10})`,
    );

  drawLegends(ctx, legends, legendHeight);

  // Edges
  const linkGen = linkHorizontal<
    { source: { x: number; y: number }; target: { x: number; y: number } },
    { x: number; y: number }
  >()
    .x((d) => d.x)
    .y((d) => d.y);

  const linkData = getLinkData(nodeCoordinate, cnn);

  const edgeGroup = cnnGroup.append("g").attr("class", "edge-group");
  edgeGroup
    .selectAll("path.edge")
    .data(linkData)
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

  // Input channel annotations
  const inputAnnotation = cnnGroup.append("g").attr("class", "input-annotation");
  const mkChannel = (
    nodeIdx: number,
    labelTspans: Array<{ text: string; fill?: string }>,
  ) => {
    const t = inputAnnotation
      .append("text")
      .attr("x", nodeCoordinate[0][nodeIdx].x + nodeLength / 2)
      .attr("y", nodeCoordinate[0][nodeIdx].y + nodeLength + 5)
      .attr("class", "annotation-text")
      .style("dominant-baseline", "hanging")
      .style("text-anchor", "middle")
      .style("font-size", "10px")
      .style("font-style", "italic")
      .style("fill", "var(--ink-3)");
    labelTspans.forEach((s) => {
      const ts = t.append("tspan").text(s.text);
      if (s.fill) ts.style("fill", s.fill);
      ts.style("dominant-baseline", "hanging");
    });
    return t;
  };
  mkChannel(0, [
    { text: "Red", fill: "#C95E67" },
    { text: " channel" },
  ]);
  mkChannel(1, [{ text: "Green", fill: "#3DB665" }]);
  mkChannel(2, [{ text: "Blue", fill: "#3F7FBC" }]);
}

export function updateCNN(ctx: DrawContext) {
  const { svg, cnn, cnnLayerRanges, selectedScaleLevel } = ctx;

  const outputRectScale = scaleLinear()
    .domain(cnnLayerRanges.output)
    .range([0, nodeLength]);

  for (let l = 0; l < cnn.length; l++) {
    const range = cnnLayerRanges[selectedScaleLevel][l];
    const layerGroup = svg.select<SVGGElement>(`g#cnn-layer-group-${l}`);
    const nodeGroups = layerGroup.selectAll<SVGGElement, CNNNode>("g.node-group").data(cnn[l]);

    // Re-bind the fresh activations down to each group's <image> child.
    // selectAll does NOT propagate data, so without this the images keep the
    // datum they inherited at creation (the very first image) and every
    // redraw — here and in updateColorScaleLevel — would re-render that stale
    // activation (the symptom: switching/uploading images all show espresso).
    nodeGroups.select<SVGImageElement>("image.node-image");

    if (l < cnn.length - 1) {
      nodeGroups
        .transition("disappear")
        .duration(300)
        .ease(easeCubicOut)
        .style("opacity", 0)
        .on("end", function () {
          select(this)
            .selectAll<SVGImageElement, CNNNode>("image.node-image")
            .each(function (d) {
              drawOutput(d, this, range);
            });
          select(this)
            .transition("appear")
            .duration(700)
            .ease(easeCubicIn)
            .style("opacity", 1);
        });
    } else {
      nodeGroups.each(function () {
        drawOutputScore(select<SVGGElement, CNNNode>(this), outputRectScale);
      });
    }
  }
}

export function updateColorScaleLevel(ctx: DrawContext, previous: ScaleLevel) {
  const { svg, selectedScaleLevel, cnnLayerRanges, detailedMode } = ctx;
  const updatingLayerIndexDict: Record<ScaleLevel, Record<ScaleLevel, number[]>> = {
    local: {
      local: [],
      module: [1, 2, 8, 9, 10],
      global: [1, 2, 3, 4, 5, 8, 9, 10],
    },
    module: {
      local: [1, 2, 8, 9, 10],
      module: [],
      global: [1, 2, 3, 4, 5, 8, 9, 10],
    },
    global: {
      local: [1, 2, 3, 4, 5, 8, 9, 10],
      module: [1, 2, 3, 4, 5],
      global: [],
    },
  };
  const indices = updatingLayerIndexDict[previous][selectedScaleLevel];
  indices.forEach((l) => {
    const range = cnnLayerRanges[selectedScaleLevel][l];
    svg
      .select<SVGGElement>(`g#cnn-layer-group-${l}`)
      .selectAll<SVGImageElement, CNNNode>("image.node-image")
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
