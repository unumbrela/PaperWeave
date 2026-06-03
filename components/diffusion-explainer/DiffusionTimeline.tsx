"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";

interface DiffusionTimelineProps {
  currentTimestep: number;
}

interface CustomImageProps {
  src: string;
  noiseLevel: number;
}

function generateDefaultImage(noiseLevel: number, size: number = 200): string {
  if (typeof document === "undefined") return "";
  
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  
  if (!ctx) return "";
  
  ctx.fillStyle = "#f8f8f8";
  ctx.fillRect(0, 0, size, size);
  
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
    
    let r = 240, g = 240, b = 240;
    
    if (dist < radius * 0.5) {
      r = 255; g = 210; b = 180;
    } else if (dist < radius * 0.7) {
      r = 255; g = 180; b = 140;
    } else if (dist < radius) {
      r = 200; g = 140; b = 100;
    }
    
    const noiseR = (Math.random() - 0.5) * 255 * noiseLevel;
    const noiseG = (Math.random() - 0.5) * 255 * noiseLevel;
    const noiseB = (Math.random() - 0.5) * 255 * noiseLevel;
    
    pixels[i] = Math.min(255, Math.max(0, r + noiseR));
    pixels[i + 1] = Math.min(255, Math.max(0, g + noiseG));
    pixels[i + 2] = Math.min(255, Math.max(0, b + noiseB));
    pixels[i + 3] = 255;
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  return canvas.toDataURL();
}

function applyNoiseToImage(originalSrc: string, noiseLevel: number): Promise<string> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve("");
      return;
    }
    
    const size = 200;
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        resolve("");
        return;
      }
      
      ctx.drawImage(img, 0, 0, size, size);
      
      const imageData = ctx.getImageData(0, 0, size, size);
      const pixels = imageData.data;
      
      for (let i = 0; i < pixels.length; i += 4) {
        const noiseR = (Math.random() - 0.5) * 255 * noiseLevel;
        const noiseG = (Math.random() - 0.5) * 255 * noiseLevel;
        const noiseB = (Math.random() - 0.5) * 255 * noiseLevel;
        
        pixels[i] = Math.min(255, Math.max(0, pixels[i] + noiseR));
        pixels[i + 1] = Math.min(255, Math.max(0, pixels[i + 1] + noiseG));
        pixels[i + 2] = Math.min(255, Math.max(0, pixels[i + 2] + noiseB));
      }
      
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL());
    };
    
    img.onerror = () => {
      resolve(generateDefaultImage(noiseLevel, size));
    };
    
    img.src = originalSrc;
  });
}

function CustomImage({ src, noiseLevel }: CustomImageProps) {
  const [noisySrc, setNoisySrc] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    
    applyNoiseToImage(src, noiseLevel).then((result) => {
      if (mounted) {
        setNoisySrc(result);
        setIsLoading(false);
      }
    });
    
    return () => {
      mounted = false;
    };
  }, [src, noiseLevel]);
  
  if (isLoading || !noisySrc) {
    return (
      <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
        <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }
  
  return (
    <img 
      src={noisySrc} 
      alt="带噪图像"
      className="w-full h-full object-cover"
      style={{ filter: `blur(${noiseLevel * 2}px)` }}
    />
  );
}

export function DiffusionTimeline({ currentTimestep }: DiffusionTimelineProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playTimestep, setPlayTimestep] = useState(100);
  const [isClient, setIsClient] = useState(false);
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = window.setInterval(() => {
        setPlayTimestep((prev) => {
          if (prev <= 0) {
            setIsPlaying(false);
            return 0;
          }
          return prev - 2;
        });
      }, 100);
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
  }, [isPlaying]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setCustomImage(result);
      setIsUploading(false);
    };
    reader.onerror = () => {
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = () => {
    setCustomImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const displayTimestep = isPlaying ? playTimestep : currentTimestep;
  const noiseLevel = displayTimestep / 100;
  const imageQuality = 1 - noiseLevel;
  
  const imageData = useMemo(() => {
    if (!isClient) return "";
    return generateDefaultImage(noiseLevel, 200);
  }, [isClient, noiseLevel]);

  const milestones = [100, 90, 70, 50, 30, 10, 0];
  
  const milestoneImages = useMemo(() => {
    if (!isClient) return {};
    const images: Record<number, string> = {};
    milestones.forEach((step) => {
      images[step] = generateDefaultImage(step / 100, 200);
    });
    return images;
  }, [isClient]);

  if (!isClient) {
    return (
      <div className="rise surface rounded-2xl overflow-hidden border border-[var(--line)] p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="serif text-lg text-ink">图像演变过程</h3>
        </div>
        <div className="flex items-center justify-center h-48">
          <div className="text-ink-3">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="rise surface rounded-2xl overflow-hidden border border-[var(--line)] p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="serif text-lg text-ink">图像演变过程</h3>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={handleUploadClick}
            disabled={isUploading}
            className="px-3 py-2 rounded-lg text-sm transition-all bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-50 flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                上传中...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                上传图像
              </>
            )}
          </button>
          {customImage && (
            <button
              onClick={handleRemoveImage}
              className="px-3 py-2 rounded-lg text-sm transition-all bg-red-50 text-red-700 hover:bg-red-100"
            >
              移除
            </button>
          )}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
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
      
      <div className="flex items-center gap-6">
        <div className="relative flex-shrink-0">
          <div 
            className="w-48 h-48 rounded-xl overflow-hidden border-2 transition-all duration-300"
            style={{ 
              borderColor: `rgba(139, 92, 246, ${1 - noiseLevel * 0.5})`,
              boxShadow: `0 4px 20px rgba(139, 92, 246, ${noiseLevel * 0.3})`
            }}
          >
            {customImage ? (
              <CustomImage src={customImage} noiseLevel={noiseLevel} />
            ) : (
              <img 
                src={imageData} 
                alt={`t=${displayTimestep}`}
                className="w-full h-full object-cover"
                style={{ filter: `blur(${noiseLevel * 3}px)` }}
              />
            )}
          </div>
          
          <div className="absolute -bottom-2 -right-2 bg-[#8b5cf6] text-white px-3 py-1 rounded-full text-sm font-bold">
            t={displayTimestep === 100 ? "T" : displayTimestep}
          </div>
          
          <div className="mt-4 text-center">
            <div className="text-sm font-medium text-ink">图像清晰度</div>
            <div className="text-2xl font-bold" style={{ color: noiseLevel > 0.5 ? "#f4c25a" : "#22c55e" }}>
              {Math.round(imageQuality * 100)}%
            </div>
          </div>
          
          {customImage && (
            <div className="mt-2 text-center">
              <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                自定义图像
              </span>
            </div>
          )}
        </div>
        
        <div className="flex-1">
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-ink-3">纯噪声</span>
              <span className="text-sm text-ink-3">清晰图像</span>
            </div>
            
            <div className="relative h-32 bg-gradient-to-r from-purple-100 via-yellow-50 to-green-100 rounded-xl overflow-hidden">
              <div 
                className="absolute top-0 bottom-0 w-1 bg-[#8b5cf6] shadow-lg transition-all duration-300"
                style={{ left: `${(1 - noiseLevel) * 100}%` }}
              />
              
              <div className="absolute inset-0 flex items-center">
                {milestones.map((step) => {
                  const position = ((100 - step) / 100) * 100;
                  const stepNoiseLevel = step / 100;
                  const stepImageData = milestoneImages[step];
                  
                  return (
                    <div 
                      key={step} 
                      className="flex-1 flex flex-col items-center"
                      style={{ opacity: position <= (1 - noiseLevel) * 100 ? 1 : 0.5 }}
                    >
                      <div 
                        className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 mb-2 transition-all"
                        style={{ 
                          boxShadow: displayTimestep === step ? "0 0 10px rgba(139, 92, 246, 0.5)" : "none",
                          borderColor: displayTimestep === step ? "#8b5cf6" : "#e5e7eb"
                        }}
                      >
                        {customImage ? (
                          <CustomImage src={customImage} noiseLevel={stepNoiseLevel} />
                        ) : (
                          <img 
                            src={stepImageData} 
                            alt={`t=${step}`}
                            className="w-full h-full object-cover"
                            style={{ filter: `blur(${stepNoiseLevel * 2}px)` }}
                          />
                        )}
                      </div>
                      <span className="text-xs text-ink-3">t={step === 100 ? "T" : step}</span>
                      <span className="text-xs text-ink-4">{100 - step}% 清晰</span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <input
              type="range"
              min="0"
              max="100"
              value={100 - displayTimestep}
              onChange={(e) => {
                const newStep = 100 - parseInt(e.target.value);
                setPlayTimestep(newStep);
                setIsPlaying(false);
              }}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#8b5cf6] mt-4"
            />
          </div>
        </div>
      </div>
    </div>
  );
}