"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Download, Sparkles } from "lucide-react";
import { getTool } from "@/lib/tools-registry";
import { ToolShell } from "@/components/tool-shell";
import { StreamOutput } from "@/components/stream-output";
import { useStream } from "@/components/use-stream";
import { cn } from "@/lib/utils";

const TOOL = getTool("skill-maker")!;

const AVAILABLE_TOOLS = [
  "Bash",
  "Edit",
  "Read",
  "Write",
  "Grep",
  "Glob",
  "WebFetch",
] as const;

type ExampleForm = {
  name: string;
  trigger: string;
  capability: string;
  tools: string[];
};

type Example = {
  key: string;
  title: string;
  subtitle: string;
  accent: string;
  form: ExampleForm;
};

const EXAMPLES: Example[] = [
  {
    key: "github-commit",
    title: "GitHub 提交",
    subtitle: "首次提交 / 更新 / 冲突一条龙",
    accent: "#3b6ef6",
    form: {
      name: "github-commit",
      trigger:
        '用户说"提交"/"推送"/"上传到 GitHub"/"commit + push"，或要求把当前目录发布为新仓库时。',
      capability: `覆盖三种情形：
1) 首次提交：本地无 .git → git init → 检测 gh CLI → gh repo create（询问仓库名和公开/私有）→ 添加 remote → 首次推送
2) 常规更新：已有仓库 → git status 看变更 → git add 用户指定或全部跟踪文件 → 根据 diff 自动撰写符合仓库历史风格的 commit message → git push
3) 冲突处理：push 遭 non-fast-forward → git pull --rebase → 若出现冲突，逐文件展示冲突块并请求用户选择保留哪边；rebase 过程中用户要中止时执行 git rebase --abort
额外：任何破坏性动作（force push、reset --hard、删除远端分支）都必须先让用户 Y/N 确认；从不跳过 hooks；不在 main 上 force push。`,
      tools: ["Bash", "Read", "Edit"],
    },
  },
  {
    key: "drawio-visualize",
    title: "drawio 可视化",
    subtitle: "把描述转成可编辑的 .drawio 流程图",
    accent: "#d24b7f",
    form: {
      name: "drawio-visualize",
      trigger:
        '用户要求把一段流程、架构、时序关系、思维导图"画出来"/"生成图"/"可视化"/"流程图"，或给出一段文字描述要求产出能在 diagrams.net / VS Code drawio 扩展里打开的图时。',
      capability: `覆盖以下情形：
1) 判断图类型：流程图 / 架构图 / 时序图 / 思维导图 / ER 图；若用户未指定，先根据文本自动选择并用一句话说明选择理由
2) 生成 .drawio XML：用 mxGraphModel 格式，节点 id 自增，连线用 mxCell edge=1；保证坐标不重叠、方向一致（流程图自上而下，架构图按层级分组）
3) 保存文件：把 XML 写入 <kebab-title>.drawio，路径由用户指定，默认当前目录
4) 可选导出：若检测到已安装 drawio-desktop / drawio-export CLI，则额外导出同名 PNG；没装就跳过并一行提示安装命令
5) 复杂度回退：若节点数 > 40 或描述过复杂，切到 Mermaid 流程图文本作为 fallback，写入 <name>.mmd 并说明原因
额外：不要自行弹 GUI；覆盖已存在的 .drawio 前必须确认。`,
      tools: ["Write", "Read", "Bash"],
    },
  },
];

const DEFAULT_FORM: ExampleForm = {
  name: "",
  trigger: "",
  capability: "",
  tools: [],
};

function extractSkillName(text: string): string | null {
  const m = text.match(/^\s*name:\s*([a-z0-9-]+)\s*$/m);
  return m ? m[1] : null;
}

function stripInstallComment(text: string): string {
  return text.replace(/<!--\s*install:[^>]*-->/g, "").trimEnd();
}

export default function Page() {
  const [form, setForm] = useState<ExampleForm>(DEFAULT_FORM);
  const { text, loading, error, run, stop } = useStream();

  const nameError = useMemo(() => {
    if (!form.name) return null;
    if (!/^[a-z0-9-]+$/.test(form.name))
      return "只允许小写字母、数字、短横杠（kebab-case）";
    if (form.name.length < 2) return "太短了";
    return null;
  }, [form.name]);

  const canSubmit =
    !loading &&
    !nameError &&
    form.name.length >= 2 &&
    form.trigger.trim().length > 0 &&
    form.capability.trim().length > 0;

  const submit = () => {
    if (!canSubmit) return;
    run("/api/skill-maker", form);
  };

  const toggleTool = (t: string) => {
    setForm((f) => ({
      ...f,
      tools: f.tools.includes(t)
        ? f.tools.filter((x) => x !== t)
        : [...f.tools, t],
    }));
  };

  const applyExample = (ex: Example) => {
    setForm(ex.form);
    // scroll to top of form so user sees the prefill
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const resolvedName = extractSkillName(text) || form.name || "my-skill";
  const cleanText = useMemo(() => stripInstallComment(text), [text]);

  return (
    <ToolShell tool={TOOL}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* LEFT: form */}
        <div className="surface rounded-[20px] p-6 space-y-5">
          <div>
            <label className="overline block mb-2">Skill 名称</label>
            <input
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value.trim() }))
              }
              placeholder="github-commit"
              className={cn(
                "focus-ring w-full rounded-xl bg-paper-2/80 border px-4 py-2.5",
                "mono text-[13px] text-ink placeholder:text-ink-4",
                "outline-none transition-colors",
                nameError
                  ? "border-[rgba(255,93,77,0.5)]"
                  : "border-line focus:border-line-strong",
              )}
            />
            <p
              className={cn(
                "mt-1.5 text-[11px]",
                nameError ? "text-[#a53425]" : "text-ink-3",
              )}
            >
              {nameError ?? "kebab-case，会作为目录名放到 ~/.claude/skills/"}
            </p>
          </div>

          <div>
            <label className="overline block mb-2">触发时机</label>
            <textarea
              value={form.trigger}
              onChange={(e) =>
                setForm((f) => ({ ...f, trigger: e.target.value }))
              }
              placeholder='Claude 应该在什么情境下调用这个 skill？例如：用户说"提交到 GitHub"时…'
              rows={4}
              className={cn(
                "focus-ring w-full resize-y rounded-xl bg-paper-2/80 border border-line px-4 py-3",
                "text-[13.5px] leading-relaxed text-ink placeholder:text-ink-4",
                "outline-none transition-colors focus:border-line-strong",
              )}
            />
          </div>

          <div>
            <label className="overline block mb-2">核心能力与分支</label>
            <textarea
              value={form.capability}
              onChange={(e) =>
                setForm((f) => ({ ...f, capability: e.target.value }))
              }
              placeholder="列出这个 skill 要覆盖的每一条流程，包括异常和冲突情况。"
              rows={9}
              className={cn(
                "focus-ring w-full resize-y rounded-xl bg-paper-2/80 border border-line px-4 py-3",
                "text-[13.5px] leading-relaxed text-ink placeholder:text-ink-4",
                "outline-none transition-colors focus:border-line-strong",
              )}
            />
          </div>

          <div>
            <label className="overline block mb-2">允许使用的工具</label>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_TOOLS.map((t) => {
                const on = form.tools.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleTool(t)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-[12px] transition-all",
                      on
                        ? "border-ink bg-ink text-paper-2"
                        : "border-line bg-paper-2/60 text-ink-2 hover:border-line-strong hover:text-ink",
                    )}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] text-ink-3">
              不选则不做限制。留空通常够用。
            </p>
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
            {loading ? "生成中…" : "生成 SKILL.md"}
          </button>
        </div>

        {/* RIGHT: output + install strip */}
        <div className="space-y-4">
          <StreamOutput
            text={cleanText}
            loading={loading}
            error={error}
            onRetry={submit}
            onStop={stop}
            emptyHint="左侧填写需求，或从下方示例一键填入。"
          />
          {text && !loading && <InstallStrip name={resolvedName} body={cleanText} />}
        </div>
      </div>

      {/* EXAMPLES */}
      <section className="mt-14">
        <div className="flex items-baseline justify-between mb-5">
          <div>
            <div className="overline mb-1" style={{ color: "#d24b7f" }}>
              examples · 一键填入
            </div>
            <h2 className="serif text-[30px] leading-tight text-ink">
              从示例开始
              <span className="serif-italic text-ink-3">, faster.</span>
            </h2>
          </div>
          <div className="hairline hidden sm:block flex-1 mx-8 self-end mb-3" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {EXAMPLES.map((ex) => (
            <ExampleCard key={ex.key} ex={ex} onApply={() => applyExample(ex)} />
          ))}
        </div>
      </section>
    </ToolShell>
  );
}

function ExampleCard({
  ex,
  onApply,
}: {
  ex: Example;
  onApply: () => void;
}) {
  return (
    <div className="surface rounded-[20px] p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div
            className="overline mb-1.5"
            style={{ color: ex.accent }}
          >
            {ex.form.name}
          </div>
          <h3 className="serif text-[22px] leading-tight text-ink">
            {ex.title}
          </h3>
          <p className="mt-1 text-[13px] text-ink-2">{ex.subtitle}</p>
        </div>
        <span
          className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center"
          style={{
            background: `${ex.accent}18`,
            color: ex.accent,
          }}
        >
          <Sparkles className="h-4 w-4" />
        </span>
      </div>

      <div className="hairline" />

      <div className="space-y-2.5 text-[12.5px] leading-relaxed text-ink-2">
        <div>
          <span className="overline mr-2">trigger</span>
          <span>{ex.form.trigger}</span>
        </div>
        <div>
          <span className="overline mr-2">tools</span>
          <span className="mono text-[11.5px]">
            {ex.form.tools.join(" · ") || "—"}
          </span>
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

function InstallStrip({ name, body }: { name: string; body: string }) {
  const [copied, setCopied] = useState(false);
  const path = `~/.claude/skills/${name}/SKILL.md`;
  const command = `mkdir -p ~/.claude/skills/${name} && cat > ${path} <<'SKILL_EOF'\n${body}\nSKILL_EOF`;

  const copyCommand = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const download = () => {
    const blob = new Blob([body], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "SKILL.md";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="surface rounded-[20px] p-5">
      <div className="flex items-center justify-between mb-2.5">
        <div className="overline">一键落地</div>
        <div className="mono text-[11px] text-ink-3">{path}</div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={copyCommand}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px]",
            "border border-line bg-paper-2/60 text-ink hover:border-line-strong transition-colors",
          )}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-[var(--sage)]" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          <span>{copied ? "已复制安装命令" : "复制一键安装命令"}</span>
        </button>
        <button
          onClick={download}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px]",
            "border border-line bg-paper-2/60 text-ink hover:border-line-strong transition-colors",
          )}
        >
          <Download className="h-3.5 w-3.5" />
          <span>下载 SKILL.md</span>
        </button>
      </div>
      <p className="mt-2.5 text-[11px] text-ink-3 leading-relaxed">
        粘贴到终端即可把 skill 写入 <span className="mono">{path}</span>。保存后新开一个 Claude Code 会话就能被触发。
      </p>
    </div>
  );
}
