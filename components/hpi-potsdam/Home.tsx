"use client";

import { useEffect, useRef, useState } from "react";
import Starfield3D from "./StarField";

const BASE = "/hpi-potsdam/";

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia(query);
    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}

export function Home() {
  const isTouch = !useMediaQuery("(pointer: coarse) and (hover: none)");
  const heroContentRef = useRef<HTMLDivElement>(null);
  const secondTextRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const scrollArrowRef = useRef<HTMLDivElement>(null);
  const [cameraDistance, setCameraDistance] = useState(0);
  const maxDistanceReached = useRef(0.0);
  const [selectedPartType, setSelectedPartType] = useState<string | null>(null);

  // Calculate convergence progress from camera distance (0-300 range maps to 0.0-1.0)
  const [convergenceProgress, setConvergenceProgress] = useState<number>(0.0);

  // Reset maxDistanceReached on mount
  useEffect(() => {
    maxDistanceReached.current = 0.0;
  }, []);

  const scrollToNextSection = () => {
    const target = document.getElementById("hpi-article-anchor");
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  };
  useEffect(() => {
    const threshold1 = 100;
    const threshold2 = 300;

    // Track max distance reached (one-way animation)
    if (cameraDistance > maxDistanceReached.current) {
      maxDistanceReached.current = cameraDistance;
    }
    // Start scattered (0.0), converge (1.0) as camera moves
    const newProgress = Math.min(maxDistanceReached.current / 320.0, 1.0);
    setConvergenceProgress(newProgress);

    const effectiveDistance = maxDistanceReached.current;

    if (effectiveDistance < threshold1) {
      // State 1: First text visible, second text hidden, legend hidden, arrow hidden
      if (heroContentRef.current) {
        heroContentRef.current.style.opacity = "1";
      }
      if (secondTextRef.current) {
        secondTextRef.current.style.opacity = "0";
      }
      if (legendRef.current) {
        legendRef.current.style.opacity = "0";
        legendRef.current.style.pointerEvents = "none";
      }
      if (scrollArrowRef.current) {
        scrollArrowRef.current.style.opacity = "0";
        scrollArrowRef.current.style.pointerEvents = "none";
      }
    } else if (
      effectiveDistance >= threshold1 &&
      effectiveDistance < threshold2
    ) {
      // State 2: First text faded, second text visible, legend hidden, arrow hidden
      if (heroContentRef.current) {
        heroContentRef.current.style.opacity = "0";
      }
      if (secondTextRef.current) {
        secondTextRef.current.style.opacity = "1";
      }
      if (legendRef.current) {
        legendRef.current.style.opacity = "0";
        legendRef.current.style.pointerEvents = "none";
      }
      if (scrollArrowRef.current) {
        scrollArrowRef.current.style.opacity = "0";
        scrollArrowRef.current.style.pointerEvents = "none";
      }
    } else {
      // State 3: First text faded, second text faded, legend visible, arrow visible
      if (heroContentRef.current) {
        heroContentRef.current.style.opacity = "0";
      }
      if (secondTextRef.current) {
        secondTextRef.current.style.opacity = "0";
      }
      if (legendRef.current) {
        legendRef.current.style.opacity = "1";
        legendRef.current.style.pointerEvents = "auto";
      }
      if (scrollArrowRef.current) {
        scrollArrowRef.current.style.opacity = "1";
        scrollArrowRef.current.style.pointerEvents = "auto";
      }
    }
  }, [cameraDistance]);

  const partTypeColors: Record<string, string> = {
    CDS: "#ff6b6b",
    composite: "#4ecdc4",
    regulatory: "#ffe66d",
    DNA: "#95e1d3",
    protein: "#ff8c42",
    RBS: "#c44569",
    intermediate: "#9b59b6",
    reporter: "#3498db",
    promoter: "#2ecc71",
    primer: "#e74c3c",
    RNA: "#f39c12",
    generator: "#1abc9c",
  };

  return (
    <div className="home-container">
      {/* HERO SECTION */}
      <section id="hpi-anchor-hero" className="hero-section">
        {/* Starfield as fixed background */}
        <div className="starfield-background" style={{ pointerEvents: "none" }}>
          <Starfield3D
            csvUrl={`${BASE}igem-composite-3d.csv`}
            background="#02040a"
            style={{ height: "100%", width: "100%" }}
            enableAutoOrbit={false}
            showOverlay={false}
            showLegend={false}
            onCameraMove={setCameraDistance}
            highlightPartType={selectedPartType}
            animateConvergence={isTouch}
            convergenceProgress={convergenceProgress}
          />
        </div>

        {/* First text - fades on initial interaction */}
        <div ref={heroContentRef} className="hero-content">
          <h1 className="hero-title">
            Lost in Parts <br /> Buried in Data
          </h1>
          <p className="hero-subtitle">
            Finding the right part shouldn&rsquo;t be this hard
          </p>
          <div className="hero-accent"></div>
        </div>

        {/* Second text - appears after first text fades */}
        <div
          ref={secondTextRef}
          className="hero-content"
          style={{ opacity: 0 }}
        >
          <h1 className="hero-title">Explore the iGEM Registry</h1>
          <p className="hero-subtitle">
            Use the embeddings of our DNA model in 3D space
          </p>
          <div className="hero-accent"></div>
        </div>

        {/* Legend - appears after second text fades */}
        <div
          ref={legendRef}
          className="starfield-legend"
          style={{ pointerEvents: "none" }}
        >
          <div className="legend-header">
            <div className="legend-title">Part Types</div>
            {selectedPartType && (
              <button
                className="legend-clear"
                onClick={() => setSelectedPartType(null)}
                title="Clear filter"
              >
                ✕
              </button>
            )}
          </div>
          <div className="legend-items">
            {Object.entries(partTypeColors).map(([type, color]) => (
              <div
                key={type}
                className={`legend-item ${selectedPartType === type.toLocaleLowerCase() ? "active" : selectedPartType !== null ? "dimmed" : ""}`}
                onClick={() =>
                  setSelectedPartType(
                    selectedPartType === type.toLowerCase()
                      ? null
                      : type.toLowerCase(),
                  )
                }
              >
                <div
                  className="legend-color"
                  style={{
                    backgroundColor: color,
                    boxShadow: `0 0 8px ${color}`,
                  }}
                />
                <span className="legend-label">{type.replace("_", " ")}</span>
              </div>
            ))}
          </div>
          <div className="legend-controls-hint">
            Scroll to zoom <br />
            Drag to move around
          </div>
        </div>

        <div
          ref={scrollArrowRef}
          className="scroll-arrow"
          style={{ opacity: 0, pointerEvents: "none" }}
          onClick={scrollToNextSection}
        ></div>
        <div
          className="scroll-arrow-mobile"
          onClick={scrollToNextSection}
        ></div>
      </section>

    </div>
  );
}
