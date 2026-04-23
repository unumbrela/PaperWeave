"use client";

/**
 * TraeBackground
 * Trae.ai-style hero. Flowing aurora ribbons (animated background-position),
 * a rotating conic halo, orbiting cool-toned blobs, and a faint dot grid.
 * Self-contained: drop into any relatively-positioned container.
 *
 *   speed: 1 = default. 0.5 = half-speed, 2 = double-speed.
 */
export function TraeBackground({
  className = "",
  grid = true,
  speed = 1,
}: {
  className?: string;
  grid?: boolean;
  speed?: number;
}) {
  const s = Math.max(0.1, speed);
  const style = {
    ["--trae-flow" as string]: `${10 / s}s`,
    ["--trae-flow-2" as string]: `${14 / s}s`,
    ["--trae-spin" as string]: `${18 / s}s`,
    ["--trae-orbit-1" as string]: `${13 / s}s`,
    ["--trae-orbit-2" as string]: `${17 / s}s`,
    ["--trae-orbit-3" as string]: `${11 / s}s`,
    ["--trae-pulse" as string]: `${7 / s}s`,
  } as React.CSSProperties;

  return (
    <div className={`trae-root ${className}`} aria-hidden style={style}>
      <div className="trae-base" />
      <div className="trae-aurora trae-aurora-a" />
      <div className="trae-aurora trae-aurora-b" />
      <div className="trae-halo" />

      <div className="trae-orbit trae-orbit-1">
        <span className="trae-orb trae-blue" />
      </div>
      <div className="trae-orbit trae-orbit-2">
        <span className="trae-orb trae-purple" />
      </div>
      <div className="trae-orbit trae-orbit-3">
        <span className="trae-orb trae-cyan" />
      </div>

      {grid && <div className="trae-grid" />}
      <div className="trae-vignette" />

      <style>{`
        .trae-root { position: absolute; inset: 0; overflow: hidden; background: #04050a; pointer-events: none; isolation: isolate; }

        .trae-base {
          position: absolute; inset: 0;
          background:
            radial-gradient(120% 80% at 0% 0%,   rgba(59,110,246,.22), transparent 55%),
            radial-gradient(100% 70% at 100% 0%, rgba(155,93,229,.22), transparent 55%),
            radial-gradient(120% 80% at 50% 120%, rgba(0,212,255,.18), transparent 55%),
            linear-gradient(180deg, #05060c 0%, #04050a 60%, #05060c 100%);
        }

        /* Flowing aurora ribbons — background-position animation makes the bands
           slide visibly across the screen. */
        .trae-aurora {
          position: absolute; inset: -10%;
          filter: blur(60px) saturate(1.3);
          mix-blend-mode: screen;
          will-change: background-position, transform;
        }
        .trae-aurora-a {
          opacity: .75;
          background:
            repeating-linear-gradient(115deg,
              rgba(59,110,246,0) 0%,
              rgba(59,110,246,.55) 8%,
              rgba(0,212,255,.45) 14%,
              rgba(155,93,229,.55) 22%,
              rgba(255,93,143,.30) 30%,
              rgba(59,110,246,0) 38%,
              rgba(59,110,246,0) 50%);
          background-size: 300% 200%;
          animation: trae-flow var(--trae-flow) linear infinite;
        }
        .trae-aurora-b {
          opacity: .5;
          background:
            repeating-linear-gradient(-60deg,
              rgba(0,212,255,0) 0%,
              rgba(0,212,255,.45) 10%,
              rgba(90,60,220,.45) 18%,
              rgba(255,93,143,.25) 28%,
              rgba(0,212,255,0) 38%,
              rgba(0,212,255,0) 50%);
          background-size: 260% 220%;
          animation: trae-flow-rev var(--trae-flow-2) linear infinite;
        }

        /* Rotating conic adds a circular swirl on top of the ribbons */
        .trae-halo {
          position: absolute; left: 50%; top: 50%;
          width: 150%; aspect-ratio: 1;
          transform: translate(-50%, -50%) rotate(0deg);
          background: conic-gradient(from 140deg,
            rgba(59,110,246,.55) 0deg,
            rgba(0,212,255,.40) 70deg,
            rgba(90,60,220,.55) 150deg,
            rgba(255,93,143,.35) 220deg,
            rgba(59,110,246,.55) 320deg,
            rgba(59,110,246,.55) 360deg);
          filter: blur(90px) saturate(1.3);
          opacity: .55;
          mix-blend-mode: screen;
          animation:
            trae-halo-spin var(--trae-spin) linear infinite,
            trae-pulse var(--trae-pulse) ease-in-out infinite;
        }

        /* Orbiting color blobs */
        .trae-orbit { position: absolute; inset: 0; transform-origin: 50% 50%; will-change: transform; }
        .trae-orbit-1 { animation: trae-orbit-cw  var(--trae-orbit-1) linear infinite; }
        .trae-orbit-2 { animation: trae-orbit-ccw var(--trae-orbit-2) linear infinite; }
        .trae-orbit-3 { animation: trae-orbit-cw  var(--trae-orbit-3) linear infinite; }

        .trae-orb {
          position: absolute;
          border-radius: 9999px;
          filter: blur(70px) saturate(1.25);
          mix-blend-mode: screen;
        }
        .trae-orb.trae-blue   { width: 42%; aspect-ratio: 1; top: 12%; left: 8%;  background: radial-gradient(closest-side, #3b6ef6 0%, rgba(59,110,246,0) 70%); opacity: .9; }
        .trae-orb.trae-purple { width: 38%; aspect-ratio: 1; top: 55%; left: 58%; background: radial-gradient(closest-side, #9b5de5 0%, rgba(155,93,229,0) 70%); opacity: .85; }
        .trae-orb.trae-cyan   { width: 45%; aspect-ratio: 1; top: 48%; left: 6%;  background: radial-gradient(closest-side, #00d4ff 0%, rgba(0,212,255,0) 70%);   opacity: .7; }

        .trae-grid {
          position: absolute; inset: -1px;
          background-image: radial-gradient(rgba(255,255,255,.10) 1px, transparent 1px);
          background-size: 22px 22px;
          mask-image: radial-gradient(120% 90% at 50% 50%, #000 40%, transparent 85%);
          -webkit-mask-image: radial-gradient(120% 90% at 50% 50%, #000 40%, transparent 85%);
          opacity: .6;
          pointer-events: none;
        }

        .trae-vignette {
          position: absolute; inset: 0;
          background: radial-gradient(130% 130% at 50% 50%, transparent 50%, rgba(0,0,0,.6) 100%);
          pointer-events: none;
        }

        @keyframes trae-flow {
          0%   { background-position: 0% 50%; }
          100% { background-position: 300% 50%; }
        }
        @keyframes trae-flow-rev {
          0%   { background-position: 100% 50%; }
          100% { background-position: -200% 50%; }
        }
        @keyframes trae-halo-spin { to { transform: translate(-50%, -50%) rotate(360deg); } }
        @keyframes trae-orbit-cw  { to { transform: rotate(360deg);  } }
        @keyframes trae-orbit-ccw { to { transform: rotate(-360deg); } }
        @keyframes trae-pulse {
          0%, 100% { opacity: .45; }
          50%      { opacity: .75; }
        }

        @media (prefers-reduced-motion: reduce) {
          .trae-aurora, .trae-halo, .trae-orbit { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
