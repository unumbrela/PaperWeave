export function Hero() {
  return (
    <div className="text-center">
      <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 bg-purple-100 text-purple-700 text-sm">
        <span className="w-2 h-2 rounded-full bg-purple-500" />
        可视化展厅 · 复刻自 A Visual Introduction to Rectified Flows
      </div>
      <h1 className="serif text-3xl sm:text-4xl lg:text-5xl leading-tight tracking-tight text-ink">
        扩散模型 · 流匹配与 Rectified Flow
      </h1>
      <p className="mt-4 max-w-2xl mx-auto text-ink-2 text-sm sm:text-base leading-relaxed">
        生成模型把随机噪声「流」成数据。Flow Matching 学到的路径却是
        <span className="text-[#8b5cf6] font-medium">弯曲</span>的 —— 弯曲就意味着采样要跑很多步。
        <span className="text-[#22c55e] font-medium">Rectified Flow</span> 用「重流」把轨迹
        <strong>拉直</strong>，于是几步甚至一步就能采样。下面每一张图都是用闭式速度场跑出来的<strong>真实</strong>流，不是动画。
      </p>
    </div>
  );
}
