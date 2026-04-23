"use client";

/**
 * BeautifulAuroraBackground
 * Faithful adaptation of the CodePen "The Aurora" demo: the title itself is
 * the stage, and four oversized blurred blobs drift through it using only CSS.
 * The original subtitle is intentionally omitted.
 */
export function BeautifulAuroraBackground({
  className = "",
  title = "the beautiful aurora",
  speed = 1,
}: {
  className?: string;
  title?: string;
  speed?: number;
}) {
  const s = Math.max(0.1, speed);
  const style = {
    ["--aurora-border-duration" as string]: `${6 / s}s`,
    ["--aurora-track-1" as string]: `${12 / s}s`,
    ["--aurora-track-2" as string]: `${12 / s}s`,
    ["--aurora-track-3" as string]: `${8 / s}s`,
    ["--aurora-track-4" as string]: `${24 / s}s`,
  } as React.CSSProperties;

  return (
    <div className={`beautiful-aurora-root ${className}`.trim()} aria-hidden style={style}>
      <div className="beautiful-aurora-content">
        <h1 className="beautiful-aurora-title">
          {title}
          <span className="beautiful-aurora-overlay">
            <span className="beautiful-aurora-item beautiful-aurora-item-1" />
            <span className="beautiful-aurora-item beautiful-aurora-item-2" />
            <span className="beautiful-aurora-item beautiful-aurora-item-3" />
            <span className="beautiful-aurora-item beautiful-aurora-item-4" />
          </span>
        </h1>
      </div>

      <style>{`
        .beautiful-aurora-root {
          --aurora-bg: #000000;
          --aurora-clr-1: #00c2ff;
          --aurora-clr-2: #33ff8c;
          --aurora-clr-3: #ffc640;
          --aurora-clr-4: #e54cff;
          --aurora-blur: 1rem;
          --aurora-font-size: clamp(3rem, 8vw, 7rem);
          --aurora-letter-spacing: clamp(-1.75px, -0.25vw, -3.5px);

          position: absolute;
          inset: 0;
          overflow: hidden;
          display: grid;
          place-items: center;
          padding: 2rem;
          background:
            radial-gradient(70% 55% at 50% 50%, rgba(255, 255, 255, 0.04), transparent 72%),
            var(--aurora-bg);
          pointer-events: none;
          isolation: isolate;
        }

        .beautiful-aurora-root::before {
          content: "";
          position: absolute;
          inset: -18%;
          background:
            radial-gradient(40% 32% at 20% 75%, rgba(0, 194, 255, 0.1), transparent 72%),
            radial-gradient(40% 32% at 80% 28%, rgba(229, 76, 255, 0.1), transparent 72%);
          filter: blur(48px);
          opacity: 0.9;
        }

        .beautiful-aurora-content {
          position: relative;
          z-index: 1;
          display: flex;
          justify-content: center;
          width: 100%;
          text-align: center;
        }

        .beautiful-aurora-title {
          position: relative;
          margin: 0;
          max-width: min(92vw, 11ch);
          overflow: hidden;
          background: var(--aurora-bg);
          color: #ffffff;
          font-family: var(--font-inter), ui-sans-serif, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
          font-size: var(--aurora-font-size);
          font-weight: 800;
          line-height: 0.88;
          letter-spacing: var(--aurora-letter-spacing);
          text-wrap: balance;
        }

        .beautiful-aurora-overlay {
          position: absolute;
          inset: 0;
          z-index: 2;
          mix-blend-mode: darken;
          pointer-events: none;
        }

        .beautiful-aurora-item {
          position: absolute;
          width: min(60vw, 64rem);
          height: min(60vw, 64rem);
          overflow: hidden;
          border-radius: 37% 29% 27% 27% / 28% 25% 41% 37%;
          filter: blur(var(--aurora-blur));
          mix-blend-mode: overlay;
          will-change: top, right, bottom, left, border-radius;
        }

        .beautiful-aurora-item-1 {
          top: -50%;
          background-color: var(--aurora-clr-1);
          animation:
            aurora-border var(--aurora-border-duration) ease-in-out infinite,
            aurora-track-1 var(--aurora-track-1) ease-in-out infinite alternate;
        }

        .beautiful-aurora-item-2 {
          top: 0;
          right: 0;
          background-color: var(--aurora-clr-3);
          animation:
            aurora-border var(--aurora-border-duration) ease-in-out infinite,
            aurora-track-2 var(--aurora-track-2) ease-in-out infinite alternate;
        }

        .beautiful-aurora-item-3 {
          left: 0;
          bottom: 0;
          background-color: var(--aurora-clr-2);
          animation:
            aurora-border var(--aurora-border-duration) ease-in-out infinite,
            aurora-track-3 var(--aurora-track-3) ease-in-out infinite alternate;
        }

        .beautiful-aurora-item-4 {
          right: 0;
          bottom: -50%;
          background-color: var(--aurora-clr-4);
          animation:
            aurora-border var(--aurora-border-duration) ease-in-out infinite,
            aurora-track-4 var(--aurora-track-4) ease-in-out infinite alternate;
        }

        @keyframes aurora-track-1 {
          0% { top: 0; right: 0; }
          50% { top: 100%; right: 75%; }
          75% { top: 100%; right: 25%; }
          100% { top: 0; right: 0; }
        }

        @keyframes aurora-track-2 {
          0% { top: -50%; left: 0%; }
          60% { top: 100%; left: 75%; }
          85% { top: 100%; left: 25%; }
          100% { top: -50%; left: 0%; }
        }

        @keyframes aurora-track-3 {
          0% { bottom: 0; left: 0; }
          40% { bottom: 100%; left: 75%; }
          65% { bottom: 40%; left: 50%; }
          100% { bottom: 0; left: 0; }
        }

        @keyframes aurora-track-4 {
          0% { bottom: -50%; right: 0; }
          50% { bottom: 0%; right: 40%; }
          90% { bottom: 50%; right: 25%; }
          100% { bottom: -50%; right: 0; }
        }

        @keyframes aurora-border {
          0% { border-radius: 37% 29% 27% 27% / 28% 25% 41% 37%; }
          25% { border-radius: 47% 29% 39% 49% / 61% 19% 66% 26%; }
          50% { border-radius: 57% 23% 47% 72% / 63% 17% 66% 33%; }
          75% { border-radius: 28% 49% 29% 100% / 93% 20% 64% 25%; }
          100% { border-radius: 37% 29% 27% 27% / 28% 25% 41% 37%; }
        }

        @media (max-width: 640px) {
          .beautiful-aurora-root {
            padding: 1.5rem;
          }

          .beautiful-aurora-title {
            max-width: min(92vw, 8ch);
            line-height: 0.92;
          }

          .beautiful-aurora-item {
            width: min(84vw, 40rem);
            height: min(84vw, 40rem);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .beautiful-aurora-item {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
