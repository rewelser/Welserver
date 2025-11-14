import React, { useEffect, useRef, useState } from "react";

interface ScrollInGraphicProps {
  /** Whatever you want to scroll in: <svg>, <video>, etc. */
  children: React.ReactNode;

  /** how far offscreen to start, in %, negative = from left, positive = from right */
  startOffsetPct?: number;

  /** max distance (in px) for the effect to complete */
  maxDistance?: number;
}

const ScrollInGraphic: React.FC<ScrollInGraphicProps> = ({
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

      const viewportCenter = viewportHeight / 2;
      const elementCenter = rect.top + rect.height / 2;

      // signed distance: positive when element center is below viewport center
      const distanceSigned = elementCenter - viewportCenter;

      const distance = Math.abs(distanceSigned);

      let p = 1 - distance / maxDistance;
      p = Math.max(0, Math.min(1, p));

      // your existing retreat behavior – unchanged
      setProgress(() => (distanceSigned >= 0 ? p : 1));
    };

    // run once and on scroll/resize
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [maxDistance]);

  // interpolate translateX – unchanged
  const translateX = ((1 - progress) * startOffsetPct).toFixed(2); // e.g. from -150% to 0%

  return (
    <div
      ref={ref}
      className="relative flex items-center justify-center overflow-visible p-6"
      style={{
        transform: `translateX(${translateX}%)`,
        transition: "transform 0s", // scroll-tied
        // willChange: "transform",
      }}
    >
      {children}
    </div>
  );
};

export default ScrollInGraphic;
