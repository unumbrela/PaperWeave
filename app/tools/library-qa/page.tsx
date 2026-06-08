"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, AlertCircle, Send, Sparkles, FileText } from "lucide-react";
import { getTool } from "@/lib/tools-registry";
import { ToolShell } from "@/components/tool-shell";
import { Markdown } from "@/components/markdown";
import { repository } from "@/lib/db/repository";
import { embeddingDB, type PaperEmbedding } from "@/lib/db/local-db";
import { userKeyHeaders } from "@/lib/ai/user-keys";
import { buildDoc, textHash, topK } from "@/lib/library-qa/retrieval";
import type { Paper } from "@/lib/db/types";

const TOOL = getTool("library-qa")!;
const TOP_K = 4;
const EMBED_BATCH = 64;

interface Source {
  n: number;
  id: string;
  title: string;
  score: number;
}

/** 调 embedding 路由，分批以避免单次过大；要求全程同一 model。 */
async function embed(texts: string[]): Promise<{ model: string; vectors: number[][] }> {
  const vectors: number[][] = [];
  let model = "";
  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    const chunk = texts.slice(i, i + EMBED_BATCH);
    const res = await fetch("/api/library-qa/embed", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...userKeyHeaders() },
      body: JSON.stringify({ texts: chunk }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "向量化失败");
    model = data.model;
    vectors.push(...data.vectors);
  }
  return { model, vectors };
}

export default function Page() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    repository
      .listPapers()
      .then(setPapers)
      .catch(() => setError("读取论文库失败"));
  }, []);

  const ask = async () => {
    if (!question.trim() || busy) return;
    if (papers.length === 0) {
      setError("论文库还是空的，先入库几篇再来提问。");
      return;
    }
    setBusy(true);
    setError(null);
    setAnswer("");
    setSources([]);

    try {
      // 1) 向量化问题，借此确定当前 embedding 模型（向量空间）
      setStatus("正在向量化问题…");
      const q = await embed([question]);
      const queryVec = q.vectors[0];
      const model = q.model;

      // 2) 读本地向量缓存（同模型），找出需要（重）嵌入的论文
      const cached = await embeddingDB.getByModel(model);
      const cachedMap = new Map(cached.map((e) => [e.paperId, e]));
      const docs = papers.map((p) => ({ paper: p, doc: buildDoc(p), hash: "" }));
      docs.forEach((d) => (d.hash = textHash(d.doc)));
      const stale = docs.filter((d) => cachedMap.get(d.paper.id)?.textHash !== d.hash);

      // 3) 增量嵌入缺失/变更的论文，写回本地缓存
      if (stale.length > 0) {
        setStatus(`正在向量化 ${stale.length} 篇论文…`);
        const { vectors } = await embed(stale.map((d) => d.doc));
        const now = new Date().toISOString();
        const rows: PaperEmbedding[] = stale.map((d, i) => ({
          paperId: d.paper.id,
          model,
          textHash: d.hash,
          vector: vectors[i],
          updatedAt: now,
        }));
        await embeddingDB.bulkPut(rows);
        rows.forEach((r) => cachedMap.set(r.paperId, r));
      }

      // 4) 余弦检索 top-k
      setStatus("检索相关论文…");
      const items = papers
        .map((p) => ({ paper: p, vector: cachedMap.get(p.id)?.vector || [] }))
        .filter((it) => it.vector.length > 0);
      const ranked = topK(queryVec, items, TOP_K).filter((r) => r.score > 0);

      if (ranked.length === 0) {
        setError("没有检索到相关论文。");
        return;
      }

      const contexts = ranked.map((r, i) => ({
        n: i + 1,
        title: r.item.paper.title,
        text: buildDoc(r.item.paper),
      }));
      setSources(
        ranked.map((r, i) => ({
          n: i + 1,
          id: r.item.paper.id,
          title: r.item.paper.title,
          score: r.score,
        })),
      );

      // 5) 让 LLM 基于片段归纳作答（流式逐字渲染）
      setStatus("生成回答…");
      const res = await fetch("/api/library-qa/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...userKeyHeaders() },
        body: JSON.stringify({ question, contexts }),
      });
      if (!res.ok || !res.body) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `回答生成失败 (${res.status})`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      while (true) {
        const { done: rdone, value } = await reader.read();
        if (rdone) break;
        acc += dec.decode(value, { stream: true });
        setAnswer(acc);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setStatus(null);
      setBusy(false);
    }
  };

  return (
    <ToolShell tool={TOOL}>
      <div className="space-y-6">
        <div className="surface rounded-[20px] p-5">
          <label className="overline mb-2 block text-ink-3">
            向你的论文库提问 · 共 {papers.length} 篇
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask()}
              placeholder="例如：这些论文里有哪些用到了对比学习？各自怎么做的？"
              className="flex-1 rounded-xl border border-line bg-white/50 px-4 py-2.5 text-sm text-ink outline-none focus:border-plum/40"
            />
            <button
              onClick={ask}
              disabled={busy || !question.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-plum px-5 py-2.5 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              提问
            </button>
          </div>
          <p className="mt-2 text-[12px] text-ink-4">
            语义检索需要 OpenAI 或 Gemini 的 key（在右上角「API Key」填）。向量在本机缓存，重复提问不重复计费。
          </p>
        </div>

        <div className="surface min-h-[300px] rounded-[20px] p-5">
          {error && (
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-[rgba(255,93,77,0.35)] bg-[rgba(255,93,77,0.08)] p-3 text-sm text-[#a53425]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {busy && !answer && (
            <div className="flex min-h-[200px] items-center justify-center">
              <div className="text-center">
                <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-plum" />
                <p className="text-sm text-ink-3">{status || "处理中…"}</p>
              </div>
            </div>
          )}

          {!busy && !answer && !error && (
            <div className="flex min-h-[200px] items-center justify-center text-center">
              <p className="serif-italic max-w-sm text-[22px] leading-snug text-ink-3">
                用自然语言问，答案从你读过的论文里来
              </p>
            </div>
          )}

          {answer && (
            <div>
              {sources.length > 0 && (
                <div className="mb-4">
                  <div className="overline mb-2 flex items-center gap-1.5 text-ink-3">
                    <FileText className="h-3.5 w-3.5" /> 引用来源
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sources.map((s) => (
                      <Link
                        key={s.id}
                        href={`/library/${s.id}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper-2/60 px-3 py-1 text-[12px] text-ink-2 transition-colors hover:border-plum/40 hover:text-ink"
                        title={`相关度 ${(s.score * 100).toFixed(0)}%`}
                      >
                        <span className="font-medium text-plum">[{s.n}]</span>
                        <span className="max-w-[220px] truncate">{s.title}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 border-t border-line pt-4">
                <Sparkles className="h-4 w-4 text-plum" />
                <span className="overline text-ink-3">回答</span>
              </div>
              <div className="mt-2">
                <Markdown>{answer}</Markdown>
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolShell>
  );
}
