import { NextResponse } from 'next/server';

// PDF 代理 —— serverless 友好地把远端 PDF（arXiv / 开放获取）以同源、带 CORS 的方式
// 透传给前端。替代「下载到 public/papers 再静态服务」的旧做法（Vercel 文件系统只读，
// 那条路会运行时报错）。前端 viewer 读到后再缓存为本地 Blob，实现真离线。
//
// 安全：仅允许 http(s)，并拦截内网/环回地址，避免 SSRF。

export const runtime = 'nodejs';
export const maxDuration = 60;

function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost') || h === '::1') return true;
  // IPv4 内网/环回/链路本地
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true;
  if (/^169\.254\./.test(h) || h === '0.0.0.0') return true;
  return false;
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
  if (isBlockedHost(target.hostname)) {
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

    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'application/pdf',
        // 缓存一天，减少重复拉取（同一 PDF 多次打开）
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: `代理失败: ${e instanceof Error ? e.message : '未知错误'}` },
      { status: 502 },
    );
  }
}
