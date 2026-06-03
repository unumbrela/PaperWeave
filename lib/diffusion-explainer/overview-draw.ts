import * as d3 from "d3";
import { Diffusion, DrawContext } from "./types";
import { drawNodeContent, getLinkColor } from "./draw-utils";
import { NODE_LENGTH, GAP_RATIO, LAYER_LABELS } from "./config";

export function drawDiffusion(
  container: HTMLElement,
  diffusion: Diffusion,
  rangeType: "local" | "module" | "global",
  detailedMode: boolean
): void {
  const rect = container.getBoundingClientRect();
  const width = rect.width;
  const height = Math.min(rect.height, 400);
  
  d3.select(container).selectAll("svg").remove();
  
  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");
  
  const nodeLength = Math.min(NODE_LENGTH, width / 8);
  const numLayers = diffusion.layers.length;
  
  const totalGap = width - nodeLength * numLayers;
  const hSpaceAroundGap = totalGap / (numLayers + GAP_RATIO);
  
  const ctx: DrawContext = {
    width,
    height,
    nodeLength,
    hSpaceAroundGap,
    vSpaceAroundGap: 0,
    gapRatio: GAP_RATIO,
  };
  
  const edgeGroup = svg.append("g").attr("class", "edge-group");
  
  const centerY = height / 2;
  
  diffusion.links.forEach((link) => {
    const sourceMatch = link.source.match(/node-(\d+)-(\d+)/);
    const destMatch = link.dest.match(/node-(\d+)-(\d+)/);
    
    if (!sourceMatch || !destMatch) return;
    
    const sourceLayer = parseInt(sourceMatch[1]);
    const destLayer = parseInt(destMatch[1]);
    
    const sourceX = sourceLayer * (nodeLength + hSpaceAroundGap) + nodeLength / 2;
    const destX = destLayer * (nodeLength + hSpaceAroundGap) + nodeLength / 2;
    
    const midX = (sourceX + destX) / 2;
    
    const pathD = `M ${sourceX} ${centerY} Q ${midX} ${centerY - 30} ${destX} ${centerY}`;
    
    edgeGroup
      .append("path")
      .attr("d", pathD)
      .attr("stroke", getLinkColor(link.weight))
      .attr("stroke-width", link.weight ? link.weight * 2 : 1)
      .attr("fill", "none")
      .attr("stroke-linecap", "round");
    
    edgeGroup
      .append("circle")
      .attr("cx", midX)
      .attr("cy", centerY - 30)
      .attr("r", 4)
      .attr("fill", "#8b5cf6")
      .attr("opacity", 0.6);
  });
  
  const layerGroups = svg
    .selectAll(".layer-group")
    .data(diffusion.layers)
    .enter()
    .append("g")
    .attr("class", (_, i) => `layer-group layer-${i}`);
  
  layerGroups.each(function (layer, layerIndex) {
    const layerGroup = d3.select(this);
    
    layer.forEach((node, nodeIndex) => {
      const x = layerIndex * (nodeLength + hSpaceAroundGap);
      const y = centerY - nodeLength / 2;
      
      const nodeGroup = layerGroup
        .append("g")
        .attr("id", node.id)
        .attr("transform", `translate(${x}, ${y})`);
      
      const imageData = drawNodeContent(ctx, node, x, y, nodeLength);
      
      nodeGroup
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", nodeLength)
        .attr("height", nodeLength)
        .attr("rx", 6)
        .attr("ry", 6)
        .attr("fill", "#1e1e1e")
        .attr("opacity", 0.05);
      
      nodeGroup
        .append("image")
        .attr("x", 2)
        .attr("y", 2)
        .attr("width", nodeLength - 4)
        .attr("height", nodeLength - 4)
        .attr("href", imageData)
        .attr("preserveAspectRatio", "xMidYMid slice")
        .attr("rx", 4)
        .attr("ry", 4);
      
      nodeGroup
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", nodeLength)
        .attr("height", nodeLength)
        .attr("rx", 6)
        .attr("ry", 6)
        .attr("fill", "none")
        .attr("stroke", "#8b5cf6")
        .attr("stroke-width", 2)
        .attr("opacity", 0)
        .attr("class", "node-border");
      
      const noiseLevel = node.noiseLevel || 0;
      const badgeColor = noiseLevel > 0.9 ? "#667eea" : noiseLevel > 0.5 ? "#f4c25a" : noiseLevel > 0.1 ? "#22c55e" : "#10b981";
      
      nodeGroup
        .append("rect")
        .attr("x", nodeLength - 18)
        .attr("y", 2)
        .attr("width", 16)
        .attr("height", 16)
        .attr("rx", 3)
        .attr("fill", badgeColor);
      
      if (node.timestep !== undefined) {
        nodeGroup
          .append("text")
          .attr("x", nodeLength - 9)
          .attr("y", 14)
          .attr("text-anchor", "middle")
          .attr("font-size", "9px")
          .attr("fill", "#ffffff")
          .attr("font-weight", "bold")
          .text(node.timestep === 100 ? "T" : node.timestep.toString());
      }
    });
  });
  
  const labelGroup = svg.append("g").attr("class", "label-group");
  
  diffusion.layers.forEach((layer, layerIndex) => {
    const x = layerIndex * (nodeLength + hSpaceAroundGap) + nodeLength / 2;
    const y = height - 25;
    
    const label = LAYER_LABELS[layer[0]?.layerName as keyof typeof LAYER_LABELS] || `Layer ${layerIndex}`;
    
    labelGroup
      .append("text")
      .attr("x", x)
      .attr("y", y)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("fill", "#666")
      .text(label);
    
    const noiseLevel = layer[0]?.noiseLevel || 0;
    const noisePercent = Math.round(noiseLevel * 100);
    
    labelGroup
      .append("text")
      .attr("x", x)
      .attr("y", y + 14)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("fill", "#999")
      .text(`${noisePercent}% noise`);
  });
  
  const arrowGroup = svg.append("g").attr("class", "arrow-group");
  
  arrowGroup
    .append("text")
    .attr("x", width - 30)
    .attr("y", centerY)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("fill", "#22c55e")
    .text("→");
  
  arrowGroup
    .append("text")
    .attr("x", width - 30)
    .attr("y", centerY + 16)
    .attr("text-anchor", "middle")
    .attr("font-size", "10px")
    .attr("fill", "#666")
    .text("去噪方向");
}