import {
  ContactShadows,
  Float,
  Grid,
  OrbitControls,
  RoundedBox,
} from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Mesh } from "three";
import * as THREE from "three";

function WoodPallet({ position }: { position: [number, number, number] }) {
  const plank = "#c4a06a";
  const dark = "#8b6914";
  return (
    <group position={position}>
      {[-0.38, 0, 0.38].map((z) => (
        <mesh key={`b-${z}`} position={[0, 0.06, z]} castShadow receiveShadow>
          <boxGeometry args={[0.95, 0.1, 0.14]} />
          <meshStandardMaterial color={dark} roughness={0.9} />
        </mesh>
      ))}
      {[-0.4, -0.2, 0, 0.2, 0.4].map((x) => (
        <mesh key={`t-${x}`} position={[x, 0.14, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.12, 0.05, 0.95]} />
          <meshStandardMaterial color={plank} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function Carton({
  position,
  size,
  color,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
}) {
  const [w, h, d] = size;
  return (
    <group position={position}>
      <RoundedBox args={size} radius={0.02} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.78} />
      </RoundedBox>
      {/* cinta */}
      <mesh position={[0, h * 0.15, d / 2 + 0.001]}>
        <planeGeometry args={[w * 0.92, 0.06]} />
        <meshStandardMaterial color="#e8dcc8" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, d / 2 + 0.002]}>
        <planeGeometry args={[0.05, h * 0.85]} />
        <meshStandardMaterial color="#e8dcc8" roughness={0.6} />
      </mesh>
    </group>
  );
}

function PalletStack() {
  return (
    <Float speed={1.1} rotationIntensity={0.08} floatIntensity={0.25}>
      <group position={[0, 0, 0.35]}>
        <WoodPallet position={[0, 0, 0]} />
        <Carton position={[-0.22, 0.42, -0.05]} size={[0.48, 0.4, 0.42]} color="#d2b48c" />
        <Carton position={[0.28, 0.38, 0.08]} size={[0.4, 0.32, 0.38]} color="#b8c4d4" />
        <Carton position={[0.02, 0.78, 0]} size={[0.55, 0.36, 0.48]} color="#c9956a" />
        <Carton position={[-0.15, 1.12, 0.05]} size={[0.42, 0.3, 0.4]} color="#e0c9a0" />
      </group>
    </Float>
  );
}

function SteelRack({ position, side }: { position: [number, number, number]; side: 1 | -1 }) {
  const steel = "#8a9bb0";
  const post = "#5c6b7d";
  return (
    <group position={position}>
      {[-0.35, 0.35].map((z) => (
        <mesh key={`p-${z}`} position={[side * 0.02, 1.05, z]} castShadow>
          <boxGeometry args={[0.08, 2.1, 0.08]} />
          <meshStandardMaterial color={post} metalness={0.55} roughness={0.35} />
        </mesh>
      ))}
      {[0.45, 0.95, 1.45, 1.95].map((y) => (
        <mesh key={`b-${y}`} position={[0, y, 0]} castShadow>
          <boxGeometry args={[0.7, 0.05, 0.85]} />
          <meshStandardMaterial color={steel} metalness={0.45} roughness={0.4} />
        </mesh>
      ))}
      {[0.55, 1.05, 1.55].map((y, i) => (
        <RoundedBox
          key={`box-${y}`}
          args={[0.5, 0.28, 0.4]}
          radius={0.02}
          position={[side * 0.05, y, 0.05]}
          castShadow
        >
          <meshStandardMaterial
            color={i === 0 ? "#3b82f6" : i === 1 ? "#14b8a6" : "#f59e0b"}
            roughness={0.65}
          />
        </RoundedBox>
      ))}
    </group>
  );
}

function HandScanner({ reduced }: { reduced: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (reduced || !ref.current) return;
    ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.7) * 0.25;
    ref.current.position.y = 0.85 + Math.sin(state.clock.elapsedTime * 1.2) * 0.04;
  });
  return (
    <group ref={ref} position={[0.95, 0.85, 1.1]} rotation={[0.15, -0.6, 0.1]}>
      <RoundedBox args={[0.22, 0.55, 0.12]} radius={0.03} castShadow>
        <meshStandardMaterial color="#1e293b" metalness={0.4} roughness={0.35} />
      </RoundedBox>
      <mesh position={[0, 0.18, 0.07]}>
        <planeGeometry args={[0.14, 0.1]} />
        <meshStandardMaterial
          color="#22d3ee"
          emissive="#0891b2"
          emissiveIntensity={0.8}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[0, -0.32, 0]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[0.16, 0.2, 0.08]} />
        <meshStandardMaterial color="#334155" roughness={0.5} />
      </mesh>
      {/* haz rojo del lector */}
      <mesh position={[0, 0.35, 0.25]} rotation={[1.1, 0, 0]}>
        <planeGeometry args={[0.08, 0.55]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.35} depthWrite={false} />
      </mesh>
    </group>
  );
}

function ScanVolume({ reduced }: { reduced: boolean }) {
  const ref = useRef<Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    if (reduced) {
      ref.current.position.y = 0.7;
      return;
    }
    const t = (Math.sin(state.clock.elapsedTime * 1.1) + 1) / 2;
    ref.current.position.y = THREE.MathUtils.lerp(0.35, 1.35, t);
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 0.6 + t * 1.2;
    mat.opacity = 0.25 + t * 0.25;
  });
  return (
    <mesh ref={ref} position={[0, 0.7, 0.35]}>
      <boxGeometry args={[1.15, 0.035, 1.05]} />
      <meshStandardMaterial
        color="#fbbf24"
        emissive="#f59e0b"
        emissiveIntensity={1}
        transparent
        opacity={0.4}
        depthWrite={false}
      />
    </mesh>
  );
}

function DockDoor() {
  return (
    <group position={[0, 1.15, -1.6]}>
      <RoundedBox args={[2.4, 2.4, 0.15]} radius={0.02} castShadow>
        <meshStandardMaterial color="#1e293b" roughness={0.85} />
      </RoundedBox>
      <mesh position={[0, 0.05, 0.09]}>
        <planeGeometry args={[1.7, 1.9]} />
        <meshStandardMaterial
          color="#2563eb"
          emissive="#1d4ed8"
          emissiveIntensity={0.45}
          transparent
          opacity={0.65}
        />
      </mesh>
      {/* rótulo OUT */}
      <mesh position={[0, 0.85, 0.1]}>
        <planeGeometry args={[0.7, 0.22]} />
        <meshBasicMaterial color="#0f172a" />
      </mesh>
    </group>
  );
}

function SceneContent({ reduced, compact }: { reduced: boolean; compact: boolean }) {
  return (
    <>
      <color attach="background" args={["#0b1a2e"]} />
      <fog attach="fog" args={["#0b1a2e", 10, 22]} />

      <ambientLight intensity={0.85} />
      <directionalLight
        position={[3.5, 6, 4]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-3, 3, -2]} intensity={0.55} color="#93c5fd" />
      <pointLight position={[0, 2.5, 1.2]} intensity={0.9} color="#fde68a" />
      <spotLight
        position={[-1.5, 3, 2]}
        angle={0.5}
        penumbra={0.5}
        intensity={0.8}
        color="#ffffff"
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#132337" roughness={0.95} />
      </mesh>
      <Grid
        position={[0, 0.01, 0]}
        args={[10, 10]}
        cellSize={0.35}
        cellThickness={0.6}
        cellColor="#1e3a5f"
        sectionSize={1.4}
        sectionThickness={1.1}
        sectionColor="#3b82f6"
        fadeDistance={9}
        fadeStrength={1.2}
        infiniteGrid
      />

      <SteelRack position={[-1.55, 0, 0.2]} side={-1} />
      <SteelRack position={[1.55, 0, 0.2]} side={1} />
      <SteelRack position={[-1.55, 0, 1.35]} side={-1} />
      <SteelRack position={[1.55, 0, 1.35]} side={1} />

      <DockDoor />
      <PalletStack />
      <HandScanner reduced={reduced} />
      <ScanVolume reduced={reduced} />

      <ContactShadows
        position={[0, 0.02, 0.4]}
        opacity={0.55}
        scale={10}
        blur={2.5}
        far={5}
      />

      <OrbitControls
        makeDefault
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={compact ? 0.45 : 0.75}
        minPolarAngle={Math.PI / 3.2}
        maxPolarAngle={Math.PI / 2.15}
        target={[0, 0.7, 0.3]}
      />
    </>
  );
}

export function OutboundScene({ compact = false }: { compact?: boolean }) {
  const reduced = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  return (
    <div
      className={
        compact
          ? "relative h-full min-h-[9rem] w-full bg-[#0b1a2e]"
          : "absolute inset-0 bg-[#0b1a2e]"
      }
    >
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{
          position: compact ? [2.6, 1.9, 3.2] : [2.35, 1.65, 2.95],
          fov: compact ? 45 : 40,
          near: 0.1,
          far: 50,
        }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        <SceneContent reduced={reduced} compact={compact} />
      </Canvas>
    </div>
  );
}
