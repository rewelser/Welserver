import React, { useEffect, useRef, useState } from "react";

interface ScrollInGraphicProps {
  /** Optional: path to an SVG (e.g., /graphics/sticker.svg) */
  src?: string;
  /** Optional: children, e.g., inline SVG JSX */
  children?: React.ReactNode;
  /** how far offscreen to start, in %, negative = from left, positive = from right */
  startOffsetPct?: number;
  /** max distance (in px) for the effect to complete */
  maxDistance?: number;
}

const ScrollInGraphic: React.FC<ScrollInGraphicProps> = ({
  src,
  children,
  startOffsetPct = -150, // start well off to the left
  maxDistance = 300,
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0); // 0 = offscreen, 1 = in place

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleScroll = () => {
      const rect = el.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // We’ll define “center” as viewport middle
      const viewportCenter = viewportHeight / 2;
      const elementCenter = rect.top + rect.height / 2;

      // useful for retreating the graphic on scroll up
      const distanceSigned = elementCenter - viewportCenter;

      // distance between element center and viewport center
      const distance = Math.abs(distanceSigned);

      let p = 1 - distance / maxDistance;
      p = Math.max(0, Math.min(1, p));

      setProgress(() => (distanceSigned >= 0 ? p : 1));
    };

    // run once and on scroll
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [maxDistance]);

  // interpolate translateX
  const translateX = ((1 - progress) * startOffsetPct).toFixed(2); // e.g. from -150% to 0%

  return (
    <div
      ref={ref}
      className="relative flex items-center justify-center overflow-visible"
      style={{
        transform: `translateX(${translateX}%)`,
        transition: "transform 0s", // no time-based easing, it's scroll-tied
        willChange: "transform",
      }}
    >
      {src ? (
        <img src={src} alt="scroll graphic" className="max-w-full h-auto" />
      ) : (
        children
      )}
    </div>
  );
};

export default ScrollInGraphic;
