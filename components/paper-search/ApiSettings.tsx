"use client";

import { X } from "lucide-react";
import { SEARCH_SOURCES } from "@/lib/paper-search/types";
import { cn } from "@/lib/utils";

const KEYED_SOURCES: { id: string; label: string; apply: string }[] = [
  { id: "semantic-scholar", label: "Semantic Scholar API Key", apply: "https://www.semanticscholar.org/product/api" },
  { id: "ieee", label: "IEEE Xplore API Key", apply: "https://developer.ieee.org/" },
  { id: "scopus", label: "Scopus API Key", apply: "https://dev.elsevier.com/" },
  { id: "acm", label: "ACM Digital Library API Key", apply: "https://dl.acm.org/developers" },
  { id: "webofscience", label: "Web of Science API Key", apply: "https://developer.clarivate.com/" },
];

const inputCls = cn(
  "focus-ring w-full rounded-xl bg-paper-2/80 border border-line px-4 py-3",
  "text-[14px] text-ink placeholder:text-ink-4 font-mono",
  "outline-none transition-colors focus:border-line-strong",
);

/** 检索源开关 + 各源 API Key 配置面板。 */
export function ApiSettings({
  apiConfig,
  setApiConfig,
  selectedSources,
  toggleSource,
  onSave,
  onClose,
}: {
  apiConfig: Record<string, string>;
  setApiConfig: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  selectedSources: string[];
  toggleSource: (id: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="surface rounded-[20px] p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg serif text-ink">API 设置</h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-paper-2/80 transition-colors"
        >
          <X className="w-5 h-5 text-ink-2" />
        </button>
      </div>

      <div className="space-y-3 mb-6">
        {SEARCH_SOURCES.map((source) => (
          <div
            key={source.id}
            className="flex items-center justify-between p-4 rounded-xl bg-paper-2/60"
          >
            <div className="flex items-center gap-4">
              <input
                type="checkbox"
                checked={selectedSources.includes(source.id)}
                onChange={() => toggleSource(source.id)}
                className="w-4 h-4 rounded border-line text-plum focus:ring-plum"
              />
              <div>
                <div className="font-medium text-ink">{source.name}</div>
                <div className="text-xs text-ink-3">{source.description}</div>
              </div>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-paper-2/80 text-ink-2">
              {source.coverage}
            </span>
          </div>
        ))}
      </div>

      {KEYED_SOURCES.filter((s) => selectedSources.includes(s.id)).map((s) => (
        <div key={s.id} className="mb-6">
          <label className="overline block mb-2">{s.label}</label>
          <input
            type="text"
            value={apiConfig[s.id] || ""}
            onChange={(e) => setApiConfig((prev) => ({ ...prev, [s.id]: e.target.value }))}
            placeholder={s.id === "semantic-scholar" ? "输入您的 API Key（可选）" : `输入您的 ${s.label.replace(" API Key", "")} API Key`}
            className={inputCls}
          />
          <p className="text-xs text-ink-3 mt-2">申请地址: {s.apply}</p>
        </div>
      ))}

      <button
        onClick={onSave}
        className="cta-gradient w-full rounded-full px-5 py-3 text-[14px] font-medium transition-all"
      >
        保存设置
      </button>
    </div>
  );
}
