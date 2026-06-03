"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KeyRound, Check, ExternalLink, ShieldCheck, Trash2 } from "lucide-react";
import { getUserKeys, setUserKeys, type UserKeys } from "@/lib/ai/user-keys";

const FIELDS: Array<{
  id: keyof UserKeys;
  label: string;
  placeholder: string;
  hint: string;
  href: string;
}> = [
  {
    id: "deepseek",
    label: "DeepSeek API Key",
    placeholder: "sk-...",
    hint: "默认 LLM，所有流式工具（速读 / 总结 / idea / 规划 / 封装）都用它，最便宜。",
    href: "https://platform.deepseek.com/api_keys",
  },
  {
    id: "openai",
    label: "OpenAI API Key（可选）",
    placeholder: "sk-...",
    hint: "论文分析 / 选区解释的备选供应商；DeepSeek 不可用时自动切换。",
    href: "https://platform.openai.com/api-keys",
  },
  {
    id: "gemini",
    label: "Google Gemini API Key（可选）",
    placeholder: "AIza...",
    hint: "再一道备选。三家任配其一即可启用 AI 功能。",
    href: "https://aistudio.google.com/app/apikey",
  },
];

export default function SettingsPage() {
  const [keys, setKeys] = useState<UserKeys>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // localStorage 仅客户端可读，挂载后异步注入（避免 effect 内同步 setState）
    const t = setTimeout(() => setKeys(getUserKeys()), 0);
    return () => clearTimeout(t);
  }, []);

  const update = (id: keyof UserKeys, v: string) => {
    setKeys((prev) => ({ ...prev, [id]: v }));
    setSaved(false);
  };

  const save = () => {
    setUserKeys(keys);
    setKeys(getUserKeys());
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const clearAll = () => {
    setUserKeys({});
    setKeys({});
    setSaved(false);
  };

  return (
    <section className="mx-auto w-full max-w-2xl px-6 pt-14 pb-24">
      <div className="flex items-center gap-3 mb-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff5d4d] to-[#9b5de5] text-white">
          <KeyRound className="h-5 w-5" />
        </span>
        <h1 className="serif text-2xl text-ink">API Key 设置</h1>
      </div>

      <p className="text-[14px] leading-relaxed text-ink-3 mb-6">
        本站的 AI 功能（论文分析、网页速读、结构化总结、idea 生成、研究规划、技能封装、选区解释）
        都在你的浏览器里用<strong className="text-ink">你自己的 API Key</strong> 调用。
        无需注册、零门槛，检索 / 阅读 / PDF 批注 / 模型可视化等功能<strong className="text-ink">不需要 key 也能用</strong>。
      </p>

      <div className="surface rounded-2xl p-4 mb-6 flex items-start gap-3 text-[13px] text-ink-2">
        <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-sage" />
        <span>
          Key 只保存在<strong className="text-ink">你本机的浏览器 localStorage</strong>，
          仅在调用时通过请求头转发给对应模型厂商，<strong className="text-ink">我们的服务器不持久化、不记录</strong>。
          换设备 / 清缓存后需重新填写。
        </span>
      </div>

      <div className="space-y-5">
        {FIELDS.map((f) => (
          <div key={f.id}>
            <label className="flex items-center justify-between mb-1.5">
              <span className="text-[13px] font-medium text-ink">{f.label}</span>
              <a
                href={f.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink transition-colors"
              >
                获取 <ExternalLink className="h-3 w-3" />
              </a>
            </label>
            <input
              type="password"
              autoComplete="off"
              value={keys[f.id] ?? ""}
              onChange={(e) => update(f.id, e.target.value)}
              placeholder={f.placeholder}
              className="w-full rounded-xl border border-line bg-paper-2/70 px-3.5 py-2.5 text-[14px] text-ink outline-none transition-colors focus:border-line-strong focus-ring font-mono"
            />
            <p className="mt-1 text-[12px] text-ink-3">{f.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-7 flex items-center gap-3">
        <button
          onClick={save}
          className="cta-gradient inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium focus-ring"
        >
          {saved ? <Check className="h-4 w-4" /> : null}
          {saved ? "已保存" : "保存到本机"}
        </button>
        <button
          onClick={clearAll}
          className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2.5 text-[13px] text-ink-3 transition-colors hover:border-line-strong hover:text-ink focus-ring"
        >
          <Trash2 className="h-3.5 w-3.5" /> 清除
        </button>
        <Link
          href="/"
          className="ml-auto text-[13px] text-ink-3 hover:text-ink transition-colors"
        >
          返回工作流 →
        </Link>
      </div>
    </section>
  );
}
