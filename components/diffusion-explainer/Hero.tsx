export function Hero() {
  return (
    <div className="text-center">
      <h1 className="serif text-3xl sm:text-4xl lg:text-5xl leading-tight tracking-tight text-ink">
        Flow Matching 与 Rectified Flow
      </h1>
      <p className="mt-4 max-w-2xl mx-auto text-ink-2 text-sm sm:text-base leading-relaxed">
        生成一张图，本质上是把<strong>一把随机撒开的点</strong>，顺着一张「风的地图」移动，最后聚成想要的图案。
        Flow Matching 能学到这张风图，但它指引的路线是
        <span className="text-[#8b5cf6] font-medium">弯</span>的 —— 弯就意味着要走很多步、很慢。
        <span className="text-[#22c55e] font-medium">Rectified Flow</span> 用一个叫「重流」的技巧把路线
        <strong>拉直</strong>，于是几步甚至一步就能生成。下面每张图都是用真实速度场实时算出来的，可以自己动手玩。
      </p>
    </div>
  );
}
