import { ContactShadows, OrbitControls, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, type MutableRefObject } from "react";
import type { Group, Mesh, MeshStandardMaterial } from "three";
import * as THREE from "three";

const PERIOD = 4.5;
const SCAN_Y_MIN = 0.35;
const SCAN_Y_MAX = 1.15;
const PALLET_Z = 0.4;
const GUN_BASE = new THREE.Vector3(1.05, 0.95, 0.85);

type ScanSegment = "aim" | "sweep" | "hit" | "idle";

type ScanClock = {
  phase: number;
  segment: ScanSegment;
  scanY: number;
  hitStrength: number;
};

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function sampleScan(elapsed: number, reduced: boolean): ScanClock {
  if (reduced) {
    return { phase: 0.5, segment: "idle", scanY: 0.75, hitStrength: 0 };
  }
  const phase = (elapsed % PERIOD) / PERIOD;
  if (phase < 0.2) {
    return { phase, segment: "aim", scanY: SCAN_Y_MIN, hitStrength: 0 };
  }
  if (phase < 0.75) {
    const u = easeInOut((phase - 0.2) / 0.55);
    return {
      phase,
      segment: "sweep",
      scanY: THREE.MathUtils.lerp(SCAN_Y_MIN, SCAN_Y_MAX, u),
      hitStrength: 0,
    };
  }
  if (phase < 0.88) {
    const hitStrength = 1 - (phase - 0.75) / 0.13;
    return { phase, segment: "hit", scanY: SCAN_Y_MAX, hitStrength };
  }
  const u = (phase - 0.88) / 0.12;
  return {
    phase,
    segment: "idle",
    scanY: THREE.MathUtils.lerp(SCAN_Y_MAX, SCAN_Y_MIN, u),
    hitStrength: 0,
  };
}

function WoodPallet({ position }: { position: [number, number, number] }) {
  const plank = "#c9a66b";
  const plankDark = "#a67c42";
  const block = "#7a5a2e";
  return (
    <group position={position}>
      {([-0.38, 0, 0.38] as const).map((z) =>
        ([-0.4, 0, 0.4] as const).map((x) => (
          <mesh key={`blk-${x}-${z}`} position={[x, 0.07, z]} castShadow receiveShadow>
            <boxGeometry args={[0.12, 0.1, 0.12]} />
            <meshStandardMaterial color={block} roughness={0.92} />
          </mesh>
        )),
      )}
      {([-0.38, 0, 0.38] as const).map((z) => (
        <mesh key={`bot-${z}`} position={[0, 0.02, z]} castShadow receiveShadow>
          <boxGeometry args={[0.98, 0.035, 0.11]} />
          <meshStandardMaterial color={plankDark} roughness={0.9} />
        </mesh>
      ))}
      {([-0.44, -0.22, 0, 0.22, 0.44] as const).map((x, i) => (
        <mesh key={`top-${x}`} position={[x, 0.145, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.11, 0.028, 0.98]} />
          <meshStandardMaterial color={i % 2 === 0 ? plank : plankDark} roughness={0.88} />
        </mesh>
      ))}
    </group>
  );
}

function Carton({
  position,
  size,
  color,
  rotation = 0,
  labelRef,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  rotation?: number;
  labelRef?: MutableRefObject<MeshStandardMaterial | null>;
}) {
  const [w, h, d] = size;
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <RoundedBox args={size} radius={0.015} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.82} />
      </RoundedBox>
      <mesh position={[0, h * 0.12, d / 2 + 0.001]}>
        <planeGeometry args={[w * 0.9, 0.045]} />
        <meshStandardMaterial color="#ebe0cc" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0, d / 2 + 0.002]}>
        <planeGeometry args={[0.04, h * 0.8]} />
        <meshStandardMaterial color="#ebe0cc" roughness={0.55} />
      </mesh>
      <mesh position={[w * 0.22, -h * 0.05, d / 2 + 0.003]}>
        <planeGeometry args={[0.12, 0.08]} />
        <meshStandardMaterial
          ref={labelRef}
          color="#f8fafc"
          emissive="#22d3ee"
          emissiveIntensity={0}
          roughness={0.4}
        />
      </mesh>
    </group>
  );
}

function PalletStack({ clockRef }: { clockRef: MutableRefObject<ScanClock> }) {
  const labelMat = useRef<MeshStandardMaterial | null>(null);

  useFrame(() => {
    const mat = labelMat.current;
    if (!mat) return;
    const s = clockRef.current.hitStrength;
    mat.emissiveIntensity = s * 2.4;
    mat.color.set(s > 0.05 ? "#e0f7fa" : "#f8fafc");
  });

  return (
    <group position={[0, 0, PALLET_Z]}>
      <WoodPallet position={[0, 0, 0]} />
      <Carton position={[-0.2, 0.38, -0.08]} size={[0.46, 0.38, 0.4]} color="#d4b896" />
      <Carton
        position={[0.26, 0.34, 0.1]}
        size={[0.38, 0.3, 0.36]}
        color="#c5ced9"
        rotation={0.08}
      />
      <Carton
        position={[0.02, 0.72, 0]}
        size={[0.52, 0.34, 0.46]}
        color="#c9966c"
        labelRef={labelMat}
      />
      <Carton
        position={[-0.12, 1.02, 0.04]}
        size={[0.4, 0.28, 0.38]}
        color="#e2cba8"
        rotation={-0.06}
      />
    </group>
  );
}

function SteelRack({
  position,
  side,
}: {
  position: [number, number, number];
  side: 1 | -1;
}) {
  const steel = "#7d8fa3";
  const post = "#4a5a6c";
  const shelfYs = [0.42, 0.92, 1.42, 1.92] as const;
  const boxes: { shelf: number; size: [number, number, number]; color: string; z: number }[] = [
    { shelf: 0, size: [0.42, 0.26, 0.36], color: "#3b82f6", z: -0.08 },
    { shelf: 1, size: [0.38, 0.24, 0.34], color: "#14b8a6", z: 0.06 },
    { shelf: 2, size: [0.4, 0.22, 0.32], color: "#f59e0b", z: -0.04 },
  ];

  return (
    <group position={position}>
      {([-0.32, 0.32] as const).map((z) => (
        <mesh key={`p-${z}`} position={[0, 1.05, z]} castShadow>
          <boxGeometry args={[0.07, 2.1, 0.07]} />
          <meshStandardMaterial color={post} metalness={0.55} roughness={0.35} />
        </mesh>
      ))}
      {shelfYs.map((y) => (
        <group key={`shelf-${y}`}>
          <mesh position={[0, y, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.62, 0.04, 0.78]} />
            <meshStandardMaterial color={steel} metalness={0.4} roughness={0.42} />
          </mesh>
          <mesh position={[side * 0.28, y + 0.03, 0]} castShadow>
            <boxGeometry args={[0.03, 0.06, 0.78]} />
            <meshStandardMaterial color={post} metalness={0.5} roughness={0.4} />
          </mesh>
        </group>
      ))}
      {boxes.map((b, i) => {
        const shelfY = shelfYs[b.shelf];
        const [, h] = b.size;
        return (
          <RoundedBox
            key={`box-${i}`}
            args={b.size}
            radius={0.012}
            position={[side * -0.02, shelfY + 0.02 + h / 2, b.z]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial color={b.color} roughness={0.7} />
          </RoundedBox>
        );
      })}
    </group>
  );
}

/**
 * Pistola: lookAt apunta -Z local al target.
 * Geometría con nariz en -Z para que el haz vaya al pallet.
 */
function HandScanner({
  clockRef,
  reduced,
}: {
  clockRef: MutableRefObject<ScanClock>;
  reduced: boolean;
}) {
  const pivot = useRef<Group>(null);
  const beam = useRef<Mesh>(null);
  const screenMat = useRef<MeshStandardMaterial>(null);
  const target = useMemo(() => new THREE.Vector3(), []);
  const tipWorld = useMemo(() => new THREE.Vector3(), []);
  const mid = useMemo(() => new THREE.Vector3(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);
  const yAxis = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const qCurrent = useMemo(() => new THREE.Quaternion(), []);
  const qDesired = useMemo(() => new THREE.Quaternion(), []);
  const lookDummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state, delta) => {
    const gun = pivot.current;
    if (!gun) return;

    const { scanY, segment, hitStrength } = clockRef.current;
    target.set(0, scanY, PALLET_Z);

    let y = GUN_BASE.y;
    if (!reduced && segment === "idle") {
      y += Math.sin(state.clock.elapsedTime * 1.4) * 0.018;
    }
    gun.position.set(GUN_BASE.x, y, GUN_BASE.z);

    lookDummy.position.copy(gun.position);
    lookDummy.lookAt(target);
    qDesired.copy(lookDummy.quaternion);
    qCurrent.copy(gun.quaternion);
    gun.quaternion.slerpQuaternions(qCurrent, qDesired, Math.min(1, delta * 8));

    // punta local (nariz en -Z)
    tipWorld.set(0, 0, -0.28).applyQuaternion(gun.quaternion).add(gun.position);
    const dist = Math.max(0.05, tipWorld.distanceTo(target));

    if (beam.current) {
      mid.lerpVectors(tipWorld, target, 0.5);
      dir.subVectors(target, tipWorld).normalize();
      beam.current.position.copy(mid);
      beam.current.quaternion.setFromUnitVectors(yAxis, dir);
      beam.current.scale.set(1, dist, 1);
      const mat = beam.current.material as THREE.MeshBasicMaterial;
      const base = segment === "sweep" || segment === "hit" ? 0.45 : 0.22;
      mat.opacity = base + hitStrength * 0.35;
    }

    if (screenMat.current) {
      screenMat.current.emissiveIntensity = 0.7 + hitStrength * 1.8;
    }
  });

  return (
    <>
      <group ref={pivot} position={[GUN_BASE.x, GUN_BASE.y, GUN_BASE.z]}>
        {/* cuerpo a lo largo de -Z (nariz al frente; lookAt usa -Z) */}
        <RoundedBox args={[0.12, 0.14, 0.4]} radius={0.022} castShadow>
          <meshStandardMaterial color="#1e293b" metalness={0.45} roughness={0.32} />
        </RoundedBox>
        <mesh position={[0.061, 0.02, 0.02]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.1, 0.09]} />
          <meshStandardMaterial
            ref={screenMat}
            color="#22d3ee"
            emissive="#0891b2"
            emissiveIntensity={0.9}
            roughness={0.25}
          />
        </mesh>
        <mesh position={[0, -0.16, 0.12]} rotation={[0.5, 0, 0]}>
          <boxGeometry args={[0.09, 0.17, 0.07]} />
          <meshStandardMaterial color="#334155" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, -0.22]}>
          <boxGeometry args={[0.08, 0.08, 0.06]} />
          <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>

      {/* cilindro a lo largo de Y; quaternion + scale.y = distancia */}
      <mesh ref={beam}>
        <cylinderGeometry args={[0.012, 0.004, 1, 8]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.35} depthWrite={false} />
      </mesh>
    </>
  );
}

function ScanVolume({
  clockRef,
  reduced,
}: {
  clockRef: MutableRefObject<ScanClock>;
  reduced: boolean;
}) {
  const ref = useRef<Mesh>(null);

  useFrame(() => {
    if (!ref.current) return;
    const { scanY, hitStrength, segment } = clockRef.current;
    ref.current.position.y = reduced ? 0.75 : scanY;
    const mat = ref.current.material as MeshStandardMaterial;
    const sweepBoost = segment === "sweep" ? 0.15 : 0;
    mat.emissiveIntensity = 0.55 + sweepBoost + hitStrength * 1.6;
    mat.opacity = 0.22 + sweepBoost + hitStrength * 0.35;
  });

  return (
    <mesh ref={ref} position={[0, 0.75, PALLET_Z]}>
      <boxGeometry args={[1.05, 0.03, 0.95]} />
      <meshStandardMaterial
        color="#fbbf24"
        emissive="#f59e0b"
        emissiveIntensity={1}
        transparent
        opacity={0.35}
        depthWrite={false}
      />
    </mesh>
  );
}

function DockDoor() {
  return (
    <group position={[0, 1.15, -1.55]}>
      <RoundedBox args={[2.5, 2.4, 0.12]} radius={0.02} castShadow>
        <meshStandardMaterial color="#1a2740" roughness={0.88} />
      </RoundedBox>
      <mesh position={[0, 0.05, 0.07]}>
        <planeGeometry args={[1.75, 1.85]} />
        <meshStandardMaterial
          color="#2563eb"
          emissive="#1d4ed8"
          emissiveIntensity={0.4}
          transparent
          opacity={0.55}
        />
      </mesh>
    </group>
  );
}

function ConcreteFloor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.2]} receiveShadow>
        <planeGeometry args={[14, 14]} />
        <meshStandardMaterial color="#152536" roughness={0.98} metalness={0.02} />
      </mesh>
      {([-2.4, -0.8, 0.8, 2.4] as const).map((x) => (
        <mesh key={`jx-${x}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.005, 0.2]}>
          <planeGeometry args={[0.015, 8]} />
          <meshStandardMaterial color="#1a3048" roughness={1} />
        </mesh>
      ))}
      {([-2.4, -0.8, 0.8, 2.4] as const).map((z) => (
        <mesh key={`jz-${z}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, z]}>
          <planeGeometry args={[8, 0.015]} />
          <meshStandardMaterial color="#1a3048" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function ScanClockDriver({
  clockRef,
  reduced,
}: {
  clockRef: MutableRefObject<ScanClock>;
  reduced: boolean;
}) {
  useFrame((state) => {
    Object.assign(clockRef.current, sampleScan(state.clock.elapsedTime, reduced));
  });
  return null;
}

function SceneContent({ reduced, compact }: { reduced: boolean; compact: boolean }) {
  const clockRef = useRef<ScanClock>({
    phase: 0,
    segment: "aim",
    scanY: SCAN_Y_MIN,
    hitStrength: 0,
  });

  return (
    <>
      <color attach="background" args={["#0b1a2e"]} />
      <fog attach="fog" args={["#0b1a2e", 11, 24]} />

      <ScanClockDriver clockRef={clockRef} reduced={reduced} />

      <ambientLight intensity={0.9} />
      <directionalLight
        position={[3.2, 5.5, 3.5]}
        intensity={1.55}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-2.8, 2.8, -1.5]} intensity={0.5} color="#93c5fd" />
      <pointLight position={[0.2, 2.4, 1.4]} intensity={0.85} color="#fde68a" />
      <spotLight position={[-1.2, 3, 2]} angle={0.45} penumbra={0.55} intensity={0.7} />

      <ConcreteFloor />

      <SteelRack position={[-1.5, 0, 0.15]} side={-1} />
      <SteelRack position={[1.5, 0, 0.15]} side={1} />
      <SteelRack position={[-1.5, 0, 1.25]} side={-1} />
      <SteelRack position={[1.5, 0, 1.25]} side={1} />

      <DockDoor />
      <PalletStack clockRef={clockRef} />
      <HandScanner clockRef={clockRef} reduced={reduced} />
      <ScanVolume clockRef={clockRef} reduced={reduced} />

      <ContactShadows position={[0, 0.01, 0.35]} opacity={0.5} scale={9} blur={2.8} far={4.5} />

      <OrbitControls
        makeDefault
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={compact ? 0.25 : 0.35}
        minPolarAngle={Math.PI / 3.1}
        maxPolarAngle={Math.PI / 2.2}
        target={[0, 0.65, PALLET_Z]}
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
          position: compact ? [2.5, 1.85, 3.1] : [2.25, 1.55, 2.85],
          fov: compact ? 44 : 38,
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
