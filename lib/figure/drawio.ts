/**
 * draw.io(mxfile)产物的提取与下载工具。
 *
 * LLM 偶尔会给 XML 夹带说明或 ```xml 围栏，或只给 <mxGraphModel> 不带 <mxfile> 外壳。
 * `extractMxfile` 把这些归一成一段可被 draw.io 查看器渲染、也能直接落盘的 <mxfile> XML。
 */

/**
 * 把被截断的 XML 在「最后一个完整 </mxCell>」处收口，补齐缺失的闭合标签。
 * 模型（尤其默认链路）常把长 XML 写到一半就断流——这能把残片救成可渲染/可下载的图。
 */
function repairTruncated(s: string): string {
  const lastCell = s.lastIndexOf("</mxCell>");
  if (lastCell === -1) return "";
  let body = s.slice(0, lastCell + "</mxCell>".length);
  // 按需补齐由内到外的闭合标签
  if (/<root[\s>]/.test(body) && !/<\/root>/.test(body)) body += "</root>";
  if (/<mxGraphModel[\s>]/.test(body) && !/<\/mxGraphModel>/.test(body)) body += "</mxGraphModel>";
  if (/<diagram[\s>]/.test(body) && !/<\/diagram>/.test(body)) body += "</diagram>";
  if (/<mxfile[\s>]/.test(body) && !/<\/mxfile>/.test(body)) body += "</mxfile>";
  return body;
}

/**
 * 从模型原始输出里截取/补全出一段合法的 <mxfile> XML；取不到则返回空串。
 * 依次尝试：完整 <mxfile> → 完整 <mxGraphModel>（补外壳）→ 截断残片的收口修复。
 */
export function extractMxfile(raw: string): string {
  if (!raw) return "";
  // 去掉 ```xml ... ``` 之类代码围栏
  const s = raw.replace(/```(?:xml)?/gi, "").trim();

  // 优先取 <mxfile>…</mxfile>
  const fileStart = s.indexOf("<mxfile");
  const fileEnd = s.lastIndexOf("</mxfile>");
  if (fileStart !== -1 && fileEnd !== -1 && fileEnd > fileStart) {
    return s.slice(fileStart, fileEnd + "</mxfile>".length);
  }

  // 退而取 <mxGraphModel>…</mxGraphModel>，包一层 mxfile 外壳
  const modelStart = s.indexOf("<mxGraphModel");
  const modelEnd = s.lastIndexOf("</mxGraphModel>");
  if (modelStart !== -1 && modelEnd !== -1 && modelEnd > modelStart) {
    const model = s.slice(modelStart, modelEnd + "</mxGraphModel>".length);
    return `<mxfile host="app.diagrams.net"><diagram name="Page-1">${model}</diagram></mxfile>`;
  }

  // 截断兜底：从 <mxfile / <mxGraphModel 起到最后一个完整 </mxCell> 收口
  const start = fileStart !== -1 ? fileStart : modelStart;
  if (start !== -1) {
    const repaired = repairTruncated(s.slice(start));
    if (repaired) {
      return repaired.includes("<mxfile")
        ? repaired
        : `<mxfile host="app.diagrams.net"><diagram name="Page-1">${repaired}</diagram></mxfile>`;
    }
  }

  return "";
}

/** 把 mxfile XML 存成 .drawio 文件触发浏览器下载。 */
export function downloadDrawio(xml: string, filename = "diagram.drawio") {
  const blob = new Blob([xml], { type: "application/xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".drawio") ? filename : `${filename}.drawio`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
