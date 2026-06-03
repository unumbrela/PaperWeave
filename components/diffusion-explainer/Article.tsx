"use client";

export function Article() {
  const lbrace = "{";
  const rbrace = "}";

  return (
    <article className="mt-16 prose-ai prose-lg max-w-3xl mx-auto">
      <h2>扩散模型工作原理</h2>
      
      <h3>什么是扩散模型？</h3>
      <p>
        扩散模型（Diffusion Model）是一种基于概率的生成模型，通过模拟"扩散"过程来生成数据。
        它的核心思想是：先将数据逐渐添加噪声（前向过程），然后学习如何从噪声中恢复原始数据（逆向过程）。
      </p>

      <h4>前向扩散过程</h4>
      <p>
        在训练阶段，扩散模型会逐步向数据中添加高斯噪声。经过 T 步后，数据完全变成随机噪声：
      </p>
      <div className="bg-gray-50 rounded-lg p-4 my-4">
        <p className="text-sm font-mono">x{lbrace}t{rbrace} = sqrt(1 - beta{lbrace}t{rbrace}) * x{lbrace}t-1{rbrace} + sqrt(beta{lbrace}t{rbrace}) * z{lbrace}t{rbrace}</p>
      </div>
      <p>
        其中 beta{lbrace}t{rbrace} 是噪声调度器，控制每一步添加的噪声量。
      </p>

      <h4>逆向生成过程</h4>
      <p>
        在生成阶段，模型从纯噪声开始，逐步去噪：
      </p>
      <div className="bg-gray-50 rounded-lg p-4 my-4">
        <p className="text-sm font-mono">x{lbrace}t-1{rbrace} = 1/sqrt(alpha{lbrace}t{rbrace}) * (x{lbrace}t{rbrace} - (1-alpha{lbrace}t{rbrace})/sqrt(1-bar{lbrace}alpha{rbrace}{lbrace}t{rbrace}) * epsilon_theta(x{lbrace}t{rbrace}, t)) + sigma{lbrace}t{rbrace} * z</p>
      </div>

      <h3>扩散模型的关键组件</h3>
      
      <h4>1. 噪声调度器</h4>
      <p>
        噪声调度器决定了每一步添加多少噪声。常见的调度策略包括线性调度、余弦调度等。
      </p>

      <h4>2. U-Net 架构</h4>
      <p>
        扩散模型通常使用 U-Net 架构作为去噪网络。U-Net 能够捕捉不同尺度的特征，非常适合图像生成任务。
      </p>

      <h4>3. 时间嵌入</h4>
      <p>
        模型需要知道当前是第几个时间步，以便应用正确的去噪策略。时间嵌入将时间步信息注入到模型中。
      </p>

      <h3>扩散模型的优势</h3>
      <ol>
        <li><strong>生成质量高</strong>：扩散模型在多个图像生成任务上达到了 SOTA 水平</li>
        <li><strong>训练稳定</strong>：相比 GAN，扩散模型的训练更加稳定</li>
        <li><strong>可控性强</strong>：可以通过条件输入控制生成结果</li>
      </ol>

      <h3>应用领域</h3>
      <p>
        扩散模型已经广泛应用于：
      </p>
      <ul>
        <li>图像生成（如 Stable Diffusion）</li>
        <li>图像修复和超分辨率</li>
        <li>文本到图像生成</li>
        <li>视频生成</li>
      </ul>

      <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl">
        <h4 className="font-medium text-ink mb-2">💡 关键点</h4>
        <p className="text-sm text-ink-2">
          扩散模型的核心在于"逐步去噪"。通过观察本可视化中的每一步变化，
          你可以看到图像如何从杂乱的噪声逐渐变得清晰。
        </p>
      </div>
    </article>
  );
}