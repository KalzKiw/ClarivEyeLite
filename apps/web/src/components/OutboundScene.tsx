import {
  ContactShadows,
  Environment,
  RoundedBox,
  SoftShadows,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import type { Group, Mesh, MeshStandardMaterial, PointLight } from "three";
import * as THREE from "three";

const PERIOD = 14;
const PALLET_Z = 0.4;
const GUN_BASE = new THREE.Vector3(1.15, 1.05, 0.95);
const HALO_THICKNESS = 0.022;
const HALO_FACE_DEPTH = 0.032;
const PALLET_OUT_X = 1.65;
const PALLET_IN_X = -1.85;
const HOLSTER = { x: 0.55, y: 0.55, z: 1.15 };
/** Solo 2 cajas por pase de scan (no las 4 en bucle). */
const SCAN_BOXES = [1, 2] as const;

/** Cartones del stack (local al group z=PALLET_Z). */
const PALLET_CARTONS = [
  { pos: [-0.2, 0.38, -0.08] as const, size: [0.46, 0.38, 0.4] as const, color: "#d4b896", rot: 0 },
  { pos: [0.26, 0.34, 0.1] as const, size: [0.38, 0.3, 0.36] as const, color: "#c5ced9", rot: 0.08 },
  { pos: [0.02, 0.72, 0] as const, size: [0.52, 0.34, 0.46] as const, color: "#c9966c", rot: 0 },
  { pos: [-0.12, 1.02, 0.04] as const, size: [0.4, 0.28, 0.38] as const, color: "#e2cba8", rot: -0.06 },
] as const;

const N = PALLET_CARTONS.length;

type ScanSegment =
  | "ambient"
  | "aim"
  | "approach"
  | "slice"
  | "hit"
  | "rest"
  | "swapOut"
  | "swapIn"
  | "settle";

type ScanClock = {
  phase: number;
  segment: ScanSegment;
  activeIndex: number;
  progress: number;
  hitStrength: number;
  doScan: boolean;
  targetAim: { x: number; y: number; z: number };
  targetHaloY: number;
  targetHit: number;
  targetLight: number;
  targetPalletX: number;
  targetDoor: number;
  snapIn: boolean;
  aimX: number;
  aimY: number;
  aimZ: number;
  haloY: number;
  lightIntensity: number;
  doorGlow: number;
  palletX: number;
};

function smootherstep(t: number) {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function worldCenter(i: number, palletX = 0) {
  const c = PALLET_CARTONS[i];
  return {
    x: c.pos[0] + palletX,
    y: c.pos[1],
    z: c.pos[2] + PALLET_Z,
    w: c.size[0],
    h: c.size[1],
    d: c.size[2],
  };
}

function frontAim(i: number, sliceY: number, palletX = 0) {
  const c = worldCenter(i, palletX);
  return { x: c.x, y: sliceY, z: c.z + c.d / 2 };
}

type Aabb = { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };

function cartonAabb(i: number, palletX: number): Aabb {
  const c = worldCenter(i, palletX);
  const pad = 0.01;
  return {
    minX: c.x - c.w / 2 - pad,
    maxX: c.x + c.w / 2 + pad,
    minY: c.y - c.h / 2 - pad,
    maxY: c.y + c.h / 2 + pad,
    minZ: c.z - c.d / 2 - pad,
    maxZ: c.z + c.d / 2 + pad,
  };
}

function intersectRayAabb(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  box: Aabb,
): number | null {
  let tMin = 0;
  let tMax = Infinity;
  const axes: [number, number, number, number][] = [
    [ox, dx, box.minX, box.maxX],
    [oy, dy, box.minY, box.maxY],
    [oz, dz, box.minZ, box.maxZ],
  ];
  for (const [o, d, minB, maxB] of axes) {
    if (Math.abs(d) < 1e-8) {
      if (o < minB || o > maxB) return null;
      continue;
    }
    let t1 = (minB - o) / d;
    let t2 = (maxB - o) / d;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return null;
  }
  if (tMax < 0) return null;
  const t = tMin >= 0 ? tMin : tMax;
  return t >= 0 ? t : null;
}

function firstCartonHit(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  maxDist: number,
  palletX: number,
): number {
  let best = maxDist;
  for (let i = 0; i < N; i++) {
    const t = intersectRayAabb(ox, oy, oz, dx, dy, dz, cartonAabb(i, palletX));
    if (t != null && t > 0.02 && t < best) best = t;
  }
  return best;
}

type Sample = {
  phase: number;
  segment: ScanSegment;
  activeIndex: number;
  progress: number;
  doScan: boolean;
  targetAim: { x: number; y: number; z: number };
  targetHaloY: number;
  targetHit: number;
  targetLight: number;
  targetPalletX: number;
  targetDoor: number;
  snapIn: boolean;
};

/**
 * Ciclos alternos:
 * - Par: ambient → scan 2 cajas → rest → swapOut → ambient vacío → swapIn
 * - Impar: solo logística (sin scan) — rompe el bucle de “siempre escanear”
 */
function sampleTargets(elapsed: number, reduced: boolean): Sample {
  const c2 = worldCenter(2);
  if (reduced) {
    return {
      phase: 0.5,
      segment: "ambient",
      activeIndex: 2,
      progress: 0.5,
      doScan: false,
      targetAim: HOLSTER,
      targetHaloY: c2.y,
      targetHit: 0,
      targetLight: 0.1,
      targetPalletX: 0,
      targetDoor: 0.4,
      snapIn: false,
    };
  }

  const cycle = Math.floor(elapsed / PERIOD);
  const doScan = cycle % 2 === 0;
  const phase = (elapsed % PERIOD) / PERIOD;
  const lookRacks = { x: -1.2, y: 1.0, z: -0.4 };

  // —— Ciclo SIN scan: ambient → hold → out → empty → in ——
  if (!doScan) {
    if (phase < 0.28) {
      const pulse = 0.35 + Math.sin(elapsed * 1.2) * 0.15;
      return {
        phase,
        segment: "ambient",
        activeIndex: 0,
        progress: phase / 0.28,
        doScan: false,
        targetAim: lookRacks,
        targetHaloY: 0.5,
        targetHit: 0,
        targetLight: 0.05,
        targetPalletX: 0,
        targetDoor: pulse,
        snapIn: false,
      };
    }
    if (phase < 0.4) {
      return {
        phase,
        segment: "rest",
        activeIndex: 0,
        progress: (phase - 0.28) / 0.12,
        doScan: false,
        targetAim: HOLSTER,
        targetHaloY: 0.5,
        targetHit: 0,
        targetLight: 0.05,
        targetPalletX: 0,
        targetDoor: 0.45,
        snapIn: false,
      };
    }
    if (phase < 0.58) {
      const t = smootherstep((phase - 0.4) / 0.18);
      return {
        phase,
        segment: "swapOut",
        activeIndex: 0,
        progress: t,
        doScan: false,
        targetAim: HOLSTER,
        targetHaloY: 0.5,
        targetHit: 0,
        targetLight: 0.04,
        targetPalletX: THREE.MathUtils.lerp(0, PALLET_OUT_X, t),
        targetDoor: 0.55 + t * 0.35,
        snapIn: false,
      };
    }
    if (phase < 0.82) {
      const pulse = 0.5 + Math.sin(elapsed * 1.4) * 0.2;
      return {
        phase,
        segment: "ambient",
        activeIndex: 0,
        progress: (phase - 0.58) / 0.24,
        doScan: false,
        targetAim: lookRacks,
        targetHaloY: 0.5,
        targetHit: 0,
        targetLight: 0.03,
        targetPalletX: PALLET_OUT_X,
        targetDoor: pulse,
        snapIn: false,
      };
    }
    const t = smootherstep((phase - 0.82) / 0.18);
    return {
      phase,
      segment: "swapIn",
      activeIndex: 0,
      progress: t,
      doScan: false,
      targetAim: HOLSTER,
      targetHaloY: 0.5,
      targetHit: 0,
      targetLight: 0.08,
      targetPalletX: THREE.MathUtils.lerp(PALLET_IN_X, 0, t),
      targetDoor: 0.4,
      snapIn: true,
    };
  }

  // —— Ciclo CON scan (solo 2 cajas) ——
  if (phase < 0.22) {
    const pulse = 0.3 + Math.sin(elapsed * 1.1) * 0.12;
    return {
      phase,
      segment: "ambient",
      activeIndex: SCAN_BOXES[0],
      progress: phase / 0.22,
      doScan: true,
      targetAim: lookRacks,
      targetHaloY: 0.5,
      targetHit: 0,
      targetLight: 0.06,
      targetPalletX: 0,
      targetDoor: pulse,
      snapIn: false,
    };
  }

  if (phase < 0.52) {
    const local = (phase - 0.22) / 0.3;
    const per = 1 / SCAN_BOXES.length;
    const si = Math.min(SCAN_BOXES.length - 1, Math.floor(local / per));
    const idx = SCAN_BOXES[si];
    const u = (local - si * per) / per;
    const box = worldCenter(idx);
    const yBot = box.y - box.h / 2;
    const yTop = box.y + box.h / 2;
    const prevIdx = SCAN_BOXES[Math.max(0, si - 1)];
    const prev = worldCenter(prevIdx);

    if (u < 0.18) {
      const t = smootherstep(u / 0.18);
      const fromY = si === 0 ? yBot : prev.y;
      const y = THREE.MathUtils.lerp(fromY, yBot, t);
      return {
        phase,
        segment: "approach",
        activeIndex: idx,
        progress: u,
        doScan: true,
        targetAim: frontAim(idx, y),
        targetHaloY: y,
        targetHit: 0,
        targetLight: 0.45 + t * 0.25,
        targetPalletX: 0,
        targetDoor: 0.35,
        snapIn: false,
      };
    }
    if (u < 0.78) {
      const t = smootherstep((u - 0.18) / 0.6);
      const y = THREE.MathUtils.lerp(yBot, yTop, t);
      return {
        phase,
        segment: "slice",
        activeIndex: idx,
        progress: u,
        doScan: true,
        targetAim: frontAim(idx, y),
        targetHaloY: y,
        targetHit: 0,
        targetLight: 0.85,
        targetPalletX: 0,
        targetDoor: 0.35,
        snapIn: false,
      };
    }
    const hitT = (u - 0.78) / 0.22;
    const pulse = Math.sin(hitT * Math.PI);
    return {
      phase,
      segment: "hit",
      activeIndex: idx,
      progress: u,
      doScan: true,
      targetAim: frontAim(idx, yTop),
      targetHaloY: yTop,
      targetHit: pulse,
      targetLight: 0.7 + pulse * 0.8,
      targetPalletX: 0,
      targetDoor: 0.4,
      snapIn: false,
    };
  }

  if (phase < 0.6) {
    return {
      phase,
      segment: "rest",
      activeIndex: SCAN_BOXES[SCAN_BOXES.length - 1],
      progress: (phase - 0.52) / 0.08,
      doScan: true,
      targetAim: HOLSTER,
      targetHaloY: 0.5,
      targetHit: 0,
      targetLight: 0.08,
      targetPalletX: 0,
      targetDoor: 0.4,
      snapIn: false,
    };
  }

  if (phase < 0.74) {
    const t = smootherstep((phase - 0.6) / 0.14);
    return {
      phase,
      segment: "swapOut",
      activeIndex: 0,
      progress: t,
      doScan: true,
      targetAim: HOLSTER,
      targetHaloY: 0.5,
      targetHit: 0,
      targetLight: 0.05,
      targetPalletX: THREE.MathUtils.lerp(0, PALLET_OUT_X, t),
      targetDoor: 0.5 + t * 0.4,
      snapIn: false,
    };
  }

  if (phase < 0.88) {
    const pulse = 0.55 + Math.sin(elapsed * 1.3) * 0.2;
    return {
      phase,
      segment: "ambient",
      activeIndex: 0,
      progress: (phase - 0.74) / 0.14,
      doScan: true,
      targetAim: lookRacks,
      targetHaloY: 0.5,
      targetHit: 0,
      targetLight: 0.04,
      targetPalletX: PALLET_OUT_X,
      targetDoor: pulse,
      snapIn: false,
    };
  }

  const t = smootherstep((phase - 0.88) / 0.12);
  return {
    phase,
    segment: "swapIn",
    activeIndex: 0,
    progress: t,
    doScan: true,
    targetAim: HOLSTER,
    targetHaloY: 0.5,
    targetHit: 0,
    targetLight: 0.08,
    targetPalletX: THREE.MathUtils.lerp(PALLET_IN_X, 0, t),
    targetDoor: 0.35,
    snapIn: true,
  };
}

function dampClock(c: ScanClock, next: Sample, delta: number) {
  const enteringSwapIn = next.segment === "swapIn" && c.segment !== "swapIn";
  c.phase = next.phase;
  c.segment = next.segment;
  c.activeIndex = next.activeIndex;
  c.progress = next.progress;
  c.doScan = next.doScan;
  c.targetAim = next.targetAim;
  c.targetHaloY = next.targetHaloY;
  c.targetHit = next.targetHit;
  c.targetLight = next.targetLight;
  c.targetPalletX = next.targetPalletX;
  c.targetDoor = next.targetDoor;
  c.snapIn = next.snapIn;

  if (enteringSwapIn) {
    c.palletX = PALLET_IN_X;
  }

  const aimLambda =
    next.segment === "slice"
      ? 8
      : next.segment === "ambient" || next.segment === "rest" || next.segment.startsWith("swap")
        ? 4
        : 5.5;
  c.aimX = THREE.MathUtils.damp(c.aimX, next.targetAim.x, aimLambda, delta);
  c.aimY = THREE.MathUtils.damp(c.aimY, next.targetAim.y, aimLambda, delta);
  c.aimZ = THREE.MathUtils.damp(c.aimZ, next.targetAim.z, aimLambda, delta);
  c.haloY = THREE.MathUtils.damp(c.haloY, next.targetHaloY, aimLambda, delta);
  c.hitStrength = THREE.MathUtils.damp(c.hitStrength, next.targetHit, 7, delta);
  c.lightIntensity = THREE.MathUtils.damp(c.lightIntensity, next.targetLight, 4.5, delta);
  c.doorGlow = THREE.MathUtils.damp(c.doorGlow, next.targetDoor, 3.5, delta);
  const pxLambda = next.segment === "swapOut" || next.segment === "swapIn" ? 4 : 5.5;
  c.palletX = THREE.MathUtils.damp(c.palletX, next.targetPalletX, pxLambda, delta);
}

function initialClock(): ScanClock {
  const c0 = worldCenter(0);
  return {
    phase: 0,
    segment: "ambient",
    activeIndex: 0,
    progress: 0,
    hitStrength: 0,
    doScan: true,
    targetAim: HOLSTER,
    targetHaloY: c0.y,
    targetHit: 0,
    targetLight: 0.1,
    targetPalletX: 0,
    targetDoor: 0.35,
    snapIn: false,
    aimX: HOLSTER.x,
    aimY: HOLSTER.y,
    aimZ: HOLSTER.z,
    haloY: c0.y,
    lightIntensity: 0.1,
    doorGlow: 0.35,
    palletX: 0,
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
  const root = useRef<Group>(null);
  const labels = useRef<(MeshStandardMaterial | null)[]>([null, null, null, null]);
  const smoothHits = useRef([0, 0, 0, 0]);

  useFrame((_, delta) => {
    if (root.current) {
      root.current.position.x = clockRef.current.palletX;
    }
    const { activeIndex, hitStrength, segment, doScan } = clockRef.current;
    const scanning =
      doScan && (segment === "slice" || segment === "hit" || segment === "approach");
    for (let i = 0; i < N; i++) {
      const want = scanning && i === activeIndex ? hitStrength : 0;
      smoothHits.current[i] = THREE.MathUtils.damp(smoothHits.current[i], want, 8, delta);
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
    <group ref={root} position={[0, 0, PALLET_Z]}>
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

const RACK_PALETTES = [
  ["#3b82f6", "#60a5fa", "#93c5fd"],
  ["#14b8a6", "#2dd4bf", "#5eead4"],
  ["#f59e0b", "#fbbf24", "#fcd34d"],
  ["#94a3b8", "#64748b", "#cbd5e1"],
] as const;

function SteelRack({
  position,
  side,
  palette = 0,
}: {
  position: [number, number, number];
  side: 1 | -1;
  palette?: number;
}) {
  const steel = "#8a9bb0";
  const post = "#4a5a6c";
  const shelfYs = [0.38, 0.82, 1.26] as const;
  const postH = 1.45;
  const shelfW = 0.58;
  const shelfD = 0.55;
  const colors = RACK_PALETTES[palette % RACK_PALETTES.length];
  const boxes: { shelf: number; size: [number, number, number]; color: string; z: number }[] = [
    { shelf: 0, size: [0.36, 0.22, 0.32], color: colors[0], z: 0 },
    { shelf: 1, size: [0.34, 0.2, 0.3], color: colors[1], z: 0.02 },
    { shelf: 2, size: [0.35, 0.18, 0.28], color: colors[2], z: -0.02 },
  ];

  return (
    <group position={position}>
      {([-0.22, 0.22] as const).map((z) => (
        <mesh key={`p-${z}`} position={[0, postH / 2, z]} castShadow>
          <boxGeometry args={[0.06, postH, 0.06]} />
          <meshStandardMaterial color={post} metalness={0.65} roughness={0.28} />
        </mesh>
      ))}
      {shelfYs.map((y) => (
        <group key={`shelf-${y}`}>
          <mesh position={[0, y, 0]} castShadow receiveShadow>
            <boxGeometry args={[shelfW, 0.035, shelfD]} />
            <meshStandardMaterial color={steel} metalness={0.55} roughness={0.32} />
          </mesh>
          <mesh position={[side * (shelfW / 2 - 0.02), y + 0.025, 0]} castShadow>
            <boxGeometry args={[0.025, 0.05, shelfD]} />
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
            radius={0.012}
            smoothness={4}
            position={[side * -0.02, shelfY + 0.018 + h / 2, b.z]}
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

/** Pasillo de racks al fondo (ambos lados). */
function WarehouseBay() {
  const zs = [-1.35, -0.75, -0.2] as const;
  return (
    <group>
      {zs.map((z, i) => (
        <group key={`bay-${z}`}>
          <SteelRack position={[-2.15 - i * 0.12, 0, z]} side={-1} palette={i} />
          <SteelRack position={[2.15 + i * 0.12, 0, z]} side={1} palette={(i + 1) % 4} />
        </group>
      ))}
      {/* fila extra más profunda */}
      <SteelRack position={[-2.45, 0, -1.7]} side={-1} palette={3} />
      <SteelRack position={[2.45, 0, -1.7]} side={1} palette={0} />
    </group>
  );
}

function CameraRig({
  reduced,
  compact,
  clockRef,
}: {
  reduced: boolean;
  compact: boolean;
  clockRef: MutableRefObject<ScanClock>;
}) {
  const { camera } = useThree();
  const look = useMemo(() => new THREE.Vector3(0, 0.65, PALLET_Z), []);
  const desired = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const baseX = compact ? 2.35 : 2.1;
    const baseY = compact ? 1.65 : 1.42;
    const baseZ = compact ? 3.05 : 2.75;

    if (reduced) {
      camera.position.set(baseX, baseY, baseZ);
      look.set(0, 0.65, PALLET_Z);
      camera.lookAt(look);
      return;
    }

    const t = state.clock.elapsedTime;
    const swayX = Math.sin(t * 0.12) * 0.1;
    const swayZ = Math.cos(t * 0.1) * 0.06;
    const breathY = Math.sin(t * 0.2) * 0.025;
    const followY = THREE.MathUtils.clamp(clockRef.current.aimY * 0.18 + 0.55, 0.5, 0.8);

    desired.set(baseX + swayX, baseY + breathY, baseZ + swayZ);
    camera.position.x = THREE.MathUtils.damp(camera.position.x, desired.x, 1.6, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, desired.y, 1.6, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, desired.z, 1.6, delta);

    look.x = THREE.MathUtils.damp(look.x, clockRef.current.palletX * 0.12 + clockRef.current.aimX * 0.1, 1.5, delta);
    look.y = THREE.MathUtils.damp(look.y, followY, 1.8, delta);
    look.z = PALLET_Z;
    camera.lookAt(look);
  });

  return null;
}

function HandScanner({
  clockRef,
  reduced,
}: {
  clockRef: MutableRefObject<ScanClock>;
  reduced: boolean;
}) {
  const pivot = useRef<Group>(null);
  const beamCore = useRef<Mesh>(null);
  const beamGlow = useRef<Mesh>(null);
  const impact = useRef<Mesh>(null);
  const screenMat = useRef<MeshStandardMaterial>(null);
  const target = useMemo(() => new THREE.Vector3(), []);
  const tipWorld = useMemo(() => new THREE.Vector3(), []);
  const hitPoint = useMemo(() => new THREE.Vector3(), []);
  const mid = useMemo(() => new THREE.Vector3(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);
  const yAxis = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const lookDummy = useMemo(() => new THREE.Object3D(), []);
  const bobY = useRef(0);
  const beamOpacity = useRef(0.2);
  const impactScale = useRef(0.015);

  useFrame((state, delta) => {
    const gun = pivot.current;
    if (!gun) return;

    const { aimX, aimY, aimZ, segment, hitStrength, palletX } = clockRef.current;
    target.set(aimX, aimY, aimZ);

    const resting =
      segment === "ambient" ||
      segment === "rest" ||
      segment === "swapOut" ||
      segment === "swapIn" ||
      segment === "settle";
    const wantBob =
      !reduced && (segment === "rest" || segment === "ambient")
        ? Math.sin(state.clock.elapsedTime * 0.7) * 0.008
        : 0;
    bobY.current = THREE.MathUtils.damp(bobY.current, wantBob, 3, delta);
    gun.position.set(GUN_BASE.x, GUN_BASE.y + bobY.current, GUN_BASE.z);

    lookDummy.position.copy(gun.position);
    lookDummy.lookAt(target);
    gun.quaternion.slerp(lookDummy.quaternion, 1 - Math.exp(-4.5 * delta));

    tipWorld.set(0, 0, -0.28).applyQuaternion(gun.quaternion).add(gun.position);
    const distToAim = Math.max(0.05, tipWorld.distanceTo(target));
    dir.subVectors(target, tipWorld).normalize();

    const hitDist = resting
      ? distToAim
      : firstCartonHit(tipWorld.x, tipWorld.y, tipWorld.z, dir.x, dir.y, dir.z, distToAim, palletX);
    const beamLen = Math.max(0.04, Math.min(hitDist, resting ? 0.55 : hitDist));
    hitPoint.copy(tipWorld).addScaledVector(dir, beamLen);
    mid.lerpVectors(tipWorld, hitPoint, 0.5);

    const active = segment === "slice" || segment === "hit" || segment === "approach";
    const wantOp = (active ? 0.5 : resting ? 0.08 : 0.18) + hitStrength * 0.3;
    beamOpacity.current = THREE.MathUtils.damp(beamOpacity.current, wantOp, 5, delta);

    const placeBeam = (mesh: Mesh | null, opacityMul: number) => {
      if (!mesh) return;
      mesh.position.copy(mid);
      mesh.quaternion.setFromUnitVectors(yAxis, dir);
      mesh.scale.set(1, beamLen, 1);
      (mesh.material as THREE.MeshBasicMaterial).opacity = beamOpacity.current * opacityMul;
      mesh.visible = beamOpacity.current > 0.04;
    };
    placeBeam(beamCore.current, 1);
    placeBeam(beamGlow.current, 0.45);

    if (impact.current) {
      impact.current.position.copy(hitPoint);
      const wantScale = active ? 0.018 + hitStrength * 0.04 + (segment === "slice" ? 0.01 : 0) : 0.004;
      impactScale.current = THREE.MathUtils.damp(impactScale.current, wantScale, 7, delta);
      impact.current.scale.setScalar(impactScale.current);
      impact.current.visible = !resting && impactScale.current > 0.008;
      const mat = impact.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.8 + hitStrength * 2.2;
      mat.opacity = 0.55 + hitStrength * 0.4;
    }

    if (screenMat.current) {
      screenMat.current.emissiveIntensity = THREE.MathUtils.damp(
        screenMat.current.emissiveIntensity,
        resting ? 0.35 : 0.75 + hitStrength * 1.6,
        5,
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

      <mesh ref={beamCore} renderOrder={2}>
        <cylinderGeometry args={[0.006, 0.0025, 1, 10]} />
        <meshBasicMaterial
          color="#ff4d4d"
          transparent
          opacity={0.55}
          depthTest
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={beamGlow} renderOrder={1}>
        <cylinderGeometry args={[0.018, 0.008, 1, 12]} />
        <meshBasicMaterial
          color="#ff7a7a"
          transparent
          opacity={0.22}
          depthTest
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={impact} renderOrder={3}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshStandardMaterial
          color="#fecaca"
          emissive="#ef4444"
          emissiveIntensity={1}
          transparent
          opacity={0.7}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </>
  );
}

/** Halo en L: cara frontal + cara derecha de la caja activa. */
function ScanHalo({ clockRef }: { clockRef: MutableRefObject<ScanClock> }) {
  const frontRef = useRef<Mesh>(null);
  const sideRef = useRef<Mesh>(null);
  const lightRef = useRef<PointLight>(null);
  const smoothOp = useRef(0.2);
  const smoothEm = useRef(0.5);
  const smoothBox = useRef({ x: 0, z: PALLET_Z, w: 0.4, d: 0.4 });

  useFrame((_, delta) => {
    const c = clockRef.current;
    const scanning =
      c.segment === "slice" || c.segment === "hit" || c.segment === "approach";
    const box = worldCenter(c.activeIndex, c.palletX);
    const sb = smoothBox.current;
    sb.x = THREE.MathUtils.damp(sb.x, box.x, 8, delta);
    sb.z = THREE.MathUtils.damp(sb.z, box.z, 8, delta);
    sb.w = THREE.MathUtils.damp(sb.w, box.w, 8, delta);
    sb.d = THREE.MathUtils.damp(sb.d, box.d, 8, delta);
    const y = c.haloY;

    const boost =
      c.segment === "slice" || c.segment === "hit"
        ? 0.2
        : c.segment === "approach"
          ? 0.08
          : 0;
    const wantEm = scanning ? 0.45 + boost + c.hitStrength * 1.3 : 0.05;
    const wantOp = scanning ? 0.2 + boost + c.hitStrength * 0.28 : 0.02;
    smoothEm.current = THREE.MathUtils.damp(smoothEm.current, wantEm, 6, delta);
    smoothOp.current = THREE.MathUtils.damp(smoothOp.current, wantOp, 6, delta);

    const applyMat = (mesh: Mesh | null) => {
      if (!mesh) return;
      mesh.visible = scanning && smoothOp.current > 0.05;
      const mat = mesh.material as MeshStandardMaterial;
      mat.emissiveIntensity = smoothEm.current;
      mat.opacity = smoothOp.current;
    };

    if (frontRef.current) {
      frontRef.current.position.set(sb.x, y, sb.z + sb.d / 2);
      frontRef.current.scale.set(sb.w * 1.06, HALO_THICKNESS, HALO_FACE_DEPTH);
      applyMat(frontRef.current);
    }
    if (sideRef.current) {
      // cara derecha (+X)
      sideRef.current.position.set(sb.x + sb.w / 2, y, sb.z);
      sideRef.current.scale.set(HALO_FACE_DEPTH, HALO_THICKNESS, sb.d * 1.06);
      applyMat(sideRef.current);
    }
    if (lightRef.current) {
      lightRef.current.position.set(sb.x + sb.w * 0.25, y + 0.05, sb.z + sb.d * 0.35);
      lightRef.current.intensity = scanning ? c.lightIntensity : 0;
    }
  });

  const haloMat = (
    <meshStandardMaterial
      color="#fbbf24"
      emissive="#f59e0b"
      emissiveIntensity={0.5}
      transparent
      opacity={0.2}
      depthWrite={false}
      toneMapped={false}
    />
  );

  return (
    <>
      <mesh ref={frontRef}>
        <boxGeometry args={[1, 1, 1]} />
        {haloMat}
      </mesh>
      <mesh ref={sideRef}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#f59e0b"
          emissiveIntensity={0.5}
          transparent
          opacity={0.2}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <pointLight ref={lightRef} color="#fbbf24" intensity={0.15} distance={2.2} decay={2} />
    </>
  );
}

function DockDoor({ clockRef }: { clockRef: MutableRefObject<ScanClock> }) {
  const panel = useRef<MeshStandardMaterial>(null);

  useFrame(() => {
    if (!panel.current) return;
    const g = clockRef.current.doorGlow;
    panel.current.emissiveIntensity = 0.25 + g * 0.7;
    panel.current.opacity = 0.4 + g * 0.35;
  });

  return (
    <group position={[0, 1.15, -1.85]}>
      <RoundedBox args={[2.8, 2.4, 0.12]} radius={0.02} castShadow>
        <meshStandardMaterial color="#1a2740" roughness={0.85} metalness={0.1} />
      </RoundedBox>
      <mesh position={[0, 0.05, 0.07]}>
        <planeGeometry args={[1.9, 1.85]} />
        <meshStandardMaterial
          ref={panel}
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
        <planeGeometry args={[16, 16]} />
        <meshStandardMaterial color="#152536" roughness={0.96} metalness={0.04} />
      </mesh>
      {([-2.4, -0.8, 0.8, 2.4] as const).map((x) => (
        <mesh key={`jx-${x}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.005, 0.2]}>
          <planeGeometry args={[0.015, 10]} />
          <meshStandardMaterial color="#1a3048" roughness={1} />
        </mesh>
      ))}
      {([-2.4, -0.8, 0.8, 2.4] as const).map((z) => (
        <mesh key={`jz-${z}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, z]}>
          <planeGeometry args={[10, 0.015]} />
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
      <fog attach="fog" args={["#0b1a2e", 11, 28]} />

      <ScanClockDriver clockRef={clockRef} reduced={reduced} />

      <ambientLight intensity={0.45} />
      <hemisphereLight args={["#c7e0ff", "#1a2740", 0.55]} />
      <directionalLight
        position={[3.4, 6, 3.2]}
        intensity={1.75}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={20}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
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
      <WarehouseBay />
      <DockDoor clockRef={clockRef} />
      <PalletStack clockRef={clockRef} />
      <HandScanner clockRef={clockRef} reduced={reduced} />
      <ScanHalo clockRef={clockRef} />

      <ContactShadows
        position={[0, 0.01, 0.35]}
        opacity={0.45}
        scale={10}
        blur={3.2}
        far={5}
        resolution={1024}
      />

      <CameraRig reduced={reduced} compact={compact} clockRef={clockRef} />
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
          position: compact ? [2.35, 1.65, 3.05] : [2.1, 1.42, 2.75],
          fov: compact ? 42 : 36,
          near: 0.25,
          far: 40,
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
