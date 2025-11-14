import React, { useEffect, useRef, useState } from "react";
import { VideoFrameSVG } from "../components/VideoFrameSVG";

interface ScrollInGraphicProps {
  /** Optional: path to an image/SVG (e.g., /graphics/sticker.svg) */
  src?: string;

  /** Optional: children, e.g., inline SVG JSX. Used if no videoSrc or src is provided. */
  children?: React.ReactNode;

  /** how far offscreen to start, in %, negative = from left, positive = from right */
  startOffsetPct?: number;

  /** max distance (in px) for the effect to complete */
  maxDistance?: number;

  /**
   * Optional: video source. If provided, this takes precedence over `src`
   * and renders a VideoFrameSVG instead of a static <img>.
   */
  videoSrc?: string;

  /**
   * Optional: SVG/PNG path used as the mask for VideoFrameSVG
   * (e.g. "/graphics/blutattoo-trimmed-black.svg").
   * Required if `videoSrc` is provided.
   */
  maskSrc?: string;

  /**
   * Optional: visible top image for VideoFrameSVG (ink layer).
   * Defaults to `maskSrc` if omitted.
   */
  inkSrc?: string;

  /** Optional: extra classes for the inner graphic element */
  innerClassName?: string;
}

const ScrollInGraphic: React.FC<ScrollInGraphicProps> = ({
  src,
  children,
  startOffsetPct = -150, // start well off to the left
  maxDistance = 300,
  videoSrc,
  maskSrc,
  inkSrc,
  innerClassName,
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

      // your existing retreat behavior
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

  // interpolate translateX
  const translateX = ((1 - progress) * startOffsetPct).toFixed(2); // e.g. from -150% to 0%

  // Decide what to render inside:
  // 1) If videoSrc is provided (and maskSrc), render VideoFrameSVG
  // 2) Else if src is provided, render <img>
  // 3) Else, render children
  const renderInner = () => {
    if (videoSrc && maskSrc) {
      return (
        <div className={`w-full ${innerClassName ?? ""}`}>
          <VideoFrameSVG
            videoSrc={videoSrc}
            maskSrc={maskSrc}
            inkSrc={inkSrc}
            className="w-full"
          />
        </div>
      );
    }

    if (src) {
      return (
        <img
          src={src}
          alt="scroll graphic"
          className={`max-w-full h-auto ${innerClassName ?? ""}`}
        />
      );
    }

    return children;
  };

  return (
    <div
      ref={ref}
      className="relative flex items-center justify-center overflow-visible"
      style={{
        transform: `translateX(${translateX}%)`,
        transition: "transform 0s", // scroll-tied
        willChange: "transform",
      }}
    >
      {renderInner()}
    </div>
  );
};

export default ScrollInGraphic;
