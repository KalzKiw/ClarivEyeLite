import { ContactShadows, Environment, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group, Mesh } from "three";
import * as THREE from "three";

function Shelf({ position, side }: { position: [number, number, number]; side: "L" | "R" }) {
  const dir = side === "L" ? 1 : -1;
  return (
    <group position={position}>
      <RoundedBox args={[0.85, 2.4, 0.55]} radius={0.04} position={[0, 1.2, 0]}>
        <meshStandardMaterial color="#1e3a5f" roughness={0.85} metalness={0.15} />
      </RoundedBox>
      {[0.55, 1.1, 1.65].map((y, i) => (
        <RoundedBox
          key={y}
          args={[0.62, 0.28, 0.38]}
          radius={0.03}
          position={[dir * 0.02, y, 0.08]}
        >
          <meshStandardMaterial
            color={i === 1 ? "#3d8b7a" : i === 2 ? "#c47a3a" : "#3b6ea8"}
            roughness={0.7}
          />
        </RoundedBox>
      ))}
    </group>
  );
}

function FloorBoxes() {
  const boxes: Array<{ p: [number, number, number]; s: [number, number, number]; c: string }> = [
    { p: [-0.35, 0.22, 0.9], s: [0.55, 0.44, 0.45], c: "#d4a574" },
    { p: [0.4, 0.18, 1.15], s: [0.42, 0.36, 0.4], c: "#8fa4b8" },
    { p: [0.05, 0.2, 1.55], s: [0.7, 0.4, 0.5], c: "#c98b4a" },
  ];
  return (
    <group>
      {boxes.map((b, i) => (
        <RoundedBox key={i} args={b.s} radius={0.03} position={b.p}>
          <meshStandardMaterial color={b.c} roughness={0.75} />
        </RoundedBox>
      ))}
    </group>
  );
}

function ScanBeam({ reduced }: { reduced: boolean }) {
  const ref = useRef<Mesh>(null);
  useFrame((state) => {
    if (reduced || !ref.current) return;
    const t = (Math.sin(state.clock.elapsedTime * 0.85) + 1) / 2;
    ref.current.position.z = THREE.MathUtils.lerp(0.35, 1.85, t);
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.25 + t * 0.45;
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0.9]}>
      <planeGeometry args={[1.6, 0.04]} />
      <meshBasicMaterial color="#f5c518" transparent opacity={0.55} depthWrite={false} />
    </mesh>
  );
}

function DockPortal() {
  return (
    <group position={[0, 1.1, -1.35]}>
      <RoundedBox args={[1.8, 2.2, 0.12]} radius={0.02}>
        <meshStandardMaterial color="#0f2744" roughness={0.9} />
      </RoundedBox>
      <mesh position={[0, 0, 0.08]}>
        <planeGeometry args={[1.35, 1.7]} />
        <meshStandardMaterial
          color="#1a4a7a"
          emissive="#2563eb"
          emissiveIntensity={0.25}
          transparent
          opacity={0.55}
        />
      </mesh>
    </group>
  );
}

function SceneContent({ reduced }: { reduced: boolean }) {
  const group = useRef<Group>(null);
  useFrame((state) => {
    if (reduced || !group.current) return;
    group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.15) * 0.04;
  });

  const floorMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#152538", roughness: 0.95, metalness: 0.05 }),
    [],
  );

  return (
    <group ref={group}>
      <ambientLight intensity={0.45} />
      <directionalLight position={[4, 8, 3]} intensity={1.15} castShadow />
      <pointLight position={[0, 2.2, 0.5]} intensity={0.6} color="#7eb6ff" />
      <spotLight
        position={[0, 3.2, 2]}
        angle={0.45}
        penumbra={0.6}
        intensity={1.2}
        color="#ffe08a"
        castShadow
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.4]} receiveShadow material={floorMat}>
        <planeGeometry args={[6, 8]} />
      </mesh>

      <Shelf position={[-1.35, 0, -0.2]} side="L" />
      <Shelf position={[1.35, 0, -0.2]} side="R" />
      <Shelf position={[-1.35, 0, 1.1]} side="L" />
      <Shelf position={[1.35, 0, 1.1]} side="R" />

      <DockPortal />
      <FloorBoxes />
      <ScanBeam reduced={reduced} />
      <ContactShadows position={[0, 0.01, 0.5]} opacity={0.45} scale={8} blur={2.2} far={4} />
      <Environment preset="city" environmentIntensity={0.35} />
    </group>
  );
}

export function OutboundScene({ compact = false }: { compact?: boolean }) {
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div className={compact ? "h-full w-full bg-[#10253f]" : "absolute inset-0 bg-[#10253f]"}>
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [0, 2.1, 4.2], fov: compact ? 42 : 38, near: 0.1, far: 40 }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={["#10253f"]} />
        <fog attach="fog" args={["#10253f", 5, 14]} />
        <SceneContent reduced={reduced} />
      </Canvas>
    </div>
  );
}
