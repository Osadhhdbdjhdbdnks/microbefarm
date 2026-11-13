"use client";

import { useEffect, useId, useMemo, useRef } from "react";

/* ============================================================
   ForestAmbience v3 — 同心圆散景光晕 · 轻微互动版
   · 鼠标靠近同心圆光晕：轻微提亮 / 放大 / 磁吸偏移（指数阻尼）
   · 点击 / 触摸：一圈极柔和的同心涟漪向外扩散，并带动附近光晕
   · 光标处一枚极淡的同心光环缓慢跟随（文案区自动减半）
   · 保留 v2 的绿金散景 / 漂浮叶片 / 自然叶影 / 滚动视差
   · 单 rAF；离屏 / 切页停帧；reduced-motion 静态降级；手机减量
============================================================ */

type Bokeh = {
  x: number; y: number; size: number; depth: number;
  ax: number; ay: number; sx: number; sy: number; px: number; py: number;
  ax2: number; ay2: number; sx2: number; sy2: number; px2: number; py2: number;
  op: number; bo: number; po: number; bs: number; ps: number;
  kind: "gold" | "green" | "ringGold" | "ringGreen";
  extra: boolean;
};

type Leaf = {
  y: number; speed: number; phase: number;
  bobA: number; bobS: number; bobP: number;
  swayA: number; swayP: number;
  rot: number; rotA: number; rotS: number; rotP: number; spin: number;
  size: number; depth: number; op: number;
  shDx: number; shDy: number; hS: number; hP: number;
  tint: "green" | "gold";
  extra: boolean;
};

const TAU = Math.PI * 2;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const BOKEH_KEEP = new Set([0, 1, 2, 3, 4, 8, 10]);
const LEAF_KEEP = new Set([0, 1, 2]);

const buildBokeh = (): Bokeh[] => {
  const rnd = mulberry32(20261112);
  const anchors: Array<[number, number]> = [
    [60, 12], [76, 20], [89, 10], [50, 24], [68, 34], [93, 42],
    [38, 9], [82, 55], [57, 7], [29, 16], [95, 27], [45, 40],
  ];
  return anchors.map(([ax, ay], i) => {
    const kind: Bokeh["kind"] =
      i >= 8 ? (i % 2 === 0 ? "ringGold" : "ringGreen")
        : i % 3 === 0 ? "green" : "gold";
    const size = kind.startsWith("ring") ? 140 + rnd() * 100 : 58 + rnd() * 92;
    const depth = 0.35 + rnd() * 0.65;
    const leftDamp = ax < 45 ? 0.6 : 1;
    const op =
      (kind.startsWith("ring") ? 0.05 + rnd() * 0.04
        : kind === "green" ? 0.06 + rnd() * 0.05
        : 0.08 + rnd() * 0.06) * leftDamp;
    const ax1 = 9 + rnd() * 17, ay1 = 7 + rnd() * 12;
    return {
      x: Math.min(96, Math.max(4, ax + (rnd() - 0.5) * 6)),
      y: Math.min(68, Math.max(3, ay + (rnd() - 0.5) * 5)),
      size, depth,
      ax: ax1, ay: ay1,
      sx: TAU / (24 + rnd() * 26), sy: TAU / (26 + rnd() * 24),
      px: rnd() * TAU, py: rnd() * TAU,
      ax2: ax1 * 0.45, ay2: ay1 * 0.45,
      sx2: TAU / (15 + rnd() * 12), sy2: TAU / (17 + rnd() * 12),
      px2: rnd() * TAU, py2: rnd() * TAU,
      op,
      bo: TAU / (13 + rnd() * 13), po: rnd() * TAU,
      bs: TAU / (19 + rnd() * 15), ps: rnd() * TAU,
      kind,
      extra: !BOKEH_KEEP.has(i),
    };
  });
};

const buildLeaves = (): Leaf[] => {
  const rnd = mulberry32(77123);
  return Array.from({ length: 7 }, (_, i) => {
    const depth = 0.4 + rnd() * 0.6;
    return {
      y: 8 + rnd() * 52,
      speed: 1 / (52 + rnd() * 40),
      phase: rnd(),
      bobA: 1.6 + rnd() * 2.4,
      bobS: TAU / (6 + rnd() * 5),
      bobP: rnd() * TAU,
      swayA: 1.2 + rnd() * 1.8,
      swayP: rnd() * TAU,
      rot: -30 + rnd() * 60,
      rotA: 10 + rnd() * 16,
      rotS: TAU / (7 + rnd() * 6),
      rotP: rnd() * TAU,
      spin: -40 + rnd() * 80,
      size: 26 + rnd() * 30,
      depth,
      op: 0.34 + rnd() * 0.22,
      shDx: 2.2 + rnd() * 1.6,
      shDy: 3.4 + rnd() * 2.2,
      hS: TAU / (8 + rnd() * 6),
      hP: rnd() * TAU,
      tint: i % 3 === 0 ? "gold" : "green",
      extra: !LEAF_KEEP.has(i),
    };
  });
};

export function ForestAmbience() {
  const uid = useId().replace(/:/g, "");
  const rootRef = useRef<HTMLDivElement>(null);
  const bokehRefs = useRef<(HTMLDivElement | null)[]>([]);
  const leafRefs = useRef<(SVGSVGElement | null)[]>([]);
  const leafShadowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const washRef = useRef<HTMLDivElement>(null);
  const canopyRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const pulseRef = useRef<HTMLDivElement>(null);

  const bokeh = useMemo(buildBokeh, []);
  const leaves = useMemo(buildLeaves, []);
  const greenId = `fa-leaf-green-${uid}`;
  const goldId = `fa-leaf-gold-${uid}`;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const hero = (root.parentElement as HTMLElement) ?? root;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mqMobile = window.matchMedia("(max-width: 767px)");
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");

    const bNodes = bokehRefs.current;
    const lNodes = leafRefs.current;
    const sNodes = leafShadowRefs.current;
    const wash = washRef.current;
    const canopy = canopyRef.current;
    const halo = haloRef.current;
    const pulseEl = pulseRef.current;

    if (reduced) {
      bokeh.forEach((d, i) => {
        const n = bNodes[i];
        if (n) { n.style.opacity = (d.op * 0.5).toFixed(3); n.style.transform = "none"; }
      });
      leaves.forEach((l, i) => {
        const n = lNodes[i]; const s = sNodes[i];
        const x = (l.phase * 124 - 12) / 100 * window.innerWidth;
        const y = (l.y / 100) * window.innerHeight;
        if (n) { n.style.opacity = (l.op * 0.5).toFixed(3); n.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${l.rot}deg)`; }
        if (s) { s.style.opacity = "0.08"; s.style.transform = `translate3d(${x + 24}px, ${y + 30}px, 0) rotate(${l.rot}deg)`; }
      });
      if (wash) wash.style.opacity = "0.05";
      if (canopy) canopy.style.opacity = "0.06";
      if (halo) halo.style.opacity = "0";
      if (pulseEl) pulseEl.style.opacity = "0";
      return;
    }

    let vw = window.innerWidth, heroLeft = 0, heroTop = 0, heroH = 1;
    const measure = () => {
      vw = window.innerWidth;
      const r = hero.getBoundingClientRect();
      heroLeft = r.left + window.scrollX;
      heroTop = r.top + window.scrollY;
      heroH = Math.max(1, r.height);
    };
    measure();

    let tx = 0, ty = 0, smx = 0, smy = 0;
    let px = 0, py = 0, inside = false;
    let haloX = -1, haloY = -1, haloOp = 0;
    let pulse: { x: number; y: number; at: number } | null = null;
    const ringGlow = bokeh.map(() => 0);

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      inside = true;
      px = e.clientX - (heroLeft - window.scrollX);
      py = e.clientY - (heroTop - window.scrollY);
      tx = (e.clientX / Math.max(1, vw) - 0.5) * 2;
      ty = (e.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
    };
    const onLeave = () => { inside = false; tx = 0; ty = 0; };
    const onDown = (e: PointerEvent) => {
      pulse = { x: e.clientX - (heroLeft - window.scrollX), y: e.clientY - (heroTop - window.scrollY), at: performance.now() };
    };
    hero.addEventListener("pointermove", onMove, { passive: true });
    hero.addEventListener("pointerleave", onLeave);
    hero.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("resize", measure);

    let raf = 0, running = false, inView = true;
    let prev = performance.now();
    const bootAt = performance.now();

    const frame = (now: number) => {
      if (!running) return;
      const dt = Math.min(0.05, Math.max(0, (now - prev) / 1000));
      prev = now;
      const t = now / 1000;
      const mobile = mqMobile.matches;

      const scroll = Math.min(heroH, Math.max(0, window.scrollY - heroTop));
      const sN = scroll / heroH;
      const b = clamp01((now - bootAt) / 2200);
      const boot = 1 - (1 - b) ** 3;
      const fade = boot * (1 - smooth(0.15, 0.85, sN));

      const k = 1 - Math.exp(-2.2 * dt);
      smx += (tx - smx) * k;
      smy += (ty - smy) * k;

      if (fade > 0.002) {
        /* ---- 点击同心涟漪（极柔和，向外扩散） ---- */
        let pulseAge = 99, pulseR = 0, pulseDecay = 0;
        if (pulse) {
          pulseAge = (now - pulse.at) / 1000;
          if (pulseAge < 1.5) {
            const pr = pulseAge / 1.5;
            pulseR = pr * 300;
            pulseDecay = 1 - pr;
            if (pulseEl) {
              const e = 1 - (1 - pr) ** 2;
              pulseEl.style.transform = `translate3d(${pulse.x.toFixed(1)}px, ${pulse.y.toFixed(1)}px, 0) scale(${(0.35 + e * 1.5).toFixed(3)})`;
              pulseEl.style.opacity = (0.07 * pulseDecay * fade).toFixed(3);
            }
          } else {
            pulse = null;
            if (pulseEl) pulseEl.style.opacity = "0";
          }
        } else if (pulseEl) {
          pulseEl.style.opacity = "0";
        }

        /* ---- 绿 / 金散景 + 同心圆光晕互动 ---- */
        for (let i = 0; i < bokeh.length; i++) {
          const d = bokeh[i];
          if (mobile && d.extra) continue;
          const n = bNodes[i];
          if (!n) continue;
          const driftX = Math.sin(t * d.sx + d.px) * d.ax
                       + Math.sin(t * d.sx2 + d.px2) * d.ax2;
          const driftY = Math.cos(t * d.sy + d.py) * d.ay
                       + Math.sin(t * d.sy2 + d.py2) * d.ay2;
          let x = driftX + smx * 22 * d.depth;
          let y = driftY + smy * 14 * d.depth + sN * 72 * d.depth;
          const breath = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * d.bo + d.po));
          let scale = 1 + 0.045 * Math.sin(t * d.bs + d.ps);
          let glow = 0;

          if (d.kind.startsWith("ring")) {
            const cx = (d.x / 100) * vw + x;
            const cy = (d.y / 100) * heroH + y;
            const dist = Math.hypot(px - cx, py - cy);
            let target = inside && fine.matches ? smooth(260, 0, dist) : 0;
            if (pulse && pulseAge < 1.5) {
              const pd = Math.hypot(pulse.x - cx, pulse.y - cy);
              const wave = Math.exp(-((pd - pulseR) ** 2) / (2 * 70 ** 2)) * pulseDecay;
              target = Math.max(target, wave * 0.85);
            }
            ringGlow[i] += (target - ringGlow[i]) * (1 - Math.exp(-3.5 * dt));
            glow = ringGlow[i];
            if (dist > 1) {
              x += ((px - cx) / dist) * glow * 5;
              y += ((py - cy) / dist) * glow * 4;
            }
            scale += glow * 0.07;
          }

          const cxNow = (d.x / 100) * vw + x;
          const leftDamp = cxNow / vw < 0.42 ? 0.5 : 1;
          const op = (d.op * breath + glow * 0.05) * leftDamp * fade;
          n.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
          n.style.opacity = op.toFixed(3);
        }

        /* ---- 光标同心光环：极淡、缓慢跟随 ---- */
        if (halo) {
          if (haloX < 0) { haloX = px; haloY = py; }
          const f = 1 - Math.exp(-3 * dt);
          haloX += (px - haloX) * f;
          haloY += (py - haloY) * f;
          const targetOp = inside && fine.matches ? 0.05 : 0;
          haloOp += (targetOp - haloOp) * (1 - Math.exp(-2.5 * dt));
          const hLeft = haloX / vw < 0.42 ? 0.5 : 1;
          const hs = 1 + 0.02 * Math.sin(t * 0.5);
          halo.style.transform = `translate3d(${haloX.toFixed(1)}px, ${haloY.toFixed(1)}px, 0) scale(${hs.toFixed(3)})`;
          halo.style.opacity = (haloOp * hLeft * fade).toFixed(3);
        }

        /* ---- 漂浮叶片 + 自然叶影 ---- */
        for (let i = 0; i < leaves.length; i++) {
          const l = leaves[i];
          if (mobile && l.extra) continue;
          const n = lNodes[i]; const s = sNodes[i];
          if (!n) continue;
          const prog = (t * l.speed + l.phase) % 1;
          const xPct = -12 + prog * 124;
          const edge = smooth(0, 0.12, prog) * (1 - smooth(0.88, 1, prog));
          const leftDamp = xPct < 42 ? 0.35 : 1;
          const yPct = l.y + Math.sin(t * l.bobS + l.bobP) * l.bobA
                     + Math.sin(prog * TAU + l.swayP) * l.swayA;
          const height = 0.5 + 0.5 * Math.sin(t * l.hS + l.hP);
          const rot = l.rot + Math.sin(t * l.rotS + l.rotP) * l.rotA + prog * l.spin;
          const x = (xPct / 100) * vw + smx * 18 * l.depth;
          const y = (yPct / 100) * heroH + smy * 12 * l.depth + sN * 56 * l.depth;
          const scale = 0.9 + height * 0.18;
          const op = l.op * edge * leftDamp * fade * (0.75 + height * 0.25);
          n.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${rot.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
          n.style.opacity = op.toFixed(3);
          if (s) {
            const sx = x + (l.shDx / 100) * vw - smx * 8;
            const sy = y + (l.shDy / 100) * heroH + height * 10 - smy * 5;
            const sScale = 1 + height * 0.5;
            const sOp = l.op * 0.3 * edge * leftDamp * fade * (1 - height * 0.45);
            s.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) rotate(${rot.toFixed(1)}deg) scale(${sScale.toFixed(3)})`;
            s.style.opacity = sOp.toFixed(3);
          }
        }

        /* ---- 暖光呼吸 + 树冠斑驳阴影 ---- */
        if (wash && !mobile) {
          const wx = Math.sin(t * 0.11 + 0.7) * 18 + smx * 34;
          const wy = Math.cos(t * 0.09 + 1.9) * 12 + smy * 22 + sN * 36;
          const wo = (0.058 + 0.026 * Math.sin(t * 0.21 + 0.4)) * fade;
          wash.style.transform = `translate3d(${wx.toFixed(2)}px, ${wy.toFixed(2)}px, 0)`;
          wash.style.opacity = Math.max(0, wo).toFixed(3);
        }
        if (canopy && !mobile) {
          const cx = Math.sin(t * 0.08 + 2.6) * -16 - smx * 18;
          const cy = Math.cos(t * 0.07 + 0.5) * -10 - smy * 12 + sN * 58;
          const co = (0.06 + 0.024 * Math.sin(t * 0.21 + 0.4 + Math.PI)) * fade;
          canopy.style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0)`;
          canopy.style.opacity = Math.max(0, co).toFixed(3);
        }
      }
      raf = requestAnimationFrame(frame);
    };

    const start = () => { if (running) return; running = true; prev = performance.now(); raf = requestAnimationFrame(frame); };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    const io = new IntersectionObserver((entries) => {
      inView = entries[0]?.isIntersecting ?? true;
      if (inView && !document.hidden) start(); else stop();
    }, { threshold: 0 });
    io.observe(hero);

    const onVis = () => { if (document.hidden) stop(); else if (inView) start(); };
    document.addEventListener("visibilitychange", onVis);
    if (!document.hidden) start();

    return () => {
      stop();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", measure);
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", onLeave);
      hero.removeEventListener("pointerdown", onDown);
    };
  }, [bokeh, leaves]);

  return (
    <div className="fa" ref={rootRef} aria-hidden="true">
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={greenId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#9ed36a" />
            <stop offset="55%" stopColor="#4d8f3f" />
            <stop offset="100%" stopColor="#2c5a2b" />
          </linearGradient>
          <linearGradient id={goldId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e8d27a" />
            <stop offset="55%" stopColor="#a8a04a" />
            <stop offset="100%" stopColor="#5c6a2e" />
          </linearGradient>
        </defs>
      </svg>
      <div className="fa-canopy" ref={canopyRef} />
      <div className="fa-wash" ref={washRef} />
      <div className="fa-halo" ref={haloRef} />
      <div className="fa-pulse" ref={pulseRef} />
      {bokeh.map((d, i) => (
        <div
          key={`b-${i}`}
          className={`fa-disc fa-disc--${d.kind}`}
          data-extra={d.extra ? "" : undefined}
          ref={(el) => { bokehRefs.current[i] = el; }}
          style={{
            left: `${d.x}%`, top: `${d.y}%`,
            width: d.size, height: d.size,
            marginLeft: -d.size / 2, marginTop: -d.size / 2,
          }}
        />
      ))}
      {leaves.map((l, i) => (
        <div
          key={`ls-${i}`}
          className="fa-leaf-shadow"
          data-extra={l.extra ? "" : undefined}
          ref={(el) => { leafShadowRefs.current[i] = el; }}
          style={{ width: l.size * 1.15, height: l.size * 0.5, marginLeft: -l.size * 0.575, marginTop: -l.size * 0.25 }}
        />
      ))}
      {leaves.map((l, i) => (
        <svg
          key={`l-${i}`}
          className="fa-leaf"
          data-extra={l.extra ? "" : undefined}
          viewBox="0 0 40 60"
          ref={(el) => { leafRefs.current[i] = el; }}
          style={{ width: l.size * 0.62, height: l.size, marginLeft: -l.size * 0.31, marginTop: -l.size * 0.5 }}
        >
          <path d="M20 2 C34 14 36 34 20 58 C4 34 6 14 20 2 Z" fill={`url(#${l.tint === "gold" ? goldId : greenId})`} />
          <path d="M20 7 L20 53" stroke="rgba(240,255,210,0.35)" strokeWidth="1.1" strokeLinecap="round" />
          <path d="M20 20 L29 15 M20 30 L30 25 M20 40 L28 36 M20 24 L12 19 M20 34 L11 30" stroke="rgba(240,255,210,0.22)" strokeWidth="0.8" strokeLinecap="round" />
        </svg>
      ))}
    </div>
  );
}