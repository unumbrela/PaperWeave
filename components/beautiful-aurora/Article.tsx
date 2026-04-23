export function Article() {
  return (
    <article id="aurora-article-anchor" className="hpi-article">
      <header className="hpi-article-header">
        <div className="hpi-article-overline">Reading Notes · 中文解读</div>
        <h2 className="hpi-article-title">
          这个页面为什么会动：<em>4 团 blob + 5 组 keyframes</em>
        </h2>
      </header>

      <section className="hpi-article-section">
        <p>
          这个效果的关键不在 JavaScript，而在于原作者把整段标题本身当成了一个
          <strong>黑色舞台</strong>：白字躺在上层，下面放 4 团超大的模糊色块，
          再用混合模式把颜色“压”进文字里。所以它看起来像是极光在字面内部流动，
          实际上全程只是在跑 CSS 动画。
        </p>
      </section>

      <section className="hpi-article-section">
        <h3>① 原页面的 HTML 极小：标题里套一层 aurora 容器</h3>
        <p>
          CodePen 原版几乎没有 DOM 复杂度。核心结构只有一层 content、一行 title，
          然后在 title 内部塞一个绝对定位的 aurora 容器，里面放 4 个
          <code>div</code>：
        </p>
        <pre className="hpi-code">
{`<div class="content">
  <h1 class="title">
    the beautiful aurora
    <div class="aurora">
      <div class="aurora__item"></div>
      <div class="aurora__item"></div>
      <div class="aurora__item"></div>
      <div class="aurora__item"></div>
    </div>
  </h1>
</div>`}
        </pre>
        <p>
          也就是说，真正“动”的不是文字节点，而是覆盖在标题上的 4 个绝对定位层。
        </p>
      </section>

      <section className="hpi-article-section">
        <h3>② 为什么之前那版看起来像静态</h3>
        <p>
          原版每个 blob 的尺寸是 <code>60vw × 60vw</code>，是按
          <strong>视口</strong>算的大物体；它们会穿过整块标题区域，所以运动很明显。
          我之前把尺寸缩成了标题内部的相对百分比，结果 blob 变得太小，虽然动画还在跑，
          但视觉上只剩轻微呼吸感，看起来就接近静态。这次已经按原逻辑改回
          <code>60vw</code> 量级，并保留 4 条独立轨迹。
        </p>
      </section>

      <section className="hpi-article-section">
        <h3>③ 颜色为什么只在字里出现：靠的是两层 blend mode</h3>
        <p>
          这个效果最精妙的部分是混合模式组合：
        </p>
        <ul>
          <li>
            外层 <code>.aurora</code> 用 <code>mix-blend-mode: darken</code>，
            让彩色层去“压暗”下面的白色字面。
          </li>
          <li>
            每个 <code>.aurora__item</code> 再用 <code>mix-blend-mode: overlay</code>，
            让 4 种颜色互相叠出更丰富的过渡。
          </li>
        </ul>
        <p>
          同时标题本身有一个 <code>background: #000</code>。结果就是：
          彩色层只会对白字区域产生强烈影响，黑底几乎保持不变，于是你看到的是“字里有极光”，
          不是“屏幕上有 4 个彩球”。
        </p>
      </section>

      <section className="hpi-article-section">
        <h3>④ 真正驱动画面的，是 4 条位置轨迹 + 1 条形状轨迹</h3>
        <p>
          原版没有用 transform 做统一旋转，而是给 4 个 blob 各写一条单独的路径动画：
          <code>aurora-1</code> 到 <code>aurora-4</code>。
          它们分别改 <code>top/right/left/bottom</code>，所以每团颜色走法都不一样。
        </p>
        <pre className="hpi-code">
{`@keyframes aurora-1 {
  0%   { top: 0; right: 0; }
  50%  { top: 100%; right: 75%; }
  75%  { top: 100%; right: 25%; }
  100% { top: 0; right: 0; }
}`}
        </pre>
        <p>
          除了位置，4 个 blob 还共用一条 <code>aurora-border</code> 动画去改
          <code>border-radius</code>。所以它们不是“圆形光斑在飘”，而是
          <strong>边走边变形</strong>，这就是原页看起来更像液态极光的原因。
        </p>
      </section>

      <section className="hpi-article-section">
        <h3>⑤ 我在项目里怎么落地</h3>
        <p>
          这一版实现仍然保持 <strong>CSS only</strong>，但把原页包装成了可复用组件
          <code>BeautifulAuroraBackground</code>。它被同时接到了两个地方：
        </p>
        <ul>
          <li>
            独立工具页 <code>/tools/beautiful-aurora</code>：上方完整展示，下方是这篇中文解读。
          </li>
          <li>
            <code>web-beautifier</code> 展示页：作为第 4 个可直接复制的 drop-in 背景组件。
          </li>
        </ul>
        <p>
          和原页相比，我只做了三类收敛：去掉副标题、补了移动端尺寸限制、增加了
          <code>prefers-reduced-motion</code> 降级。
        </p>
      </section>

      <section className="hpi-article-section">
        <h3>⑥ 这个页面的实现拆分</h3>
        <ul>
          <li>
            <strong>舞台区</strong>：深色顶栏 + 全屏展示区，沿用 11-13 栏的页面骨架。
          </li>
          <li>
            <strong>核心组件</strong>：<code>components/beautifier/beautiful-aurora-background.tsx</code>
            ，里面是完整 CSS 动效。
          </li>
          <li>
            <strong>文章区</strong>：当前这篇中文说明，挂在展示区下面，复用
            <code>hpi-article</code> 这套现成排版。
          </li>
        </ul>
      </section>

      <section className="hpi-article-section">
        <h3>相关链接</h3>
        <ul className="hpi-links">
          <li>
            原始 CodePen：
            <a
              href="https://codepen.io/ostylowany/pen/vYzPVZL"
              target="_blank"
              rel="noopener noreferrer"
            >
              codepen.io/ostylowany/pen/vYzPVZL
            </a>
          </li>
          <li>
            当前项目内的核心组件：
            <code>components/beautifier/beautiful-aurora-background.tsx</code>
          </li>
          <li>
            当前工具页入口：
            <code>app/tools/beautiful-aurora/page.tsx</code>
          </li>
        </ul>
      </section>
    </article>
  );
}
