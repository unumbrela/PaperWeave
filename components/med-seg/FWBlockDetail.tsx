"use client";

export function FWBlockDetail() {
  return (
    <div className="space-y-4">
      <div>
        <div className="overline" style={{ color: "#6b8ed6" }}>
          FW-Mamba Block · 内部结构
        </div>
        <h3 className="serif text-[20px] text-ink mt-0.5">
          双分支并行 · β 融合
        </h3>
        <p className="mt-2 text-[13.5px] text-ink-2 leading-relaxed">
          每个 FW-Mamba Block 把输入同时送进两条分支：上路走标准 SS2D（Mamba）
          做全局语义混合；下路用 DWT 把特征拆成 LL/LH/HL/HH 四个频带，
          对高频带做 depthwise 卷积精炼，再用从 GAP 学出来的{" "}
          <code>[α_low, α_high]</code> 做加权 IDWT 重建。
          最后用可学习的 β（初值 0.1）把两路加回主干。
        </p>
      </div>

      <svg viewBox="0 0 680 280" className="w-full h-auto">
        {/* input node */}
        <g>
          <rect
            x={10}
            y={120}
            width={70}
            height={40}
            rx={8}
            fill="#e9dec8"
            stroke="#b09361"
          />
          <text x={45} y={144} textAnchor="middle" fontSize="11" fill="#1a1713">
            x
          </text>
          <text x={45} y={175} textAnchor="middle" fontSize="9" fill="rgba(26,23,19,0.6)">
            (B, H, W, C)
          </text>
        </g>

        {/* Mamba branch (top) */}
        <g>
          <rect x={140} y={40} width={120} height={50} rx={10} fill="#d6dfe9" stroke="#6b8ed6" />
          <text x={200} y={60} textAnchor="middle" fontSize="11" fill="#1a1713" fontWeight={600}>
            LayerNorm
          </text>
          <text x={200} y={76} textAnchor="middle" fontSize="10" fill="rgba(26,23,19,0.7)">
            → SS2D (Mamba)
          </text>
          <text x={200} y={105} textAnchor="middle" fontSize="10" fill="rgba(26,23,19,0.65)">
            f_mamba
          </text>
        </g>

        {/* Frequency branch (bottom) */}
        <g>
          <rect x={140} y={170} width={120} height={70} rx={10} fill="#ead9c7" stroke="#d29256" />
          <text x={200} y={190} textAnchor="middle" fontSize="11" fill="#1a1713" fontWeight={600}>
            DWT
          </text>
          <text x={200} y={206} textAnchor="middle" fontSize="10" fill="rgba(26,23,19,0.7)">
            LL, LH, HL, HH
          </text>
          <text x={200} y={221} textAnchor="middle" fontSize="9.5" fill="rgba(26,23,19,0.55)">
            DW-Conv on high-freq
          </text>
          <text x={200} y={234} textAnchor="middle" fontSize="9.5" fill="rgba(26,23,19,0.55)">
            α_low · LL, α_high · (LH,HL,HH)
          </text>
        </g>

        {/* IDWT node */}
        <g>
          <rect x={290} y={180} width={70} height={50} rx={10} fill="#ead9c7" stroke="#d29256" />
          <text x={325} y={202} textAnchor="middle" fontSize="11" fill="#1a1713" fontWeight={600}>
            IDWT
          </text>
          <text x={325} y={218} textAnchor="middle" fontSize="10" fill="rgba(26,23,19,0.7)">
            f_freq
          </text>
        </g>

        {/* beta scale */}
        <g>
          <circle cx={400} cy={205} r={18} fill="#fff8ea" stroke="#d29256" strokeDasharray="3 2" />
          <text x={400} y={209} textAnchor="middle" fontSize="13" fill="#1a1713" fontWeight={600}>
            β
          </text>
          <text x={400} y={240} textAnchor="middle" fontSize="9.5" fill="rgba(26,23,19,0.55)">
            可学习 · 初值 0.1
          </text>
        </g>

        {/* sum node */}
        <g>
          <circle cx={480} cy={140} r={22} fill="#f4efe6" stroke="#1a1713" strokeWidth={1.4} />
          <text x={480} y={146} textAnchor="middle" fontSize="16" fill="#1a1713" fontWeight={600}>
            +
          </text>
          <text x={480} y={180} textAnchor="middle" fontSize="9.5" fill="rgba(26,23,19,0.6)">
            DropPath
          </text>
        </g>

        {/* residual sum */}
        <g>
          <circle cx={580} cy={140} r={22} fill="#1a1713" stroke="#1a1713" />
          <text x={580} y={146} textAnchor="middle" fontSize="16" fill="#f4efe6" fontWeight={600}>
            +
          </text>
        </g>

        {/* out */}
        <g>
          <rect x={630} y={120} width={40} height={40} rx={8} fill="#e3d4d1" stroke="#c96955" />
          <text x={650} y={144} textAnchor="middle" fontSize="11" fill="#1a1713">
            out
          </text>
        </g>

        {/* edges */}
        <g fill="none" stroke="rgba(26,23,19,0.55)" strokeWidth="1.3">
          <path d="M 80 140 L 140 65" />
          <path d="M 80 140 L 140 200" />
          <path d="M 260 65 L 460 140" />
          <path d="M 260 205 L 290 205" />
          <path d="M 360 205 L 382 205" />
          <path d="M 418 205 L 458 140" />
          <path d="M 502 140 L 558 140" />
          <path d="M 602 140 L 630 140" />
          {/* residual skip */}
          <path
            d="M 45 110 Q 45 50 300 35 Q 550 20 580 118"
            stroke="rgba(26,23,19,0.35)"
            strokeDasharray="4 3"
          />
        </g>
      </svg>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[13px]">
        <Stat title="α_low · α_high" body="从 GAP → MLP → Sigmoid 得到两个 (0,1) 的标量，为每张样本自适应决定低/高频的相对权重。" />
        <Stat title="β" body="融合标量，决定频率分支对主干的贡献强度。初值 0.1 意味着一开始只做微调，训练中慢慢长大。" />
        <Stat title="参数量代价" body="整个 FWMamba-UNet 比 VM-UNet 多 10.1%（+2.78M），主要在 depthwise conv + MLP 上。" />
      </div>
    </div>
  );
}

function Stat({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-[var(--line)] p-3 bg-paper/50">
      <div className="overline text-[10px]" style={{ color: "#6b8ed6" }}>
        {title}
      </div>
      <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">{body}</p>
    </div>
  );
}
