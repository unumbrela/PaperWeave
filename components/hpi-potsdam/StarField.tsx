"use client";

import {
  Component,
  type ErrorInfo,
  type ReactNode,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Vignette,
  Noise,
} from "@react-three/postprocessing";
import Papa from "papaparse";

/**
 * Starfield3D
 * - Renders ~75k points efficiently with a custom shader for crisp, additive stars
 * - Optional CSV loading via `csvUrl` or direct `rows` prop
 * - Looks like a starry sky with subtle bloom, vignette, and camera drift
 *
 * Expected CSV columns: x,y,z,part_type,name
 */

// Error Boundary for catching WebGL and rendering errors
class StarFieldErrorBoundary extends Component<
  { children: ReactNode; onError: (error: Error) => void },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; onError: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[StarField] Error caught by boundary:", error, errorInfo);
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return null; // Parent will show fallback UI
    }
    return this.props.children;
  }
}

// Check if WebGL is supported
function checkWebGLSupport(): { supported: boolean; error?: string } {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

    if (!gl) {
      return {
        supported: false,
        error: "WebGL is not supported by your browser",
      };
    }

    // Check for required extensions
    const ext = (gl as WebGLRenderingContext).getExtension("OES_standard_derivatives");
    if (!ext) {
      console.warn("[StarField] OES_standard_derivatives not supported");
    }

    return { supported: true };
  } catch (e) {
    return {
      supported: false,
      error: `WebGL initialization failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

interface DataRow {
  x: number | string;
  y: number | string;
  z: number | string;
  part_type?: string;
  name?: string;
  id?: string | number;
}

interface Starfield3DProps {
  csvUrl?: string;
  rows?: DataRow[];
  style?: React.CSSProperties;
  background?: string;
  enableAutoOrbit?: boolean;
  showOverlay?: boolean;
  showLegend?: boolean;
  onCameraMove?: (distance: number) => void;
  highlightPartType?: string | null;
  animateConvergence?: boolean;
  convergenceProgress?: number;
}

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aHighlight;
  attribute vec3 aInitialPosition;
  uniform float uConvergenceProgress;
  varying vec3 vColor;
  varying float vDepth;
  varying float vHighlight;

  void main() {
    vColor = aColor;
    vHighlight = aHighlight;

    // Interpolate between initial random position and final CSV position
    vec3 finalPosition = mix(aInitialPosition, position, uConvergenceProgress);

    vec4 mvPosition = modelViewMatrix * vec4(finalPosition, 1.0);
    // size attenuation: scale point size by perspective
    float dist = -mvPosition.z;
    vDepth = dist; // pass depth to fragment shader
    float attenuation = clamp(300.0 / dist, 0.0, 10.0);
    gl_PointSize = aSize * attenuation; // in screen pixels
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec3 vColor;
  varying float vDepth;
  varying float vHighlight;

  void main() {
    // circular sprite with soft edge
    vec2 uv = gl_PointCoord * 2.0 - 1.0;
    float d = dot(uv, uv);
    float alpha = smoothstep(1.0, 0.0, d); // soft disc

    // depth-based fade for better spatial perception
    float depthFade = 1.0 - smoothstep(5.0, 20.0, vDepth) * 0.4;
    alpha *= depthFade;

    // Dim non-highlighted points when a filter is active
    // vHighlight: 1.0 = highlighted, 0.0 = no filter active, -1.0 = dimmed
    float dimFactor = vHighlight > 0.5 ? 1.0 : (vHighlight < -0.5 ? 0.25 : 1.0);
    alpha *= dimFactor;

    // reduced star core glow for better distinction
    float glow = smoothstep(0.2, 0.0, d) * 0.25;
    vec3 color = vColor + glow;
    gl_FragColor = vec4(color, alpha);
  }
`;

function buildGeometryFromRows(
  rows: DataRow[],
  colorByPartType = true,
  generateRandomInitial = false,
  highlightPartType: string | null = null,
) {
  const n = rows.length;
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const sizes = new Float32Array(n);
  const highlights = new Float32Array(n);
  const partTypes = new Array(n).fill(""); // Store part types for each point
  const initialPositions = generateRandomInitial
    ? new Float32Array(n * 3)
    : null;

  // Calculate bounds for scaling
  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;
  let minZ = Infinity,
    maxZ = -Infinity;

  const coords = rows.map((r) => ({
    x: typeof r.x === "number" ? r.x : parseFloat(String(r.x)),
    y: typeof r.y === "number" ? r.y : parseFloat(String(r.y)),
    z: typeof r.z === "number" ? r.z : parseFloat(String(r.z)),
  }));

  coords.forEach((c) => {
    if (isFinite(c.x)) {
      minX = Math.min(minX, c.x);
      maxX = Math.max(maxX, c.x);
    }
    if (isFinite(c.y)) {
      minY = Math.min(minY, c.y);
      maxY = Math.max(maxY, c.y);
    }
    if (isFinite(c.z)) {
      minZ = Math.min(minZ, c.z);
      maxZ = Math.max(maxZ, c.z);
    }
  });

  // Scale factor to spread points across ~500 units
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const rangeZ = maxZ - minZ || 1;
  const targetRange = 500;
  const scale = targetRange / Math.max(rangeX, rangeY, rangeZ);

  // map part_type -> color palette (optimized for most frequent types)
  const partTypeColors: Record<string, string> = {
    cds: "#ff6b6b", // red
    composite: "#4ecdc4", // teal
    regulatory: "#ffe66d", // yellow
    dna: "#95e1d3", // mint
    protein: "#ff8c42", // orange
    rbs: "#c44569", // dark pink
    intermediate: "#9b59b6", // purple
    reporter: "#3498db", // blue
    promoter: "#2ecc71", // green
    primer: "#e74c3c", // bright red
    rna: "#f39c12", // gold
    generator: "#1abc9c", // turquoise
    device: "#e67e22", // dark orange
    tag: "#9b59b6", // violet
    binding: "#34495e", // dark gray
    protein_domain: "#16a085", // dark teal
  };

  const defaultPalette = [
    new THREE.Color("#9ec9ff"),
    new THREE.Color("#ffd6a5"),
    new THREE.Color("#bdb2ff"),
    new THREE.Color("#caffbf"),
    new THREE.Color("#ffadad"),
    new THREE.Color("#fdffb6"),
  ];
  const partMap = new Map();
  let nextIndex = 0;
  let center = undefined;

  for (let i = 0; i < n; i++) {
    const r = rows[i];
    const c = coords[i];

    // Center and scale the coordinates
    const x = isFinite(c.x) ? (c.x - minX - rangeX / 2) * scale : 0;
    const y = isFinite(c.y) ? (c.y - minY - rangeY / 2) * scale : 0;
    const z = isFinite(c.z) ? (c.z - minZ - rangeZ / 2) * scale : 0;

    if (r.id == 22801) center = { x, y, z };

    positions[i * 3 + 0] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    // Generate random initial positions for convergence animation
    if (initialPositions) {
      const randomRadius = 800; // Smaller sphere to keep particles visible
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.random() * randomRadius;

      initialPositions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
      initialPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      initialPositions[i * 3 + 2] = r * Math.cos(phi);
    }

    // size: smaller points for better distinction when zoomed out
    const base = 0.5 + Math.random() * 0.8;
    sizes[i] = base;

    // Store part type for filtering
    partTypes[i] = r.part_type || "";
    if (highlightPartType === null) {
      highlights[i] = 0.0;
    } else if (partTypes[i] === highlightPartType) {
      highlights[i] = 1.0;
    } else {
      highlights[i] = -1.0;
    }

    let color;
    if (colorByPartType && r.part_type != null && r.part_type !== "") {
      // Use specific color if available, otherwise use default palette
      if (partTypeColors[r.part_type]) {
        color = new THREE.Color(partTypeColors[r.part_type]);
      } else {
        if (!partMap.has(r.part_type)) partMap.set(r.part_type, nextIndex++);
        const idx = partMap.get(r.part_type) % defaultPalette.length;
        color = defaultPalette[idx];
      }
    } else {
      // cool-to-warm gradient by depth
      const t = THREE.MathUtils.clamp((z + 500.0) / 1000.0, 0, 1);
      color = new THREE.Color().setHSL(
        0.6 * (1.0 - t) + 0.02,
        0.6,
        0.6 + 0.2 * (1.0 - t),
      );
    }
    colors[i * 3 + 0] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  if (center) {
    for (let i = 0; i < n; i++) {
        positions[i * 3 + 0] -= center.x;
        positions[i * 3 + 1] -= center.y;
        positions[i * 3 + 2] -= center.z;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aHighlight", new THREE.BufferAttribute(highlights, 1));

  // Add initial positions for convergence animation
  // Always add the attribute to avoid shader errors, use positions as fallback
  if (initialPositions) {
    geometry.setAttribute(
      "aInitialPosition",
      new THREE.BufferAttribute(initialPositions, 3),
    );
  } else {
    // Use the same positions as fallback (no animation)
    geometry.setAttribute(
      "aInitialPosition",
      new THREE.BufferAttribute(positions.slice(), 3),
    );
  }

  geometry.computeBoundingSphere();
  return { geometry, positions, partMap, partTypes };
}

function useCSV(csvUrl?: string) {
  const [rows, setRows] = useState<DataRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => Boolean(csvUrl));

  useEffect(() => {
    if (!csvUrl) return;
    let cancelled = false;

    console.log("[StarField] Fetching CSV from:", csvUrl);

    // Fetch the CSV manually first to debug
    fetch(csvUrl)
      .then((response) => {
        console.log(
          "[StarField] Fetch response:",
          response.status,
          response.statusText,
        );
        console.log(
          "[StarField] Content-Type:",
          response.headers.get("content-type"),
        );
        return response.text();
      })
      .then((csvText) => {
        if (cancelled) return;
        console.log("[StarField] CSV text length:", csvText.length);
        console.log("[StarField] First 200 chars:", csvText.substring(0, 200));

        Papa.parse<DataRow>(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (cancelled) return;
            console.log(
              "[StarField] CSV parsed, total rows:",
              results.data.length,
            );
            console.log(
              "[StarField] First few rows:",
              results.data.slice(0, 3),
            );
            if (results.errors?.length) {
              console.error("[StarField] Parse errors:", results.errors);
              setError(results.errors[0].message || "CSV parse error");
            }
            const filtered = results.data.filter((row, index) => {
              const hasData =
                row.x != null && row.y != null && row.z != null;
              if (!hasData && index < 5) {
                console.log("[StarField] Skipping row:", row);
              }
              return hasData;
            });
            console.log(
              "[StarField] Filtered rows with x,y,z:",
              filtered.length,
            );
            setRows(filtered);
            setLoading(false);
          },
        });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[StarField] Fetch error:", err);
        setError(err?.message || "CSV load error");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [csvUrl]);

  return { rows, error, loading };
}

// Removed 3D Labels component - now using 2D HTML overlay instead

function PointCloudPicker({
  rows,
  positions,
  onHover,
}: {
  rows: DataRow[];
  positions: Float32Array;
  onHover: (
    data: {
      id: string | number;
      name: string;
      part_type?: string;
      position: [number, number, number];
    } | null,
  ) => void;
}) {
  const { raycaster, camera, gl, size } = useThree();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const mouseDownIndexRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = gl.domElement;

    const handlePointerMove = (event: PointerEvent) => {
      // Get mouse position in screen pixels
      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      // Find closest point using screen-space projection
      let closestIndex = -1;
      let closestScreenDist = Infinity;
      let closestDepth = Infinity;
      const pixelThreshold = 5; // pixels

      for (let i = 0; i < rows.length; i++) {
        const x = positions[i * 3];
        const y = positions[i * 3 + 1];
        const z = positions[i * 3 + 2];

        // Project 3D point to screen space
        const pointPos = new THREE.Vector3(x, y, z);
        const projected = pointPos.clone().project(camera);

        // Convert to screen pixels
        const screenX = (projected.x * 0.5 + 0.5) * size.width;
        const screenY = (-(projected.y * 0.5) + 0.5) * size.height;

        // Check if point is in front of camera
        if (projected.z >= 1) continue;

        // Calculate screen-space distance to mouse
        const dx = screenX - mouseX;
        const dy = screenY - mouseY;
        const screenDist = Math.sqrt(dx * dx + dy * dy);

        // Get depth (distance to camera)
        const depth = camera.position.distanceTo(pointPos);

        // Pick closest point within pixel threshold
        // If multiple points match, prefer the one closest to camera (depth)
        if (screenDist < pixelThreshold) {
          if (
            screenDist < closestScreenDist ||
            (screenDist === closestScreenDist && depth < closestDepth)
          ) {
            closestScreenDist = screenDist;
            closestDepth = depth;
            closestIndex = i;
          }
        }
      }

      if (closestIndex !== -1 && closestIndex !== hoveredIndex) {
        setHoveredIndex(closestIndex);
        const row = rows[closestIndex];
        const x = positions[closestIndex * 3];
        const y = positions[closestIndex * 3 + 1];
        const z = positions[closestIndex * 3 + 2];

        onHover({
          id: row.id!,
          name: String(row.name || row.id),
          part_type: row.part_type,
          position: [x, y, z],
        });
        canvas.style.cursor = "pointer";
      } else if (closestIndex === -1 && hoveredIndex !== null) {
        setHoveredIndex(null);
        onHover(null);
        canvas.style.cursor = "default";
      }
    };

    const handleMouseDown = () => {
      // Store the index of the point when mouse button is pressed
      mouseDownIndexRef.current = hoveredIndex;
    };

    const handleMouseUp = () => {
      // Only navigate if mouseup is on the same point as mousedown
      if (
        hoveredIndex !== null &&
        hoveredIndex === mouseDownIndexRef.current &&
        rows[hoveredIndex]?.id
      ) {
        window.open(
          `https://biocomplete.it/sequences/${rows[hoveredIndex].id}`,
          "_blank",
        );
      }
      mouseDownIndexRef.current = null;
    };

    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mouseup", handleMouseUp);

    return () => {
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mouseup", handleMouseUp);
    };
  }, [raycaster, camera, gl, rows, positions, onHover, hoveredIndex, size]);

  return null;
}

function StarPoints({
  rows,
  csvUrl,
  colorByPartType = true,
  onHover,
  highlightPartType,
  animateConvergence = false,
  convergenceProgress = 1.0,
}: {
  rows?: DataRow[];
  csvUrl?: string;
  colorByPartType?: boolean;
  onHover?: (
    data: {
      id: string | number;
      name: string;
      part_type?: string;
      position: [number, number, number];
    } | null,
  ) => void;
  highlightPartType?: string | null;
  animateConvergence?: boolean;
  convergenceProgress?: number;
}) {
  const { rows: loadedRows, error, loading } = useCSV(csvUrl);
  const dataRows = rows ?? loadedRows;

  const geometryData = useMemo(() => {
    if (dataRows) {
      return buildGeometryFromRows(
        dataRows,
        colorByPartType,
        animateConvergence,
        highlightPartType,
      );
    }
    return null;
  }, [dataRows, colorByPartType, animateConvergence, highlightPartType]);

  // Memoize uniforms object to prevent material recreation on every render
  const uniforms = useMemo(
    () => ({
      uConvergenceProgress: { value: 0.0 },
    }),
    [],
  );

  const matRef = useRef<THREE.ShaderMaterial>(null);

  // Update convergence progress uniform every frame
  useFrame(() => {
    if (matRef.current?.uniforms?.uConvergenceProgress) {
      const newValue = animateConvergence ? convergenceProgress : 1.0;
      matRef.current.uniforms.uConvergenceProgress.value = newValue;
    }
  });

  useEffect(() => {
    return () => {
      geometryData?.geometry.dispose();
    };
  }, [geometryData]);

  if (error) {
    return <group />;
  }
  if (loading || !geometryData) {
    return <group />;
  }

  return (
    <>
      <points frustumCulled>
        <primitive object={geometryData.geometry} attach="geometry" />
        <shaderMaterial
          ref={matRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          blending={THREE.AdditiveBlending}
          transparent
          depthWrite={false}
          uniforms={uniforms}
        />
      </points>
      {dataRows && onHover && (
        <PointCloudPicker
          rows={dataRows}
          positions={geometryData.positions}
          onHover={onHover}
        />
      )}
    </>
  );
}

function CameraMotionDetector({
  cameraRef,
  enableAutoOrbit = false,
  onCameraMove,
}: {
  cameraRef: RefObject<THREE.Camera | null>;
  enableAutoOrbit?: boolean;
  onCameraMove?: (distance: number) => void;
}) {
  const initialPosition = useRef<THREE.Vector3 | null>(null);

  useFrame(({ clock }) => {
    const camera = cameraRef.current;
    if (!camera) return;

    // Capture the actual initial camera position on first frame
    if (initialPosition.current === null) {
      initialPosition.current = camera.position.clone();
    }

    // Auto orbit motion
    if (enableAutoOrbit) {
      const t = clock.getElapsedTime();
      const r = 220;
      camera.position.x = Math.cos(t * 0.08) * r;
      camera.position.z = Math.sin(t * 0.08) * r;
      camera.position.y = Math.sin(t * 0.11) * 40;
      camera.lookAt(0, 0, 0);
    }

    // Pass camera distance to parent
    if (onCameraMove && initialPosition.current) {
      const distance = camera.position.distanceTo(initialPosition.current);
      onCameraMove(distance);
    }
  });

  return null;
}

function HoverLabelProjector({
  hoveredData,
  onScreenPosUpdate,
}: {
  hoveredData: {
    id: string | number;
    name: string;
    part_type?: string;
    position: [number, number, number];
  } | null;
  onScreenPosUpdate: (pos: { x: number; y: number } | null) => void;
}) {
  const { camera, size } = useThree();
  const lastRef = useRef<{ x: number; y: number } | null>(null);

  useFrame(() => {
    if (!hoveredData) {
      if (lastRef.current !== null) {
        lastRef.current = null;
        onScreenPosUpdate(null);
      }
      return;
    }

    const vector = new THREE.Vector3(...hoveredData.position);
    vector.project(camera);

    // Convert to screen coordinates
    const x = (vector.x * 0.5 + 0.5) * size.width;
    const y = (-(vector.y * 0.5) + 0.5) * size.height;

    // Check if point is in front of camera
    if (vector.z < 1) {
      const prev = lastRef.current;
      if (!prev || Math.abs(prev.x - x) > 0.5 || Math.abs(prev.y - y) > 0.5) {
        lastRef.current = { x, y };
        onScreenPosUpdate({ x, y });
      }
    } else {
      if (lastRef.current !== null) {
        lastRef.current = null;
        onScreenPosUpdate(null);
      }
    }
  });

  return null;
}

export default function Starfield3D({
  csvUrl,
  rows,
  style,
  background = "#02040a",
  enableAutoOrbit = false,
  showOverlay = true,
  showLegend = true,
  onCameraMove,
  highlightPartType,
  animateConvergence = false,
  convergenceProgress = 1.0,
}: Starfield3DProps) {
  const [hoveredData, setHoveredData] = useState<{
    id: string | number;
    name: string;
    part_type?: string;
    position: [number, number, number];
  } | null>(null);
  const [screenPos, setScreenPos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [renderError, setRenderError] = useState<string | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const [webglSupport] = useState<{
    supported: boolean;
    error?: string;
  } | null>(() => {
    if (typeof window === "undefined") return null;
    return checkWebGLSupport();
  });

  // Handle Canvas creation errors
  const handleCanvasError = (error: Error) => {
    console.error("[StarField] Canvas error:", error);
    setRenderError(
      error.message || "An error occurred while rendering the 3D scene",
    );
  };

  const partTypeColors: Record<string, string> = {
    cds: "#ff6b6b",
    composite: "#4ecdc4",
    regulatory: "#ffe66d",
    dna: "#95e1d3",
    protein: "#ff8c42",
    rbs: "#c44569",
    intermediate: "#9b59b6",
    reporter: "#3498db",
    promoter: "#2ecc71",
    primer: "#e74c3c",
    rna: "#f39c12",
    generator: "#1abc9c",
  };

  // Show fallback UI if WebGL is not supported or if there's a render error
  const showFallback =
    (webglSupport && !webglSupport.supported) || renderError !== null;

  const errorMessage =
    renderError ||
    webglSupport?.error ||
    "Unable to render 3D visualization";

  return (
    <div
      className="w-full h-full"
      style={{ ...style, position: "relative", overflow: "visible" }}
    >
      {/* Error/Unsupported Browser Fallback */}
      {showFallback && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: background,
            color: "white",
            padding: "2rem",
            textAlign: "center",
            zIndex: 100,
          }}
        >
          <div
            style={{
              maxWidth: "500px",
              padding: "2rem",
              background: "rgba(255, 255, 255, 0.05)",
              borderRadius: "12px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <div
              style={{
                fontSize: "3rem",
                marginBottom: "1rem",
              }}
            >
              ⚠️
            </div>
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: "600",
                marginBottom: "1rem",
              }}
            >
              3D Visualization Unavailable
            </h2>
            <p
              style={{
                fontSize: "1rem",
                color: "rgba(255, 255, 255, 0.8)",
                marginBottom: "1.5rem",
                lineHeight: "1.6",
              }}
            >
              {errorMessage}
            </p>
            <div
              style={{
                fontSize: "0.875rem",
                color: "rgba(255, 255, 255, 0.6)",
                lineHeight: "1.5",
              }}
            >
              <p>This visualization requires WebGL support.</p>
              <p style={{ marginTop: "0.5rem" }}>
                Please try using a modern browser like Chrome, Firefox, Edge, or
                Safari.
              </p>
              <p style={{ marginTop: "0.5rem" }}>
                You can continue navigating to other parts of the site.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Canvas in back - only render if no error */}
      {!showFallback && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 1,
          }}
        >
          <StarFieldErrorBoundary onError={handleCanvasError}>
            <Canvas
              camera={{ fov: 60, near: 0.1, far: 5000, position: [0, 10, 100] }}
              dpr={[1, 2]}
              gl={{
                antialias: false,
                powerPreference: "high-performance",
                alpha: false,
                logarithmicDepthBuffer: true,
              }}
              onCreated={({ gl, camera }) => {
                cameraRef.current = camera;
                gl.setClearColor(new THREE.Color(background), 1);
              }}
            >
              <color attach="background" args={[background]} />

          {/* Star field */}
          <StarPoints
            csvUrl={csvUrl}
            rows={rows}
            onHover={setHoveredData}
            highlightPartType={highlightPartType}
            animateConvergence={animateConvergence}
            convergenceProgress={convergenceProgress}
          />

          {/* Projector for hover label positioning */}
          <HoverLabelProjector
            hoveredData={hoveredData}
            onScreenPosUpdate={setScreenPos}
          />

          {/* Subtle post FX for cinematic look */}
          <EffectComposer multisampling={0}>
            <Bloom
              intensity={0.2}
              luminanceThreshold={0.05}
              luminanceSmoothing={0.2}
              mipmapBlur
            />
            <Noise opacity={0.05} />
            <Vignette eskil={false} offset={0.2} darkness={0.6} />
          </EffectComposer>

          {/* Camera controls and motion detection */}
              <CameraMotionDetector
                cameraRef={cameraRef}
                enableAutoOrbit={enableAutoOrbit}
                onCameraMove={onCameraMove}
              />
              <OrbitControls
                enableDamping
                dampingFactor={0.05}
                enablePan={false}
                minDistance={50}
                maxDistance={600}
              />
            </Canvas>
          </StarFieldErrorBoundary>
        </div>
      )}

      {/* Overlay title/instructions (optional) */}
      {!showFallback && showOverlay && (
        <div
          className="pointer-events-none absolute left-0 top-0 p-4 text-white/80 text-sm"
          style={{ zIndex: 10 }}
        >
          <div className="font-medium">3D Starfield</div>
          <div className="opacity-80">Scroll to zoom • drag to orbit</div>
        </div>
      )}

      {/* Color Legend */}
      {!showFallback && showLegend && (
        <div
          className="pointer-events-none absolute right-4 top-4 p-3 bg-black/60 backdrop-blur-sm rounded-lg text-white text-xs border border-white/20"
          style={{ zIndex: 10 }}
        >
          <div className="font-semibold mb-2 text-sm">Part Types</div>
          <div className="space-y-1">
            {Object.entries(partTypeColors).map(([type, color]) => (
              <div key={type} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: color,
                    boxShadow: `0 0 8px ${color}`,
                  }}
                />
                <span className="capitalize">{type.replace("_", " ")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2D Hover Label */}
      {!showFallback && hoveredData && screenPos && (
        <div
          style={{
            position: "absolute",
            left: `${screenPos.x}px`,
            top: `${screenPos.y}px`,
            transform: "translate(-50%, calc(-100% - 20px))",
            zIndex: 10000,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              background: "rgba(0, 0, 0, 0.95)",
              backdropFilter: "blur(8px)",
              borderRadius: "8px",
              padding: "12px 16px",
              color: "white",
              border: "2px solid rgba(255, 255, 255, 0.5)",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
              minWidth: "200px",
            }}
          >
            <div
              style={{
                fontWeight: 600,
                fontSize: "16px",
                marginBottom: "4px",
                whiteSpace: "nowrap",
              }}
            >
              {hoveredData.name}
            </div>
            <div
              style={{
                fontSize: "14px",
                color: "rgba(255, 255, 255, 0.8)",
                whiteSpace: "nowrap",
              }}
            >
              <div>ID: {hoveredData.id}</div>
              {hoveredData.part_type && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginTop: "4px",
                  }}
                >
                  <span>Type:</span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {partTypeColors[hoveredData.part_type] && (
                      <div
                        style={{
                          width: "10px",
                          height: "10px",
                          borderRadius: "50%",
                          backgroundColor:
                            partTypeColors[hoveredData.part_type],
                          boxShadow: `0 0 6px ${partTypeColors[hoveredData.part_type]}`,
                        }}
                      />
                    )}
                    <span style={{ textTransform: "capitalize" }}>
                      {hoveredData.part_type.replace("_", " ")}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* Arrow pointing to the point */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: "0",
              transform: "translate(-50%, 100%)",
              width: "0",
              height: "0",
              borderLeft: "8px solid transparent",
              borderRight: "8px solid transparent",
              borderTop: "8px solid rgba(0, 0, 0, 0.95)",
            }}
          />
        </div>
      )}
    </div>
  );
}
