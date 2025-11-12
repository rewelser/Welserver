import React, { useEffect, useRef, useState } from "react";

type ScrollRevealSectionProps = {
  graphic: React.ReactNode;
  children: React.ReactNode;
  // how much scrolling (in px of viewport travel) it takes to go from 0 → 1
  enterDistance?: number;
};

const ScrollRevealSection: React.FC<ScrollRevealSectionProps> = ({
  graphic,
  children,
  enterDistance = 300,
}) => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // figure out mobile vs desktop once (and on resize)
  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 768); // match md:
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const el = sectionRef.current;
        if (!el) {
          ticking = false;
          return;
        }

        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight;

        // we'll start animating when the section is approaching mid-screen
        // you can tweak these 0.7, 0.3 numbers to taste
        const start = vh * 0.7; // when top is here -> progress 0
        const end = vh * 0.3;   // when top is here -> progress 1

        // distance between start and end in px
        const dist = start - end;

        // how far along are we?
        let p = (start - rect.top) / dist;

        // clamp
        if (p < 0) p = 0;
        if (p > 1) p = 1;

        setProgress(p);
        ticking = false;
      });
    };

    // run once so it's in the right spot on load
    onScroll();

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // convert progress 0..1 -> translate
  // desktop: from -100% (off to the left) to 0
  // mobile: from -40px (a little above) to 0
  const transformStyle = isMobile
    ? `translateY(${(1 - progress) * -40}px)` // 0 → -40px as it hides
    : `translateX(${(progress - 1) * 100}%)`; // 0 -> -100%, 1 -> 0%

  return (
    <section
      ref={sectionRef}
      className="
        flex flex-col gap-6
        md:flex-row md:items-center
        max-w-5xl mx-auto py-16 px-4
      "
    >
      {/* graphic column */}
      <div
        className="
          md:w-1/3 w-full
          will-change-transform
        "
        style={{
          transform: transformStyle,
          transition: "transform 0s", // no easing, scroll controls it
        }}
      >
        {graphic}
      </div>

      {/* text column */}
      <div className="md:w-2/3 w-full">
        {children}
      </div>
    </section>
  );
};

export default ScrollRevealSection;
