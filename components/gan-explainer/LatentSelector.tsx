"use client";

import { useState } from "react";

interface LatentSelectorProps {
  options: { label: string; noise: number[] }[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onCustomChange: (noise: number[], label?: string) => void;
}

export function LatentSelector({ options, selectedIndex, onSelect, onCustomChange }: LatentSelectorProps) {
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customLabel, setCustomLabel] = useState("");

  const handleCustomSubmit = () => {
    if (customLabel.trim()) {
      const newNoise = Array(100).fill(0).map(() => Math.random() * 2 - 1);
      onCustomChange(newNoise, customLabel.trim());
      setCustomLabel("");
      setIsCustomMode(false);
    }
  };

  const handleRandomGenerate = () => {
    const newNoise = Array(100).fill(0).map(() => Math.random() * 2 - 1);
    onCustomChange(newNoise, `随机目标 ${Math.floor(Math.random() * 100)}`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option, index) => (
        <button
          key={index}
          onClick={() => onSelect(index)}
          className={`px-4 py-2 rounded-lg text-sm transition-all ${
            selectedIndex === index
              ? "bg-[#22c55e] text-white"
              : "bg-surface border border-[var(--line)] text-ink-2 hover:border-[#22c55e]"
          }`}
        >
          {option.label}
        </button>
      ))}
      
      <button
        onClick={() => setIsCustomMode(!isCustomMode)}
        className={`px-4 py-2 rounded-lg text-sm transition-all ${
          isCustomMode
            ? "bg-[#f4c25a] text-ink"
            : "bg-surface border border-[var(--line)] text-ink-2 hover:border-[#f4c25a]"
        }`}
      >
        + 自定义
      </button>

      {isCustomMode && (
        <div className="flex items-center gap-2 mt-2 w-full">
          <input
            type="text"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="输入生成目标名称..."
            className="px-3 py-1.5 rounded-lg text-sm border border-[var(--line)] bg-surface focus:outline-none focus:border-[#f4c25a] w-40"
            onKeyPress={(e) => e.key === "Enter" && handleCustomSubmit()}
          />
          <button
            onClick={handleCustomSubmit}
            className="px-3 py-1.5 rounded-lg text-sm bg-[#f4c25a] text-ink hover:opacity-80"
          >
            生成
          </button>
        </div>
      )}
      
      <button
        onClick={handleRandomGenerate}
        className="px-4 py-2 rounded-lg text-sm bg-surface border border-[var(--line)] text-ink-2 hover:border-[#f4c25a] ml-auto"
      >
        🎲 随机生成
      </button>
    </div>
  );
}