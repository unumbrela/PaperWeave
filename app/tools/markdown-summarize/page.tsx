"use client";

import { useEffect, useState } from "react";
import { Library, Loader2, Sparkles, FlaskConical } from "lucide-react";
import { getTool } from "@/lib/tools-registry";
import { ToolShell } from "@/components/tool-shell";
import { StreamOutput } from "@/components/stream-output";
import { useStream } from "@/components/use-stream";
import { Button } from "@/components/ui/button";
import { consumeHandoff } from "@/lib/workflow/handoff";
import { HandoffBanner, SendToTool, SaveToLibrary } from "@/components/workflow/handoff-controls";
import { repository } from "@/lib/db/repository";
import type { Paper } from "@/lib/db/types";
import { cn } from "@/lib/utils";

const TOOL = getTool("markdown-summarize")!;

const FOCUS = [
  { value: "balanced", label: "均衡" },
  { value: "method", label: "偏方法" },
  { value: "experiment", label: "偏实验" },
  { value: "related", label: "偏综述" },
  { value: "innovation", label: "偏创新" },
] as const;

// 八个「创新算子」速查——与后端 INNOVATION_OPERATORS 同源，用于示例面板的脚手架展示。
const OPERATORS = [
  ["替换", "换目标函数 / backbone / 模态"],
  ["约束变更", "加更强约束，或放松一个默认假设"],
  ["组合", "把两条独立路线拼起来"],
  ["迁移", "把方法搬到另一领域 / 任务"],
  ["简化", "删掉一个看似必要的组件还 work 吗"],
  ["反转", "颠倒流程 / 因果 / 优化方向"],
  ["尺度变更", "放大 / 缩小数据 / 模型 / 粒度"],
  ["自动化", "把手工的一步学出来"],
] as const;

// 内嵌的端到端示例（LoRA）——它的真实后续工作 AdaLoRA/QLoRA/DoRA 恰好就是各算子的实例化，能自证框架有效。
const EXAMPLE_MD = `# LoRA: Low-Rank Adaptation of Large Language Models

全参微调大语言模型代价高昂：每个下游任务都要存一份与原模型同样大的权重。LoRA 冻结预训练权重 W，在旁路注入低秩矩阵，用 ΔW = B·A（B ∈ R^{d×r}, A ∈ R^{r×k}, r ≪ d）来近似权重更新，训练时只更新 A、B 两个小矩阵。

在 GPT-3 175B 上，LoRA 把可训练参数量降低约 1 万倍、显存占用降低约 3 倍，质量与全参微调相当或更好。推理时可把 B·A 合并回 W，因此相比 Adapter 这类串联模块，LoRA 不引入额外推理延迟。论文对所有注入层使用同一个秩 r，r 作为超参数需要按经验选取。`;

// 把流式产出按 "## 二级标题" 切片，取出指定几节拼成更聚焦的下游输入。
function sliceSections(md: string, titles: string[]): string {
  const blocks = md.split(/\n(?=##\s)/);
  const picked = blocks.filter((b) => titles.some((t) => b.trimStart().startsWith(`## ${t}`)));
  return picked.join("\n\n").trim();
}

// 从产出里猜一个研究方向：优先取 TL;DR 末尾的领域线索，退而取首个 H1 标题。
function guessDirection(md: string): string {
  const h1 = md.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return h1 ? h1.replace(/[:：].*$/, "").trim() : "";
}

export default function Page() {
  const [markdown, setMarkdown] = useState("");
  const [focus, setFocus] = useState<(typeof FOCUS)[number]["value"]>("balanced");
  const [handoffFrom, setHandoffFrom] = useState<string | null>(null);
  const [sourcePaperId, setSourcePaperId] = useState<string | null>(null);
  const [libPapers, setLibPapers] = useState<Paper[] | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loadingLib, setLoadingLib] = useState(false);
  const { text, loading, error, run, stop } = useStream();

  // 从论文库选篇：首次打开时懒加载列表（本地 Dexie）。
  const togglePicker = async () => {
    const next = !pickerOpen;
    setPickerOpen(next);
    if (next && libPapers === null) {
      setLoadingLib(true);
      try {
        setLibPapers(await repository.listPapers());
      } catch {
        setLibPapers([]);
      } finally {
        setLoadingLib(false);
      }
    }
  };

  // 选中一篇：把标题 + 摘要（+ 已有速览）带入输入框（库内无全文，以摘要起步）。
  const pickPaper = (p: Paper) => {
    const parts = [`# ${p.title}`];
    if (p.abstract) parts.push(p.abstract);
    if (p.summary) parts.push(`## 已有速览\n\n${p.summary}`);
    setMarkdown(parts.join("\n\n"));
    setSourcePaperId(p.id);
    setPickerOpen(false);
  };

  useEffect(() => {
    // 挂载时一次性消费上游 handoff 并水合输入，非级联渲染
    /* eslint-disable react-hooks/set-state-in-effect */
    const h = consumeHandoff("markdown-summarize");
    if (!h) return;
    if (h.fields.markdown) setMarkdown(h.fields.markdown);
    if (h.sourcePaperId) setSourcePaperId(h.sourcePaperId);
    setHandoffFrom(h.from);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const submit = () => {
    const trimmed = markdown.trim();
    if (trimmed.length < 40) return;
    run("/api/markdown-summarize", { markdown: trimmed, focus });
  };

  return (
    <ToolShell tool={TOOL}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="surface rounded-[20px] p-6">
          {handoffFrom && (
            <HandoffBanner from={handoffFrom} onDismiss={() => setHandoffFrom(null)} />
          )}
          <div className="mb-2 flex items-center justify-between">
            <label className="overline">论文 Markdown</label>
            <button
              onClick={togglePicker}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition-all",
                pickerOpen
                  ? "border-plum/50 bg-plum/10 text-plum"
                  : "border-line bg-paper-2/60 text-ink-2 hover:border-line-strong hover:text-ink",
              )}
            >
              {loadingLib ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Library className="h-3.5 w-3.5" />}
              从论文库选篇
            </button>
          </div>

          {pickerOpen && (
            <div className="mb-3 max-h-56 overflow-y-auto rounded-xl border border-line bg-paper-2/60 p-1.5">
              {loadingLib ? (
                <p className="px-2 py-3 text-center text-[12px] text-ink-3">读取论文库…</p>
              ) : libPapers && libPapers.length > 0 ? (
                libPapers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => pickPaper(p)}
                    className="block w-full rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-paper-3"
                  >
                    <div className="line-clamp-1 text-[13px] text-ink">{p.title}</div>
                    <div className="mt-0.5 line-clamp-1 text-[11px] text-ink-4">
                      {p.abstract ? p.abstract.slice(0, 90) : "（无摘要）"}
                    </div>
                  </button>
                ))
              ) : (
                <p className="px-2 py-3 text-center text-[12px] text-ink-3">
                  论文库还是空的——先去「调研搜索」入库几篇。
                </p>
              )}
            </div>
          )}
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
            placeholder="粘贴论文 Markdown（通常来自「文献格式转译」的输出）…"
            rows={14}
            className={cn(
              "focus-ring w-full rounded-xl bg-paper-2/80 border border-line px-4 py-3",
              "text-[13px] text-ink placeholder:text-ink-4 font-mono leading-relaxed",
              "outline-none transition-colors focus:border-line-strong resize-y",
            )}
          />

          <label className="overline block mt-6 mb-2">提取侧重</label>
          <div className="grid grid-cols-5 gap-2">
            {FOCUS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFocus(f.value)}
                className={cn(
                  "rounded-xl border px-2 py-2.5 text-center transition-all",
                  focus === f.value
                    ? "border-ink bg-ink text-paper-2"
                    : "border-line bg-paper-2/60 text-ink-2 hover:border-line-strong hover:text-ink",
                )}
              >
                <div className="serif text-[14px] leading-none">{f.label}</div>
              </button>
            ))}
          </div>

          <button
            onClick={submit}
            disabled={loading || markdown.trim().length < 40}
            className={cn(
              "cta-gradient mt-8 w-full rounded-full px-5 py-3 text-[14px] font-medium",
              "transition-all focus-ring",
            )}
          >
            {loading ? "正在总结…" : "要点提炼"}
          </button>

          <p className="mt-3 text-[11px] text-ink-3 text-center">
            <kbd>⌘</kbd>
            <span className="mx-1">/</span>
            <kbd>Ctrl</kbd>
            <span className="mx-1">+</span>
            <kbd>Enter</kbd>
            <span className="ml-2 serif-italic">submit</span>
          </p>

          <details className="mt-6 rounded-xl border border-line bg-paper-2/50 px-4 py-3">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-[13px] text-ink-2 select-none">
              <Sparkles className="h-3.5 w-3.5 text-plum" />
              <span className="serif">从「读懂」到「设计新创新」</span>
              <span className="ml-auto text-[11px] text-ink-4">方法论 · 端到端示例</span>
            </summary>

            <div className="mt-3 hairline" />

            <p className="mt-3 text-[12.5px] leading-relaxed text-ink-2">
              「偏创新」模式不止做总结：它先把论文的<strong className="text-ink">创新点</strong>拆成画像，
              再读出<strong className="text-ink">局限与留白</strong>，最后用八个「创新算子」把每个留白
              <strong className="text-ink">系统化地</strong>发散成可验证的新创新种子——把「灵光一现」变成「可枚举的搜索」。
            </p>

            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
              {OPERATORS.map(([name, hint]) => (
                <div key={name} className="flex items-baseline gap-1.5 text-[11.5px]">
                  <span className="shrink-0 font-medium text-plum">{name}</span>
                  <span className="text-ink-4">{hint}</span>
                </div>
              ))}
            </div>

            <p className="mt-4 text-[12px] leading-relaxed text-ink-3">
              <strong className="text-ink-2">示例（LoRA）</strong>：读出「秩 r 需手调、各层等秩、未结合量化、只控幅度不控方向」等留白后，
              用算子发散即得 —— 〔约束变更〕秩自适应分配 → <em className="serif-italic">AdaLoRA</em>；
              〔组合〕LoRA + 4bit 量化 → <em className="serif-italic">QLoRA</em>；
              〔分解/替换〕拆成幅度与方向 → <em className="serif-italic">DoRA</em>。真实的后续工作正是这些算子的实例化。
            </p>

            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                setMarkdown(EXAMPLE_MD);
                setFocus("innovation");
                setSourcePaperId(null);
              }}
            >
              <FlaskConical className="h-3.5 w-3.5" />
              载入 LoRA 示例并切到「偏创新」
            </Button>
          </details>
        </div>

        <div className="flex flex-col gap-3">
          <StreamOutput
            text={text}
            loading={loading}
            error={error}
            onRetry={submit}
            onStop={stop}
            emptyHint="粘贴论文 Markdown，点击要点提炼。选「偏创新」可读出创新点画像并衍生新方向。"
          />
          {text && !loading && (
            <div className="flex flex-wrap justify-end gap-2">
              {sourcePaperId && (
                <SaveToLibrary
                  paperId={sourcePaperId}
                  field="summary"
                  value={text}
                  label="回存为论文总结"
                />
              )}
              <SendToTool
                targetSlug="idea-generator"
                payload={{
                  from: TOOL.name,
                  sourcePaperId: sourcePaperId ?? undefined,
                  fields: {
                    // 只把「创新点画像 + 局限与留白 + 创新设计启发」三节交给下游，信息更聚焦；解析失败则回退整段。
                    references:
                      sliceSections(text, ["创新点画像", "局限与留白", "创新设计启发"]) || text,
                    direction: guessDirection(text),
                  },
                }}
                label="把创新点发往「创新点立论」"
              />
            </div>
          )}
        </div>
      </div>
    </ToolShell>
  );
}
