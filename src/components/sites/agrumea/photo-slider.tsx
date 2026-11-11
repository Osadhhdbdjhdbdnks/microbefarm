"use client";

import { useCallback, useRef } from "react";
import Image from "next/image";

interface PhotoSliderProps {
  images: string[];
  alt: string;
}

/** Horizontally scrollable photo gallery with arrow-key navigation (matches source behavior). */
export function PhotoSlider({ images, alt }: PhotoSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    const track = trackRef.current;
    if (!track) return;
    const slideWidth = track.clientWidth * 0.72;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      track.scrollBy({ left: slideWidth, behavior: "smooth" });
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      track.scrollBy({ left: -slideWidth, behavior: "smooth" });
    }
  }, []);

  return (
    <div className="photo-slider__viewport container">
      <div
        ref={trackRef}
        className="photo-slider__track"
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label="Photo gallery"
        onKeyDown={onKeyDown}
      >
        {images.map((src, i) => (
          <figure className="photo-slider__slide" key={src}>
            <Image
              src={src}
              alt={`${alt} — photo ${i + 1}`}
              width={1200}
              height={800}
              loading={i === 0 ? "eager" : "lazy"}
              unoptimized
            />
          </figure>
        ))}
      </div>
      <p className="visually-hidden">Use the left and right arrow keys to browse the photos.</p>
    </div>
  );
}
