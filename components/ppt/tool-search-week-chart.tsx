import Image from "next/image";
import {
  toolSearchWeekData,
  toolSearchWeekRatio,
  toolSearchWeekSummary,
} from "@/lib/ppt/tool-search-week";

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function ToolSearchWeekChart() {
  return (
    <section className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="surface rounded-[24px] p-5">
          <div className="overline">Week Total</div>
          <div className="mt-3 numeral text-[44px] leading-none">
            {toolSearchWeekSummary.totalPages}
          </div>
          <p className="mt-2 text-sm text-ink-2">一周浏览网页总数</p>
        </div>

        <div className="surface rounded-[24px] p-5">
          <div className="overline">Tool Related</div>
          <div className="mt-3 numeral text-[44px] leading-none text-coral">
            {toolSearchWeekSummary.toolPages}
          </div>
          <p className="mt-2 text-sm text-ink-2">与工具使用相关的浏览量</p>
        </div>

        <div className="surface rounded-[24px] p-5">
          <div className="overline">Week Ratio</div>
          <div className="mt-3 numeral text-[44px] leading-none">
            {formatPercent(toolSearchWeekRatio)}
          </div>
          <p className="mt-2 text-sm text-ink-2">工具相关内容占整周浏览量的比例</p>
        </div>
      </div>

      <div className="surface rounded-[28px] p-5 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="overline">Python Chart</div>
            <h2 className="mt-3 serif text-[30px] leading-tight tracking-tight text-ink sm:text-[38px]">
              Python 生成的堆叠柱状图
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-2">
              这张图由
              <span className="mono text-[12px]"> Python + matplotlib </span>
              生成。数据按工作日和周末的不同节奏做成了有波动的版本，适合放在 PPT
              引入页里作为动机数据。
            </p>
          </div>

          <div className="rounded-full border border-line bg-white/45 px-4 py-2 text-xs text-ink-2">
            导出资产：
            <span className="mono text-[12px] text-ink"> SVG / PNG / CSV </span>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-[24px] border border-line bg-[rgba(255,255,255,0.34)]">
          <Image
            src="/ppt/tool-search-week-chart.svg"
            alt="一周搜索行为柱状图"
            width={1600}
            height={900}
            unoptimized
            className="block h-auto w-full"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[18px] border border-line bg-white/45 px-4 py-3">
          <div className="overline">Pattern 01</div>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">
            周一、周二维持高位，说明任务启动阶段工具搜索更密集。
          </p>
        </div>

        <div className="rounded-[18px] border border-line bg-white/45 px-4 py-3">
          <div className="overline">Pattern 02</div>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">
            周三、周四明显回落，更像进入相对稳定的执行阶段。
          </p>
        </div>

        <div className="rounded-[18px] border border-line bg-white/45 px-4 py-3">
          <div className="overline">Pattern 03</div>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">
            周五再次抬升，符合任务收尾或集中交付时重新找工具的行为。
          </p>
        </div>

        <div className="rounded-[18px] border border-line bg-white/45 px-4 py-3">
          <div className="overline">Pattern 04</div>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">
            周末更低，但仍保留波动，不是完全归零。
          </p>
        </div>
      </div>

      <div className="surface rounded-[28px] p-5 sm:p-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="overline">Expanded Data</div>
            <h3 className="mt-3 serif text-[26px] tracking-tight text-ink">
              重新设计后的 7 天数据
            </h3>
          </div>
          <p className="max-w-md text-right text-xs leading-relaxed text-ink-3">
            这组数据用于 PPT 引入的叙事展示，强调趋势和波动，而不是逐字复刻原始日志。
          </p>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 overflow-hidden rounded-[20px] border border-line bg-white/50 text-left">
            <thead>
              <tr className="bg-white/70 text-sm text-ink">
                <th className="border-b border-line px-4 py-3 font-medium">日期</th>
                <th className="border-b border-line px-4 py-3 font-medium">星期</th>
                <th className="border-b border-line px-4 py-3 font-medium">浏览网页总数</th>
                <th className="border-b border-line px-4 py-3 font-medium">使用工具相关</th>
                <th className="border-b border-line px-4 py-3 font-medium">占比</th>
                <th className="border-b border-line px-4 py-3 font-medium">说明</th>
              </tr>
            </thead>
            <tbody className="text-sm text-ink-2">
              {toolSearchWeekData.map((day, index) => (
                <tr
                  key={day.date}
                  className={index % 2 === 0 ? "bg-white/35" : "bg-transparent"}
                >
                  <td className="border-b border-line px-4 py-3 mono text-[12px] text-ink">
                    {day.date}
                  </td>
                  <td className="border-b border-line px-4 py-3">{day.weekday}</td>
                  <td className="border-b border-line px-4 py-3">{day.totalPages}</td>
                  <td className="border-b border-line px-4 py-3 text-coral">
                    {day.toolPages}
                  </td>
                  <td className="border-b border-line px-4 py-3">
                    {formatPercent(day.ratio)}
                  </td>
                  <td className="border-b border-line px-4 py-3">{day.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
