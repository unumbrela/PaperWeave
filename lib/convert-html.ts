import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { MathMLToLaTeX } from "mathml-to-latex";

const MATH_RE = /<math\b[\s\S]*?<\/math>/gi;

export function convertHtml(html: string): string {
  const inlineMap = new Map<number, string>();
  const blockMap = new Map<number, string>();
  let inlineCount = 0;
  let blockCount = 0;

  const withMarkers = html.replace(MATH_RE, (match) => {
    const isBlock = /\bdisplay\s*=\s*["']?block["']?/i.test(match);
    let latex = "";
    try {
      latex = MathMLToLaTeX.convert(match);
    } catch {
      return "";
    }
    if (!latex) return "";
    if (isBlock) {
      const n = blockCount++;
      blockMap.set(n, latex);
      return `<p>XMATHBLOCKX${n}X</p>`;
    }
    const n = inlineCount++;
    inlineMap.set(n, latex);
    return `<span>XMATHINLINEX${n}X</span>`;
  });

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

  let md = td.turndown(withMarkers);
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
