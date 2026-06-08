import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/lib/api/http";

export const runtime = "nodejs";

/** 公开读取分享快照（服务端代理，绕过 RLS）。命中后异步 +1 浏览量。 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const limited = enforceRateLimit(request, "share-read", { windowMs: 60_000, max: 60 });
  if (limited) return limited;

  const { token } = await params;
  const db = getServiceSupabase();
  if (!db) {
    return NextResponse.json(
      { success: false, error: "分享功能未启用" },
      { status: 503 },
    );
  }

  try {
    const { data, error } = await db
      .from("shares")
      .select("kind, title, snapshot, view_count, created_at, expires_at")
      .eq("token", token)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ success: false, error: "分享不存在或已删除" }, { status: 404 });
    }
    if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ success: false, error: "分享链接已过期" }, { status: 410 });
    }

    // 浏览量 +1：fire-and-forget
    db.rpc("increment_share_view", { p_token: token }).then(
      () => {},
      () => {},
    );

    return NextResponse.json({
      success: true,
      data: {
        kind: data.kind,
        title: data.title,
        snapshot: data.snapshot,
        views: (data.view_count as number) + 1,
        createdAt: data.created_at,
      },
    });
  } catch (error) {
    console.error("[Share Read] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "读取分享失败" },
      { status: 500 },
    );
  }
}
