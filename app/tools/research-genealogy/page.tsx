"use client";

import { useEffect, useState } from "react";
import { Terminal, GitBranch, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { getTool } from "@/lib/tools-registry";
import { ToolShell } from "@/components/tool-shell";
import { cn } from "@/lib/utils";
import { userKeyHeaders } from "@/lib/ai/user-keys";
import { consumeHandoff } from "@/lib/workflow/handoff";
import { HandoffBanner, SendToTool } from "@/components/workflow/handoff-controls";
import type { HandoffPayload } from "@/lib/workflow/handoff";
import {
  parseLineage,
  buildRows,
  lineageStats,
  type Lineage,
  type RenderRow,
  type Relation,
} from "@/lib/genealogy/lineage";
import exampleLineage from "@/skills/research-genealogy/examples/generated-image-detection.json";

const TOOL = getTool("research-genealogy")!;

const ROLE_GLYPH = { founder: "●", hub: "◉", frontier: "★", normal: "○" } as const;
const ROLE_COLOR = {
  founder: "#d24b7f",
  hub: "#7c3aed",
  frontier: "#b8860b",
  normal: "var(--ink-3, #8a8377)",
} as const;
const RELATION_CONNECTOR: Record<Relation, string> = {
  "builds-on": "└──",
  "inspired-by": "└┈┈",
  supersedes: "└══",
  parallel: "∥",
};

/** 从渲染好的族谱里抽出前沿工作，组织成「送去立论」的参考文本（找研究空白用）。 */
function gapPayload(lineage: Lineage): HandoffPayload {
  const maxYear = Math.max(...lineage.nodes.map((n) => n.year));
  const frontier = lineage.nodes
    .filter((n) => n.year >= maxYear - 1)
    .sort((a, b) => (b.citations ?? 0) - (a.citations ?? 0))
    .slice(0, 8);
  const refs = (frontier.length ? frontier : lineage.nodes.slice(-6))
    .map(
      (n) =>
        `- ${n.authors} (${n.year}): ${n.title}${n.contribution ? ` —— ${n.contribution}` : ""}`,
    )
    .join("\n");
  return {
    from: "研究脉络族谱",
    fields: {
      direction: lineage.field,
      references: `「${lineage.field}」方向的前沿工作（来自发展谱系，可据此找差异化切入点 / 研究空白）：\n${refs}`,
    },
  };
}

export default function Page() {
  const [direction, setDirection] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [handoffFrom, setHandoffFrom] = useState<string | null>(null);

  const [raw, setRaw] = useState("");
  const [lineage, setLineage] = useState<Lineage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 挂载时一次性消费上游 handoff（如「精读」步把论文方向带过来），非级联渲染
    /* eslint-disable react-hooks/set-state-in-effect */
    const h = consumeHandoff("research-genealogy");
    if (!h) return;
    if (h.fields.direction) setDirection(h.fields.direction);
    setHandoffFrom(h.from);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const render = (text: string) => {
    try {
      setLineage(parseLineage(text));
      setError(null);
    } catch (e) {
      setLineage(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const generate = async () => {
    const d = direction.trim();
    if (d.length < 2 || generating) return;
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/research-genealogy", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...userKeyHeaders() },
        body: JSON.stringify({ direction: d }),
      });
      const data = await res.json();
      if (data.success) {
        setLineage(data.data as Lineage);
        setRaw(JSON.stringify(data.data, null, 2));
        setError(null);
      } else {
        setGenError(data.error || "生成失败，请重试");
      }
    } catch {
      setGenError("网络异常或服务不可用，请稍后重试");
    } finally {
      setGenerating(false);
    }
  };

  const loadExample = () => {
    const text = JSON.stringify(exampleLineage, null, 2);
    setRaw(text);
    render(text);
  };

  return (
    <ToolShell tool={TOOL}>
      {/* 主路径：输入方向 → 一键生成发展谱系 */}
      <div className="surface rounded-[20px] p-6 mb-6">
        {handoffFrom && (
          <HandoffBanner from={handoffFrom} onDismiss={() => setHandoffFrom(null)} />
        )}
        <div className="overline mb-2 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" /> 梳理方向 · 一键生成发展谱系
        </div>
        <p className="text-[13.5px] leading-relaxed text-ink-2 mb-4">
          输入一个研究方向，从 OpenAlex 真实检索<strong>奠基</strong>（被引最高）与
          <strong>前沿</strong>（最新）论文作为节点，再由 AI 在其上推断发展脉络——
          谁在谁之上、哪些路线并行、最新前沿与研究空白在哪。节点全部来自 OpenAlex，不杜撰。
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate()}
            placeholder="如：生成图像检测 / 扩散模型 / 蛋白质结构预测"
            className={cn(
              "focus-ring flex-1 rounded-full bg-paper-2/80 border border-line px-5 py-2.5",
              "text-[14px] text-ink placeholder:text-ink-4 outline-none transition-colors focus:border-line-strong",
            )}
          />
          <button
            onClick={generate}
            disabled={direction.trim().length < 2 || generating}
            className="cta-gradient inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-[14px] font-medium transition-all focus-ring disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> 生成中…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> 一键生成
              </>
            )}
          </button>
        </div>
        {genError && <p className="mt-3 text-[12.5px] text-[#a53425]">{genError}</p>}
        <p className="mt-3 text-[12px] text-ink-4">
          网页版为 AI 综合，边未经引文核验；需要逐边核验过的深度谱系，见下方「终端深度模式」。
        </p>
      </div>

      {/* 族谱树渲染 + 衔接立论 */}
      {lineage && (
        <>
          <GenealogyTree lineage={lineage} />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-[12.5px] text-ink-3">
              发现研究空白 / 差异化切入点？带着前沿工作去
            </span>
            <SendToTool
              targetSlug="idea-generator"
              payload={gapPayload(lineage)}
              label="送去「创新点立论」"
            />
          </div>
        </>
      )}

      {/* 终端深度模式（高级）：跑 skill 做引文核验深度调研，再粘贴 lineage.json */}
      <details className="surface rounded-[20px] p-6 mt-6 group">
        <summary className="cursor-pointer list-none overline flex items-center gap-1.5 text-ink-2 transition-colors hover:text-ink">
          <Terminal className="h-3.5 w-3.5" /> 终端深度模式 · 引文核验的发展族谱（可选）
        </summary>
        <div className="grid gap-6 lg:grid-cols-2 mt-5">
          <div>
            <div className="overline mb-2 flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5" /> 第一步 · 终端里跑 skill（深度调研）
            </div>
            <p className="text-[13.5px] leading-relaxed text-ink-2">
              <code className="text-[12px] bg-paper-2/80 border border-line rounded px-1.5 py-0.5">research-genealogy</code>{" "}
              是本仓自带的 Claude Code skill：做多轮 OpenAlex 检索 + 引文滚雪球 + 谱系推导，
              每条 builds-on 边都经真实引文核验，并附完整叙事报告。
            </p>
            <pre className="mt-3 rounded-xl bg-paper-2/80 border border-line px-4 py-3 text-[12px] leading-relaxed text-ink-2 overflow-x-auto">
              {`# 安装（仓库根目录）
cp -r skills/research-genealogy ~/.claude/skills/

# 在 Claude Code 里直接说：
#   帮我梳理「生成图像检测」这个方向的发展历程`}
            </pre>
          </div>
          <div>
            <div className="overline mb-2 flex items-center gap-1.5">
              <GitBranch className="h-3.5 w-3.5" /> 第二步 · 把 lineage.json 带回站内
            </div>
            <p className="text-[13.5px] leading-relaxed text-ink-2 mb-3">
              skill 的中间产物是一份 <code className="text-[12px] bg-paper-2/80 border border-line rounded px-1.5 py-0.5">lineage.json</code>，
              粘贴到下面即可在站内渲染成同款族谱树（含 ✓ 引文核验标记）。
            </p>
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder='粘贴 lineage.json（{"field": "...", "nodes": [...], "edges": [...]}）'
              rows={5}
              className={cn(
                "focus-ring w-full rounded-xl bg-paper-2/80 border border-line px-4 py-3",
                "text-[12px] text-ink placeholder:text-ink-4 font-mono leading-relaxed",
                "outline-none transition-colors focus:border-line-strong resize-y",
              )}
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => render(raw)}
                disabled={!raw.trim()}
                className="cta-gradient rounded-full px-5 py-2 text-[13px] font-medium transition-all focus-ring disabled:opacity-50"
              >
                渲染族谱
              </button>
              <button
                onClick={loadExample}
                className="rounded-full border border-line bg-paper-2/60 px-5 py-2 text-[13px] text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
              >
                载入真实示例（生成图像检测 · 12 篇）
              </button>
            </div>
            {error && <p className="mt-2 text-[12.5px] text-[#a53425]">解析失败：{error}</p>}
          </div>
        </div>
      </details>

      {/* 防幻觉说明 */}
      <div className="surface rounded-[20px] p-6 mt-6">
        <div className="overline mb-3">为什么这棵树可信</div>
        <div className="grid gap-4 text-[13px] leading-relaxed text-ink-2 sm:grid-cols-3">
          <p>
            <strong className="text-ink">节点不靠回忆。</strong>
            每个节点都来自 OpenAlex 拉取的真实元数据（标题/作者/年份/被引），网页版与终端版皆然——
            「组织与叙述，绝不凭记忆报论文」。
          </p>
          <p>
            <strong className="text-ink">边分两档。</strong>
            网页版的边由 AI 在真实节点上综合，快但未经核验；终端版 verify.py 会逐边复核并打上
            ✓ / ⚠ 标记，树上如实展示。
          </p>
          <p>
            <strong className="text-ink">前沿有保障。</strong>
            专门的 frontier 检索批次保证近两年工作入树，避免「族谱停在三年前」这一最常见失败，
            也为下一步「立论」找空白提供着力点。
          </p>
        </div>
      </div>
    </ToolShell>
  );
}

function GenealogyTree({ lineage }: { lineage: Lineage }) {
  const rows = buildRows(lineage);
  const stats = lineageStats(lineage);

  return (
    <div className="surface rounded-[20px] p-6 overflow-x-auto">
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="serif text-[22px] text-ink">{lineage.field}</h2>
        <span className="text-[12px] text-ink-3">
          {stats.count} 篇 · {stats.minYear} → {stats.maxYear} · 引文核验 {stats.verifiedEdges}/
          {stats.totalTreeEdges} 条边
        </span>
      </div>

      <div className="min-w-[640px] font-mono text-[13px] leading-[1.45]">
        {rows.map((r) => (
          <TreeRow key={r.node.id} row={r} />
        ))}
      </div>

      <div className="mt-4 border-t border-line pt-3 text-[11.5px] text-ink-3">
        <span style={{ color: ROLE_COLOR.founder }}>●</span> 奠基{"  "}
        <span style={{ color: ROLE_COLOR.hub }}>◉</span> 枢纽{"  "}
        <span style={{ color: ROLE_COLOR.frontier }}>★</span> 前沿 ·{" "}
        <span className="font-mono">└──</span> builds-on{"  "}
        <span className="font-mono">└┈┈</span> inspired-by{"  "}
        <span className="font-mono">└══</span> supersedes{"  "}
        <span className="font-mono">∥</span> parallel · ✓ 引文已核验
      </div>
    </div>
  );
}

function TreeRow({ row }: { row: RenderRow }) {
  const { node, depth, relation, verified, role, extraParents, parallels } = row;
  return (
    <div className="group py-1" style={{ paddingLeft: `${depth * 28}px` }}>
      <div className="flex flex-wrap items-baseline gap-x-2">
        {relation && (
          <span className="text-ink-4">{RELATION_CONNECTOR[relation]}</span>
        )}
        <span style={{ color: ROLE_COLOR[role] }}>{ROLE_GLYPH[role]}</span>
        <span className="text-ink font-medium">
          {node.authors} <span className="text-ink-3 font-normal">({node.year})</span>
        </span>
        {verified === true && <span className="text-[#2e7d32]" title="builds-on 边经引文核验">✓</span>}
        {verified === false && <span className="text-[#b26a00]" title="该边未经引文核验">⚠</span>}
        {node.venue && <span className="text-[11px] text-ink-3">{node.venue}</span>}
        {typeof node.citations === "number" && (
          <span className="text-[11px] text-ink-4">被引 {node.citations}</span>
        )}
        {node.url && (
          <a
            href={node.url}
            target="_blank"
            rel="noreferrer"
            className="text-ink-4 opacity-0 transition-opacity group-hover:opacity-100 hover:text-ink"
            aria-label="打开论文链接"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <div className="text-[12px] text-ink-3 italic" style={{ paddingLeft: relation ? "44px" : "20px" }}>
        “{node.title}”
      </div>
      {(node.problem || node.contribution) && (
        <div
          className="max-w-[760px] text-[12px] leading-snug text-ink-3"
          style={{ paddingLeft: relation ? "44px" : "20px" }}
        >
          {node.problem}
          {node.problem && node.contribution && <span className="text-ink-4"> ⇒ </span>}
          <span className="text-ink-2">{node.contribution}</span>
        </div>
      )}
      {(extraParents.length > 0 || parallels.length > 0) && (
        <div
          className="text-[11.5px] text-ink-4"
          style={{ paddingLeft: relation ? "44px" : "20px" }}
        >
          {extraParents.map((p) => (
            <span key={p.authors} className="mr-3">
              → {p.relation}: {p.authors}
            </span>
          ))}
          {parallels.map((p) => (
            <span key={p} className="mr-3">
              ∥ parallel: {p}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
