"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, Loader2, BookOpen } from "lucide-react";
import { repository } from "@/lib/db/repository";
import { computeStats, type LibraryStats, type Bucket } from "@/lib/library-stats/stats";
import { ANNOTATION_COLORS, type AnnotationType } from "@/lib/db/types";

const ANNOTATION_LABELS: Record<AnnotationType, string> = {
  highlight: "高亮",
  insight: "洞察",
  todo: "待办",
  transferable: "可迁移",
};

export default function LibraryStatsPage() {
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [papers, annotations] = await Promise.all([
          repository.listPapers(),
          repository.listAllAnnotations(),
        ]);
        setStats(computeStats(papers, annotations));
      } catch {
        setStats(computeStats([], []));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen">
      <div className="sticky top-14 z-30 border-b border-line bg-glass-2 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/library" className="flex items-center gap-2 text-sm text-ink-3 transition-colors hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> 返回论文库
          </Link>
          <span className="flex items-center gap-2 text-sm text-ink-2">
            <BarChart3 className="h-4 w-4 text-plum" /> 统计看板
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8">
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center text-ink-3">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" /> 统计中…
          </div>
        ) : !stats || stats.total === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
            <BookOpen className="mb-3 h-12 w-12 text-ink-4" />
            <p className="text-ink-3">论文库还是空的，入库几篇后再来看统计。</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 数字卡 */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard label="论文总数" value={stats.total} />
              <StatCard label="累计被引" value={stats.totalCitations.toLocaleString()} />
              <StatCard label="批注总数" value={stats.totalAnnotations} />
              <StatCard label="含笔记论文" value={stats.totalNotes} />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Panel title="来源分布">
                <Bars data={stats.bySource} color="#4bb3ff" />
              </Panel>

              <Panel title="批注分类">
                {stats.totalAnnotations === 0 ? (
                  <Empty>还没有批注。去精读模式里高亮 / 批注吧。</Empty>
                ) : (
                  <Bars
                    data={stats.byAnnotationType.map((b) => ({ label: ANNOTATION_LABELS[b.type], count: b.count }))}
                    colorOf={(i) => ANNOTATION_COLORS[stats.byAnnotationType[i].type]}
                  />
                )}
              </Panel>

              <Panel title="按发表年份">
                {stats.byYear.length === 0 ? <Empty>暂无发表年份信息。</Empty> : <Bars data={stats.byYear} color="#b14bff" />}
              </Panel>

              <Panel title="按月入库">
                {stats.byMonth.length === 0 ? <Empty>暂无入库记录。</Empty> : <Bars data={stats.byMonth} color="#10b981" />}
              </Panel>
            </div>

            {/* 标签云 */}
            <Panel title="主题标签云">
              {stats.topTags.length === 0 ? (
                <Empty>还没有主题标签。</Empty>
              ) : (
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
                  {stats.topTags.map((t) => {
                    const max = stats.topTags[0].count;
                    const size = 13 + Math.round((t.count / max) * 16);
                    return (
                      <span
                        key={t.tag}
                        style={{ fontSize: size }}
                        className="text-ink-2 transition-colors hover:text-plum"
                        title={`${t.count} 篇`}
                      >
                        {t.tag}
                      </span>
                    );
                  })}
                </div>
              )}
            </Panel>

            {/* 最高引用 */}
            {stats.topCited.length > 0 && (
              <Panel title="被引最高">
                <ol className="space-y-2">
                  {stats.topCited.map((c, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <span className="w-5 shrink-0 text-right text-ink-4">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-ink-2">{c.title}</span>
                      <span className="shrink-0 font-medium text-plum">{c.citations.toLocaleString()}</span>
                    </li>
                  ))}
                </ol>
              </Panel>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="surface rounded-2xl p-4">
      <div className="serif text-3xl text-ink">{value}</div>
      <div className="mt-1 text-[12px] text-ink-3">{label}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="surface rounded-2xl p-5">
      <h2 className="overline mb-4 text-ink-3">{title}</h2>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-[13px] text-ink-4">{children}</p>;
}

/** 横向条形图（纯 CSS，宽度按最大值归一）。 */
function Bars({
  data,
  color = "#b14bff",
  colorOf,
}: {
  data: Bucket[];
  color?: string;
  colorOf?: (index: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={d.label + i} className="flex items-center gap-3">
          <span className="w-16 shrink-0 truncate text-right text-[12px] text-ink-3" title={d.label}>
            {d.label}
          </span>
          <div className="h-5 flex-1 overflow-hidden rounded bg-paper-3/50">
            <div
              className="flex h-full items-center justify-end rounded pr-2 text-[11px] font-medium text-white/90 transition-all"
              style={{
                width: `${Math.max(8, (d.count / max) * 100)}%`,
                background: colorOf ? colorOf(i) : color,
              }}
            >
              {d.count}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
