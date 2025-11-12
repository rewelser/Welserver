import React, { useEffect, useRef } from "react";

const createNoise = () => {
  const perm = new Uint8Array(512);
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];

  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const grad = (hash: number, x: number, y: number) => {
    switch (hash & 3) {
      case 0: return x + y;
      case 1: return -x + y;
      case 2: return x - y;
      default: return -x - y;
    }
  };

  return function noise2D(x: number, y: number) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const topRight = perm[perm[X + 1] + Y + 1];
    const topLeft = perm[perm[X] + Y + 1];
    const bottomRight = perm[perm[X + 1] + Y];
    const bottomLeft = perm[perm[X] + Y];

    const u = fade(xf);
    const v = fade(yf);

    const x1 = grad(bottomLeft, xf, yf);
    const x2 = grad(bottomRight, xf - 1, yf);
    const y1 = x1 + u * (x2 - x1);

    const x3 = grad(topLeft, xf, yf - 1);
    const x4 = grad(topRight, xf - 1, yf - 1);
    const y2 = x3 + u * (x4 - x3);

    return (y1 + v * (y2 - y1) + 1) / 2;
  };
};

type Particle = {
  x: number;
  y: number;
};

type Props = {
  backgroundColor?: string;
  particleColor?: string;
};

export const ParticleCloudBackground: React.FC<Props> = ({
  backgroundColor = "#020617", // bg-slate-950 vibe
  particleColor = "#e2e8f0",   // slate-100-ish
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const noise = createNoise();

    // make a dense grid of particles
    const step = 6; // smaller = denser
    const particles: Particle[] = [];
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        particles.push({ x, y });
      }
    }

    let animId: number;
    const start = performance.now();

    const draw = (now: number) => {
      const t = (now - start) * 0.000015; // even slower
    //   const t = (now - start) * 0.00015; // slower
    //   const t = (now - start) * 0.001; // slow
      ctx.clearRect(0, 0, width, height);

      // background
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);

      for (const p of particles) {
        // sample noise
        const n = noise(p.x * 0.002, p.y * 0.002 + t * 0.4);
        // turn noise into opacity; adjust threshold to taste
        const alpha = Math.max(0, n - 0.4) * 2.0; // 0..1-ish
        if (alpha > 0.01) {
          ctx.globalAlpha = Math.min(alpha, 0.5);
          ctx.fillStyle = particleColor;
          // 1–2 px dot
          ctx.fillRect(p.x, p.y, 2, 2);
        }
      }

      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;

      // rebuild grid on resize
      particles.length = 0;
      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          particles.push({ x, y });
        }
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [backgroundColor, particleColor]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        zIndex: -1,
        pointerEvents: "none",
      }}
    />
  );
};
