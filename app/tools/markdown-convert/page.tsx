"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Copy,
  Download,
  FileText,
  RotateCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { getTool } from "@/lib/tools-registry";
import { ToolShell } from "@/components/tool-shell";
import { Markdown } from "@/components/markdown";
import { SendToTool } from "@/components/workflow/handoff-controls";
import { cn } from "@/lib/utils";

const TOOL = getTool("markdown-convert")!;

type Status = "pending" | "running" | "done" | "error";

type Job = {
  id: string;
  file: File;
  sourceUrl?: string;
  status: Status;
  output: string;
  error?: string;
};

const ACCEPT =
  ".docx,.pdf,.html,.htm,.txt,.md,.markdown,application/pdf,text/html,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const ALLOWED_EXT = new Set([
  "docx",
  "pdf",
  "html",
  "htm",
  "txt",
  "md",
  "markdown",
]);

function extOf(name: string) {
  return name.toLowerCase().split(".").pop() ?? "";
}

function isSupported(file: File) {
  return ALLOWED_EXT.has(extOf(file.name));
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function toMdName(name: string) {
  const base = name.replace(/\.[^.]+$/, "");
  return `${base || "converted"}.md`;
}

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

function safePdfName(title: string) {
  const base = title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 90) || "paper";
  return base.endsWith(".pdf") ? base : `${base}.pdf`;
}

export default function Page() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [view, setView] = useState<"rendered" | "raw">("rendered");
  const [dragOver, setDragOver] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const raw = localStorage.getItem("paperSearchMarkdownQueue");
    if (!raw) return;
    try {
      const queue = JSON.parse(raw) as Array<{ title: string; url: string }>;
      const imported = queue
        .filter((item) => item.url)
        .map((item) => ({
          id: newId(),
          file: new File([], safePdfName(item.title), { type: "application/pdf" }),
          sourceUrl: item.url,
          status: "pending" as Status,
          output: "",
        }));
      if (imported.length > 0) {
        // 挂载时一次性从队列水合任务，非级联渲染
        /* eslint-disable react-hooks/set-state-in-effect */
        setJobs((prev) => [...imported, ...prev]);
        setSelectedId(imported[0].id);
        /* eslint-enable react-hooks/set-state-in-effect */
      }
      localStorage.removeItem("paperSearchMarkdownQueue");
    } catch {
      localStorage.removeItem("paperSearchMarkdownQueue");
    }
  }, []);

  const selected = useMemo(
    () => jobs.find((j) => j.id === selectedId) ?? null,
    [jobs, selectedId],
  );

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files);
    const valid: Job[] = [];
    const rejected: string[] = [];
    for (const f of arr) {
      if (!isSupported(f)) {
        rejected.push(f.name);
        continue;
      }
      valid.push({ id: newId(), file: f, status: "pending", output: "" });
    }
    if (rejected.length > 0) {
      alert(`跳过不支持的文件：\n${rejected.join("\n")}`);
    }
    if (valid.length === 0) return;
    setJobs((prev) => {
      const next = [...prev, ...valid];
      return next;
    });
    setSelectedId((prev) => prev ?? valid[0].id);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const onPick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) addFiles(e.target.files);
      e.target.value = "";
    },
    [addFiles],
  );

  const runJob = useCallback(async (jobId: string, signal: AbortSignal) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId ? { ...j, status: "running", output: "", error: undefined } : j,
      ),
    );
    try {
      const fd = new FormData();
      let res: Response;
      if (job.sourceUrl) {
        res = await fetch("/api/markdown-convert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: job.sourceUrl, name: job.file.name }),
          signal,
        });
      } else {
        fd.append("file", job.file);
        res = await fetch("/api/markdown-convert", {
          method: "POST",
          body: fd,
          signal,
        });
      }
      if (!res.ok || !res.body) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `请求失败 (${res.status})`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setJobs((prev) =>
          prev.map((j) => (j.id === jobId ? { ...j, output: acc } : j)),
        );
      }
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status: "done" } : j)),
      );
    } catch (e) {
      if ((e as { name?: string })?.name === "AbortError") {
        setJobs((prev) =>
          prev.map((j) => (j.id === jobId ? { ...j, status: "pending" } : j)),
        );
        return;
      }
      const msg = e instanceof Error ? e.message : "转换失败";
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId ? { ...j, status: "error", error: msg } : j,
        ),
      );
    }
  }, [jobs]);

  const startAll = useCallback(async () => {
    if (running) return;
    const pending = jobs.filter((j) => j.status === "pending");
    if (pending.length === 0) return;
    setRunning(true);
    const ctl = new AbortController();
    abortRef.current = ctl;
    for (const p of pending) {
      if (ctl.signal.aborted) break;
      if (!selectedId) setSelectedId(p.id);
      await runJob(p.id, ctl.signal);
    }
    setRunning(false);
    abortRef.current = null;
  }, [jobs, running, runJob, selectedId]);

  const retryOne = useCallback(
    async (id: string) => {
      if (running) return;
      setRunning(true);
      const ctl = new AbortController();
      abortRef.current = ctl;
      setJobs((prev) =>
        prev.map((j) => (j.id === id ? { ...j, status: "pending" } : j)),
      );
      await runJob(id, ctl.signal);
      setRunning(false);
      abortRef.current = null;
    },
    [running, runJob],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setRunning(false);
  }, []);

  const removeJob = useCallback(
    (id: string) => {
      setJobs((prev) => prev.filter((j) => j.id !== id));
      setSelectedId((prev) => {
        if (prev !== id) return prev;
        const remain = jobs.filter((j) => j.id !== id);
        return remain[0]?.id ?? null;
      });
    },
    [jobs],
  );

  const clearAll = useCallback(() => {
    cancel();
    setJobs([]);
    setSelectedId(null);
  }, [cancel]);

  const downloadSelected = useCallback(() => {
    if (!selected || !selected.output) return;
    const blob = new Blob([selected.output], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = toMdName(selected.file.name);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [selected]);

  const copySelected = useCallback(async () => {
    if (!selected || !selected.output) return;
    await navigator.clipboard.writeText(selected.output);
  }, [selected]);

  const downloadAll = useCallback(async () => {
    const done = jobs.filter((j) => j.status === "done" && j.output);
    if (done.length === 0) return;
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    const seen = new Map<string, number>();
    for (const j of done) {
      let name = toMdName(j.file.name);
      const n = seen.get(name) ?? 0;
      if (n > 0) {
        name = name.replace(/\.md$/, `-${n}.md`);
      }
      seen.set(toMdName(j.file.name), n + 1);
      zip.file(name, j.output);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "markdown-export.zip";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [jobs]);

  const pendingCount = jobs.filter((j) => j.status === "pending").length;
  const doneCount = jobs.filter((j) => j.status === "done").length;

  return (
    <ToolShell tool={TOOL}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* LEFT: dropzone + queue */}
        <div className="flex flex-col gap-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "surface rounded-[20px] px-6 py-8 cursor-pointer transition-all",
              "flex flex-col items-center justify-center text-center",
              "border-2 border-dashed",
              dragOver
                ? "border-[#4bb3ff] bg-[rgba(75,179,255,0.06)]"
                : "border-line hover:border-line-strong",
            )}
          >
            <div
              className={cn(
                "h-11 w-11 rounded-full flex items-center justify-center mb-3 transition-colors",
                dragOver
                  ? "bg-[#4bb3ff] text-white"
                  : "bg-paper-2/80 text-ink-2 border border-line",
              )}
            >
              <Upload className="h-5 w-5" />
            </div>
            <p className="serif text-[20px] leading-snug text-ink">
              拖拽文件到此处
              <span className="serif-italic text-ink-3">, or </span>
              点击选择
            </p>
            <p className="mt-2 text-[12px] text-ink-3 leading-relaxed max-w-xs">
              支持 <span className="mono">.docx · .pdf · .html · .txt · .md</span>
              <br />
              单文件 ≤ 25MB · 支持批量
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPT}
              onChange={onPick}
              className="hidden"
            />
          </div>

          {/* Queue */}
          {jobs.length > 0 && (
            <div className="surface rounded-[20px] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-line">
                <div className="overline">
                  队列 · {doneCount}/{jobs.length} 完成
                </div>
                <button
                  onClick={clearAll}
                  className="inline-flex items-center gap-1 text-[11px] text-ink-3 hover:text-ink transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  清空
                </button>
              </div>

              <ul className="max-h-[360px] overflow-auto divide-y divide-[var(--line)]">
                {jobs.map((j) => (
                  <li
                    key={j.id}
                    onClick={() => setSelectedId(j.id)}
                    className={cn(
                      "group flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors",
                      selectedId === j.id
                        ? "bg-[rgba(26,23,19,0.04)]"
                        : "hover:bg-[rgba(26,23,19,0.02)]",
                    )}
                  >
                    <StatusDot status={j.status} />
                    <FileText className="h-3.5 w-3.5 text-ink-3 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-[13px] text-ink">
                        {j.file.name}
                      </div>
                      <div className="mono text-[10.5px] text-ink-3 mt-0.5">
                        {formatSize(j.file.size)} ·{" "}
                        <span
                          className={cn(
                            j.status === "error" && "text-[#a53425]",
                            j.status === "done" && "text-[var(--sage)]",
                          )}
                        >
                          {statusLabel(j)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {(j.status === "error" || j.status === "done") && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            retryOne(j.id);
                          }}
                          disabled={running}
                          title="重新转换"
                          className="p-1 rounded hover:bg-[rgba(26,23,19,0.06)] disabled:opacity-40"
                        >
                          <RotateCw className="h-3.5 w-3.5 text-ink-2" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeJob(j.id);
                        }}
                        title="移除"
                        className="p-1 rounded hover:bg-[rgba(26,23,19,0.06)]"
                      >
                        <X className="h-3.5 w-3.5 text-ink-2" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="border-t border-line px-5 py-3 flex flex-wrap gap-2 items-center">
                {running ? (
                  <button
                    onClick={cancel}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper-2/60 px-3.5 py-1.5 text-[12.5px] text-ink hover:border-line-strong transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                    取消
                  </button>
                ) : (
                  <button
                    onClick={startAll}
                    disabled={pendingCount === 0}
                    className={cn(
                      "cta-gradient rounded-full px-4 py-1.5 text-[13px] font-medium",
                      "transition-all focus-ring",
                      pendingCount === 0 && "opacity-50 pointer-events-none",
                    )}
                  >
                    开始转换{pendingCount > 0 ? ` · ${pendingCount}` : ""}
                  </button>
                )}
                <button
                  onClick={downloadAll}
                  disabled={doneCount === 0}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border border-line bg-paper-2/60 px-3.5 py-1.5 text-[12.5px] text-ink",
                    "hover:border-line-strong transition-colors",
                    doneCount === 0 && "opacity-40 pointer-events-none",
                  )}
                >
                  <Download className="h-3.5 w-3.5" />
                  打包下载 zip
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: preview */}
        <PreviewPane
          selected={selected}
          view={view}
          onView={setView}
          onCopy={copySelected}
          onDownload={downloadSelected}
        />
      </div>

      <Legend />
    </ToolShell>
  );
}

function PreviewPane({
  selected,
  view,
  onView,
  onCopy,
  onDownload,
}: {
  selected: Job | null;
  view: "rendered" | "raw";
  onView: (v: "rendered" | "raw") => void;
  onCopy: () => void;
  onDownload: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const body = selected?.output ?? "";
  const hasOutput = body.length > 0;

  return (
    <div className="surface rounded-[20px] min-h-[420px] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-3 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <StatusDot status={selected?.status ?? "pending"} />
          <span className="overline truncate">
            {selected
              ? `${selected.file.name}`
              : "PREVIEW"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="rounded-full border border-line bg-paper-2/40 p-0.5 flex text-[11.5px]">
            <button
              onClick={() => onView("rendered")}
              className={cn(
                "px-2.5 py-0.5 rounded-full transition-colors",
                view === "rendered"
                  ? "bg-ink text-paper-2"
                  : "text-ink-2 hover:text-ink",
              )}
            >
              渲染
            </button>
            <button
              onClick={() => onView("raw")}
              className={cn(
                "px-2.5 py-0.5 rounded-full transition-colors",
                view === "raw"
                  ? "bg-ink text-paper-2"
                  : "text-ink-2 hover:text-ink",
              )}
            >
              原文
            </button>
          </div>
          <button
            onClick={copy}
            disabled={!hasOutput}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] text-ink-2",
              "hover:text-ink hover:bg-[rgba(26,23,19,0.04)] transition-colors",
              "disabled:opacity-40 disabled:pointer-events-none",
            )}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-[var(--sage)]" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span className="serif-italic">{copied ? "copied" : "copy"}</span>
          </button>
          <button
            onClick={onDownload}
            disabled={!hasOutput}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] text-ink-2",
              "hover:text-ink hover:bg-[rgba(26,23,19,0.04)] transition-colors",
              "disabled:opacity-40 disabled:pointer-events-none",
            )}
          >
            <Download className="h-3.5 w-3.5" />
            <span className="serif-italic">.md</span>
          </button>
          {hasOutput && (
            <SendToTool
              targetSlug="markdown-summarize"
              payload={{ from: TOOL.name, fields: { markdown: body } }}
              label="发往结构化总结"
              className="px-2.5 py-1"
            />
          )}
        </div>
      </div>

      <div className="flex-1 px-6 py-5 overflow-auto">
        {!selected && (
          <div className="flex h-full min-h-[320px] items-center justify-center text-center">
            <p className="serif-italic text-[22px] text-ink-3 max-w-xs leading-snug">
              拖拽文件开始。结果会出现在这里。
            </p>
          </div>
        )}
        {selected && selected.status === "error" && (
          <div className="rounded-xl border border-[rgba(255,93,77,0.35)] bg-[rgba(255,93,77,0.08)] p-3 text-sm text-[#a53425]">
            {selected.error ?? "转换失败"}
          </div>
        )}
        {selected && !hasOutput && selected.status !== "error" && (
          <div className="space-y-3">
            <div className="h-3 w-3/4 animate-pulse rounded bg-[rgba(26,23,19,0.06)]" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-[rgba(26,23,19,0.06)]" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-[rgba(26,23,19,0.06)]" />
            <div className="h-3 w-4/6 animate-pulse rounded bg-[rgba(26,23,19,0.06)]" />
          </div>
        )}
        {hasOutput && view === "rendered" && <Markdown>{body}</Markdown>}
        {hasOutput && view === "raw" && (
          <pre className="mono text-[12.5px] leading-relaxed text-ink whitespace-pre-wrap break-words">
            {body}
          </pre>
        )}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: Status }) {
  const c =
    status === "running"
      ? "bg-plum animate-pulse"
      : status === "done"
        ? "bg-[var(--sage)]"
        : status === "error"
          ? "bg-coral"
          : "bg-ink-4";
  return <span className={cn("inline-block h-1.5 w-1.5 rounded-full shrink-0", c)} />;
}

function statusLabel(j: Job) {
  if (j.status === "pending") return "待转换";
  if (j.status === "running") return "转换中";
  if (j.status === "done") return "已完成";
  return j.error ? `失败：${j.error}` : "失败";
}

function Legend() {
  const items = [
    {
      title: "公式 → LaTeX",
      hint: "内置 OMML / MathML → LaTeX 转换器，覆盖分式、上下标、根号、求和、积分、括号、矩阵等常见构造，KaTeX 渲染。",
    },
    {
      title: "GFM 表格",
      hint: "mammoth 保留 Word 的 HTML 表格结构，再经 turndown-plugin-gfm 输出标准 Markdown 表格。",
    },
    {
      title: "无 LLM · 纯本地",
      hint: "Word 走 mammoth，PDF 走 @opendocsg/pdf2md（unpdf），HTML 走 turndown；全过程在服务端完成，不调用任何模型。",
    },
  ];
  return (
    <section className="mt-14">
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <div className="overline mb-1" style={{ color: "#4bb3ff" }}>
            capabilities
          </div>
          <h2 className="serif text-[28px] leading-tight text-ink">
            把文档整洁地
            <span className="serif-italic text-ink-3">, faithfully.</span>
          </h2>
        </div>
        <div className="hairline hidden sm:block flex-1 mx-8 self-end mb-2" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((it) => (
          <div key={it.title} className="surface rounded-[20px] p-5">
            <div className="serif text-[18px] text-ink leading-snug">
              {it.title}
            </div>
            <div className="hairline my-3" />
            <p className="text-[12.5px] text-ink-2 leading-relaxed">{it.hint}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
