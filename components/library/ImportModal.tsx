"use client";

import { X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

/** 论文导入弹窗：arXiv ID 或上传 PDF 两种方式。 */
export function ImportModal({
  mode,
  onModeChange,
  arxivId,
  setArxivId,
  selectedFile,
  setSelectedFile,
  importing,
  importMessage,
  onArxivImport,
  onPdfImport,
  onClose,
}: {
  mode: "arxiv" | "pdf";
  onModeChange: (mode: "arxiv" | "pdf") => void;
  arxivId: string;
  setArxivId: (v: string) => void;
  selectedFile: File | null;
  setSelectedFile: (f: File | null) => void;
  importing: boolean;
  importMessage: string;
  onArxivImport: () => void;
  onPdfImport: () => void;
  onClose: () => void;
}) {
  const tab = (active: boolean) =>
    cn(
      "flex-1 py-2 px-4 rounded-full text-sm font-medium transition-colors",
      active ? "bg-ink text-paper-2" : "bg-paper-3 text-ink-3 hover:text-ink",
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose} />

      <div className="relative surface-strong rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-line">
          <h2 className="text-lg serif text-ink">导入论文</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-paper-3 transition-colors">
            <X className="w-5 h-5 text-ink-3" />
          </button>
        </div>

        <div className="flex gap-2 p-4 border-b border-line">
          <button onClick={() => onModeChange("arxiv")} className={tab(mode === "arxiv")}>
            通过 arXiv ID 导入
          </button>
          <button onClick={() => onModeChange("pdf")} className={tab(mode === "pdf")}>
            上传 PDF 文件
          </button>
        </div>

        <div className="p-5">
          {mode === "arxiv" ? (
            <>
              <div className="mb-4">
                <label className="overline block mb-2">输入 arXiv ID</label>
                <input
                  type="text"
                  value={arxivId}
                  onChange={(e) => setArxivId(e.target.value)}
                  placeholder="例如：2301.12345"
                  className="w-full px-4 py-2 rounded-xl border border-line bg-paper-2/80 text-sm text-ink placeholder:text-ink-4 focus:outline-none focus:border-line-strong transition-colors"
                />
              </div>
              <button
                onClick={onArxivImport}
                disabled={importing}
                className="cta-gradient w-full rounded-full py-2 text-sm font-medium transition-all focus-ring disabled:opacity-50"
              >
                {importing ? "导入中…" : "导入"}
              </button>
            </>
          ) : (
            <>
              <div className="mb-4">
                <label className="overline block mb-2">选择 PDF 文件</label>
                <div className="border-2 border-dashed border-line rounded-xl p-8 text-center hover:border-line-strong transition-colors">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="pdf-upload"
                  />
                  <label htmlFor="pdf-upload" className="cursor-pointer">
                    <FileText className="w-12 h-12 mx-auto text-ink-4 mb-3" />
                    {selectedFile ? (
                      <div className="text-sm text-ink">已选择：{selectedFile.name}</div>
                    ) : (
                      <>
                        <div className="text-sm text-ink-3 mb-1">点击选择 PDF 文件</div>
                        <div className="text-xs text-ink-4">或拖拽文件到此处</div>
                      </>
                    )}
                  </label>
                </div>
              </div>
              <button
                onClick={onPdfImport}
                disabled={importing || !selectedFile}
                className="cta-gradient w-full rounded-full py-2 text-sm font-medium transition-all focus-ring disabled:opacity-50"
              >
                {importing ? "导入中…" : "导入"}
              </button>
            </>
          )}
          {importMessage && <p className="mt-3 text-sm text-center text-ink-3">{importMessage}</p>}
        </div>
      </div>
    </div>
  );
}
