/**
 * Supabase 浏览器客户端 —— 登录鉴权 + 云端论文库（带 RLS 行级隔离）的统一入口。
 *
 * 设计原则：**未配置 Supabase 时安全降级**。没有 NEXT_PUBLIC_SUPABASE_URL /
 * ANON_KEY 时 getSupabase() 返回 null，全站退回「纯本地 Dexie」模式，不报错、可构建。
 * 配上 env（Vercel 或 .env.local）后，登录与跨设备同步自动启用。
 */

import {
  createClient,
  type SupabaseClient,
  type Session,
  type User,
} from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const PLACEHOLDERS = new Set(['', undefined, 'your-supabase-url', 'your-supabase-anon-key']);

export function isSupabaseConfigured(): boolean {
  return (
    !!url && !!anonKey && !PLACEHOLDERS.has(url) && !PLACEHOLDERS.has(anonKey)
  );
}

let _client: SupabaseClient | null = null;

/** 浏览器单例 Supabase 客户端；未配置或在服务端返回 null。 */
export function getSupabase(): SupabaseClient | null {
  if (typeof window === 'undefined') return null;
  if (!isSupabaseConfigured()) return null;
  if (_client) return _client;
  _client = createClient(url as string, anonKey as string, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // 自动处理 OAuth / magic-link 回跳
    },
  });
  return _client;
}

export type { Session, User };
