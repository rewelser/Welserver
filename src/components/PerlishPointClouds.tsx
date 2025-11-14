// PerlishPointClouds.tsx
import React, { useEffect, useRef } from "react";
import * as THREE from "three";

type PerlishPointCloudsProps = {
  foregroundColor?: string;
  backgroundColor?: string;
  /** max probability at noise peaks, 0..1 (brightest parts) */
  maxProbabilityPeak?: number;
  /** min probability at noise peaks, 0..1 (shoulder of blobs) */
  minProbabilityPeak?: number;
  /** max probability at noise troughs, 0..1 (darkest parts) */
  maxProbabilityTrough?: number;
  /** how fast the noise field morphs */
  fieldSpeed?: number;
  /** scale of the noise field (smaller = bigger blobs) */
  noiseScale?: number;
  className?: string;
  width?: number | string;
  height?: number | string;
};

const PerlishPointClouds: React.FC<PerlishPointCloudsProps> = ({
  foregroundColor = "#1e90ff",
  backgroundColor = "#000000",
  maxProbabilityPeak = 0.8,
  minProbabilityPeak = 0.4,
  maxProbabilityTrough = 0.02,
  fieldSpeed = 0.15,
  noiseScale = 2.5,
  className,
  width = "100%",
  height = "100%",
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  const makeColorVec3 = (hex: string) => {
    const c = new THREE.Color(hex);
    return new THREE.Vector3(c.r, c.g, c.b);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // renderer
    const renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // scene + cam + fullscreen quad
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);

    // initial colors
    const fgVec = makeColorVec3(foregroundColor);
    const bgVec = makeColorVec3(backgroundColor);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        resolution: { value: new THREE.Vector2(1, 1) },
        foreground: { value: fgVec },
        background: { value: bgVec },
        maxProbPeak: { value: maxProbabilityPeak },
        minProbPeak: { value: minProbabilityPeak },
        maxProbTrough: { value: maxProbabilityTrough },
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
        uniform float maxProbPeak;
        uniform float minProbPeak;
        uniform float maxProbTrough;
        uniform float fieldSpeed;
        uniform float noiseScale;

        // --- simplex noise 3D ---
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

        // better per-pixel hash
        float hash21(vec2 p) {
          p = floor(p);
          vec3 p3 = fract(vec3(p.xyx) * 0.1031);
          p3 += dot(p3, p3.yzx + 33.33);
          return fract((p3.x + p3.y) * p3.z);
        }

        void main() {
          vec2 uv = gl_FragCoord.xy / resolution.xy;

          float f1 = snoise(vec3(uv * noiseScale, time * fieldSpeed));
          float f2 = snoise(vec3(uv * (noiseScale * 2.0), time * fieldSpeed * 1.7));
          float field = mix(f1, f2, 0.35);
          field = (field + 1.0) * 0.5; // 0..1

          // first, keep a dead-ish low zone
          // how fast we leave trough
          // float mid  = smoothstep(0.0, 0.4, field);
          // float mid  = smoothstep(0.0, 0.6, field);
          float mid  = smoothstep(0.0, 0.7, field);
          // how fast we enter peak
          // float high = smoothstep(0.6, 1.0, field);
          // float high = smoothstep(0.45, 0.85, field);
          // float nearHigh = smoothstep(0.25, 0.5, field); // lower than high
          float high = smoothstep(0.35, 0.7, field);

          // ---- calm band near the top ----
          // uv.y: 0.0 = bottom, 1.0 = top
          // We want: bottom -> keep prob, top -> push prob toward trough
          float calmMask = smoothstep(1.2, 1.8, uv.y);
          // calmMask ≈ 0 below ~70% height, ≈ 1 near the very top

          // start from trough
          float prob = maxProbTrough;
          // add some mid-range (shoulder)
          prob = mix(prob, minProbPeak, mid);
          // prob = mix(prob, maxProbPeak * 0.9, nearHigh); // almost peak
          // then add the real peak (core)
          prob = mix(prob, maxProbPeak, high);

          // ---- update prob per calm band ----
          prob = mix(prob, maxProbTrough, calmMask);
          // At bottom: prob ~ original
          // At top: prob ~ maxProbTrough (very low), so mostly background pixels

          // per-pixel random
          float r = hash21(gl_FragCoord.xy);

          vec3 color = (r < prob) ? foreground : background;

          // force-encode to sRGB so it matches hex
          color = pow(color, vec3(1.0 / 2.2));

          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
    material.toneMapped = false;
    materialRef.current = material;

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const resize = () => {
      if (!container) return;
      const w =
        typeof width === "number"
          ? width
          : container.clientWidth || window.innerWidth;
      const h =
        typeof height === "number"
          ? height
          : container.clientHeight || window.innerHeight;

      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(w, h, false);

      // show at normal CSS size
      const scale = 1; // try 2 or even 3
      renderer.setSize(w * scale, h * scale, false);
      renderer.domElement.style.width = `${w}px`;
      renderer.domElement.style.height = `${h}px`;
      renderer.domElement.style.imageRendering = "pixelated";
      material.uniforms.resolution.value.set(w * scale, h * scale);
    };

    resize();
    window.addEventListener("resize", resize);

    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = (now - start) / 1000.0;
      material.uniforms.time.value = elapsed;
      renderer.render(scene, camera);
    };
    renderer.setAnimationLoop(animate);

    return () => {
      window.removeEventListener("resize", resize);
      renderer.setAnimationLoop(null);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reactive updates
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.foreground.value =
        makeColorVec3(foregroundColor);
    }
  }, [foregroundColor]);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.background.value =
        makeColorVec3(backgroundColor);
    }
  }, [backgroundColor]);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.maxProbPeak.value = maxProbabilityPeak;
    }
  }, [maxProbabilityPeak]);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.minProbPeak.value = minProbabilityPeak;
    }
  }, [minProbabilityPeak]);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.maxProbTrough.value = maxProbabilityTrough;
    }
  }, [maxProbabilityTrough]);

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
      style={{ width, height, display: "block", position: "relative" }}
    />
  );
};

export default PerlishPointClouds;
