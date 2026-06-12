"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, AlertCircle, Eye, BookOpen, ExternalLink } from "lucide-react";
import { ANNOTATION_COLORS, type AnnotationType } from "@/lib/db/types";
import type {
  ShareSnapshot,
  PaperShareData,
  LibraryShareData,
  PaperSnapshot,
  AnnotationSnapshot,
} from "@/lib/share/snapshot";

const ANNOTATION_LABELS: Record<AnnotationType, string> = {
  highlight: "高亮",
  insight: "洞察",
  todo: "待办",
  transferable: "可迁移",
};

export default function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [snapshot, setSnapshot] = useState<ShareSnapshot | null>(null);
  const [views, setViews] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch(`/api/share/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (d.success) {
          setSnapshot(d.data.snapshot);
          setViews(d.data.views || 0);
        } else {
          setError(d.error || "分享不存在");
        }
      })
      .catch(() => alive && setError("加载失败"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [token]);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="overline text-[11px] text-ink-3 transition-colors hover:text-ink">
          PAPERWEAVE · 公开分享
        </Link>
        {snapshot && (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-4">
            <Eye className="h-3.5 w-3.5" /> {views}
          </span>
        )}
      </div>

      {loading && (
        <div className="flex min-h-[300px] items-center justify-center text-ink-3">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" /> 加载分享…
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-[rgba(255,93,77,0.35)] bg-[rgba(255,93,77,0.08)] p-4 text-sm text-[#a53425]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {snapshot?.kind === "paper" && <PaperView data={snapshot.data as PaperShareData} />}
      {snapshot?.kind === "library" && <LibraryView data={snapshot.data as LibraryShareData} />}

      {snapshot && (
        <div className="mt-10 border-t border-line pt-6 text-center">
          <p className="mb-3 text-sm text-ink-3">由 PaperWeave 生成的只读分享</p>
          <Link
            href="/"
            className="cta-gradient inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium focus-ring"
          >
            <BookOpen className="h-4 w-4" />
            打开 PaperWeave
          </Link>
        </div>
      )}
    </div>
  );
}

function MetaRow({ p }: { p: PaperSnapshot }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-[12px] text-ink-4">
      {p.year && <span>{p.year}</span>}
      {typeof p.citations === "number" && p.citations > 0 && <span>· 被引 {p.citations}</span>}
      {p.arxivId && <span>· arXiv:{p.arxivId}</span>}
      {p.tags?.map((t) => (
        <span key={t} className="rounded-full bg-paper-3 px-2 py-0.5 text-ink-3">
          {t}
        </span>
      ))}
    </div>
  );
}

function Analysis({ p }: { p: PaperSnapshot }) {
  const blocks: [string, string | undefined][] = [
    ["论文总结", p.summary],
    ["方法论", p.methodology],
    ["主要贡献", p.contribution],
  ];
  const present = blocks.filter(([, v]) => v?.trim());
  if (present.length === 0) return null;
  return (
    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
      {present.map(([label, v]) => (
        <div key={label} className="rounded-xl border border-line bg-paper-2/60 p-4">
          <h4 className="overline mb-2 text-plum">{label}</h4>
          <p className="text-sm leading-relaxed text-ink-2">{v}</p>
        </div>
      ))}
    </div>
  );
}

function PaperView({ data }: { data: PaperShareData }) {
  return (
    <article className="surface rounded-2xl p-6">
      <h1 className="serif text-2xl leading-snug text-ink">{data.title}</h1>
      <p className="mt-2 text-sm text-ink-3">{data.authors.join(", ") || "未知作者"}</p>
      <div className="mt-2">
        <MetaRow p={data} />
      </div>
      {data.sourceUrl && (
        <a
          href={data.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-sm text-ocean hover:underline"
        >
          原文链接 <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}

      {data.abstract && (
        <div className="mt-5">
          <h3 className="serif mb-2 text-lg text-ink">摘要</h3>
          <p className="text-[15px] leading-relaxed text-ink-2">{data.abstract}</p>
        </div>
      )}

      <Analysis p={data} />

      {data.annotations.length > 0 && (
        <div className="mt-6">
          <h3 className="serif mb-3 text-lg text-ink">批注（{data.annotations.length}）</h3>
          <div className="space-y-2">
            {data.annotations.map((a: AnnotationSnapshot, i) => (
              <div key={i} className="rounded-xl border border-line bg-paper-2/40 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: ANNOTATION_COLORS[a.type] }}
                  />
                  <span className="overline text-[10px] text-ink-3">
                    {ANNOTATION_LABELS[a.type]} · 第 {a.page + 1} 页
                  </span>
                </div>
                {a.selectedText && <p className="text-sm text-ink-2">{a.selectedText}</p>}
                {a.comment && <p className="mt-1 text-[13px] text-ink-3">💬 {a.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {!!data.stickyNotes?.length && (
        <div className="mt-6">
          <h3 className="serif mb-3 text-lg text-ink">页面便签 📒（{data.stickyNotes.length}）</h3>
          <div className="space-y-2">
            {data.stickyNotes.map((n, i) => (
              <div key={i} className="rounded-xl border border-line bg-paper-2/40 p-3">
                <span className="overline text-[10px] text-ink-3">第 {n.page + 1} 页</span>
                <p className="mt-1 whitespace-pre-wrap text-sm text-ink-2">{n.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.researchNote?.trim() && (
        <div className="mt-6">
          <h3 className="serif mb-2 text-lg text-ink">研究笔记</h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{data.researchNote}</p>
        </div>
      )}
    </article>
  );
}

function LibraryView({ data }: { data: LibraryShareData }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-3">共 {data.count} 篇论文</p>
      {data.papers.map((p, i) => (
        <div key={i} className="surface rounded-2xl p-5">
          <h2 className="serif text-lg text-ink">{p.title}</h2>
          <p className="mt-1 text-sm text-ink-4">{p.authors.join(", ") || "未知作者"}</p>
          <div className="mt-2">
            <MetaRow p={p} />
          </div>
          {p.summary && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-2">{p.summary}</p>}
        </div>
      ))}
    </div>
  );
}
