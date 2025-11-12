import React, { useEffect, useRef, useState } from "react";

type ScrollGraphicProps = {
  graphicSrc: string;
  alt?: string;
  // how much vertical range (in px) we use to bring it fully in
  enterDistance?: number;
  children: React.ReactNode;
};

const ScrollGraphic: React.FC<ScrollGraphicProps> = ({
  graphicSrc,
  alt = "Decorative graphic",
  enterDistance = 400, // tweak this
  children,
}) => {
  const targetRef = useRef<HTMLElement | null>(null);
  const [offsetX, setOffsetX] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const target = targetRef.current;
      if (!target) return;

      const rect = target.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // we'll say: start animating when the section's top is, say, middle of viewport
      const triggerPoint = viewportHeight * 1;

      // how far above/below that trigger we are
      const delta = triggerPoint - rect.top;
    //   const delta = triggerPoint;

      // normalize to 0..1 over enterDistance
      let progress = delta / enterDistance;
      if (progress < 0) progress = 0;
      if (progress > 1) progress = 1;

      // map 0..1 → offscreen..0
      // start at -100vw (totally left), end at 0
    //   const x = -window.innerWidth + progress * window.innerWidth * 0.95;
      const x = -window.innerWidth + progress * window.innerWidth * 0.85;
      setOffsetX(x);
    };

    // run once
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [enterDistance]);

  return (
    <>
      <section
        ref={targetRef}
        className="relative mx-auto max-w-2xl bg-white px-4 py-12"
      >
        {children}
      </section>

      <div
        className="fixed top-1/2 -translate-y-1/2 pointer-events-none z-30 w-60"
        style={{
          transform: `translateX(${offsetX}px)`,
          // ^ we already did -translate-y-1/2 via tailwind, but we can double up
        }}
      >
        <img src={graphicSrc} alt={alt} className="w-full h-auto" />
      </div>
    </>
  );
};

export default ScrollGraphic;
