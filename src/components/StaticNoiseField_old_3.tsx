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

        // --- simplex noise 3D (same as before) ---
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

        float snoise(vec3 v)
        {
          const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
          const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

          vec3 i  = floor(v + dot(v, C.yyy) );
          vec3 x0 =   v - i + dot(i, C.xxx) ;

          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min( g.xyz, l.zxy );
          vec3 i2 = max( g.xyz, l.zxy );

          vec3 x1 = x0 - i1 + 1.0 * C.xxx;
          vec3 x2 = x0 - i2 + 2.0 * C.xxx;
          vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

          i = mod289(i);
          vec4 p = permute( permute( permute(
                    i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                  + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                  + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

          float n_ = 1.0/7.0;
          vec3  ns = n_ * D.wyz - D.xzx;

          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_ );

          vec4 x = x_ *ns.x + ns.yyyy;
          vec4 y = y_ *ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);

          vec4 b0 = vec4( x.xy, y.xy );
          vec4 b1 = vec4( x.zw, y.zw );

          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));

          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
          vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

          vec3 p0 = vec3(a0.xy,h.x);
          vec3 p1 = vec3(a0.zw,h.y);
          vec3 p2 = vec3(a1.xy,h.z);
          vec3 p3 = vec3(a1.zw,h.w);

          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1),
                                        dot(p2,p2), dot(p3,p3)));
          p0 *= norm.x;
          p1 *= norm.y;
          p2 *= norm.z;
          p3 *= norm.w;

          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1),
                                  dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                        dot(p2,x2), dot(p3,x3) ) );
        }

        float hash21(vec2 p) {
          // p = floor(p); // optional, to ensure exact pixel basis
          vec3 p3 = fract(vec3(p.xyx) * 0.1031);
          p3 += dot(p3, p3.yzx + 33.33);
          return fract((p3.x + p3.y) * p3.z);
        }

        void main() {
          vec2 uv = gl_FragCoord.xy / resolution.xy;

          // build 3D noise coords
          // uv * noiseScale = blob size
          // time * fieldSpeed = how fast the noise morphs
          float field = snoise(vec3(uv * noiseScale, time * fieldSpeed));
          field = (field + 1.0) * 0.5; // -1..1 -> 0..1

          // map field -> probability
          float prob = mix(minProb, maxProb, field);

          // per-pixel random
          float r = hash21(gl_FragCoord.xy);

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