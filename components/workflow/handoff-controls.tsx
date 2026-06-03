'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight, CornerDownRight, X } from 'lucide-react'
import { getTool } from '@/lib/tools-registry'
import { stageHandoff, type HandoffPayload } from '@/lib/workflow/handoff'
import { cn } from '@/lib/utils'

/**
 * 「发往下一环」按钮 —— 上游输出区放置，点击后暂存 payload 并跳转到目标工具。
 */
export function SendToTool({
  targetSlug,
  payload,
  label,
  disabled,
  className,
}: {
  targetSlug: string
  payload: HandoffPayload
  label?: string
  disabled?: boolean
  className?: string
}) {
  const router = useRouter()
  const target = getTool(targetSlug)
  const text = label ?? `发往「${target?.name ?? targetSlug}」`

  const go = () => {
    stageHandoff(targetSlug, payload)
    router.push(target?.href ?? `/tools/${targetSlug}`)
  }

  return (
    <button
      onClick={go}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-line bg-paper-2/70 px-4 py-2',
        'text-[12px] font-medium text-ink-2 transition-all',
        'hover:border-line-strong hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed focus-ring',
        className,
      )}
    >
      {text}
      <ArrowRight className="h-3.5 w-3.5" />
    </button>
  )
}

/**
 * 「来自上一环」提示条 —— 下游页消费到 handoff 时展示，可关闭。
 */
export function HandoffBanner({
  from,
  onDismiss,
}: {
  from: string
  onDismiss: () => void
}) {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-xl border border-line bg-paper-2/60 px-4 py-2.5 text-[12px] text-ink-2">
      <CornerDownRight className="h-3.5 w-3.5 text-ink-3" />
      <span>
        已自动填入 <span className="serif-italic text-ink">来自「{from}」</span> 的内容
      </span>
      <button
        onClick={onDismiss}
        className="ml-auto rounded-md p-1 text-ink-3 transition-colors hover:text-ink"
        aria-label="关闭提示"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
