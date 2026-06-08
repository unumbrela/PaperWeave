/**
 * 轻量可观测性 —— 结构化日志 + 内存指标。**不改任何响应契约**。
 *
 * - `logEvent` 打一行 JSON 到 stdout（Vercel / 容器平台会自动采集），同时累加内存计数。
 * - `getMetrics` 给 `/api/metrics` 暴露聚合视图（调用量 / 错误率 / 平均耗时 / 命中率）。
 *
 * 内存指标是 best-effort、每实例一份（serverless 多实例不汇总）；要长期/跨实例
 * 留存可把 logEvent 的 JSON 行接到日志后端（Datadog/Logflare）或换 Sentry。
 */

export interface LogEvent {
  /** 路由名，如 'paper-search' */
  route: string;
  /** 业务是否成功 */
  ok: boolean;
  /** 处理耗时（毫秒） */
  ms: number;
  /** HTTP 状态码（可选） */
  status?: number;
  /** 附加维度：provider / cached / results 等（可选） */
  meta?: Record<string, unknown>;
}

interface RouteMetric {
  count: number;
  errors: number;
  totalMs: number;
  /** 任意计数维度，如 { cacheHit: 12, deepseek: 3 } */
  tags: Record<string, number>;
}

const metrics = new Map<string, RouteMetric>();

function bump(route: string): RouteMetric {
  let m = metrics.get(route);
  if (!m) {
    m = { count: 0, errors: 0, totalMs: 0, tags: {} };
    metrics.set(route, m);
  }
  return m;
}

/** 记录一次路由调用：累加内存指标 + 打结构化日志行。 */
export function logEvent(ev: LogEvent): void {
  const m = bump(ev.route);
  m.count += 1;
  if (!ev.ok) m.errors += 1;
  m.totalMs += ev.ms;
  // 把布尔/字符串型 meta 累加成计数标签（便于算命中率/各 provider 占比）
  if (ev.meta) {
    for (const [k, v] of Object.entries(ev.meta)) {
      if (v === true) m.tags[k] = (m.tags[k] || 0) + 1;
      else if (typeof v === "string") m.tags[`${k}:${v}`] = (m.tags[`${k}:${v}`] || 0) + 1;
    }
  }

  try {
    console.log(
      JSON.stringify({
        t: new Date().toISOString(),
        lvl: ev.ok ? "info" : "error",
        route: ev.route,
        ok: ev.ok,
        ms: ev.ms,
        ...(ev.status != null ? { status: ev.status } : {}),
        ...(ev.meta || {}),
      }),
    );
  } catch {
    /* 日志失败绝不影响主流程 */
  }
}

export interface RouteMetricView {
  route: string;
  count: number;
  errors: number;
  errorRate: number;
  avgMs: number;
  tags: Record<string, number>;
}

/** 聚合快照（供 /api/metrics）。 */
export function getMetrics(): RouteMetricView[] {
  return [...metrics.entries()]
    .map(([route, m]) => ({
      route,
      count: m.count,
      errors: m.errors,
      errorRate: m.count ? Number((m.errors / m.count).toFixed(3)) : 0,
      avgMs: m.count ? Math.round(m.totalMs / m.count) : 0,
      tags: { ...m.tags },
    }))
    .sort((a, b) => b.count - a.count);
}

/** 仅供测试：清空指标。 */
export function __resetMetrics(): void {
  metrics.clear();
}

/** 计时器：调用返回已用毫秒。 */
export function startTimer(): () => number {
  const s = Date.now();
  return () => Date.now() - s;
}
