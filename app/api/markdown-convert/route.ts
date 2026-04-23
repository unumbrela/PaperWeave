import { convertDocx } from "@/lib/convert-docx";
import { convertPdf } from "@/lib/convert-pdf";
import { convertHtml } from "@/lib/convert-html";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_SIZE = 25 * 1024 * 1024;

type Kind = "docx" | "pdf" | "html" | "txt" | "md";

function detectKind(name: string, mime: string): Kind | null {
  const n = name.toLowerCase();
  if (n.endsWith(".docx") || mime.includes("wordprocessingml")) return "docx";
  if (n.endsWith(".pdf") || mime === "application/pdf") return "pdf";
  if (n.endsWith(".html") || n.endsWith(".htm") || mime.includes("html"))
    return "html";
  if (n.endsWith(".md") || n.endsWith(".markdown")) return "md";
  if (n.endsWith(".txt") || mime.startsWith("text/")) return "txt";
  return null;
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return new Response("无效的请求（需要 multipart/form-data）", { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return new Response("未上传文件", { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return new Response(`文件超出 ${MAX_SIZE / 1024 / 1024}MB 限制`, { status: 413 });
  }

  const kind = detectKind(file.name, file.type);
  if (!kind) {
    return new Response(`不支持的文件类型：${file.name}`, { status: 415 });
  }

  const buf = Buffer.from(await file.arrayBuffer());

  try {
    let md: string;
    if (kind === "docx") md = await convertDocx(buf);
    else if (kind === "pdf") md = await convertPdf(buf);
    else if (kind === "html") md = convertHtml(buf.toString("utf-8"));
    else md = buf.toString("utf-8").trim();

    if (!md) {
      return new Response("未能从文件中提取到有效内容", { status: 422 });
    }
    return new Response(md + "\n", {
      headers: { "content-type": "text/markdown; charset=utf-8" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "转换失败";
    return new Response(`转换失败：${msg}`, { status: 422 });
  }
}
