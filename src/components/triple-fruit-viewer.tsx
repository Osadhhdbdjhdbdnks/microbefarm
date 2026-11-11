"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/**
 * Triple-fruit showcase v2 — raw Three.js rewrite (v7.28).
 * 旧版依赖 @react-three/fiber + @react-three/drei（package.json 从未安装，
 * 导致 Vercel 构建 TS2307/TS7006/TS2339 全爆）。此版改用项目已有的
 * three + GLTFLoader + DRACOLoader（与 fruit-slider / product-viewer 同栈），
 * 视觉保持：三果并排 + 接触阴影 + 慢速自转。无需安装任何新依赖。
 */

type FruitSpec = {
  urls: string[];
  position: [number, number, number];
  scale?: number;
  rotationY?: number;
};

/* 想换组合就改这里（候选路径与 fruit-slider 的 ALT_MODELS 对齐） */
const FRUITS: FruitSpec[] = [
  {
    urls: [
      "/assets/agrumea/galia_melon.glb",
      "/assets/agrumea/galia-melon.glb",
      "/assets/agrumea/models/galia_melon.glb",
    ],
    position: [-1.8, 0, 0],
    scale: 1,
    rotationY: 0.35,
  },
  {
    urls: ["/assets/agrumea/mango.glb", "/assets/agrumea/models/mango.glb"],
    position: [0, 0, 0.25],
    scale: 1,
    rotationY: 0,
  },
  {
    urls: [
      "/assets/agrumea/papayafruit.glb",
      "/assets/agrumea/models/papayafruit.glb",
      "/assets/agrumea/papaya.glb",
    ],
    position: [1.8, 0, 0],
    scale: 1,
    rotationY: -0.35,
  },
];

const DRACO_GSTATIC = "https://www.gstatic.com/draco/versioned/decoders/1.5.7/";

/* 用 canvas 径向渐变做接触阴影贴图（替代 drei 的 ContactShadows） */
function makeBlobShadowTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const g = c.getContext("2d");
  if (g) {
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 60);
    grad.addColorStop(0, "rgba(20, 14, 6, 0.50)");
    grad.addColorStop(0.5, "rgba(20, 14, 6, 0.26)");
    grad.addColorStop(1, "rgba(20, 14, 6, 0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(c);
}

export default function TripleFruitViewer() {
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
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 1.1, 6.5);
    camera.lookAt(0, 0.45, 0);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const ambient = new THREE.HemisphereLight(0xfff8ee, 0x2a3a20, 0.65);
    const keyLight = new THREE.DirectionalLight(0xfff1de, 1.15);
    keyLight.position.set(3, 5, 2);
    scene.add(ambient, keyLight);

    const draco = new DRACOLoader();
    draco.setDecoderPath(DRACO_GSTATIC);
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);

    const spinners: THREE.Group[] = [];
    let destroyed = false;

    /* 接触阴影（每果一片 billboard 平铺在地面） */
    const shadowTex = makeBlobShadowTexture();
    FRUITS.forEach((spec) => {
      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(2.2, 2.2),
        new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }),
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.set(spec.position[0], 0.01, spec.position[2]);
      scene.add(shadow);
    });

    const loadOne = async (spec: FruitSpec) => {
      for (const url of spec.urls) {
        try {
          const gltf = await loader.loadAsync(url);
          if (destroyed) return;
          const obj = gltf.scene;
          const box = new THREE.Box3().setFromObject(obj);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          obj.position.set(-center.x, -box.min.y, -center.z);
          const norm = new THREE.Group();
          norm.scale.setScalar((spec.scale ?? 1) / Math.max(size.y, 1e-6));
          norm.add(obj);
          const pivot = new THREE.Group();
          pivot.add(norm);
          pivot.position.set(spec.position[0], spec.position[1], spec.position[2]);
          pivot.rotation.y = spec.rotationY ?? 0;
          obj.traverse((ch: THREE.Object3D) => {
            const m = ch as THREE.Mesh;
            if (m.isMesh) {
              m.castShadow = false;
              const mats = Array.isArray(m.material) ? m.material : [m.material];
              mats.forEach((mm) => {
                const sm = mm as THREE.MeshStandardMaterial;
                if (sm.envMapIntensity !== undefined) sm.envMapIntensity = 0.9;
              });
            }
          });
          scene.add(pivot);
          spinners.push(pivot);
          return;
        } catch {
          /* 试下一个候选路径 */
        }
      }
      console.warn(`[triple-fruit-viewer] all candidates failed for ${spec.urls[0]}`);
    };
    void Promise.all(FRUITS.map(loadOne));

    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let prev = performance.now();
    const frame = (now: number) => {
      if (destroyed) return;
      const dt = Math.min(1 / 30, Math.max(0, (now - prev) / 1000));
      prev = now;
      if (!reduced) spinners.forEach((p) => { p.rotation.y += dt * 0.25; });
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      destroyed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      scene.traverse((ch) => {
        const m = ch as THREE.Mesh;
        if (m.isMesh) {
          m.geometry?.dispose();
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          mats.forEach((mm) => mm.dispose());
        }
      });
      shadowTex.dispose();
      draco.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="triple-fruit-viewer"
      role="img"
      aria-label="Three fruits displayed side by side"
      style={{ width: "100%", height: "100%", display: "block", background: "transparent" }}
    />
  );
}