import mammoth from "mammoth";
import JSZip from "jszip";
import { load } from "cheerio";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { ommlToLatex } from "./omml-to-latex";

const INLINE_RE = /<m:oMath\b(?![^>]*\/>)[\s\S]*?<\/m:oMath>/g;
const BLOCK_RE = /<m:oMathPara\b[\s\S]*?<\/m:oMathPara>/g;
const INLINE_MARKER = (n: number) => `XMATHINLINEX${n}X`;
const BLOCK_MARKER = (n: number) => `XMATHBLOCKX${n}X`;

function insideParagraph(s: string, offset: number): boolean {
  const before = s.substring(0, offset);
  const opens = (before.match(/<w:p(?:\s[^>]*)?>/g) || []).length;
  const closes = (before.match(/<\/w:p>/g) || []).length;
  return opens > closes;
}

function normalizeTables(html: string): string {
  if (!/<table/i.test(html)) return html;
  const $ = load(html, null, false);
  $("table").each((_, table) => {
    const $t = $(table);

    // Flatten block-level content in cells: <p>, <div>, <br> → inline (space-separated).
    $t.find("td, th").each((_, cell) => {
      const $cell = $(cell);
      $cell.find("br").replaceWith(" ");
      $cell.find("p, div").each((_, block) => {
        const $b = $(block);
        $b.replaceWith(($b.html() ?? "") + " ");
      });
      const html = ($cell.html() ?? "").replace(/\s+/g, " ").trim();
      $cell.html(html);
    });

    // Promote first row to <thead> with <th> cells if not already present.
    if ($t.find("thead").length === 0) {
      const firstRow = $t.find("tr").first();
      if (firstRow.length > 0) {
        firstRow.find("td").each((_, td) => {
          const $td = $(td);
          const attrs = (td as { attribs?: Record<string, string> }).attribs ?? {};
          const attrStr = Object.entries(attrs)
            .map(([k, v]) => `${k}="${v}"`)
            .join(" ");
          $td.replaceWith(
            `<th${attrStr ? " " + attrStr : ""}>${$td.html() ?? ""}</th>`,
          );
        });
        firstRow.wrap("<thead></thead>");
      }
    }
  });
  return $.html();
}

function makeTurndown() {
  const td = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "*",
    strongDelimiter: "**",
    hr: "---",
    linkStyle: "inlined",
  });
  td.use(gfm);
  return td;
}

export async function convertDocx(buffer: Buffer): Promise<string> {
  let processed = buffer;
  const inlineMap = new Map<number, string>();
  const blockMap = new Map<number, string>();

  try {
    const zip = await JSZip.loadAsync(buffer);
    const docFile = zip.file("word/document.xml");
    if (docFile) {
      let xml = await docFile.async("string");

      // Word wraps each equation in <mc:AlternateContent>: <mc:Choice> holds
      // the OMML, <mc:Fallback> holds a degraded plain-text/image version.
      // Keeping both causes every equation to render twice (once from our
      // OMML→LaTeX pass, once from the text fallback).
      xml = xml.replace(/<mc:Fallback\b[\s\S]*?<\/mc:Fallback>/g, "");
      xml = xml.replace(/<mc:Choice\b[^>]*>([\s\S]*?)<\/mc:Choice>/g, "$1");
      xml = xml.replace(/<\/?mc:AlternateContent\b[^>]*>/g, "");

      let blockCount = 0;
      let inlineCount = 0;

      xml = xml.replace(BLOCK_RE, (match, offset: number) => {
        try {
          const latex = ommlToLatex(match);
          if (!latex) return "";
          const n = blockCount++;
          blockMap.set(n, latex);
          const marker = BLOCK_MARKER(n);
          // If <m:oMathPara> is nested inside a <w:p>, don't wrap again —
          // injecting another <w:p> would produce invalid nested paragraphs.
          return insideParagraph(xml, offset)
            ? `<w:r><w:t xml:space="preserve">${marker}</w:t></w:r>`
            : `<w:p><w:r><w:t xml:space="preserve">${marker}</w:t></w:r></w:p>`;
        } catch {
          return "";
        }
      });

      xml = xml.replace(INLINE_RE, (match, offset: number) => {
        try {
          const latex = ommlToLatex(match);
          if (!latex) return "";
          // Top-level <m:oMath> (not inside a <w:p>) behaves like a block equation.
          if (!insideParagraph(xml, offset)) {
            const n = blockCount++;
            blockMap.set(n, latex);
            return `<w:p><w:r><w:t xml:space="preserve">${BLOCK_MARKER(n)}</w:t></w:r></w:p>`;
          }
          const n = inlineCount++;
          inlineMap.set(n, latex);
          return `<w:r><w:t xml:space="preserve">${INLINE_MARKER(n)}</w:t></w:r>`;
        } catch {
          return "";
        }
      });

      if (blockCount > 0 || inlineCount > 0) {
        zip.file("word/document.xml", xml);
        processed = await zip.generateAsync({ type: "nodebuffer" });
      }
    }
  } catch {
    // fall through — if zip manipulation fails, let mammoth try the original buffer
  }

  const { value: html } = await mammoth.convertToHtml({ buffer: processed });
  const normalized = normalizeTables(html);
  const td = makeTurndown();
  let md = td.turndown(normalized);

  // Swap markers back. Block first so "XMATHBLOCKX0X" doesn't collide with inline.
  md = md.replace(/XMATHBLOCKX(\d+)X/g, (_, n) => {
    const latex = blockMap.get(Number(n)) ?? "";
    return `\n\n$$\n${latex}\n$$\n\n`;
  });
  md = md.replace(/XMATHINLINEX(\d+)X/g, (_, n) => {
    const latex = inlineMap.get(Number(n)) ?? "";
    return `$${latex}$`;
  });

  return md.replace(/\n{3,}/g, "\n\n").trim();
}
