"use client";

/**
 * RaycastBackground
 * Raycast.com-style hero. Two counter-rotating rainbow conic halos, a set of
 * color orbs that orbit the center, and a gentle breathing pulse. Self-
 * contained: drop into any relatively-positioned container.
 *
 *   speed: 1 = default. 0.5 = half-speed, 2 = double-speed.
 */
export function RaycastBackground({
  className = "",
  grain = true,
  speed = 1,
}: {
  className?: string;
  grain?: boolean;
  speed?: number;
}) {
  const s = Math.max(0.1, speed);
  const style = {
    ["--rc-spin-a" as string]: `${14 / s}s`,
    ["--rc-spin-b" as string]: `${22 / s}s`,
    ["--rc-pulse" as string]: `${6 / s}s`,
    ["--rc-orbit-1" as string]: `${12 / s}s`,
    ["--rc-orbit-2" as string]: `${16 / s}s`,
    ["--rc-orbit-3" as string]: `${9 / s}s`,
    ["--rc-orbit-4" as string]: `${18 / s}s`,
  } as React.CSSProperties;

  return (
    <div className={`rc-root ${className}`} aria-hidden style={style}>
      <div className="rc-base" />
      <div className="rc-halo rc-halo-a" />
      <div className="rc-halo rc-halo-b" />

      <div className="rc-orbit rc-orbit-1">
        <span className="rc-orb rc-pink" />
      </div>
      <div className="rc-orbit rc-orbit-2">
        <span className="rc-orb rc-purple" />
      </div>
      <div className="rc-orbit rc-orbit-3">
        <span className="rc-orb rc-orange" />
      </div>
      <div className="rc-orbit rc-orbit-4">
        <span className="rc-orb rc-blue" />
      </div>

      <div className="rc-vignette" />

      {grain && (
        <svg
          className="rc-grain"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <filter id="rc-noise" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.35" />
            </feComponentTransfer>
          </filter>
          <rect width="100" height="100" filter="url(#rc-noise)" />
        </svg>
      )}

      <style>{`
        .rc-root { position: absolute; inset: 0; overflow: hidden; background: #07070c; pointer-events: none; isolation: isolate; }

        .rc-base {
          position: absolute; inset: 0;
          background:
            radial-gradient(120% 80% at 50% -10%, rgba(90, 40, 180, .35), transparent 60%),
            radial-gradient(120% 80% at 50% 120%, rgba(255, 60, 120, .30), transparent 60%),
            linear-gradient(180deg, #06060c 0%, #0a0712 50%, #07070f 100%);
        }

        /* Two counter-rotating rainbow halos — the signature Raycast swirl.
           We center-anchor with 50%/50% offset, then the keyframes rotate while
           preserving that translate. */
        .rc-halo {
          position: absolute; left: 50%; top: 50%;
          width: 170%; aspect-ratio: 1;
          border-radius: 9999px;
          transform: translate(-50%, -50%) rotate(0deg);
          transform-origin: center center;
          will-change: transform, opacity, filter;
          mix-blend-mode: screen;
        }
        .rc-halo-a {
          background: conic-gradient(from 0deg,
            #ff3b6b 0deg, #ff7a3b 55deg, #ffc94a 110deg, #3ddcff 170deg,
            #6a8bff 220deg, #b76bff 285deg, #ff3fa1 330deg, #ff3b6b 360deg);
          filter: blur(60px) saturate(1.3);
          opacity: .75;
          animation:
            rc-halo-cw var(--rc-spin-a) linear infinite,
            rc-pulse var(--rc-pulse) ease-in-out infinite;
        }
        .rc-halo-b {
          width: 130%;
          background: conic-gradient(from 180deg,
            rgba(255,80,180,.9) 0deg, rgba(70,80,255,.9) 90deg,
            rgba(0,210,255,.9) 180deg, rgba(255,160,80,.9) 270deg,
            rgba(255,80,180,.9) 360deg);
          filter: blur(80px) saturate(1.2);
          opacity: .6;
          animation: rc-halo-ccw var(--rc-spin-b) linear infinite;
        }

        /* Orbiting color blobs — spin the parent so the offset child orbits */
        .rc-orbit { position: absolute; inset: 0; transform-origin: 50% 50%; will-change: transform; }
        .rc-orbit-1 { animation: rc-orbit-cw  var(--rc-orbit-1) linear infinite; }
        .rc-orbit-2 { animation: rc-orbit-ccw var(--rc-orbit-2) linear infinite; }
        .rc-orbit-3 { animation: rc-orbit-cw  var(--rc-orbit-3) linear infinite; }
        .rc-orbit-4 { animation: rc-orbit-ccw var(--rc-orbit-4) linear infinite; }

        .rc-orb {
          position: absolute;
          border-radius: 9999px;
          filter: blur(70px) saturate(1.25);
          mix-blend-mode: screen;
        }
        .rc-orb.rc-pink   { width: 45%; aspect-ratio: 1; top: 8%;  left: 10%;  background: radial-gradient(closest-side, #ff2d7a 0%, rgba(255,45,122,0) 70%); opacity: .9; }
        .rc-orb.rc-purple { width: 40%; aspect-ratio: 1; top: 55%; left: 58%;  background: radial-gradient(closest-side, #a855f7 0%, rgba(168,85,247,0) 70%); opacity: .85; }
        .rc-orb.rc-orange { width: 35%; aspect-ratio: 1; top: 20%; left: 62%;  background: radial-gradient(closest-side, #ffa24a 0%, rgba(255,162,74,0) 70%); opacity: .9; }
        .rc-orb.rc-blue   { width: 45%; aspect-ratio: 1; top: 55%; left: 8%;   background: radial-gradient(closest-side, #3b6ef6 0%, rgba(59,110,246,0) 70%); opacity: .85; }

        .rc-vignette {
          position: absolute; inset: 0;
          background: radial-gradient(130% 130% at 50% 50%, transparent 50%, rgba(3,2,8,.7) 100%);
          pointer-events: none;
        }

        .rc-grain { position: absolute; inset: 0; width: 100%; height: 100%; opacity: .12; mix-blend-mode: overlay; pointer-events: none; }

        @keyframes rc-halo-cw  { to { transform: translate(-50%, -50%) rotate(360deg);  } }
        @keyframes rc-halo-ccw { to { transform: translate(-50%, -50%) rotate(-360deg); } }
        @keyframes rc-orbit-cw  { to { transform: rotate(360deg);  } }
        @keyframes rc-orbit-ccw { to { transform: rotate(-360deg); } }

        @keyframes rc-pulse {
          0%, 100% { opacity: .55; filter: blur(60px) saturate(1.3); }
          50%      { opacity: .9;  filter: blur(48px) saturate(1.6); }
        }

        @media (prefers-reduced-motion: reduce) {
          .rc-halo, .rc-orbit { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
