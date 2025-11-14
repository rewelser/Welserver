import React, { useEffect, useState } from "react";

const FULL = {
  x: 0,
  y: 0,
  w: 252.66472,
  h: 167.70576,
};

// Rough region around the first glyph — tweak these while looking in browser
const ZOOM = {
  x: 68,
  y: 13,
  w: 1,
  h: 1,
};
// const ZOOM = {
//   x: 60*100,
//   y: 10*100,
//   w: 40,
//   h: 80,
// };

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export const LogoZoomPOC: React.FC = () => {
  const [t, setT] = useState(0); // 0 = full view, 1 = zoomed

  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const duration = 6000; // ms, full cycle (out → in → out)

    const loop = (now: number) => {
      const elapsed = (now - start) % duration;
      const phase = elapsed / duration; // 0 → 1

      // ping-pong 0→1→0
      const pingPong = phase < 0.5 ? phase * 2 : (1 - phase) * 2;

      // ease (optional): cosine ease-in-out
      const eased = 0.5 - 0.5 * Math.cos(Math.PI * pingPong);

      setT(eased);
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  const zoomT = 1 - t; // 0→1→0 becomes 1→0→1 (reverse)

const viewBox = [
  lerp(FULL.x, ZOOM.x, zoomT),
  lerp(FULL.y, ZOOM.y, zoomT),
  lerp(FULL.w, ZOOM.w, zoomT),
  lerp(FULL.h, ZOOM.h, zoomT),
].join(" ");

  return (
    <svg
      viewBox={viewBox}
      width={400}
      height={260}
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer wrapper from your original SVG */}
      <g id="g47" transform="translate(4.0096678,-0.50241695)">
        {/* First glyph only; you can paste the rest of your groups below */}
        <g
          fill="#000000"
          fillOpacity="1"
          id="g4"
          transform="translate(-63.872093,-113.7585)"
        >
          <g transform="translate(122.67221,170.1043)" id="g3">
            <g id="g2">
              <path
                id="path1"
                d="m 10.6875,5.09375 c 0,0.800781 -0.433594,1.203125 -1.296875,1.203125 -0.804687,0 -1.5,-0.367187 -2.09375,-1.09375 C 5.160156,2.460938 4.09375,-0.734375 4.09375,-4.390625 v -35.78125 c 0,-0.332031 -0.039062,-0.765625 -0.109375,-1.296875 -0.0625,-0.53125 -0.09375,-0.929688 -0.09375,-1.203125 0,-1.0625 0.5,-1.59375 1.5,-1.59375 0.863281,0 1.296875,0.570313 1.296875,1.703125 0,0.261719 -0.070312,0.609375 -0.203125,1.046875 -0.125,0.429687 -0.1875,0.808594 -0.1875,1.140625 V -4.390625 C 6.296875,-1.597656 6.863281,0.726562 8,2.59375 8.195312,2.863281 8.691406,3.210938 9.484375,3.640625 10.285156,4.078125 10.6875,4.5625 10.6875,5.09375 Z m 0,0"
              />
            </g>
          </g>
        </g>

        {/* TODO: paste the rest of the logo groups here if you want the full logo visible */}
      </g>
    </svg>
  );
};
