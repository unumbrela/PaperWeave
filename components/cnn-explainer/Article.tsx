export function Article() {
  return (
    <article className="prose-ai mx-auto mt-16 max-w-[72ch]">
      <h2>什么是卷积神经网络？</h2>
      <p>
        在机器学习里，<em>分类器</em>的任务是给输入的数据点贴一个标签。
        比如<em>图像分类器</em>接收一张图像，输出一个类别——鸟、飞机、或者披萨。
        <strong>卷积神经网络（CNN）</strong>就是一种特别擅长解决这类问题的分类器。
      </p>
      <p>
        CNN 是神经网络的一种，本质上是一个由大量神经元层层堆叠而成、带有可学习权重与偏置的函数。
        把上面那个可视化里出现的概念一个个拆解：
      </p>
      <ol>
        <li>
          <strong>张量（tensor）</strong>：可以理解为 n 维矩阵。
          上图中除输出层外，所有张量都是三维的（高 × 宽 × 通道）。
        </li>
        <li>
          <strong>神经元（neuron）</strong>：接收多个输入、输出一个值的函数。
          上图里那些从<span style={{ color: "#d25560" }}>红</span>到
          <span style={{ color: "#3F7FBC" }}>蓝</span>的热力图就是神经元的输出，叫 <em>激活图（activation map）</em>。
        </li>
        <li>
          <strong>层（layer）</strong>：一组共享超参数、执行同样操作的神经元。
        </li>
        <li>
          <strong>卷积核权重与偏置</strong>：每个神经元独有，训练阶段学到。
          它们让模型有能力从数据中&ldquo;抽象出特征&rdquo;。
        </li>
        <li>
          <strong>类别分数</strong>：输出层给出的、每个类别对应的可微分得分。
        </li>
      </ol>

      <h2 id="article-input">输入层</h2>
      <p>
        最左侧的输入层就是原始图像。因为我们用 RGB 图像，所以这一层有三个通道：
        红、绿、蓝。Hover 到左侧三个小格子上能看到每个通道的灰度可视化。
      </p>

      <h2 id="article-convolution">卷积层</h2>
      <p>
        卷积层是 CNN 的核心——它储存了训练学到的卷积核（kernel），
        这些 kernel 负责从前一层的输出中提取特征。Hover 到任意一个卷积层神经元，
        你会看到它和前一层之间的连边被点亮——每一条连边代表一个独特的 kernel。
      </p>
      <p>
        卷积神经元的计算很直白：用 kernel 和前一层对应神经元的输出做 3×3 的逐元素乘加，
        滑窗扫完整张 feature map，得到一个中间结果；对所有 kernel 的中间结果求和，
        再加上可学习的偏置，就是这个神经元的激活图。
      </p>
      <p>
        Tiny VGG 的第一个卷积层有 10 个神经元，上游输入层有 3 个（RGB）。
        因此这一层一共学到 <strong>3 × 10 = 30</strong> 个 3×3 的 kernel。
      </p>

      <h2>激活函数 ReLU</h2>
      <p>
        ReLU(x) = max(0, x)——把负值压成 0，正值原样透传。
        这个简单到近乎粗暴的非线性函数，是深层 CNN 性能飞跃的关键：
        没有非线性，多层卷积的堆叠会坍缩成一层线性变换。
      </p>

      <h2 id="article-pooling">池化层</h2>
      <p>
        Tiny VGG 里用的是 <strong>Max-Pooling</strong>。
        用一个 2×2 的窗口以步长 2 滑过输入，每次取窗口内的最大值。
        这样的后果是——75% 的激活直接被丢弃。这看似浪费，实际上让网络更轻、更抗过拟合。
      </p>

      <h2>Flatten + 全连接 + Softmax</h2>
      <p>
        最后一个池化层之后，三维张量被 <em>flatten</em> 拉平成一维向量，
        接一个全连接层得到 10 个原始分数（logits），
        再经 Softmax 归一化成 10 个概率——就是上图最右侧那条彩色条形的长度。
      </p>

      <h2 id="article-softmax">为什么用 Softmax</h2>
      <p>
        Softmax 的形式是 <code>exp(x_i) / Σ exp(x_j)</code>。
        它做两件事：一是把任意实数压到 (0, 1) 区间，
        二是放大最大值——相当于一个&ldquo;软版的 argmax&rdquo;。
        因为它可导，所以适合做反向传播。
      </p>

      <div className="hairline my-10" />

      <p className="text-[13px] text-ink-3">
        本页面基于{" "}
        <a
          href="https://github.com/poloclub/cnn-explainer"
          target="_blank"
          rel="noreferrer"
        >
          CNN Explainer
        </a>{" "}
        (Wang et al., <em>IEEE TVCG</em> 2020) 的开源实现二次创作。
        原项目用 MIT 协议发布；本站对其主视觉做了深度简化以嵌入工具箱。
      </p>
    </article>
  );
}
