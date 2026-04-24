"use client";

import { useMemo } from "react";
import { tokenizeLine, TOKEN_CSS } from "./tokenizer";
import s from "./shared.module.css";

export interface CodePanelProps {
  /** The full C++ source code */
  code: string;
  /** File name shown in header */
  fileName?: string;
  /** Lines with soft background highlight (1-based) */
  highlightLines?: number[];
  /** Single line with ▶ arrow marker (1-based) */
  execLine?: number | null;
  /** Inline variable display per line: lineNumber → "var=val, ..." */
  varDisplay?: Record<number, string | null>;
  /** Variables shown in bottom memory panel */
  memoryVars?: { name: string; value: string; changed?: boolean }[];
}

export function CodePanel({
  code,
  fileName = "Solution.cpp",
  highlightLines = [],
  execLine = null,
  varDisplay = {},
  memoryVars,
}: CodePanelProps) {
  const lines = useMemo(
    () =>
      code.split("\n").map((content, idx) => ({
        lineNumber: idx + 1,
        content,
        tokens: tokenizeLine(content),
      })),
    [code],
  );

  return (
    <div className={s.codePanel}>
      <div className={s.codeHeader}>
        <div className={s.codeFileInfo}>
          <span className={s.codeFileIcon}>📄</span>
          <span>{fileName}</span>
        </div>
        <span style={{ fontSize: "0.65rem", color: "#858585" }}>C++</span>
      </div>

      <div className={s.codeContent}>
        {lines.map((line) => {
          const isHL = highlightLines.includes(line.lineNumber);
          const isCur = execLine === line.lineNumber;
          const vars = varDisplay[line.lineNumber];

          return (
            <div
              key={line.lineNumber}
              className={[
                s.codeLine,
                isHL ? s.codeLineHighlighted : "",
                isCur ? s.codeLineCurrent : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className={s.gutter}>
                <span className={s.lineNumber}>{line.lineNumber}</span>
                {isCur && <span className={s.execArrow}>▶</span>}
              </div>
              <div className={s.lineContent}>
                {line.tokens.map((tok, ti) => (
                  <span key={ti} className={s[TOKEN_CSS[tok.type]]}>
                    {tok.value}
                  </span>
                ))}
                {vars && <span className={s.inlineVar}>{`// ${vars}`}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {memoryVars && memoryVars.length > 0 && (
        <div className={s.memoryPanel}>
          <div className={s.memoryTitle}>Variables</div>
          {memoryVars.map((v) => (
            <div key={v.name} className={s.memoryRow}>
              <span className={s.memoryName}>{v.name}</span>
              <span className={s.memoryEq}>=</span>
              <span
                className={
                  v.changed ? s.memoryValueChanged : s.memoryValue
                }
              >
                {v.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
