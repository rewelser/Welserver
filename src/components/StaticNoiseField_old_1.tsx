// StaticNoiseField.tsx
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

type StaticNoiseFieldProps = {
  foregroundColor?: string;
  backgroundColor?: string;
  /** max probability at noise peaks, 0..1 */
  maxProbability?: number;
  /** min probability at noise troughs, 0..1 */
  minProbability?: number;
  /** how fast the noise field moves */
  fieldSpeed?: number;
  /** scale of the noise field (bigger = chunkier blobs) */
  noiseScale?: number;
  className?: string;
  width?: number | string;
  height?: number | string;
};

const StaticNoiseField: React.FC<StaticNoiseFieldProps> = ({
  foregroundColor = '#1e90ff',
  backgroundColor = '#000000',
  maxProbability = 0.8,
  minProbability = 0.0,
  fieldSpeed = 0.15,
  noiseScale = 2.5,
  className,
  width = '100%',
  height = '100%',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  const makeColorVec3 = (hex: string) => {
    const c = new THREE.Color(hex);
    // const c = new THREE.Color(hex).convertSRGBToLinear();
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
        maxProb: { value: maxProbability },
        minProb: { value: minProbability },
        fieldSpeed: { value: fieldSpeed },
        noiseScale: { value: noiseScale },
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
        uniform float maxProb;
        uniform float minProb;
        uniform float fieldSpeed;
        uniform float noiseScale;

        // hash
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        // simple value noise
        float valueNoise(vec2 uv) {
          vec2 i = floor(uv);
          vec2 f = fract(uv);

          // 4 corners
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));

          // smoothstep for interpolation
          vec2 u = f * f * (3.0 - 2.0 * f);

          return mix(a, b, u.x) +
                 (c - a) * u.y * (1.0 - u.x) +
                 (d - b) * u.x * u.y;
        }

        // high-frequency random for the actual grain
        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }

        void main() {
          vec2 uv = gl_FragCoord.xy / resolution.xy;

          // 1) sample a smooth noise field
          // scale uv to control blob size, animate over time
          vec2 nUV = uv * noiseScale + vec2(time * fieldSpeed);
          float field = valueNoise(nUV); // 0..1

          // 2) map field -> probability
          float prob = mix(minProb, maxProb, field);

          // 3) pixel change rate
          float r = random(uv);

          vec3 color = (r < prob) ? foreground : background;
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    materialRef.current = material;

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

  // reactively update uniforms
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
      materialRef.current.uniforms.maxProb.value = maxProbability;
    }
  }, [maxProbability]);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.minProb.value = minProbability;
    }
  }, [minProbability]);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.fieldSpeed.value = fieldSpeed;
    }
  }, [fieldSpeed]);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.noiseScale.value = noiseScale;
    }
  }, [noiseScale]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width, height, display: 'block', position: 'relative' }}
    />
  );
};

export default StaticNoiseField;