"use client";

import { ChevronDown } from "lucide-react";

// 段与段之间的「数据向下流动」连接件。
export function FlowConnector({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center py-1 select-none">
      <div className="h-5 w-px" style={{ background: "rgba(26,23,19,0.16)" }} />
      <div className="flex items-center gap-1.5 text-ink-3">
        <ChevronDown className="h-4 w-4" />
        {label && <span className="overline text-[10px]">{label}</span>}
      </div>
      <div className="h-5 w-px" style={{ background: "rgba(26,23,19,0.16)" }} />
    </div>
  );
}
