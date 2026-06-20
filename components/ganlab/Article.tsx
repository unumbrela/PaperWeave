import React from 'react'

export function Article() {
  return (
    <article className="prose mt-8 max-w-3xl text-stone-700">
      <h2>什么是 GAN？</h2>
      <p>
        生成对抗网络（GAN）让两个网络互相博弈来学习数据分布：<strong>生成器</strong>（Generator）从随机噪声
        合成样本，<strong>判别器</strong>（Discriminator）则判断样本来自真实数据还是生成器。两者交替优化，
        最终希望生成器能产出以假乱真、与真实分布重合的样本。
      </p>

      <h3>怎么看这张图</h3>
      <ul>
        <li>
          <span style={{ color: '#10b981' }}>■ 绿色背景</span> / <span style={{ color: '#7c3aed' }}>■ 紫色背景</span>
          ：判别器热力图，越绿表示判别器越认为该处是真实数据，越紫表示越认为是假的，灰白处接近 0.5（拿不准）。
        </li>
        <li>
          <span style={{ color: '#10b981' }}>● 绿点</span>为真实样本，<span style={{ color: '#7c3aed' }}>● 紫点</span>为生成样本；
          训练收敛时两者应当重叠。
        </li>
        <li>
          <span style={{ color: '#f97316' }}>橙色网格</span>是<strong>生成器流形</strong>：把输入噪声方格 [0,1]²
          经生成器映射后的形变网格，格子越密（越不透明）表示该区域生成样本越集中。
        </li>
        <li>
          <span style={{ color: '#ec4899' }}>粉色线</span>是<strong>梯度方向</strong>：每个生成样本在当前判别器下
          会被推往的移动方向——它指示生成器下一步想把样本挪去哪里。
        </li>
      </ul>

      <h3>可以试试</h3>
      <ul>
        <li>切换目标分布（双高斯 / 斜线 / 环形 / 分离三簇），或用「自绘分布」画出任意形状。</li>
        <li>调节学习率、批大小与损失函数（Log loss / LSGAN），观察训练稳定性与收敛速度的差异。</li>
        <li>用「单步」和「慢放」逐帧观察判别器热力图、流形与梯度箭头如何相互拉扯。</li>
      </ul>

      <p className="text-sm text-stone-400">
        交互设计与算法参考改编自 GAN Lab（
        <a href="https://poloclub.github.io/ganlab/" target="_blank" rel="noreferrer">
          poloclub/ganlab
        </a>
        ，Apache-2.0）。
      </p>
    </article>
  )
}
