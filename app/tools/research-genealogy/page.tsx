"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Terminal,
  GitBranch,
  Loader2,
  Sparkles,
  ExternalLink,
  Search,
  Network,
  ListTree,
  FileText,
} from "lucide-react";
import { getTool } from "@/lib/tools-registry";
import { ToolShell } from "@/components/tool-shell";
import { cn } from "@/lib/utils";
import { userKeyHeaders } from "@/lib/ai/user-keys";
import { consumeHandoff } from "@/lib/workflow/handoff";
import { HandoffBanner, SendToTool } from "@/components/workflow/handoff-controls";
import type { HandoffPayload } from "@/lib/workflow/handoff";
import {
  parseLineage,
  lineageStats,
  RELATIONS,
  type Lineage,
} from "@/lib/genealogy/lineage";
import { buildLayout, type LayoutRow } from "@/lib/genealogy/layout";
import { ROLE_COLOR, ROLE_LABEL, RELATION_STYLE } from "@/lib/genealogy/theme";
import { GenealogyTree, type TreeFilter } from "@/components/genealogy/GenealogyTree";
import { GenealogyControls } from "@/components/genealogy/GenealogyControls";
import { NodeDetail } from "@/components/genealogy/NodeDetail";
import detectionLineage from "@/skills/research-genealogy/examples/generated-image-detection.json";
import diffusionLineage from "@/skills/research-genealogy/examples/diffusion-models.json";

const TOOL = getTool("research-genealogy")!;

/** skill 仓库地址（终端深度模式安装与查看源码）。 */
const SKILL_REPO = "https://github.com/unumbrela/research-genealogy";

/** 站内可一键载入的真实示例（来自 skill 仓库 examples/，已逐边引文核验）。 */
const EXAMPLES = [
  {
    data: diffusionLineage,
    label: "扩散模型图像生成",
    meta: "21 篇 · 2011 → 2025 · 25/27 边核验",
  },
  {
    data: detectionLineage,
    label: "生成图像检测",
    meta: "12 篇 · 2018 → 2026 · 全边核验",
  },
] as const;

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

const ALL_RELATIONS: TreeFilter = {
  relations: new Set(RELATIONS),
  trunkOnly: false,
};

export default function Page() {
  const [direction, setDirection] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [handoffFrom, setHandoffFrom] = useState<string | null>(null);

  const [raw, setRaw] = useState("");
  const [lineage, setLineage] = useState<Lineage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<TreeFilter>(ALL_RELATIONS);
  const [selected, setSelected] = useState<LayoutRow | null>(null);
  const [jumpNonce, setJumpNonce] = useState(0);

  useEffect(() => {
    // 挂载时一次性消费上游 handoff（如「精读」步把论文方向带过来），非级联渲染
    /* eslint-disable react-hooks/set-state-in-effect */
    const h = consumeHandoff("research-genealogy");
    if (!h) return;
    if (h.fields.direction) setDirection(h.fields.direction);
    setHandoffFrom(h.from);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const accept = (l: Lineage) => {
    setLineage(l);
    setError(null);
    setSelected(null);
    setFilter({ relations: new Set(RELATIONS), trunkOnly: false });
  };

  const render = (text: string) => {
    try {
      accept(parseLineage(text));
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
        accept(data.data as Lineage);
        setRaw(JSON.stringify(data.data, null, 2));
      } else {
        setGenError(data.error || "生成失败，请重试");
      }
    } catch {
      setGenError("网络异常或服务不可用，请稍后重试");
    } finally {
      setGenerating(false);
    }
  };

  const loadExample = (data: unknown) => {
    const text = JSON.stringify(data, null, 2);
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

      {/* 族谱：统计头 + 工具条 + 树 + 衔接立论 */}
      {lineage && (
        <>
          <StatsHeader lineage={lineage} />
          <GenealogyControls
            lineage={lineage}
            filter={filter}
            setFilter={setFilter}
            onJumpFrontier={() => setJumpNonce((n) => n + 1)}
          />
          <GenealogyTree
            lineage={lineage}
            filter={filter}
            selectedId={selected?.node.id}
            onSelect={setSelected}
            jumpNonce={jumpNonce}
          />
          <Legend />
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

          <NodeDetail
            lineage={lineage}
            node={selected?.node ?? null}
            role={selected?.role}
            verified={selected?.verified}
            onClose={() => setSelected(null)}
          />
        </>
      )}

      {/* 不想配 key / 想要逐边核验？先看真实示例，再走终端深度模式 */}
      {!lineage && (
        <div className="surface rounded-[20px] p-6 mb-6">
          <div className="overline mb-2 flex items-center gap-1.5">
            <ListTree className="h-3.5 w-3.5" /> 先看两个真实示例（已逐边引文核验）
          </div>
          <p className="text-[13.5px] leading-relaxed text-ink-2 mb-4">
            没配 API key 也能体验——下面两份族谱由终端 skill 跑出、每条边经真实引文核验，
            点开即在站内渲染成可交互的发展谱系。
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                onClick={() => loadExample(ex.data)}
                className="group/ex flex items-center justify-between rounded-xl border border-line bg-paper-2/60 px-4 py-3 text-left transition-all hover:border-line-strong hover:bg-paper-2 focus-ring"
              >
                <span>
                  <span className="block text-[14px] font-medium text-ink">{ex.label}</span>
                  <span className="mt-0.5 block text-[11.5px] text-ink-3">{ex.meta}</span>
                </span>
                <GitBranch className="h-4 w-4 text-ink-4 transition-colors group-hover/ex:text-ink-2" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 终端深度模式（高级）：跑 skill 做引文核验深度调研，再粘贴 lineage.json */}
      <details className="surface rounded-[20px] p-6 mt-6 group">
        <summary className="cursor-pointer list-none overline flex items-center gap-1.5 text-ink-2 transition-colors hover:text-ink">
          <Terminal className="h-3.5 w-3.5" /> 终端深度模式 · 引文核验的发展族谱（可选）
        </summary>

        {/* 这是什么 + 四段流水线 + 多格式产出 */}
        <div className="mt-5 rounded-xl border border-line bg-paper-2/40 p-5">
          <p className="text-[13.5px] leading-relaxed text-ink-2">
            <a
              href={SKILL_REPO}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-ink underline decoration-line-strong underline-offset-2 hover:text-coral"
            >
              research-genealogy <ExternalLink className="h-3 w-3" />
            </a>{" "}
            是一个独立开源的 Claude Code skill：把一个研究方向，做成「谁在谁之上、哪些路线并行、什么被取代、前沿在哪」的
            <strong>非线性发展谱系</strong>。节点全来自 OpenAlex / Semantic Scholar 真实元数据，
            每条 builds-on 边都经 <code className="text-[12px] bg-paper-2 border border-line rounded px-1 py-0.5">verify.py</code> 逐边复核
            （<span className="text-[#2e7d32]">✓ verified</span> / <span className="text-[#b26a00]">⚠ unverified</span> / ↺ reversed / ‼ cross-cite）。stdlib-only、免 pip、OpenAlex 免 key。
          </p>

          {/* 四段流水线 */}
          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            {[
              { icon: Search, t: "检索派生", d: "方向 → 主词 + 2~3 个英文别名" },
              { icon: Network, t: "引文挖掘", d: "多轮检索 + 引文滚雪球" },
              { icon: ListTree, t: "谱系构建", d: "领域内打分 + 传递约简 + 并行检测" },
              { icon: FileText, t: "谱系报告", d: "真实摘要精修 + 树 + 叙事" },
            ].map((s, i) => (
              <div key={s.t} className="rounded-lg bg-paper-2/70 px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[12px] font-medium text-ink">
                  <s.icon className="h-3.5 w-3.5 text-ink-3" />
                  <span className="text-ink-4">{i + 1}</span> {s.t}
                </div>
                <p className="mt-1 text-[11px] leading-snug text-ink-3">{s.d}</p>
              </div>
            ))}
          </div>

          {/* 多格式产出 */}
          <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-ink-3">一次产出多种格式：</span>
            {["终端 ASCII 树", "Mermaid", "Markdown 报告", "BibTeX", "draw.io", "lineage.json"].map((f) => (
              <span key={f} className="rounded-full border border-line bg-paper-2/70 px-2 py-0.5 text-ink-2">
                {f}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 mt-5">
          <div>
            <div className="overline mb-2 flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5" /> 第一步 · 终端里跑 skill（深度调研）
            </div>
            <p className="text-[13.5px] leading-relaxed text-ink-2">
              装好后在 Claude Code 里用自然语言提问即可；也可走免 LLM 的 CLI 快路径直接出树。
            </p>
            <pre className="mt-3 rounded-xl bg-paper-2/80 border border-line px-4 py-3 text-[12px] leading-relaxed text-ink-2 overflow-x-auto">
              {`# 安装（任选其一）
npx skills add unumbrela/research-genealogy -g -a claude-code
# 或手动放到 ~/.claude/skills/research-genealogy/

# A · 在 Claude Code 里直接说：
#   帮我梳理「扩散模型图像生成」这个方向的发展历程

# B · 免 LLM 的 CLI 快路径（直接出树 + lineage.json）
python3 scripts/genealogy.py "扩散模型图像生成" \\
  --nodes 21 --render`}
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
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => render(raw)}
                disabled={!raw.trim()}
                className="cta-gradient rounded-full px-5 py-2 text-[13px] font-medium transition-all focus-ring disabled:opacity-50"
              >
                渲染族谱
              </button>
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  onClick={() => loadExample(ex.data)}
                  className="rounded-full border border-line bg-paper-2/60 px-4 py-2 text-[13px] text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
                >
                  载入「{ex.label}」
                </button>
              ))}
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
            <strong className="text-ink">边可核验。</strong>
            「B 引用 A」才会连出 A→B 的边；终端版 verify.py 逐边复核 OpenAlex / Semantic Scholar 引文，
            打上 ✓ verified / ⚠ unverified / ↺ reversed / ‼ cross-cite，树上如实展示。网页版边为 AI 综合、未核验。
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

function Metric({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="serif text-[20px] leading-none text-ink">{value}</span>
      <span className="mt-1 text-[11px] text-ink-3">{label}</span>
    </div>
  );
}

/** 族谱标题栏：方向名 + 关键统计 + 核验进度条。 */
function StatsHeader({ lineage }: { lineage: Lineage }) {
  const stats = lineageStats(lineage);
  const layout = useMemo(() => buildLayout(lineage), [lineage]);
  const routes = layout.rows.filter((r) => r.depth === 0).length;
  const parallels = layout.parallelLinks.length;
  const pct =
    stats.totalTreeEdges > 0
      ? Math.round((100 * stats.verifiedEdges) / stats.totalTreeEdges)
      : 0;

  return (
    <div className="surface mb-3 rounded-[20px] px-6 py-5">
      <h2 className="serif text-[24px] leading-tight text-ink">{lineage.field}</h2>
      <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-4">
        <Metric value={stats.count} label="篇论文" />
        <Metric value={`${stats.minYear} → ${stats.maxYear}`} label="时代跨度" />
        <Metric value={routes} label="条主线路" />
        <Metric value={parallels} label="组并行路线" />
        <div className="flex flex-col">
          <span className="serif text-[20px] leading-none text-ink">
            {stats.verifiedEdges}/{stats.totalTreeEdges}
          </span>
          <span className="mt-1 text-[11px] text-ink-3">引文核验边</span>
          <span className="mt-1.5 h-[3px] w-28 overflow-hidden rounded-full bg-[rgba(26,23,19,0.10)]">
            <span
              className="block h-full rounded-full"
              style={{ width: `${pct}%`, background: ROLE_COLOR.hub, opacity: 0.6 }}
            />
          </span>
        </div>
      </div>
    </div>
  );
}

/** 族谱图例：角色标记 + 关系样式。 */
function Legend() {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 text-[11.5px] text-ink-3">
      {(["founder", "hub", "frontier"] as const).map((r) => (
        <span key={r} className="inline-flex items-center gap-1">
          <span style={{ color: ROLE_COLOR[r] }}>
            {r === "founder" ? "●" : r === "hub" ? "◉" : "★"}
          </span>
          {ROLE_LABEL[r]}
        </span>
      ))}
      <span className="h-3 w-px bg-line" />
      {RELATIONS.map((r) => (
        <span key={r} className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: RELATION_STYLE[r].color }} />
          {RELATION_STYLE[r].label}
        </span>
      ))}
      <span className="h-3 w-px bg-line" />
      <span><span className="text-[#2e7d32]">✓</span> 引文已核验</span>
      <span className="text-ink-4">· 悬停看血缘路径 · 点击看详情</span>
    </div>
  );
}
