/**
 * 工作流串联 —— 「上游输出即下游输入」的一键流转。
 *
 * 用 sessionStorage 在工具页之间传递 payload：上游 `sendToTool` 写入并跳转，
 * 下游页挂载时 `consumeHandoff` 读取并清除（一次性）。这样 7 环主线在 UI 上
 * 显化为真正连通的链路，而非各自孤立的工具。
 *
 * 见 PROJECT-SUMMARY.md · P1（主线链路打通）。
 */

const KEY_PREFIX = 'paperweave:handoff:'

export interface HandoffPayload {
  /** 来源工具的中文名，用于下游展示「来自 XXX」 */
  from: string
  /** 目标字段名 → 预填值（字段名由目标工具页约定，如 markdown / references / direction） */
  fields: Record<string, string>
  /**
   * 来源论文 id（可选）。当链路从论文库详情页发起时携带，
   * 下游工具据此把产出「回存」到该论文条目，闭合工作流（见 PROJECT-SUMMARY.md §六·1）。
   */
  sourcePaperId?: string
}

/** 上游：把 payload 暂存到目标工具的槽位（随后调用方负责跳转到目标路由） */
export function stageHandoff(targetSlug: string, payload: HandoffPayload): void {
  try {
    sessionStorage.setItem(KEY_PREFIX + targetSlug, JSON.stringify(payload))
  } catch (err) {
    console.warn('[handoff] 暂存失败:', err)
  }
}

/** 下游：取出并清除本工具槽位的 payload（一次性消费） */
export function consumeHandoff(targetSlug: string): HandoffPayload | null {
  try {
    const raw = sessionStorage.getItem(KEY_PREFIX + targetSlug)
    if (!raw) return null
    sessionStorage.removeItem(KEY_PREFIX + targetSlug)
    return JSON.parse(raw) as HandoffPayload
  } catch {
    return null
  }
}
