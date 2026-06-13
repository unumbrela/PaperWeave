"use client";

import { useEffect, useRef } from "react";

/** Warm-dominant thread palette with sparse cool accents, as [r,g,b]. */
const THREAD_COLORS: Array<[number, number, number]> = [
  [255, 93, 77], // coral
  [255, 138, 91], // warm orange
  [244, 194, 90], // sun
  [255, 110, 140], // pink
  [155, 93, 229], // plum (cool accent)
  [59, 110, 246], // ocean (cool accent)
  [107, 155, 111], // sage
];

interface Thread {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  width: number;
  speed: number;
  life: number;
  maxLife: number;
}

export function MeshBackground() {
  const loomRef = useRef<HTMLDivElement | null>(null);
  const spotRef = useRef<HTMLSpanElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // Respect reduced-motion as a *calmer* field (fewer/slower threads, no
    // cursor swirl, softer glow) rather than killing it entirely — the dynamic
    // background is an explicit, central part of this page's design.
    const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let threads: Thread[] = [];

    // Pointer state (CSS px). active drives the swirl + the warm spotlight.
    let pointerX = -9999;
    let pointerY = -9999;
    let lastMove = 0;

    const SWIRL_R = 200; // px radius of cursor influence

    const spawn = (t: Thread, seed = false) => {
      t.x = Math.random() * w;
      t.y = Math.random() * h;
      const c = THREAD_COLORS[(Math.random() * THREAD_COLORS.length) | 0];
      t.r = c[0];
      t.g = c[1];
      t.b = c[2];
      t.width = (calm ? 1.2 : 1.4) + Math.random() * (calm ? 1.4 : 2.6);
      t.speed = (calm ? 0.35 : 1.2) + Math.random() * (calm ? 0.4 : 1.8);
      t.maxLife = 260 + Math.random() * 420;
      t.life = seed ? Math.random() * t.maxLife : 0;
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Particle density scales with viewport area (capped).
      const count = calm
        ? Math.min(34, Math.max(18, Math.floor((w * h) / 34000)))
        : Math.min(95, Math.max(40, Math.floor((w * h) / 16000)));
      threads = Array.from({ length: count }, () => {
        const t: Thread = {
          x: 0, y: 0, r: 0, g: 0, b: 0, width: 1, speed: 1, life: 0, maxLife: 1,
        };
        spawn(t, true);
        return t;
      });
      ctx.clearRect(0, 0, w, h);
    };

    // Smooth, slowly morphing vector field — layered trig (no noise lib needed).
    const field = (x: number, y: number, t: number) =>
      Math.sin(x * 0.0016 + t * 0.15) * 1.4 +
      Math.cos(y * 0.0019 - t * 0.12) * 1.4 +
      Math.sin((x + y) * 0.0011 + t * 0.09) * 1.1;

    let raf = 0;
    let t0 = performance.now();

    const frame = (now: number) => {
      const t = (now - t0) * 0.001;
      const pointerActive = now - lastMove < 1400;

      // Feed pointer position to the CSS layers (dye parallax + warm bloom).
      const nx = pointerActive ? pointerX / w : 0.5;
      const ny = pointerActive ? pointerY / h : 0.5;
      loomRef.current?.style.setProperty("--mx", nx.toFixed(4));
      loomRef.current?.style.setProperty("--my", ny.toFixed(4));
      spotRef.current?.style.setProperty("--mx", nx.toFixed(4));
      spotRef.current?.style.setProperty("--my", ny.toFixed(4));

      // Gently erase a little of the existing trails each frame. A LOW rate
      // leaves long, clearly-visible comet streaks (≈50 frames of tail).
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,0.022)";
      ctx.fillRect(0, 0, w, h);

      // Normal blending so the coloured threads read as solid ribbons against
      // the light paper (additive would just wash out on a near-white base).
      // A soft same-colour shadow gives each thread a neon-ish glow halo.
      ctx.globalCompositeOperation = "source-over";
      ctx.lineCap = "round";

      for (const p of threads) {
        let ang = field(p.x, p.y, t);

        if (pointerActive && !calm) {
          const dx = p.x - pointerX;
          const dy = p.y - pointerY;
          const dist = Math.hypot(dx, dy);
          if (dist < SWIRL_R) {
            const infl = 1 - dist / SWIRL_R;
            // Tangential swirl around the cursor + slight outward push.
            const perp = Math.atan2(dy, dx) + Math.PI / 2;
            ang = ang * (1 - infl * 0.85) + perp * (infl * 0.85);
            p.x += (dx / (dist || 1)) * infl * 1.4;
            p.y += (dy / (dist || 1)) * infl * 1.4;
          }
        }

        const px = p.x;
        const py = p.y;
        p.x += Math.cos(ang) * p.speed;
        p.y += Math.sin(ang) * p.speed;
        p.life++;

        // Fade in/out over the thread's life for soft births and deaths.
        const lifeT = p.life / p.maxLife;
        const env = Math.sin(Math.min(lifeT, 1) * Math.PI); // 0→1→0
        const alpha = 0.12 + env * 0.72;

        const col = `rgba(${p.r},${p.g},${p.b},${alpha})`;
        ctx.strokeStyle = col;
        ctx.shadowColor = col;
        ctx.shadowBlur = calm ? 5 : 10;
        ctx.lineWidth = p.width;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        if (
          p.life >= p.maxLife ||
          p.x < -40 || p.x > w + 40 || p.y < -40 || p.y > h + 40
        ) {
          spawn(p);
        }
      }
      ctx.shadowBlur = 0;

      raf = requestAnimationFrame(frame);
    };

    const onMove = (e: PointerEvent) => {
      pointerX = e.clientX;
      pointerY = e.clientY;
      lastMove = performance.now();
    };

    const onVisibility = () => {
      if (document.hidden) {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf) {
        t0 = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    raf = requestAnimationFrame(frame);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <>
      <div className="loom" ref={loomRef} aria-hidden>
        <div className="loom-dye">
          <span className="loom-blob d1" />
          <span className="loom-blob d2" />
          <span className="loom-blob d3" />
          <span className="loom-blob d4" />
        </div>
        <canvas className="loom-canvas" ref={canvasRef} />
      </div>

      <span className="loom-spot" ref={spotRef} aria-hidden />

      <svg
        className="grain-overlay"
        aria-hidden
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <filter id="noise" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.55" />
          </feComponentTransfer>
        </filter>
        <rect width="100" height="100" filter="url(#noise)" />
      </svg>
    </>
  );
}
