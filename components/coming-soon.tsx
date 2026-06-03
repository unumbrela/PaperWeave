import { getTool } from "@/lib/tools-registry";
import { ToolShell } from "@/components/tool-shell";

export function ComingSoon({
  slug,
  intent,
  inputs,
  outputs,
  notes,
}: {
  slug: string;
  intent: string;
  inputs: string[];
  outputs: string[];
  notes?: string;
}) {
  const tool = getTool(slug);
  if (!tool) {
    return <div className="p-8">Unknown tool: {slug}</div>;
  }

  return (
    <ToolShell tool={tool}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* LEFT · intent */}
        <div className="surface rounded-[20px] p-6">
          <div className="overline mb-3">占位 · 功能规划</div>
          <h2 className="serif text-[22px] leading-tight text-ink mb-3">
            这里将做什么
          </h2>
          <p className="text-[14px] leading-relaxed text-ink-2">{intent}</p>

          {notes && (
            <>
              <div className="hairline my-6" />
              <div className="overline mb-2">备注</div>
              <p className="text-[13px] leading-relaxed text-ink-3">{notes}</p>
            </>
          )}
        </div>

        {/* RIGHT · inputs / outputs */}
        <div className="grid gap-6">
          <div className="surface rounded-[20px] p-6">
            <div className="overline mb-3">预期输入</div>
            <ul className="space-y-2">
              {inputs.map((line, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-[13.5px] leading-relaxed text-ink-2"
                >
                  <span className="numeral text-[12px] text-ink-3 mt-0.5 min-w-[1.2em]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="surface rounded-[20px] p-6">
            <div className="overline mb-3">预期产出</div>
            <ul className="space-y-2">
              {outputs.map((line, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-[13.5px] leading-relaxed text-ink-2"
                >
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-coral mt-2" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div
        className="mt-10 rounded-[20px] border border-dashed p-6 text-center"
        style={{ borderColor: "var(--line)" }}
      >
        <p className="serif-italic text-xl text-ink-2">Under construction.</p>
        <p className="mt-2 text-sm text-ink-3">
          前端占位已就位，功能实现留待后续迭代。
        </p>
      </div>
    </ToolShell>
  );
}
