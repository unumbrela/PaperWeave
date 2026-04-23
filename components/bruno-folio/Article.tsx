/* eslint-disable react/no-unescaped-entities */

export function Article() {
  return (
    <article id="bruno-article-anchor" className="hpi-article">
      <header className="hpi-article-header">
        <div className="hpi-article-overline">Reading Notes · 中文解读</div>
        <h2 className="hpi-article-title">
          为什么 Bruno Simon 的 <em>folio-2019</em> 是一整个"地点"
        </h2>
      </header>

      <section className="hpi-article-section">
        <p>
          Bruno Simon 的 2019 年作品集把"简历"做成了一个可驾驶的 3D 沙盒 ——
          开一辆小卡车，路上有虚线指引你开往 "About" / "Projects" / "Playground"，
          每个项目用 3D 模型摆在地上，撞到会发声。它至今仍然是很多 Three.js
          教学里的"天花板示例"。下面按它的源码目录结构把核心亮点讲一遍。
        </p>
        <p>
          本页上方是原站 <code>bruno-simon.com</code> 的 iframe 嵌入 ——
          原项目含 <strong>17 个 World 子模块 + cannon 物理 + howler 音效 +
          自定义 Vite 插件链</strong>，任何"抽样移植"都会失去精髓，所以本工具采取
          "<strong>嵌入完整原作 + 中文源码解读</strong>" 的形式。
        </p>
      </section>

      <section className="hpi-article-section">
        <h3>① 顶层架构：Application → Camera / World / Resources / Passes</h3>
        <p>
          <code>src/javascript/Application.js</code> 是总入口，它依次拉起四个大模块：
        </p>
        <ul>
          <li>
            <strong>Resources</strong>：资源加载器，所有 <code>.glb</code> / 贴图 / 字体先加载好
          </li>
          <li>
            <strong>Camera</strong>：正交 + orbit controls 混合，他自己写了一个
          </li>
          <li>
            <strong>World</strong>：整张地图的"世界"，见下面
          </li>
          <li>
            <strong>Passes</strong>：自定义后处理链（blur / glows / …）
          </li>
        </ul>
        <p>
          值得学的设计：<strong>把 "资源加载" 和 "场景装配" 拆得非常干净</strong>。
          Resources 完成后才会 new World。这让首屏 loading 能精准知道"还差几个 asset"。
        </p>
      </section>

      <section className="hpi-article-section">
        <h3>② World/Zones + World/Areas：按坐标分区加载</h3>
        <p>
          这个站的地图其实很大 —— 你开着卡车可以走出去很远。如果所有 3D 模型一次性加载，
          首屏会挂掉。他的解决方案是两层：
        </p>
        <ul>
          <li>
            <strong>Zone</strong>：一个矩形区域，玩家的卡车进来时触发 enter 事件、出去时触发 leave。
            用于给相机、音乐、镜头景深换档。
          </li>
          <li>
            <strong>Area</strong>：地上一个"可交互触点"（圆形高亮区）。开进去按键会触发
            "打开项目链接" / "播放彩蛋" 等。
          </li>
        </ul>
        <p>
          两者都由 <code>Zones.js</code> / <code>Areas.js</code> 做注册中心。
          想加一个新区域只要 <code>zones.add({`{ position, size, onEnter }`})</code>
          就行 —— 整个站的扩展性来自这种平台化设计。
        </p>
      </section>

      <section className="hpi-article-section">
        <h3>③ World/Tiles：地面上的虚线箭头怎么做的</h3>
        <p>
          Bruno 这个站最出名的细节是 ——
          <strong>地上那条白色虚线一路引你到各个项目</strong>。没有 UI、没有 tooltip，
          纯靠"美术引导"告诉用户该往哪走。看 <code>World/Tiles.js</code>：每一小段虚线
          其实是一个独立 <code>PlaneGeometry</code>，按玩家首次接近顺序 fade in，
          再按离开顺序 fade out。
        </p>
        <p>
          这种"不用文字告诉用户路径、但一定让用户能找到"的设计，是整个站的灵魂 ——
          也是"把作品集做成地点"成立的关键。
        </p>
      </section>

      <section className="hpi-article-section">
        <h3>④ World/Physics + cannon.js：怎么让卡车能"开"</h3>
        <p>
          载具物理用的是 <strong>cannon.js</strong>（已归档，现在推荐 cannon-es）。核心是
          <code>RaycastVehicle</code>：用一根从车底射下去的射线来代替真实的轮胎几何 ——
          碰到地面给一个反作用力，速度根据方向键累加。代码量只有 ~200 行，却已经足够
          产生"有惯性、能漂移"的手感。复杂物理（真实轮胎形变、打滑）他都跳过 ——
          而这正是演示级项目的正确取舍。
        </p>
      </section>

      <section className="hpi-article-section">
        <h3>⑤ World/Sounds + howler：手感一半靠声音</h3>
        <p>
          每一个 Area、每一下碰撞都有音效。<code>Sounds.js</code> 里给每个事件注册一个或多个
          <code>howler</code> 实例，随机选择播放其中一个，避免"每次听起来一样"。
          音量按"距离相机"做衰减。这让整个地图像真的有"物理感" ——
          即使画面停着不动，仅音效就足以让人产生"场所"的错觉。
        </p>
      </section>

      <section className="hpi-article-section">
        <h3>⑥ 值得偷师的决策</h3>
        <ul>
          <li>
            <strong>不做一张酷炫但无意义的 hero</strong>：整个作品集就是作品本身，
            项目信息以"地标"方式散落在地图上。
          </li>
          <li>
            <strong>资源/场景/物理/UI 全分层</strong>：World/ 里 17 个子模块各司其职，
            任何一个模块挂掉也能定位。
          </li>
          <li>
            <strong>物理层用最轻的可行版</strong>：没有试图做工业级车辆物理，
            因为目标是"能玩"而不是"真实"。
          </li>
          <li>
            <strong>资产不隐藏</strong>：仓库里有 Blender 源文件，任何人都能打开看他是怎么
            建模、怎么设材质的。这是"作品集作为开源教学资源"的最高境界。
          </li>
        </ul>
      </section>

      <section className="hpi-article-section">
        <h3>⑦ 为什么本页采用 iframe 嵌入 + 解读，而不是整码迁移</h3>
        <p>
          原项目的依赖：<code>three</code>、<code>cannon</code>、<code>gsap</code>、
          <code>howler</code>、<code>dat.gui</code>、<code>vite-plugin-glsl</code>、
          <code>vite-plugin-restart</code>；资源体积数十 MB；
          <code>src/javascript/World/</code> 下 17 个子模块 + <code>src/javascript/Passes/</code>
          自定义后处理。把它完整移植到 Next.js 的单路由，工作量≈重写这个项目。
          让你在本站内 iframe 访问原作 + 拿到中文源码解读，是时间性价比更高的方式。
        </p>
      </section>

      <section className="hpi-article-section">
        <h3>相关链接</h3>
        <ul className="hpi-links">
          <li>
            2019 版源码：
            <a
              href="https://github.com/brunosimon/folio-2019"
              target="_blank"
              rel="noopener noreferrer"
            >
              github.com/brunosimon/folio-2019
            </a>
          </li>
          <li>
            2025 版源码：
            <a
              href="https://github.com/brunosimon/folio-2025"
              target="_blank"
              rel="noopener noreferrer"
            >
              github.com/brunosimon/folio-2025
            </a>
          </li>
          <li>
            作者原站：
            <a
              href="https://bruno-simon.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              bruno-simon.com
            </a>
          </li>
          <li>
            作者 Three.js 付费课程：
            <a
              href="https://threejs-journey.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              threejs-journey.com
            </a>
          </li>
        </ul>
      </section>
    </article>
  );
}
