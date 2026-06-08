import { NextResponse } from "next/server";
import { getMetrics } from "@/lib/api/log";

export const runtime = "nodejs";

/**
 * 聚合指标快照（调用量 / 错误率 / 平均耗时 / 维度计数）。
 * 仅聚合数字、无 PII。可选用 METRICS_TOKEN 环境变量加一道 ?token= 门禁。
 */
export async function GET(request: Request) {
  const required = process.env.METRICS_TOKEN;
  if (required) {
    const token = new URL(request.url).searchParams.get("token");
    if (token !== required) {
      return NextResponse.json({ success: false, error: "未授权" }, { status: 401 });
    }
  }
  return NextResponse.json({ success: true, data: getMetrics() });
}
