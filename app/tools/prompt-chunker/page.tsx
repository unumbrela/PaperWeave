"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { getTool } from "@/lib/tools-registry";
import { ToolShell } from "@/components/tool-shell";
import { StreamOutput } from "@/components/stream-output";
import { useStream } from "@/components/use-stream";
import { consumeHandoff } from "@/lib/workflow/handoff";
import { HandoffBanner, SendToTool } from "@/components/workflow/handoff-controls";
import { cn } from "@/lib/utils";

const TOOL = getTool("prompt-chunker")!;

const EXECUTORS = [
  { value: "agent", label: "Agent", sub: "带工具的 LLM" },
  { value: "small-llm", label: "小模型", sub: "单次可解" },
  { value: "human-team", label: "人 + 团队", sub: "协作执行" },
] as const;

const MAX_CHUNKS = [4, 6, 8, 12] as const;

type Executor = (typeof EXECUTORS)[number]["value"];
type MaxChunks = (typeof MAX_CHUNKS)[number];

type Form = {
  task: string;
  executor: Executor;
  maxChunks: MaxChunks;
  domain: string;
};

type ChunkExample = {
  key: string;
  title: string;
  subtitle: string;
  accent: string;
  form: Form;
  naive: string;
  chunked: string;
};

const DEFAULT_FORM: Form = {
  task: "",
  executor: "agent",
  maxChunks: 8,
  domain: "",
};

const EXAMPLES: ChunkExample[] = [
  {
    key: "login-system",
    title: "写一个登录系统",
    subtitle: "模糊大任务 → 可执行 Runbook",
    accent: "#f59e0b",
    form: {
      task: "给我写一个完整的登录系统，要安全、要好看、要能发邮件验证码。最好还能加 GitHub 登录。",
      executor: "agent",
      maxChunks: 8,
      domain: "代码 · Next.js",
    },
    naive:
      "大模型直接写：给一堆伪代码与 \"TODO：发邮件逻辑自己填\"，漏掉 CSRF、会话存储、速率限制，UI 也普通。",
    chunked:
      "拆成 8 个原子 chunk：选型 → schema → 密码哈希 → 邮件验证码 → session → GitHub OAuth → UI → 验收测试。每个都有输入输出格式，Claude Haiku 也能一次跑过。",
  },
  {
    key: "competitor-report",
    title: "一份竞品分析报告",
    subtitle: "协作型任务 → 每步都有责任人与交付物",
    accent: "#ec4899",
    form: {
      task: "调研下我们这个赛道的前 5 名，做个报告，要有图表，要说出我们的机会点。下周要给老板看。",
      executor: "human-team",
      maxChunks: 6,
      domain: "研究 · 竞品",
    },
    naive:
      "LLM 裸答：给一份\"通用框架\"，没有具体竞品名，没有时间线，也没人认领，交付物模糊。",
    chunked:
      "6 个 chunk：圈定竞品清单 → 维度表 → 各自抓取产品 + 定价 + 增长 → 汇总 SWOT → 画图 → 汇报 deck。每 chunk 标明谁做、几天、交付文件名。",
  },
  {
    key: "long-blog",
    title: "3000 字技术博客",
    subtitle: "长文本 → 小模型串跑不崩",
    accent: "#6366f1",
    form: {
      task: "写一篇技术博客讲 DWT 小波分解在医学图像分割里为什么有用，要带例子，要有代码，3000 字左右。",
      executor: "small-llm",
      maxChunks: 12,
      domain: "写作 · 技术博客",
    },
    naive:
      "小模型裸写 3000 字：中段开始重复、代码编 API、结论空洞；大模型也常塞\"老生常谈\"。",
    chunked:
      "12 个原子 chunk：提纲 → 读者画像 → 每段一个 chunk（≤ 300 字） → 代码示例单独 chunk → 图注 → 校对。小模型每次只处理一段，不会崩。",
  },
];

export default function Page() {
  const [form, setForm] = useState<Form>(DEFAULT_FORM);
  const [handoffFrom, setHandoffFrom] = useState<string | null>(null);
  const { text, loading, error, run, stop } = useStream();

  useEffect(() => {
    // 挂载时一次性消费上游 handoff（如 Idea 生成器发来的验证计划）并水合输入
    /* eslint-disable react-hooks/set-state-in-effect */
    const h = consumeHandoff("prompt-chunker");
    if (!h) return;
    if (h.fields.task) setForm((f) => ({ ...f, task: h.fields.task }));
    setHandoffFrom(h.from);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const canSubmit = !loading && form.task.trim().length > 0;

  const submit = () => {
    if (!canSubmit) return;
    run("/api/chunk-it-up", {
      task: form.task,
      executor: form.executor,
      maxChunks: form.maxChunks,
      domain: form.domain.trim() || undefined,
    });
  };

  const applyExample = (ex: ChunkExample) => {
    setForm(ex.form);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <ToolShell tool={TOOL}>
      {/* 理论卡：紧贴 hero 下方 */}
      <TheoryCard />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] mt-8">
        {/* LEFT: input */}
        <div className="surface rounded-[20px] p-6 space-y-5">
          {handoffFrom && (
            <HandoffBanner from={handoffFrom} onDismiss={() => setHandoffFrom(null)} />
          )}
          <div>
            <label className="overline block mb-2">原始复杂任务</label>
            <textarea
              value={form.task}
              onChange={(e) => setForm((f) => ({ ...f, task: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
              }}
              placeholder="粘一段让你觉得“一次问 LLM 根本做不好”的任务…"
              rows={10}
              className={cn(
                "focus-ring w-full resize-y rounded-xl bg-paper-2/80 border border-line px-4 py-3",
                "text-[13.5px] leading-relaxed text-ink placeholder:text-ink-4",
                "outline-none transition-colors focus:border-line-strong",
              )}
            />
          </div>

          <div>
            <label className="overline block mb-2">最终执行者</label>
            <div className="grid grid-cols-3 gap-2">
              {EXECUTORS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setForm((f) => ({ ...f, executor: t.value }))}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-center transition-all",
                    form.executor === t.value
                      ? "border-ink bg-ink text-paper-2"
                      : "border-line bg-paper-2/60 text-ink-2 hover:border-line-strong hover:text-ink",
                  )}
                >
                  <div className="serif text-[17px] leading-none">{t.label}</div>
                  <div className="mono text-[10px] mt-1 opacity-70">{t.sub}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="overline block mb-2">
              目标 chunk 数上限
              <span className="ml-2 opacity-60 normal-case font-normal">
                越多越细、越稳，但越啰嗦
              </span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {MAX_CHUNKS.map((n) => (
                <button
                  key={n}
                  onClick={() => setForm((f) => ({ ...f, maxChunks: n }))}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-center transition-all",
                    form.maxChunks === n
                      ? "border-ink bg-ink text-paper-2"
                      : "border-line bg-paper-2/60 text-ink-2 hover:border-line-strong hover:text-ink",
                  )}
                >
                  <span className="serif text-[18px]">{n}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="overline block mb-2">
              领域提示 <span className="opacity-60 normal-case font-normal">· 可选</span>
            </label>
            <input
              value={form.domain}
              onChange={(e) =>
                setForm((f) => ({ ...f, domain: e.target.value }))
              }
              placeholder="例如：代码 · Next.js / 研究 · 竞品 / 写作 · 长文"
              className={cn(
                "focus-ring w-full rounded-xl bg-paper-2/80 border border-line px-4 py-2.5",
                "text-[13px] text-ink placeholder:text-ink-4",
                "outline-none transition-colors focus:border-line-strong",
              )}
            />
          </div>

          <button
            onClick={submit}
            disabled={!canSubmit}
            className={cn(
              "cta-gradient w-full rounded-full px-5 py-3 text-[14px] font-medium",
              "transition-all focus-ring",
              !canSubmit && "opacity-50 pointer-events-none",
            )}
          >
            {loading ? "拆解中…" : "Chunk it up →"}
          </button>

          <p className="text-[11px] text-ink-3 text-center">
            <kbd>⌘</kbd>
            <span className="mx-1">/</span>
            <kbd>Ctrl</kbd>
            <span className="mx-1">+</span>
            <kbd>Enter</kbd>
            <span className="ml-2 serif-italic">submit</span>
          </p>
        </div>

        {/* RIGHT: streaming output */}
        <div className="flex flex-col gap-3">
          <StreamOutput
            text={text}
            loading={loading}
            error={error}
            onRetry={submit}
            onStop={stop}
            emptyHint="粘贴任务，让拆解器把它切成小模型也能啃的块。"
          />
          {text && !loading && (
            <div className="flex flex-wrap justify-end gap-2">
              <SendToTool
                targetSlug="skill-maker"
                label="封装成 Claude Code Skill"
                payload={{
                  from: TOOL.name,
                  fields: {
                    capability: text,
                    trigger: form.task ? `用户要执行这个任务时：${form.task}` : "",
                  },
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* 管线图 */}
      <PipelineStrip />

      {/* 示例 */}
      <section className="mt-14">
        <div className="flex items-baseline justify-between mb-5">
          <div>
            <div className="overline mb-1" style={{ color: "#f59e0b" }}>
              examples · 一键填入
            </div>
            <h2 className="serif text-[30px] leading-tight text-ink">
              一开始就试三个
              <span className="serif-italic text-ink-3">, chunked.</span>
            </h2>
          </div>
          <div className="hairline hidden sm:block flex-1 mx-8 self-end mb-3" />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {EXAMPLES.map((ex) => (
            <ExampleCard
              key={ex.key}
              ex={ex}
              onApply={() => applyExample(ex)}
            />
          ))}
        </div>
      </section>
    </ToolShell>
  );
}

function TheoryCard() {
  return (
    <div
      className="surface rounded-[20px] p-6 mt-2"
      style={{
        background:
          "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(236,72,153,0.06))",
      }}
    >
      <div className="flex items-start gap-4">
        <span
          className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: "rgba(245,158,11,0.18)", color: "#b45309" }}
        >
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="flex-1">
          <div className="overline mb-2" style={{ color: "#b45309" }}>
            working hypothesis
          </div>
          <p className="serif text-[20px] leading-snug text-ink">
            只要把问题拆得
            <span className="serif-italic"> 足够细小</span>
            ，小 LLM 也能解决任意复杂任务。
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-2">
            依据三篇工作：
            {" "}
            <a
              className="underline decoration-dotted hover:text-ink"
              href="https://arxiv.org/abs/2205.10625"
              target="_blank"
              rel="noreferrer"
            >
              Least-to-Most Prompting
            </a>
            {" "}(Zhou et al., 2022)、
            {" "}
            <a
              className="underline decoration-dotted hover:text-ink"
              href="https://openreview.net/forum?id=_nGgzQjzaRy"
              target="_blank"
              rel="noreferrer"
            >
              Decomposed Prompting
            </a>
            {" "}(Khot et al., ICLR 2023) 与
            {" "}
            <a
              className="underline decoration-dotted hover:text-ink"
              href="https://arxiv.org/html/2402.05359v3"
              target="_blank"
              rel="noreferrer"
            >
              Divide-and-Conquer for LLMs
            </a>
            {" "}(2024)。这个工具把它们打包成一套
            {" "}
            <span className="mono text-[12.5px]">prompt → prompt</span>
            {" "}转换器。
          </p>
        </div>
      </div>
    </div>
  );
}

const PIPELINE: { key: string; title: string; desc: string }[] = [
  {
    key: "preprocess",
    title: "① Preprocess",
    desc: "挖出真实目标、模糊点、隐含假设、成功长什么样。",
  },
  {
    key: "chunk",
    title: "② Chunk It Up",
    desc: "原子化 C1..Cn，依赖图明确，每个都小到一次调用就能啃。",
  },
  {
    key: "scaffold",
    title: "③ Scaffold",
    desc: "每个 chunk 配角色、输入、输出格式、验收标准。",
  },
  {
    key: "verify",
    title: "④ Verify",
    desc: "逐 chunk checklist、跨 chunk 一致性、合并与重试策略。",
  },
  {
    key: "runbook",
    title: "⑤ Runbook",
    desc: "一段独立 Markdown，直接复制给 Agent / 小模型 / 团队。",
  },
];

function PipelineStrip() {
  return (
    <section className="mt-14">
      <div className="overline mb-4" style={{ color: "#f59e0b" }}>
        pipeline · 五个阶段
      </div>
      <div className="grid gap-3 md:grid-cols-5">
        {PIPELINE.map((s, i) => (
          <div
            key={s.key}
            className="surface rounded-[16px] p-4 relative overflow-hidden"
          >
            <div
              className="absolute top-0 left-0 h-[3px] w-full"
              style={{
                background: `linear-gradient(90deg, #f59e0b ${
                  (i / (PIPELINE.length - 1)) * 100
                }%, #ec4899 ${((i + 1) / (PIPELINE.length - 1)) * 100}%)`,
                opacity: 0.55,
              }}
            />
            <div className="serif text-[15px] text-ink">{s.title}</div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-ink-2">
              {s.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ExampleCard({
  ex,
  onApply,
}: {
  ex: ChunkExample;
  onApply: () => void;
}) {
  return (
    <div className="surface rounded-[20px] p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="overline mb-1.5" style={{ color: ex.accent }}>
            {ex.form.executor === "agent"
              ? "agent · 带工具"
              : ex.form.executor === "small-llm"
                ? "small-llm · 单次可解"
                : "human-team · 协作"}
          </div>
          <h3 className="serif text-[22px] leading-tight text-ink">
            {ex.title}
          </h3>
          <p className="mt-1 text-[12.5px] text-ink-2">{ex.subtitle}</p>
        </div>
        <span
          className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center"
          style={{ background: `${ex.accent}18`, color: ex.accent }}
        >
          <Sparkles className="h-4 w-4" />
        </span>
      </div>

      <div className="hairline" />

      <div className="space-y-2 text-[12px] leading-relaxed">
        <div className="flex gap-2">
          <span
            className="overline shrink-0 mt-0.5"
            style={{ color: "#a1a1aa", minWidth: 56 }}
          >
            naive →
          </span>
          <span className="text-ink-3">{ex.naive}</span>
        </div>
        <div className="flex gap-2">
          <span
            className="overline shrink-0 mt-0.5"
            style={{ color: ex.accent, minWidth: 56 }}
          >
            chunked →
          </span>
          <span className="text-ink">{ex.chunked}</span>
        </div>
      </div>

      <div className="flex-1" />

      <button
        onClick={onApply}
        className={cn(
          "self-start inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px]",
          "border border-line bg-paper-2/60 text-ink hover:border-line-strong transition-colors",
        )}
      >
        <span>填入示例</span>
        <span className="serif-italic text-ink-3">→</span>
      </button>
    </div>
  );
}
