"use client";

/**
 * MeshOrbsBackground
 * Warm-paper mesh blobs drifting slowly. Self-contained: just drop into any
 * relatively-positioned container (e.g. <body>) and it fills the parent.
 */
export function MeshOrbsBackground({
  className = "",
  grain = true,
}: {
  className?: string;
  grain?: boolean;
}) {
  return (
    <div className={`orb-root ${className}`} aria-hidden>
      <span className="orb-blob b1" />
      <span className="orb-blob b2" />
      <span className="orb-blob b3" />
      <span className="orb-blob b4" />
      <span className="orb-blob b5" />
      {grain && (
        <svg
          className="orb-grain"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <filter id="orb-noise" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.55" />
            </feComponentTransfer>
          </filter>
          <rect width="100" height="100" filter="url(#orb-noise)" />
        </svg>
      )}
      <style>{`
        .orb-root { position: absolute; inset: 0; overflow: hidden; background: #f4efe6; pointer-events: none; }
        .orb-blob { position: absolute; border-radius: 9999px; filter: blur(110px); mix-blend-mode: multiply; will-change: transform, opacity; }
        .orb-blob.b1 { width: 62%; aspect-ratio: 1; top: -18%; left: -12%; background: radial-gradient(closest-side, #ffb4a2 0%, transparent 72%); animation: orb-a 16s ease-in-out infinite alternate; opacity: .85; }
        .orb-blob.b2 { width: 55%; aspect-ratio: 1; top: -14%; right: -10%; background: radial-gradient(closest-side, #c7b4ff 0%, transparent 70%); animation: orb-b 19s ease-in-out infinite alternate; opacity: .8; }
        .orb-blob.b3 { width: 70%; aspect-ratio: 1; bottom: -24%; left: 6%;  background: radial-gradient(closest-side, #ffe0a3 0%, transparent 72%); animation: orb-c 22s ease-in-out infinite alternate; opacity: .7; }
        .orb-blob.b4 { width: 48%; aspect-ratio: 1; bottom: -10%; right: -8%; background: radial-gradient(closest-side, #a9d6ff 0%, transparent 70%); animation: orb-d 17s ease-in-out infinite alternate; opacity: .7; }
        .orb-blob.b5 { width: 38%; aspect-ratio: 1; top: 34%; left: 28%; background: radial-gradient(closest-side, #ffc8d6 0%, transparent 70%); animation: orb-e 13s ease-in-out infinite alternate; opacity: .55; }
        .orb-grain { position: absolute; inset: 0; width: 100%; height: 100%; opacity: .35; mix-blend-mode: multiply; pointer-events: none; }
        @keyframes orb-a { 0%{transform:translate3d(0,0,0) scale(1)} 50%{transform:translate3d(25%,22%,0) scale(1.2)} 100%{transform:translate3d(-18%,14%,0) scale(.85)} }
        @keyframes orb-b { 0%{transform:translate3d(0,0,0) scale(1)} 50%{transform:translate3d(-28%,18%,0) scale(1.15)} 100%{transform:translate3d(14%,-16%,0) scale(.88)} }
        @keyframes orb-c { 0%{transform:translate3d(0,0,0) scale(1)} 50%{transform:translate3d(20%,-22%,0) scale(1.2)} 100%{transform:translate3d(-22%,-12%,0) scale(.9)} }
        @keyframes orb-d { 0%{transform:translate3d(0,0,0) scale(1)} 50%{transform:translate3d(-22%,-18%,0) scale(1.22)} 100%{transform:translate3d(12%,14%,0) scale(.85)} }
        @keyframes orb-e { 0%{transform:translate3d(0,0,0) scale(1)} 50%{transform:translate3d(18%,-16%,0) scale(1.3)} 100%{transform:translate3d(-16%,16%,0) scale(.8)} }
        @media (prefers-reduced-motion: reduce) { .orb-blob { animation: none !important; } }
      `}</style>
    </div>
  );
}
