/**
 * 引文导出 —— 从论文库条目生成 BibTeX 与常见引文格式（APA / MLA / GB-T 7714）。
 *
 * 全部纯函数、无 AI、无网络，便于单测。字段来自 `Paper`（title / authors /
 * publishedAt / arxivId / sourceUrl / tags(含会议名) / citations）。
 */

import type { Paper, Author } from "@/lib/db/types";

export type CiteStyle = "apa" | "mla" | "gbt7714";

export const CITE_STYLE_LABELS: Record<CiteStyle, string> = {
  apa: "APA",
  mla: "MLA",
  gbt7714: "GB/T 7714",
};

function authorList(paper: Paper): Author[] {
  return Array.isArray(paper.authors) ? paper.authors : [];
}

function year(paper: Paper): string {
  if (paper.publishedAt) {
    const y = new Date(paper.publishedAt).getFullYear();
    if (!Number.isNaN(y)) return String(y);
    const m = paper.publishedAt.match(/\d{4}/);
    if (m) return m[0];
  }
  return "n.d.";
}

/** 取「会议/期刊」线索：tags 里第一个非来源标记的词（来源标记为 arxiv/openalex/...）。 */
function venue(paper: Paper): string | undefined {
  const SOURCE_TAGS = new Set(["arxiv", "openalex", "semantic-scholar"]);
  return (paper.tags || []).find((t) => t && !SOURCE_TAGS.has(t.toLowerCase()));
}

function lastName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : name.trim();
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return "";
  return parts
    .slice(0, -1)
    .map((p) => p[0]?.toUpperCase() + ".")
    .join(" ");
}

/** 稳定的 BibTeX cite key：首作者姓 + 年份 + 标题首词（去非字母数字）。 */
export function bibKey(paper: Paper): string {
  const authors = authorList(paper);
  const first = authors[0]?.name ? lastName(authors[0].name) : "anon";
  const titleWord = (paper.title || "paper")
    .split(/\s+/)
    .find((w) => w.replace(/[^a-zA-Z0-9]/g, "").length > 0);
  const clean = (s: string) => s.replace(/[^a-zA-Z0-9]/g, "");
  const y = year(paper).replace(/[^0-9]/g, "") || "nd";
  return `${clean(first) || "anon"}${y}${clean(titleWord || "")}`.toLowerCase();
}

/** 转义 BibTeX 字段里的特殊字符。 */
function bibEscape(s: string): string {
  return s.replace(/([{}])/g, "\\$1").replace(/&/g, "\\&").replace(/%/g, "\\%").replace(/#/g, "\\#");
}

/** 单篇 → BibTeX 条目。arXiv 论文用 @misc + eprint，其余用 @article。 */
export function toBibTeX(paper: Paper): string {
  const authors = authorList(paper);
  const authorField = authors.length
    ? authors.map((a) => a.name).join(" and ")
    : "Unknown";
  const y = year(paper);
  const key = bibKey(paper);
  const v = venue(paper);

  const fields: Array<[string, string | undefined]> = [
    ["title", `{${bibEscape(paper.title || "Untitled")}}`],
    ["author", `{${bibEscape(authorField)}}`],
    ["year", y !== "n.d." ? `{${y}}` : undefined],
  ];

  let type: string;
  if (paper.arxivId) {
    type = "misc";
    fields.push(["eprint", `{${paper.arxivId}}`]);
    fields.push(["archivePrefix", "{arXiv}"]);
    if (v) fields.push(["howpublished", `{${bibEscape(v)}}`]);
  } else {
    type = "article";
    if (v) fields.push(["journal", `{${bibEscape(v)}}`]);
  }
  if (paper.sourceUrl) fields.push(["url", `{${paper.sourceUrl}}`]);

  const body = fields
    .filter(([, val]) => val != null)
    .map(([k, val]) => `  ${k} = ${val}`)
    .join(",\n");

  return `@${type}{${key},\n${body}\n}`;
}

/** 多篇 → 拼接的 .bib 文本。 */
export function toBibTeXMany(papers: Paper[]): string {
  return papers.map(toBibTeX).join("\n\n") + "\n";
}

/** 作者署名串（按风格）。 */
function formatAuthors(authors: Author[], style: CiteStyle): string {
  if (authors.length === 0) return "Anon.";
  const names = authors.map((a) => a.name);

  if (style === "apa") {
    const formatted = names.map((n) => {
      const ln = lastName(n);
      const ini = initials(n);
      return ini ? `${ln}, ${ini}` : ln;
    });
    if (formatted.length === 1) return formatted[0];
    if (formatted.length <= 20) {
      return formatted.slice(0, -1).join(", ") + ", & " + formatted[formatted.length - 1];
    }
    return formatted.slice(0, 19).join(", ") + ", … " + formatted[formatted.length - 1];
  }

  if (style === "mla") {
    const first = names[0];
    const firstFmt = `${lastName(first)}, ${first.replace(lastName(first), "").trim()}`.trim().replace(/,$/, "");
    if (names.length === 1) return firstFmt;
    if (names.length === 2) return `${firstFmt}, and ${names[1]}`;
    return `${firstFmt}, et al`;
  }

  // GB/T 7714：姓在前，最多列 3 位，余者 "等"
  const gbt = names.map((n) => {
    const ln = lastName(n);
    const ini = initials(n).replace(/\s+/g, "");
    return ini ? `${ln} ${ini}` : ln;
  });
  if (gbt.length <= 3) return gbt.join(", ");
  return gbt.slice(0, 3).join(", ") + ", 等";
}

/** 单篇 → 指定风格的引文字符串。 */
export function formatCitation(paper: Paper, style: CiteStyle): string {
  const authors = authorList(paper);
  const y = year(paper);
  const title = paper.title || "Untitled";
  const v = venue(paper);
  const src = paper.arxivId ? `arXiv:${paper.arxivId}` : v;

  if (style === "apa") {
    // Author, A. (Year). Title. Source.
    let s = `${formatAuthors(authors, "apa")} (${y}). ${title}.`;
    if (src) s += ` ${src}.`;
    return s;
  }

  if (style === "mla") {
    // Author. "Title." Source, Year.
    let s = `${formatAuthors(authors, "mla")}. "${title}."`;
    if (src) s += ` ${src},`;
    s += ` ${y === "n.d." ? "n.d." : y}.`;
    return s;
  }

  // GB/T 7714: 作者. 标题[文献类型]. 来源, 年份.
  const typeTag = paper.arxivId ? "[EB/OL]" : "[J]";
  let s = `${formatAuthors(authors, "gbt7714")}. ${title}${typeTag}.`;
  if (src) s += ` ${src},`;
  s += ` ${y === "n.d." ? "" : y}.`;
  return s.replace(/,\s*\.$/, ".");
}
