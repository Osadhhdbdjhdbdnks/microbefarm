"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/**
 * 商品 3D 展示器 v4 —— 修复扁圆模型（哈密瓜）顶部被截断
 * · 三轴几何居中（-center.y 而非 -box.min.y）：详情页悬浮展示，不落地
 * · 缩放基准 = max(x,y,z)：保证最宽/最高轴都不溢出视锥
 * · 相机 z=6.2：给扁圆瓜留足上下左右余量
 * · 滚动驱动转面 + 拖拽搓转 + 默认慢速自转（交互不变）
 */
export function ProductViewer({
  src,
  alt,
  scrollTurns = 1.0,
  scrollRange = 1.6,
}: {
  src: string;
  alt: string;
  scrollTurns?: number;
  scrollRange?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    } catch {
      return;
    }
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0, 6.2);   // v4：拉远，扁圆瓜三轴都装得下
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const hemi = new THREE.HemisphereLight(0xfff8ee, 0xcdb99c, 0.6);
    const key = new THREE.DirectionalLight(0xfff1de, 2.2); key.position.set(2.5, 4, 3);
    const fill = new THREE.DirectionalLight(0xffe9d2, 0.55); fill.position.set(-3, 1.5, 2);
    scene.add(hemi, key, fill);

    const pivot = new THREE.Group();
    scene.add(pivot);

    const draco = new DRACOLoader();
    draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);

    let destroyed = false;
    let spin = 0.6, vel = 0.18;
    let dragging = false, lastX = 0, lastT = 0;
    let scrollRot = 0;

    loader
      .loadAsync(src)
      .then((gltf) => {
        if (destroyed) return;
        const obj = gltf.scene;
        const box = new THREE.Box3().setFromObject(obj);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        // v4 核心：三轴几何居中（悬浮展示，不落地）
        obj.position.set(-center.x, -center.y, -center.z);
        const norm = new THREE.Group();
        // v4 核心：以三轴最大值为基准缩放，扁圆瓜左右/上下都不溢出
        const maxDim = Math.max(size.x, size.y, size.z);
        norm.scale.setScalar(2.4 / Math.max(maxDim, 1e-6));
        norm.add(obj);
        pivot.add(norm);
        obj.traverse((ch) => {
          const m = ch as THREE.Mesh;
          if (m.isMesh) {
            const mats = Array.isArray(m.material) ? m.material : [m.material];
            mats.forEach((mm) => {
              const sm = mm as THREE.MeshStandardMaterial;
              if (sm.envMapIntensity !== undefined) sm.envMapIntensity = 0.9;
            });
          }
        });
      })
      .catch((e) => console.warn(`model ${src} failed`, e));

    const resize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    /* ---- 滚动 → 附加旋转（smoothstep，回滚可逆） ---- */
    let scrollRaf = 0;
    const updateScroll = () => {
      scrollRaf = 0;
      const vh = window.innerHeight || 1;
      const p = Math.min(1, Math.max(0, window.scrollY / (vh * scrollRange)));
      const e = p * p * (3 - 2 * p);
      scrollRot = e * scrollTurns * Math.PI * 2;
    };
    const onScroll = () => {
      if (!scrollRaf) scrollRaf = requestAnimationFrame(updateScroll);
    };
    updateScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    /* ---- 拖拽搓转 ---- */
    const down = (e: PointerEvent) => {
      dragging = true; lastX = e.clientX; lastT = performance.now();
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = "grabbing";
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const now = performance.now();
      const dx = e.clientX - lastX; lastX = e.clientX;
      spin += dx * 0.008;
      vel = vel * 0.6 + (dx / Math.max(1, now - lastT)) * 8 * 0.4;
      lastT = now;
    };
    const up = () => { dragging = false; canvas.style.cursor = "grab"; };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, prev = performance.now();
    const frame = (now: number) => {
      if (destroyed) return;
      const dt = Math.min(1 / 30, Math.max(0, (now - prev) / 1000));
      prev = now;
      if (!dragging) {
        vel += ((reduced ? 0 : 0.18) - vel) * (1 - Math.exp(-2.5 * dt));
        spin += vel * dt;
      }
      pivot.rotation.y = spin + scrollRot;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      destroyed = true;
      cancelAnimationFrame(raf);
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      pivot.traverse((ch) => {
        const m = ch as THREE.Mesh;
        if (m.isMesh) {
          m.geometry?.dispose();
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          mats.forEach((mm) => mm.dispose());
        }
      });
      draco.dispose(); pmrem.dispose(); renderer.dispose();
    };
  }, [src, scrollTurns, scrollRange]);

  return (
    <canvas
      ref={canvasRef}
      className="pd-viewer"
      role="img"
      aria-label={alt}
      style={{ touchAction: "pan-y", cursor: "grab" }}
    />
  );
}