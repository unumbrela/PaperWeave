import { NextResponse } from 'next/server';
import { listHotQueries } from '@/lib/paper-search/cache';

/**
 * 热门检索词 —— 从 search_cache 按命中次数降序取 top N。
 * 未配置 Supabase 时返回空数组，前端据此隐藏「热门检索」区。
 */
export async function GET() {
  const hot = await listHotQueries(8);
  return NextResponse.json({ success: true, data: hot });
}
