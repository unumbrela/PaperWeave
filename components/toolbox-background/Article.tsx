import styles from "./toolbox-background.module.css";

export function Article() {
  return (
    <article id="mesh-article-anchor" className={styles.article}>
      <header className={styles.articleHeader}>
        <div className={styles.articleOverline}>Reading Notes · 中文解读</div>
        <h2 className={styles.articleTitle}>
          当前项目这个动态背景，本质上就是
          <em> 5 团 blob + 1 层颗粒 + 0 段动画 JavaScript</em>
        </h2>
      </header>

      <section className={styles.section}>
        <p>
          这个项目本身是一个 <strong>Next.js 工具合集站</strong>：首页负责展示所有工具卡片，
          各个独立工具页再按主题展开。为了让整个站点从一开始就有统一气质，根布局没有用一张静态底图，
          而是挂了一套持续缓动的动态背景。你现在上面看到的，就是那套背景的单独展示版。
        </p>
      </section>

      <section className={styles.section}>
        <h3>① 背景不是某个页面特效，而是挂在根布局里的全站底层</h3>
        <p>
          当前项目在 <code>app/layout.tsx</code> 里直接渲染 <code>&lt;MeshBackground /&gt;</code>，
          然后正文内容再放到一个相对定位、带 <code>z-10</code> 的内容层里。
          这样做的结果是：首页、工具页、文章页都会共享同一套背景语气，不用每个页面各自重写一遍。
        </p>
        <pre className={styles.code}>
{`<body className="min-h-full text-ink">
  <MeshBackground />
  <div className="relative z-10 flex min-h-full flex-col">
    <SiteNav />
    <main>{children}</main>
  </div>
</body>`}
        </pre>
      </section>

      <section className={styles.section}>
        <h3>② DOM 结构非常薄：5 个色块 + 1 个 SVG 噪点层</h3>
        <p>
          真正的背景组件 <code>components/mesh-background.tsx</code> 几乎没有逻辑，
          只输出 5 个 <code>span</code> 和 1 个覆盖全屏的 <code>svg</code>。
          也就是说，这个效果不是靠 canvas、不是靠 WebGL，更不是靠一段持续跑的 JavaScript，
          而是把视觉元素拆成最小的几个层。
        </p>
        <pre className={styles.code}>
{`<div className="mesh-bg" aria-hidden>
  <span className="mesh-blob b1" />
  <span className="mesh-blob b2" />
  <span className="mesh-blob b3" />
  <span className="mesh-blob b4" />
  <span className="mesh-blob b5" />
</div>
<svg className="grain-overlay">...</svg>`}
        </pre>
      </section>

      <section className={styles.section}>
        <h3>③ 之所以像“纸面上的空气”，靠的是颜色、模糊和混合模式</h3>
        <p>
          背景底色先定成暖纸色 <code>--paper: #f4efe6</code>，再给每个 blob 设一张
          <strong> radial-gradient </strong>。这些色块本身边缘就是透明的，再叠上
          <code>filter: blur(110px)</code>，最后统一用 <code>mix-blend-mode: multiply</code>
          压到纸面上，于是颜色不会像霓虹灯一样浮在上层，而会更像渗进底材里的墨或粉彩。
        </p>
      </section>

      <section className={styles.section}>
        <h3>④ 动起来的关键不是“转”，而是每团 blob 各走各的路径</h3>
        <p>
          在 <code>app/globals.css</code> 里，5 团 blob 各自有不同的尺寸、初始位置、透明度和
          keyframes。动画只做两件事：<strong>位移</strong>和 <strong>缩放</strong>。因为每团颜色的方向、
          节奏都不一样，所以画面会一直轻微变化，但又不会像炫技背景那样喧宾夺主。
        </p>
        <pre className={styles.code}>
{`.mesh-blob.b1 {
  width: 62vw;
  height: 62vw;
  top: -18vw;
  left: -12vw;
  background: radial-gradient(closest-side, #ffb4a2 0%, transparent 72%);
  animation: drift-a 34s ease-in-out infinite alternate;
}

@keyframes drift-a {
  0%   { transform: translate3d(0, 0, 0) scale(1); }
  50%  { transform: translate3d(6vw, 10vh, 0) scale(1.12); }
  100% { transform: translate3d(-4vw, 5vh, 0) scale(0.94); }
}`}
        </pre>
      </section>

      <section className={styles.section}>
        <h3>⑤ 颗粒层和层级控制，决定了它“有质感但不挡事”</h3>
        <p>
          那层 <code>grain-overlay</code> 是一个 SVG turbulence 过滤器，强度很轻，
          作用不是制造明显噪点，而是打散纯色大面积区域，让背景更像真实材质。
          同时背景层和颗粒层都设了 <code>pointer-events: none</code>，正文容器则放在更高 z-index，
          所以视觉在动，交互不会被遮住。
        </p>
      </section>

      <section className={styles.section}>
        <h3>⑥ 这个新栏目怎么做的：把全站背景改写成“局部舞台版”</h3>
        <p>
          主页原始版本的背景是固定铺满整个视口的，不适合直接塞进单独工具页顶部。
          所以这次新栏目没有硬搬全局实现，而是复用了
          <code>components/beautifier/mesh-orbs-background.tsx</code> 这个
          <strong>局部容器版</strong>：颜色、层数、运动逻辑都保持一致，但定位从
          <code>fixed</code> 改成了填满父容器的 <code>absolute</code>，因此能像第 11 栏那样，
          在上方完整展示动态背景、下方接一篇中文解读。
        </p>
      </section>

      <section className={styles.section}>
        <h3>相关文件</h3>
        <ul className={styles.links}>
          <li>
            <code>app/layout.tsx</code>：把全站背景挂到根布局。
          </li>
          <li>
            <code>components/mesh-background.tsx</code>：原始全屏背景组件。
          </li>
          <li>
            <code>app/globals.css</code>：blob 颜色、模糊、keyframes、grain 样式。
          </li>
          <li>
            <code>components/beautifier/mesh-orbs-background.tsx</code>：当前展示页用的局部容器版。
          </li>
          <li>
            <code>components/toolbox-background/*</code>：这次新增的栏目页与中文介绍。
          </li>
        </ul>
      </section>
    </article>
  );
}
