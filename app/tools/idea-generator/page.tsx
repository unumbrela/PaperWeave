"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles, Microscope, Compass, FlaskConical } from "lucide-react";
import { getTool } from "@/lib/tools-registry";
import { ToolShell } from "@/components/tool-shell";
import { useStream } from "@/components/use-stream";
import { Markdown } from "@/components/markdown";
import { consumeHandoff } from "@/lib/workflow/handoff";
import { HandoffBanner, SaveToLibrary, SendToTool } from "@/components/workflow/handoff-controls";
import { TextField, Textarea, FieldLabel, Button } from "@/components/ui";
import { userKeyHeaders } from "@/lib/ai/user-keys";
import { StageStepper, type StageKey } from "@/components/idea/StageStepper";
import { LensPicker } from "@/components/idea/LensPicker";
import { GapMap } from "@/components/idea/GapMap";
import { ScoreMatrix } from "@/components/idea/ScoreMatrix";
import { IdeaCard } from "@/components/idea/IdeaCard";
import { parseIdeaSet, pickRecommended } from "@/lib/idea/parse";
import type { Diagnosis, Idea, IdeaSet } from "@/lib/idea/types";
import {
  EXAMPLE_INPUT,
  EXAMPLE_DIAGNOSIS,
  EXAMPLE_IDEASET,
  EXAMPLE_LENS_IDS,
} from "@/lib/idea/example";

const TOOL = getTool("idea-generator")!;
const ACCENT = "#f59e0b";

function ideaToText(idea: Idea): string {
  return [
    `# ${idea.title}`,
    `**动机**：${idea.motivation}`,
    `**差异化假设**：${idea.hypothesis}`,
    `**最小验证实验**：${idea.experiment}`,
    `**资源开销**：${idea.resources}`,
    idea.risk && `**风险**：${idea.risk}`,
    idea.lens && `**创新透镜**：${idea.lens}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export default function Page() {
  // 输入
  const [direction, setDirection] = useState("");
  const [references, setReferences] = useState("");
  const [baseline, setBaseline] = useState("");
  const [resources, setResources] = useState("");
  const [handoffFrom, setHandoffFrom] = useState<string | null>(null);
  const [sourcePaperId, setSourcePaperId] = useState<string | null>(null);

  // 阶段
  const [stage, setStage] = useState<StageKey>("diagnose");
  const [reached, setReached] = useState<Set<StageKey>>(new Set(["diagnose"]));

  // 诊断
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagError, setDiagError] = useState<string | null>(null);
  const [selectedSupports, setSelectedSupports] = useState<string[]>([]);

  // 设计
  const [selectedLenses, setSelectedLenses] = useState<string[]>([]);

  // 收敛
  const { text, loading, error, run, stop, reset } = useStream();
  const [exampleIdeas, setExampleIdeas] = useState<IdeaSet | null>(null);
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);

  useEffect(() => {
    // 挂载时一次性消费上游 handoff 并水合输入，非级联渲染
    /* eslint-disable react-hooks/set-state-in-effect */
    const h = consumeHandoff("idea-generator");
    if (!h) return;
    if (h.fields.direction) setDirection(h.fields.direction);
    if (h.fields.references) setReferences(h.fields.references);
    if (h.fields.baseline) setBaseline(h.fields.baseline);
    if (h.sourcePaperId) setSourcePaperId(h.sourcePaperId);
    setHandoffFrom(h.from);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const goStage = (key: StageKey) => {
    setStage(key);
    setReached((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
  };

  const supportText = useMemo(() => {
    if (!diagnosis) return new Map<string, string>();
    const m = new Map<string, string>();
    [...diagnosis.assumptions, ...diagnosis.gaps].forEach((it) => m.set(it.id, it.text));
    return m;
  }, [diagnosis]);

  const toggleSupport = (id: string) =>
    setSelectedSupports((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleLens = (id: string) =>
    setSelectedLenses((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? prev : [...prev, id],
    );

  // —— 阶段一：诊断 ——
  const diagnose = async () => {
    if (direction.trim().length < 2 || diagLoading) return;
    setDiagLoading(true);
    setDiagError(null);
    try {
      const res = await fetch("/api/idea-generator/diagnose", {
        method: "POST",
        headers: { "content-type": "application/json", ...userKeyHeaders() },
        body: JSON.stringify({
          direction: direction.trim(),
          references: references.trim(),
          baseline: baseline.trim(),
          resources: resources.trim(),
        }),
      });
      if (!res.ok) throw new Error((await res.text().catch(() => "")) || `诊断失败 (${res.status})`);
      const data = (await res.json()) as Diagnosis;
      setDiagnosis(data);
      setExampleIdeas(null);
      // 默认勾选前两个空白，降低操作摩擦
      setSelectedSupports(data.gaps.slice(0, 2).map((g) => g.id));
      goStage("design");
    } catch (e) {
      setDiagError(e instanceof Error ? e.message : "诊断失败");
    } finally {
      setDiagLoading(false);
    }
  };

  // —— 阶段二→三：按透镜设计 ——
  const design = () => {
    if (loading) return;
    setExampleIdeas(null);
    setSelectedIdeaId(null);
    const gaps = selectedSupports.map((id) => supportText.get(id)).filter((x): x is string => !!x);
    run("/api/idea-generator", {
      direction: direction.trim(),
      references: references.trim(),
      baseline: baseline.trim(),
      resources: resources.trim(),
      selectedGaps: gaps,
      selectedLenses,
    });
    goStage("converge");
  };

  // —— 离线示例：直接呈现整条流程 ——
  const loadExample = () => {
    reset();
    setDirection(EXAMPLE_INPUT.direction);
    setReferences(EXAMPLE_INPUT.references);
    setBaseline(EXAMPLE_INPUT.baseline);
    setResources(EXAMPLE_INPUT.resources);
    setDiagnosis(EXAMPLE_DIAGNOSIS);
    setSelectedSupports(["g1", "g2"]);
    setSelectedLenses([...EXAMPLE_LENS_IDS]);
    setExampleIdeas(EXAMPLE_IDEASET);
    setSelectedIdeaId(null);
    setSourcePaperId(null);
    setHandoffFrom(null);
    setReached(new Set(["diagnose", "design", "converge"]));
    setStage("converge");
  };

  const parsed = useMemo(() => parseIdeaSet(text), [text]);
  const ideaSet = exampleIdeas ?? parsed;
  const recommended = useMemo(() => pickRecommended(ideaSet.ideas), [ideaSet]);
  const activeIdeaId = selectedIdeaId ?? recommended?.id ?? null;
  const activeIdea = ideaSet.ideas.find((i) => i.id === activeIdeaId) ?? null;

  return (
    <ToolShell tool={TOOL}>
      {handoffFrom && (
        <div className="mb-5">
          <HandoffBanner from={handoffFrom} onDismiss={() => setHandoffFrom(null)} />
        </div>
      )}

      <StageStepper current={stage} reached={reached} onJump={goStage} accent={ACCENT} />

      <div className="mt-6">
        {stage === "diagnose" && (
          <DiagnoseStage
            {...{ direction, setDirection, references, setReferences, baseline, setBaseline, resources, setResources }}
            loading={diagLoading}
            error={diagError}
            onDiagnose={diagnose}
            onExample={loadExample}
          />
        )}

        {stage === "design" && diagnosis && (
          <DesignStage
            diagnosis={diagnosis}
            summary={{ direction, baseline, resources }}
            selectedSupports={selectedSupports}
            onToggleSupport={toggleSupport}
            selectedLenses={selectedLenses}
            onToggleLens={toggleLens}
            onBack={() => setStage("diagnose")}
            onDesign={design}
            loading={loading}
          />
        )}

        {stage === "converge" && (
          <ConvergeStage
            loading={loading}
            error={error}
            streamingText={text}
            ideaSet={ideaSet}
            recommendedId={recommended?.id ?? null}
            activeIdeaId={activeIdeaId}
            onSelectIdea={setSelectedIdeaId}
            onStop={stop}
            onRetry={design}
            onBackToDesign={() => setStage("design")}
            activeIdea={activeIdea}
            sourcePaperId={sourcePaperId}
            direction={direction}
          />
        )}
      </div>
    </ToolShell>
  );
}

/* ————————————————————— 阶段一：诊断 ————————————————————— */
function DiagnoseStage({
  direction,
  setDirection,
  references,
  setReferences,
  baseline,
  setBaseline,
  resources,
  setResources,
  loading,
  error,
  onDiagnose,
  onExample,
}: {
  direction: string;
  setDirection: (v: string) => void;
  references: string;
  setReferences: (v: string) => void;
  baseline: string;
  setBaseline: (v: string) => void;
  resources: string;
  setResources: (v: string) => void;
  loading: boolean;
  error: string | null;
  onDiagnose: () => void;
  onExample: () => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="surface rounded-[20px] p-6">
        <FieldLabel>研究方向 / 关键词 *</FieldLabel>
        <TextField
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
          placeholder="如：扩散模型在 3D 点云生成上的可控性"
        />

        <FieldLabel className="mt-6">参考论文摘要 / 已知工作</FieldLabel>
        <Textarea
          mono
          value={references}
          onChange={(e) => setReferences(e.target.value)}
          placeholder="可从论文库或总结器粘贴 1–N 篇摘要（可选）"
          rows={5}
        />

        <FieldLabel className="mt-6">要打败的 baseline</FieldLabel>
        <TextField
          value={baseline}
          onChange={(e) => setBaseline(e.target.value)}
          placeholder="如：Point-E / 现有 SOTA 方法名（可选）"
        />

        <FieldLabel className="mt-6">可用资源</FieldLabel>
        <TextField
          value={resources}
          onChange={(e) => setResources(e.target.value)}
          placeholder="如：单卡 4090，2 周，公开数据集（可选）"
        />

        <Button
          variant="primary"
          onClick={onDiagnose}
          disabled={loading || direction.trim().length < 2}
          className="mt-8 w-full"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> 正在诊断现状…
            </span>
          ) : (
            "诊断现状 → 生成研究地形图"
          )}
        </Button>

        {error && <p className="mt-3 text-center text-[12px] text-[#a53425]">{error}</p>}

        <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-ink-3">
          <span className="serif-italic">没有 key？</span>
          <button
            onClick={onExample}
            className="underline decoration-line-strong underline-offset-2 hover:text-ink"
          >
            载入示例走通完整流程
          </button>
        </div>
      </div>

      <IntroPanel />
    </div>
  );
}

function IntroPanel() {
  const steps = [
    {
      icon: <Microscope className="h-4 w-4" />,
      title: "① 诊断 · 拆解现状",
      body: "先把参考论文 / 方向拆成「现有贡献 · 承重假设 · 研究空白」，找到值得发力的支点，而不是凭空想。",
    },
    {
      icon: <Compass className="h-4 w-4" />,
      title: "② 设计 · 按透镜发散",
      body: "勾选要攻击的空白，再选 1–3 个创新透镜（类比迁移 / 假设反转 / 机制替换…），让发散沿确定的策略展开。",
    },
    {
      icon: <FlaskConical className="h-4 w-4" />,
      title: "③ 收敛 · 评分排序",
      body: "经「提出→自我批判→精炼」给每条 idea 打 创新性 × 可行性 分，画象限图选出甜区里的那条，再流转到撰写 / 配图。",
    },
  ];
  return (
    <div className="surface flex flex-col justify-center rounded-[20px] p-7">
      <div className="overline flex items-center gap-1.5" style={{ color: ACCENT }}>
        <Sparkles className="h-3.5 w-3.5" /> 创新点工坊 · 三步法
      </div>
      <p className="mt-3 max-w-md text-[14px] leading-relaxed text-ink-2">
        不是「给方向、随机吐 idea」，而是对标真实科研选题流程：
        <span className="text-ink">先诊断、再按策略发散、最后批判打分收敛</span>。
      </p>
      <div className="mt-6 space-y-4">
        {steps.map((s) => (
          <div key={s.title} className="flex gap-3">
            <span
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              style={{ background: "rgba(245,158,11,0.12)", color: "#9a6a08" }}
            >
              {s.icon}
            </span>
            <div>
              <div className="text-[13px] font-medium text-ink">{s.title}</div>
              <p className="mt-0.5 text-[12.5px] leading-snug text-ink-3">{s.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ————————————————————— 阶段二：设计 ————————————————————— */
function DesignStage({
  diagnosis,
  summary,
  selectedSupports,
  onToggleSupport,
  selectedLenses,
  onToggleLens,
  onBack,
  onDesign,
  loading,
}: {
  diagnosis: Diagnosis;
  summary: { direction: string; baseline: string; resources: string };
  selectedSupports: string[];
  onToggleSupport: (id: string) => void;
  selectedLenses: string[];
  onToggleLens: (id: string) => void;
  onBack: () => void;
  onDesign: () => void;
  loading: boolean;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="surface rounded-[20px] p-6">
        <div className="mb-4 flex items-center justify-between">
          <span className="overline" style={{ color: ACCENT }}>
            研究地形图
          </span>
          <button onClick={onBack} className="text-[11px] text-ink-3 underline-offset-2 hover:text-ink hover:underline">
            ← 改输入
          </button>
        </div>
        <p className="mb-4 line-clamp-2 text-[12px] text-ink-3">
          {summary.direction}
          {summary.baseline && ` · 打败 ${summary.baseline}`}
          {summary.resources && ` · ${summary.resources}`}
        </p>
        <GapMap
          diagnosis={diagnosis}
          selected={selectedSupports}
          onToggle={onToggleSupport}
          accent={ACCENT}
        />
      </div>

      <div className="surface flex flex-col rounded-[20px] p-6">
        <LensPicker selected={selectedLenses} onToggle={onToggleLens} accent={ACCENT} />

        <div className="mt-6 rounded-xl border border-line bg-paper-2/40 px-4 py-3 text-[12px] leading-snug text-ink-3">
          已选 <span className="font-medium text-ink-2">{selectedSupports.length}</span> 个攻击支点 ·{" "}
          <span className="font-medium text-ink-2">{selectedLenses.length}</span> 个创新透镜。透镜会注入提示词，
          引导模型经「提出 → 自我批判 → 精炼」沿所选策略发散。
        </div>

        <Button variant="primary" onClick={onDesign} disabled={loading} className="mt-auto w-full">
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> 正在设计…
            </span>
          ) : (
            "按透镜生成候选 idea →"
          )}
        </Button>
        <p className="mt-3 text-center text-[11px] text-ink-3 serif-italic">
          配 DeepSeek key 时用 deepseek-reasoner 深度推理（可能稍慢）；只配 OpenAI / Gemini 也能生成
        </p>
      </div>
    </div>
  );
}

/* ————————————————————— 阶段三：收敛 ————————————————————— */
function ConvergeStage({
  loading,
  error,
  streamingText,
  ideaSet,
  recommendedId,
  activeIdeaId,
  onSelectIdea,
  onStop,
  onRetry,
  onBackToDesign,
  activeIdea,
  sourcePaperId,
  direction,
}: {
  loading: boolean;
  error: string | null;
  streamingText: string;
  ideaSet: IdeaSet;
  recommendedId: string | null;
  activeIdeaId: string | null;
  onSelectIdea: (id: string) => void;
  onStop: () => void;
  onRetry: () => void;
  onBackToDesign: () => void;
  activeIdea: Idea | null;
  sourcePaperId: string | null;
  direction: string;
}) {
  if (loading) return <DesignProgress text={streamingText} onStop={onStop} />;

  if (error) {
    return (
      <div className="surface rounded-[20px] p-8 text-center">
        <p className="text-[14px] text-[#a53425]">{error}</p>
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-4">
          重新设计
        </Button>
      </div>
    );
  }

  // 解析失败兜底：用 Markdown 渲染原文
  if (ideaSet.ideas.length === 0) {
    if (ideaSet.raw) {
      return (
        <div className="surface rounded-[20px] p-6">
          <p className="mb-4 text-[12px] text-ink-3">未能结构化解析，已按原文展示：</p>
          <Markdown>{ideaSet.raw}</Markdown>
        </div>
      );
    }
    return (
      <div className="surface rounded-[20px] p-8 text-center text-[14px] text-ink-3 serif-italic">
        还没有候选 idea，回到「设计」选透镜后生成。
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <ScoreMatrix
          ideas={ideaSet.ideas}
          recommendedId={recommendedId}
          selectedId={activeIdeaId}
          onSelect={onSelectIdea}
          accent={ACCENT}
        />

        {ideaSet.priority && (
          <div className="surface rounded-[20px] p-5">
            <div className="overline mb-2 text-ink-3">推荐优先级</div>
            <p className="text-[12.5px] leading-relaxed text-ink-2">{ideaSet.priority}</p>
          </div>
        )}

        <div className="surface rounded-[20px] p-5">
          <div className="overline mb-3 text-ink-3">把选中的 idea 流转下游</div>
          {activeIdea ? (
            <div className="flex flex-wrap gap-2">
              {sourcePaperId && (
                <SaveToLibrary
                  paperId={sourcePaperId}
                  field="notes"
                  value={ideaToText(activeIdea)}
                  append
                  label="回存为研究笔记"
                />
              )}
              <SendToTool
                targetSlug="paper-writer"
                payload={{
                  from: TOOL.name,
                  sourcePaperId: sourcePaperId ?? undefined,
                  fields: { topic: direction, innovation: ideaToText(activeIdea) },
                }}
                label="发往「结构撰写」"
              />
              <SendToTool
                targetSlug="prompt-chunker"
                payload={{
                  from: TOOL.name,
                  sourcePaperId: sourcePaperId ?? undefined,
                  fields: {
                    task: `把下面这个研究 idea 的最小验证实验拆成可执行计划：\n\n${ideaToText(activeIdea)}`,
                  },
                }}
                label="发往「研究任务分解」"
              />
              <SendToTool
                targetSlug="figure-prompt"
                payload={{
                  from: TOOL.name,
                  sourcePaperId: sourcePaperId ?? undefined,
                  fields: {
                    // 同时带上 subject，避免下游「科研绘图」落地时主题为空、提交键被禁用。
                    subject: direction.trim()
                      ? `${direction.trim()} · 验证实验示意`
                      : "研究 idea 的验证实验示意",
                    content: `为下面这个研究 idea 的最小验证实验设计配图（先想清楚要传达的结论，再选图型）：\n\n${ideaToText(activeIdea)}`,
                  },
                }}
                label="为验证实验配图"
              />
            </div>
          ) : (
            <p className="text-[12px] text-ink-3">点上方象限图或卡片选一条 idea。</p>
          )}
          <button
            onClick={onBackToDesign}
            className="mt-4 block text-[11px] text-ink-3 underline-offset-2 hover:text-ink hover:underline"
          >
            ← 回到设计 · 换透镜重做
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {ideaSet.ideas.map((idea, i) => (
          <IdeaCard
            key={idea.id}
            idea={idea}
            n={i + 1}
            recommended={idea.id === recommendedId}
            selected={idea.id === activeIdeaId}
            onSelect={onSelectIdea}
            accent={ACCENT}
          />
        ))}
      </div>
    </div>
  );
}

function DesignProgress({ text, onStop }: { text: string; onStop: () => void }) {
  const steps = ["拆解支点", "按透镜发散", "自我批判精炼", "评分排序"];
  return (
    <div className="surface rounded-[20px] p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[13px] text-ink-2">
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: ACCENT }} />
          <span className="serif-italic">正在按透镜设计候选 idea…</span>
        </div>
        <button
          onClick={onStop}
          className="rounded-full px-3 py-1 text-[12px] text-ink-2 transition-colors hover:bg-[rgba(26,23,19,0.04)] hover:text-ink"
        >
          停止
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {steps.map((s) => (
          <span
            key={s}
            className="rounded-full border border-line px-3 py-1 text-[11px] text-ink-3"
            style={{ background: "rgba(245,158,11,0.06)" }}
          >
            {s}
          </span>
        ))}
      </div>

      {text && (
        <pre className="mt-5 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-paper-2/50 p-4 text-[11.5px] leading-relaxed text-ink-3">
          {text}
        </pre>
      )}
      {!text && (
        <div className="mt-5 space-y-3">
          <div className="h-3 w-3/4 animate-pulse rounded bg-[rgba(26,23,19,0.06)]" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-[rgba(26,23,19,0.06)]" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-[rgba(26,23,19,0.06)]" />
        </div>
      )}
    </div>
  );
}
