/**
 * 路由层 HTTP 工具 —— 限流、客户端标识、429 响应、带超时的上游 fetch。
 *
 * 限流是**内存滑动窗口**：零依赖、零配置、本地即生效。代价是 serverless 多实例下
 * 各实例各算一份（best-effort，不是强一致配额）；要强一致可换 Upstash Redis，
 * 但对「防误触/防轻度滥刷免 key 路由」这个目标，内存版已足够且不引入外部依赖。
 */

import { NextResponse } from "next/server";

export interface RateBucket {
  /** 窗口长度（毫秒） */
  windowMs: number;
  /** 窗口内允许的最大请求数 */
  max: number;
}

// key -> 该 key 在当前窗口内的请求时间戳（升序）
const hits = new Map<string, number[]>();

// 防止 Map 无界增长：超过阈值时清掉已全部过期的 key
const MAX_KEYS = 10_000;

export interface RateResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * 滑动窗口限流（纯逻辑，注入 now 便于单测）。
 * 记录每个 key 的请求时间戳，剔除窗口外的，超过 max 即拒绝。
 */
export function rateLimit(key: string, bucket: RateBucket, now: number = Date.now()): RateResult {
  const windowStart = now - bucket.windowMs;
  const arr = (hits.get(key) || []).filter((t) => t > windowStart);

  if (arr.length >= bucket.max) {
    const retryAfterMs = arr[0] + bucket.windowMs - now;
    hits.set(key, arr);
    return { allowed: false, remaining: 0, retryAfterMs: Math.max(0, retryAfterMs) };
  }

  arr.push(now);
  hits.set(key, arr);

  if (hits.size > MAX_KEYS) {
    for (const [k, v] of hits) {
      if (v.length === 0 || v[v.length - 1] <= windowStart) hits.delete(k);
    }
  }

  return { allowed: true, remaining: bucket.max - arr.length, retryAfterMs: 0 };
}

/** 仅供测试：清空限流状态。 */
export function __resetRateLimit(): void {
  hits.clear();
}

/** 从请求头取客户端 IP（Vercel/代理用 x-forwarded-for）；取不到退化为 'local'。 */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "local";
}

/** 拼出「路由名:IP」的限流 key。 */
export function clientKey(req: Request, name: string): string {
  return `${name}:${clientIp(req)}`;
}

/** 标准 429 响应（带 Retry-After 秒）。 */
export function tooManyRequests(retryAfterMs: number): NextResponse {
  const sec = Math.ceil(retryAfterMs / 1000);
  return NextResponse.json(
    { success: false, error: `请求过于频繁，请 ${sec} 秒后再试` },
    { status: 429, headers: { "Retry-After": String(sec) } },
  );
}

/**
 * 便捷守卫：超限直接返回 429 Response，未超限返回 null。
 * 用法：`const limited = enforceRateLimit(req, 'search', { windowMs: 60_000, max: 30 }); if (limited) return limited;`
 */
export function enforceRateLimit(req: Request, name: string, bucket: RateBucket): NextResponse | null {
  const r = rateLimit(clientKey(req, name), bucket);
  return r.allowed ? null : tooManyRequests(r.retryAfterMs);
}

/** 带超时的 fetch：到点 abort，避免上游挂起拖死 serverless 函数。 */
export async function fetchWithTimeout(
  url: string,
  opts: RequestInit = {},
  timeoutMs = 15_000,
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}
