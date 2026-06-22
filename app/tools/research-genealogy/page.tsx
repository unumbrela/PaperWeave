"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Terminal,
  GitBranch,
  Loader2,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Network,
  GitFork,
  ArrowRightLeft,
  Package,
  Copy,
  Check,
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

/** skill 仓库地址（自研 Claude Code skill，安装与查看源码）。 */
const SKILL_REPO = "https://github.com/unumbrela/research-genealogy";
/** 一键安装命令。 */
const INSTALL_CMD = "npx skills add unumbrela/research-genealogy -g -a claude-code";

/** 配图：原分辨率高质量 WebP（绕过优化器 ≤1080/q80 上限，优先保清晰，见 Figure）。 */
const PIPELINE_IMG = "/research-genealogy/pipeline.webp";
const DIFFUSION_IMG = "/research-genealogy/diffusion-genealogy.webp";

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

/** 这个模块能做什么 —— 开头功能介绍的三点。 */
const FEATURES = [
  {
    icon: Network,
    t: "看整个方向，而非单篇",
    d: "引文图谱看一篇论文的邻居；族谱把一个方向从奠基到前沿的发展脉络整张铺开。",
  },
  {
    icon: ShieldCheck,
    t: "节点不杜撰，边可核验",
    d: "每个节点来自 OpenAlex / Semantic Scholar 真实元数据；终端版逐边复核引文，✓/⚠ 如实标注。",
  },
  {
    icon: ArrowRightLeft,
    t: "找到空白，接着立论",
    d: "族谱把前沿与研究空白显化，一键把前沿工作送往「创新点立论」，闭合科研工作流。",
  },
] as const;

/** 扩散模型示例的五条技术路线（与结果图对应，供图文并茂叙事）。 */
const DIFFUSION_LANES = [
  {
    k: "理论奠基",
    y: "2011 → 2015",
    d: "score matching（Vincent）与非平衡热力学扩散（Sohl-Dickstein）埋下分数 / 扩散的理论种子。",
  },
  {
    k: "DDPM 引爆",
    y: "2020",
    d: "Ho 等把扩散做成可行的高质量生成器，成为整个方向的枢纽，分数路线（NCSN / Score-SDE）在此汇流。",
  },
  {
    k: "采样加速",
    y: "2020 → 2023",
    d: "DDIM → DPM-Solver → Consistency，把上千步采样压到几步，是扩散落地的关键分叉。",
  },
  {
    k: "可控与潜空间",
    y: "2021 → 2023",
    d: "classifier guidance → CFG → ControlNet 解决「可控」，LDM / Stable Diffusion 把生成搬进潜空间、推向民用。",
  },
  {
    k: "并行竞争与前沿",
    y: "2022 → 2025",
    d: "Transformer 骨干（DiT）与自回归挑战者（VAR）并行推进，扩散逐步取代 GAN；SD3 / Janus-Pro 走向多模态统一。",
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

      {/* 功能介绍 + 架构图 + 图文并茂的完整示例（无族谱时展示） */}
      {!lineage && (
        <>
          {/* 一、这个模块能做什么 */}
          <section className="surface rounded-[20px] p-6 mb-6">
            <div className="overline mb-3 flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" /> 自研 Claude Code Skill · 站内 + 终端两用
            </div>
            <p className="serif text-[19px] leading-snug text-ink mb-1">
              输入一个研究方向，得到它<span className="serif-italic">从奠基到前沿</span>的发展族谱
            </p>
            <p className="text-[13.5px] leading-relaxed text-ink-2 mb-4 max-w-3xl">
              背后是一个<strong>自研、开源的 Claude Code skill</strong>
              <a
                href={SKILL_REPO}
                target="_blank"
                rel="noreferrer"
                className="mx-1 inline-flex items-center gap-0.5 font-medium text-ink underline decoration-line-strong underline-offset-2 hover:text-coral"
              >
                research-genealogy <ExternalLink className="h-3 w-3" />
              </a>
              ——一行命令即可装进你自己的 Claude Code，在终端做引文核验的深度调研；它的产物又能一键带回站内，
              渲染成下面这棵「谁在谁之上、哪些路线并行、什么被取代、前沿在哪」的非线性发展树。每个节点都是真实论文，绝不凭记忆杜撰。
            </p>

            {/* 一键安装命令 */}
            <div className="mb-5">
              <div className="overline mb-1.5 text-[10px]">一行安装到你的 Claude Code</div>
              <CopyCommand cmd={INSTALL_CMD} />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.t} className="rounded-xl border border-line bg-paper-2/50 p-4">
                  <div className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
                    <f.icon className="h-4 w-4 text-ink-3" /> {f.t}
                  </div>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-ink-3">{f.d}</p>
                </div>
              ))}
            </div>

            {/* 架构图：四段流水线 */}
            <div className="mt-6">
              <div className="overline mb-2 flex items-center gap-1.5">
                <Network className="h-3.5 w-3.5" /> 它是怎么跑出来的 · 四段流水线
              </div>
              <Figure
                src={PIPELINE_IMG}
                alt="research-genealogy 四段流水线架构图：输入与检索派生 → 真实引用图谱挖掘（OpenAlex）→ 谱系构建管线 → 谱系发展报告输出，底部为零幻觉保障"
                ratio="1491 / 1055"
                caption="方向 → 真实引文图谱挖掘（OpenAlex / Semantic Scholar）→ 领域内打分 + 传递约简 + 并行检测 → 非线性谱系报告。底部一行是「零幻觉」保障：节点来自真实元数据、边经引文核验。"
              />
            </div>
          </section>

          {/* 二、完整示例：扩散模型图像生成（图文并茂） */}
          <section className="surface rounded-[20px] p-6 mb-6">
            <div className="overline mb-2 flex items-center gap-1.5">
              <GitFork className="h-3.5 w-3.5" /> 完整示例 · 扩散模型图像生成
            </div>
            <p className="serif text-[20px] leading-tight text-ink">
              扩散模型图像生成的发展历程 <span className="text-ink-3 text-[15px]">2011 → 2025</span>
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2 max-w-3xl">
              21 篇论文、5 条技术路线、25/27 条边经 OpenAlex / Semantic Scholar 引文核验。
              下面是终端 skill 跑出的完整谱系结果图——
            </p>

            <div className="mt-4">
              <Figure
                src={DIFFUSION_IMG}
                alt="扩散模型图像生成发展历程谱系图（2011→2025）：分数/SDE、扩散+采样、潜空间生成、引导/架构/统一、GAN 线五条横向时间线，含 builds-on / inspired-by / parallel / supersedes 关系"
                ratio="1672 / 941"
                caption="五条技术路线横向并置的时间线谱系；实线 builds-on、虚线 inspired-by、∥ parallel、双线 supersedes（扩散逐步取代 GAN）。"
              />
            </div>

            {/* 五条路线叙事 */}
            <ol className="mt-5 space-y-3">
              {DIFFUSION_LANES.map((l, i) => (
                <li key={l.k} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-paper-2 text-[11px] font-semibold text-ink-3">
                    {i + 1}
                  </span>
                  <p className="text-[13px] leading-relaxed text-ink-2">
                    <span className="font-medium text-ink">{l.k}</span>
                    <span className="ml-1.5 text-[11.5px] text-ink-4">{l.y}</span>
                    <span className="mx-1.5 text-ink-4">·</span>
                    {l.d}
                  </p>
                </li>
              ))}
            </ol>

            {/* 在站内打开可交互版 */}
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
              <span className="text-[12.5px] text-ink-3">
                想自己点开看？在站内渲染成<strong>可交互</strong>的族谱——悬停看血缘、点击看详情、一键送去立论：
              </span>
              <button
                onClick={() => loadExample(diffusionLineage)}
                className="cta-gradient inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-[13px] font-medium transition-all focus-ring"
              >
                <Sparkles className="h-3.5 w-3.5" /> 打开扩散模型族谱
              </button>
              <button
                onClick={() => loadExample(detectionLineage)}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper-2/60 px-4 py-2 text-[13px] text-ink-2 transition-colors hover:border-line-strong hover:text-ink focus-ring"
              >
                <GitBranch className="h-3.5 w-3.5" /> 换个示例 · 生成图像检测
              </button>
            </div>
          </section>
        </>
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
    </ToolShell>
  );
}

/** 一行命令 + 复制按钮。 */
function CopyCommand({ cmd }: { cmd: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* 剪贴板不可用时静默——用户仍可手动选中复制 */
    }
  };
  return (
    <div className="flex items-stretch gap-2">
      <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-lg border border-line bg-paper-2/80 px-3.5 py-2.5 font-mono text-[12.5px] text-ink-2">
        <span className="select-none text-ink-4">$ </span>
        {cmd}
      </code>
      <button
        onClick={copy}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-paper-2/60 px-3 text-[12px] text-ink-2 transition-colors hover:border-line-strong hover:text-ink focus-ring"
        aria-label="复制安装命令"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-[#2e7d32]" /> 已复制
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" /> 复制
          </>
        )}
      </button>
    </div>
  );
}

/** 带边框 / 浅底 / 可点击放大的配图。 */
function Figure({
  src,
  alt,
  ratio,
  caption,
}: {
  src: string;
  alt: string;
  ratio: string;
  caption: string;
}) {
  return (
    <figure>
      <a
        href={src}
        target="_blank"
        rel="noreferrer"
        className="group/fig relative block w-full overflow-hidden rounded-xl border border-line bg-white focus-ring"
        style={{ aspectRatio: ratio }}
        title="点击查看大图"
      >
        {/* unoptimized：直出原分辨率高质量 WebP，绕过优化器 ≤1080/q80 的降采样，优先保清晰 */}
        <Image
          src={src}
          alt={alt}
          fill
          unoptimized
          sizes="(max-width: 1024px) 100vw, 880px"
          className="object-contain"
        />
        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-paper/85 px-2 py-0.5 text-[10px] text-ink-3 opacity-0 transition-opacity group-hover/fig:opacity-100">
          <ExternalLink className="h-3 w-3" /> 看大图
        </span>
      </a>
      <figcaption className="mt-2 text-[11.5px] leading-relaxed text-ink-3 serif-italic">
        {caption}
      </figcaption>
    </figure>
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
