import { NextResponse } from "next/server";
import { isServiceSupabaseConfigured } from "@/lib/supabase/server";

/** 分享功能是否可用（服务端是否配了 service-role）；前端据此决定是否显示分享入口。 */
export async function GET() {
  return NextResponse.json({ success: true, enabled: isServiceSupabaseConfigured() });
}
