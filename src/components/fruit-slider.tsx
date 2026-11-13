"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { products, type Product } from "@/data/products";
import { ForestAmbience } from "@/components/forest-ambience";

/* ============================================================
   FruitSlider v7.33 — Natural Forest Light & Corner-Lock Leaves
   · 四角锁定叶框：桌面端任意比例下四簇叶完整贴角
   · 自然光影互动：低强度环境光 + 平滑鼠标跟随 + 水果悬停轻微提亮
   · 桩面校准：手机 v7.28 原值保留；桌面新底图实测校准
   · v7.33：集成 ForestAmbience 背景虚化光斑 / 鼠标视差 / 滚动视差
============================================================ */

const PX2W = 1 / 100;
const FOV = 35;
const WHEEL_SPEED = 1.2, DRAG_SPEED = 1.6, FLING_SPEED = 200, FLING_CLAMP = 3.0;
const HOVER_BOOST = 1.025;
const ENTER_DELAY = 150;
const LIFT_PX = 46;
const FIRST_SCREEN_COUNT = 3;
const REV_MS = 4200;
const SPIN_DPS = 360 / (REV_MS / 1000);
const TOUCH_SPIN_DEG = 0.45;
const SPIN_SPRING_STIFF = 60, REST_SNAP_K = 6;
const LEAF_AMP = 0.72;
const SHADOW_AMP = 1.65;
const LIGHT_DIR = { x: -1.6, y: 2.2 };
const SHADOW_OP = { base: 0.17, amp: 0.045, wind: 0.045 };
const DAPPLE_OP = { base: 0.22, amp: 0.055, wind: 0.045 };
const LIGHT_OP = { base: 0.24, amp: 0.055, wind: 0.035 };
const RAYS_OP = { base: 0.075, amp: 0.025, wind: 0.02 };
const GUST_MIN_MS = 5200, GUST_RAND_MS = 3600;
const LIGHT_STREAKS_SRC = "/assets/agrumea/forest-light-streaks.jpg";
const LEAF_MOBILE_SRC = "/assets/agrumea/leaf-frame.png";
const LEAF_DESKTOP_SRC = "/assets/agrumea/leaf-frame-desktop.png";

const TRIO_BY_BP = {
  xs: { n: 0.28, rest: 0.22, fL: [0.02, 0.06] as [number, number], fR: [0.02, 0.06] as [number, number] },
  sm: { n: 0.17, rest: 0.50, fL: [0.40, 0.45] as [number, number], fR: [0.06, 0.12] as [number, number] },
  md: { n: 0.17, rest: 0.50, fL: [0.40, 0.45] as [number, number], fR: [0.06, 0.12] as [number, number] },
};
const BG_BY_BP = {
  xs: { src: "/assets/agrumea/hero-forest-mobile.jpg", posY: 0.68 },
  sm: { src: "/assets/agrumea/hero-forest-desktop.jpg", posY: 0.62 },
  md: { src: "/assets/agrumea/hero-forest-desktop.jpg", posY: 0.62 },
};
const STAGE_BY_BP = {
  xs: { span: [0.10, 0.93] as [number, number], fyEdge: 0.849, fyCenter: 0.862 },
  sm: { span: [0.33, 0.99] as [number, number], fyEdge: 0.705, fyCenter: 0.722 },
  md: { span: [0.33, 0.99] as [number, number], fyEdge: 0.705, fyCenter: 0.722 },
};

let bpKey: "xs" | "sm" | "md" = "md";
let bp = TRIO_BY_BP.md;
let stage = STAGE_BY_BP.md;

const SIZE_BY_SLUG: Record<string, number> = {
  durian: 1.05, dragonfruit: 0.95, papaya: 1.02, hamimelon: 1.0, potato: 0.85, passionfruit: 0.82, mango: 0.90,
};
const POSE_BY_SLUG: Record<string, number> = {
  durian: 0.05, dragonfruit: -0.10, papaya: 0.20, hamimelon: 0.06, potato: 0.10, passionfruit: -0.06, mango: 0.08,
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const GROUND_SINK = 0.05;
const SH_SOFT = { dx: 0.10, dy: 0.05, sw: 1.35, sh: 0.42, op: 0.85 };
const SH_CORE = { dx: 0.06, dy: 0.015, sw: 0.66, sh: 0.18, op: 0.95 };

const ALT_MODELS: Record<string, string[]> = {
  durian: [
    "/assets/agrumea/models/durian_the_king_of_fruits.glb",
    "/assets/agrumea/durian_the_king_of_fruits.glb",
    "/assets/agrumea/models/durian.glb",
    "/assets/agrumea/durian.glb",
  ],
  papaya: [
    "/assets/agrumea/models/papaya.glb",
    "/assets/agrumea/papayafruit.glb",
    "/assets/agrumea/models/papayafruit.glb",
  ],
  hamimelon: [
    "/assets/agrumea/models/hamimelon.glb",
    "/assets/agrumea/galia_melon.glb",
    "/assets/agrumea/galia-melon.glb",
    "/assets/agrumea/models/galia_melon.glb",
    "/assets/agrumea/melon.glb",
  ],
  potato: ["/assets/agrumea/models/potato.glb", "/assets/agrumea/potato.glb"],
  passionfruit: ["/assets/agrumea/models/passionfruit.glb", "/assets/agrumea/passionfruit.glb"],
  mango: ["/assets/agrumea/mango.glb", "/assets/agrumea/models/mango.glb"],
};

const depthScale = (x: number) => 0.92 + 0.14 * Math.sin(Math.PI * clamp01(x));
const edgeFade = (x: number) =>
  Math.min(
    THREE.MathUtils.smoothstep(x, bp.fL[0], bp.fL[1]),
    THREE.MathUtils.smoothstep(1 - x, bp.fR[0], bp.fR[1]),
  );

type Spring = { value: number; velocity: number };
const newSpring = (): Spring => ({ value: 0, velocity: 0 });
const SPRING_DAMP = 9;
const stepSpring = (s: Spring, target: number, stiff: number, dt: number) => {
  s.velocity += ((target - s.value) * stiff - s.velocity * SPRING_DAMP) * dt;
  s.value += s.velocity * dt;
  if (Math.abs(s.velocity) < 0.001 && Math.abs(target - s.value) < 0.001) { s.value = target; s.velocity = 0; }
};
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

const LOAD_CANDIDATE_TIMEOUT_MS = 45000;
const LOAD_CONCURRENCY = 2;
const PROBE_TIMEOUT_MS = 3000;
const DRACO_LOCAL = "/draco/gltf/";
const DRACO_GSTATIC = "https://www.gstatic.com/draco/versioned/decoders/1.5.7/";

const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    p,
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error("load timeout")), ms)),
  ]);

const diagnose = async (url: string): Promise<string> => {
  try {
    const r = await fetch(url, { method: "HEAD" });
    const len = r.headers.get("content-length");
    return `HTTP ${r.status}${len ? `, ${len} bytes` : ""}`;
  } catch (e) {
    return `HEAD fetch error: ${(e as Error)?.message ?? e}`;
  }
};

export function FruitSlider() {
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const softRefs = useRef<(HTMLDivElement | null)[]>([]);
  const coreRefs = useRef<(HTMLDivElement | null)[]>([]);
  const discoverRef = useRef<HTMLDivElement>(null);
  const leavesRef = useRef<HTMLImageElement>(null);
  const lightRef = useRef<HTMLDivElement>(null);
  const dappleRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLImageElement>(null);
  const raysRef = useRef<HTMLDivElement>(null);
  const poolRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<Product | null>(null);
  const router = useRouter();

  useEffect(() => {
    const root = rootRef.current, canvas = canvasRef.current;
    if (!root || !canvas) return;

    const bgResolved: Record<"xs" | "sm" | "md", string> = {
      xs: BG_BY_BP.xs.src, sm: BG_BY_BP.sm.src, md: BG_BY_BP.md.src,
    };

    let leavesApplied = false;
    let leafBaseMobile: HTMLCanvasElement | null = null;
    let leafBaseDesktop: HTMLCanvasElement | null = null;
    let leafAppliedBp = "";
    let leafAppliedAspect = 0;

    const keyLeaf = (img: HTMLImageElement, needKey: boolean): HTMLCanvasElement | null => {
      try {
        const maxW = 1600;
        const s = Math.min(1, maxW / img.naturalWidth);
        const w = Math.round(img.naturalWidth * s);
        const h = Math.round(img.naturalHeight * s);
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        const g = c.getContext("2d", { willReadFrequently: true });
        if (!g) return null;
        g.drawImage(img, 0, 0, w, h);
        if (needKey) {
          const d = g.getImageData(0, 0, w, h);
          const px = d.data;
          for (let i = 0; i < px.length; i += 4) {
            const r = px[i], gg = px[i + 1], b = px[i + 2];
            const lum = (r + gg + b) / 3;
            const sat = Math.max(r, gg, b) - Math.min(r, gg, b);
            if (lum > 225 && sat < 28) px[i + 3] = 0;
            else if (lum > 200 && sat < 40) px[i + 3] = Math.round(px[i + 3] * (1 - ((lum - 200) / 25) * 0.8));
          }
          g.putImageData(d, 0, 0);
        }
        return c;
      } catch {
        return null;
      }
    };

    let vw = 0, rootH = 0;

    const buildLeafSprite = (): string | null => {
      const base = bpKey === "xs" ? leafBaseMobile : (leafBaseDesktop ?? leafBaseMobile);
      if (!base) return null;
      const c = base;
      const W = 1200;
      const aspect = rootH > 0 && vw > 0 ? rootH / vw : 16 / 9;
      const H = Math.round(W * aspect);
      const out = document.createElement("canvas");
      out.width = W; out.height = H;
      const g = out.getContext("2d");
      if (!g) return c.toDataURL("image/png");
      if (bpKey === "xs") {
        const halfH = Math.round(c.height / 2);
        const bandH = Math.round((W * halfH) / c.width);
        g.drawImage(c, 0, 0, c.width, halfH, 0, 0, W, bandH);
        g.drawImage(c, 0, c.height - halfH, c.width, halfH, 0, H - bandH, W, bandH);
      } else {
        const hw = c.width / 2, hh = c.height / 2;
        const HW = W / 2, HH = H / 2;
        g.drawImage(c, 0, 0, hw, hh, 0, 0, HW, HH);
        g.drawImage(c, hw, 0, hw, hh, HW, 0, HW, HH);
        g.drawImage(c, 0, hh, hw, hh, 0, HH, HW, HH);
        g.drawImage(c, hw, hh, hw, hh, HW, HH, HW, HH);
      }
      return out.toDataURL("image/png");
    };

    const applyLeaves = (fromUrl: string) => {
      const el = leavesRef.current;
      if (!el) return;
      const data = buildLeafSprite();
      if (!data) return;
      leavesApplied = true;
      leafAppliedBp = bpKey;
      leafAppliedAspect = vw > 0 ? rootH / vw : 0;
      el.src = data;
      el.style.display = "block";
      root.classList.add("fs-leaves-ok");
      console.info(`[fruit-slider] leaves ok: ${fromUrl} (bp=${bpKey})`);
    };

    const refreshLeaves = () => {
      const base = bpKey === "xs" ? leafBaseMobile : leafBaseDesktop;
      if (!base) return;
      const aspect = vw > 0 ? rootH / vw : 0;
      const needBp = leafAppliedBp !== bpKey;
      const needAspect = Math.abs(aspect - leafAppliedAspect) > 0.06;
      if (needBp || needAspect) applyLeaves(bpKey === "xs" ? LEAF_MOBILE_SRC : LEAF_DESKTOP_SRC);
    };

    let generatedShadow: string | null = null;
    let shadowApplied = false;

    const makeShadowSprite = (srcCanvas: HTMLCanvasElement): string | null => {
      const w = srcCanvas.width, h = srcCanvas.height;
      const sc = document.createElement("canvas");
      sc.width = w; sc.height = h;
      const sg = sc.getContext("2d");
      if (!sg) return null;
      const blurPx = Math.max(10, Math.round(w * 0.014));
      try {
        sg.filter = `blur(${blurPx}px)`;
        sg.drawImage(srcCanvas, 0, 0);
        sg.filter = "none";
      } catch {
        const q = document.createElement("canvas");
        q.width = Math.max(2, Math.floor(w / 6));
        q.height = Math.max(2, Math.floor(h / 6));
        const qg = q.getContext("2d");
        if (qg) {
          qg.drawImage(srcCanvas, 0, 0, q.width, q.height);
          sg.imageSmoothingEnabled = true;
          sg.drawImage(q, 0, 0, w, h);
        }
      }
      sg.globalCompositeOperation = "source-in";
      sg.fillStyle = "rgba(26,20,10,1)";
      sg.fillRect(0, 0, w, h);
      return sc.toDataURL("image/png");
    };

    const applyShadow = (src: string) => {
      const el = shadowRef.current;
      if (!el || shadowApplied) return;
      shadowApplied = true;
      el.src = src;
      el.style.display = "block";
      root.classList.add("fs-shadow-ok");
    };
    const tryApplyShadow = () => { if (generatedShadow) applyShadow(generatedShadow); };

    const loadLeaf = (url: string, needKey: boolean, target: "xs" | "desktop") => {
      const img = new Image();
      img.onload = () => {
        const c = keyLeaf(img, needKey);
        if (!c) return;
        if (target === "xs") leafBaseMobile = c; else leafBaseDesktop = c;
        if (!generatedShadow) { generatedShadow = makeShadowSprite(c); tryApplyShadow(); }
        const activeTarget = bpKey === "xs" ? "xs" : "desktop";
        if (!leavesApplied && activeTarget === target) applyLeaves(url);
        else refreshLeaves();
      };
      img.onerror = () => console.warn(`[fruit-slider] leaf missing: ${url}`);
      img.src = url;
    };
    loadLeaf(LEAF_MOBILE_SRC, true, "xs");
    loadLeaf(LEAF_DESKTOP_SRC, true, "desktop");

    let lightReady = false, dappleReady = false;
    let lightFromPng = false;
    const dapplePngProbe = new Image();
    dapplePngProbe.onload = () => {
      const el = lightRef.current;
      if (!el) return;
      lightFromPng = true;
      lightReady = true;
      el.style.backgroundImage = `url("${dapplePngProbe.src}")`;
      el.style.backgroundSize = "cover";
      root.classList.add("fs-light-screen");
    };
    dapplePngProbe.src = "/assets/agrumea/leaf-light-dapple.png";

    const prepLightMasks = () => {
      const probe = new Image();
      probe.onload = () => {
        const dpEl = dappleRef.current;
        if (dpEl) {
          dpEl.style.backgroundImage = `url("${LIGHT_STREAKS_SRC}")`;
          dpEl.style.backgroundSize = "cover";
          dpEl.style.backgroundPosition = "center";
          dappleReady = true;
          root.classList.add("fs-dapple-mult");
        }
        const el = lightRef.current;
        if (el && !lightFromPng) {
          el.style.backgroundImage = `url("${LIGHT_STREAKS_SRC}")`;
          el.style.backgroundSize = "cover";
          el.style.backgroundPosition = "center";
          lightReady = true;
          root.classList.add("fs-light-screen");
        }
      };
      probe.onerror = () => {
        const dpEl = dappleRef.current;
        if (dpEl) { dappleReady = true; root.classList.add("fs-dapple-mult"); }
        const el = lightRef.current;
        if (el && !lightFromPng) { lightReady = true; root.classList.add("fs-light-screen"); }
      };
      probe.src = LIGHT_STREAKS_SRC;
    };
    prepLightMasks();

    const wrap = root.querySelector<HTMLElement>("[data-fruit-slider-wrap]");
    if (!wrap) return;

    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const D = products.length;
    root.classList.add("is-hydrated", "is-boot");

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
    } catch {
      root.classList.remove("is-boot", "is-hydrated");
      return;
    }
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 400);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const hemi = new THREE.HemisphereLight(0xf2ffd9, 0x24361d, 0.7);
    const key = new THREE.DirectionalLight(0xfff3dd, 2.4); key.position.set(2.5, 4, 3);
    const fill = new THREE.DirectionalLight(0xd8ffd0, 0.5); fill.position.set(-3, 1.5, 2);
    scene.add(hemi, key, fill);

    type Fruit = {
      group: THREE.Group; pivot: THREE.Group;
      appear: Spring; lift: Spring;
      spin: number; speed: Spring;
      dwellStart: number; enterTime: number;
      loaded: boolean; revealAt: number;
      rect: { x: number; y: number; w: number; h: number };
      hovered: boolean;
      hBase: number; pose: number;
    };

    const fruits: Fruit[] = products.map((p) => {
      const group = new THREE.Group();
      const pivot = new THREE.Group();
      group.add(pivot);
      scene.add(group);
      return {
        group, pivot,
        appear: newSpring(), lift: newSpring(),
        spin: 0, speed: newSpring(),
        dwellStart: -1, enterTime: -1,
        loaded: false, revealAt: -1,
        rect: { x: 0, y: 0, w: 0, h: 0 },
        hovered: false,
        hBase: SIZE_BY_SLUG[p.slug] ?? 1,
        pose: POSE_BY_SLUG[p.slug] ?? 0,
      };
    });
    fruits.forEach((f) => { f.lift.value = LIFT_PX; });

    let slotOf: number[] = products.map((_, i) => i);
    const recomputeSlots = () => {
      const order: number[] = [];
      for (let i = 0; i < D; i++) if (fruits[i].loaded) order.push(i);
      for (let i = 0; i < D; i++) if (!fruits[i].loaded) order.push(i);
      const slots = new Array<number>(D);
      order.forEach((fruitIdx, s) => { slots[fruitIdx] = s; });
      slotOf = slots;
    };

    let N = 0, F = 0, j = 0, u = 0, h0 = 0;
    let imgW = 0, imgH = 0, dispW = 0, dispH = 0, offX = 0, offY = 0;
    let curBgSrc = "", curPosY = 0.62;
    let interacted = false;
    let target = 0, H = 0, vel = 0, lastInteract = -1;

    const computeBg = () => {
      if (!imgW || !imgH || !vw || !rootH) return;
      const s = Math.max(vw / imgW, rootH / imgH);
      dispW = imgW * s; dispH = imgH * s;
      offX = (vw - dispW) * 0.5;
      offY = (rootH - dispH) * curPosY;
    };
    const bgImg = new Image();
    bgImg.onload = () => { imgW = bgImg.naturalWidth; imgH = bgImg.naturalHeight; computeBg(); };
    bgImg.onerror = () => { imgW = 2560; imgH = 1440; computeBg(); };

    const stageY = (xScreenFrac: number) => {
      if (!dispH) return (stage.fyEdge + (stage.fyCenter - stage.fyEdge) * 0.5) * rootH;
      const fx = (xScreenFrac * vw - offX) / dispW;
      const t = clamp01((fx - stage.span[0]) / (stage.span[1] - stage.span[0]));
      const fy = stage.fyEdge + (stage.fyCenter - stage.fyEdge) * Math.pow(Math.sin(Math.PI * t), 1.2);
      return fy * dispH + offY;
    };

    const measure = () => {
      vw = window.innerWidth;
      rootH = root.getBoundingClientRect().height;
      const xs = vw <= 480, sm = !xs && vw <= 1024;
      bpKey = xs ? "xs" : sm ? "sm" : "md";
      bp = TRIO_BY_BP[bpKey];
      stage = STAGE_BY_BP[bpKey];
      refreshLeaves();
      const curtain = bgResolved[bpKey];
      if (curtain !== curBgSrc) {
        curBgSrc = curtain;
        root.style.setProperty("--fs-bg-src", `url("${curtain}")`);
        curPosY = BG_BY_BP[bpKey].posY;
        bgImg.src = curtain;
      }
      N = vw * bp.n;
      u = N * 0.42;
      F = D * N;
      j = N - bp.rest;
      h0 = N - u / 2;
      renderer.setSize(vw, rootH, false);
      camera.aspect = vw / rootH;
      const dist = (vw * PX2W) / (2 * Math.tan((FOV / 2) * (Math.PI / 180)) * camera.aspect);
      camera.position.set(0, 0, dist);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      computeBg();
      if (!interacted) { target = H = h0; }
    };
    measure();

    const snapToTrio = () => {
      if (dragging) return;
      target = h0 + Math.round((target - h0) / N) * N;
    };

    const worldX = (xpx: number) => (xpx - vw / 2) * PX2W;
    const worldY = (ypx: number) => (rootH / 2 - ypx) * PX2W;
    const posOf = (i: number, r: number) => {
      let c = (slotOf[i] * N + u / 2 + r) % F;
      if (c < 0) c += F;
      return c - j;
    };

    let destroyed = false, loadedCount = 0;
    const dracoSets: DRACOLoader[] = [];
    let LOADERS: [string, GLTFLoader][] = [];
    const makeLoader = (path: string, preload: boolean): GLTFLoader => {
      const draco = new DRACOLoader();
      draco.setDecoderPath(path);
      if (preload) draco.preload();
      const l = new GLTFLoader();
      l.setDRACOLoader(draco);
      dracoSets.push(draco);
      return l;
    };
    const headOk = async (url: string, ms = PROBE_TIMEOUT_MS): Promise<boolean> => {
      try { return (await withTimeout(fetch(url, { method: "HEAD" }), ms)).ok; } catch { return false; }
    };

    const attachModel = (idx: number, gltf: Awaited<ReturnType<GLTFLoader["loadAsync"]>>) => {
      const obj = gltf.scene;
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      obj.position.set(-center.x, -box.min.y, -center.z);
      const norm = new THREE.Group();
      norm.scale.setScalar(1 / Math.max(size.y, 1e-6));
      norm.add(obj);
      fruits[idx].pivot.add(norm);
      obj.traverse((ch) => {
        const m = ch as THREE.Mesh;
        if (m.isMesh) {
          m.castShadow = false;
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          mats.forEach((mm) => { const sm = mm as THREE.MeshStandardMaterial; if (sm.envMapIntensity !== undefined) sm.envMapIntensity = 0.9; });
        }
      });
      fruits[idx].loaded = true;
      fruits[idx].revealAt = performance.now() + ENTER_DELAY;
      recomputeSlots();
      loadedCount++;
      if (loadedCount >= Math.min(FIRST_SCREEN_COUNT, D)) root.classList.add("is-webgl");
    };

    const tryLoad = async (idx: number) => {
      const candidates = [products[idx].model, ...(ALT_MODELS[products[idx].slug] ?? [])];
      for (const c of candidates) {
        for (const [, l] of LOADERS) {
          try { return await withTimeout(l.loadAsync(c), LOAD_CANDIDATE_TIMEOUT_MS); } catch { }
        }
      }
      return null;
    };
    const loadModel = async (idx: number): Promise<boolean> => {
      if (destroyed || fruits[idx].loaded) return fruits[idx].loaded;
      const gltf = await tryLoad(idx);
      if (!gltf || destroyed) return false;
      if (fruits[idx].loaded) return true;
      attachModel(idx, gltf);
      return true;
    };
    const bootLoad = async () => {
      const localOk = (await headOk(`${DRACO_LOCAL}draco_wasm_wrapper.js`)) && (await headOk(`${DRACO_LOCAL}draco_decoder.wasm`));
      const gOk = await headOk(`${DRACO_GSTATIC}draco_wasm_wrapper.js`);
      if (localOk) LOADERS.push(["local", makeLoader(DRACO_LOCAL, true)]);
      if (gOk) LOADERS.push(["gstatic", makeLoader(DRACO_GSTATIC, false)]);
      if (!LOADERS.length) LOADERS.push(["local-noprobe", makeLoader(DRACO_LOCAL, false)]);
      const queue = products.map((_, i) => i);
      const failed: number[] = [];
      await Promise.all(Array.from({ length: LOAD_CONCURRENCY }, async () => {
        while (queue.length && !destroyed) {
          const idx = queue.shift()!;
          const ok = await loadModel(idx);
          if (!ok) failed.push(idx);
        }
      }));
      for (const idx of failed) { if (destroyed) break; await loadModel(idx); }
    };
    void bootLoad();

    let dragging = false, dragId = -1, movedFar = false;
    let dragX = 0, downX = 0, dragVel = 0, dragTime = 0;
    let spinIdx = -1, spinLastX = 0, spinVel = 0;
    let downHitIdx = -1;
    let pointerInside = false, mouseX = 0, mouseY = 0, hoverIdx = -1;
    let lastHoverSlug = "";
    let wheelTimer: ReturnType<typeof setTimeout> | undefined;
    const wind = newSpring();
    let nextGust = performance.now() + 1800;
    let lastPX = 0, lastPY = 0, lastPT = 0;
    let shLagX = 0, shLagY = 0, shLagR = 0;
    let lightLagX = 0, lightLagY = 0;
    let hoverRect = { x: 0, y: 0, w: 0, h: 0, on: false };

    const hitTest = (cx: number, cy: number) => {
      const r = root.getBoundingClientRect();
      const x = cx - r.left, y = cy - r.top;
      for (let i = 0; i < D; i++) {
        if (!fruits[i].loaded) continue;
        const b = fruits[i].rect;
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return i;
      }
      return -1;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault(); interacted = true;
      const d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      target -= d * WHEEL_SPEED;
      clearTimeout(wheelTimer); wheelTimer = setTimeout(snapToTrio, 160);
    };
    const onDown = (e: PointerEvent) => {
      movedFar = false; dragId = e.pointerId;
      downX = e.clientX; dragX = e.clientX; dragVel = 0; spinVel = 0;
      dragTime = e.timeStamp || performance.now();
      downHitIdx = hitTest(e.clientX, e.clientY);
      wind.velocity += 0.9;
      if (e.pointerType !== "mouse") {
        if (downHitIdx >= 0) { spinIdx = downHitIdx; spinLastX = e.clientX; dragging = false; return; }
      }
      dragging = true;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== dragId) return;
      const now = e.timeStamp || performance.now();
      if (spinIdx >= 0) {
        const dx = e.clientX - spinLastX; spinLastX = e.clientX;
        if (Math.abs(e.clientX - downX) > 6) movedFar = true;
        const a = fruits[spinIdx];
        a.spin += dx * TOUCH_SPIN_DEG; a.speed.value = 0; a.speed.velocity = 0;
        spinVel = spinVel * 0.7 + (dx / Math.max(1, now - dragTime)) * 0.3 * TOUCH_SPIN_DEG * 1000;
        dragTime = now; lastInteract = now; return;
      }
      if (!dragging) return;
      if (!movedFar) {
        if (Math.abs(e.clientX - downX) <= 6) return;
        try { wrap.setPointerCapture(e.pointerId); } catch { return; }
        movedFar = true; interacted = true; dragX = e.clientX; dragTime = now; return;
      }
      const dx = e.clientX - dragX;
      dragVel = dragVel * 0.72 + (dx / Math.max(1, now - dragTime)) * 0.28;
      dragX = e.clientX; dragTime = now;
      target += dx * DRAG_SPEED;
    };
    const onUp = (e: PointerEvent) => {
      if (dragId === -1 || e.pointerId !== dragId) return;
      const clickedIdx = downHitIdx; const didMoveFar = movedFar;
      if (spinIdx >= 0) {
        const a = fruits[spinIdx];
        a.speed.value = clamp(spinVel, -240, 240); a.speed.velocity = 0;
        spinIdx = -1; spinVel = 0; dragId = -1; movedFar = false;
        if (!didMoveFar && clickedIdx >= 0) router.push(`/dispensa/${products[clickedIdx].slug}`);
        return;
      }
      if (didMoveFar) {
        try { wrap.releasePointerCapture(e.pointerId); } catch { }
        target += clamp(dragVel, -FLING_CLAMP, FLING_CLAMP) * DRAG_SPEED * FLING_SPEED;
        snapToTrio();
      } else if (clickedIdx >= 0 && fine.matches) {
        router.push(`/dispensa/${products[clickedIdx].slug}`);
      }
      dragVel = 0; dragging = false; dragId = -1; movedFar = false;
    };
    const onClick = (e: MouseEvent) => { e.preventDefault(); e.stopPropagation(); };

    const onRootMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      pointerInside = true;
      const r = root.getBoundingClientRect();
      mouseX = e.clientX - r.left; mouseY = e.clientY - r.top;
      const nowMs = performance.now();
      if (lastPT > 0) {
        const pdt = Math.max(8, nowMs - lastPT);
        const sp = Math.hypot(e.clientX - lastPX, e.clientY - lastPY) / pdt;
        wind.velocity += Math.min(4, sp * 0.16);
      }
      lastPX = e.clientX; lastPY = e.clientY; lastPT = nowMs;
    };
    const onRootLeave = () => {
      pointerInside = false; hoverIdx = -1;
      fruits.forEach((f) => (f.hovered = false));
      if (lastHoverSlug !== "") { lastHoverSlug = ""; setHovered(null); }
    };

    wrap.addEventListener("wheel", onWheel, { passive: false });
    wrap.addEventListener("pointerdown", onDown);
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerup", onUp);
    wrap.addEventListener("pointercancel", onUp);
    wrap.addEventListener("click", onClick, true);
    root.addEventListener("pointermove", onRootMove, { passive: true });
    root.addEventListener("pointerleave", onRootLeave);
    window.addEventListener("resize", measure);

    let raf = 0, prev = performance.now();
    let smx = 0, smy = 0;
    let poolX = -1, poolY = -1;

    const frame = (now: number) => {
      if (destroyed) return;
      const dt = Math.min(1 / 30, Math.max(0, (now - prev) / 1000));
      prev = now;

      const oldH = H;
      H += (target - H) * (1 - Math.exp(-(dragging ? 11 : 2.3) * dt));
      if (Math.abs(target - H) < 0.05) H = target;
      vel = dt > 0 ? (H - oldH) / dt : 0;
      const speedAbs = Math.abs(vel);
      if (dragging || spinIdx >= 0 || speedAbs > 6) lastInteract = now;
      const idleZone = !dragging && spinIdx < 0 && speedAbs <= N * 1.4;

      hoverIdx = -1;
      if (pointerInside && !dragging && fine.matches) {
        for (let i = 0; i < D; i++) {
          if (!fruits[i].loaded) continue;
          const r = fruits[i].rect;
          if (mouseX >= r.x && mouseX <= r.x + r.w && mouseY >= r.y && mouseY <= r.y + r.h) { hoverIdx = i; break; }
        }
      }
      wrap.style.cursor = dragging || spinIdx >= 0 ? "grabbing" : hoverIdx >= 0 ? "pointer" : "grab";
      const slug = hoverIdx >= 0 ? products[hoverIdx].slug : "";
      if (slug !== lastHoverSlug) {
        lastHoverSlug = slug;
        setHovered(hoverIdx >= 0 ? products[hoverIdx] : null);
      }

      const nx = pointerInside ? (mouseX / Math.max(1, vw) - 0.5) * 2 : 0;
      const ny = pointerInside ? (mouseY / Math.max(1, rootH) - 0.5) * 2 : 0;
      smx += (nx - smx) * (1 - Math.exp(-2.4 * dt));
      smy += (ny - smy) * (1 - Math.exp(-2.4 * dt));
      stepSpring(wind, 0, 13, dt);
      if (now >= nextGust) {
        wind.velocity += 1.35 + Math.random() * 0.45;
        nextGust = now + GUST_MIN_MS + Math.random() * GUST_RAND_MS;
      }
      const windC = clamp(wind.value, 0, 1.8);
      const t = now / 1000;

      if (!reduced) {
        const breezeX = Math.sin(t * 0.42) * 0.62 + Math.sin(t * 0.19 + 1.7) * 0.34;
        const breezeY = Math.cos(t * 0.31 + 0.8) * 0.30 + Math.sin(t * 0.16) * 0.18;
        const gust = 1 + windC * 0.95;
        const pointerInfluenceX = smx * 0.72;
        const pointerInfluenceY = smy * 0.42;
        const bw0 = breezeX + pointerInfluenceX;
        const bx0 = Math.sin(t * 0.36 + 0.6) * 0.52 + breezeX * 0.48 + smx * 0.52;
        const by0 = breezeY + pointerInfluenceY;

        const leavesEl = leavesRef.current;
        if (leavesEl) {
          const leafRotate = (Math.sin(t * 0.38) * 0.34 + Math.sin(t * 0.17 + 1.2) * 0.18 + smx * 0.22) * gust;
          const leafX = (Math.sin(t * 0.29 + 0.4) * 0.34 + smx * 0.22) * LEAF_AMP * gust;
          const leafY = (Math.cos(t * 0.25) * 0.22 + smy * 0.14) * LEAF_AMP * gust;
          const leafScale = 1.006 + windC * 0.002;
          leavesEl.style.transform = `translate3d(${leafX.toFixed(3)}%, ${leafY.toFixed(3)}%, 0) rotate(${leafRotate.toFixed(3)}deg) scale(${leafScale.toFixed(4)})`;
        }

        const shadowTargetX = bx0 * SHADOW_AMP * gust;
        const shadowTargetY = by0 * SHADOW_AMP * gust;
        const shadowTargetR = bw0 * 0.62 * gust;
        const lag = 1 - Math.exp(-1.35 * dt);
        shLagX += (shadowTargetX - shLagX) * lag;
        shLagY += (shadowTargetY - shLagY) * lag;
        shLagR += (shadowTargetR - shLagR) * (1 - Math.exp(-1.05 * dt));

        const shEl = shadowRef.current;
        if (shEl && shadowApplied) {
          const stx = shLagX * 3.0 + LIGHT_DIR.x;
          const sty = shLagY * 2.7 + LIGHT_DIR.y;
          const srt = shLagR * 0.72;
          const sop = SHADOW_OP.base + SHADOW_OP.amp * (0.5 + 0.5 * Math.sin(t * 0.47 + 1.9)) + SHADOW_OP.wind * Math.min(1, windC);
          shEl.style.transform = `translate3d(${stx.toFixed(2)}%, ${sty.toFixed(2)}%, 0) rotate(${srt.toFixed(2)}deg) scale(1.045)`;
          shEl.style.opacity = clamp(sop, 0.08, 0.28).toFixed(3);
        }

        const dpEl = dappleRef.current;
        if (dpEl && dappleReady) {
          const dxp = shLagX * 4.1 + breezeX * 1.45 + smx * 2.0;
          const dyp = shLagY * 3.5 + breezeY * 1.4 + smy * 1.5;
          const dsk = breezeX * 1.05 + smx * 1.25;
          const dsc = 1.035 + Math.abs(breezeX) * 0.018 + windC * 0.008;
          const dOpacity = DAPPLE_OP.base + DAPPLE_OP.amp * (0.5 + 0.5 * Math.sin(t * 0.52 + 2.4)) + DAPPLE_OP.wind * Math.min(1, windC);
          dpEl.style.transform = `translate3d(${dxp.toFixed(2)}%, ${dyp.toFixed(2)}%, 0) rotate(${(shLagR * 0.42).toFixed(2)}deg) skewX(${dsk.toFixed(2)}deg) scale(${dsc.toFixed(3)})`;
          dpEl.style.opacity = clamp(dOpacity, 0.10, 0.34).toFixed(3);
        }

        const lightEl = lightRef.current;
        if (lightEl && lightReady) {
          const scrollK = clamp01(window.scrollY / Math.max(1, rootH));
          const lx = breezeX * 1.35 + lightLagX * 1.3 + smx * 0.7;
          const ly = breezeY * 1.15 + lightLagY * 1.0 + scrollK * 1.2;
          lightLagX += (lx - lightLagX) * (1 - Math.exp(-1.7 * dt));
          lightLagY += (ly - lightLagY) * (1 - Math.exp(-1.7 * dt));
          lightEl.style.transform = `translate3d(${lightLagX.toFixed(2)}%, ${lightLagY.toFixed(2)}%, 0) rotate(${(breezeX * 0.22).toFixed(2)}deg) scale(1.045)`;
          const lightOpacity = LIGHT_OP.base + LIGHT_OP.amp * (0.5 + 0.5 * Math.sin(t * 0.31 + 0.9)) + LIGHT_OP.wind * Math.min(1, windC);
          lightEl.style.opacity = clamp(lightOpacity, 0.16, 0.34).toFixed(3);
        }

        const raysEl = raysRef.current;
        if (raysEl) {
          const rx = breezeX * 1.1 + smx * 0.8;
          const ry = breezeY * 0.9 + smy * 0.55;
          raysEl.style.transform = `translate3d(${rx.toFixed(2)}%, ${ry.toFixed(2)}%, 0) rotate(${(breezeX * 0.16).toFixed(2)}deg)`;
          raysEl.style.opacity = (RAYS_OP.base + RAYS_OP.amp * (0.5 + 0.5 * Math.sin(t * 0.22 + 0.7))).toFixed(3);
        }

        const poolEl = poolRef.current;
        if (poolEl) {
          const targetX = hoverRect.on
            ? hoverRect.x + hoverRect.w / 2
            : pointerInside ? mouseX : vw * (0.68 + breezeX * 0.025);
          const targetY = hoverRect.on
            ? hoverRect.y + hoverRect.h * 0.78
            : pointerInside ? mouseY : rootH * (0.58 + breezeY * 0.025);
          if (poolX < 0) { poolX = targetX; poolY = targetY; }
          const follow = 1 - Math.exp(-2.2 * dt);
          poolX += (targetX - poolX) * follow;
          poolY += (targetY - poolY) * follow;
          const baseOpacity = hoverRect.on ? 0.105 : pointerInside ? 0.065 : 0.018;
          const breathing = 0.009 * Math.sin(t * 0.42);
          poolEl.style.transform = `translate3d(${poolX.toFixed(1)}px, ${poolY.toFixed(1)}px, 0) translate(-50%, -50%)`;
          poolEl.style.opacity = clamp(baseOpacity + breathing + windC * 0.008, 0, 0.13).toFixed(3);
        }
      } else {
        const shEl = shadowRef.current;
        if (shEl && shadowApplied) {
          shEl.style.transform = `translate3d(${LIGHT_DIR.x}%, ${LIGHT_DIR.y}%, 0) scale(1.045)`;
          shEl.style.opacity = String(SHADOW_OP.base);
        }
        const dpEl = dappleRef.current;
        if (dpEl && dappleReady) { dpEl.style.opacity = String(DAPPLE_OP.base); }
        const lightEl = lightRef.current;
        if (lightEl && lightReady) { lightEl.style.opacity = String(LIGHT_OP.base); }
        const raysEl = raysRef.current;
        if (raysEl) { raysEl.style.opacity = String(RAYS_OP.base); }
        const poolEl = poolRef.current;
        if (poolEl) poolEl.style.opacity = "0";
      }

      const hBase = rootH * (bpKey === "xs" ? 0.17 : bpKey === "sm" ? 0.28 : 0.30);
      let hx = 0, hy = 0, hw = 0, hh = 0, hasHover = false;
      hoverRect.on = false;

      fruits.forEach((a, i) => {
        a.hovered = hoverIdx === i;
        const dwellOk = idleZone && a.hovered;
        if (!dwellOk) a.dwellStart = -1;
        else if (a.dwellStart < 0) a.dwellStart = now;
        const wantSpin = fine.matches && a.loaded && a.hovered && spinIdx < 0 && a.dwellStart >= 0 && (a.enterTime > lastInteract || now - a.dwellStart >= 260);
        if (spinIdx !== i) stepSpring(a.speed, wantSpin ? SPIN_DPS : 0, SPIN_SPRING_STIFF, dt);
        a.spin += a.speed.value * dt;
        if (Math.abs(a.speed.value) < 1.5 && Math.abs(a.speed.velocity) < 2 && spinIdx !== i) {
          const nearest = Math.round(a.spin / 22.5) * 22.5;
          a.spin += (nearest - a.spin) * (1 - Math.exp(-REST_SNAP_K * dt));
        }
        stepSpring(a.appear, a.loaded && now >= a.revealAt ? 1 : 0, 80, dt);
        const q = posOf(i, H) / vw;
        const xFrac = clamp01(q);
        const gx = q * vw;
        const h = hBase * a.hBase * depthScale(xFrac) * (a.hovered ? HOVER_BOOST : 1);
        const gy = stageY(xFrac) + h * GROUND_SINK;
        const w = h * 0.72;
        a.rect = { x: gx - w / 2, y: gy - h, w, h };
        const fade = edgeFade(q < 0 || q > 1 ? -1 : xFrac) * (q >= -0.15 && q <= 1.15 ? 1 : 0);
        const onStage = fade > 0.3 && a.loaded;
        stepSpring(a.lift, onStage ? 0 : LIFT_PX, 100, dt);
        if (i === hoverIdx && onStage) {
          hoverRect = { x: a.rect.x, y: a.rect.y, w: a.rect.w, h: a.rect.h, on: true };
          hx = a.rect.x; hy = a.rect.y; hw = a.rect.w; hh = a.rect.h; hasHover = true;
        }
        const g = a.group;
        g.visible = fade > 0.01 && a.loaded;
        const ap = clamp(a.appear.value, 0, 1);
        const pop = 0.7 + 0.3 * easeOutCubic(ap);
        const yOff = (a.lift.value + (1 - easeOutCubic(ap)) * LIFT_PX) * PX2W;
        g.position.set(worldX(gx), worldY(gy) + yOff, 0);
        g.scale.set(h * PX2W * pop * fade, h * PX2W * pop * fade, h * PX2W * pop * fade);
        g.rotation.z = a.pose;
        a.pivot.rotation.y = THREE.MathUtils.degToRad(a.spin);
        a.pivot.visible = a.appear.value > 0.02;
        const land = 1 - clamp01((a.lift.value + (1 - ap) * LIFT_PX) / LIFT_PX);
        const shOp = fade * ap * land;
        const softEl = softRefs.current[i];
        const coreEl = coreRefs.current[i];
        const sdx = SH_SOFT.dx - lightLagX * 0.10 - shLagX * 0.04;
        const sdy = SH_SOFT.dy + lightLagY * 0.05;
        const ssx = SH_SOFT.sw * (1 + lightLagX * 0.05);
        if (softEl) {
          softEl.style.opacity = (SH_SOFT.op * shOp).toFixed(3);
          softEl.style.transform = `translate3d(${(gx + w * sdx).toFixed(1)}px, ${(gy + w * sdy).toFixed(1)}px, 0) scale(${((w * ssx) / 200 * pop).toFixed(3)}, ${((w * SH_SOFT.sh) / 60 * pop).toFixed(3)})`;
        }
        if (coreEl) {
          coreEl.style.opacity = (SH_CORE.op * shOp).toFixed(3);
          coreEl.style.transform = `translate3d(${(gx + w * (SH_CORE.dx - lightLagX * 0.06)).toFixed(1)}px, ${(gy + w * (SH_CORE.dy + lightLagY * 0.03)).toFixed(1)}px, 0) scale(${((w * SH_CORE.sw) / 120 * pop).toFixed(3)}, ${((w * SH_CORE.sh) / 30 * pop).toFixed(3)})`;
        }
      });

      const dk = discoverRef.current;
      if (dk) {
        if (hasHover && fine.matches) {
          const flip = (hx + hw) > vw * 0.66;
          const ax = flip ? hx - 10 : hx + hw + 10;
          const ay = hy + hh * 0.42;
          dk.style.transform = `translate3d(${ax.toFixed(1)}px, ${ay.toFixed(1)}px, 0) translateY(-50%)` + (flip ? " translateX(-100%)" : "");
          dk.style.opacity = "1";
        } else {
          dk.style.opacity = "0";
        }
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const hitWatch = setInterval(() => {
      fruits.forEach((a) => {
        if (a.hovered && a.enterTime < 0) a.enterTime = performance.now();
        if (!a.hovered) a.enterTime = -1;
      });
    }, 120);

    return () => {
      destroyed = true;
      clearInterval(hitWatch);
      clearTimeout(wheelTimer);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      wrap.removeEventListener("wheel", onWheel);
      wrap.removeEventListener("pointerdown", onDown);
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerup", onUp);
      wrap.removeEventListener("pointercancel", onUp);
      wrap.removeEventListener("click", onClick, true);
      root.removeEventListener("pointermove", onRootMove);
      root.removeEventListener("pointerleave", onRootLeave);
      fruits.forEach((f) => {
        f.pivot.traverse((ch) => {
          const m = ch as THREE.Mesh;
          if (m.isMesh) {
            m.geometry?.dispose();
            const mats = Array.isArray(m.material) ? m.material : [m.material];
            mats.forEach((mm) => {
              const sm = mm as THREE.MeshStandardMaterial;
              Object.values(sm).forEach((v) => { if (v && (v as THREE.Texture).isTexture) (v as THREE.Texture).dispose(); });
              sm.dispose();
            });
          }
        });
      });
      dracoSets.forEach((d) => d.dispose());
      pmrem.dispose();
      renderer.dispose();
    };
  }, [router]);

  const origin = hovered ? (hovered as Product & { origin?: string }).origin : undefined;

  return (
    <section className="fruit-slider fruit-slider--forest" ref={rootRef} data-fruit-slider data-anim="hero">
      <div className="fs-bg" aria-hidden="true" />
      <img className="fs-leafshadow" ref={shadowRef} alt="" aria-hidden="true" />
      <div className="fs-dapple" ref={dappleRef} aria-hidden="true" />
      <div className="fs-light" ref={lightRef} aria-hidden="true" />
      <div className="fs-rays" ref={raysRef} aria-hidden="true" />
      <div className="fs-pool" ref={poolRef} aria-hidden="true" />
      <ForestAmbience />
      <div className="fs-vignette" aria-hidden="true" />
      <div className="fruit-slider__shadows" aria-hidden="true">
        {products.map((p, i) => (
          <div key={`shadow-soft-${p.slug}`} className="fruit-shadow" ref={(el) => { softRefs.current[i] = el; }} />
        ))}
        {products.map((p, i) => (
          <div key={`shadow-core-${p.slug}`} className="fruit-shadow fruit-shadow--core" ref={(el) => { coreRefs.current[i] = el; }} />
        ))}
      </div>
      <canvas ref={canvasRef} className="fruit-slider__canvas" aria-hidden="true" />
      <img className="fs-leaves" ref={leavesRef} src="/assets/agrumea/leaf-frame.png" alt="" aria-hidden="true" />
      <div className="fs-copy">
        <p className="fs-eyebrow">Natural · Fresh · Healthy</p>
        <h1 className="fs-title">
          MICROBE
          <span>Farm</span>
        </h1>
        <p className="fs-sub">From Nature, For a Healthier Life</p>
        <Link className="fs-cta" href="/dispensa">
          Explore More <span aria-hidden="true">→</span>
        </Link>
      </div>
      <div className="fruit-discover" ref={discoverRef} aria-hidden="true">Discover the product</div>
      <div className={`fruit-info-card${hovered ? " is-visible" : ""}`} aria-live="polite">
        {hovered && (
          <>
            <h2 className="fruit-info-card__name">{hovered.name}</h2>
            {origin ? <p className="fruit-info-card__origin">{origin}</p> : null}
            <p className="fruit-info-card__desc">{hovered.description}</p>
          </>
        )}
      </div>
      <a className="fs-scroll" href="#site-main" aria-label="Scroll to discover">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 5v14M6 13l6 6 6-6" />
        </svg>
      </a>
      <div className="fruit-slider__wrapper" data-fruit-slider-wrap />
    </section>
  );
}