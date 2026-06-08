"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle, CheckSquare, Square, Table2, Copy, Check, Download } from "lucide-react";
import { getTool } from "@/lib/tools-registry";
import { ToolShell } from "@/components/tool-shell";
import { Markdown } from "@/components/markdown";
import { repository } from "@/lib/db/repository";
import { userKeyHeaders } from "@/lib/ai/user-keys";
import type { Paper } from "@/lib/db/types";
import { cn } from "@/lib/utils";

const TOOL = getTool("paper-compare")!;

export default function Page() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loadingLib, setLoadingLib] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    repository
      .listPapers()
      .then(setPapers)
      .catch(() => setError("读取论文库失败"))
      .finally(() => setLoadingLib(false));
  }, []);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 6) next.add(id);
      return next;
    });

  const selectedPapers = papers.filter((p) => selected.has(p.id));

  const handleCompare = async () => {
    if (selectedPapers.length < 2) {
      setError("请至少选择 2 篇论文");
      return;
    }
    setIsGenerating(true);
    setError(null);
    setResult("");
    try {
      const res = await fetch("/api/compare-papers", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...userKeyHeaders() },
        body: JSON.stringify({ papers: selectedPapers }),
      });
      if (!res.ok || !res.body) {
        const msg = await res.text().catch(() => "");
        setError(msg || `对比生成失败 (${res.status})`);
        return;
      }
      // 流式逐字渲染
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setResult(acc);
      }
    } catch (err) {
      setError("网络错误：" + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsGenerating(false);
    }
  };

  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const downloadResult = () => {
    const blob = new Blob([result], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "paper-comparison.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <ToolShell tool={TOOL}>
      <div className="space-y-6">
        {/* 选择区 */}
        <div className="surface rounded-[20px] p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="overline text-ink-3">
              从论文库选择（2-6 篇）· 已选 {selected.size}
            </span>
            <button
              onClick={handleCompare}
              disabled={isGenerating || selectedPapers.length < 2}
              className="inline-flex items-center gap-2 rounded-xl bg-ocean px-5 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Table2 className="h-4 w-4" />}
              生成对比表
            </button>
          </div>

          {loadingLib ? (
            <div className="flex items-center justify-center py-10 text-ink-3">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 加载论文库…
            </div>
          ) : papers.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-3">
              论文库还是空的。先去「论文调研搜索」或「论文库」入库几篇再来对比。
            </p>
          ) : (
            <div className="max-h-[320px] space-y-1.5 overflow-auto">
              {papers.map((p) => {
                const isSel = selected.has(p.id);
                const disabled = !isSel && selected.size >= 6;
                return (
                  <button
                    key={p.id}
                    onClick={() => toggle(p.id)}
                    disabled={disabled}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left transition-colors",
                      isSel ? "border-ocean/50 bg-ocean/5" : "border-line hover:border-line-strong",
                      disabled && "opacity-40",
                    )}
                  >
                    {isSel ? (
                      <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-ocean" />
                    ) : (
                      <Square className="mt-0.5 h-4 w-4 shrink-0 text-ink-4" />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-ink">{p.title}</span>
                      <span className="block truncate text-[12px] text-ink-4">
                        {(p.authors || []).map((a) => a.name).slice(0, 3).join(", ")}
                        {p.publishedAt ? ` · ${new Date(p.publishedAt).getFullYear()}` : ""}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 结果区 */}
        <div className="surface min-h-[300px] rounded-[20px] p-5">
          {error && (
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-[rgba(255,93,77,0.35)] bg-[rgba(255,93,77,0.08)] p-3 text-sm text-[#a53425]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {!result && !isGenerating && !error && (
            <div className="flex min-h-[240px] items-center justify-center text-center">
              <p className="serif-italic max-w-xs text-[22px] leading-snug text-ink-3">
                勾选论文，生成横向对比矩阵
              </p>
            </div>
          )}

          {isGenerating && !result && (
            <div className="flex min-h-[240px] items-center justify-center">
              <div className="text-center">
                <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-ocean" />
                <p className="text-sm text-ink-3">AI 正在对比 {selectedPapers.length} 篇论文…</p>
              </div>
            </div>
          )}

          {result && (
            <div>
              <div className="mb-3 flex items-center justify-end gap-2">
                <button
                  onClick={copyResult}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-paper-3/60 px-3 py-1.5 text-[12px] text-ink-2 hover:text-ink"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "已复制" : "复制 Markdown"}
                </button>
                <button
                  onClick={downloadResult}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-paper-3/60 px-3 py-1.5 text-[12px] text-ink-2 hover:text-ink"
                >
                  <Download className="h-3.5 w-3.5" />
                  下载 .md
                </button>
              </div>
              <Markdown>{result}</Markdown>
            </div>
          )}
        </div>
      </div>
    </ToolShell>
  );
}
