'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, CornerDownRight, X, Check, Save, Loader2, AlertCircle } from 'lucide-react'
import { getTool } from '@/lib/tools-registry'
import { stageHandoff, type HandoffPayload } from '@/lib/workflow/handoff'
import { repository } from '@/lib/db/repository'
import type { Paper } from '@/lib/db/types'
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

/**
 * 「回存到论文库」按钮 —— 闭合工作流的最后一环。
 *
 * 下游工具（要点提炼 / 创新点立论）产出后，若本次链路来自某篇论文
 * （handoff 携带 `sourcePaperId`），即可把产出写回该论文条目对应字段。
 * 仓储为本地 Dexie 单一真相源（见 PROJECT-SUMMARY.md §六·1）。
 *
 * - `field`：写回的论文字段（如 `summary` / `notes`）
 * - `append`：true 时追加到该字段已有内容之后（适合「笔记/idea」累积），
 *   false 时整体替换（适合「总结」覆盖）
 */
export function SaveToLibrary({
  paperId,
  field,
  value,
  label,
  append = false,
}: {
  paperId: string
  field: 'summary' | 'notes' | 'contribution' | 'methodology'
  value: string
  label?: string
  append?: boolean
}) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')

  const save = async () => {
    if (status === 'saving' || status === 'done') return
    setStatus('saving')
    try {
      let next = value.trim()
      if (append) {
        const existing = await repository.getPaper(paperId)
        const prev = (existing?.[field] as string | undefined)?.trim()
        if (prev) next = `${prev}\n\n---\n\n${next}`
      }
      const patch = { [field]: next } as Partial<Paper>
      const updated = await repository.updatePaper(paperId, patch)
      setStatus(updated ? 'done' : 'error')
    } catch (err) {
      console.warn('[SaveToLibrary] 回存失败:', err)
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper-2/70 px-4 py-2 text-[12px] font-medium text-ink-2">
        <Check className="h-3.5 w-3.5 text-emerald-600" />
        已回存
        <Link
          href={`/library/${paperId}`}
          className="ml-1 text-ink underline decoration-line-strong underline-offset-2 hover:text-coral"
        >
          查看论文
        </Link>
      </span>
    )
  }

  return (
    <button
      onClick={save}
      disabled={status === 'saving'}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[12px] font-medium transition-all focus-ring',
        status === 'error'
          ? 'border-red-300 bg-red-50 text-red-600 hover:bg-red-100'
          : 'border-line bg-paper-2/70 text-ink-2 hover:border-line-strong hover:text-ink',
        'disabled:opacity-50 disabled:cursor-not-allowed',
      )}
    >
      {status === 'saving' ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : status === 'error' ? (
        <AlertCircle className="h-3.5 w-3.5" />
      ) : (
        <Save className="h-3.5 w-3.5" />
      )}
      {status === 'saving'
        ? '回存中…'
        : status === 'error'
          ? '回存失败 · 重试'
          : (label ?? '回存到论文库')}
    </button>
  )
}
