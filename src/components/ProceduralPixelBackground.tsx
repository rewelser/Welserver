import React, { useEffect, useRef } from "react";
import * as THREE from "three";

type Props = {
  backgroundColor?: string;
  pointColor?: string;
  density?: number; // dots per screen-ish
  radius?: number;  // dot size
};

export const ProceduralPixelBackground: React.FC<Props> = ({
  backgroundColor = "#000000",
  pointColor = "#38bdf8",
  density = 260.0,
  radius = 0.28,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(new THREE.Color(backgroundColor), 1);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    // camera that just looks at a full-screen quad
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // full-screen plane
    const geometry = new THREE.PlaneGeometry(2, 2);

    // convert hex to vec3 for shader
    const bg = new THREE.Color(backgroundColor);
    const pt = new THREE.Color(pointColor);

    const uniforms = {
      uTime: { value: 0 },
      uResolution: {
        value: new THREE.Vector2(mount.clientWidth, mount.clientHeight),
      },
      uBg: { value: new THREE.Vector3(bg.r, bg.g, bg.b) },
      uPoint: { value: new THREE.Vector3(pt.r, pt.g, pt.b) },
      uDensity: { value: density },
      uRadius: { value: radius },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        void main() {
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;

        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec3 uBg;
        uniform vec3 uPoint;
        uniform float uDensity;
        uniform float uRadius;

        // ---- simplex noise 3D (same as before, compact) ----
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

          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
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

        void main() {
          // pixel coords -> 0..1
          vec2 uv = gl_FragCoord.xy / uResolution.xy;

          // make a virtual grid of dots
          // higher uDensity -> more, smaller cells
          vec2 grid = uv * uDensity;
          vec2 cell = fract(grid) - 0.5; // center cell at (0,0)
          float distToCenter = length(cell);

          // sample noise at the *cell center* so whole cell moves together
          vec2 cellId = floor(grid);
          vec2 cellUv = cellId / uDensity; // back to 0..1 space
          float n = snoise(vec3(cellUv * 1.3, uTime * 0.25));
          n = (n + 1.0) * 0.5; // 0..1

          // this is the "blob mask": where noise is high, dots exist
          float blob = smoothstep(0.45, 0.6, n);

          // this is the dot shape inside each cell
          float dotShape = 1.0 - smoothstep(uRadius, uRadius + 0.01, distToCenter);

          float alpha = blob * dotShape;

          vec3 col = mix(uBg, uPoint, alpha);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    let frameId: number;
    const animate = (t: number) => {
      material.uniforms.uTime.value = t * 0.001;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      material.uniforms.uResolution.value.set(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      mount.removeChild(renderer.domElement);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [backgroundColor, pointColor, density, radius]);

  return (
    <div
      ref={mountRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        pointerEvents: "none",
      }}
    />
  );
};
