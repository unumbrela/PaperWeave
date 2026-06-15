/**
 * 鉴权回跳基址 —— 统一邮箱确认 / 魔法链接 / OAuth 的 redirectTo 计算。
 *
 * 浏览器端用运行时 origin（prod→prod、preview→preview、local→local 各自回到自身），
 * 只要这些 origin 都在 Supabase「Redirect URLs」白名单里即可两端通用。
 * SSR / 无 window 时回退到 NEXT_PUBLIC_SITE_URL，口径与 app/layout.tsx 一致。
 */

const FALLBACK_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.z1ha0.com'

/** 返回鉴权回跳的完整 URL，如 `https://www.z1ha0.com/auth/callback`。 */
export function authRedirectURL(path = '/auth/callback'): string {
  const base =
    typeof window !== 'undefined'
      ? window.location.origin
      : FALLBACK_SITE_URL
  return `${base.replace(/\/$/, '')}${path}`
}
