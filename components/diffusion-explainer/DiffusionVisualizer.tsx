"use client";

import { useState, useEffect, useRef, useMemo } from "react";

function generateNoiseImage(noiseLevel: number): string {
  try {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    
    if (!ctx) return "";
    
    const imageData = ctx.createImageData(size, size);
    const pixels = imageData.data;
    
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size * 0.35;
    
    for (let i = 0; i < pixels.length; i += 4) {
      const x = (i / 4) % size;
      const y = Math.floor((i / 4) / size);
      
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      let r = 245, g = 245, b = 245;
      
      if (dist < radius * 0.3) {
        r = 255; g = 220; b = 190;
      } else if (dist < radius * 0.5) {
        r = 255; g = 180; b = 140;
      } else if (dist < radius) {
        r = 200; g = 140; b = 100;
      }
      
      const noise = (Math.random() - 0.5) * 255;
      const noiseR = noise * noiseLevel;
      const noiseG = noise * noiseLevel;
      const noiseB = noise * noiseLevel;
      
      pixels[i] = Math.min(255, Math.max(0, r + noiseR));
      pixels[i + 1] = Math.min(255, Math.max(0, g + noiseG));
      pixels[i + 2] = Math.min(255, Math.max(0, b + noiseB));
      pixels[i + 3] = 255;
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return "";
  }
}

interface TimelineStep {
  timestep: number;
  label: string;
  noiseLevel: number;
  imageUrl: string;
}

export function DiffusionVisualizer() {
  const [isClient, setIsClient] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const timelineSteps = useMemo<TimelineStep[]>(() => {
    if (!isClient) return [];
    return [
      { timestep: 100, label: "t=100", noiseLevel: 1.0, imageUrl: generateNoiseImage(1.0) },
      { timestep: 90, label: "t=90", noiseLevel: 0.9, imageUrl: generateNoiseImage(0.9) },
      { timestep: 50, label: "t=50", noiseLevel: 0.5, imageUrl: generateNoiseImage(0.5) },
      { timestep: 10, label: "t=10", noiseLevel: 0.1, imageUrl: generateNoiseImage(0.1) },
      { timestep: 1, label: "t=1", noiseLevel: 0.01, imageUrl: generateNoiseImage(0.01) },
      { timestep: 0, label: "t=0", noiseLevel: 0, imageUrl: generateNoiseImage(0) },
    ];
  }, [isClient]);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = window.setInterval(() => {
        setIsProcessing(true);
        setTimeout(() => {
          setShowAnimation(true);
          setTimeout(() => {
            setShowAnimation(false);
            setCurrentStep((prev) => {
              if (prev >= timelineSteps.length - 1) {
                setIsPlaying(false);
                setIsProcessing(false);
                return prev;
              }
              setIsProcessing(false);
              return prev + 1;
            });
          }, 800);
        }, 200);
      }, 1500);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, timelineSteps.length]);

  const handleStepClick = (index: number) => {
    if (index > currentStep) {
      setIsProcessing(true);
      setShowAnimation(true);
      setTimeout(() => {
        setShowAnimation(false);
        setCurrentStep(index);
        setIsProcessing(false);
      }, 1000);
    } else {
      setCurrentStep(index);
    }
  };

  const handleMouseEnter = (index: number) => {
    if (!isPlaying && !isProcessing) {
      setHoveredStep(index);
    }
  };

  const handleMouseLeave = () => {
    setHoveredStep(null);
  };

  const handlePlay = () => {
    if (currentStep >= timelineSteps.length - 1) {
      setCurrentStep(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStep(0);
    setShowAnimation(false);
    setIsProcessing(false);
  };

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-ink-3">加载中...</div>
      </div>
    );
  }

  const activeStep = timelineSteps[currentStep];
  const nextStep = timelineSteps[Math.min(currentStep + 1, timelineSteps.length - 1)];

  return (
    <div className="space-y-6 relative z-10">
      <div className="rise surface rounded-2xl overflow-hidden border border-[var(--line)] p-6 relative">
        <div className="flex items-center justify-between mb-6">
          <h3 className="serif text-lg text-ink">扩散过程可视化</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-lg text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
            >
              🔄 重置
            </button>
            <button
              onClick={handlePlay}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${
                isPlaying
                  ? "bg-red-500 text-white"
                  : "bg-[#8b5cf6] text-white hover:bg-purple-700"
              }`}
            >
              {isPlaying ? "⏸ 暂停" : "▶ 播放"}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 overflow-x-auto pb-2">
          {timelineSteps.map((step, index) => (
            <div key={step.timestep} className="flex items-center">
              <div
                className={`relative cursor-pointer transition-all duration-300 flex-shrink-0 ${
                  index <= currentStep ? "opacity-100" : "opacity-50"
                } ${hoveredStep === index && !isPlaying ? "scale-105" : ""}`}
                onClick={() => handleStepClick(index)}
                onMouseEnter={() => handleMouseEnter(index)}
                onMouseLeave={handleMouseLeave}
              >
                <div
                  className={`w-24 h-24 rounded-xl overflow-hidden border-2 transition-all duration-300 bg-gray-100 ${
                    index === currentStep
                      ? "border-[#8b5cf6] shadow-lg shadow-purple-500/30"
                      : index < currentStep
                      ? "border-green-400"
                      : "border-gray-200"
                  }`}
                >
                  {step.imageUrl ? (
                    <img
                      src={step.imageUrl}
                      alt={step.label}
                      className="w-full h-full object-cover"
                      style={{ filter: `blur(${step.noiseLevel * 1.5}px)` }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-ink-4 text-xs">生成中...</div>
                    </div>
                  )}
                </div>
                
                {index === currentStep && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#8b5cf6] rounded-full flex items-center justify-center text-white text-xs font-bold z-10">
                    ●
                  </div>
                )}
                
                <div className="mt-3 text-center">
                  <div className="text-sm font-medium text-ink">{step.label}</div>
                  <div className="text-xs text-ink-4">{Math.round((1 - step.noiseLevel) * 100)}% 清晰</div>
                </div>
              </div>
              
              {index < timelineSteps.length - 1 && (
                <div className="mx-1 flex items-center">
                  <div className="w-6 h-0.5 bg-gradient-to-r from-purple-400 to-green-400"></div>
                  <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <div className="w-6 h-0.5 bg-gradient-to-r from-green-400 to-purple-400"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rise surface rounded-2xl overflow-hidden border border-[var(--line)] p-6 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="serif text-lg text-ink">U-Net 去噪过程</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#8b5cf6]"></span>
              <span className="text-sm text-ink-4">噪声水平: {Math.round(activeStep?.noiseLevel * 100) || 0}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#f4c25a]"></span>
              <span className="text-sm text-ink-4">时间步 t={activeStep?.timestep || 0}</span>
            </div>
          </div>
        </div>

        <div className="relative overflow-x-auto">
          <div className="min-w-[800px]">
            <svg viewBox="0 0 800 350" className="w-full h-auto">
              <defs>
                <linearGradient id="unetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#667eea" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
                <filter id="glowEffect">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <marker id="arrowHead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L9,3 z" fill="#8b5cf6" />
                </marker>
                <marker id="arrowGreen" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L9,3 z" fill="#22c55e" />
                </marker>
              </defs>

              {/* 输入图像 */}
              <g>
                <rect
                  x="30" y="25"
                  width="120" height="100"
                  rx="8"
                  fill={showAnimation ? "#fef3c7" : "#f3f4f6"}
                  stroke={showAnimation ? "#f4c25a" : "#d1d5db"}
                  strokeWidth={showAnimation ? "3" : "2"}
                  className="transition-all duration-300"
                  filter={showAnimation ? "url(#glowEffect)" : ""}
                />
                <rect x="45" y="38" width="90" height="70" rx="4" fill="white" stroke="#e5e7eb" />
                {activeStep?.imageUrl && (
                  <image
                    href={activeStep.imageUrl}
                    x="45" y="38"
                    width="90" height="70"
                    preserveAspectRatio="xMidYMid slice"
                    style={{ filter: `blur(${activeStep.noiseLevel * 1.5}px)` }}
                  />
                )}
                <text x="90" y="140" textAnchor="middle" fill="#666" fontSize="11" fontWeight="bold">
                  输入 x_t
                </text>
              </g>

              {/* 时间步 */}
              <g>
                <rect
                  x="190" y="55"
                  width="70" height="40"
                  rx="6"
                  fill="#f4c25a"
                  stroke="white"
                  strokeWidth="2"
                />
                <text x="225" y="82" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">
                  t={activeStep?.timestep}
                </text>
              </g>

              {/* 箭头到U-Net */}
              <path
                d="M 150 75 L 190 75"
                stroke="#8b5cf6"
                strokeWidth="3"
                markerEnd="url(#arrowHead)"
              />
              <path
                d="M 260 75 L 310 75"
                stroke="#f4c25a"
                strokeWidth="3"
                markerEnd="url(#arrowHead)"
              />

              {/* U-Net */}
              <g>
                <rect
                  x="310" y="30"
                  width="160" height="120"
                  rx="10"
                  fill="url(#unetGrad)"
                  stroke="white"
                  strokeWidth="3"
                  className="transition-all"
                  filter={showAnimation ? "url(#glowEffect)" : ""}
                >
                  {showAnimation && (
                    <animate attributeName="opacity" values="1;0.5;1" dur="0.3s" repeatCount="3" />
                  )}
                </rect>
                <text x="390" y="85" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">U-Net</text>
                <text x="390" y="110" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="11">去噪网络</text>
              </g>

              {/* 预测噪声 */}
              <g>
                <path
                  d="M 470 75 L 520 75"
                  stroke="#8b5cf6"
                  strokeWidth="3"
                  markerEnd="url(#arrowHead)"
                />
                <rect
                  x="520" y="25"
                  width="120" height="100"
                  rx="8"
                  fill="#fee2e2"
                  stroke="#ef4444"
                  strokeWidth="2"
                />
                <rect x="535" y="38" width="90" height="70" rx="4" fill="white" stroke="#ef4444" />
                <text x="580" y="78" textAnchor="middle" fill="#dc2626" fontSize="14" fontWeight="bold">ε_θ</text>
                <text x="580" y="140" textAnchor="middle" fill="#666" fontSize="11" fontWeight="bold">预测噪声</text>
              </g>

              {/* 减法操作 */}
              <g>
                <rect
                  x="350" y="175"
                  width="80" height="35"
                  rx="6"
                  fill="#22c55e"
                  stroke="white"
                  strokeWidth="2"
                />
                <text x="390" y="198" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">减法</text>
                <path d="M 390 150 L 390 175" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrowGreen)" />
                <path d="M 580 125 L 580 192 L 430 192" stroke="#22c55e" strokeWidth="2" fill="none" />
              </g>

              {/* 输出图像 */}
              <g>
                <path
                  d="M 430 192 L 670 192"
                  stroke="#22c55e"
                  strokeWidth="3"
                  markerEnd="url(#arrowGreen)"
                />
                <rect
                  x="670" y="140"
                  width="120" height="100"
                  rx="8"
                  fill={showAnimation ? "#dcfce7" : "#f3f4f6"}
                  stroke={showAnimation ? "#22c55e" : "#d1d5db"}
                  strokeWidth={showAnimation ? "3" : "2"}
                  className="transition-all duration-300"
                  filter={showAnimation ? "url(#glowEffect)" : ""}
                />
                <rect x="685" y="153" width="90" height="70" rx="4" fill="white" stroke="#e5e7eb" />
                {nextStep?.imageUrl && (
                  <image
                    href={nextStep.imageUrl}
                    x="685" y="153"
                    width="90" height="70"
                    preserveAspectRatio="xMidYMid slice"
                    style={{ filter: `blur(${nextStep.noiseLevel * 1.5}px)` }}
                  />
                )}
                <text x="730" y="255" textAnchor="middle" fill="#666" fontSize="11" fontWeight="bold">
                  输出 x_{nextStep?.timestep}
                </text>
              </g>

              {/* 底部文字 */}
              <text x="400" y="320" textAnchor="middle" fill="#666" fontSize="13" fontWeight="bold">
                {showAnimation ? "正在去噪中..." : "准备就绪"}
              </text>
            </svg>
          </div>
        </div>

        {showAnimation && (
          <div className="mt-4 p-3 bg-purple-50 rounded-lg text-center">
            <p className="text-sm text-purple-700 font-medium">
              🎯 当前步骤: 从 x_{activeStep?.timestep} 预测噪声 → 减去噪声 → 得到 x_{nextStep?.timestep}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rise surface rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-[#8b5cf6]">{activeStep?.timestep || 0}</div>
          <div className="text-sm text-ink-4 mt-1">当前时间步</div>
        </div>
        <div className="rise surface rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-[#f4c25a]">{Math.round((activeStep?.noiseLevel || 0) * 100)}%</div>
          <div className="text-sm text-ink-4 mt-1">噪声水平</div>
        </div>
        <div className="rise surface rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-[#22c55e]">{Math.round((1 - (activeStep?.noiseLevel || 0)) * 100)}%</div>
          <div className="text-sm text-ink-4 mt-1">图像清晰度</div>
        </div>
      </div>
    </div>
  );
}
