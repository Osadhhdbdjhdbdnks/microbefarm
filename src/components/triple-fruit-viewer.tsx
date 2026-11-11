"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { useGLTF, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

type FruitSpec = {
  url: string;
  position: [number, number, number];
  scale?: number;
  rotationY?: number;
};

// 想换组合就改这里（资源你本地都有）
const FRUITS: FruitSpec[] = [
  { url: "/assets/agrumea/galia-melon.glb",  position: [-1.8, 0, 0],   scale: 1, rotationY: 0.35 },
  { url: "/assets/agrumea/mango.glb",        position: [0, 0, 0.25],   scale: 1, rotationY: 0 },
  { url: "/assets/agrumea/papayafruit.glb",  position: [1.8, 0, 0],    scale: 1, rotationY: -0.35 },
];

function Fruit({ url, position, scale = 1, rotationY = 0 }: FruitSpec) {
  const { scene } = useGLTF(url);
  const clone = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);
  return <primitive object={clone} position={position} scale={scale} rotation-y={rotationY} />;
}

export default function TripleFruitViewer() {
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      camera={{ position: [0, 1.1, 6.5], fov: 35 }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.65} />
      <directionalLight position={[3, 5, 2]} intensity={1.15} castShadow />
      <Suspense fallback={null}>
        {FRUITS.map((f) => (
          <Fruit key={f.url} {...f} />
        ))}
        <ContactShadows position={[0, 0, 0]} opacity={0.45} scale={14} blur={2.4} far={2.2} />
      </Suspense>
    </Canvas>
  );
}