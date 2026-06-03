export function Hero() {
  return (
    <header className="text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f4c25a]/10 text-[#f4c25a] text-[12px] mb-6">
        <span className="serif-italic">讲结果</span>
      </div>
      <h1 className="serif text-4xl md:text-5xl lg:text-6xl tracking-tight">
        经典模型 · Transformer 可视化
      </h1>
      <p className="mt-6 max-w-2xl mx-auto text-[15px] leading-relaxed text-ink-2">
        交互式理解 Transformer 架构：从输入嵌入、多头注意力机制、残差连接到输出，
        逐层解析注意力权重的变化。
      </p>
    </header>
  );
}