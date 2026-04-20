"use client";

import { useCallback, useRef, useState } from "react";

export function useStream() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(
    async (url: string, body: unknown) => {
      abortRef.current?.abort();
      const ctl = new AbortController();
      abortRef.current = ctl;
      setText("");
      setError(null);
      setLoading(true);
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
          signal: ctl.signal,
        });
        if (!res.ok || !res.body) {
          const msg = await res.text().catch(() => "");
          throw new Error(msg || `请求失败 (${res.status})`);
        }
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          setText((prev) => prev + dec.decode(value, { stream: true }));
        }
      } catch (e: unknown) {
        if ((e as { name?: string })?.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "未知错误");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setText("");
    setError(null);
    setLoading(false);
  }, []);

  return { text, loading, error, run, reset };
}
