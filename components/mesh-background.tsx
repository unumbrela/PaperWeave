export function MeshBackground() {
  return (
    <>
      <div className="mesh-bg" aria-hidden>
        <span className="mesh-blob b1" />
        <span className="mesh-blob b2" />
        <span className="mesh-blob b3" />
        <span className="mesh-blob b4" />
        <span className="mesh-blob b5" />
      </div>
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
