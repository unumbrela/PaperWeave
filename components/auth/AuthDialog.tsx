'use client'

import { useEffect, useState } from 'react'
import { X, Mail, Phone, Lock, Loader2, ArrowLeft, CheckCircle2, Sparkles } from 'lucide-react'
import { useAuth } from '@/lib/auth/auth-context'

function GoogleIcon() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.6 20-21 0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 5.1 29.6 3 24 3 16 3 9.1 7.6 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 45c5.2 0 10-2 13.6-5.2l-6.3-5.2C29.2 36 26.7 37 24 37c-5.3 0-9.7-2.6-11.3-7l-6.5 5C9.1 42.3 16 45 24 45z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.6l6.3 5.2C41.6 35.5 44 30.3 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  )
}

type Mode = 'signin' | 'signup'
type Method = 'email' | 'phone'

export function AuthDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    configured,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signInWithMagicLink,
    sendPhoneOtp,
    verifyPhoneOtp,
  } = useAuth()

  const [mode, setMode] = useState<Mode>('signin')
  const [method, setMethod] = useState<Method>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const reset = () => {
    setError(null)
    setInfo(null)
  }

  const guard = (r: { error?: string }) => {
    if (r.error) {
      setError(r.error)
      return false
    }
    return true
  }

  const onGoogle = async () => {
    reset()
    setLoading(true)
    const r = await signInWithGoogle()
    setLoading(false)
    if (!guard(r)) return
    // 成功会触发 OAuth 跳转，无需手动关闭
  }

  const onEmailSubmit = async () => {
    reset()
    if (!email.trim() || !password.trim()) {
      setError('请输入邮箱和密码')
      return
    }
    setLoading(true)
    if (mode === 'signin') {
      const r = await signInWithEmail(email.trim(), password)
      setLoading(false)
      if (!guard(r)) return
      onClose()
    } else {
      const r = await signUpWithEmail(email.trim(), password)
      setLoading(false)
      if (!guard(r)) return
      if (r.needsConfirm) {
        setInfo('注册成功！请到邮箱点击确认链接后即可登录。')
      } else {
        onClose()
      }
    }
  }

  const onMagicLink = async () => {
    reset()
    if (!email.trim()) {
      setError('请输入邮箱')
      return
    }
    setLoading(true)
    const r = await signInWithMagicLink(email.trim())
    setLoading(false)
    if (!guard(r)) return
    setInfo('登录链接已发到你的邮箱，点击即可免密登录。')
  }

  const onSendOtp = async () => {
    reset()
    if (!phone.trim()) {
      setError('请输入手机号（含国家码，如 +8613800138000）')
      return
    }
    setLoading(true)
    const r = await sendPhoneOtp(phone.trim())
    setLoading(false)
    if (!guard(r)) return
    setOtpSent(true)
    setInfo('验证码已发送，请查收短信。')
  }

  const onVerifyOtp = async () => {
    reset()
    if (!otp.trim()) {
      setError('请输入验证码')
      return
    }
    setLoading(true)
    const r = await verifyPhoneOtp(phone.trim(), otp.trim())
    setLoading(false)
    if (!guard(r)) return
    onClose()
  }

  const inputCls =
    'w-full rounded-xl border border-line bg-paper-2/70 pl-10 pr-3 py-2.5 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-4 focus:border-line-strong focus-ring'

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" />

      {/* 卡片 */}
      <div
        className="surface-strong relative w-full max-w-[400px] rounded-[28px] p-7 shadow-[0_30px_80px_-20px_rgba(26,23,19,0.4)] rise-d"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="关闭"
          className="absolute right-4 top-4 rounded-full p-1.5 text-ink-3 transition-colors hover:bg-paper-3/60 hover:text-ink focus-ring"
        >
          <X className="h-4 w-4" />
        </button>

        {/* 头部 */}
        <div className="mb-6 flex flex-col items-center text-center">
          <span
            aria-hidden
            className="mb-3 inline-block h-9 w-9 rounded-full bg-[conic-gradient(from_220deg,#ff5d4d,#f4c25a,#6b9b6f,#3b6ef6,#9b5de5,#ff5d4d)] shadow-[inset_0_0_0_1px_rgba(26,23,19,0.12)]"
          />
          <h2 className="serif text-2xl text-ink">
            {mode === 'signin' ? '欢迎回来' : '加入 '}
            {mode === 'signup' && <span className="serif-italic">PaperWeave</span>}
          </h2>
          <p className="mt-1 text-[13px] text-ink-3">
            {mode === 'signin'
              ? '登录后，论文库跨设备同步、清缓存不丢'
              : '注册后，你的研究随身、随处可续'}
          </p>
        </div>

        {!configured && (
          <div className="mb-4 rounded-xl border border-line bg-paper-2/60 px-3 py-2.5 text-[12px] text-ink-3">
            登录服务尚未配置。配置 Supabase 后即可启用（见 AUTH-SETUP.md）。
          </div>
        )}

        {/* Google 一键 */}
        <button
          onClick={onGoogle}
          disabled={loading || !configured}
          className="group flex w-full items-center justify-center gap-3 rounded-full border border-line-strong bg-white/90 px-4 py-3 text-[14px] font-medium text-ink shadow-sm transition-all hover:bg-white hover:shadow-md disabled:opacity-50 focus-ring"
        >
          <GoogleIcon />
          使用 Google 账号继续
        </button>

        {/* 分隔 */}
        <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-ink-4">
          <span className="h-px flex-1 bg-line" />
          或
          <span className="h-px flex-1 bg-line" />
        </div>

        {/* 邮箱 / 手机 切换 */}
        <div className="mb-4 flex rounded-full bg-paper-3/50 p-1 text-[13px]">
          {(['email', 'phone'] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMethod(m)
                setOtpSent(false)
                reset()
              }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition-all ${
                method === m
                  ? 'bg-paper text-ink shadow-sm'
                  : 'text-ink-3 hover:text-ink'
              }`}
            >
              {m === 'email' ? <Mail className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
              {m === 'email' ? '邮箱' : '手机号'}
            </button>
          ))}
        </div>

        {/* 邮箱方式 */}
        {method === 'email' && (
          <div className="space-y-3">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4" />
              <input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4" />
              <input
                type="password"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                placeholder={mode === 'signin' ? '密码' : '设置密码（至少 6 位）'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onEmailSubmit()}
                className={inputCls}
              />
            </div>

            <button
              onClick={onEmailSubmit}
              disabled={loading || !configured}
              className="cta-gradient flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-[14px] font-medium focus-ring"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {mode === 'signin' ? '登录' : '创建账号'}
            </button>

            <button
              onClick={onMagicLink}
              disabled={loading || !configured}
              className="w-full text-center text-[12px] text-ink-3 transition-colors hover:text-ink disabled:opacity-50"
            >
              用邮箱验证链接登录（免密码）
            </button>
          </div>
        )}

        {/* 手机方式 */}
        {method === 'phone' && (
          <div className="space-y-3">
            {!otpSent ? (
              <>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4" />
                  <input
                    type="tel"
                    autoComplete="tel"
                    placeholder="+86 138 0013 8000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onSendOtp()}
                    className={inputCls}
                  />
                </div>
                <button
                  onClick={onSendOtp}
                  disabled={loading || !configured}
                  className="cta-gradient flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-[14px] font-medium focus-ring"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  发送验证码
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setOtpSent(false)}
                  className="flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink"
                >
                  <ArrowLeft className="h-3 w-3" /> 改手机号
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="输入 6 位短信验证码"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onVerifyOtp()}
                  className="w-full rounded-xl border border-line bg-paper-2/70 px-3 py-2.5 text-center text-[16px] tracking-[0.3em] text-ink outline-none focus:border-line-strong focus-ring"
                />
                <button
                  onClick={onVerifyOtp}
                  disabled={loading || !configured}
                  className="cta-gradient flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-[14px] font-medium focus-ring"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  验证并登录
                </button>
              </>
            )}
          </div>
        )}

        {/* 提示 */}
        {error && (
          <p className="mt-4 rounded-xl bg-[#ff5d4d]/8 px-3 py-2 text-center text-[12px] text-coral">
            {error}
          </p>
        )}
        {info && (
          <p className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-sage/10 px-3 py-2 text-center text-[12px] text-sage">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {info}
          </p>
        )}

        {/* 切换登录/注册 */}
        <p className="mt-6 text-center text-[13px] text-ink-3">
          {mode === 'signin' ? '还没有账号？' : '已经有账号了？'}
          <button
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin')
              reset()
            }}
            className="ml-1 font-medium text-ink underline-offset-2 hover:underline"
          >
            {mode === 'signin' ? '免费注册' : '去登录'}
          </button>
        </p>
      </div>
    </div>
  )
}
