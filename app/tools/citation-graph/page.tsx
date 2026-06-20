"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, Network, ExternalLink } from "lucide-react";
import { getTool } from "@/lib/tools-registry";
import { ToolShell } from "@/components/tool-shell";
import { CitationGraph } from "@/components/paper-search/CitationGraph";
import type { CitationGraph as Graph, GraphNode } from "@/lib/paper-search/citation-graph";

const TOOL = getTool("citation-graph")!;

function CitationGraphInner() {
  const params = useSearchParams();
  const [input, setInput] = useState("");
  const [graph, setGraph] = useState<Graph | null>(null);
  const [seedTitle, setSeedTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<GraphNode | null>(null);

  /** 把任意输入解析成 OpenAlex ID：是 W123 直接用，否则当关键词去 OpenAlex 搜首条。 */
  const resolveId = useCallback(async (raw: string): Promise<string | null> => {
    const trimmed = raw.trim().replace(/^https?:\/\/openalex\.org\//i, "");
    if (/^W\d+$/i.test(trimmed)) return trimmed;

    const res = await fetch("/api/paper-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywords: raw, sources: ["openalex"], maxResults: 1 }),
    });
    const data = await res.json();
    const hit = data?.data?.[0];
    return hit?.id && /^W\d+$/i.test(hit.id) ? hit.id : null;
  }, []);

  const buildFor = useCallback(
    async (raw: string, knownTitle?: string) => {
      if (!raw.trim()) return;
      setIsLoading(true);
      setError(null);
      setGraph(null);
      setSelected(null);
      try {
        const id = await resolveId(raw);
        if (!id) {
          setError("没找到对应的 OpenAlex 论文。试试更精确的标题，或直接粘贴 OpenAlex ID（W…）。");
          return;
        }
        const res = await fetch("/api/citation-graph", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        const data = await res.json();
        if (!data.success) {
          setError(data.error || "构建引用网络失败");
          return;
        }
        const g: Graph = data.data;
        if (g.nodes.length <= 1) {
          setError("这篇论文在 OpenAlex 上没有可用的引用关系数据。");
          return;
        }
        setGraph(g);
        const seedNode = g.nodes.find((n) => n.id === g.seedId);
        setSeedTitle(knownTitle || seedNode?.title || "");
      } catch (err) {
        setError("网络错误，请重试：" + (err instanceof Error ? err.message : String(err)));
      } finally {
        setIsLoading(false);
      }
    },
    [resolveId],
  );

  // 从检索结果一键直达：?id=W123&title=...
  useEffect(() => {
    const id = params.get("id");
    const title = params.get("title");
    if (id) {
      // 挂载时一次性从 URL 参数水合，非级联渲染
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInput(title || id);
      buildFor(id, title || undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ToolShell tool={TOOL}>
      <div className="space-y-6">
        <div className="surface rounded-[20px] p-5">
          <label className="overline mb-2 block text-ink-3">论文标题 或 OpenAlex ID</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && buildFor(input)}
              placeholder="例如：Attention Is All You Need / 或 W2963403868"
              className="flex-1 rounded-xl border border-line bg-white/50 px-4 py-2.5 text-sm text-ink outline-none focus:border-plum/40"
            />
            <button
              onClick={() => buildFor(input)}
              disabled={isLoading || !input.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-plum px-5 py-2.5 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Network className="h-4 w-4" />}
              生成网络
            </button>
          </div>
          <p className="mt-2 text-[12px] text-ink-4">
            数据源 OpenAlex（无需 API key）。在「文献检索」里对 OpenAlex 论文点「引用网络」可直接带入。
          </p>
        </div>

        <div className="surface min-h-[560px] rounded-[20px] p-5">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-[rgba(255,93,77,0.35)] bg-[rgba(255,93,77,0.08)] p-3 text-sm text-[#a53425]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {!graph && !isLoading && !error && (
            <div className="flex min-h-[480px] items-center justify-center text-center">
              <p className="serif-italic max-w-xs text-[22px] leading-snug text-ink-3">
                输入一篇论文，展开它的引用网络
              </p>
            </div>
          )}

          {isLoading && (
            <div className="flex min-h-[480px] items-center justify-center">
              <div className="text-center">
                <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-plum" />
                <p className="text-sm text-ink-3">正在向 OpenAlex 拉取引用关系…</p>
              </div>
            </div>
          )}

          {graph && !isLoading && (
            <div>
              {seedTitle && (
                <h3 className="mb-1 text-[15px] font-medium text-ink">{seedTitle}</h3>
              )}
              <p className="mb-3 text-[12px] text-ink-3">
                共 {graph.nodes.length} 个节点 · {graph.edges.length} 条引用边
              </p>
              <CitationGraph graph={graph} onSelect={setSelected} />

              {selected && (
                <div className="mt-4 rounded-xl border border-line bg-white/40 p-4">
                  <a
                    href={selected.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-plum hover:underline"
                  >
                    {selected.title}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <div className="mt-1 flex flex-wrap gap-3 text-[12px] text-ink-3">
                    {selected.author && <span>{selected.author}</span>}
                    {selected.year && <span>{selected.year}</span>}
                    {typeof selected.citations === "number" && <span>被引 {selected.citations}</span>}
                    <span className="text-ink-4">
                      {selected.relation === "seed"
                        ? "种子论文"
                        : selected.relation === "reference"
                          ? "参考文献"
                          : "被引文献"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ToolShell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CitationGraphInner />
    </Suspense>
  );
}
