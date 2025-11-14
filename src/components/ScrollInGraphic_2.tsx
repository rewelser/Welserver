import React, { useEffect, useRef, useState } from "react";
import { VideoFrameSVG } from "./VideoFrameSVG";

interface ScrollInGraphicProps {
  /** Optional: path to an image/SVG (e.g., /graphics/sticker.svg) */
  src?: string;

  /** Optional: children, e.g., inline SVG JSX. Used if no videoSrc or src is provided. */
  children?: React.ReactNode;

  /** how far offscreen to start, in %, negative = from left, positive = from right */
  startOffsetPct?: number;

  /**
   * Not really used for locking version, but kept for compatibility.
   * Could be used to control scroll-based progress if you extend it later.
   */
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
  maxDistance = 300, // currently unused, kept for API compatibility
  videoSrc,
  maskSrc,
  inkSrc,
  innerClassName,
}) => {
  const ref = useRef<HTMLDivElement | null>(null);

  // 0 = fully offscreen (at startOffsetPct), 1 = fully in place
  const [progress, setProgress] = useState(0);

  // Are we in the phase where scrolling is hijacked to slide this graphic?
  const [isScrollLocked, setIsScrollLocked] = useState(false);

  // Once the intro is done (progress hits 1), never lock again.
  const [hasCompletedIntro, setHasCompletedIntro] = useState(false);

  /**
   * Effect 1: Watch normal scrolling to decide when the element
   * first appears in the viewport. At that moment, we enable scroll lock.
   */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleScroll = () => {
      if (hasCompletedIntro || isScrollLocked) return;

      const rect = el.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      const isVisible =
        rect.top < viewportHeight && rect.bottom > 0; // any overlap with viewport

      if (isVisible) {
        // We’ve just entered the viewport: start the “intro lock” phase
        setIsScrollLocked(true);
        // optional: ensure we start from 0 when it first appears
        setProgress((prev) => (prev === 0 ? 0 : prev));
      }
    };

    // Run once and then on scroll/resize
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [hasCompletedIntro, isScrollLocked]);

  /**
   * Effect 2: When scroll is locked, intercept wheel events
   * and use them to drive `progress` instead of actual page scroll.
   */
  useEffect(() => {
    if (!isScrollLocked || hasCompletedIntro) return;

    // Freeze page scroll by hiding overflow on body
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const unlock = () => {
      setIsScrollLocked(false);
      setHasCompletedIntro(true);
    };

    const handleWheel = (e: WheelEvent) => {
      // We need to prevent the default scroll behavior, so:
      e.preventDefault();

      // Map wheel delta to progress increment.
      // Tweak denominator for more/less sensitivity.
      const step = e.deltaY / 5000;

      setProgress((prev) => {
        const next = Math.max(0, Math.min(1, prev + step));

        if (next >= 1) {
          unlock();
        }

        return next;
      });
    };

    // Attach a non-passive wheel listener so preventDefault actually works.
    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      document.body.style.overflow = originalOverflow;
    };
  }, [isScrollLocked, hasCompletedIntro]);

  // interpolate translateX: 1 → 0% offset, 0 → startOffsetPct
  const translateX = ((1 - progress) * startOffsetPct).toFixed(2);

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
        transition: "transform 0s", // scroll/virtual-scroll tied
        willChange: "transform",
      }}
    >
      {renderInner()}
    </div>
  );
};

export default ScrollInGraphic;
