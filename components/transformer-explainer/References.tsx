const REFS: { authors: string; title: string; year: string; href: string; note?: string }[] = [
  {
    authors: "Ashish Vaswani 等",
    title: "Attention Is All You Need",
    year: "2017",
    href: "https://arxiv.org/abs/1706.03762",
    note: "Transformer 的原始论文",
  },
  {
    authors: "Jay Alammar",
    title: "The Illustrated Transformer",
    year: "2018",
    href: "https://jalammar.github.io/illustrated-transformer/",
    note: "经典图解，建立直觉首选",
  },
  {
    authors: "Alexander Rush 等（Harvard NLP）",
    title: "The Annotated Transformer",
    year: "2018",
    href: "https://nlp.seas.harvard.edu/2018/04/03/attention.html",
    note: "论文逐行 PyTorch 实现",
  },
  {
    authors: "Andrej Karpathy",
    title: "nanoGPT",
    year: "2023",
    href: "https://github.com/karpathy/nanoGPT",
    note: "极简、可训练的 GPT 实现",
  },
  {
    authors: "Aeree Cho 等（Georgia Tech）",
    title: "Transformer Explainer: Interactive Learning of Text-Generative Models",
    year: "2024",
    href: "https://poloclub.github.io/transformer-explainer/",
    note: "本页交互形态的参照 · 浏览器内跑真实 GPT-2 · MIT 许可",
  },
];

export function References() {
  return (
    <div className="mx-auto mt-16 max-w-[72ch] border-t border-[var(--line)] pt-6">
      <h3 className="serif text-lg text-ink mb-3">参考与延伸</h3>
      <ol className="space-y-2 text-sm text-ink-2">
        {REFS.map((r, i) => (
          <li key={r.href} className="flex gap-2">
            <span className="text-ink-3">[{i + 1}]</span>
            <span>
              {r.authors}.{" "}
              <a
                href={r.href}
                target="_blank"
                rel="noreferrer"
                className="text-[#3b6ef6] underline decoration-dotted underline-offset-2 hover:text-blue-700"
              >
                <em>{r.title}</em>
              </a>
              . {r.year}.
              {r.note ? <span className="text-ink-3">（{r.note}）</span> : null}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
