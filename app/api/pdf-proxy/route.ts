import { NextResponse } from 'next/server';
import { lookup } from 'node:dns/promises';

// PDF 代理 —— serverless 友好地把远端 PDF（arXiv / 开放获取）以同源、带 CORS 的方式
// 透传给前端。替代「下载到 public/papers 再静态服务」的旧做法（Vercel 文件系统只读，
// 那条路会运行时报错）。前端 viewer 读到后再缓存为本地 Blob，实现真离线。
//
// 安全：仅允许 http(s)；并在 fetch 前把目标域名 DNS 解析成 IP，逐个比对内网/环回/
// 链路本地/元数据网段——既挡裸 IP，也挡「域名解析到内网」的 DNS rebinding / 云元数据
// （169.254.169.254）SSRF。

export const runtime = 'nodejs';
export const maxDuration = 60;

// 响应体大小上限：防止被当作白嫖带宽的开放代理（arXiv PDF 一般 <30MB）。
const MAX_BYTES = 50 * 1024 * 1024;

/** content-type 是否像 PDF（或可接受的二进制流）。明确是 html/json/text 的一律拒绝。 */
function looksLikePdf(contentType: string | null): boolean {
  if (!contentType) return true; // 上游没给类型：放行，交给前端 pdf.js 自行判断
  const ct = contentType.toLowerCase();
  return ct.includes('application/pdf') || ct.includes('application/octet-stream');
}

/** 判断单个 IP（v4 或 v6）是否落在禁止访问的网段。 */
function isBlockedIp(ip: string): boolean {
  const addr = ip.toLowerCase();

  // ── IPv6 ──
  if (addr.includes(':')) {
    if (addr === '::1' || addr === '::') return true; // 环回 / 未指定
    if (addr.startsWith('fe80')) return true; // 链路本地
    if (addr.startsWith('fc') || addr.startsWith('fd')) return true; // 唯一本地 ULA (fc00::/7)
    // IPv4-mapped IPv6（::ffff:a.b.c.d）—— 取末段按 IPv4 再判一次
    const v4 = addr.split(':').pop();
    if (v4 && v4.includes('.')) return isBlockedIp(v4);
    return false;
  }

  // ── IPv4 ──
  if (/^127\./.test(addr) || /^10\./.test(addr) || /^192\.168\./.test(addr)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(addr)) return true;
  if (/^169\.254\./.test(addr) || addr === '0.0.0.0') return true; // 链路本地 / 云元数据 / 未指定
  if (/^100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\./.test(addr)) return true; // CGNAT 100.64.0.0/10
  return false;
}

/** 纯字符串层面的快速拦截（裸 IP / localhost），DNS 解析前先挡一道。 */
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, ''); // 去掉 IPv6 字面量的方括号
  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  return isBlockedIp(h);
}

/** DNS 解析后逐个 IP 校验（挡 DNS rebinding / 域名指向内网）。 */
async function resolvesToBlockedIp(hostname: string): Promise<boolean> {
  try {
    const records = await lookup(hostname, { all: true });
    return records.some((r) => isBlockedIp(r.address));
  } catch {
    // 解析失败：宁可放行给后续 fetch 自然报错，也不误伤正常域名
    return false;
  }
}

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get('url');
  if (!raw) {
    return NextResponse.json({ error: '缺少 url 参数' }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: 'url 非法' }, { status: 400 });
  }

  if (target.protocol !== 'https:' && target.protocol !== 'http:') {
    return NextResponse.json({ error: '仅支持 http(s)' }, { status: 400 });
  }
  if (isBlockedHost(target.hostname) || (await resolvesToBlockedIp(target.hostname))) {
    return NextResponse.json({ error: '目标地址不被允许' }, { status: 403 });
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; PaperWeave/1.0; +https://github.com/unumbrela/toolbox)',
        Accept: 'application/pdf,*/*',
      },
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: `上游返回 ${upstream.status}` },
        { status: 502 },
      );
    }

    // 只放行 PDF：挡住「借本代理分发任意网页/内容」的滥用
    const contentType = upstream.headers.get('content-type');
    if (!looksLikePdf(contentType)) {
      return NextResponse.json(
        { error: `上游内容类型不是 PDF（${contentType}）` },
        { status: 415 },
      );
    }

    // 大小上限：先看 Content-Length 快速拒绝；再在流式透传时逐块累计兜底（防上游不报或谎报）
    const declaredLen = Number(upstream.headers.get('content-length'));
    if (declaredLen && declaredLen > MAX_BYTES) {
      return NextResponse.json(
        { error: `PDF 过大（${(declaredLen / 1048576).toFixed(0)}MB，上限 50MB）` },
        { status: 413 },
      );
    }

    let transferred = 0;
    const cap = new TransformStream({
      transform(chunk, controller) {
        transferred += chunk.byteLength;
        if (transferred > MAX_BYTES) {
          controller.error(new Error('PDF 超过 50MB 上限'));
          return;
        }
        controller.enqueue(chunk);
      },
    });

    return new Response(upstream.body.pipeThrough(cap), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        // 缓存一天，减少重复拉取（同一 PDF 多次打开）
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        // 同源使用，不再对外开放 CORS（去掉原 Access-Control-Allow-Origin: *）
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: `代理失败: ${e instanceof Error ? e.message : '未知错误'}` },
      { status: 502 },
    );
  }
}
