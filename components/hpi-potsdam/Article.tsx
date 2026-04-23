export function Article() {
  return (
    <article id="hpi-article-anchor" className="hpi-article">
      <header className="hpi-article-header">
        <div className="hpi-article-overline">Reading Notes · 中文解读</div>
        <h2 className="hpi-article-title">
          这个 <em>3D 星图首页</em> 是怎么做出来的
        </h2>
      </header>

      <section className="hpi-article-section">
        <p>
          这是 HPI Potsdam 2025 iGEM 队伍给自己项目 <strong>BioComplete</strong>
          做的首页。表面是一个 7 万多颗粒子组成的星海，背后把他们训练的 DNA 语言模型产出的嵌入
          空间直接“物化”成了可以用鼠标漫游的场景——相机越推越近时，文案三段式切换、图例与箭头依次
          浮出。下面把首页里最核心的几块拆开看，并贴上对应的源码。
        </p>
      </section>

      <section className="hpi-article-section">
        <h3>① 数据：3.6MB CSV 里存的就是嵌入坐标</h3>
        <p>
          每颗“星星”是 iGEM Registry 里真实的一个生物零件。CSV 的每一行是
          <code>id, part_type, x, y, z, name</code>——
          x/y/z 就是他们 DNA 模型降维到三维后的嵌入坐标。前端只做一次 <code>Papa.parse</code> 就把几万行读进内存：
        </p>
        <pre className="hpi-code">
{`Papa.parse(csvText, {
  header: true,
  dynamicTyping: true,
  skipEmptyLines: true,
  complete: (results) => {
    setRows(results.data as DataRow[]);
  },
});`}
        </pre>
      </section>

      <section className="hpi-article-section">
        <h3>② 渲染：不用 drei 的 Points，手写 shader</h3>
        <p>
          几万颗粒子走默认材质会糊成一团，他们为此写了自己的
          <code>ShaderMaterial</code>。顶点着色器里做了两件关键的事：
          <strong>按距离做 size attenuation</strong>（远的星星自动变小但不失真）、
          并在粒子“初始随机位置”和“最终嵌入坐标”之间做 <code>mix</code> 插值——
          这就是后面“粒子从混沌收敛”动画的基础：
        </p>
        <pre className="hpi-code">
{`// vertexShader（节选）
attribute vec3 aInitialPosition;
uniform float uConvergenceProgress;   // 0 = 散乱, 1 = 归位

void main() {
  vec3 finalPosition = mix(aInitialPosition, position, uConvergenceProgress);
  vec4 mvPosition = modelViewMatrix * vec4(finalPosition, 1.0);
  float dist = -mvPosition.z;
  float attenuation = clamp(300.0 / dist, 0.0, 10.0);
  gl_PointSize = aSize * attenuation;
  gl_Position = projectionMatrix * mvPosition;
}`}
        </pre>
        <p>
          片元着色器把每个方块粒子画成“带光晕的圆盘”：用
          <code>gl_PointCoord</code> 做圆心距离，<code>smoothstep</code>
          做柔化边缘，再叠一个小范围的中心 glow，Bloom 后处理一加上去，
          星空那种“扎眼但不刺眼”的质感就出来了。
        </p>
      </section>

      <section className="hpi-article-section">
        <h3>③ 叙事：三段式文案靠“相机距离”驱动</h3>
        <p>
          文案切换不用 scroll position，而是一个叫 <code>CameraController</code>
          的组件每帧读取 <code>camera.position</code> 相对初始位置的距离，把它
          <strong>往上抛给 React state</strong>：
        </p>
        <pre className="hpi-code">
{`useFrame(() => {
  if (initialPosition.current === null) {
    initialPosition.current = camera.position.clone();
  }
  const distance = camera.position.distanceTo(initialPosition.current);
  onCameraMove(distance);     // ← 向上冒泡到 Home
});`}
        </pre>
        <p>
          <code>Home.tsx</code> 拿到这个距离以后做一个<strong>单向状态机</strong>
          （<code>maxDistanceReached</code> 只增不减，避免用户缩回去时倒放），
          两个阈值把动画切成三幕：
        </p>
        <pre className="hpi-code">
{`if (effectiveDistance < 100) {
  // 第一幕：Lost in Parts / Buried in Data
  show(heroContentRef); hide(secondTextRef, legendRef, scrollArrowRef);
} else if (effectiveDistance < 300) {
  // 第二幕：Explore the iGEM Registry
  hide(heroContentRef); show(secondTextRef);
} else {
  // 第三幕：显示 Part Type 图例 + 向下箭头
  hide(secondTextRef); show(legendRef, scrollArrowRef);
}`}
        </pre>
        <p>
          顺带一提：“收敛进度”也是从这个距离算出来的，直接作为
          <code>uConvergenceProgress</code> uniform 喂给 shader：
        </p>
        <pre className="hpi-code">
{`const newProgress = Math.min(maxDistanceReached.current / 320.0, 1.0);
setConvergenceProgress(newProgress);
// 再透传给 <Starfield3D convergenceProgress={...} />`}
        </pre>
        <p>
          于是“用户往前推相机”这一个输入，<strong>同时驱动了文案切换 + 粒子收敛</strong>——
          两个看似独立的动画在观感上永远同步。
        </p>
      </section>

      <section className="hpi-article-section">
        <h3>④ 交互：把过滤状态编码进 attribute</h3>
        <p>
          点击右下图例里的 “CDS / Promoter / RBS…”，被选中的类保持原色，其他的变暗。
          这次移植里把过滤状态提前编码成 <code>aHighlight</code> attribute（1 = 高亮、0 = 无过滤、
          -1 = 变暗），shader 直接读取这列 buffer。为了兼容 React 19 的 hooks lint，
          这列 attribute 在构建几何体时一并生成：
        </p>
        <pre className="hpi-code">
{`const geometryData = useMemo(
  () => buildGeometryFromRows(dataRows, true, animateConvergence, highlightPartType),
  [dataRows, animateConvergence, highlightPartType],
);

// buildGeometryFromRows 内部
partTypes[i] = row.part_type || "";
highlights[i] =
  highlightPartType == null ? 0 :
  partTypes[i] === highlightPartType ? 1 : -1;
geometry.setAttribute("aHighlight", new THREE.BufferAttribute(highlights, 1));`}
        </pre>
        <p>
          片元着色器里那行 <code>vHighlight &lt; -0.5 ? 0.25 : 1.0</code>
          就是在做这件事。好处：过滤逻辑仍然只是多传一列 float attribute 给 GPU，
          渲染层不需要额外的 DOM 或 React 状态 diff。
        </p>
      </section>

      <section className="hpi-article-section">
        <h3>⑤ 移植到 Next.js 时踩的坑</h3>
        <ul>
          <li>
            原项目是 Vite，用 <code>import.meta.env.BASE_URL</code> 拼静态资源路径。
            Next.js 里统一换成 <code>/hpi-potsdam/</code>——CSV 和 favicon 直接放在
            <code>public/hpi-potsdam/</code>。
          </li>
          <li>
            <code>window.matchMedia</code> 不能在 SSR 初始值里调用。原代码
            <code>useState(() =&gt; window.matchMedia(q).matches)</code> 被改成服务端回落
            <code>false</code>、客户端初始化时再读取真实值。
          </li>
          <li>
            <code>HoverLabelProjector</code> 的 <code>useFrame</code> 每帧都在
            <code> setState</code>，React 19 下直接报 “Maximum update depth exceeded”。
            加了 <code>lastRef</code> 做帧间 diff，只在坐标变化超过 0.5px 时才 setState。
          </li>
          <li>
            StarField 的 <code>“use client”</code> 必须标，否则 SSR 会尝试执行
            <code> three</code> 的 WebGL 代码直接崩。
          </li>
        </ul>
      </section>

      <section className="hpi-article-section">
        <h3>相关链接</h3>
        <ul className="hpi-links">
          <li>
            原站首页：
            <a
              href="https://2025.igem.wiki/hpi-potsdam/"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://2025.igem.wiki/hpi-potsdam/
            </a>
          </li>
          <li>
            BioComplete 产品：
            <a
              href="https://biocomplete.it/"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://biocomplete.it/
            </a>
          </li>
          <li>
            iGEM 团队仓库（代码来源）：
            <a
              href="https://gitlab.igem.org/2025/hpi-potsdam"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://gitlab.igem.org/2025/hpi-potsdam
            </a>
          </li>
          <li>
            核心源文件：
            <code>src/components/StarField.tsx</code>、<code>src/contents/home.tsx</code>、
            <code>src/contents/LandingPage.css</code>
          </li>
          <li>
            数据权重：
            <a
              href="https://doi.org/10.5281/zenodo.17190661"
              target="_blank"
              rel="noopener noreferrer"
            >
              Zenodo · DNA model &amp; embeddings
            </a>
          </li>
        </ul>
      </section>
    </article>
  );
}
