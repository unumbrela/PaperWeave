export function Hero() {
  return (
    <div className="text-center">
      <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 bg-green-100 text-green-700 text-sm">
        <span className="w-2 h-2 rounded-full bg-green-500" />
        讲结果
      </div>
      <h1 className="serif text-3xl sm:text-4xl lg:text-5xl leading-tight tracking-tight text-ink">
        生成对抗网络 · GAN
      </h1>
      <p className="mt-4 max-w-xl mx-auto text-ink-2 text-sm sm:text-base leading-relaxed">
        观察 Generator 与 Discriminator 的博弈过程，可视化中间特征图的变化，理解生成对抗网络的核心原理。
      </p>
    </div>
  );
}