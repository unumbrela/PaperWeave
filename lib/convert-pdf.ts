const globalPromise = Promise as unknown as {
  try?: (fn: (...args: unknown[]) => unknown, ...args: unknown[]) => Promise<unknown>;
};
if (typeof globalPromise.try !== "function") {
  globalPromise.try = function (fn, ...args) {
    try {
      return Promise.resolve(fn(...args));
    } catch (err) {
      return Promise.reject(err);
    }
  };
}

import pdf2md from "@opendocsg/pdf2md";

export async function convertPdf(buffer: Buffer): Promise<string> {
  const ab = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
  const md = await pdf2md(ab);
  return md.replace(/\n{3,}/g, "\n\n").trim();
}
