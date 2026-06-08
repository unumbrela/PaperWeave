import { NextResponse } from "next/server";
import { z } from "zod";
import { getServiceSupabase } from "@/lib/supabase/server";
import { genShareToken } from "@/lib/share/snapshot";
import { enforceRateLimit } from "@/lib/api/http";

export const runtime = "nodejs";
export const maxDuration = 30;

const SHARE_TTL_DAYS = 30;

const Body = z.object({
  kind: z.enum(["paper", "library"]),
  title: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
});

/** 创建只读分享。客户端传入已构造好的 ShareSnapshot（kind/title/data）。 */
export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "share-create", { windowMs: 60_000, max: 10 });
  if (limited) return limited;

  const db = getServiceSupabase();
  if (!db) {
    return NextResponse.json(
      {
        success: false,
        error: "分享功能未启用：需要服务端配置 Supabase service-role（见 AUTH-SETUP.md）。",
      },
      { status: 503 },
    );
  }

  try {
    const parsed = Body.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "请求体格式错误" }, { status: 400 });
    }
    const { kind, title, data } = parsed.data;

    // 体积保护：快照过大拒绝（约 1MB）
    if (JSON.stringify(data).length > 1_000_000) {
      return NextResponse.json({ success: false, error: "快照过大，无法分享" }, { status: 413 });
    }

    const expires = new Date(Date.now() + SHARE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // 生成唯一 token（极低概率冲突，重试几次）
    let token = "";
    for (let attempt = 0; attempt < 5; attempt++) {
      token = genShareToken();
      const { error } = await db.from("shares").insert({
        token,
        kind,
        title: String(title || "").slice(0, 200),
        snapshot: { kind, title, data },
        expires_at: expires,
      });
      if (!error) {
        return NextResponse.json({ success: true, token, expiresAt: expires });
      }
      // 23505 = unique_violation，换个 token 重试；其他错误直接抛
      if (error.code !== "23505") throw error;
    }
    throw new Error("生成分享链接失败，请重试");
  } catch (error) {
    console.error("[Share Create] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "创建分享失败" },
      { status: 500 },
    );
  }
}
