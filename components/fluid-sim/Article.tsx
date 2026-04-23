/* eslint-disable react/no-unescaped-entities */

export function Article() {
  return (
    <article id="fluid-article-anchor" className="hpi-article">
      <header className="hpi-article-header">
        <div className="hpi-article-overline">Reading Notes · 中文解读</div>
        <h2 className="hpi-article-title">
          <em>GPU 上的 Navier–Stokes</em>：1645 行 JS 里都在做什么
        </h2>
      </header>

      <section className="hpi-article-section">
        <p>
          Pavel Dobryakov 的 <strong>WebGL Fluid Simulation</strong> 是 GitHub 上超过
          <strong> 16k star </strong>的经典 demo：一块全屏 canvas，鼠标划过就喷出发光液体。
          它完全没有用 Three.js 或任何 3D 框架，只是一个单文件 <code>script.js</code>，1645 行，
          把<strong>经典 Navier–Stokes 方程</strong>在 GPU 上求解出来。下面把这 1645 行拆成五段看。
        </p>
      </section>

      <section className="hpi-article-section">
        <h3>① 一屏即一张网格：为什么 GPU 特别适合算流体</h3>
        <p>
          把整个 canvas 想象成一张 <code>SIM_RESOLUTION × SIM_RESOLUTION</code> 的网格（默认 128×128）。
          每个格子里有两个量：<strong>速度</strong>（二维向量，存在一张 RG 纹理里）和
          <strong>染料</strong>（RGB 颜色，存在一张 RGBA 纹理里）。
          流体每一步的演化都是"每个格子独立"地查阅相邻格子的值然后写回自己 ——
          这正是 fragment shader 天生擅长的事。所以整套模拟不跑 CPU，而是一连串 draw call。
        </p>
      </section>

      <section className="hpi-article-section">
        <h3>② 六步管线：Navier–Stokes 是怎么拆成 6 个 shader 的</h3>
        <p>
          每帧里 <code>step(dt)</code> 按下面顺序跑六个 program：
        </p>
        <pre className="hpi-code">
{`// script.js → step(dt)
curlProgram.bind();           // ① 算旋度 curl
vorticityProgram.bind();      // ② 按旋度加"涡度约束"力
divergenceProgram.bind();     // ③ 算散度 divergence
// ④ 清理上一帧压力场
// ⑤ Jacobi 迭代 20 次解泊松方程（求压力场）
gradientSubtractProgram.bind();// ⑥ 用压力梯度把速度场"投影"回无散场
advectionProgram.bind();      // 最后 advection：让速度场和染料场顺着速度流动`}
        </pre>
        <p>
          其中第 ⑤ 步的 <strong>压力求解</strong> 是整套的核心：流体必须满足"不可压缩"约束
          （<code>∇·u = 0</code>），但 advection 之后速度场一般不再无散 ——
          需要解一个泊松方程 <code>∇²p = ∇·u</code>，然后把 <code>∇p</code> 减回去。
          GPU 上没法直接求解大线性系统，于是用 <strong>Jacobi 迭代</strong>：同一个 shader 跑 20 次，
          每次读相邻四个像素的 p 值、写回当前像素的新 p 值，像扩散一样收敛到解。
        </p>
      </section>

      <section className="hpi-article-section">
        <h3>③ 双缓冲纹理 "ping-pong"：shader 不能自读自写</h3>
        <p>
          WebGL 里一个 shader <strong>不能同时以一张纹理作为输入、又作为 render target</strong>。
          所以每个场（速度、染料、压力）都准备两份纹理 A/B。每一步从 A 读、写到 B，然后
          <code>[A, B] = [B, A]</code> 交换，下一步再从新 A 读、写到新 B。
          原代码里就是这个 <code>DoubleFBO</code>：
        </p>
        <pre className="hpi-code">
{`function createDoubleFBO (...) {
  let fbo1 = createFBO(...);
  let fbo2 = createFBO(...);
  return {
    get read() { return fbo1; },
    get write() { return fbo2; },
    swap() { [fbo1, fbo2] = [fbo2, fbo1]; }
  };
}`}
        </pre>
      </section>

      <section className="hpi-article-section">
        <h3>④ splatPointer：鼠标拖出的"力"和"染料"</h3>
        <p>
          用户拖鼠标时，代码在该位置"砸"两个高斯核：一个砸进速度场（产生推力），一个砸进染料场
          （产生颜色）。半径由 <code>config.SPLAT_RADIUS</code> 控制、颜色在
          <code>generateColor()</code> 里用 HSV 产生再乘 0.15 防止过曝。
          这就是为什么你画得越快、颜色喷得越远 —— 因为<strong>鼠标的 Δ 位移被直接当作速度向量</strong>，
          而速度越大 advection 把染料带走的距离就越长。
        </p>
      </section>

      <section className="hpi-article-section">
        <h3>⑤ Bloom + Sunrays：颜色之所以"发光"</h3>
        <p>
          如果直接把染料纹理贴到屏幕，它只是一张鲜艳的色块图。Pavel 在主渲染之后跑了两次后处理：
        </p>
        <ul>
          <li>
            <strong>Bloom</strong>：一张 256px 的亮度纹理，反复 downsample + upsample（8 次迭代），
            最后按权重混回主图 —— 高亮处"溢光"。
          </li>
          <li>
            <strong>Sunrays</strong>：从一张 196px 的亮度遮罩里沿 radial 方向做 blur，
            产生"透光的光线"效果。
          </li>
        </ul>
        <p>
          这两层叠加之后，同样的染料场就从"鲜艳色块"变成了"发光液体" —— 视觉效果的一大半其实是后处理给的。
        </p>
      </section>

      <section className="hpi-article-section">
        <h3>⑥ 移植到 Next.js 时踩的坑</h3>
        <ul>
          <li>
            原代码顶层直接 <code>const canvas = document.getElementsByTagName(&apos;canvas&apos;)[0]</code>，
            在 SPA 里切路由后这个引用仍然悬挂。改成 <code>initFluid(canvas)</code>
            接受一个 ref 参数。
          </li>
          <li>
            原 <code>requestAnimationFrame(update)</code> 没有停止机制 ——
            切出路由后还会一直转。必须把 <code>rafId</code> 保留、cleanup 时
            <code>cancelAnimationFrame</code>。
          </li>
          <li>
            <code>dat.gui</code> / Google Analytics / mobile 推广弹窗这些无关 UI 直接删掉，
            留下纯运行时。
          </li>
          <li>
            <code>window.addEventListener(&apos;keydown&apos;, ...)</code> 必须在
            unmount 时 <code>removeEventListener</code>，否则按空格仍然会往已卸载的组件里写 state。
          </li>
        </ul>
      </section>

      <section className="hpi-article-section">
        <h3>相关链接</h3>
        <ul className="hpi-links">
          <li>
            源码仓库：
            <a
              href="https://github.com/PavelDoGreat/WebGL-Fluid-Simulation"
              target="_blank"
              rel="noopener noreferrer"
            >
              github.com/PavelDoGreat/WebGL-Fluid-Simulation
            </a>
          </li>
          <li>
            作者原版演示：
            <a
              href="https://paveldogreat.github.io/WebGL-Fluid-Simulation/"
              target="_blank"
              rel="noopener noreferrer"
            >
              paveldogreat.github.io/WebGL-Fluid-Simulation
            </a>
          </li>
          <li>
            理论参考：
            <a
              href="https://developer.download.nvidia.com/books/HTML/gpugems/gpugems_ch38.html"
              target="_blank"
              rel="noopener noreferrer"
            >
              NVIDIA GPU Gems · Chapter 38 "Fast Fluid Dynamics Simulation on the GPU"
            </a>
          </li>
        </ul>
        <p className="hpi-article-sig">
          操作：鼠标拖动 / 触摸划动喷射液体；按空格键随机涟漪；按 P 键暂停。
        </p>
      </section>
    </article>
  );
}
