"use client";

import { useEffect, useRef } from "react";
import {
  AmbientLight,
  DirectionalLight,
  LinearSRGBColorSpace,
  Mesh,
  MeshPhongMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  UniformsUtils,
  Vector2,
  WebGLRenderer,
} from "three";
import { useSpring } from "framer-motion";
import { VERTEX_SHADER, FRAGMENT_SHADER } from "./shaders";

const MOBILE_BP = 696;
const TABLET_BP = 1024;

type Uniforms = Record<string, { type?: string; value: unknown }>;

export function DisplacementSphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationX = useSpring(0, { stiffness: 30, damping: 20, mass: 2 });
  const rotationY = useSpring(0, { stiffness: 30, damping: 20, mass: 2 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const start = Date.now();
    const mouse = new Vector2(0.8, 0.5);

    const renderer = new WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = LinearSRGBColorSpace;

    const camera = new PerspectiveCamera(
      54,
      window.innerWidth / window.innerHeight,
      0.1,
      100,
    );
    camera.position.z = 52;

    const scene = new Scene();

    const material = new MeshPhongMaterial();
    let uniforms: Uniforms | undefined;
    material.onBeforeCompile = (shader) => {
      uniforms = UniformsUtils.merge([
        shader.uniforms as unknown as Uniforms,
        { time: { type: "f", value: 0 } },
      ]);
      shader.uniforms = uniforms as unknown as typeof shader.uniforms;
      shader.vertexShader = VERTEX_SHADER;
      shader.fragmentShader = FRAGMENT_SHADER;
    };

    const geometry = new SphereGeometry(32, 128, 128);
    const sphere = new Mesh(geometry, material);
    sphere.position.z = 0;
    scene.add(sphere);

    const dirLight = new DirectionalLight(0xffffff, 2.0);
    dirLight.position.set(100, 100, 200);
    const ambientLight = new AmbientLight(0xffffff, 0.4);
    scene.add(dirLight, ambientLight);

    const applyLayout = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const adjustedHeight = height + height * 0.3;
      renderer.setSize(width, adjustedHeight);
      camera.aspect = width / adjustedHeight;
      camera.updateProjectionMatrix();

      if (width <= MOBILE_BP) {
        sphere.position.set(14, 10, 0);
      } else if (width <= TABLET_BP) {
        sphere.position.set(18, 14, 0);
      } else {
        sphere.position.set(22, 16, 0);
      }
    };
    applyLayout();

    const onResize = () => applyLayout();
    window.addEventListener("resize", onResize);

    let lastMouse = { x: 0, y: 0 };
    const onMouseMove = (event: MouseEvent) => {
      lastMouse = {
        x: event.clientX / window.innerWidth,
        y: event.clientY / window.innerHeight,
      };
      rotationX.set(lastMouse.y / 2);
      rotationY.set(lastMouse.x / 2);
    };
    window.addEventListener("mousemove", onMouseMove);

    let rafId = 0;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      if (uniforms) {
        (uniforms.time as { value: number }).value =
          0.00005 * (Date.now() - start);
      }
      sphere.rotation.z += 0.001;
      sphere.rotation.x = rotationX.get();
      sphere.rotation.y = rotationY.get();
      renderer.render(scene, camera);
    };
    animate();

    void mouse; // retained reference if future extensions need initial pos

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [rotationX, rotationY]);

  return <canvas ref={canvasRef} aria-hidden className="hamish-canvas" />;
}
