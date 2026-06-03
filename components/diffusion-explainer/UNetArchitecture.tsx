"use client";

import { useState } from "react";

interface UNetArchitectureProps {
  currentTimestep: number;
}

export function UNetArchitecture({ currentTimestep }: UNetArchitectureProps) {
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);
  const [hoveredLayer, setHoveredLayer] = useState<string | null>(null);

  const encoderBlocks = [
    { id: "enc1", name: "Conv 1", channels: "64", size: "256×256", y: 50 },
    { id: "enc2", name: "Conv 2", channels: "128", size: "128×128", y: 130 },
    { id: "enc3", name: "Conv 3", channels: "256", size: "64×64", y: 210 },
    { id: "enc4", name: "Conv 4", channels: "512", size: "32×32", y: 290 },
  ];

  const decoderBlocks = [
    { id: "dec1", name: "Upconv 1", channels: "256", size: "64×64", y: 50 },
    { id: "dec2", name: "Upconv 2", channels: "128", size: "128×128", y: 130 },
    { id: "dec3", name: "Upconv 3", channels: "64", size: "256×256", y: 210 },
    { id: "dec4", name: "Output", channels: "3", size: "256×256", y: 290 },
  ];

  const explanations: Record<string, string> = {
    input: "输入带噪声的图像和时间步 t 的嵌入向量",
    encoder: "编码器：通过卷积和下采样提取高级特征，逐渐降低空间分辨率",
    bottleneck: "瓶颈层：特征图最小（16×16），语义信息最抽象，包含1024通道",
    decoder: "解码器：通过反卷积和上采样恢复空间分辨率",
    skip: "跳跃连接：保留编码器的细节信息，在解码时与上采样特征融合",
    output: "输出去噪后的图像预测（3通道RGB）",
    timestep: `时间步嵌入：将 t=${currentTimestep} 转换为向量，注入到网络各层以调节去噪强度`,
    enc1: "第1层：输入图像 256×256×3，提取低层特征（边缘、纹理）",
    enc2: "第2层：特征图 128×128，提取中层特征（形状、部分）",
    enc3: "第3层：特征图 64×64，提取高层特征（部件、语义）",
    enc4: "第4层：特征图 32×32，提取最抽象的特征表示",
    dec1: "第1层：特征图 64×64，结合跳跃连接恢复细节",
    dec2: "第2层：特征图 128×128，逐步恢复空间信息",
    dec3: "第3层：特征图 256×256，接近原始分辨率",
    dec4: "输出层：生成去噪后的 256×256×3 图像",
  };

  return (
    <div className="rise surface rounded-2xl overflow-hidden border border-[var(--line)] p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="serif text-lg text-ink">U-Net 架构详解</h3>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">时间步 t={currentTimestep}</span>
        </div>
      </div>
      
      {hoveredPart && (
        <div className="mb-4 p-3 bg-purple-50 rounded-lg">
          <p className="text-sm text-ink-700">{explanations[hoveredPart]}</p>
        </div>
      )}
      
      <div className="relative overflow-x-auto">
        <div className="min-w-[1000px]">
          <svg viewBox="0 0 1000 400" className="w-full h-auto">
            <defs>
              <linearGradient id="encoderGradUNet" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#667eea" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
              <linearGradient id="decoderGradUNet" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
              <linearGradient id="bottleneckGradUNet" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
              <marker id="arrowUp" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
                <path d="M4,0 L0,8 L8,8 Z" fill="#8b5cf6" />
              </marker>
              <marker id="arrowDown" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
                <path d="M0,0 L8,0 L4,8 Z" fill="#22c55e" />
              </marker>
              <marker id="arrowRight" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 Z" fill="#8b5cf6" />
              </marker>
              <filter id="glowUNet">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* 标题 */}
            <text x="80" y="25" textAnchor="middle" fill="#666" fontSize="14" fontWeight="bold">输入层</text>
            <text x="250" y="25" textAnchor="middle" fill="#666" fontSize="14" fontWeight="bold">编码器</text>
            <text x="500" y="25" textAnchor="middle" fill="#666" fontSize="14" fontWeight="bold">瓶颈层</text>
            <text x="750" y="25" textAnchor="middle" fill="#666" fontSize="14" fontWeight="bold">解码器</text>
            <text x="920" y="25" textAnchor="middle" fill="#666" fontSize="14" fontWeight="bold">输出层</text>

            {/* 输入层 */}
            <g className="cursor-pointer" onMouseEnter={() => setHoveredPart("input")} onMouseLeave={() => setHoveredPart(null)}>
              <rect x="30" y="45" width="100" height="60" rx="8" fill="#8b5cf6" stroke="white" strokeWidth="2" />
              <text x="80" y="75" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">图像输入</text>
              <text x="80" y="95" textAnchor="middle" fill="white" fontSize="10">256×256×3</text>
            </g>

            {/* 时间步嵌入 */}
            <g className="cursor-pointer" onMouseEnter={() => setHoveredPart("timestep")} onMouseLeave={() => setHoveredPart(null)}>
              <rect x="30" y="120" width="100" height="50" rx="6" fill="#f4c25a" stroke="white" strokeWidth="2" />
              <text x="80" y="150" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">t</text>
            </g>

            {/* 编码器 */}
            <g onMouseEnter={() => setHoveredPart("encoder")} onMouseLeave={() => setHoveredPart(null)}>
              {encoderBlocks.map((block, i) => (
                <g key={block.id}>
                  <rect
                    x="180"
                    y={block.y}
                    width="140"
                    height="60"
                    rx="6"
                    fill="url(#encoderGradUNet)"
                    stroke={hoveredLayer === block.id ? "#fff" : "rgba(255,255,255,0.3)"}
                    strokeWidth={hoveredLayer === block.id ? "3" : "2"}
                    className="cursor-pointer transition-all"
                    onMouseEnter={() => setHoveredLayer(block.id)}
                    onMouseLeave={() => setHoveredLayer(null)}
                    filter={hoveredLayer === block.id ? "url(#glowUNet)" : ""}
                  />
                  <text x={180 + 70} y={block.y + 25} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">{block.name}</text>
                  <text x={180 + 70} y={block.y + 45} textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="9">{block.channels} channels | {block.size}</text>
                  
                  {i < encoderBlocks.length - 1 && (
                    <line x1={180 + 70} y1={block.y + 60} x2={180 + 70} y2={encoderBlocks[i+1].y} stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeDasharray="4,4" markerEnd="url(#arrowDown)" />
                  )}
                </g>
              ))}
            </g>

            {/* 瓶颈层 */}
            <g className="cursor-pointer" onMouseEnter={() => setHoveredPart("bottleneck")} onMouseLeave={() => setHoveredPart(null)}>
              <rect x="430" y="150" width="140" height="100" rx="8" fill="url(#bottleneckGradUNet)" stroke="white" strokeWidth="2" />
              <text x="500" y="190" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">Bottleneck</text>
              <text x="500" y="215" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="11">1024 channels</text>
              <text x="500" y="235" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="11">16×16</text>
            </g>

            {/* 解码器 */}
            <g onMouseEnter={() => setHoveredPart("decoder")} onMouseLeave={() => setHoveredPart(null)}>
              {decoderBlocks.map((block, i) => (
                <g key={block.id}>
                  <rect
                    x="680"
                    y={block.y}
                    width="140"
                    height="60"
                    rx="6"
                    fill="url(#decoderGradUNet)"
                    stroke={hoveredLayer === block.id ? "#fff" : "rgba(255,255,255,0.3)"}
                    strokeWidth={hoveredLayer === block.id ? "3" : "2"}
                    className="cursor-pointer transition-all"
                    onMouseEnter={() => setHoveredLayer(block.id)}
                    onMouseLeave={() => setHoveredLayer(null)}
                    filter={hoveredLayer === block.id ? "url(#glowUNet)" : ""}
                  />
                  <text x={680 + 70} y={block.y + 25} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">{block.name}</text>
                  <text x={680 + 70} y={block.y + 45} textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="9">{block.channels} channels | {block.size}</text>
                  
                  {i < decoderBlocks.length - 1 && (
                    <line x1={680 + 70} y1={block.y + 60} x2={680 + 70} y2={decoderBlocks[i+1].y} stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeDasharray="4,4" markerEnd="url(#arrowDown)" />
                  )}
                </g>
              ))}
            </g>

            {/* 输出层 */}
            <g className="cursor-pointer" onMouseEnter={() => setHoveredPart("output")} onMouseLeave={() => setHoveredPart(null)}>
              <rect x="880" y="290" width="80" height="60" rx="6" fill="#059669" stroke="white" strokeWidth="2" />
              <text x="920" y="320" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">去噪图像</text>
              <text x="920" y="340" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="10">256×256×3</text>
            </g>

            {/* 跳跃连接 */}
            <text x="500" y="360" textAnchor="middle" fill="#666" fontSize="12" fontWeight="bold">跳跃连接</text>
            <g onMouseEnter={() => setHoveredPart("skip")} onMouseLeave={() => setHoveredPart(null)}>
              {[0, 1, 2].map((i) => {
                const encoderY = encoderBlocks[i].y + 30;
                const decoderY = decoderBlocks[3 - i - 1].y + 30;
                return (
                  <g key={`skip-${i}`}>
                    <path
                      d={`M ${180 + 140} ${encoderY} 
                          Q ${350} ${encoderY}, ${350} ${decoderY}
                          Q ${350} ${decoderY}, ${680} ${decoderY}`}
                      fill="none"
                      stroke="#f4c25a"
                      strokeWidth="3"
                      strokeDasharray="6,4"
                      opacity={hoveredPart === "skip" ? 1 : 0.6}
                      className="cursor-pointer transition-opacity"
                    />
                    <circle cx={350} cy={decoderY} r="4" fill="#f4c25a" />
                  </g>
                );
              })}
            </g>

            {/* 连接箭头 */}
            <path d="M 130 75 L 180 75" stroke="#8b5cf6" strokeWidth="2" markerEnd="url(#arrowRight)" />
            <path d="M 320 290 L 430 290" stroke="#8b5cf6" strokeWidth="2" markerEnd="url(#arrowRight)" />
            <path d="M 570 200 L 680 180" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrowRight)" />
            <path d="M 820 290 L 880 320" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrowRight)" />

            {/* 时间步注入线 */}
            <path d="M 130 145 L 180 145" stroke="#f4c25a" strokeWidth="2" strokeDasharray="4,4" markerEnd="url(#arrowRight)" />
            <line x1={180 + 70} y1={70} x2={680 + 70} y2={70} stroke="#f4c25a" strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />
            <line x1={180 + 70} y1={150} x2={680 + 70} y2={150} stroke="#f4c25a" strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />
            <line x1={180 + 70} y1={230} x2={680 + 70} y2={230} stroke="#f4c25a" strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />
            <line x1={180 + 70} y1={310} x2={680 + 70} y2={310} stroke="#f4c25a" strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />

          </svg>
        </div>
      </div>
      
      <div className="mt-6 grid grid-cols-5 gap-3">
        <div className="p-2 bg-purple-50 rounded-lg text-center">
          <div className="w-6 h-1.5 mx-auto rounded-full bg-gradient-to-r from-[#667eea] to-[#8b5cf6] mb-1"></div>
          <div className="text-xs text-ink-600">编码器</div>
        </div>
        <div className="p-2 bg-pink-50 rounded-lg text-center">
          <div className="w-6 h-1.5 mx-auto rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] mb-1"></div>
          <div className="text-xs text-ink-600">瓶颈层</div>
        </div>
        <div className="p-2 bg-green-50 rounded-lg text-center">
          <div className="w-6 h-1.5 mx-auto rounded-full bg-gradient-to-r from-[#22c55e] to-[#10b981] mb-1"></div>
          <div className="text-xs text-ink-600">解码器</div>
        </div>
        <div className="p-2 bg-yellow-50 rounded-lg text-center">
          <div className="w-6 h-1.5 mx-auto rounded-full bg-[#f4c25a] mb-1"></div>
          <div className="text-xs text-ink-600">跳跃连接</div>
        </div>
        <div className="p-2 bg-gray-50 rounded-lg text-center">
          <div className="w-6 h-1.5 mx-auto rounded-full bg-[#f4c25a] mb-1"></div>
          <div className="text-xs text-ink-600">时间步注入</div>
        </div>
      </div>
    </div>
  );
}