"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KeyRound, Check, ExternalLink, ShieldCheck, Trash2, Sparkles } from "lucide-react";
import {
  getUserKeys,
  setUserKeys,
  getSelectedModel,
  setSelectedModel,
  type UserKeys,
} from "@/lib/ai/user-keys";
import { OPENROUTER_MODELS } from "@/lib/ai/models";

const FIELDS: Array<{
  id: keyof UserKeys;
  label: string;
  placeholder: string;
  hint: string;
  href: string;
}> = [
  {
    id: "openrouter",
    label: "OpenRouter API Key（推荐 · 解锁多模型）",
    placeholder: "sk-or-v1-...",
    hint: "一个 key 解锁 Claude / GPT / Gemini / DeepSeek / Qwen / Llama 等多家模型，下面可挑选。",
    href: "https://openrouter.ai/keys",
  },
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
    hint: "论文分析 / 选区解释的备选供应商；DeepSeek 不可用时自动切换。也用于语义检索的向量化。",
    href: "https://platform.openai.com/api-keys",
  },
  {
    id: "gemini",
    label: "Google Gemini API Key（可选）",
    placeholder: "AIza...",
    hint: "再一道备选。多家任配其一即可启用 AI 功能。",
    href: "https://aistudio.google.com/app/apikey",
  },
];

export default function SettingsPage() {
  const [keys, setKeys] = useState<UserKeys>({});
  const [model, setModel] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // localStorage 仅客户端可读，挂载后异步注入（避免 effect 内同步 setState）
    const t = setTimeout(() => {
      setKeys(getUserKeys());
      setModel(getSelectedModel());
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const update = (id: keyof UserKeys, v: string) => {
    setKeys((prev) => ({ ...prev, [id]: v }));
    setSaved(false);
  };

  const pickModel = (id: string) => {
    setModel((prev) => (prev === id ? "" : id)); // 再点一次取消选择
    setSaved(false);
  };

  const save = () => {
    setUserKeys(keys);
    setSelectedModel(model);
    setKeys(getUserKeys());
    setModel(getSelectedModel());
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const clearAll = () => {
    setUserKeys({});
    setSelectedModel("");
    setKeys({});
    setModel("");
    setSaved(false);
  };

  const hasOpenRouter = !!keys.openrouter?.trim();

  return (
    <section className="mx-auto w-full max-w-2xl px-6 pt-14 pb-24">
      <div className="flex items-center gap-3 mb-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff5d4d] to-[#9b5de5] text-white">
          <KeyRound className="h-5 w-5" />
        </span>
        <h1 className="serif text-2xl text-ink">API Key 设置</h1>
      </div>

      <p className="text-[14px] leading-relaxed text-ink-3 mb-6">
        本站的 AI 功能（论文分析、网页速读、要点提炼、创新点立论、研究任务分解、技能封装、选区解释）
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

      {/* OpenRouter 模型选择：仅在填了 OpenRouter key 后启用 */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles className="h-4 w-4 text-[#9b5de5]" />
          <h2 className="text-[14px] font-medium text-ink">选择模型</h2>
        </div>
        <p className="text-[12px] text-ink-3 mb-3">
          {hasOpenRouter
            ? "选中一个模型后，全站 AI 调用会优先用它（失败自动回退到你配置的其他 key）。再点一次可取消选择。"
            : "填入上方 OpenRouter API Key 后即可解锁以下模型。未选择时使用默认链路（DeepSeek → OpenAI → Gemini）。"}
        </p>
        {hasOpenRouter ? (
          <p className="text-[11px] text-ink-3 mb-3 -mt-1.5">
            带「需开启数据策略」标记的闭源模型（Claude / GPT / Gemini）需先到{" "}
            <a
              href="https://openrouter.ai/settings/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#9b5de5] hover:underline"
            >
              OpenRouter 隐私设置
            </a>{" "}
            开启数据策略，否则会被供应商拒绝（403）；开源模型（DeepSeek / Qwen / Llama）无需此步。
          </p>
        ) : null}

        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2.5 ${hasOpenRouter ? "" : "opacity-50 pointer-events-none"}`}>
          {OPENROUTER_MODELS.map((m) => {
            const active = model === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => pickModel(m.id)}
                aria-pressed={active}
                className={`text-left rounded-xl border px-3.5 py-3 transition-colors focus-ring ${
                  active
                    ? "border-[#9b5de5] bg-[#9b5de5]/8"
                    : "border-line bg-paper-2/50 hover:border-line-strong"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-ink">{m.label}</span>
                  <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[10px] text-ink-3">
                    {m.tier}
                  </span>
                </div>
                <div className="mt-0.5 text-[11px] text-ink-3">{m.vendor}</div>
                <p className="mt-1.5 text-[12px] leading-snug text-ink-2">{m.hint}</p>
                {m.needsDataPolicy ? (
                  <span className="mt-1.5 inline-block text-[10px] text-ink-3">需开启数据策略</span>
                ) : null}
                {active ? (
                  <span className="mt-2 inline-flex items-center gap-1 text-[11px] text-[#9b5de5]">
                    <Check className="h-3 w-3" /> 已选用
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 flex items-center gap-3">
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
