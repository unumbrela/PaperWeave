'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { LogOut, BookOpen, Cloud, Check } from 'lucide-react'
import { useAuth } from '@/lib/auth/auth-context'
import { AuthDialog } from './AuthDialog'

export function AccountButton() {
  const { user, loading, configured, signOut } = useAuth()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  // 未配置 Supabase：不渲染登录入口（纯本地模式），避免误导
  if (!configured) return null
  if (loading) return <div className="h-8 w-8 rounded-full bg-paper-3/60 animate-pulse" />

  if (!user) {
    return (
      <>
        <button
          onClick={() => setDialogOpen(true)}
          className="rounded-full bg-ink px-4 py-1.5 text-[13px] font-medium text-paper transition-all hover:brightness-110 focus-ring"
        >
          登录
        </button>
        <AuthDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      </>
    )
  }

  const meta = user.user_metadata as { avatar_url?: string; full_name?: string; name?: string } | undefined
  const avatarUrl = meta?.avatar_url
  const display = meta?.full_name || meta?.name || user.email || user.phone || '我'
  const initial = (user.email || user.phone || 'U').trim().charAt(0).toUpperCase()

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="flex items-center focus-ring rounded-full"
        aria-label="账号"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={display}
            className="h-8 w-8 rounded-full border border-line object-cover"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#ff5d4d] to-[#9b5de5] text-[13px] font-semibold text-white shadow-sm">
            {initial}
          </span>
        )}
      </button>

      {menuOpen && (
        <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl surface-strong p-1.5 shadow-[0_20px_50px_-18px_rgba(26,23,19,0.4)] rise-d">
          <div className="px-3 py-2.5">
            <div className="truncate text-[13px] font-medium text-ink">{display}</div>
            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-sage">
              <Cloud className="h-3 w-3" />
              <Check className="h-2.5 w-2.5" />
              论文库已云端同步
            </div>
          </div>
          <div className="my-1 h-px bg-line" />
          <Link
            href="/library"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-ink-2 transition-colors hover:bg-paper-3/50"
          >
            <BookOpen className="h-4 w-4 text-ink-3" />
            我的论文库
          </Link>
          <button
            onClick={async () => {
              setMenuOpen(false)
              await signOut()
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-ink-2 transition-colors hover:bg-paper-3/50"
          >
            <LogOut className="h-4 w-4 text-ink-3" />
            退出登录
          </button>
        </div>
      )}
    </div>
  )
}
