export function Article() {
  return (
    <article className="mt-16 prose prose-ai max-w-3xl mx-auto">
      <h2>生成对抗网络 (GAN) 原理详解</h2>
      
      <h3>什么是 GAN？</h3>
      <p>
        生成对抗网络（Generative Adversarial Network，简称 GAN）是由 Ian Goodfellow 等人在 2014 年提出的一种深度学习模型。
        GAN 的核心思想是通过两个神经网络的博弈来学习数据的分布。
      </p>

      <h3>核心组成部分</h3>
      
      <h4>1. 生成器 (Generator)</h4>
      <p>
        生成器的任务是从随机噪声中生成逼真的数据。它接收一个随机向量（通常来自正态分布），
        通过一系列的反卷积（或转置卷积）操作，逐步将低维度的噪声向量转换为高维度的数据（如图像）。
      </p>

      <h4>2. 判别器 (Discriminator)</h4>
      <p>
        判别器的任务是区分输入数据是真实的还是生成的。它接收一张图像，输出一个概率值，表示该图像是真实数据的概率。
      </p>

      <h3>训练过程</h3>
      <p>
        GAN 的训练是一个极小极大博弈（Minimax Game）过程：
      </p>
      <ol>
        <li>生成器试图生成越来越逼真的数据来欺骗判别器</li>
        <li>判别器试图提高区分真假数据的能力</li>
        <li>这个过程不断迭代，直到达到纳什均衡</li>
      </ol>

      <h3>损失函数</h3>
      <p>
        GAN 的目标函数可以表示为：
      </p>
      <div className="font-mono text-sm bg-gray-100 p-4 rounded-lg">
        min_G max_D V(D, G) = E_x~p_data(x)[log D(x)] + E_z~p_z(z)[log(1-D(G(z)))]
      </div>
      <p>其中：</p>
      <ul>
        <li>D(x) 表示判别器认为 x 是真实数据的概率</li>
        <li>G(z) 表示生成器从噪声 z 生成的数据</li>
        <li>p_data 是真实数据的分布</li>
        <li>p_z 是噪声的分布</li>
      </ul>

      <h3>GAN 的变体</h3>
      <p>
        自从原始 GAN 提出以来，研究者们提出了许多改进版本：
      </p>
      <ul>
        <li><strong>DCGAN</strong>: 使用深度卷积神经网络</li>
        <li><strong>WGAN</strong>: 使用 Wasserstein 距离</li>
        <li><strong>StyleGAN</strong>: 可控的风格生成</li>
        <li><strong>CycleGAN</strong>: 无监督图像转换</li>
      </ul>

      <h3>应用领域</h3>
      <p>
        GAN 在许多领域都有广泛的应用：
      </p>
      <ul>
        <li>图像生成和超分辨率</li>
        <li>图像风格转换</li>
        <li>数据增强</li>
        <li>视频生成</li>
        <li>文本到图像生成</li>
      </ul>

      <h3>训练挑战</h3>
      <p>
        训练 GAN 并不容易，常见的挑战包括：
      </p>
      <ul>
        <li><strong>模式崩溃</strong>: 生成器只生成有限种类的样本</li>
        <li><strong>训练不稳定</strong>: 损失函数难以收敛</li>
        <li><strong>梯度消失</strong>: 判别器太强导致生成器无法学习</li>
      </ul>
    </article>
  );
}