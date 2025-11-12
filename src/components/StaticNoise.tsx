// StaticNoise.tsx
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

type StaticNoiseProps = {
  /** Color for the "on" pixels */
  foregroundColor?: string; // e.g. "#1e90ff"
  /** Color for the "off" pixels / background */
  backgroundColor?: string; // e.g. "#000000"
  /** How fast the noise changes */
  speed?: number; // 0.5 .. 3 is a good range
  /** What percentage of pixels should be "on" (0..1) */
  threshold?: number;
  /** Optional className for outer div */
  className?: string;
  /** Explicit width/height; otherwise it fills parent */
  width?: number | string;
  height?: number | string;
};

const StaticNoise: React.FC<StaticNoiseProps> = ({
  foregroundColor = '#1e90ff',
  backgroundColor = '#000000',
  speed = 1.0,
  threshold = 0.5,
  className,
  width = '100vw',
  height = '100vh',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  // helper: convert hex -> THREE.Color -> vec3
  const makeColorVec3 = (hex: string) => {
    const c = new THREE.Color(hex);
    return new THREE.Vector3(c.r, c.g, c.b);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: false });
    rendererRef.current = renderer;
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const geometry = new THREE.PlaneGeometry(2, 2);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        resolution: { value: new THREE.Vector2(1, 1) },
        foreground: { value: makeColorVec3(foregroundColor) },
        background: { value: makeColorVec3(backgroundColor) },
        threshold: { value: threshold },
        speed: { value: speed },
      },
      vertexShader: /* glsl */ `
        void main() {
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float time;
        uniform vec2 resolution;
        uniform vec3 foreground;
        uniform vec3 background;
        uniform float threshold;
        uniform float speed;

        // simple hash-based random
        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }

        void main() {
          // use screen coords so it's per-pixel
          vec2 uv = gl_FragCoord.xy / resolution.xy;

          // animate by shifting uv with time*speed
          float n = random(uv * (time * speed + 1.0));

          vec3 color = mix(background, foreground, step(threshold, n));
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });

    materialRef.current = material;

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const resize = () => {
      if (!container) return;
      const w =
        typeof width === 'number'
          ? width
          : container.clientWidth || window.innerWidth;
      const h =
        typeof height === 'number'
          ? height
          : container.clientHeight || window.innerHeight;

      renderer.setSize(w, h, false);
      material.uniforms.resolution.value.set(w, h);
    };

    resize();
    window.addEventListener('resize', resize);

    let start = performance.now();

    const animate = (now: number) => {
      const elapsed = (now - start) / 1000.0;
      material.uniforms.time.value = elapsed;
      renderer.render(scene, camera);
      renderer.setAnimationLoop(animate);
    };
    renderer.setAnimationLoop(animate);

    return () => {
      window.removeEventListener('resize', resize);
      renderer.setAnimationLoop(null);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // update uniforms when props change
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.foreground.value = makeColorVec3(
        foregroundColor
      );
    }
  }, [foregroundColor]);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.background.value = makeColorVec3(
        backgroundColor
      );
    }
  }, [backgroundColor]);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.threshold.value = threshold;
    }
  }, [threshold]);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.speed.value = speed;
    }
  }, [speed]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width, height, display: 'block', position: 'relative' }}
    />
  );
};

export default StaticNoise;
