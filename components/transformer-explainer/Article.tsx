export function Article() {
  return (
    <article className="prose-ai mx-auto mt-16 max-w-[72ch]">
      <h2>什么是 Transformer？</h2>
      <p>
        Transformer 是 Google 在 2017 年提出的深度学习架构，
        首次出现在论文{" "}
        <em>Attention Is All You Need</em>中。它完全基于注意力机制，
        抛弃了传统的循环神经网络（RNN）结构，在自然语言处理领域引发了革命性的变革。
      </p>
      <p>
        Transformer 的核心思想是通过自注意力机制（Self-Attention），
        让模型能够在处理序列数据时，动态地关注输入序列中不同位置的信息。
      </p>

      <h2 id="article-architecture">Transformer 架构</h2>
      <p>
        标准的 Transformer 由编码器（Encoder）和解码器（Decoder）两部分组成：
      </p>
      <ol>
        <li>
          <strong>编码器（Encoder）</strong>：由多层相同的层堆叠而成，
          每层包含多头自注意力（Multi-Head Attention）和前馈神经网络（Feed-Forward）。
        </li>
        <li>
          <strong>解码器（Decoder）</strong>：同样由多层组成，
          除了多头自注意力和前馈神经网络外，还包含一个编码器-解码器注意力层。
        </li>
      </ol>

      <h2 id="article-self-attention">自注意力机制</h2>
      <p>
        自注意力机制允许模型在处理每个位置时，考虑输入序列中所有其他位置的信息。
        对于序列中的每个位置，计算三个向量：
      </p>
      <ol>
        <li>
          <strong>查询向量（Query）</strong>：代表当前位置想要查询的信息
        </li>
        <li>
          <strong>键向量（Key）</strong>：代表每个位置提供的信息
        </li>
        <li>
          <strong>值向量（Value）</strong>：代表每个位置实际包含的信息
        </li>
      </ol>
      <p>
        注意力权重通过 Query 和 Key 的点积计算得到，然后用 Softmax 归一化，
        最后用这些权重对 Value 进行加权求和。
      </p>

      <h2 id="article-multi-head">多头注意力</h2>
      <p>
        多头注意力（Multi-Head Attention）通过并行计算多个注意力头，
        让模型能够同时关注不同类型的信息。每个注意力头学习不同的注意力模式，
        捕捉序列中不同种类的依赖关系。
      </p>
      <p>
        在实践中，输入向量会被线性投影到多个不同的子空间，每个子空间对应一个注意力头。
        最后将所有头的输出拼接起来，再经过一个线性层得到最终结果。
      </p>

      <h2 id="article-positional">位置编码</h2>
      <p>
        由于 Transformer 没有循环结构，它无法天然地感知序列的顺序信息。
        为了解决这个问题，Transformer 使用位置编码（Positional Encoding）
        来为每个位置添加位置信息。
      </p>
      <p>
        位置编码通常采用正弦和余弦函数来生成，确保不同位置有独特的编码，
        并且相对位置信息能够被模型学习到。
      </p>

      <h2 id="article-residual">残差连接与层归一化</h2>
      <p>
        Transformer 中的每个子层（注意力层和前馈层）都采用了残差连接（Residual Connection），
        然后进行层归一化（Layer Normalization）。这种结构有助于缓解梯度消失问题，
        使得训练深层网络成为可能。
      </p>

      <div className="hairline my-10" />

      <p className="text-[13px] text-ink-3">
        Transformer 是现代大语言模型（如 GPT、BERT）的基础架构。
        本可视化工具将帮助你直观理解其核心机制。
      </p>
    </article>
  );
}