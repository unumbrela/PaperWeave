'use client'

/**
 * 鉴权回跳落地页 —— 邮箱确认 / 魔法链接 / OAuth 统一回到这里。
 *
 * Supabase 客户端开了 detectSessionInUrl，会自动解析 URL 里的
 * `#access_token=...`（implicit）或 `?code=...`（pkce）并建立会话。
 * 本页只负责：抢先读 hash 里的 error、展示进度、成功后跳首页、失败给重试入口。
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { getSupabase } from '@/lib/supabase/client'

type State =
  | { phase: 'pending' }
  | { phase: 'success' }
  | { phase: 'error'; message: string }

/** 从 hash / query 里提取 Supabase 的错误描述（链接过期 / invalid 等）。 */
function readAuthError(): string | null {
  if (typeof window === 'undefined') return null
  const parse = (s: string) => new URLSearchParams(s.replace(/^[#?]/, ''))
  for (const src of [window.location.hash, window.location.search]) {
    if (!src) continue
    const p = parse(src)
    const err = p.get('error_description') || p.get('error')
    if (err) return err.replace(/\+/g, ' ')
  }
  return null
}

export default function AuthCallbackPage() {
  const router = useRouter()
  const [state, setState] = useState<State>({ phase: 'pending' })

  useEffect(() => {
    // 落地即同步判定错误/未配置态是本页的职责（必须在 getSupabase() 触发
    // detectSessionInUrl 清掉 hash 之前抢先读 error），故此处同步 setState 是有意为之。
    /* eslint-disable react-hooks/set-state-in-effect */
    const authError = readAuthError()
    if (authError) {
      setState({ phase: 'error', message: authError })
      return
    }

    const sb = getSupabase()
    if (!sb) {
      setState({
        phase: 'error',
        message: '登录服务未配置（管理员需在环境变量设置 Supabase）。',
      })
      return
    }
    /* eslint-enable react-hooks/set-state-in-effect */

    let done = false
    const finish = (next: State) => {
      if (done) return
      done = true
      setState(next)
      if (next.phase === 'success') {
        // 清掉地址栏残留的 token hash，再回首页
        window.history.replaceState(null, '', '/auth/callback')
        setTimeout(() => router.replace('/'), 700)
      }
    }

    // detectSessionInUrl 解析完会触发 SIGNED_IN；getSession 兜底已建立的会话。
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      if (session) finish({ phase: 'success' })
    })

    sb.auth.getSession().then(({ data }) => {
      if (data.session) finish({ phase: 'success' })
    })

    const timer = setTimeout(() => {
      finish({
        phase: 'error',
        message: '确认未完成，链接可能已过期或被使用。请重新登录或重新发送确认邮件。',
      })
    }, 6000)

    return () => {
      clearTimeout(timer)
      sub.subscription.unsubscribe()
    }
  }, [router])

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="relative w-full max-w-[420px] overflow-hidden rounded-[26px] border border-line-strong bg-paper shadow-[0_40px_90px_-24px_rgba(26,23,19,0.5)] rise-d">
        <div className="h-1 w-full bg-[linear-gradient(100deg,#ff5d4d,#f4c25a,#6b9b6f,#3b6ef6,#9b5de5)]" />
        <div className="flex flex-col items-center px-8 pb-9 pt-8 text-center">
          {state.phase === 'pending' && (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-ink-3" />
              <h1 className="serif mt-5 text-[24px] leading-tight text-ink">
                正在确认你的邮箱…
              </h1>
              <p className="mt-2 max-w-[18rem] text-[13px] leading-relaxed text-ink-3">
                正在建立登录会话，请稍候，马上带你进入。
              </p>
            </>
          )}

          {state.phase === 'success' && (
            <>
              <CheckCircle2 className="h-9 w-9 text-sage" />
              <h1 className="serif mt-5 text-[24px] leading-tight text-ink">
                邮箱确认成功
              </h1>
              <p className="mt-2 max-w-[18rem] text-[13px] leading-relaxed text-ink-3">
                正在进入站点…
              </p>
            </>
          )}

          {state.phase === 'error' && (
            <>
              <AlertCircle className="h-9 w-9 text-coral" />
              <h1 className="serif mt-5 text-[24px] leading-tight text-ink">
                确认未完成
              </h1>
              <p className="mt-2 max-w-[20rem] break-words text-[13px] leading-relaxed text-ink-3">
                {state.message}
              </p>
              <Link
                href="/"
                className="cta-gradient mt-6 inline-flex items-center justify-center rounded-full px-6 py-2.5 text-[14px] font-medium focus-ring"
              >
                返回首页
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
