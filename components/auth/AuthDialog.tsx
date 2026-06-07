'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Mail, Phone, Lock, Loader2, ArrowLeft, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react'
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
    // 打开时锁定背景滚动
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  // 经 Portal 挂到 document.body —— 否则 fixed 会被导航栏的 backdrop-filter
  // 困在 56px 高的 header 容器里（containing block 陷阱），导致弹窗错位/被裁剪。
  if (!open || typeof document === 'undefined') return null

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
    'w-full rounded-2xl border border-line bg-paper-2 pl-11 pr-3.5 py-3 text-[14px] text-ink outline-none transition-all placeholder:text-ink-4 shadow-[inset_0_1px_2px_rgba(26,23,19,0.05)] focus:border-line-strong focus:bg-paper focus-ring'

  const subtitle =
    mode === 'signin'
      ? '登录后，论文库 / 批注 / 笔记跨设备同步，清缓存也不丢'
      : '注册后，你的研究随身、随处可续——一处书写，处处续上'

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true">
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-ink/35 backdrop-blur-[6px]"
        aria-hidden
        onClick={onClose}
      />

      {/* 可滚动容器：内容超高时整体滚动，绝不把卡片顶出屏幕 */}
      <div className="fixed inset-0 overflow-y-auto">
        <div
          className="flex min-h-full items-center justify-center p-4 sm:p-6"
          onClick={onClose}
        >
          {/* 卡片 */}
          <div
            className="relative w-full max-w-[400px] overflow-hidden rounded-[26px] border border-line-strong bg-paper shadow-[0_40px_90px_-24px_rgba(26,23,19,0.5)] rise-d"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 顶部细渐变条（品牌呼应） */}
            <div className="h-1 w-full bg-[linear-gradient(100deg,#ff5d4d,#f4c25a,#6b9b6f,#3b6ef6,#9b5de5)]" />

            <div className="px-7 pb-7 pt-6">
              <button
                onClick={onClose}
                aria-label="关闭"
                className="absolute right-3.5 top-4 rounded-full p-1.5 text-ink-3 transition-colors hover:bg-paper-3/70 hover:text-ink focus-ring"
              >
                <X className="h-4 w-4" />
              </button>

              {/* 头部：发光印章 + 编辑体标题 */}
              <div className="mb-6 flex flex-col items-center text-center">
                <div className="relative mb-4 mt-1">
                  <span
                    aria-hidden
                    className="absolute -inset-2.5 rounded-full bg-coral/25 blur-xl"
                  />
                  <span
                    aria-hidden
                    className="relative inline-block h-11 w-11 rounded-full bg-[conic-gradient(from_220deg,#ff5d4d,#f4c25a,#6b9b6f,#3b6ef6,#9b5de5,#ff5d4d)] shadow-[inset_0_0_0_1px_rgba(26,23,19,0.14),0_6px_16px_-6px_rgba(155,93,229,0.6)]"
                  />
                </div>
                <span className="overline mb-1.5 text-ink-3">PaperWeave</span>
                <h2 className="serif text-[28px] leading-tight text-ink">
                  {mode === 'signin' ? (
                    <>
                      欢迎<span className="serif-italic">回来</span>
                    </>
                  ) : (
                    <>
                      开启研究<span className="serif-italic">档案</span>
                    </>
                  )}
                </h2>
                <p className="mt-2 max-w-[16rem] text-[12.5px] leading-relaxed text-ink-3">
                  {subtitle}
                </p>
              </div>

              {!configured && (
                <div className="mb-4 flex items-start gap-2 rounded-2xl border border-line bg-paper-2/70 px-3.5 py-2.5 text-[12px] text-ink-3">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  登录服务尚未配置，配置 Supabase 后即可启用（见 AUTH-SETUP.md）。
                </div>
              )}

              {/* Google 一键 */}
              <button
                onClick={onGoogle}
                disabled={loading || !configured}
                className="flex w-full items-center justify-center gap-3 rounded-full border border-line-strong bg-white px-4 py-3 text-[14px] font-medium text-ink shadow-[0_1px_2px_rgba(26,23,19,0.06)] transition-all hover:-translate-y-px hover:shadow-[0_8px_20px_-8px_rgba(26,23,19,0.3)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 focus-ring"
              >
                <GoogleIcon />
                使用 Google 账号继续
              </button>

              {/* 分隔 */}
              <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-ink-4">
                <span className="h-px flex-1 bg-line" />
                或用邮箱 / 手机
                <span className="h-px flex-1 bg-line" />
              </div>

              {/* 邮箱 / 手机 切换 */}
              <div className="mb-4 flex rounded-full border border-line bg-paper-3/40 p-1 text-[13px]">
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
                        ? 'bg-paper text-ink shadow-[0_1px_3px_rgba(26,23,19,0.12)]'
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
                <div className="space-y-2.5">
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4" />
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
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4" />
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
                    className="cta-gradient mt-1 flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-[14px] font-medium focus-ring"
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {mode === 'signin' ? '登录' : '创建账号'}
                  </button>

                  <button
                    onClick={onMagicLink}
                    disabled={loading || !configured}
                    className="w-full pt-1 text-center text-[12px] text-ink-3 transition-colors hover:text-ink disabled:opacity-50"
                  >
                    用邮箱验证链接登录（免密码）
                  </button>
                </div>
              )}

              {/* 手机方式 */}
              {method === 'phone' && (
                <div className="space-y-2.5">
                  {!otpSent ? (
                    <>
                      <div className="relative">
                        <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4" />
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
                        className="cta-gradient mt-1 flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-[14px] font-medium focus-ring"
                      >
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        发送验证码
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setOtpSent(false)}
                        className="flex items-center gap-1 text-[12px] text-ink-3 transition-colors hover:text-ink"
                      >
                        <ArrowLeft className="h-3 w-3" /> 改手机号
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="6 位短信验证码"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && onVerifyOtp()}
                        className="w-full rounded-2xl border border-line bg-paper-2 px-3 py-3 text-center text-[18px] tracking-[0.4em] text-ink outline-none shadow-[inset_0_1px_2px_rgba(26,23,19,0.05)] focus:border-line-strong focus:bg-paper focus-ring"
                      />
                      <button
                        onClick={onVerifyOtp}
                        disabled={loading || !configured}
                        className="cta-gradient mt-1 flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-[14px] font-medium focus-ring"
                      >
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        验证并登录
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* 提示（用固定圆角块，配滚动容器，绝不顶出屏幕） */}
              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-2xl border border-coral/20 bg-coral/10 px-3.5 py-2.5 text-[12.5px] text-coral rise-d">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {info && (
                <div className="mt-4 flex items-start gap-2 rounded-2xl border border-sage/25 bg-sage/12 px-3.5 py-2.5 text-[12.5px] text-sage rise-d">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{info}</span>
                </div>
              )}

              {/* 切换登录/注册 */}
              <p className="mt-6 text-center text-[13px] text-ink-3">
                {mode === 'signin' ? '还没有账号？' : '已经有账号了？'}
                <button
                  onClick={() => {
                    setMode(mode === 'signin' ? 'signup' : 'signin')
                    reset()
                  }}
                  className="ml-1 font-medium text-ink underline decoration-coral/40 decoration-2 underline-offset-4 transition-colors hover:decoration-coral"
                >
                  {mode === 'signin' ? '免费注册' : '去登录'}
                </button>
              </p>

              {/* 信任脚注 */}
              <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-ink-4">
                <ShieldCheck className="h-3 w-3" />
                本地优先 · 数据端到端归你所有
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
