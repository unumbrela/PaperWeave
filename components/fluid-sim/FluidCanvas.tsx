"use client";

import { useEffect, useRef } from "react";

export function FluidCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    import("./fluid-runtime").then(({ initFluid }) => {
      if (disposed) return;
      cleanup = initFluid(canvas);
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return <canvas ref={canvasRef} className="fluid-canvas" />;
}
