"use client";

import { useMemo } from "react";

interface GeneratedImageProps {
  type: "generated" | "real";
  label: string;
  quality?: number;
}

export function GeneratedImage({ type, label, quality = 0.7 }: GeneratedImageProps) {
  const imageUrl = useMemo(() => {
    const prompts = {
      face: "a photorealistic portrait of a person, neutral background, professional lighting",
      cat: "a cute cat sitting, soft lighting, high quality photo",
      dog: "a friendly golden retriever dog, outdoor setting, sunny day",
      car: "a sleek modern sports car, studio lighting, professional photography",
    };
    
    const prompt = prompts[label as keyof typeof prompts] || prompts.face;
    const seed = Math.floor(Math.random() * 10000);
    
    return `https://neeko-copilot.bytedance.net/api/text2image?prompt=${encodeURIComponent(prompt)}&seed=${seed}&width=128&height=128`;
  }, [label]);

  return (
    <div className={`relative rounded-xl overflow-hidden border-2 transition-all ${
      type === "generated" 
        ? "border-[#22c55e] bg-green-50" 
        : "border-[#ef4444] bg-red-50"
    }`}>
      <div className="absolute top-2 left-2 z-10">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          type === "generated" 
            ? "bg-[#22c55e] text-white" 
            : "bg-[#ef4444] text-white"
        }`}>
          {type === "generated" ? "Generated" : "Real"}
        </span>
      </div>
      
      <div className="relative w-full aspect-square">
        <img
          src={imageUrl}
          alt={label}
          className="w-full h-full object-cover"
          style={{ 
            filter: `blur(${Math.max(0, (1 - quality) * 10)}px)`,
            opacity: 0.4 + quality * 0.6
          }}
        />
        
        {quality < 1 && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        )}
        
        <div className="absolute bottom-2 left-2 right-2">
          <div className="flex items-center gap-1">
            <span className="text-xs text-white/80">Quality:</span>
            <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  type === "generated" ? "bg-[#22c55e]" : "bg-[#ef4444]"
                }`}
                style={{ width: `${quality * 100}%` }}
              />
            </div>
            <span className="text-xs text-white/80">{Math.round(quality * 100)}%</span>
          </div>
        </div>
      </div>
      
      <div className="p-3 text-center">
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="text-xs text-ink-3">
          {type === "generated" ? "AI Generated" : "Real Dataset"}
        </p>
      </div>
    </div>
  );
}