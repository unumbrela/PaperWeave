/**
 * Supabase 服务端客户端 —— 仅在 Route Handler / 服务端用，持 service-role key，
 * 绕过 RLS 直写「全站共享」的表（如 search_cache 检索缓存）。
 *
 * 设计原则与浏览器客户端一致：**未配置时安全降级**。缺
 * NEXT_PUBLIC_SUPABASE_URL（或 SUPABASE_URL）/ SUPABASE_SERVICE_ROLE_KEY 时
 * getServiceSupabase() 返回 null，调用方应退回「无缓存直连上游」，不报错、可构建。
 *
 * ⚠️ service-role key 拥有完全权限，**只能存在于服务端**，永远不要带 NEXT_PUBLIC_ 前缀。
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const PLACEHOLDERS = new Set([
  '',
  undefined,
  'your-supabase-url',
  'your-service-role-key',
]);

/** 服务端缓存层是否可用（配齐 URL + service-role key）。 */
export function isServiceSupabaseConfigured(): boolean {
  return (
    !!url &&
    !!serviceKey &&
    !PLACEHOLDERS.has(url) &&
    !PLACEHOLDERS.has(serviceKey)
  );
}

let _client: SupabaseClient | null = null;

/** 服务端单例 service-role 客户端；未配置返回 null（调用方据此降级）。 */
export function getServiceSupabase(): SupabaseClient | null {
  if (!isServiceSupabaseConfigured()) return null;
  if (_client) return _client;
  _client = createClient(url as string, serviceKey as string, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}
