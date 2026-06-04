'use client'

/**
 * 鉴权上下文 —— 包裹全站，提供登录态与各登录方式。
 *
 * 登录瞬间：setSyncUser(uid) → 先把本地已有库 push 到云端（pushAllLocal），
 * 再从云端拉全量合并进本地（pullAll）→ 实现「跨设备 / 换浏览器 / 清缓存不丢」。
 * 未配置 Supabase 时 supabase 为 null，所有方法返回友好错误，全站退回纯本地。
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { getSupabase, isSupabaseConfigured, type User } from '@/lib/supabase/client'
import { cloudSync, setSyncUser } from '@/lib/sync/cloud-sync'

interface AuthResult {
  error?: string
}

interface AuthContextValue {
  user: User | null
  loading: boolean
  configured: boolean
  signInWithGoogle: () => Promise<AuthResult>
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>
  signUpWithEmail: (email: string, password: string) => Promise<AuthResult & { needsConfirm?: boolean }>
  signInWithMagicLink: (email: string) => Promise<AuthResult>
  sendPhoneOtp: (phone: string) => Promise<AuthResult>
  verifyPhoneOtp: (phone: string, token: string) => Promise<AuthResult>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const NOT_CONFIGURED: AuthResult = {
  error: '登录服务未配置（管理员需在环境变量设置 Supabase）。',
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : '操作失败，请重试'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const configured = isSupabaseConfigured()

  // 登录成功后：标记同步用户，并双向同步（先上推本地、再下拉合并）
  const onSignedIn = useCallback(async (u: User) => {
    setSyncUser(u.id)
    try {
      await cloudSync.pushAllLocal()
      await cloudSync.pullAll()
    } catch (e) {
      console.warn('[auth] 初次同步失败（已忽略）:', e)
    }
  }, [])

  useEffect(() => {
    const sb = getSupabase()
    if (!sb) {
      // 未配置 Supabase：异步置非加载态（避免 effect 内同步 setState）
      const t = setTimeout(() => setLoading(false), 0)
      return () => clearTimeout(t)
    }

    sb.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null
      setUser(u)
      if (u) setSyncUser(u.id)
      setLoading(false)
    })

    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (event === 'SIGNED_IN' && u) {
        void onSignedIn(u)
      } else if (event === 'SIGNED_OUT') {
        setSyncUser(null)
      }
    })

    return () => sub.subscription.unsubscribe()
  }, [onSignedIn])

  const signInWithGoogle = useCallback(async (): Promise<AuthResult> => {
    const sb = getSupabase()
    if (!sb) return NOT_CONFIGURED
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    return error ? { error: msg(error) } : {}
  }, [])

  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const sb = getSupabase()
      if (!sb) return NOT_CONFIGURED
      const { error } = await sb.auth.signInWithPassword({ email, password })
      return error ? { error: msg(error) } : {}
    },
    [],
  )

  const signUpWithEmail = useCallback(
    async (email: string, password: string) => {
      const sb = getSupabase()
      if (!sb) return NOT_CONFIGURED
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      })
      if (error) return { error: msg(error) }
      // 需要邮件确认时 session 为空
      return { needsConfirm: !data.session }
    },
    [],
  )

  const signInWithMagicLink = useCallback(async (email: string): Promise<AuthResult> => {
    const sb = getSupabase()
    if (!sb) return NOT_CONFIGURED
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    return error ? { error: msg(error) } : {}
  }, [])

  const sendPhoneOtp = useCallback(async (phone: string): Promise<AuthResult> => {
    const sb = getSupabase()
    if (!sb) return NOT_CONFIGURED
    const { error } = await sb.auth.signInWithOtp({ phone })
    return error ? { error: msg(error) } : {}
  }, [])

  const verifyPhoneOtp = useCallback(
    async (phone: string, token: string): Promise<AuthResult> => {
      const sb = getSupabase()
      if (!sb) return NOT_CONFIGURED
      const { error } = await sb.auth.verifyOtp({ phone, token, type: 'sms' })
      return error ? { error: msg(error) } : {}
    },
    [],
  )

  const signOut = useCallback(async () => {
    const sb = getSupabase()
    if (!sb) return
    await sb.auth.signOut()
    setSyncUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        configured,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signInWithMagicLink,
        sendPhoneOtp,
        verifyPhoneOtp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth 必须在 <AuthProvider> 内使用')
  return ctx
}
