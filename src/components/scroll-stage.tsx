"use client";
import { useEffect, useRef } from "react";

export function ScrollStageMedia({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight || 1;
      const p = Math.min(1, Math.max(0, window.scrollY / (vh * 0.85)));
      const e = p * p * (3 - 2 * p);
      const scale = 0.92 + 0.48 * e;
      const rot = -14 * e;
      const dy = -16 * e;
      el.style.transform =
        `translate(-50%, calc(-50% + ${dy.toFixed(2)}vh)) scale(${scale.toFixed(4)}) rotate(${rot.toFixed(2)}deg)`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div className="pdm__media" ref={ref} style={{ willChange: "transform" }}>
      {children}
    </div>
  );
}