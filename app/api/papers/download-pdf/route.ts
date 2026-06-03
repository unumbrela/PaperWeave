import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const getPapersDir = () => {
  const dir = path.join(process.cwd(), 'public', 'papers');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

const getUploadsDir = () => {
  const dir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

const getLocalPdfPath = (paperId: string): string => {
  return `/papers/${paperId}.pdf`;
};

function isPdfBuffer(buffer: Buffer) {
  try {
    return buffer.slice(0, 4).toString() === '%PDF';
  } catch {
    return false;
  }
}

async function downloadAndSavePdf(url: string, destPath: string) {
  const maxAttempts = 2;
  const urlObj = new URL(url);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/pdf,application/octet-stream;q=0.9,*/*;q=0.8',
          'Referer': urlObj.origin,
        },
        redirect: 'follow',
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const contentType = response.headers.get('content-type') || '';

      // Accept if content-type indicates PDF OR buffer has PDF magic header and reasonable size
      const looksLikePdf = (contentType.includes('pdf') || isPdfBuffer(buffer)) && buffer.length > 1024;

      if (!looksLikePdf) {
        console.warn(`Attempt ${attempt}: downloaded content not recognised as PDF (content-type=${contentType}, size=${buffer.length})`);
        if (attempt === maxAttempts) {
          throw new Error('Downloaded content is not a valid PDF');
        }
        // retry
        continue;
      }

      // write file
      fs.writeFileSync(destPath, buffer);
      console.log(`✅ PDF 下载并保存成功: ${destPath} (attempt ${attempt})`);
      return true;
    } catch (err) {
      console.warn(`下载尝试 ${attempt} 失败: ${err instanceof Error ? err.message : 'unknown'}`);
      if (attempt === maxAttempts) {
        throw err;
      }
      // small backoff before retry
      await new Promise((r) => setTimeout(r, 800));
    }
  }

  return false;
}

// 从网页 HTML 中尝试解析出第一个 PDF 链接（返回完整 URL 或 null）
async function findPdfFromPage(pageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(pageUrl, { method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    const text = await res.text();

    // 更全面的正则：查找 href="...pdf"、src="...pdf"、data-file、data-href 以及 content="...pdf"
    const hrefRegex = /(?:href|src|data-file|data-href)=["']([^"'>]+\.pdf)["']/gi;
    let match;
    const candidates: string[] = [];
    while ((match = hrefRegex.exec(text)) !== null) {
      if (match[1]) candidates.push(match[1]);
    }

    if (candidates.length === 0) {
      // 尝试查找 data-file 或 meta 属性包含 .pdf
      const metaRegex = /content=["']([^"'>]+\.pdf)["']/gi;
      while ((match = metaRegex.exec(text)) !== null) {
        if (match[1]) candidates.push(match[1]);
      }
    }

    if (candidates.length === 0) return null;

    // 解析相对路径为绝对 URL
    const base = new URL(pageUrl);
    for (const c of candidates) {
      try {
        const candidateUrl = new URL(c, base).toString();
        // quick HEAD check to ensure it's reachable and looks like PDF
        try {
          const h = await fetch(candidateUrl, { method: 'HEAD' });
          if (h.ok) {
            const ct = h.headers.get('content-type') || '';
            if (ct.includes('pdf')) return candidateUrl;
            // if HEAD not providing content-type, accept and return
            return candidateUrl;
          }
        } catch {
          // ignore and try next
        }
      } catch {
        // ignore invalid URL
      }
    }

    return null;
  } catch (err) {
    console.warn('findPdfFromPage 错误:', err instanceof Error ? err.message : err);
    return null;
  }
}

// 生成一些基于失败 url 的备选 URL 模式，尝试常见镜像/下载参数
function generateAlternateUrls(original: string): string[] {
  try {
    const u = new URL(original);
    const candidates: string[] = [];

    // 原始
    candidates.push(u.toString());

    // 添加常见下载参数
    if (!u.searchParams.has('download')) {
      const dup = new URL(u.toString());
      dup.searchParams.set('download', '1');
      candidates.push(dup.toString());
    }

    // 末尾添加 /download
    if (!u.pathname.endsWith('/download')) {
      const dup2 = new URL(u.toString());
      dup2.pathname = dup2.pathname.endsWith('/') ? dup2.pathname + 'download' : dup2.pathname + '/download';
      candidates.push(dup2.toString());
    }

    // 替换 bitstream -> handle（一些仓库使用 handle 路径）
    if (u.hostname.includes('lirias.kuleuven.be') && u.pathname.includes('/bitstream/')) {
      const rep = new URL(u.toString());
      rep.pathname = rep.pathname.replace('/bitstream/', '/handle/');
      candidates.push(rep.toString());
    }

    // 如果路径包含 /pdf/，尝试直接在域名下 /pdf/ + 文件名
    const parts = u.pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1] || '';
    if (last && last.indexOf('.pdf') === -1) {
      const direct = new URL(u.toString());
      direct.pathname = '/' + last + '.pdf';
      candidates.push(direct.toString());
    }

    // 尝试常见替代域（镜像模式）：简单策略，不强制使用外部黑名单
    // 例如：将 lirias.kuleuven.be 替换为 repository.kuleuven.be（猜测）
    if (u.hostname.includes('lirias.kuleuven.be')) {
      const alt = new URL(u.toString());
      alt.hostname = 'repository.kuleuven.be';
      candidates.push(alt.toString());
    }

    // 去掉 query 参数直接访问
    if (u.search) {
      const noq = new URL(u.toString());
      noq.search = '';
      candidates.push(noq.toString());
    }

    // 返回唯一值
    return Array.from(new Set(candidates));
  } catch (e) {
    return [original];
  }
}

// 快速 HEAD 或前 N 字节 GET 检查 URL 是否像 PDF
async function headLooksLikePdf(candidateUrl: string): Promise<boolean> {
  try {
    const head = await fetch(candidateUrl, { method: 'HEAD' });
    if (head.ok) {
      const ct = head.headers.get('content-type') || '';
      if (ct.includes('pdf')) return true;
    }
  } catch {
    // ignore
  }

  // 有些服务器 不支持 HEAD 返回 content-type; 尝试 GET 前 2KB
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(candidateUrl, { method: 'GET', headers: { 'Range': 'bytes=0-2048' }, signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const ab = await res.arrayBuffer();
      const buf = Buffer.from(ab);
      return isPdfBuffer(buf);
    }
  } catch {
    // ignore
  }

  return false;
}
export async function POST(request: Request) {
  try {
    const { paperId, pdfUrl, arxivId, force, sourceUrl } = await request.json();

    if (!paperId) {
      return NextResponse.json({
        success: false,
        message: '缺少必要参数 paperId'
      }, { status: 400 });
    }

    const papersDir = getPapersDir();
    const pdfFilePath = path.join(papersDir, `${paperId}.pdf`);

    if (fs.existsSync(pdfFilePath) && !force) {
      return NextResponse.json({
        success: true,
        message: 'PDF已存在',
        pdfPath: getLocalPdfPath(paperId),
        alreadyDownloaded: true
      });
    }

    if (fs.existsSync(pdfFilePath) && force) {
      console.log(`⚠️ force=true，覆盖已存在文件: ${pdfFilePath}`);
      try {
        fs.unlinkSync(pdfFilePath);
      } catch (e) {
        console.warn('删除旧文件失败，后续操作将尝试覆盖：', e instanceof Error ? e.message : e);
      }
    }

    console.log(`📥 开始处理论文PDF: ${paperId}`);

    if (pdfUrl) {
      if (pdfUrl.startsWith('/uploads/')) {
        console.log(`🔗 本地上传的PDF: ${pdfUrl}`);
        
        const uploadsDir = getUploadsDir();
        const sourcePath = path.join(process.cwd(), 'public', pdfUrl);
        
        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, pdfFilePath);
          console.log(`✅ 本地PDF复制完成: ${paperId}`);
          
          return NextResponse.json({
            success: true,
            message: 'PDF已准备好',
            pdfPath: getLocalPdfPath(paperId),
            alreadyDownloaded: true
          });
        } else {
          console.warn(`⚠️ 本地PDF文件不存在: ${sourcePath}`);
        }
      } else if (pdfUrl.startsWith('http')) {
        try {
          console.log(`🔗 远程下载链接: ${pdfUrl}`);
          await downloadAndSavePdf(pdfUrl, pdfFilePath);
          return NextResponse.json({
            success: true,
            message: 'PDF下载成功',
            pdfPath: getLocalPdfPath(paperId)
          });
        } catch (downloadError) {
          console.warn(`⚠️ 远程PDF下载失败: ${downloadError instanceof Error ? downloadError.message : 'unknown'}`);

          // 尝试从 sourceUrl 自动解析 PDF 链接（如果提供）
          if (sourceUrl) {
            try {
              console.log(`🔎 尝试从 sourceUrl 自动发现 PDF: ${sourceUrl}`);
              const candidate = await findPdfFromPage(sourceUrl);
              if (candidate) {
                console.log(`🔗 发现候选 PDF: ${candidate}`);
                await downloadAndSavePdf(candidate, pdfFilePath);
                return NextResponse.json({
                  success: true,
                  message: '从 sourceUrl 自动发现并下载 PDF 成功',
                  pdfPath: getLocalPdfPath(paperId),
                  discoveredFrom: sourceUrl
                });
              } else {
                console.warn('未能在 sourceUrl 页面中发现 PDF 链接');
              }
            } catch (e) {
              console.warn('从 sourceUrl 下载尝试失败:', e instanceof Error ? e.message : String(e));
            }
          }

          // 如果提供了原始 pdfUrl，尝试生成并尝试一些备用 URL 模式
          try {
            const alternates = generateAlternateUrls(pdfUrl);
            for (const alt of alternates) {
              if (alt === pdfUrl) continue; // 已尝试过
              try {
                console.log(`🔁 尝试备用 URL: ${alt}`);
                // 快速检查是否像 PDF（减少不必要下载）
                const looks = await headLooksLikePdf(alt);
                if (!looks) {
                  console.log(`跳过（看起来不像 PDF）: ${alt}`);
                  continue;
                }
                await downloadAndSavePdf(alt, pdfFilePath);
                return NextResponse.json({
                  success: true,
                  message: '从备用 URL 下载并保存 PDF 成功',
                  pdfPath: getLocalPdfPath(paperId),
                  downloadedFrom: alt
                });
              } catch (e) {
                console.warn(`备用 URL 下载失败: ${alt} -> ${e instanceof Error ? e.message : String(e)}`);
                continue;
              }
            }
          } catch (e) {
            // ignore
          }

          return NextResponse.json({
            success: false,
            message: '远程 PDF 下载失败：' + (downloadError instanceof Error ? downloadError.message : String(downloadError))
          }, { status: 502 });
        }
      }
    }

    if (arxivId && !pdfUrl) {
      const arxivUrl = `https://arxiv.org/pdf/${arxivId}.pdf`;
      try {
        console.log(`🔗 arXiv下载链接: ${arxivUrl}`);
        await downloadAndSavePdf(arxivUrl, pdfFilePath);
        return NextResponse.json({
          success: true,
          message: 'PDF下载成功',
          pdfPath: getLocalPdfPath(paperId)
        });
      } catch (downloadError) {
        console.warn(`⚠️ arXiv PDF下载失败: ${downloadError instanceof Error ? downloadError.message : 'unknown'}`);
        return NextResponse.json({
          success: false,
          message: 'arXiv PDF 下载失败：' + (downloadError instanceof Error ? downloadError.message : String(downloadError))
        }, { status: 502 });
      }
    }

    console.warn(`⚠️ 无法获取有效 PDF: ${paperId}`);
    return NextResponse.json({
      success: false,
      message: '无法获取有效的 PDF，请稍后重试或检查 PDF 链接或 arXiv ID',
    }, { status: 502 });

  } catch (error) {
    console.error('PDF下载失败:', error);
    return NextResponse.json({
      success: false,
      message: 'PDF下载失败'
    }, { status: 500 });
  }
}