import * as cheerio from "cheerio";

export type ExtractResult = {
  title: string;
  text: string;
  url: string;
};

const MAX_TEXT = 16000;

export async function extractFromUrl(url: string): Promise<ExtractResult> {
  const u = new URL(url);
  const res = await fetch(u.toString(), {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; ToolboxBot/1.0; +https://example.com)",
      accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`抓取失败：${res.status} ${res.statusText}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const title =
    $("meta[property='og:title']").attr("content") ||
    $("title").first().text() ||
    u.hostname;

  $("script, style, noscript, nav, footer, header, form, iframe, svg").remove();

  const candidates = ["article", "main", "[role='main']", "#content", ".content", "body"];
  let rootSelector = "body";
  for (const sel of candidates) {
    const el = $(sel).first();
    if (el.length && el.text().trim().length > 200) {
      rootSelector = sel;
      break;
    }
  }

  const parts: string[] = [];
  $(rootSelector).find("h1, h2, h3, h4, p, li, blockquote").each((_, el) => {
    const t = $(el).text().replace(/\s+/g, " ").trim();
    if (t && t.length > 20) parts.push(t);
  });

  let text = parts.join("\n").trim();
  if (text.length > MAX_TEXT) text = text.slice(0, MAX_TEXT) + "…";
  if (!text) throw new Error("这个页面抽不到正文内容。");

  return { title: title.trim(), text, url: u.toString() };
}
