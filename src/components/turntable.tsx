"use client";
import { useEffect, useRef } from "react";

/**
 * 16 帧转盘精灵图播放器：默认 ~7s/圈 慢转（对照原站罐头旋转），
 * 按住左右拖拽可手动搓转；prefers-reduced-motion 时静止。
 */
export function Turntable({
  frames,
  alt,
  className,
}: {
  frames: string[];
  alt: string;
  className?: string;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const st = useRef({ idx: 0, last: 0, dragging: false, lastX: 0, acc: 0 });

  useEffect(() => {
    const img = imgRef.current;
    if (!img || frames.length === 0) return;
    frames.forEach((f) => { const im = new Image(); im.src = f; }); // 预载
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    const tick = (t: number) => {
      const s = st.current;
      if (!s.dragging && !reduced && t - s.last >= 140) {
        s.last = t;
        s.idx = (s.idx + 1) % frames.length;
        img.src = frames[s.idx];
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const down = (e: PointerEvent) => {
      const s = st.current;
      s.dragging = true; s.lastX = e.clientX; s.acc = 0;
      img.setPointerCapture(e.pointerId);
      img.style.cursor = "grabbing";
    };
    const move = (e: PointerEvent) => {
      const s = st.current;
      if (!s.dragging) return;
      s.acc += e.clientX - s.lastX;
      s.lastX = e.clientX;
      const step = 22;
      while (Math.abs(s.acc) >= step) {
        const dir = s.acc > 0 ? 1 : -1;
        s.idx = (s.idx + dir + frames.length) % frames.length;
        s.acc -= dir * step;
        img.src = frames[s.idx];
      }
    };
    const up = () => {
      st.current.dragging = false;
      img.style.cursor = "grab";
    };

    img.addEventListener("pointerdown", down);
    img.addEventListener("pointermove", move);
    img.addEventListener("pointerup", up);
    img.addEventListener("pointercancel", up);
    return () => {
      cancelAnimationFrame(raf);
      img.removeEventListener("pointerdown", down);
      img.removeEventListener("pointermove", move);
      img.removeEventListener("pointerup", up);
      img.removeEventListener("pointercancel", up);
    };
  }, [frames]);

  return (
    <img
      ref={imgRef}
      className={className}
      src={frames[0]}
      alt={alt}
      draggable={false}
      style={{ touchAction: "pan-y", cursor: "grab" }}
    />
  );
}