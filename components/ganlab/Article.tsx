import React from 'react'

export function Article() {
  return (
    <article className="mt-8 prose max-w-3xl">
      <h2>什么是 GAN？</h2>
      <p>
        生成对抗网络（GAN）通过两个网络——生成器（Generator）和判别器（Discriminator）——互相博弈来学习数据分布。
        生成器负责从噪声中合成样本，判别器负责区分样本是真实的还是生成的。训练过程中，两者交替优化，最终希望生成器能产生以假乱真的样本。
      </p>
      <h3>本演示说明</h3>
      <p>
        本页面演示了一个简化的 2D-GAN：
      </p>
      <ul>
        <li>支持多种目标分布（高斯、环形、双月）以便观察生成器学习路径。</li>
        <li>可视化判别器在平面上的分类（热力图），以及真实样本与生成样本的分布。</li>
        <li>实时显示生成器/判别器的损失曲线与 JS 散度指标，用于衡量生成分布与真实分布的差异。</li>
      </ul>
    </article>
  )
}
