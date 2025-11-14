import React, { useRef, useState } from "react";

interface VideoFrameSVGProps {
  /** Video file path, e.g. "/videos/demo.mp4" */
  videoSrc: string;
  /** SVG path used as the mask, e.g. "/graphics/blutattoo-trimmed-black.svg" */
  maskSrc: string;
  /** Optional: visible top image; defaults to maskSrc */
  inkSrc?: string;
  /** Optional: extra classes for the outer wrapper */
  className?: string;
}

export const VideoFrameSVG: React.FC<VideoFrameSVGProps> = ({
  videoSrc,
  maskSrc,
  inkSrc,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);

    const v = videoRef.current;
    if (!v) return;

    if (next) {
      void v.play();
    } else {
      v.pause();
      v.currentTime = 0;
    }
  };

  const inkImageSrc = inkSrc ?? maskSrc;

  return (
    <div
      onClick={handleToggle}
      className={`relative w-full aspect-square cursor-pointer overflow-hidden ${
        className ?? ""
      }`}
    >
      {/* Video that will show *inside* the SVG shape */}
      <video
        ref={videoRef}
        src={videoSrc}
        muted
        playsInline
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 mask-[url(${maskSrc})] mask-no-repeat mask-center mask-contain ${
          open ? "opacity-100" : "opacity-0"
        }`}
        style={{
          WebkitMaskImage: `url(${maskSrc})`,
          maskImage: `url(${maskSrc})`,
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
          WebkitMaskSize: "contain",
          maskSize: "contain",
        }}
      />

      {/* Flat black SVG on top that fades out → feels like it becomes video */}
      <img
        src={inkImageSrc}
        alt=""
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full object-contain pointer-events-none filter brightness-0 transition-opacity duration-300 ${
          open ? "opacity-0" : "opacity-100"
        }`}
      />
    </div>
  );
};
