"use client";

import { useState, useMemo } from "react";

interface GeneratedResultProps {
  label: string;
  quality?: number;
  dataUrl?: string | null;
}

function stringToHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash) % 1000;
}

export function GeneratedResult({ label, quality = 0.7, dataUrl }: GeneratedResultProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const imageUrl = useMemo(() => {
    const imageIds: Record<string, number> = {
      "人脸": 1005,
      "猫": 1074,
      "狗": 1025,
      "汽车": 1071,
    };
    
    const baseId = imageIds[label] || 1000;
    const seed = stringToHash(label);
    const id = (baseId + seed) % 1000;
    
    return `https://picsum.photos/seed/${id}/256/256`;
  }, [label]);

  const src = dataUrl ?? imageUrl;

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    if (retryCount < 2) {
      setRetryCount(retryCount + 1);
    } else {
      setImageError(true);
    }
  };

  return (
    <div className="rise surface rounded-2xl overflow-hidden border border-[var(--line)] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="serif text-lg text-ink">🎨 生成结果</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-3">质量:</span>
          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#22c55e] to-[#f4c25a] rounded-full transition-all duration-500"
              style={{ width: `${quality * 100}%` }}
            />
          </div>
          <span className="text-xs text-ink-3">{Math.round(quality * 100)}%</span>
        </div>
      </div>
      
      <div className="relative aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-green-50 to-emerald-100">
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
            <div className="w-8 h-8 border-3 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        
        {!imageError && (
          <img
            key={`${retryCount}-${src}`}
            src={src}
            alt={label}
            className={`w-full h-full object-cover transition-all duration-500 ${!imageLoaded ? "opacity-0" : "opacity-100"}`}
            style={{ 
              filter: `blur(${Math.max(0, (1 - quality) * 5)}px)`,
              opacity: imageLoaded ? (0.5 + quality * 0.5) : 0
            }}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}
        
        {imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-2 bg-[#22c55e] rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-ink-3">图片加载失败</p>
            </div>
          </div>
        )}
        
        {quality < 1 && imageLoaded && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        )}
        
        {!imageError && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center justify-between bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2">
              <div>
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-xs text-white/70">GAN Generated</p>
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <svg 
                    key={i} 
                    className={`w-4 h-4 ${i < Math.floor(quality * 5) ? "text-yellow-400" : "text-gray-400"}`} 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-xl font-bold text-[#22c55e]">256×256</div>
          <div className="text-xs text-ink-3">分辨率</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-xl font-bold text-[#f4c25a]">PNG</div>
          <div className="text-xs text-ink-3">格式</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-xl font-bold text-[#8b5cf6]">AI</div>
          <div className="text-xs text-ink-3">生成方式</div>
        </div>
      </div>
    </div>
  );
}