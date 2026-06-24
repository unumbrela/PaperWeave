import { resolveKeys } from "@/lib/ai/keys";
import { ZENMUX_URL, ZENMUX_HEADERS } from "@/lib/ai/zenmux";
import { z } from "zod";

/**
 * 文生图（GPT-image 2）—— 只走 ZenMux 网关的 `openai/gpt-image-2`。
 *
 * 与全站文本 LLM 不同，图片生成不做多供应商兜底：gpt-image-2 是 OpenAI 出品、
 * 仅通过 ZenMux 的 `/images/generations`（OpenAI 兼容）调用，返回 base64 PNG。
 * 因此**必须**有 ZenMux key（访客在页面/设置里自带），缺失则明确报错引导。
 */

export const runtime = "nodejs";
export const maxDuration = 300; // 出图较慢，给足时间

const Body = z.object({
  prompt: z.string().min(5, "提示词太短").max(8000),
  size: z.enum(["1024x1024", "1536x1024", "1024x1536", "auto"]).default("1536x1024"),
});

const IMAGE_MODEL = "openai/gpt-image-2";

export async function POST(req: Request) {
  const keys = resolveKeys(req);
  if (!keys.zenmux) {
    return new Response(
      "图片生成需要 ZenMux API Key —— GPT-image 2 仅通过 ZenMux 网关调用。请在页面或右上角「API Key」填入你的 ZenMux key 后重试。",
      { status: 400 },
    );
  }

  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "请求体格式错误", { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`${ZENMUX_URL.replace(/\/$/, "")}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${keys.zenmux}`,
        ...ZENMUX_HEADERS,
      },
      body: JSON.stringify({ model: IMAGE_MODEL, prompt: parsed.prompt, n: 1, size: parsed.size }),
    });
  } catch (e) {
    return new Response(`图片生成请求失败：${e instanceof Error ? e.message : "网络错误"}`, { status: 502 });
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return new Response(`图片生成失败（${res.status}）：${text.slice(0, 300)}`, { status: 502 });
  }

  const data = await res.json().catch(() => null);
  const item = data?.data?.[0];
  const b64: string | undefined = item?.b64_json;
  const url: string | undefined = item?.url;
  if (!b64 && !url) {
    return new Response("图片生成失败：网关未返回图片数据。", { status: 502 });
  }

  return Response.json({
    image: b64 ? `data:image/png;base64,${b64}` : url,
    size: parsed.size,
  });
}
