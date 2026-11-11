"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { products, type Product } from "@/data/products";

/* ============================================================
FruitSlider v7.27 — Stump Landing Calibration
· 按实测背景图校准：水果落点 = 桩面切面中部（非前沿前面）
  - mobile plate：切面中心 y≈84.9%，前沿 y≈87.4%，桩横跨 x≈10%–93%
  - desktop plate：切面中心 y≈72.7%，前沿 y≈77.8%，桩横跨 x≈37%–95%
· 桌面三果中心对齐桩中心（rest 0.50）
· 中间木瓜缩小至 1.02，避免压过桩前沿
· 其余逻辑（拖拽/搓转/阵风/光影/Draco/并发加载）保持不变
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

/* Leaf sway amplitude / Shadow interaction gain / Light direction */
const LEAF_AMP = 0.5;
const SHADOW_AMP = 1.25;
const LIGHT_DIR = { x: -1.6, y: 2.2 };

const SHADOW_OP = { base: 0.14, amp: 0.05, wind: 0.05 };
const DAPPLE_OP = { base: 0.35, amp: 0.08, wind: 0.08 };
const LIGHT_OP = { base: 0.65, amp: 0.12, wind: 0.10 };
const RAYS_OP = { base: 0.40, amp: 0.18, wind: 0.12 };
const GUST_MIN_MS = 6000, GUST_RAND_MS = 4000;

const LIGHT_STREAKS_SRC = "/assets/agrumea/forest-light-streaks.jpg";
const LEAF_CANDIDATES = [
  "/assets/agrumea/leaf-frame.png",
  "/assets/agrumea/leaf-frame1.png",
];
const LEAF_ALPHA_SRC = "/assets/agrumea/leaf-frame-alpha.png";

/* ============ Responsive Trio: Always show 3 fruits ============ */
const TRIO_BY_BP = {
  /* 手机：0.22 / 0.50 / 0.78 三槽全在屏内且落在桩面上 */
  xs: { n: 0.28, rest: 0.22, fL: [0.02, 0.06] as [number, number], fR: [0.02, 0.06] as [number, number] },
  /* 桌面：rest 0.50 → 三果中心对齐桩中心 x≈0.67 */
  sm: { n: 0.17, rest: 0.50, fL: [0.40, 0.45] as [number, number], fR: [0.06, 0.12] as [number, number] },
  md: { n: 0.17, rest: 0.50, fL: [0.40, 0.45] as [number, number], fR: [0.06, 0.12] as [number, number] },
};

/* Background priority: Full Scene Plate -> Clean Plate -> Streaks */
const BG_BY_BP = {
  xs: { src: "/assets/agrumea/hero-forest-mobile.jpg", posY: 0.68 },
  sm: { src: "/assets/agrumea/hero-forest-desktop.jpg", posY: 0.62 },
  md: { src: "/assets/agrumea/hero-forest-desktop.jpg", posY: 0.62 },
};
const BG_CLEAN_BY_BP: Record<"xs" | "sm" | "md", string> = {
  xs: "/assets/agrumea/hero-forest-clean-mobile.jpg",
  sm: "/assets/agrumea/hero-forest-clean-desktop.jpg",
  md: "/assets/agrumea/hero-forest-clean-desktop.jpg",
};

/* Stage candidates (Green screen stump) - only used if Clean Plate is active */
const STAGE_CANDIDATES: Record<"xs" | "sm" | "md", string[]> = {
  xs: ["/assets/agrumea/hero-stage-mobile.png", "/assets/agrumea/hero-stage-mobile.jpg"],
  sm: ["/assets/agrumea/hero-stage-desktop.png", "/assets/agrumea/hero-stage-desktop.jpg"],
  md: ["/assets/agrumea/hero-stage-desktop.png", "/assets/agrumea/hero-stage-desktop.jpg"],
};

/* ============ Landing calibration（v7.27 实测校准） ============
   fyEdge  = 桩面左右两端（椭圆侧点）y
   fyCenter = 桩面中心偏前（中线与前沿之间）y
   span    = 桩面在背景图内的 x 范围                        */
const STAGE_BY_BP = {
  xs: { span: [0.10, 0.93] as [number, number], fyEdge: 0.849, fyCenter: 0.862 },
  sm: { span: [0.37, 0.95] as [number, number], fyEdge: 0.727, fyCenter: 0.745 },
  md: { span: [0.37, 0.95] as [number, number], fyEdge: 0.727, fyCenter: 0.745 },
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
  const stageRef = useRef<HTMLDivElement>(null);
  const raysRef = useRef<HTMLDivElement>(null);
  const poolRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<Product | null>(null);
  const router = useRouter();

  useEffect(() => {
    const root = rootRef.current, canvas = canvasRef.current;
    if (!root || !canvas) return;

    /* ============ Curtain Probe: Full Plate -> Clean -> Streaks ============ */
    const bgResolved: Record<"xs" | "sm" | "md", string> = {
      xs: BG_BY_BP.xs.src, sm: BG_BY_BP.sm.src, md: BG_BY_BP.md.src,
    };
    const curtainIsClean: Record<string, boolean> = { xs: false, sm: false, md: false };
    const curtainProbe = (k: "xs" | "sm" | "md", urls: string[]) => {
      const [u, ...rest] = urls;
      if (!u) return;
      fetch(u, { method: "HEAD" })
        .then((r) => {
          if (r.ok) {
            bgResolved[k] = u;
            curtainIsClean[k] = (u === BG_CLEAN_BY_BP[k]);
            console.info(`[fruit-slider] curtain: ${u}`);
          } else {
            curtainProbe(k, rest);
          }
        })
        .catch(() => curtainProbe(k, rest));
    };
    (Object.keys(BG_BY_BP) as ("xs" | "sm" | "md")[]).forEach((k) => {
      curtainProbe(k, [BG_BY_BP[k].src, BG_CLEAN_BY_BP[k], LIGHT_STREAKS_SRC]);
    });

    /* ============ Green Screen Stage Keying ============ */
    const stageData: Record<string, string> = {};
    const keyGreen = (img: HTMLImageElement): string | null => {
      try {
        const maxW = 2000;
        const s = Math.min(1, maxW / img.naturalWidth);
        const w = Math.round(img.naturalWidth * s);
        const h = Math.round(img.naturalHeight * s);
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        const g = c.getContext("2d", { willReadFrequently: true });
        if (!g) return null;
        g.drawImage(img, 0, 0, w, h);
        const d = g.getImageData(0, 0, w, h);
        const px = d.data;
        for (let i = 0; i < px.length; i += 4) {
          const r = px[i], gg = px[i + 1], b = px[i + 2];
          const dist = Math.sqrt(r * r + (255 - gg) * (255 - gg) + b * b) / 441.7;
          const t = clamp01((dist - 0.10) / 0.12);
          const a = t * t * (3 - 2 * t);
          px[i + 3] = Math.round(a * 255);
          if (px[i + 3] > 0 && px[i + 3] < 250) {
            px[i + 1] = Math.min(gg, Math.max(r, b) + 30);
          }
        }
        g.putImageData(d, 0, 0);
        return c.toDataURL("image/png");
      } catch {
        return null;
      }
    };
    const applyStage = (k: "xs" | "sm" | "md") => {
      const el = stageRef.current;
      if (!el || !stageData[k] || !curtainIsClean[k]) return;
      if (k === bpKey) {
        el.style.backgroundImage = `url("${stageData[k]}")`;
        el.style.display = "block";
        root.classList.add("fs-stage-ok");
      }
    };
    const loadStage = (k: "xs" | "sm" | "md", urls: string[]) => {
      const [u, ...rest] = urls;
      if (!u) { console.warn(`[fruit-slider] stage plate missing for ${k}`); return; }
      const img = new Image();
      img.onload = () => {
        const data = keyGreen(img);
        if (data) {
          stageData[k] = data;
          console.info(`[fruit-slider] stage keyed: ${u}`);
          applyStage(k);
          if (k === bpKey) { curStructSrc = ""; measure(); }
        } else loadStage(k, rest);
      };
      img.onerror = () => loadStage(k, rest);
      img.src = u;
    };
    (Object.keys(STAGE_CANDIDATES) as ("xs" | "sm" | "md")[]).forEach((k) => loadStage(k, STAGE_CANDIDATES[k]));

    /* ============ Leaf Shadow Sprite ============ */
    let shadowProbeState = 0;
    let generatedShadow: string | null = null;
    let shadowApplied = false;
    const applyShadow = (src: string) => {
      const el = shadowRef.current;
      if (!el || shadowApplied) return;
      shadowApplied = true;
      el.src = src;
      el.style.display = "block";
      root.classList.add("fs-shadow-ok");
      console.info("[fruit-slider] leaf shadow applied");
    };
    const tryApplyShadow = () => {
      if (shadowProbeState === 1) applyShadow("/assets/agrumea/leaf-shadow-soft.png");
      else if (shadowProbeState === -1 && generatedShadow) applyShadow(generatedShadow);
    };
    const shadowProbe = new Image();
    shadowProbe.onload = () => { shadowProbeState = 1; tryApplyShadow(); };
    shadowProbe.onerror = () => { shadowProbeState = -1; tryApplyShadow(); };
    shadowProbe.src = "/assets/agrumea/leaf-shadow-soft.png";
    const makeShadowSprite = (srcCanvas: HTMLCanvasElement): string | null => {
      const w = srcCanvas.width, h = srcCanvas.height;
      const sc = document.createElement("canvas");
      sc.width = w; sc.height = h;
      const sg = sc.getContext("2d");
      if (!sg) return null;
      const blurPx = Math.max(10, Math.round(w * 0.014));
      if ("filter" in sg) {
        sg.filter = `blur(${blurPx}px)`;
        sg.drawImage(srcCanvas, 0, 0);
        sg.filter = "none";
      } else {
        const q = document.createElement("canvas");
        q.width = Math.max(2, Math.floor(w / 6));
        q.height = Math.max(2, Math.floor(h / 6));
        const qg = q.getContext("2d");
        if (!qg) return null;
        qg.drawImage(srcCanvas, 0, 0, q.width, q.height);
        sg.imageSmoothingEnabled = true;
        sg.drawImage(q, 0, 0, w, h);
      }
      sg.globalCompositeOperation = "source-in";
      sg.fillStyle = "rgba(26,20,10,1)";
      sg.fillRect(0, 0, w, h);
      return sc.toDataURL("image/png");
    };

    /* ============ Light Masks (CSS Gradients driven by JS) ============ */
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
        console.info("[fruit-slider] light+shadow driven by forest-light-streaks.jpg");
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

        /* ============ Leaf Frame（多候选 + 抠白底 + 手机竖版拼合） ============ */
    let leavesApplied = false;
    let leafBase: HTMLCanvasElement | null = null; // 抠好的横版原图
    let leafUrl = "";
    let leafAppliedBp = "";
    let leafAppliedAspect = 0;
    const buildLeafSprite = (): string | null => {
      if (!leafBase) return null;
      const c = leafBase;
      if (bpKey !== "xs") return c.toDataURL("image/png");
      // 手机：源图上半（左上/右上枝）贴顶、下半（左下/右下枝）贴底，
      // 画布按当前屏幕比例生成 → cover 不再裁掉四角
      const W = 900;
      const aspect = rootH > 0 && vw > 0 ? rootH / vw : 16 / 9;
      const H = Math.round(W * aspect);
      const halfH = Math.round(c.height / 2);
      const bandH = Math.round((W * halfH) / c.width);
      const out = document.createElement("canvas");
      out.width = W; out.height = H;
      const g = out.getContext("2d");
      if (!g) return c.toDataURL("image/png");
      g.drawImage(c, 0, 0, c.width, halfH, 0, 0, W, bandH);
      g.drawImage(c, 0, c.height - halfH, c.width, halfH, 0, H - bandH, W, bandH);
      return out.toDataURL("image/png");
    };
    const applyLeaves = (fromUrl: string) => {
      const el = leavesRef.current;
      if (!el || !leafBase) return;
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
      if (!leafBase) return;
      const aspect = vw > 0 ? rootH / vw : 0;
      const needBp = leafAppliedBp !== bpKey;
      const needAspect = bpKey === "xs" && Math.abs(aspect - leafAppliedAspect) > 0.08;
      if (needBp || needAspect) applyLeaves(leafUrl);
    };
    const keyAndApply = (img: HTMLImageElement, needKey: boolean, fromUrl: string) => {
      try {
        const maxW = 1600;
        const s = Math.min(1, maxW / img.naturalWidth);
        const w = Math.round(img.naturalWidth * s);
        const h = Math.round(img.naturalHeight * s);
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        const g = c.getContext("2d", { willReadFrequently: true });
        if (!g) return;
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
        leafBase = c;
        leafUrl = fromUrl;
        if (!leavesApplied) applyLeaves(fromUrl);
        generatedShadow = makeShadowSprite(c);
        tryApplyShadow();
      } catch (e) {
        console.warn(`[fruit-slider] leaf keying failed: ${fromUrl}`, e);
      }
    };
    const prepLeaves = (urls: string[]) => {
      const [u, ...rest] = urls;
      if (!u) {
        console.warn("[fruit-slider] leaf-frame: ALL candidates 404");
        return;
      }
      const img = new Image();
      img.onload = () => keyAndApply(img, u !== LEAF_ALPHA_SRC, u);
      img.onerror = () => prepLeaves(rest);
      img.src = u;
    };
    prepLeaves([LEAF_ALPHA_SRC, ...LEAF_CANDIDATES]);

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

    let vw = 0, rootH = 0, N = 0, F = 0, j = 0, u = 0, h0 = 0;
    let imgW = 0, imgH = 0, dispW = 0, dispH = 0, offX = 0, offY = 0;
    let curBgSrc = "", curStructSrc = "", curPosY = 0.62;
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
      }
      const stageOn = !!stageData[bpKey] && !!curtainIsClean[bpKey];
      const struct = stageOn ? STAGE_CANDIDATES[bpKey][0] : curtain;
      if (struct !== curStructSrc) {
        curStructSrc = struct;
        curPosY = stageOn ? 1.0 : BG_BY_BP[bpKey].posY;
        bgImg.src = struct;
      }
      const stEl = stageRef.current;
      if (stEl) {
        if (stageOn) {
          stEl.style.backgroundImage = `url("${stageData[bpKey]}")`;
          stEl.style.display = "block";
        } else {
          stEl.style.display = "none";
        }
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

    /* ============ Loading Pipeline ============ */
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
      try {
        return (await withTimeout(fetch(url, { method: "HEAD" }), ms)).ok;
      } catch {
        return false;
      }
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
      console.info(`[fruit-slider] loaded ${products[idx].slug} (${loadedCount}/${D})`);
      if (loadedCount >= Math.min(FIRST_SCREEN_COUNT, D)) root.classList.add("is-webgl");
    };
    const tryLoad = async (idx: number) => {
      const candidates = [products[idx].model, ...(ALT_MODELS[products[idx].slug] ?? [])];
      for (const c of candidates) {
        for (const [, l] of LOADERS) {
          try {
            return await withTimeout(l.loadAsync(c), LOAD_CANDIDATE_TIMEOUT_MS);
          } catch { /* retry next */ }
        }
      }
      return null;
    };
    const loadModel = async (idx: number): Promise<boolean> => {
      if (destroyed || fruits[idx].loaded) return fruits[idx].loaded;
      const gltf = await tryLoad(idx);
      if (!gltf || destroyed) {
        const probe = await diagnose(products[idx].model);
        console.warn(`[fruit-slider] ${products[idx].slug}: all candidates failed | probe ${products[idx].model}: ${probe}`);
        return false;
      }
      if (fruits[idx].loaded) return true;
      attachModel(idx, gltf);
      return true;
    };
    const bootLoad = async () => {
      const localOk =
        (await headOk(`${DRACO_LOCAL}draco_wasm_wrapper.js`)) &&
        (await headOk(`${DRACO_LOCAL}draco_decoder.wasm`));
      const gOk = await headOk(`${DRACO_GSTATIC}draco_wasm_wrapper.js`);
      if (localOk) LOADERS.push(["local", makeLoader(DRACO_LOCAL, true)]);
      if (gOk) LOADERS.push(["gstatic", makeLoader(DRACO_GSTATIC, false)]);
      if (!LOADERS.length) LOADERS.push(["local-noprobe", makeLoader(DRACO_LOCAL, false)]);
      console.info(`[fruit-slider] draco loaders: ${LOADERS.map((l) => l[0]).join(" + ")}`);
      const queue = products.map((_, i) => i);
      const failed: number[] = [];
      await Promise.all(Array.from({ length: LOAD_CONCURRENCY }, async () => {
        while (queue.length && !destroyed) {
          const idx = queue.shift()!;
          const ok = await loadModel(idx);
          if (!ok) failed.push(idx);
        }
      }));
      for (const idx of failed) {
        if (destroyed) break;
        await loadModel(idx);
      }
    };
    void bootLoad();

    /* ============ Interaction ============ */
    let dragging = false, dragId = -1, movedFar = false;
    let dragX = 0, downX = 0, dragVel = 0, dragTime = 0;
    let spinIdx = -1, spinLastX = 0, spinVel = 0;
    let downHitIdx = -1;
    let pointerInside = false, mouseX = 0, mouseY = 0, hoverIdx = -1;
    let lastHoverSlug = "";
    let wheelTimer: ReturnType<typeof setTimeout> | undefined;
    const wind = newSpring();
    let nextGust = performance.now() + 4000;
    let lastPX = 0, lastPY = 0, lastPT = 0;
    let shLagX = 0, shLagY = 0, shLagR = 0;

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
      e.preventDefault();
      interacted = true;
      const d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      target -= d * WHEEL_SPEED;
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(snapToTrio, 160);
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
        a.spin += dx * TOUCH_SPIN_DEG;
        a.speed.value = 0; a.speed.velocity = 0;
        spinVel = spinVel * 0.7 + (dx / Math.max(1, now - dragTime)) * 0.3 * TOUCH_SPIN_DEG * 1000;
        dragTime = now; lastInteract = now;
        return;
      }
      if (!dragging) return;
      if (!movedFar) {
        if (Math.abs(e.clientX - downX) <= 6) return;
        try { wrap.setPointerCapture(e.pointerId); } catch { return; }
        movedFar = true; interacted = true;
        dragX = e.clientX; dragTime = now;
        return;
      }
      const dx = e.clientX - dragX;
      dragVel = dragVel * 0.72 + (dx / Math.max(1, now - dragTime)) * 0.28;
      dragX = e.clientX; dragTime = now;
      target += dx * DRAG_SPEED;
    };
    const onUp = (e: PointerEvent) => {
      if (dragId === -1 || e.pointerId !== dragId) return;
      const clickedIdx = downHitIdx;
      const didMoveFar = movedFar;
      if (spinIdx >= 0) {
        const a = fruits[spinIdx];
        a.speed.value = clamp(spinVel, -240, 240); a.speed.velocity = 0;
        spinIdx = -1; spinVel = 0; dragId = -1; movedFar = false;
        if (!didMoveFar && clickedIdx >= 0) router.push(`/dispensa/${products[clickedIdx].slug}`);
        return;
      }
      if (didMoveFar) {
        try { wrap.releasePointerCapture(e.pointerId); } catch { /* noop */ }
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
        wind.velocity += Math.min(3, sp * 0.05);
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
      // Mouse Parallax
      const nx = pointerInside ? (mouseX / Math.max(1, vw) - 0.5) * 2 : 0;
      const ny = pointerInside ? (mouseY / Math.max(1, rootH) - 0.5) * 2 : 0;
      smx += (nx - smx) * (1 - Math.exp(-3 * dt));
      smy += (ny - smy) * (1 - Math.exp(-3 * dt));
      stepSpring(wind, 0, 30, dt);
      // Auto Gust
      if (now >= nextGust) {
        wind.velocity += 0.55;
        nextGust = now + GUST_MIN_MS + Math.random() * GUST_RAND_MS;
      }
      const windC = clamp(wind.value, 0, 1.5);
      const gustLeaf = 1 + windC * 0.5;
      const gustShadow = 1 + windC * 1.0;
      if (!reduced) {
        const t = now / 1000;
        // Unified Sway Signal
        const bw0 = Math.sin(t * 0.85) * 0.55 + smx * 1.4;
        const bx0 = Math.sin(t * 0.85 + 0.6) * 0.35 + smx * 1.1;
        const by0 = Math.cos(t * 0.7) * 0.22 + smy * 0.7;
        // Leaves (Half Amplitude)
        const sw = bw0 * LEAF_AMP * gustLeaf;
        const tx = bx0 * LEAF_AMP * gustLeaf;
        const ty = by0 * LEAF_AMP * gustLeaf;
        const leavesEl = leavesRef.current;
        if (leavesEl) {
          leavesEl.style.transform = `translate3d(${tx.toFixed(2)}%, ${ty.toFixed(2)}%, 0) rotate(${sw.toFixed(2)}deg)`;
        }
        // Shadow Lag (Full Amplitude)
        shLagX += (bx0 * SHADOW_AMP - shLagX) * (1 - Math.exp(-2.0 * dt));
        shLagY += (by0 * SHADOW_AMP - shLagY) * (1 - Math.exp(-2.0 * dt));
        shLagR += (bw0 * SHADOW_AMP - shLagR) * (1 - Math.exp(-1.6 * dt));
        // Layer: Dynamic Leaf Shadow
        const shEl = shadowRef.current;
        if (shEl && shadowApplied) {
          const stx = shLagX * 1.9 * gustShadow + LIGHT_DIR.x;
          const sty = shLagY * 1.9 * gustShadow + LIGHT_DIR.y;
          const srt = shLagR * 1.35 * gustShadow;
          const sop = SHADOW_OP.base + SHADOW_OP.amp * Math.sin(t * 0.85 + 1.9) + SHADOW_OP.wind * windC;
          shEl.style.transform = `translate3d(${stx.toFixed(2)}%, ${sty.toFixed(2)}%, 0) rotate(${srt.toFixed(2)}deg) scale(1.08)`;
          shEl.style.opacity = sop.toFixed(3);
        }
        // Layer: Ambient Dapple
        const dpEl = dappleRef.current;
        if (dpEl && dappleReady) {
          const dxp = shLagX * 2.2 * gustShadow + LIGHT_DIR.x * 0.35 + smx * 2.6;
          const dyp = shLagY * 2.2 * gustShadow + LIGHT_DIR.y * 0.35 + smy * 1.9;
          const dsk = smx * 3.0;
          const dsc = 1.06 + Math.abs(smx) * 0.05 + Math.abs(smy) * 0.03;
          dpEl.style.transform =
            `translate3d(${dxp.toFixed(2)}%, ${dyp.toFixed(2)}%, 0) rotate(${(shLagR * 1.1 * gustShadow).toFixed(2)}deg) skewX(${dsk.toFixed(2)}deg) scale(${dsc.toFixed(3)})`;
          dpEl.style.opacity = (DAPPLE_OP.base + DAPPLE_OP.amp * Math.sin(t * 0.85 + 2.4) + DAPPLE_OP.wind * windC).toFixed(3);
        }
        // Layer: Warm Light
        const lightEl = lightRef.current;
        if (lightEl && lightReady) {
          const scrollK = clamp01(window.scrollY / Math.max(1, rootH));
          const lx = Math.sin(t * 0.30 + 1.1) * 0.9 + smx * 2.2 - shLagX * 1.2;
          const ly = Math.cos(t * 0.24) * 0.6 + smy * 1.5 - shLagY * 1.2 + scrollK * 2.0;
          lightEl.style.transform =
            `translate3d(${lx.toFixed(2)}%, ${ly.toFixed(2)}%, 0) rotate(${(-shLagR * 0.7 + smx * 2.0).toFixed(2)}deg) scale(1.08)`;
          lightEl.style.opacity = (LIGHT_OP.base + LIGHT_OP.amp * Math.sin(t * 0.85 + 0.9) + LIGHT_OP.wind * windC).toFixed(3);
        }
        // Layer: God Rays
        const raysEl = raysRef.current;
        if (raysEl) {
          const rx = Math.sin(t * 0.12) * 1.6 + smx * 1.6;
          const ry = Math.cos(t * 0.09) * 0.8 + smy * 0.9;
          const rr = Math.sin(t * 0.07) * 0.8;
          raysEl.style.transform = `translate3d(${rx.toFixed(2)}%, ${ry.toFixed(2)}%, 0) rotate(${rr.toFixed(2)}deg)`;
          raysEl.style.opacity = (RAYS_OP.base + RAYS_OP.amp * Math.sin(t * 0.23 + 0.7) + RAYS_OP.wind * windC).toFixed(3);
        }
        // 鼠标跟随光池
        const poolEl = poolRef.current;
        if (poolEl) {
          if (poolX < 0) { poolX = vw * 0.62; poolY = rootH * 0.38; }
          poolX += (mouseX - poolX) * (1 - Math.exp(-4 * dt));
          poolY += (mouseY - poolY) * (1 - Math.exp(-4 * dt));
          poolEl.style.transform =
            `translate3d(${poolX.toFixed(1)}px, ${poolY.toFixed(1)}px, 0) translate(-50%, -50%)`;
          poolEl.style.opacity = (0.30 + 0.10 * Math.sin(t * 0.9) + 0.10 * windC).toFixed(3);
        }
      } else {
        // Reduced Motion Static State
        const shEl = shadowRef.current;
        if (shEl && shadowApplied) {
          shEl.style.transform = `translate3d(${LIGHT_DIR.x}%, ${LIGHT_DIR.y}%, 0) scale(1.08)`;
          shEl.style.opacity = String(SHADOW_OP.base);
        }
        const dpEl = dappleRef.current;
        if (dpEl && dappleReady) { dpEl.style.opacity = String(DAPPLE_OP.base); }
        const lightEl = lightRef.current;
        if (lightEl && lightReady) { lightEl.style.opacity = String(LIGHT_OP.base); }
        const raysEl = raysRef.current;
        if (raysEl) { raysEl.style.opacity = "0.3"; }
        const poolEl = poolRef.current;
        if (poolEl) poolEl.style.opacity = "0";
      }

      const hBase = rootH * (bpKey === "xs" ? 0.17 : bpKey === "sm" ? 0.28 : 0.30);
      let hx = 0, hy = 0, hw = 0, hh = 0, hasHover = false;
      fruits.forEach((a, i) => {
        a.hovered = hoverIdx === i;
        const dwellOk = idleZone && a.hovered;
        if (!dwellOk) a.dwellStart = -1;
        else if (a.dwellStart < 0) a.dwellStart = now;
        const wantSpin = fine.matches && a.loaded && a.hovered && spinIdx < 0 && a.dwellStart >= 0 &&
          (a.enterTime > lastInteract || now - a.dwellStart >= 260);
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
        if (softEl) {
          softEl.style.opacity = (SH_SOFT.op * shOp).toFixed(3);
          softEl.style.transform =
            `translate3d(${(gx + w * SH_SOFT.dx).toFixed(1)}px, ${(gy + w * SH_SOFT.dy).toFixed(1)}px, 0) ` +
            `scale(${((w * SH_SOFT.sw) / 200 * pop).toFixed(3)}, ${((w * SH_SOFT.sh) / 60 * pop).toFixed(3)})`;
        }
        if (coreEl) {
          coreEl.style.opacity = (SH_CORE.op * shOp).toFixed(3);
          coreEl.style.transform =
            `translate3d(${(gx + w * SH_CORE.dx).toFixed(1)}px, ${(gy + w * SH_CORE.dy).toFixed(1)}px, 0) ` +
            `scale(${((w * SH_CORE.sw) / 120 * pop).toFixed(3)}, ${((w * SH_CORE.sh) / 30 * pop).toFixed(3)})`;
        }
      });
      // Discover Label
      const dk = discoverRef.current;
      if (dk) {
        if (hasHover && fine.matches) {
          const flip = (hx + hw) > vw * 0.66;
          const ax = flip ? hx - 10 : hx + hw + 10;
          const ay = hy + hh * 0.42;
          dk.style.transform =
            `translate3d(${ax.toFixed(1)}px, ${ay.toFixed(1)}px, 0) translateY(-50%)` +
            (flip ? " translateX(-100%)" : "");
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
      {/* Layer 0: Forest Curtain (Full Scene Plate) */}
      <div className="fs-bg" aria-hidden="true" />
      {/* Layer 1: Green Screen Stage (Only if Clean Plate active) */}
      <div className="fs-stage" ref={stageRef} aria-hidden="true" />
      {/* Layer 2: Dynamic Leaf Shadow */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="fs-leafshadow" ref={shadowRef} alt="" aria-hidden="true" />
      {/* Layer 3: Ambient Dapple */}
      <div className="fs-dapple" ref={dappleRef} aria-hidden="true" />
      {/* Layer 4: Warm Light */}
      <div className="fs-light" ref={lightRef} aria-hidden="true" />
      {/* Layer 5: God Rays */}
      <div className="fs-rays" ref={raysRef} aria-hidden="true" />
      {/* 层 5.5：鼠标跟随光池 */}
      <div className="fs-pool" ref={poolRef} aria-hidden="true" />
      {/* Layer 6: Vignette */}
      <div className="fs-vignette" aria-hidden="true" />
      {/* Contact Shadows */}
      <div className="fruit-slider__shadows" aria-hidden="true">
        {products.map((p, i) => (
          <div key={`shadow-soft-${p.slug}`} className="fruit-shadow" ref={(el) => { softRefs.current[i] = el; }} />
        ))}
        {products.map((p, i) => (
          <div key={`shadow-core-${p.slug}`} className="fruit-shadow fruit-shadow--core" ref={(el) => { coreRefs.current[i] = el; }} />
        ))}
      </div>
      {/* WebGL Fruits */}
      <canvas ref={canvasRef} className="fruit-slider__canvas" aria-hidden="true" />
      {/* Layer 7: Leaf Frame (Foreground) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="fs-leaves" ref={leavesRef} src="/assets/agrumea/leaf-frame.png" alt="" aria-hidden="true" />
      {/* Copy Block */}
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
      {/* Hover Discover Capsule */}
      <div className="fruit-discover" ref={discoverRef} aria-hidden="true">Discover the product</div>
      {/* Hover Info Card */}
      <div className={`fruit-info-card${hovered ? " is-visible" : ""}`} aria-live="polite">
        {hovered && (
          <>
            <h2 className="fruit-info-card__name">{hovered.name}</h2>
            {origin ? <p className="fruit-info-card__origin">{origin}</p> : null}
            <p className="fruit-info-card__desc">{hovered.description}</p>
          </>
        )}
      </div>
      {/* Scroll Indicator */}
      <a className="fs-scroll" href="#site-main" aria-label="Scroll to discover">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 5v14M6 13l6 6 6-6" />
        </svg>
      </a>
      {/* Interaction Layer */}
      <div className="fruit-slider__wrapper" data-fruit-slider-wrap />
    </section>
  );
}