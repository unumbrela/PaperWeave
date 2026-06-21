export function Article() {
  return (
    <article className="prose-ai mx-auto mt-16 max-w-[72ch]">
      <h2>把 Transformer 讲清楚</h2>
      <p>
        Transformer 出自 2017 年的论文 <em>Attention Is All You Need</em>，是 GPT、BERT 等几乎所有大模型的底座。
        它做的事，本质上只有一件：<strong>给定前面的词，预测下一个词</strong>。
        上面那条流水线，正是把这件事拆成了可以一步步看的环节。下面按编号对应讲一遍。
      </p>

      <h2>① 分词：把句子变成数字</h2>
      <p>
        模型不认字符串。它先用一张<strong>词表</strong>把句子切成一个个 <code>token</code>，
        每个 token 是词表里的一个整数 id。真实模型用的是 BPE 子词（一个词可能拆成几片），
        本页为了直观，简化成「一个词 = 一个 token」。
      </p>

      <h2>② 词嵌入 + 位置编码</h2>
      <p>
        每个 token id 去查一张可学习的<strong>嵌入矩阵</strong>，得到一个稠密向量（本页 24 维，GPT-2 是 768 维）。
        但注意力本身是「无序」的——打乱词序它算出来一样。于是再加一份<strong>位置编码</strong>，
        本页用论文里的正弦/余弦公式：
      </p>
      <pre><code>{`PE(pos, 2i)   = sin(pos / 10000^(2i/d))
PE(pos, 2i+1) = cos(pos / 10000^(2i/d))`}</code></pre>
      <p>它只与「第几个位置」有关，与具体是什么词无关——所以切换句子时，位置编码那张图不变。</p>

      <h2>③ 自注意力：每个词该看谁</h2>
      <p>
        这是 Transformer 的心脏。每个 token 的向量分别乘三个矩阵，得到
        <strong>Query</strong>（我在找什么）、<strong>Key</strong>（我能提供什么）、<strong>Value</strong>（我携带的信息）。
        用 Query 和所有 Key 做点积、除以 <code>√d</code> 防止数值过大，再 softmax 成一行和为 1 的权重：
      </p>
      <pre><code>{`Attention(Q, K, V) = softmax(Q·Kᵀ / √d) · V`}</code></pre>
      <p>
        因为我们是在「预测下一个词」，每个位置<strong>只允许看自己和左边</strong>，右上方的未来位置被
        <em>因果掩码</em>屏蔽掉（图里那块空白三角）。最后每个词把别人的 Value 按权重加权求和，得到融合了上下文的新向量。
      </p>

      <h2>④ 多头注意力</h2>
      <p>
        一个头只能学一种关注模式（比如「找主语」或「找最近的名词」）。所以并行跑多个头
        （本页 3 个，GPT-2 是 12 个），各有独立的 Q/K/V，再把它们的输出<strong>拼接</strong>起来，
        过一个输出投影 <code>W_o</code> 融合成一个向量。多个视角，一次看全。
      </p>

      <h2>⑤ 前馈网络 + 残差 &amp; 归一化</h2>
      <p>
        注意力让词与词之间交换了信息，<strong>前馈网络（FFN）</strong>则对每个位置<em>独立</em>地再做一次非线性加工：
        先升维（本页到 48）、过 GELU 激活、再降回原维度。每个子层外面都包一层
        <strong>残差连接 + LayerNorm</strong>：
      </p>
      <pre><code>{`x = LayerNorm(x + SubLayer(x))`}</code></pre>
      <p>
        残差让梯度有一条「高速公路」直达底层，LayerNorm 把每个向量拉回到稳定的尺度——
        这两样是深层网络能堆得很深还训得动的关键。
      </p>

      <h2>⑥ 堆叠 Block</h2>
      <p>
        「多头注意力 + 前馈」合起来是一个 <strong>Transformer Block</strong>。把它重复堆叠很多层
        （本页 2 层，GPT-2 small 12 层，大模型几十上百层），上一层输出喂给下一层，
        表示越来越抽象——底层可能在看语法，高层已经在看语义和事实。
      </p>

      <h2>⑦ 输出：从向量到下一个词</h2>
      <p>
        取<strong>最后一个位置</strong>的向量（它「攒齐」了整句话的信息），过末端 LayerNorm，
        再乘嵌入矩阵的转置（输入输出权重共享）投影回整个词表，得到每个词的 <code>logit</code>，
        最后 softmax 成概率。<strong>温度</strong>控制分布陡峭程度：
      </p>
      <pre><code>{`p_i = softmax(logit_i / T)`}</code></pre>
      <p>
        <code>T</code> 越低越笃定（几乎总选最高分那个词），越高越随机（给冷门词更多机会）。
        把选出的词接到句末，再跑一遍整条流水线，就能一个接一个地续写——这就是大模型「生成」文字的全过程。
      </p>

      <div className="hairline my-10" />
      <p className="text-[13px] text-ink-3">
        说明：本页为帮助理解而用一个<strong>确定性玩具模型</strong>（小词表、随机但固定的权重）真实演算每一步，
        数字彼此自洽；仅在最后对预设例句的下一个词做了少量偏置，让结果读起来通顺。
        它示意的是<em>机制与数据流</em>，并非真实 GPT-2 的具体数值。想看真实 GPT-2 在浏览器里跑，见下方参考文献的 Transformer Explainer。
      </p>
    </article>
  );
}
