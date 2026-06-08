"use client";

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";

interface HotQuery {
  label: string;
  hits: number;
  count: number;
}

/**
 * 热门检索词 —— 从后端缓存（search_cache）拉 top N，点击回填关键词。
 * 后端未配 Supabase 时返回空，本组件整体不渲染（零配置下无痕）。
 */
export function HotQueries({ onPick }: { onPick: (keywords: string) => void }) {
  const [hot, setHot] = useState<HotQuery[]>([]);

  useEffect(() => {
    let alive = true;
    fetch("/api/paper-search/hot")
      .then((r) => r.json())
      .then((d) => {
        if (alive && d?.success && Array.isArray(d.data)) setHot(d.data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (hot.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1 text-[12px] text-ink-3">
        <Flame className="h-3.5 w-3.5 text-plum" />
        <span className="overline">热门检索</span>
      </span>
      {hot.map((q) => (
        <button
          key={q.label}
          onClick={() => onPick(q.label.split(" · ")[0])}
          title={`${q.hits} 次检索 · ${q.count} 条结果`}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-[rgba(26,23,19,0.02)] px-3 py-1 text-[12px] text-ink-2 transition-colors hover:border-plum/40 hover:text-ink"
        >
          <span className="serif-italic max-w-[180px] truncate">{q.label}</span>
          <span className="text-ink-4">{q.hits}</span>
        </button>
      ))}
    </div>
  );
}
