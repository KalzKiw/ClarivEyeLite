import {
  ContactShadows,
  Environment,
  OrbitControls,
  RoundedBox,
  SoftShadows,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import type { Group, Mesh, MeshStandardMaterial, PointLight } from "three";
import * as THREE from "three";

const PERIOD = 7;
const PALLET_Z = 0.4;
const GUN_BASE = new THREE.Vector3(1.05, 0.95, 0.85);
const HALO_THICKNESS = 0.02;

/** Cartones del stack (posición local al group z=PALLET_Z). */
const PALLET_CARTONS = [
  { pos: [-0.2, 0.38, -0.08] as const, size: [0.46, 0.38, 0.4] as const, color: "#d4b896", rot: 0 },
  { pos: [0.26, 0.34, 0.1] as const, size: [0.38, 0.3, 0.36] as const, color: "#c5ced9", rot: 0.08 },
  { pos: [0.02, 0.72, 0] as const, size: [0.52, 0.34, 0.46] as const, color: "#c9966c", rot: 0 },
  { pos: [-0.12, 1.02, 0.04] as const, size: [0.4, 0.28, 0.38] as const, color: "#e2cba8", rot: -0.06 },
] as const;

const N = PALLET_CARTONS.length;

type ScanSegment = "aim" | "approach" | "slice" | "hit" | "idle";

type ScanClock = {
  phase: number;
  segment: ScanSegment;
  activeIndex: number;
  progress: number;
  hitStrength: number;
  /** targets (sin damp) */
  targetAim: { x: number; y: number; z: number };
  targetHalo: { x: number; y: number; z: number; w: number; d: number };
  targetHit: number;
  targetLight: number;
  /** smoothed */
  aimX: number;
  aimY: number;
  aimZ: number;
  haloX: number;
  haloY: number;
  haloZ: number;
  haloW: number;
  haloD: number;
  lightIntensity: number;
};

function smootherstep(t: number) {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function worldCenter(i: number) {
  const c = PALLET_CARTONS[i];
  return {
    x: c.pos[0],
    y: c.pos[1],
    z: c.pos[2] + PALLET_Z,
    w: c.size[0],
    h: c.size[1],
    d: c.size[2],
  };
}

function frontAim(i: number, sliceY: number) {
  const c = worldCenter(i);
  return { x: c.x, y: sliceY, z: c.z + c.d / 2 };
}

/**
 * Timeline:
 * 0–0.08 aim caja0
 * 0.08–0.90: 4 cajas × (approach + slice + hit)
 * 0.90–1 idle
 */
function sampleTargets(elapsed: number, reduced: boolean) {
  const c2 = worldCenter(2);
  if (reduced) {
    return {
      phase: 0.5,
      segment: "idle" as const,
      activeIndex: 2,
      progress: 0.5,
      targetAim: frontAim(2, c2.y),
      targetHalo: { x: c2.x, y: c2.y, z: c2.z, w: c2.w * 1.05, d: c2.d * 1.05 },
      targetHit: 0,
      targetLight: 0.35,
    };
  }

  const phase = (elapsed % PERIOD) / PERIOD;
  const c0 = worldCenter(0);

  if (phase < 0.08) {
    const y = c0.y - c0.h / 2;
    return {
      phase,
      segment: "aim" as const,
      activeIndex: 0,
      progress: phase / 0.08,
      targetAim: frontAim(0, y),
      targetHalo: { x: c0.x, y, z: c0.z, w: c0.w * 1.05, d: c0.d * 1.05 },
      targetHit: 0,
      targetLight: 0.25,
    };
  }

  if (phase < 0.9) {
    const local = (phase - 0.08) / 0.82;
    const per = 1 / N;
    const idx = Math.min(N - 1, Math.floor(local / per));
    const u = (local - idx * per) / per;
    const box = worldCenter(idx);
    const yBot = box.y - box.h / 2;
    const yTop = box.y + box.h / 2;

    // approach 0–0.22 | slice 0.22–0.78 | hit 0.78–1
    if (u < 0.22) {
      const t = smootherstep(u / 0.22);
      const prev = worldCenter(Math.max(0, idx - 1));
      const fromY = idx === 0 ? yBot : prev.y;
      const y = THREE.MathUtils.lerp(fromY, yBot, t);
      const w = THREE.MathUtils.lerp(idx === 0 ? box.w : prev.w, box.w, t) * 1.05;
      const d = THREE.MathUtils.lerp(idx === 0 ? box.d : prev.d, box.d, t) * 1.05;
      const x = THREE.MathUtils.lerp(idx === 0 ? box.x : prev.x, box.x, t);
      const z = THREE.MathUtils.lerp(idx === 0 ? box.z : prev.z, box.z, t);
      return {
        phase,
        segment: "approach" as const,
        activeIndex: idx,
        progress: u,
        targetAim: frontAim(idx, y),
        targetHalo: { x, y, z, w, d },
        targetHit: 0,
        targetLight: 0.45 + t * 0.25,
      };
    }

    if (u < 0.78) {
      const t = smootherstep((u - 0.22) / 0.56);
      const y = THREE.MathUtils.lerp(yBot, yTop, t);
      return {
        phase,
        segment: "slice" as const,
        activeIndex: idx,
        progress: u,
        targetAim: frontAim(idx, y),
        targetHalo: { x: box.x, y, z: box.z, w: box.w * 1.05, d: box.d * 1.05 },
        targetHit: 0,
        targetLight: 0.85,
      };
    }

    const hitT = (u - 0.78) / 0.22;
    const pulse = Math.sin(hitT * Math.PI);
    return {
      phase,
      segment: "hit" as const,
      activeIndex: idx,
      progress: u,
      targetAim: frontAim(idx, yTop),
      targetHalo: { x: box.x, y: yTop, z: box.z, w: box.w * 1.08, d: box.d * 1.08 },
      targetHit: pulse,
      targetLight: 0.7 + pulse * 0.9,
    };
  }

  // idle: soft return toward caja0 bottom
  const t = smootherstep((phase - 0.9) / 0.1);
  const last = worldCenter(N - 1);
  const y = THREE.MathUtils.lerp(last.y + last.h / 2, c0.y - c0.h / 2, t);
  return {
    phase,
    segment: "idle" as const,
    activeIndex: 0,
    progress: t,
    targetAim: { x: c0.x, y, z: c0.z + c0.d / 2 },
    targetHalo: {
      x: THREE.MathUtils.lerp(last.x, c0.x, t),
      y,
      z: THREE.MathUtils.lerp(last.z, c0.z, t),
      w: THREE.MathUtils.lerp(last.w, c0.w, t) * 1.05,
      d: THREE.MathUtils.lerp(last.d, c0.d, t) * 1.05,
    },
    targetHit: 0,
    targetLight: THREE.MathUtils.lerp(0.35, 0.15, t),
  };
}

function dampClock(c: ScanClock, next: ReturnType<typeof sampleTargets>, delta: number) {
  c.phase = next.phase;
  c.segment = next.segment;
  c.activeIndex = next.activeIndex;
  c.progress = next.progress;
  c.targetAim = next.targetAim;
  c.targetHalo = next.targetHalo;
  c.targetHit = next.targetHit;
  c.targetLight = next.targetLight;

  const fast = next.segment === "slice" ? 14 : 9;
  c.aimX = THREE.MathUtils.damp(c.aimX, next.targetAim.x, fast, delta);
  c.aimY = THREE.MathUtils.damp(c.aimY, next.targetAim.y, fast, delta);
  c.aimZ = THREE.MathUtils.damp(c.aimZ, next.targetAim.z, fast, delta);
  c.haloX = THREE.MathUtils.damp(c.haloX, next.targetHalo.x, fast, delta);
  c.haloY = THREE.MathUtils.damp(c.haloY, next.targetHalo.y, fast, delta);
  c.haloZ = THREE.MathUtils.damp(c.haloZ, next.targetHalo.z, fast, delta);
  c.haloW = THREE.MathUtils.damp(c.haloW, next.targetHalo.w, 10, delta);
  c.haloD = THREE.MathUtils.damp(c.haloD, next.targetHalo.d, 10, delta);
  c.hitStrength = THREE.MathUtils.damp(c.hitStrength, next.targetHit, 12, delta);
  c.lightIntensity = THREE.MathUtils.damp(c.lightIntensity, next.targetLight, 8, delta);
}

function initialClock(): ScanClock {
  const c0 = worldCenter(0);
  const y = c0.y - c0.h / 2;
  return {
    phase: 0,
    segment: "aim",
    activeIndex: 0,
    progress: 0,
    hitStrength: 0,
    targetAim: frontAim(0, y),
    targetHalo: { x: c0.x, y, z: c0.z, w: c0.w * 1.05, d: c0.d * 1.05 },
    targetHit: 0,
    targetLight: 0.2,
    aimX: c0.x,
    aimY: y,
    aimZ: c0.z + c0.d / 2,
    haloX: c0.x,
    haloY: y,
    haloZ: c0.z,
    haloW: c0.w * 1.05,
    haloD: c0.d * 1.05,
    lightIntensity: 0.2,
  };
}

function RenderTune() {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.12;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl]);
  return null;
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
            <meshStandardMaterial color={block} roughness={0.9} />
          </mesh>
        )),
      )}
      {([-0.38, 0, 0.38] as const).map((z) => (
        <mesh key={`bot-${z}`} position={[0, 0.02, z]} castShadow receiveShadow>
          <boxGeometry args={[0.98, 0.035, 0.11]} />
          <meshStandardMaterial color={plankDark} roughness={0.88} />
        </mesh>
      ))}
      {([-0.44, -0.22, 0, 0.22, 0.44] as const).map((x, i) => (
        <mesh key={`top-${x}`} position={[x, 0.145, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.11, 0.028, 0.98]} />
          <meshStandardMaterial color={i % 2 === 0 ? plank : plankDark} roughness={0.85} />
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
  onLabel,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  rotation?: number;
  onLabel?: (mat: MeshStandardMaterial | null) => void;
}) {
  const [w, h, d] = size;
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <RoundedBox args={size} radius={0.018} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.78} metalness={0.04} />
      </RoundedBox>
      <mesh position={[0, h * 0.12, d / 2 + 0.001]}>
        <planeGeometry args={[w * 0.9, 0.045]} />
        <meshStandardMaterial color="#ebe0cc" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, d / 2 + 0.002]}>
        <planeGeometry args={[0.04, h * 0.8]} />
        <meshStandardMaterial color="#ebe0cc" roughness={0.5} />
      </mesh>
      <mesh position={[w * 0.22, -h * 0.05, d / 2 + 0.003]}>
        <planeGeometry args={[0.12, 0.08]} />
        <meshStandardMaterial
          ref={(mat) => onLabel?.(mat)}
          color="#f8fafc"
          emissive="#22d3ee"
          emissiveIntensity={0}
          roughness={0.35}
        />
      </mesh>
    </group>
  );
}

function PalletStack({ clockRef }: { clockRef: MutableRefObject<ScanClock> }) {
  const labels = useRef<(MeshStandardMaterial | null)[]>([null, null, null, null]);
  const smoothHits = useRef([0, 0, 0, 0]);

  useFrame((_, delta) => {
    const { activeIndex, hitStrength } = clockRef.current;
    for (let i = 0; i < N; i++) {
      const want = i === activeIndex ? hitStrength : 0;
      smoothHits.current[i] = THREE.MathUtils.damp(smoothHits.current[i], want, 10, delta);
      const mat = labels.current[i];
      if (!mat) continue;
      const s = smoothHits.current[i];
      mat.emissiveIntensity = s * 2.2;
      mat.color.setRGB(
        THREE.MathUtils.lerp(0.97, 0.88, s),
        THREE.MathUtils.lerp(0.98, 0.97, s),
        THREE.MathUtils.lerp(0.99, 0.98, s),
      );
    }
  });

  return (
    <group position={[0, 0, PALLET_Z]}>
      <WoodPallet position={[0, 0, 0]} />
      {PALLET_CARTONS.map((c, i) => (
        <Carton
          key={i}
          position={[...c.pos]}
          size={[...c.size]}
          color={c.color}
          rotation={c.rot}
          onLabel={(mat) => {
            labels.current[i] = mat;
          }}
        />
      ))}
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
  const steel = "#8a9bb0";
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
          <meshStandardMaterial color={post} metalness={0.65} roughness={0.28} />
        </mesh>
      ))}
      {shelfYs.map((y) => (
        <group key={`shelf-${y}`}>
          <mesh position={[0, y, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.62, 0.04, 0.78]} />
            <meshStandardMaterial color={steel} metalness={0.55} roughness={0.32} />
          </mesh>
          <mesh position={[side * 0.28, y + 0.03, 0]} castShadow>
            <boxGeometry args={[0.03, 0.06, 0.78]} />
            <meshStandardMaterial color={post} metalness={0.6} roughness={0.3} />
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
            radius={0.014}
            smoothness={4}
            position={[side * -0.02, shelfY + 0.02 + h / 2, b.z]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial color={b.color} roughness={0.62} metalness={0.08} />
          </RoundedBox>
        );
      })}
    </group>
  );
}

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
  const lookDummy = useMemo(() => new THREE.Object3D(), []);
  const bobY = useRef(0);
  const beamOpacity = useRef(0.25);

  useFrame((state, delta) => {
    const gun = pivot.current;
    if (!gun) return;

    const { aimX, aimY, aimZ, segment, hitStrength } = clockRef.current;
    target.set(aimX, aimY, aimZ);

    const wantBob =
      !reduced && segment === "idle" ? Math.sin(state.clock.elapsedTime * 1.1) * 0.014 : 0;
    bobY.current = THREE.MathUtils.damp(bobY.current, wantBob, 4, delta);
    gun.position.set(GUN_BASE.x, GUN_BASE.y + bobY.current, GUN_BASE.z);

    lookDummy.position.copy(gun.position);
    lookDummy.lookAt(target);
    gun.quaternion.slerp(lookDummy.quaternion, 1 - Math.exp(-6.5 * delta));

    tipWorld.set(0, 0, -0.28).applyQuaternion(gun.quaternion).add(gun.position);
    const dist = Math.max(0.05, tipWorld.distanceTo(target));

    if (beam.current) {
      mid.lerpVectors(tipWorld, target, 0.5);
      dir.subVectors(target, tipWorld).normalize();
      beam.current.position.copy(mid);
      beam.current.quaternion.setFromUnitVectors(yAxis, dir);
      beam.current.scale.set(1, dist, 1);
      const active =
        segment === "slice" || segment === "hit" || segment === "approach" ? 0.5 : 0.2;
      const wantOp = active + hitStrength * 0.3;
      beamOpacity.current = THREE.MathUtils.damp(beamOpacity.current, wantOp, 7, delta);
      (beam.current.material as THREE.MeshBasicMaterial).opacity = beamOpacity.current;
    }

    if (screenMat.current) {
      screenMat.current.emissiveIntensity = THREE.MathUtils.damp(
        screenMat.current.emissiveIntensity,
        0.75 + hitStrength * 1.6,
        8,
        delta,
      );
    }
  });

  return (
    <>
      <group ref={pivot} position={[GUN_BASE.x, GUN_BASE.y, GUN_BASE.z]}>
        <RoundedBox args={[0.12, 0.14, 0.4]} radius={0.022} smoothness={4} castShadow>
          <meshStandardMaterial color="#1e293b" metalness={0.55} roughness={0.28} />
        </RoundedBox>
        <mesh position={[0.061, 0.02, 0.02]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.1, 0.09]} />
          <meshStandardMaterial
            ref={screenMat}
            color="#22d3ee"
            emissive="#0891b2"
            emissiveIntensity={0.9}
            roughness={0.2}
            metalness={0.2}
          />
        </mesh>
        <mesh position={[0, -0.16, 0.12]} rotation={[0.5, 0, 0]} castShadow>
          <boxGeometry args={[0.09, 0.17, 0.07]} />
          <meshStandardMaterial color="#334155" roughness={0.45} metalness={0.25} />
        </mesh>
        <mesh position={[0, 0, -0.22]} castShadow>
          <boxGeometry args={[0.08, 0.08, 0.06]} />
          <meshStandardMaterial color="#0f172a" metalness={0.7} roughness={0.22} />
        </mesh>
      </group>

      <mesh ref={beam}>
        <cylinderGeometry args={[0.01, 0.0035, 1, 12]} />
        <meshBasicMaterial
          color="#ff5a5a"
          transparent
          opacity={0.35}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </>
  );
}

/** Halo ámbar que morph hacia el tamaño/posición de la caja activa + pointLight. */
function ScanHalo({ clockRef }: { clockRef: MutableRefObject<ScanClock> }) {
  const meshRef = useRef<Mesh>(null);
  const lightRef = useRef<PointLight>(null);
  const smoothOp = useRef(0.25);
  const smoothEm = useRef(0.6);

  useFrame((_, delta) => {
    const c = clockRef.current;
    const mesh = meshRef.current;
    if (mesh) {
      mesh.position.set(c.haloX, c.haloY, c.haloZ);
      // unit box 1×1×1 → scale to carton footprint × thickness
      mesh.scale.set(c.haloW, HALO_THICKNESS, c.haloD);
      const mat = mesh.material as MeshStandardMaterial;
      const boost =
        c.segment === "slice" || c.segment === "hit"
          ? 0.2
          : c.segment === "approach"
            ? 0.08
            : 0;
      const wantEm = 0.45 + boost + c.hitStrength * 1.4;
      const wantOp = 0.18 + boost + c.hitStrength * 0.28;
      smoothEm.current = THREE.MathUtils.damp(smoothEm.current, wantEm, 9, delta);
      smoothOp.current = THREE.MathUtils.damp(smoothOp.current, wantOp, 9, delta);
      mat.emissiveIntensity = smoothEm.current;
      mat.opacity = smoothOp.current;
    }
    if (lightRef.current) {
      lightRef.current.position.set(c.haloX, c.haloY + 0.08, c.haloZ);
      lightRef.current.intensity = c.lightIntensity;
    }
  });

  return (
    <>
      <mesh ref={meshRef}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#f59e0b"
          emissiveIntensity={0.6}
          transparent
          opacity={0.25}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <pointLight
        ref={lightRef}
        color="#fbbf24"
        intensity={0.2}
        distance={2.2}
        decay={2}
      />
    </>
  );
}

function DockDoor() {
  return (
    <group position={[0, 1.15, -1.55]}>
      <RoundedBox args={[2.5, 2.4, 0.12]} radius={0.02} castShadow>
        <meshStandardMaterial color="#1a2740" roughness={0.85} metalness={0.1} />
      </RoundedBox>
      <mesh position={[0, 0.05, 0.07]}>
        <planeGeometry args={[1.75, 1.85]} />
        <meshStandardMaterial
          color="#2563eb"
          emissive="#1d4ed8"
          emissiveIntensity={0.35}
          transparent
          opacity={0.5}
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
        <meshStandardMaterial color="#152536" roughness={0.96} metalness={0.04} />
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
  useFrame((state, delta) => {
    dampClock(clockRef.current, sampleTargets(state.clock.elapsedTime, reduced), delta);
  });
  return null;
}

function SceneContent({ reduced, compact }: { reduced: boolean; compact: boolean }) {
  const clockRef = useRef<ScanClock>(initialClock());

  return (
    <>
      <RenderTune />
      <SoftShadows size={18} samples={12} focus={0.85} />
      <color attach="background" args={["#0b1a2e"]} />
      <fog attach="fog" args={["#0b1a2e", 12, 26]} />

      <ScanClockDriver clockRef={clockRef} reduced={reduced} />

      <ambientLight intensity={0.45} />
      <hemisphereLight args={["#c7e0ff", "#1a2740", 0.55]} />
      <directionalLight
        position={[3.4, 6, 3.2]}
        intensity={1.75}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={18}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-bias={-0.0002}
      />
      <directionalLight position={[-3, 2.5, -1.8]} intensity={0.45} color="#93c5fd" />
      <spotLight
        position={[-1.1, 3.2, 2.2]}
        angle={0.42}
        penumbra={0.7}
        intensity={0.85}
        castShadow
        color="#fff8f0"
      />

      <Environment preset="warehouse" environmentIntensity={0.28} />

      <ConcreteFloor />

      <SteelRack position={[-1.5, 0, 0.15]} side={-1} />
      <SteelRack position={[1.5, 0, 0.15]} side={1} />
      <SteelRack position={[-1.5, 0, 1.25]} side={-1} />
      <SteelRack position={[1.5, 0, 1.25]} side={1} />

      <DockDoor />
      <PalletStack clockRef={clockRef} />
      <HandScanner clockRef={clockRef} reduced={reduced} />
      <ScanHalo clockRef={clockRef} />

      <ContactShadows
        position={[0, 0.01, 0.35]}
        opacity={0.45}
        scale={9}
        blur={3.2}
        far={5}
        resolution={1024}
      />

      <OrbitControls
        makeDefault
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={compact ? 0.18 : 0.28}
        enableDamping
        dampingFactor={0.06}
        minPolarAngle={Math.PI / 3.05}
        maxPolarAngle={Math.PI / 2.18}
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
        dpr={[1, 2]}
        camera={{
          position: compact ? [2.5, 1.85, 3.1] : [2.25, 1.55, 2.85],
          fov: compact ? 44 : 38,
          near: 0.1,
          far: 50,
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          stencil: false,
        }}
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        <SceneContent reduced={reduced} compact={compact} />
      </Canvas>
    </div>
  );
}
