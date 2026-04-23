export function Article() {
  return (
    <article className="prose-ai mx-auto mt-16 max-w-[72ch]">
      <h2>为什么是 FWMamba-UNet</h2>
      <p>
        医学图像分割长期由 U-Net 统治，它把编码器的层级特征通过 skip connection
        逐级送回解码器，兼顾全局语义和局部定位。最近两年，
        <strong>Mamba / 状态空间模型（SSM）</strong>
        以线性复杂度的 token 混合能力挤进赛道——
        <em>VM-UNet</em> 把 Transformer 替换成 Mamba 块，推理更快，内存更省。
      </p>
      <p>
        但 Mamba 有个被论文（Yu et al., 2024）点破的毛病：
        <strong>低频偏差</strong>——选择性扫描本质上是个&ldquo;软低通滤波器&rdquo;，
        学低频平滑内容快，学高频边界细节慢。在皮肤病变这类
        <span className="serif-italic">边界糊</span>的任务上，这直接翻译成
        <em>分割边界不准</em>。
      </p>

      <h2 id="article-fwblock">FW-Mamba Block：从频率域补课</h2>
      <p>
        FWMamba-UNet 的核心是把每个 Mamba 块改造成
        <strong>双分支并行</strong>结构——一路照常跑 SS2D 负责全局语义（低频），
        另一路用 <strong>DWT（Haar 小波）</strong>
        把特征图拆成 4 个频带：
      </p>
      <ul>
        <li>
          <strong>LL</strong>：低频近似，保留整体轮廓；
        </li>
        <li>
          <strong>LH / HL</strong>：水平 / 垂直方向的高频，对应边缘走向；
        </li>
        <li>
          <strong>HH</strong>：对角细节，最容易被低通丢掉的那部分。
        </li>
      </ul>
      <p>
        三个高频带各自过一次 depthwise 卷积做&ldquo;细节提纯&rdquo;，然后用一个从全局平均池化
        学出来的 <em>α_low / α_high</em> 权重做加权 IDWT 重建。最后和 Mamba
        分支用 <em>β</em>（可学习标量，初值 0.1）融合回主干：
      </p>
      <pre className="text-[12.5px]">
        <code>{`out = x + DropPath( f_mamba + β · f_freq )`}</code>
      </pre>
      <p>
        β 很小意味着&ldquo;频率分支只做微调&rdquo;——这个设计让网络可以按层自适应：浅层
        边缘信号丰富时 β 自然被学大，深层语义为主时 β 降下去。
      </p>

      <h2 id="article-eaff">EAFF-Skip：边缘感知的 skip 融合</h2>
      <p>
        标准 U-Net 的 skip 就是把 encoder 特征直接加到 decoder 上。
        FWMamba 把 skip 也升了级——对 encoder 特征再做一次 DWT，
        把 {"{LH, HL, HH}"} 拼起来过 1×1 卷积 + sigmoid，
        得到一张<strong>边缘注意力图</strong>（0~1），再做：
      </p>
      <pre className="text-[12.5px]">
        <code>{`fused = dec + enc + edge_attn · enc`}</code>
      </pre>
      <p>
        直觉上：<em>边缘处</em>的 encoder 特征被额外加权一遍，
        decoder 在还原分辨率的时候更容易&ldquo;对上轮廓&rdquo;。
      </p>

      <h2 id="article-training">训练 & 指标（ISIC 2018）</h2>
      <p>
        上图的模型用 BCE+Dice + 轻量频率损失（<code>λ_edge=0.1, λ_freq=0.02</code>）
        训了 36 个 epoch，在 ISIC 2018 验证集上 Dice 0.8957，相比
        VM-UNet baseline 的 0.8883 提升 +0.74%，参数量代价 +10.1%。
        下方展示的是
        <strong>验证集上的真实预测</strong>——每张样本都附带
        Dice/IoU 数值和注意力热力图。
      </p>

      <h2 id="article-viz">关于可视化方式</h2>
      <p>
        和上一个 CNN 可视化工具不同的是，FWMamba 有 30M 参数 +
        自定义的 SS2D 算子，
        <strong>没法在浏览器里直接推理</strong>。所以这里采用
        <em>预计算 + 交互式展示</em>的做法：中间层激活是一次性从训练好的 checkpoint
        里导出来的（hooks + matplotlib 烘焙成 PNG），前端只负责组织和交互。
      </p>

      <div className="hairline my-10" />

      <p className="text-[13px] text-ink-3">
        本页面基于论文项目{" "}
        <span className="serif-italic">FWMamba-UNet</span>
        （ICIC 2026 投稿）的开源实现二次创作；
        FWMamba 的核心模块（FW-Block / EAFF-Skip / 轻量频率损失）
        由本站作者的研究团队提出。底层 backbone 复用{" "}
        <a
          href="https://github.com/JCruan519/VM-UNet"
          target="_blank"
          rel="noreferrer"
        >
          VM-UNet
        </a>（Ruan &amp; Xiang, 2024）。
      </p>
    </article>
  );
}
