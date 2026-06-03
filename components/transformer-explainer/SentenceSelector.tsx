import { useState } from "react";
import { exampleSentences } from "@/lib/transformer-explainer/config";

interface SentenceSelectorProps {
  selectedIndex: number;
  customText: string;
  onSelect: (index: number) => void;
  onCustomChange: (text: string) => void;
}

export function SentenceSelector({ selectedIndex, customText, onSelect, onCustomChange }: SentenceSelectorProps) {
  const [isCustomMode, setIsCustomMode] = useState(false);

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {!isCustomMode && exampleSentences.map((sentence, index) => (
        <button
          key={index}
          onClick={() => onSelect(index)}
          className={`px-4 py-2 rounded-full text-sm transition-all duration-200 ${
            selectedIndex === index && !customText
              ? "bg-[#f4c25a] text-ink"
              : "bg-surface border border-[var(--line)] text-ink-2 hover:border-[#f4c25a] hover:text-[#f4c25a]"
          }`}
        >
          {sentence.text}
        </button>
      ))}
      
      {isCustomMode ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={customText}
            onChange={(e) => onCustomChange(e.target.value)}
            placeholder="输入自定义句子..."
            className="px-4 py-2 rounded-full text-sm bg-surface border border-[var(--line)] text-ink placeholder:text-ink-3 focus:outline-none focus:border-[#f4c25a] max-w-xs"
            maxLength={50}
          />
          <button
            onClick={() => setIsCustomMode(false)}
            className="px-3 py-2 rounded-full text-sm bg-surface border border-[var(--line)] text-ink-2 hover:border-[#f4c25a]"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsCustomMode(true)}
          className="px-4 py-2 rounded-full text-sm bg-surface border border-dashed border-[var(--line)] text-ink-3 hover:border-[#f4c25a] hover:text-[#f4c25a] transition-all duration-200"
        >
          + 自定义
        </button>
      )}
    </div>
  );
}