import { load } from "cheerio";
import type { AnyNode, Element as CElement, Text as CText } from "domhandler";

const SYMBOL_MAP: Record<string, string> = {
  // LaTeX-reserved literals (Word often emits `#` as equation-number separator)
  "#": "\\#",
  "%": "\\%",
  "&": "\\&",
  "$": "\\$",
  // Greek lowercase
  "α": "\\alpha ", "β": "\\beta ", "γ": "\\gamma ", "δ": "\\delta ",
  "ε": "\\varepsilon ", "ζ": "\\zeta ", "η": "\\eta ", "θ": "\\theta ",
  "ι": "\\iota ", "κ": "\\kappa ", "λ": "\\lambda ", "μ": "\\mu ",
  "ν": "\\nu ", "ξ": "\\xi ", "π": "\\pi ", "ρ": "\\rho ",
  "σ": "\\sigma ", "τ": "\\tau ", "υ": "\\upsilon ", "φ": "\\varphi ",
  "χ": "\\chi ", "ψ": "\\psi ", "ω": "\\omega ",
  "Γ": "\\Gamma ", "Δ": "\\Delta ", "Θ": "\\Theta ", "Λ": "\\Lambda ",
  "Ξ": "\\Xi ", "Π": "\\Pi ", "Σ": "\\Sigma ", "Υ": "\\Upsilon ",
  "Φ": "\\Phi ", "Ψ": "\\Psi ", "Ω": "\\Omega ",
  // Operators
  "∑": "\\sum ", "∏": "\\prod ", "∫": "\\int ", "∬": "\\iint ",
  "∭": "\\iiint ", "∮": "\\oint ", "∂": "\\partial ", "∇": "\\nabla ",
  "∞": "\\infty ", "∅": "\\emptyset ", "ℵ": "\\aleph ",
  "±": "\\pm ", "∓": "\\mp ", "×": "\\times ", "÷": "\\div ",
  "·": "\\cdot ", "∘": "\\circ ", "⋅": "\\cdot ",
  // Relations
  "≤": "\\le ", "≥": "\\ge ", "≠": "\\ne ", "≈": "\\approx ",
  "≡": "\\equiv ", "∼": "\\sim ", "≅": "\\cong ", "∝": "\\propto ",
  // Arrows
  "→": "\\to ", "←": "\\leftarrow ", "↔": "\\leftrightarrow ",
  "⇒": "\\Rightarrow ", "⇐": "\\Leftarrow ", "⇔": "\\Leftrightarrow ",
  // Sets / logic
  "∈": "\\in ", "∉": "\\notin ", "∋": "\\ni ",
  "⊂": "\\subset ", "⊃": "\\supset ", "⊆": "\\subseteq ", "⊇": "\\supseteq ",
  "∪": "\\cup ", "∩": "\\cap ", "∖": "\\setminus ",
  "∧": "\\wedge ", "∨": "\\vee ", "¬": "\\neg ",
  "∀": "\\forall ", "∃": "\\exists ",
  "ℝ": "\\mathbb{R}", "ℕ": "\\mathbb{N}", "ℤ": "\\mathbb{Z}",
  "ℚ": "\\mathbb{Q}", "ℂ": "\\mathbb{C}",
};

function mapText(s: string): string {
  let out = "";
  for (const ch of s) out += SYMBOL_MAP[ch] ?? ch;
  return out;
}

function childrenOf(n: AnyNode): AnyNode[] {
  return "children" in n ? ((n as CElement).children as AnyNode[]) : [];
}

function tagOf(n: AnyNode): string {
  return n.type === "tag" ? (n as CElement).name.toLowerCase() : "";
}

function findChild(n: AnyNode, tagName: string): AnyNode | null {
  const t = tagName.toLowerCase();
  for (const c of childrenOf(n)) if (tagOf(c) === t) return c;
  return null;
}

function attrVal(n: AnyNode, attrName: string): string | undefined {
  if (n.type !== "tag") return undefined;
  const attribs = (n as CElement).attribs as Record<string, string> | undefined;
  if (!attribs) return undefined;
  const lower = attrName.toLowerCase();
  for (const k of Object.keys(attribs)) {
    if (k.toLowerCase() === lower) return attribs[k];
  }
  return undefined;
}

function convertNode(n: AnyNode): string {
  if (n.type === "text") return mapText((n as CText).data);
  if (n.type !== "tag") return "";
  const tag = tagOf(n);
  const kids = childrenOf(n);

  const recurse = () => kids.map(convertNode).join("");
  const recurseChild = (name: string): string => {
    const c = findChild(n, name);
    return c ? convertNode(c) : "";
  };

  switch (tag) {
    case "m:omathpara":
    case "m:omath":
    case "m:e":
    case "m:num":
    case "m:den":
    case "m:sup":
    case "m:sub":
    case "m:deg":
    case "m:fname":
    case "m:lim":
      return recurse();

    case "m:r":
      return kids
        .filter((c) => tagOf(c) === "m:t")
        .map((c) => mapText(childrenOf(c).map((t) => (t.type === "text" ? (t as CText).data : "")).join("")))
        .join("");
    case "m:t":
      return mapText(childrenOf(n).map((t) => (t.type === "text" ? (t as CText).data : "")).join(""));

    case "m:f":
      return `\\frac{${recurseChild("m:num")}}{${recurseChild("m:den")}}`;

    case "m:ssup":
      return `{${recurseChild("m:e")}}^{${recurseChild("m:sup")}}`;
    case "m:ssub":
      return `{${recurseChild("m:e")}}_{${recurseChild("m:sub")}}`;
    case "m:ssubsup":
      return `{${recurseChild("m:e")}}_{${recurseChild("m:sub")}}^{${recurseChild("m:sup")}}`;
    case "m:spre":
      return `{}_{${recurseChild("m:sub")}}^{${recurseChild("m:sup")}}{${recurseChild("m:e")}}`;

    case "m:rad": {
      const e = recurseChild("m:e");
      const degNode = findChild(n, "m:deg");
      if (degNode) {
        const deg = convertNode(degNode).trim();
        if (deg) return `\\sqrt[${deg}]{${e}}`;
      }
      return `\\sqrt{${e}}`;
    }

    case "m:nary": {
      const naryPr = findChild(n, "m:naryPr");
      let chr = "∫";
      if (naryPr) {
        const chrEl = findChild(naryPr, "m:chr");
        if (chrEl) chr = attrVal(chrEl, "m:val") ?? "∫";
      }
      const op = naryOp(chr);
      const sub = recurseChild("m:sub").trim();
      const sup = recurseChild("m:sup").trim();
      const e = recurseChild("m:e").trim();
      let out = op;
      if (sub) out += `_{${sub}}`;
      if (sup) out += `^{${sup}}`;
      if (e) out += ` ${e}`;
      return out;
    }

    case "m:d": {
      const dPr = findChild(n, "m:dPr");
      let beg = "(";
      let end = ")";
      if (dPr) {
        const b = findChild(dPr, "m:begChr");
        const eCh = findChild(dPr, "m:endChr");
        if (b) beg = attrVal(b, "m:val") ?? "(";
        if (eCh) end = attrVal(eCh, "m:val") ?? ")";
      }
      const inner = kids.filter((c) => tagOf(c) === "m:e").map(convertNode);
      return `${delimOpen(beg)}${inner.join(", ")}${delimClose(end)}`;
    }

    case "m:m": {
      const rows = kids
        .filter((c) => tagOf(c) === "m:mr")
        .map((r) =>
          childrenOf(r)
            .filter((c) => tagOf(c) === "m:e")
            .map(convertNode)
            .join(" & "),
        );
      return `\\begin{matrix} ${rows.join(" \\\\ ")} \\end{matrix}`;
    }

    case "m:acc": {
      const accPr = findChild(n, "m:accPr");
      let chr = "̂";
      if (accPr) {
        const c = findChild(accPr, "m:chr");
        if (c) chr = attrVal(c, "m:val") ?? "̂";
      }
      return `${accentOp(chr)}{${recurseChild("m:e")}}`;
    }

    case "m:bar": {
      const barPr = findChild(n, "m:barPr");
      let pos = "top";
      if (barPr) {
        const p = findChild(barPr, "m:pos");
        pos = (p ? attrVal(p, "m:val") : undefined) ?? "top";
      }
      const e = recurseChild("m:e");
      return pos === "bot" ? `\\underline{${e}}` : `\\overline{${e}}`;
    }

    case "m:func":
      return `${recurseChild("m:fName")} ${recurseChild("m:e")}`;

    case "m:limlow": {
      const e = recurseChild("m:e");
      const lim = recurseChild("m:lim");
      return `${e}_{${lim}}`;
    }
    case "m:limupp": {
      const e = recurseChild("m:e");
      const lim = recurseChild("m:lim");
      return `${e}^{${lim}}`;
    }
    case "m:groupchr":
      return `\\overline{${recurseChild("m:e")}}`;

    default:
      if (tag.endsWith("pr")) return "";
      return recurse();
  }
}

function naryOp(chr: string): string {
  switch (chr) {
    case "∑": return "\\sum";
    case "∏": return "\\prod";
    case "∐": return "\\coprod";
    case "∬": return "\\iint";
    case "∭": return "\\iiint";
    case "∮": return "\\oint";
    case "⋂": return "\\bigcap";
    case "⋃": return "\\bigcup";
    case "⋀": return "\\bigwedge";
    case "⋁": return "\\bigvee";
    default: return "\\int";
  }
}

function delimOpen(ch: string): string {
  switch (ch) {
    case "(": return "\\left(";
    case "[": return "\\left[";
    case "{": return "\\left\\{";
    case "|": return "\\left|";
    case "‖": return "\\left\\|";
    case "⟨": return "\\left\\langle ";
    case "": case " ": return "\\left.";
    default: return `\\left${ch}`;
  }
}

function delimClose(ch: string): string {
  switch (ch) {
    case ")": return "\\right)";
    case "]": return "\\right]";
    case "}": return "\\right\\}";
    case "|": return "\\right|";
    case "‖": return "\\right\\|";
    case "⟩": return "\\right\\rangle ";
    case "": case " ": return "\\right.";
    default: return `\\right${ch}`;
  }
}

function accentOp(chr: string): string {
  switch (chr) {
    case "̂": case "^": return "\\hat";
    case "̃": case "~": return "\\tilde";
    case "̄": case "¯": return "\\bar";
    case "̇": return "\\dot";
    case "̈": return "\\ddot";
    case "⃗": return "\\vec";
    case "́": return "\\acute";
    case "̀": return "\\grave";
    default: return "\\hat";
  }
}

export function ommlToLatex(xmlFragment: string): string {
  const $ = load(xmlFragment, { xmlMode: true });
  const roots = $.root().children().toArray() as AnyNode[];
  const out = roots.map(convertNode).join("");
  return out
    .replace(/\s+/g, " ")
    .replace(/\s*([{}])\s*/g, "$1")
    .replace(/\s*([_^])\s*/g, "$1")
    .trim();
}
