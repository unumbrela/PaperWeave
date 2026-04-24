export type TokenType =
  | "keyword" | "type" | "string" | "number" | "comment"
  | "variable" | "method" | "operator" | "punctuation" | "plain";

export interface CodeToken { type: TokenType; value: string; }

const CPP_KEYWORDS = [
  "class","public","private","protected","void","if","else","for","while",
  "do","switch","case","break","continue","return","new","delete","this",
  "true","false","nullptr","const","static","virtual","override","template",
  "typename","using","namespace","struct","enum","typedef","auto",
];

const CPP_TYPES = [
  "int","long","short","char","float","double","bool","string",
  "vector","deque","array","map","set","pair","size_t","ListNode",
];

export function tokenizeLine(line: string): CodeToken[] {
  const tokens: CodeToken[] = [];
  let i = 0;
  while (i < line.length) {
    if (/\s/.test(line[i])) {
      let ws = "";
      while (i < line.length && /\s/.test(line[i])) ws += line[i++];
      tokens.push({ type: "plain", value: ws });
      continue;
    }
    if (line.slice(i, i + 2) === "//") {
      tokens.push({ type: "comment", value: line.slice(i) });
      break;
    }
    if (line[i] === '"' || line[i] === "'") {
      const q = line[i];
      let s = q; i++;
      while (i < line.length && line[i] !== q) {
        if (line[i] === "\\" && i + 1 < line.length) { s += line[i] + line[i + 1]; i += 2; }
        else s += line[i++];
      }
      if (i < line.length) { s += q; i++; }
      tokens.push({ type: "string", value: s });
      continue;
    }
    if (/\d/.test(line[i])) {
      let n = "";
      while (i < line.length && /[\d.xXa-fA-F]/.test(line[i])) n += line[i++];
      tokens.push({ type: "number", value: n });
      continue;
    }
    if (/[a-zA-Z_]/.test(line[i])) {
      let id = "";
      while (i < line.length && /[a-zA-Z0-9_]/.test(line[i])) id += line[i++];
      let t: TokenType = "variable";
      if (CPP_KEYWORDS.includes(id)) t = "keyword";
      else if (CPP_TYPES.includes(id)) t = "type";
      else if (i < line.length && line[i] === "(") t = "method";
      tokens.push({ type: t, value: id });
      continue;
    }
    const ops = [
      "::","<<",">>","==","!=","<=",">=","&&","||","++","--","+=","-=","->",
      "<",">","+","-","*","/","%","=","!","&","|",":",
    ];
    let found = false;
    for (const op of ops) {
      if (line.slice(i, i + op.length) === op) {
        tokens.push({ type: "operator", value: op }); i += op.length; found = true; break;
      }
    }
    if (found) continue;
    if (/[{}()\[\];,.<>@#]/.test(line[i])) {
      tokens.push({ type: "punctuation", value: line[i] }); i++; continue;
    }
    tokens.push({ type: "plain", value: line[i] }); i++;
  }
  return tokens;
}

export const TOKEN_CSS: Record<TokenType, string> = {
  keyword: "tkKeyword", type: "tkType", string: "tkString", number: "tkNumber",
  comment: "tkComment", variable: "tkVariable", method: "tkMethod",
  operator: "tkOperator", punctuation: "tkPunctuation", plain: "tkPlain",
};
