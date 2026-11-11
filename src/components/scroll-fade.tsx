"use client";
import { useEffect } from "react";

export function ScrollFade({ selector, fadeEnd = 0.6 }: { selector: string; fadeEnd?: number }) {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(selector));
    if (!els.length) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight || 1;
      const t = Math.min(1, Math.max(0, window.scrollY / (vh * fadeEnd)));
      const o = (1 - t).toFixed(3);
      els.forEach((el) => {
        el.style.opacity = o;
        el.style.visibility = t >= 1 ? "hidden" : "visible";
      });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
      els.forEach((el) => {
        el.style.opacity = "";
        el.style.visibility = "";
      });
    };
  }, [selector, fadeEnd]);
  return null;
}