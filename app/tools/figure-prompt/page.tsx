"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getTool } from "@/lib/tools-registry";
import { ToolShell } from "@/components/tool-shell";
import { StreamOutput } from "@/components/stream-output";
import { useStream } from "@/components/use-stream";
import { consumeHandoff } from "@/lib/workflow/handoff";
import { HandoffBanner, SaveToLibrary } from "@/components/workflow/handoff-controls";
import { Download } from "lucide-react";
import { DrawioPreview } from "@/components/figure/DrawioPreview";
import { PromptActions } from "@/components/figure/PromptActions";
import { extractMxfile, downloadDrawio } from "@/lib/figure/drawio";
import { DRAWIO_EXAMPLE } from "@/lib/figure/drawio-example";
import { cn } from "@/lib/utils";

const TOOL = getTool("figure-prompt")!;

const FIGURE_TYPES = [
  { value: "graphical-abstract", label: "图形摘要", sub: "一图概括全文" },
  { value: "workflow", label: "流程示意", sub: "步骤与数据流" },
  { value: "mechanism", label: "机制示意", sub: "作用机理" },
  { value: "experimental-design", label: "实验设计", sub: "分组/时间线" },
  { value: "architecture", label: "模型架构", sub: "模块/数据流" },
  { value: "concept", label: "概念示意", sub: "抽象可视化" },
] as const;

const LAYOUTS = [
  { value: "", label: "自动" },
  { value: "horizontal", label: "横向流程" },
  { value: "vertical", label: "纵向流程" },
  { value: "radial", label: "中心放射" },
  { value: "cycle", label: "环形循环" },
  { value: "grid", label: "分区网格" },
] as const;

const MODELS = [
  { value: "generic", label: "通用" },
  { value: "midjourney", label: "Midjourney" },
  { value: "dalle", label: "DALL·E / GPT" },
  { value: "jimeng", label: "即梦 / 可灵" },
] as const;

const LANGS = [
  { value: "zh", label: "中文" },
  { value: "en", label: "English" },
  { value: "both", label: "中 + 英" },
] as const;

// drawio 模式：图型与方向。
const DIAGRAM_TYPES = [
  { value: "architecture", label: "架构图", sub: "模块/数据流" },
  { value: "flowchart", label: "流程图", sub: "步骤/判断" },
  { value: "sequence", label: "时序图", sub: "参与者/消息" },
  { value: "er", label: "ER 图", sub: "实体/关系" },
  { value: "mindmap", label: "思维导图", sub: "中心放射" },
  { value: "class", label: "类图", sub: "UML 类" },
] as const;

const DIRECTIONS = [
  { value: "LR", label: "横向 →" },
  { value: "TB", label: "纵向 ↓" },
] as const;

type FigureType = (typeof FIGURE_TYPES)[number]["value"];
type ModelTarget = (typeof MODELS)[number]["value"];
type Lang = (typeof LANGS)[number]["value"];
type DiagramType = (typeof DIAGRAM_TYPES)[number]["value"];
type Direction = (typeof DIRECTIONS)[number]["value"];
type Mode = "prompt" | "drawio";

// 一个端到端示例（医学图像方向）：输入还原 → 生成的提示词 → GPT-image 成图。
const EXAMPLE = {
  figureType: "workflow",
  subject: `多模态 MRI 脑胶质瘤自动分割与分级辅助诊断`,
  content: `第一段「多模态 MRI 采集」：四张并排脑部 MRI 切片缩略图，分别标注 T1、T1c、T2、FLAIR；第二段「预处理」：颅骨剥离、配准对齐、强度归一化三枚小图标；第三段「深度分割网络」：一个 U 形编码器-解码器（含跳跃连接），输出一张带三色掩膜的脑切片——增强肿瘤、瘤周水肿、坏死核心；第四段「分级与报告」：影像组学特征图标接入分级分类器，输出标注 WHO 分级与肿瘤体积的结构化诊断报告卡片。`,
  layout: "horizontal",
  palette: `蓝色与浅青色为主色，橙色用于强调肿瘤掩膜与最终诊断结论，白色背景`,
  style: `扁平简洁医学矢量图标、细线箭头串联、四段层级分明且对齐整齐；仅保留极少量中英短标签（T1、T1c、T2、FLAIR、U-Net、Enhancing Tumor、Edema、Necrosis、WHO Grade），避免过度装饰与大段文字`,
  model: "dalle",
  lang: "zh",
  prompt: `请生成一张适合论文发表的科研流程图，主题是"多模态 MRI 脑胶质瘤自动分割与分级辅助诊断"的方法流程，强调临床可解释性。采用从左到右的横向流程布局，分四段并用细线箭头串联：第一段「多模态 MRI 采集」——四张并排的脑部 MRI 切片缩略图，分别极简标注 T1、T1c、T2、FLAIR；第二段「预处理」——一组小图标表示颅骨剥离、配准对齐、强度归一化；第三段「深度分割网络」——一个简洁的 U 形编码器-解码器结构（Encoder–Decoder，含跳跃连接），输出一张带三种彩色掩膜的脑切片，分别表示增强肿瘤、瘤周水肿、坏死核心；第四段「分级与报告」——影像组学特征图标连到一个分级分类器，输出一张结构化诊断报告卡片，标注 WHO 分级与肿瘤体积。整体风格专业、清晰、矢量化科研插图质感，画面干净、四段层级分明、对齐整齐。使用白色背景，以蓝色与浅青色为主色，橙色用于强调肿瘤掩膜与最终诊断结论。扁平简洁医学图标，细线箭头串联流程。避免过度装饰，不要出现大段文字说明，仅保留极少量简短中英文标签（T1、T1c、T2、FLAIR、U-Net、Enhancing Tumor、Edema、Necrosis、WHO Grade）。`,
  image: "/figure-prompt/med-glioma-pipeline.png",
} as const;

// 把示例字段映射成中文展示标签，复用页面已有的选项定义。
const EXAMPLE_RECAP: { label: string; value: string }[] = [
  { label: "图类型", value: FIGURE_TYPES.find((t) => t.value === EXAMPLE.figureType)!.label },
  { label: "主题", value: EXAMPLE.subject },
  { label: "关键内容 / 步骤", value: EXAMPLE.content },
  { label: "布局", value: LAYOUTS.find((l) => l.value === EXAMPLE.layout)!.label },
  { label: "配色", value: EXAMPLE.palette },
  { label: "额外风格", value: EXAMPLE.style },
  { label: "目标模型", value: MODELS.find((m) => m.value === EXAMPLE.model)!.label },
  { label: "提示词语言", value: LANGS.find((l) => l.value === EXAMPLE.lang)!.label },
];

const DRAWIO_EXAMPLE_RECAP: { label: string; value: string }[] = [
  { label: "图型", value: DIAGRAM_TYPES.find((t) => t.value === DRAWIO_EXAMPLE.diagramType)!.label },
  { label: "主题", value: DRAWIO_EXAMPLE.subject },
  { label: "节点 / 模块与关系", value: DRAWIO_EXAMPLE.description },
  { label: "布局方向", value: DIRECTIONS.find((d) => d.value === DRAWIO_EXAMPLE.direction)!.label },
  { label: "配色", value: DRAWIO_EXAMPLE.palette },
  { label: "标签语言", value: (DRAWIO_EXAMPLE.lang as string) === "zh" ? "中文" : "English" },
];

const fieldBox = cn(
  "focus-ring w-full rounded-xl bg-paper-2/80 border border-line px-4 py-3",
  "text-[13px] text-ink placeholder:text-ink-4 leading-relaxed",
  "outline-none transition-colors focus:border-line-strong",
);

export default function Page() {
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [figureType, setFigureType] = useState<FigureType>("graphical-abstract");
  const [layout, setLayout] = useState<string>("");
  const [palette, setPalette] = useState("");
  const [style, setStyle] = useState("");
  const [model, setModel] = useState<ModelTarget>("generic");
  const [lang, setLang] = useState<Lang>("zh");
  const [handoffFrom, setHandoffFrom] = useState<string | null>(null);
  const [sourcePaperId, setSourcePaperId] = useState<string | null>(null);
  const { text, loading, error, run, stop } = useStream();

  // 模式：科研示意图(提示词) / 架构流程图(drawio)
  const [mode, setMode] = useState<Mode>("prompt");
  // drawio 模式独立表单与流
  const [dSubject, setDSubject] = useState("");
  const [dDesc, setDDesc] = useState("");
  const [diagramType, setDiagramType] = useState<DiagramType>("flowchart");
  const [direction, setDirection] = useState<Direction>("LR");
  const [dPalette, setDPalette] = useState("");
  const [dLang, setDLang] = useState<"zh" | "en">("zh");
  const drawio = useStream();
  const drawioXml = extractMxfile(drawio.text);

  useEffect(() => {
    // 挂载时一次性消费上游 handoff 并水合输入，非级联渲染
    /* eslint-disable react-hooks/set-state-in-effect */
    const h = consumeHandoff("figure-prompt");
    if (!h) return;
    if (h.fields.subject) setSubject(h.fields.subject);
    if (h.fields.content) setContent(h.fields.content);
    if (h.sourcePaperId) setSourcePaperId(h.sourcePaperId);
    setHandoffFrom(h.from);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const applyExample = () => {
    setFigureType(EXAMPLE.figureType);
    setSubject(EXAMPLE.subject);
    setContent(EXAMPLE.content);
    setLayout(EXAMPLE.layout);
    setPalette(EXAMPLE.palette);
    setStyle(EXAMPLE.style);
    setModel(EXAMPLE.model);
    setLang(EXAMPLE.lang);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = () => {
    if (subject.trim().length < 2 || content.trim().length < 5) return;
    run("/api/figure-prompt", {
      subject: subject.trim(),
      content: content.trim(),
      figureType,
      layout,
      palette: palette.trim(),
      style: style.trim(),
      model,
      lang,
    });
  };

  const submitDrawio = () => {
    if (dSubject.trim().length < 2 || dDesc.trim().length < 5) return;
    drawio.run("/api/figure-drawio", {
      subject: dSubject.trim(),
      description: dDesc.trim(),
      diagramType,
      direction,
      palette: dPalette.trim(),
      lang: dLang,
    });
  };

  const applyDrawioExample = () => {
    setDiagramType(DRAWIO_EXAMPLE.diagramType);
    setDSubject(DRAWIO_EXAMPLE.subject);
    setDDesc(DRAWIO_EXAMPLE.description);
    setDirection(DRAWIO_EXAMPLE.direction);
    setDPalette(DRAWIO_EXAMPLE.palette);
    setDLang(DRAWIO_EXAMPLE.lang);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <ToolShell tool={TOOL}>
      {/* 模式切换：提示词 / drawio */}
      <div className="mb-6 flex gap-2">
        {(
          [
            ["prompt", "科研示意图 · 提示词"],
            ["drawio", "架构流程图 · drawio"],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setMode(v)}
            className={cn(
              "rounded-full border px-4 py-2 text-[13px] transition-all",
              mode === v
                ? "border-ink bg-ink text-paper-2"
                : "border-line bg-paper-2/60 text-ink-2 hover:border-line-strong hover:text-ink",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "prompt" && (
      <>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-stretch">
        <div className="surface rounded-[20px] p-6 h-full">
          {handoffFrom && (
            <HandoffBanner from={handoffFrom} onDismiss={() => setHandoffFrom(null)} />
          )}

          <label className="overline block mb-2">图类型</label>
          <div className="grid grid-cols-3 gap-2">
            {FIGURE_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setFigureType(t.value)}
                className={cn(
                  "rounded-xl border px-2 py-2.5 text-center transition-all",
                  figureType === t.value
                    ? "border-ink bg-ink text-paper-2"
                    : "border-line bg-paper-2/60 text-ink-2 hover:border-line-strong hover:text-ink",
                )}
              >
                <div className="serif text-[13.5px] leading-none">{t.label}</div>
                <div className="mt-1 text-[10px] opacity-70">{t.sub}</div>
              </button>
            ))}
          </div>

          <label className="overline block mt-5 mb-2">主题 *</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="例：患者来源肿瘤类器官用于个体化药物筛选"
            className={fieldBox}
          />

          <label className="overline block mt-5 mb-2">要展示的关键内容 / 步骤 *</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
            placeholder="例：从患者肿瘤组织取样 → 组织消化与三维培养形成类器官 → 加入多种候选药物处理 → 高内涵成像与活性检测评估敏感性 → 筛出个体化治疗方案"
            rows={5}
            className={cn(fieldBox, "resize-y")}
          />

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div>
              <label className="overline block mb-2">布局</label>
              <div className="flex flex-wrap gap-1.5">
                {LAYOUTS.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => setLayout(l.value)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[12px] transition-all",
                      layout === l.value
                        ? "border-ink bg-ink text-paper-2"
                        : "border-line bg-paper-2/60 text-ink-2 hover:border-line-strong hover:text-ink",
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="overline block mb-2">目标模型</label>
              <div className="flex flex-wrap gap-1.5">
                {MODELS.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setModel(m.value)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[12px] transition-all",
                      model === m.value
                        ? "border-ink bg-ink text-paper-2"
                        : "border-line bg-paper-2/60 text-ink-2 hover:border-line-strong hover:text-ink",
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <label className="overline block mt-5 mb-2">
            配色 <span className="normal-case text-ink-4">（可选）</span>
          </label>
          <input
            value={palette}
            onChange={(e) => setPalette(e.target.value)}
            placeholder="留空 = 蓝/浅紫为主色，橙色强调，白底"
            className={fieldBox}
          />

          <label className="overline block mt-5 mb-2">
            额外风格 / 约束 <span className="normal-case text-ink-4">（可选）</span>
          </label>
          <input
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            placeholder="例：扁平等距风、避免拟物阴影、留白充足"
            className={fieldBox}
          />

          <label className="overline block mt-5 mb-2">提示词语言</label>
          <div className="flex flex-wrap gap-1.5">
            {LANGS.map((l) => (
              <button
                key={l.value}
                onClick={() => setLang(l.value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-[12px] transition-all",
                  lang === l.value
                    ? "border-ink bg-ink text-paper-2"
                    : "border-line bg-paper-2/60 text-ink-2 hover:border-line-strong hover:text-ink",
                )}
              >
                {l.label}
              </button>
            ))}
          </div>

          <button
            onClick={submit}
            disabled={loading || subject.trim().length < 2 || content.trim().length < 5}
            className={cn(
              "cta-gradient mt-8 w-full rounded-full px-5 py-3 text-[14px] font-medium",
              "transition-all focus-ring disabled:opacity-50 disabled:pointer-events-none",
            )}
          >
            {loading ? "正在生成提示词…" : "生成科研绘图提示词"}
          </button>

          <p className="mt-3 text-[11px] text-ink-3 text-center serif-italic">
            生成可直接粘贴给文生图模型的提示词；下方可一键直达 ChatGPT 等平台，或自带 ZenMux key 在本页出图
          </p>
        </div>

        <div className="flex flex-col gap-3 h-full">
          <StreamOutput
            text={text}
            loading={loading}
            error={error}
            onRetry={submit}
            onStop={stop}
            emptyHint="填入主题与要展示的内容，生成可直接粘贴的科研绘图提示词。"
            className="flex-1"
          />
          {text && !loading && !error && <PromptActions text={text} />}
          {sourcePaperId && text && !loading && (
            <div className="flex justify-end">
              <SaveToLibrary
                paperId={sourcePaperId}
                field="notes"
                value={text}
                append
                label="回存为研究笔记"
              />
            </div>
          )}
        </div>
      </div>

      {/* 端到端示例：输入还原 → 提示词 → 成图 */}
      <section className="mt-14">
        <div className="flex items-baseline justify-between mb-5">
          <div>
            <div className="overline mb-1" style={{ color: "#f59e0b" }}>
              example · 一键填入
            </div>
            <h2 className="serif text-[30px] leading-tight text-ink">
              先看一个完整示例
              <span className="serif-italic text-ink-3">, 从输入到成图.</span>
            </h2>
          </div>
          <div className="hairline hidden sm:block flex-1 mx-8 self-end mb-3" />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-stretch">
          {/* ① 输入还原 */}
          <div className="surface rounded-[20px] p-6 h-full">
            <div className="flex items-center justify-between mb-4">
              <span className="overline">① 输入（可一键填入表单）</span>
              <button
                onClick={applyExample}
                className={cn(
                  "rounded-full border border-ink bg-ink text-paper-2 px-3.5 py-1.5",
                  "text-[12px] font-medium transition-all hover:opacity-90 focus-ring",
                )}
              >
                载入此示例
              </button>
            </div>
            <dl className="space-y-3">
              {EXAMPLE_RECAP.map((r) => (
                <div key={r.label}>
                  <dt className="overline mb-1 text-ink-4">{r.label}</dt>
                  <dd className="text-[12.5px] leading-relaxed text-ink-2">{r.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* ② 提示词 + ③ 成图 */}
          <div className="flex flex-col gap-4 h-full">
            <div className="surface rounded-[20px] p-6">
              <div className="overline mb-3">② 生成的科研绘图提示词</div>
              <pre
                className={cn(
                  "rounded-xl bg-paper-2/80 border border-line p-4",
                  "text-[12px] leading-relaxed text-ink whitespace-pre-wrap break-words",
                  "font-mono",
                )}
              >
                {EXAMPLE.prompt}
              </pre>
            </div>

            <div className="surface rounded-[20px] p-6">
              <div className="overline mb-3">③ GPT-image 2 据此提示词生成的成图</div>
              <div className="relative w-full aspect-[16/9] overflow-hidden rounded-xl border border-line bg-white">
                <Image
                  src={EXAMPLE.image}
                  alt="GPT-image 根据示例提示词生成的科研流程图"
                  fill
                  sizes="(max-width: 1024px) 100vw, 58vw"
                  className="object-contain"
                />
              </div>
              <p className="mt-3 text-[11px] text-ink-3 serif-italic">
                此图由 GPT-image 2 按上方提示词真实生成 —— 你也可在生成结果下方自带 ZenMux key 一键出图。
              </p>
            </div>
          </div>
        </div>
      </section>
      </>
      )}

      {mode === "drawio" && (
      <>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-stretch">
          <div className="surface rounded-[20px] p-6 h-full">
            <label className="overline block mb-2">图型</label>
            <div className="grid grid-cols-3 gap-2">
              {DIAGRAM_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setDiagramType(t.value)}
                  className={cn(
                    "rounded-xl border px-2 py-2.5 text-center transition-all",
                    diagramType === t.value
                      ? "border-ink bg-ink text-paper-2"
                      : "border-line bg-paper-2/60 text-ink-2 hover:border-line-strong hover:text-ink",
                  )}
                >
                  <div className="serif text-[13.5px] leading-none">{t.label}</div>
                  <div className="mt-1 text-[10px] opacity-70">{t.sub}</div>
                </button>
              ))}
            </div>

            <label className="overline block mt-5 mb-2">主题 *</label>
            <input
              value={dSubject}
              onChange={(e) => setDSubject(e.target.value)}
              placeholder="例：用户登录系统的后端架构"
              className={fieldBox}
            />

            <label className="overline block mt-5 mb-2">要画的节点 / 模块与关系 *</label>
            <textarea
              value={dDesc}
              onChange={(e) => setDDesc(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitDrawio();
              }}
              placeholder="例：客户端 → API 网关 → 鉴权服务（校验 JWT）；网关 → 用户服务 → 数据库；鉴权失败回 401。标出每条调用的方向。"
              rows={6}
              className={cn(fieldBox, "resize-y")}
            />

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div>
                <label className="overline block mb-2">布局方向</label>
                <div className="flex flex-wrap gap-1.5">
                  {DIRECTIONS.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => setDirection(d.value)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[12px] transition-all",
                        direction === d.value
                          ? "border-ink bg-ink text-paper-2"
                          : "border-line bg-paper-2/60 text-ink-2 hover:border-line-strong hover:text-ink",
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="overline block mb-2">标签语言</label>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ["zh", "中文"],
                      ["en", "English"],
                    ] as const
                  ).map(([v, label]) => (
                    <button
                      key={v}
                      onClick={() => setDLang(v)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[12px] transition-all",
                        dLang === v
                          ? "border-ink bg-ink text-paper-2"
                          : "border-line bg-paper-2/60 text-ink-2 hover:border-line-strong hover:text-ink",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <label className="overline block mt-5 mb-2">
              配色 <span className="normal-case text-ink-4">（可选）</span>
            </label>
            <input
              value={dPalette}
              onChange={(e) => setDPalette(e.target.value)}
              placeholder="留空 = 蓝/浅紫为主色，橙色强调关键节点"
              className={fieldBox}
            />

            <button
              onClick={submitDrawio}
              disabled={drawio.loading || dSubject.trim().length < 2 || dDesc.trim().length < 5}
              className={cn(
                "cta-gradient mt-8 w-full rounded-full px-5 py-3 text-[14px] font-medium",
                "transition-all focus-ring disabled:opacity-50 disabled:pointer-events-none",
              )}
            >
              {drawio.loading ? "正在生成 drawio…" : "生成 drawio 图"}
            </button>

            <p className="mt-3 text-[11px] text-ink-3 text-center serif-italic">
              AI 直接产出 draw.io 图，站内预览，可下载 .drawio 或在 draw.io 中打开继续编辑
            </p>
          </div>

          <div className="flex flex-col gap-3 h-full">
            {drawio.error ? (
              <div className="surface rounded-[20px] p-6 text-sm text-[#a53425] flex-1">
                <p className="font-medium">生成失败</p>
                <p className="mt-1 text-[12px] opacity-80">{drawio.error}</p>
                <button
                  onClick={submitDrawio}
                  className="mt-3 inline-flex items-center gap-1 rounded-full border border-line px-3 py-1 text-[12px] text-ink-2 transition-colors hover:text-ink"
                >
                  重试
                </button>
              </div>
            ) : drawio.loading && !drawioXml ? (
              <div className="surface rounded-[20px] flex-1 min-h-[320px] flex items-center justify-center">
                <p className="serif-italic text-[18px] text-ink-3">正在生成 drawio 图…</p>
              </div>
            ) : drawioXml ? (
              <DrawioPreview xml={drawioXml} className="flex-1" />
            ) : (
              <div className="surface rounded-[20px] flex-1 min-h-[320px] flex items-center justify-center text-center px-6">
                <p className="serif-italic text-[22px] text-ink-3 max-w-xs leading-snug">
                  描述要画的模块与关系，AI 直接画成可编辑的 draw.io 图。
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 完整示例：还原输入 → 描述(提示词) → drawio 成图 */}
        <section className="mt-14">
          <div className="flex items-baseline justify-between mb-5">
            <div>
              <div className="overline mb-1" style={{ color: "#f59e0b" }}>
                example · 一键填入
              </div>
              <h2 className="serif text-[30px] leading-tight text-ink">
                先看一个完整示例
                <span className="serif-italic text-ink-3">, 从描述到 drawio.</span>
              </h2>
            </div>
            <div className="hairline hidden sm:block flex-1 mx-8 self-end mb-3" />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-stretch">
            {/* ① 还原的输入 */}
            <div className="surface rounded-[20px] p-6 h-full">
              <div className="flex items-center justify-between mb-4">
                <span className="overline">① 输入（可一键填入表单）</span>
                <button
                  onClick={applyDrawioExample}
                  className={cn(
                    "rounded-full border border-ink bg-ink text-paper-2 px-3.5 py-1.5",
                    "text-[12px] font-medium transition-all hover:opacity-90 focus-ring",
                  )}
                >
                  载入此示例
                </button>
              </div>
              <dl className="space-y-3">
                {DRAWIO_EXAMPLE_RECAP.map((r) => (
                  <div key={r.label}>
                    <dt className="overline mb-1 text-ink-4">{r.label}</dt>
                    <dd className="text-[12.5px] leading-relaxed text-ink-2">{r.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-[11px] text-ink-3 serif-italic">
                参考一张 FWMamba-UNet 论文架构图还原而来 —— 载入后改改描述即可让 AI 重新生成。
              </p>
            </div>

            {/* ② 描述(提示词) + ③ drawio 成图 */}
            <div className="flex flex-col gap-4 h-full">
              <div className="surface rounded-[20px] p-6">
                <div className="overline mb-3">② 喂给 AI 的描述（提示词）</div>
                <pre
                  className={cn(
                    "rounded-xl bg-paper-2/80 border border-line p-4",
                    "text-[12px] leading-relaxed text-ink whitespace-pre-wrap break-words font-mono",
                  )}
                >
                  {DRAWIO_EXAMPLE.description}
                </pre>
              </div>

              <div className="surface rounded-[20px] p-6 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="overline">③ 对应的 drawio 成图</span>
                  <button
                    onClick={() => downloadDrawio(DRAWIO_EXAMPLE.xml, "fwmamba-unet.drawio")}
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] text-ink-2 hover:text-ink hover:bg-[rgba(26,23,19,0.04)] transition-colors"
                    title="下载 .drawio 源文件"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span className="serif-italic">.drawio</span>
                  </button>
                </div>
                <div className="relative w-full aspect-[12/5] overflow-hidden rounded-xl border border-line bg-white">
                  <Image
                    src="/figure-prompt/framework3.jpg"
                    alt="FWMamba-UNet 架构图（drawio 渲染示例）"
                    fill
                    sizes="(max-width: 1024px) 100vw, 58vw"
                    className="object-contain"
                  />
                </div>
                <p className="mt-3 text-[11px] text-ink-3 serif-italic">
                  此图由上方描述生成的 draw.io 图渲染而来，可点「.drawio」下载源文件在 draw.io 中打开编辑。
                </p>
              </div>
            </div>
          </div>
        </section>
      </>
      )}
    </ToolShell>
  );
}
