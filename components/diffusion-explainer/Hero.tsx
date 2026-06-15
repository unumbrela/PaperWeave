"use client";

export function Hero() {
  return (
    <div className="text-center mb-8">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm mb-4">
        <span className="serif-italic">可视化展厅</span>
        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
      </div>
      <h1 className="serif text-3xl md:text-4xl font-medium text-ink tracking-tight">
        经典模型 · 扩散模型
      </h1>
      <p className="mt-4 text-ink-2 max-w-2xl mx-auto">
        观察从随机噪声到清晰图像的逐步演变：t=100（纯噪声）→ t=0（清晰图像），理解扩散模型的逆向去噪过程。
      </p>
      
      <div className="mt-6 flex items-center justify-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#667eea]" />
          <span className="text-sm text-ink-3">t=100 (高噪声)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#f4c25a]" />
          <span className="text-sm text-ink-3">t=50 (中等)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#22c55e]" />
          <span className="text-sm text-ink-3">t=0 (清晰)</span>
        </div>
      </div>
    </div>
  );
}