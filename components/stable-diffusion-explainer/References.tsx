const REFS: { authors: string; title: string; year: string; href: string; note?: string }[] = [
  {
    authors: "Jonathan Ho, Ajay Jain, Pieter Abbeel",
    title: "Denoising Diffusion Probabilistic Models (DDPM)",
    year: "2020",
    href: "https://arxiv.org/abs/2006.11239",
    note: "去噪扩散的奠基工作",
  },
  {
    authors: "Yang Song, Jascha Sohl-Dickstein, Diederik P. Kingma, Abhishek Kumar, Stefano Ermon, Ben Poole",
    title: "Score-Based Generative Modeling through Stochastic Differential Equations",
    year: "2021",
    href: "https://arxiv.org/abs/2011.13456",
  },
  {
    authors: "Robin Rombach, Andreas Blattmann, Dominik Lorenz, Patrick Esser, Björn Ommer",
    title: "High-Resolution Image Synthesis with Latent Diffusion Models",
    year: "2022",
    href: "https://arxiv.org/abs/2112.10752",
    note: "即 Stable Diffusion",
  },
  {
    authors: "Alec Radford 等",
    title: "Learning Transferable Visual Models From Natural Language Supervision (CLIP)",
    year: "2021",
    href: "https://arxiv.org/abs/2103.00020",
  },
  {
    authors: "Jonathan Ho, Tim Salimans",
    title: "Classifier-Free Diffusion Guidance",
    year: "2022",
    href: "https://arxiv.org/abs/2207.12598",
  },
  {
    authors: "Seongmin Lee 等",
    title: "Diffusion Explainer: Visual Explanation for Text-to-image Stable Diffusion",
    year: "2024",
    href: "https://arxiv.org/abs/2305.03509",
    note: "本页交互所用逐步去噪帧的数据来源 · MIT 许可",
  },
];

export function References() {
  return (
    <div className="mx-auto mt-16 max-w-[72ch] border-t border-[var(--line)] pt-6">
      <h3 className="serif text-lg text-ink mb-3">参考文献</h3>
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
                className="text-[#ec4899] underline decoration-dotted underline-offset-2 hover:text-pink-700"
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
