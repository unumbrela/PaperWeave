/* eslint-disable react/no-unescaped-entities */

export function Article() {
  return (
    <article id="hamish-article-anchor" className="hpi-article">
      <header className="hpi-article-header">
        <div className="hpi-article-overline">Reading Notes · 中文解读</div>
        <h2 className="hpi-article-title">
          <em>位移球体</em>：100 行 React + 326 行 GLSL 的小奇迹
        </h2>
      </header>

      <section className="hpi-article-section">
        <p>
          Hamish Williams 的个人作品集（<strong>2k+ stars</strong>）里最出圈的是开场的这个
          Hero：一个飘在屏幕一角、表面不停流动的 3D 球体，加上左上角"日文片假名解码"出来的文字。
          很多教程把它当作"React + Three.js 最小可感"的示范。下面把两个核心拆开看。
        </p>
      </section>

      <section className="hpi-article-section">
        <h3>① 为什么不用 ShaderMaterial —— onBeforeCompile 的好处</h3>
        <p>
          通常做一颗"噪声位移球"的方法是：写一个 <code>ShaderMaterial</code>，自己处理光照。
          但光照代码很长，写错了要么漆黑一片、要么塑料感。Hamish 的做法更巧：保留 Three.js 自带的
          <code>MeshPhongMaterial</code>（光照已经算好了），通过 <code>onBeforeCompile</code>
          钩子在编译前替换 shader 源码：
        </p>
        <pre className="hpi-code">
{`material.onBeforeCompile = shader => {
  uniforms = UniformsUtils.merge([
    shader.uniforms,
    { time: { type: 'f', value: 0 } },
  ]);
  shader.uniforms = uniforms;
  shader.vertexShader = VERTEX_SHADER;   // 自己写的
  shader.fragmentShader = FRAGMENT_SHADER; // 自己写的
};`}
        </pre>
        <p>
          自写 shader 里只要把 Three.js 的那些 <code>#include &lt;normal_vertex&gt;</code>、
          <code>#include &lt;lights_phong_fragment&gt;</code> 一并保留，就自动继承了
          Phong 光照模型 —— 位移加在"最后那一步 <code>gl_Position</code>"就可以。
        </p>
      </section>

      <section className="hpi-article-section">
        <h3>② 表面"流动"的核心：turbulence = 多层 pnoise 叠加</h3>
        <p>
          顶点位移靠的是经典的 <strong>Perlin noise</strong>（pnoise）。单层噪声太"干净"，
          他叠了 10 层 —— 频率越高权重越低：
        </p>
        <pre className="hpi-code">
{`float turbulence(vec3 p) {
  float w = 100.0;
  float t = -0.5;
  for (float f = 1.0; f <= 10.0; f++) {
    float power = pow(2.0, f);
    t += abs(pnoise(vec3(power * p), vec3(10.0)) / power);
  }
  return t;
}`}
        </pre>
        <p>
          然后在 <code>main()</code> 里把顶点原位置 + normal + time 作为噪声输入，
          再把结果乘回位置：
        </p>
        <pre className="hpi-code">
{`noise = turbulence(0.01 * position + normal + time * 0.8);
vec3 displacement = position * noise;
gl_Position = projectionMatrix * modelViewMatrix
            * vec4((position + normal) + displacement, 1.0);`}
        </pre>
        <p>
          <code>time * 0.8</code> 是让噪声沿第四维慢慢流动 —— 所以球表面像有"液体"在绕着转。
          <code>position + normal</code> 作为种子，保证每颗顶点都有唯一输入，不会产生条纹。
        </p>
      </section>

      <section className="hpi-article-section">
        <h3>③ 片元着色器：把噪声值直接当颜色种子</h3>
        <p>
          片元 shader 里接收 vertex 传来的 <code>noise</code> varying，
          然后直接用它来生成颜色：
        </p>
        <pre className="hpi-code">
{`vec3 color = vec3(vUv * (0.2 - 2.0 * noise), 1.0);
vec3 finalColors = vec3(color.b * 1.5, color.r, color.r);
vec4 diffuseColor = vec4(cos(finalColors * noise * 3.0), 1.0);`}
        </pre>
        <p>
          这就是整颗球呈现"粉紫蓝"三色渐变的原因 —— 不来自贴图，而是
          <strong>用噪声值做颜色空间里的三角函数</strong>。Phong 光照之后高光一打，
          就有了"金属感液体"的质感。
        </p>
      </section>

      <section className="hpi-article-section">
        <h3>④ DecoderText：Framer Motion spring 当动画时钟</h3>
        <p>
          左上角姓名的"片假名 → 真值"动画没用 setInterval，而是一根
          <code>useSpring(0, ...)</code>，然后 <code>spring.set(text.length)</code>。
          spring 每帧吐出一个介于 0 和 length 之间的浮点值，shuffle 函数按这个值
          决定"第 i 位字符是真值还是随机片假名"：
        </p>
        <pre className="hpi-code">
{`function shuffle(content, output, position) {
  return content.map((value, index) => {
    if (index < position) return { type: 'value', value };
    if (position % 1 < 0.5) {
      const rand = Math.floor(Math.random() * GLYPHS.length);
      return { type: 'glyph', value: GLYPHS[rand] };
    }
    return { type: 'glyph', value: output[index].value };
  });
}`}
        </pre>
        <p>
          用 spring 的好处：动画自带缓动、用户切页回来会接着演、永远不会"突然跳完"。
          用 setInterval 写这个至少要多出 20 行边缘情况处理。
        </p>
      </section>

      <section className="hpi-article-section">
        <h3>⑤ 移植到 Next.js 时踩的坑</h3>
        <ul>
          <li>
            原项目是 Remix + Vite，shader 用 <code>?raw</code> import。Next.js 需要加
            loader 配置才行，这里直接把 GLSL 粘进
            <code> shaders.ts</code> 作为模板字符串 ——
            一份 245 行顶点 + 81 行片元，足够了。
          </li>
          <li>
            原 <code>DisplacementSphere</code> 用了 <code>useTheme</code> 控制光照强度。
            本页固定深色，灯光直接给固定值 <code>DirectionalLight 2.0 / AmbientLight 0.4</code>。
          </li>
          <li>
            <code>useInViewport</code> / <code>useWindowSize</code> / <code>Transition</code>
            / <code>useHydrated</code> 全部简化成 <code>useState(false) → useEffect(setTrue)</code>。
          </li>
          <li>
            <code>framer-motion</code> v11 的 <code>useSpring.on(&apos;change&apos;, ...)</code>
            返回 unsubscribe 函数，记得在 cleanup 里调用，避免切路由后 spring 还在
            往已卸载 DOM 里写 innerHTML。
          </li>
        </ul>
      </section>

      <section className="hpi-article-section">
        <h3>相关链接</h3>
        <ul className="hpi-links">
          <li>
            源码仓库：
            <a
              href="https://github.com/HamishMW/portfolio"
              target="_blank"
              rel="noopener noreferrer"
            >
              github.com/HamishMW/portfolio
            </a>
          </li>
          <li>
            作者原站：
            <a
              href="https://hamishw.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              hamishw.com
            </a>
          </li>
          <li>
            核心源文件：
            <code>app/routes/home/displacement-sphere.jsx</code>、
            <code>displacement-sphere-vertex.glsl</code>、
            <code>displacement-sphere-fragment.glsl</code>、
            <code>decoder-text.jsx</code>
          </li>
        </ul>
      </section>
    </article>
  );
}
