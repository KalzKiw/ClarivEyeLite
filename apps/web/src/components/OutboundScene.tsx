import { ContactShadows, Environment, RoundedBox, SoftShadows } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import type { Group, Mesh, MeshStandardMaterial } from "three";
import * as THREE from "three";

/**
 * Loop pack cartoon (~8.4 s):
 * arrive → fill (coloca 3) → pack (2 solapas) → seal (giro + cinta + label) → ship → gap
 * Variantes por ciclo: layout de bultos, sentido de giro, ángulo de cámara.
 */
const PERIOD = 8.4;

type Phase = "arrive" | "fill" | "pack" | "seal" | "ship" | "gap";

type PackedKind = "carton" | "mailer" | "tube";

const SLOT_POS = [
  { x: -0.15, z: 0.05 },
  { x: 0.07, z: -0.08 },
  { x: 0.12, z: 0.09 },
] as const;

/** Altura del prefab (para asentar en el suelo interior). */
const PACK_H: Record<PackedKind, number> = {
  carton: 0.155,
  mailer: 0.055,
  tube: 0.17,
};

/** Combos por ciclo: formas distintas, no colores. */
const LAYOUTS: PackedKind[][] = [
  ["carton", "mailer", "tube"],
  ["tube", "carton", "mailer"],
  ["mailer", "tube", "carton"],
  ["carton", "tube", "mailer"],
];

const BOX_W = 0.8;
const BOX_H = 0.42;
const BOX_D = 0.56;
const WALL = 0.03;
const FLOOR_T = 0.038;
const INNER_Y0 = -BOX_H / 2 + FLOOR_T;

type AnimShared = {
  phase: Phase;
  u: number;
  cycle: number;
  fill: number;
  spinDir: number;
};

function ease(t: number) {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function easeOutCubic(t: number) {
  const x = 1 - THREE.MathUtils.clamp(t, 0, 1);
  return 1 - x * x * x;
}

function easeBack(t: number) {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  const c1 = 1.85;
  const c3 = c1 + 1;
  return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;
}

function phaseAt(elapsed: number, reduced: boolean): { phase: Phase; u: number; cycle: number } {
  if (reduced) return { phase: "seal", u: 1, cycle: 0 };
  const cycle = Math.floor(elapsed / PERIOD);
  const p = (elapsed % PERIOD) / PERIOD;
  // Pausas cortas entre beats vía tramos asimétricos
  if (p < 0.11) return { phase: "arrive", u: ease(p / 0.11), cycle };
  if (p < 0.4) return { phase: "fill", u: (p - 0.11) / 0.29, cycle };
  if (p < 0.5) return { phase: "pack", u: easeBack((p - 0.4) / 0.1), cycle };
  if (p < 0.74) return { phase: "seal", u: (p - 0.5) / 0.24, cycle };
  if (p < 0.92) return { phase: "ship", u: (p - 0.74) / 0.18, cycle };
  return { phase: "gap", u: (p - 0.92) / 0.08, cycle };
}

function RenderTune() {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.14;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl]);
  return null;
}

function Cardboard({ color = "#c9966c" }: { color?: string }) {
  return <meshStandardMaterial color={color} roughness={0.82} metalness={0.02} />;
}

/** Hueca de verdad: suelo + 3 paredes altas + labio frontal bajo. */
function HollowShell() {
  const outer = "#c9966c";
  const inner = "#7a4e32";
  const h = BOX_H;
  const w = BOX_W;
  const d = BOX_D;
  const t = WALL;
  const lip = h * 0.14;

  return (
    <group>
      <mesh position={[0, -h / 2 + FLOOR_T / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, FLOOR_T, d]} />
        <Cardboard color={outer} />
      </mesh>
      <mesh position={[0, -h / 2 + FLOOR_T + 0.001, 0]} receiveShadow>
        <boxGeometry args={[w - t * 2, 0.002, d - t * 2]} />
        <meshStandardMaterial color={inner} roughness={0.96} />
      </mesh>

      <mesh position={[0, 0, -d / 2 + t / 2]} castShadow receiveShadow>
        <boxGeometry args={[w, h, t]} />
        <Cardboard color={outer} />
      </mesh>
      <mesh position={[0, FLOOR_T / 2, -d / 2 + t + 0.001]}>
        <boxGeometry args={[w - t * 2, h - FLOOR_T, 0.002]} />
        <meshStandardMaterial color={inner} roughness={0.96} />
      </mesh>

      <mesh position={[-w / 2 + t / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[t, h, d]} />
        <Cardboard color={outer} />
      </mesh>
      <mesh position={[-w / 2 + t + 0.001, FLOOR_T / 2, 0]}>
        <boxGeometry args={[0.002, h - FLOOR_T, d - t * 2]} />
        <meshStandardMaterial color={inner} roughness={0.96} />
      </mesh>

      <mesh position={[w / 2 - t / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[t, h, d]} />
        <Cardboard color={outer} />
      </mesh>
      <mesh position={[w / 2 - t - 0.001, FLOOR_T / 2, 0]}>
        <boxGeometry args={[0.002, h - FLOOR_T, d - t * 2]} />
        <meshStandardMaterial color={inner} roughness={0.96} />
      </mesh>

      {/* Labio frontal bajo — interior legible */}
      <mesh position={[0, -h / 2 + lip / 2, d / 2 - t / 2]} castShadow receiveShadow>
        <boxGeometry args={[w, lip, t]} />
        <Cardboard color={outer} />
      </mesh>

      <pointLight position={[0, 0.06, 0.06]} intensity={0.55} color="#ffe0b8" distance={0.75} decay={2} />
    </group>
  );
}

/** Cartón kraft sellado con cinta + etiqueta. */
function CartonSeal() {
  return (
    <group>
      <RoundedBox args={[0.145, PACK_H.carton, 0.13]} radius={0.012} castShadow>
        <meshStandardMaterial color="#c4a574" roughness={0.88} metalness={0.02} />
      </RoundedBox>
      <mesh position={[0, 0.02, 0.066]}>
        <planeGeometry args={[0.145, 0.028]} />
        <meshStandardMaterial color="#d4b896" roughness={0.55} />
      </mesh>
      <mesh position={[0, PACK_H.carton / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.13, 0.03]} />
        <meshStandardMaterial color="#d4b896" roughness={0.55} />
      </mesh>
      <mesh position={[0.02, -0.01, 0.067]}>
        <planeGeometry args={[0.055, 0.035]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.4} />
      </mesh>
    </group>
  );
}

/** Sobre / mailer acolchado achatado. */
function Mailer() {
  return (
    <group>
      <RoundedBox args={[0.19, PACK_H.mailer, 0.14]} radius={0.01} castShadow>
        <meshStandardMaterial color="#9a8b78" roughness={0.9} metalness={0.02} />
      </RoundedBox>
      <mesh position={[0, PACK_H.mailer / 2 + 0.002, -0.02]} rotation={[-0.15, 0, 0]}>
        <planeGeometry args={[0.17, 0.06]} />
        <meshStandardMaterial color="#8a7b6a" roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0.04, 0.005, 0.072]}>
        <planeGeometry args={[0.05, 0.028]} />
        <meshStandardMaterial color="#e8e4dc" roughness={0.45} />
      </mesh>
    </group>
  );
}

/** Rollo / botella envuelta en kraft. */
function WrapTube() {
  return (
    <group>
      <mesh castShadow>
        <cylinderGeometry args={[0.048, 0.052, PACK_H.tube, 16]} />
        <meshStandardMaterial color="#b8956a" roughness={0.86} metalness={0.03} />
      </mesh>
      <mesh position={[0, 0.01, 0]}>
        <cylinderGeometry args={[0.053, 0.053, 0.035, 16]} />
        <meshStandardMaterial color="#d4b896" roughness={0.6} />
      </mesh>
      <mesh position={[0.053, 0.04, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.04, 0.05]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.4} />
      </mesh>
    </group>
  );
}

function PackedPrefab({ kind }: { kind: PackedKind }) {
  if (kind === "carton") return <CartonSeal />;
  if (kind === "mailer") return <Mailer />;
  return <WrapTube />;
}

/**
 * Colocación: hover → drop → squash en grupo interno (prefab a tamaño fijo).
 */
function ContentItems({ shared }: { shared: MutableRefObject<AnimShared> }) {
  const roots = useRef<(Group | null)[]>([null, null, null]);
  const squash = useRef<(Group | null)[]>([null, null, null]);
  const lastCycle = useRef(-1);
  const layout = useRef(LAYOUTS[0]);

  useFrame(() => {
    const { fill: fillU, phase, cycle } = shared.current;
    if (cycle !== lastCycle.current) {
      lastCycle.current = cycle;
      layout.current = LAYOUTS[cycle % LAYOUTS.length];
    }

    const kinds = layout.current;
    for (let i = 0; i < 3; i++) {
      const g = roots.current[i];
      const sq = squash.current[i];
      if (!g || !sq) continue;

      const kind = kinds[i];
      const slot = SLOT_POS[i];
      const stagger = i * 0.26;
      const local = THREE.MathUtils.clamp((fillU - stagger) / 0.48, 0, 1);

      let y: number;
      let sx = 1;
      let sy = 1;
      let sz = 1;
      let rotY = 0;
      const hoverY = BOX_H / 2 + 0.28;
      const endY = INNER_Y0 + PACK_H[kind] / 2 + 0.003;

      if (local < 0.28) {
        const h = local / 0.28;
        y = THREE.MathUtils.lerp(hoverY + 0.16, hoverY, ease(h));
        rotY = (1 - h) * 0.55 * (i % 2 === 0 ? 1 : -1);
      } else {
        const d = (local - 0.28) / 0.72;
        const drop = easeOutCubic(d);
        const bounce = d > 0.85 ? Math.sin(((d - 0.85) / 0.15) * Math.PI) * 0.028 * (1 - d) : 0;
        y = THREE.MathUtils.lerp(hoverY, endY, drop) + bounce;
        // Asienta plano (yaw → 0)
        rotY = (1 - drop) * 0.25 * (i % 2 === 0 ? 1 : -1);
        if (d > 0.82 && d < 0.95) {
          const s = Math.sin(((d - 0.82) / 0.13) * Math.PI);
          sy = THREE.MathUtils.lerp(1, 0.78, s);
          sx = sz = THREE.MathUtils.lerp(1, 1.12, s);
        }
      }

      g.position.set(slot.x, y, slot.z);
      g.rotation.set(0, rotY, (1 - local) * 0.08);
      sq.scale.set(sx, sy, sz);

      const show =
        (phase === "fill" && local > 0.02) ||
        phase === "pack" ||
        phase === "seal" ||
        phase === "ship";
      g.visible = show;
      for (const child of sq.children) {
        child.visible = child.name === kind;
      }
    }
  });

  return (
    <group>
      {[0, 1, 2].map((i) => (
        <group
          key={i}
          ref={(el) => {
            roots.current[i] = el;
          }}
          visible={false}
        >
          <group
            ref={(el) => {
              squash.current[i] = el;
            }}
          >
            <group name="carton">
              <PackedPrefab kind="carton" />
            </group>
            <group name="mailer" visible={false}>
              <PackedPrefab kind="mailer" />
            </group>
            <group name="tube" visible={false}>
              <PackedPrefab kind="tube" />
            </group>
          </group>
        </group>
      ))}
    </group>
  );
}

function TapeStrips({ get }: { get: () => number }) {
  const strips = useRef<(Mesh | null)[]>([]);

  useFrame(() => {
    const p = get();
    const progresses = [
      Math.min(1, p * 1.5),
      Math.max(0, (p - 0.12) / 0.7),
      Math.max(0, (p - 0.35) / 0.55),
      Math.max(0, (p - 0.48) / 0.5),
    ];
    for (let i = 0; i < 4; i++) {
      const m = strips.current[i];
      if (!m) continue;
      const t = ease(progresses[i]);
      m.visible = t > 0.02;
      if (i < 2) m.scale.set(THREE.MathUtils.lerp(0.02, 1, t), 1, 1);
      else m.scale.set(1, THREE.MathUtils.lerp(0.02, 1, t), 1);
    }
  });

  return (
    <group>
      <mesh
        ref={(el) => {
          strips.current[0] = el;
        }}
        position={[0, BOX_H / 2 + 0.03, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[BOX_W * 0.96, 0.048]} />
        <meshStandardMaterial color="#e8dcc8" roughness={0.38} />
      </mesh>
      <mesh
        ref={(el) => {
          strips.current[1] = el;
        }}
        position={[0, BOX_H / 2 + 0.031, 0]}
        rotation={[-Math.PI / 2, 0, Math.PI / 2]}
      >
        <planeGeometry args={[BOX_D * 0.96, 0.042]} />
        <meshStandardMaterial color="#e8dcc8" roughness={0.38} />
      </mesh>
      <mesh
        ref={(el) => {
          strips.current[2] = el;
        }}
        position={[BOX_W / 2 + 0.001, BOX_H / 2 - 0.04, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <planeGeometry args={[0.042, BOX_H * 0.4]} />
        <meshStandardMaterial color="#e8dcc8" roughness={0.38} />
      </mesh>
      <mesh
        ref={(el) => {
          strips.current[3] = el;
        }}
        position={[-BOX_W / 2 - 0.001, BOX_H / 2 - 0.04, 0]}
        rotation={[0, -Math.PI / 2, 0]}
      >
        <planeGeometry args={[0.042, BOX_H * 0.4]} />
        <meshStandardMaterial color="#e8dcc8" roughness={0.38} />
      </mesh>
    </group>
  );
}

function SpeedStreaks({
  intensityRef,
  shared,
}: {
  intensityRef: MutableRefObject<number>;
  shared: MutableRefObject<AnimShared>;
}) {
  const refs = useRef<(Mesh | null)[]>([]);
  useFrame(() => {
    const intensity = intensityRef.current;
    const active = shared.current.phase === "ship" && intensity > 0.04;
    for (let i = 0; i < 5; i++) {
      const m = refs.current[i];
      if (!m) continue;
      m.visible = active;
      (m.material as THREE.MeshBasicMaterial).opacity = intensity * (0.5 - i * 0.07);
      m.position.x = -0.08 - i * 0.07 - intensity * 0.05;
    }
  });
  return (
    <group position={[-0.55, 0, 0]}>
      {[0.16, 0.06, -0.02, -0.1, -0.18].map((y, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          position={[0, y, 0.03]}
        >
          <planeGeometry args={[0.62 - i * 0.05, 0.016]} />
          <meshBasicMaterial
            color="#93c5fd"
            transparent
            opacity={0}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function PuffBurst({ kickRef }: { kickRef: MutableRefObject<number> }) {
  const refs = useRef<(Mesh | null)[]>([]);
  const born = useRef(-1);
  const ages = useRef(Array.from({ length: 7 }, () => 0));

  useFrame((_, dt) => {
    const trigger = kickRef.current;
    if (trigger !== born.current && trigger > 0) {
      born.current = trigger;
      ages.current = ages.current.map(() => 0);
    }
    for (let i = 0; i < 7; i++) {
      const m = refs.current[i];
      if (!m) continue;
      if (born.current < 0) {
        m.visible = false;
        continue;
      }
      ages.current[i] += dt;
      const delay = i * 0.022;
      const age = ages.current[i] - delay;
      if (age < 0 || age > 0.48) {
        m.visible = false;
        continue;
      }
      m.visible = true;
      const t = age / 0.48;
      const ang = (i / 7) * Math.PI * 2 + 0.5;
      const dist = 0.08 + t * 0.62;
      m.position.set(
        Math.cos(ang) * dist * 0.38 - 0.3,
        0.01 + Math.sin(ang) * 0.14 + t * 0.16,
        Math.sin(ang) * dist * 0.28,
      );
      m.scale.setScalar(0.028 + t * 0.2);
      (m.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.58;
    }
  });

  return (
    <group>
      {Array.from({ length: 7 }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          visible={false}
        >
          <sphereGeometry args={[1, 10, 10]} />
          <meshBasicMaterial
            color={i % 2 ? "#e0f2fe" : "#bfdbfe"}
            transparent
            opacity={0.5}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function PackBox({
  reduced,
  shipKickRef,
  shared,
}: {
  reduced: boolean;
  shipKickRef: MutableRefObject<number>;
  shared: MutableRefObject<AnimShared>;
}) {
  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const flapBack = useRef<Group>(null);
  const flapFront = useRef<Group>(null);
  const label = useRef<Mesh>(null);
  const labelMat = useRef<MeshStandardMaterial>(null);
  const barcode = useRef<Mesh>(null);
  const tapeRef = useRef(0);
  const streakRef = useRef(0);
  const kickRef = useRef(0);

  const state = useRef({
    x: -1.85,
    flapB: 1,
    flapF: 1,
    tape: 0,
    label: 0,
    y: BOX_H / 2 + 0.02,
    yaw: 0,
    sx: 1,
    sy: 1,
    sz: 1,
    fillU: 0,
    wasShip: false,
    shipKick: 0,
    lastCycle: -1,
  });

  useFrame((clk, dt) => {
    if (!root.current || !body.current) return;
    const { phase, u, cycle } = phaseAt(clk.clock.elapsedTime, reduced);
    const s = state.current;

    if (cycle !== s.lastCycle) {
      s.lastCycle = cycle;
      shared.current.spinDir = cycle % 2 === 0 ? 1 : -1;
    }

    const spinDir = shared.current.spinDir;
    const baseY = BOX_H / 2 + 0.02;

    let targetX = 0;
    let targetFlapB = 0;
    let targetFlapF = 0;
    let targetTape = 0;
    let targetLabel = 0;
    let targetY = baseY;
    let targetYaw = 0;
    let targetSx = 1;
    let targetSy = 1;
    let targetSz = 1;
    let fillU = 0;
    let streak = 0;
    let lockYaw = false;

    if (phase === "arrive") {
      targetX = THREE.MathUtils.lerp(-1.85, 0, u);
      targetFlapB = 1;
      targetFlapF = 1;
      targetYaw = THREE.MathUtils.lerp(-0.4 * spinDir, 0.05, u);
      // Soft land bounce
      targetY = baseY + Math.sin(u * Math.PI) * 0.04 * (1 - u);
      if (u < 0.05) {
        s.x = -1.85;
        s.flapB = 1;
        s.flapF = 1;
        s.tape = 0;
        s.label = 0;
        s.sx = s.sy = s.sz = 1;
        s.yaw = -0.4 * spinDir;
        s.wasShip = false;
        s.fillU = 0;
        lockYaw = true;
      }
    } else if (phase === "fill") {
      targetX = 0;
      targetFlapB = 1;
      targetFlapF = 1;
      // Ligero balanceo para ver el interior
      targetYaw = 0.12 + Math.sin(u * Math.PI * 1.2) * 0.06;
      fillU = u;
    } else if (phase === "pack") {
      targetX = 0;
      fillU = 1;
      targetYaw = 0;
      // Solapa trasera primero, frontal después (stagger en u)
      targetFlapB = Math.max(0, 1 - easeBack(Math.min(1, u * 1.35)));
      targetFlapF = Math.max(0, 1 - easeBack(Math.max(0, (u - 0.28) / 0.72)));
    } else if (phase === "seal") {
      targetX = 0;
      targetFlapB = 0;
      targetFlapF = 0;
      fillU = 1;
      // Giro directo (sin damp) — se ve el embalaje en 360°
      lockYaw = true;
      const spinU = ease(u);
      targetYaw = spinDir * Math.PI * 2 * spinU;
      s.yaw = targetYaw;
      targetTape = Math.min(1, u * 1.35);
      // Label solo al final, cuando vuelve a mirar a cámara
      const lp = ease(Math.max(0, (u - 0.62) / 0.38));
      targetLabel =
        lp < 0.55 ? lp * (1.2 / 0.55) : THREE.MathUtils.lerp(1.2, 1, (lp - 0.55) / 0.45);
      // Pequeño lift mientras gira
      targetY = baseY + Math.sin(spinU * Math.PI) * 0.03;
    } else if (phase === "ship") {
      if (!s.wasShip) {
        s.wasShip = true;
        s.shipKick += 1;
        shipKickRef.current = s.shipKick;
        kickRef.current = s.shipKick;
      }
      targetFlapB = 0;
      targetFlapF = 0;
      targetTape = 1;
      targetLabel = 1;
      fillU = 1;
      lockYaw = true;
      targetYaw = spinDir * Math.PI * 2;
      s.yaw = targetYaw;

      // Anticipación → lanzamiento
      if (u < 0.14) {
        const t = u / 0.14;
        targetX = THREE.MathUtils.lerp(0, -0.08, Math.sin(t * Math.PI));
        targetSx = THREE.MathUtils.lerp(1, 1.32, t);
        targetSy = THREE.MathUtils.lerp(1, 0.72, t);
        targetSz = THREE.MathUtils.lerp(1, 0.9, t);
        streak = t * 0.35;
      } else {
        const t = (u - 0.14) / 0.86;
        const accel = Math.pow(t, 0.4);
        targetX = THREE.MathUtils.lerp(-0.05, 2.55, accel);
        if (t < 0.2) {
          const r = t / 0.2;
          targetSx = THREE.MathUtils.lerp(1.32, 0.9, r);
          targetSy = THREE.MathUtils.lerp(0.72, 1.15, r);
          targetSz = THREE.MathUtils.lerp(0.9, 1.05, r);
        }
        targetY = baseY + Math.sin(Math.min(t, 1) * Math.PI) * 0.09;
        // Ligero tumble en pitch
        if (body.current) {
          body.current.rotation.z = THREE.MathUtils.damp(
            body.current.rotation.z,
            -t * 0.18 * spinDir,
            8,
            dt,
          );
        }
        streak = t < 0.55 ? 1 - t * 0.4 : Math.max(0, 1.3 - t * 1.5);
      }
    } else {
      targetX = 2.7;
      targetFlapB = 1;
      targetFlapF = 1;
      targetTape = 0;
      targetLabel = 0;
      fillU = 0;
      s.wasShip = false;
      lockYaw = true;
      targetYaw = spinDir * Math.PI * 2;
      s.yaw = targetYaw;
      if (body.current) body.current.rotation.z = 0;
    }

    if (phase !== "ship" && body.current) {
      body.current.rotation.z = THREE.MathUtils.damp(body.current.rotation.z, 0, 10, dt);
    }

    const k = phase === "ship" ? 16 : phase === "arrive" ? 8 : 11;
    s.x = THREE.MathUtils.damp(s.x, targetX, k, dt);
    s.flapB = THREE.MathUtils.damp(s.flapB, targetFlapB, phase === "pack" ? 14 : 10, dt);
    s.flapF = THREE.MathUtils.damp(s.flapF, targetFlapF, phase === "pack" ? 14 : 10, dt);
    s.tape = THREE.MathUtils.damp(s.tape, targetTape, 14, dt);
    s.label = THREE.MathUtils.damp(s.label, targetLabel, 16, dt);
    s.y = THREE.MathUtils.damp(s.y, targetY, 11, dt);
    s.sx = THREE.MathUtils.damp(s.sx, targetSx, 14, dt);
    s.sy = THREE.MathUtils.damp(s.sy, targetSy, 14, dt);
    s.sz = THREE.MathUtils.damp(s.sz, targetSz, 14, dt);
    if (!lockYaw) s.yaw = THREE.MathUtils.damp(s.yaw, targetYaw, 7, dt);
    s.fillU = THREE.MathUtils.damp(s.fillU, fillU, 8, dt);
    streakRef.current = THREE.MathUtils.damp(streakRef.current, streak, 11, dt);
    tapeRef.current = s.tape;

    shared.current.phase = phase;
    shared.current.u = u;
    shared.current.cycle = cycle;
    shared.current.fill = s.fillU;

    root.current.position.set(s.x, s.y, 0);
    root.current.scale.set(s.sx, s.sy, s.sz);
    root.current.visible = !(phase === "gap" && u > 0.15);
    body.current.rotation.y = s.yaw;

    if (flapBack.current) flapBack.current.rotation.x = -s.flapB * 2.05;
    if (flapFront.current) flapFront.current.rotation.x = s.flapF * 2.05;

    if (label.current) {
      label.current.scale.setScalar(Math.max(0.04, Math.min(s.label, 1.22)));
      label.current.visible = s.label > 0.04;
    }
    if (barcode.current) barcode.current.visible = s.label > 0.5;
    if (labelMat.current) {
      labelMat.current.opacity = Math.min(1, s.label);
      labelMat.current.emissiveIntensity = Math.min(1, s.label) * 0.6;
    }
  });

  const flapGeo: [number, number, number] = [BOX_W - 0.01, 0.034, BOX_D / 2 - 0.01];

  return (
    <group ref={root} position={[-1.85, BOX_H / 2 + 0.02, 0]}>
      <group ref={body}>
        <HollowShell />
        <ContentItems shared={shared} />

        {/* Solapa trasera */}
        <group ref={flapBack} position={[0, BOX_H / 2, -BOX_D / 2]}>
          <RoundedBox args={flapGeo} radius={0.01} position={[0, 0.01, BOX_D / 4]} castShadow>
            <Cardboard color="#d2b48c" />
          </RoundedBox>
        </group>
        {/* Solapa frontal */}
        <group ref={flapFront} position={[0, BOX_H / 2, BOX_D / 2]}>
          <RoundedBox args={flapGeo} radius={0.01} position={[0, 0.01, -BOX_D / 4]} castShadow>
            <Cardboard color="#d4b896" />
          </RoundedBox>
        </group>

        <TapeStrips get={() => tapeRef.current} />

        <mesh ref={label} position={[0.1, 0.04, BOX_D / 2 + 0.003]}>
          <planeGeometry args={[0.24, 0.14]} />
          <meshStandardMaterial
            ref={labelMat}
            color="#f8fafc"
            emissive="#3b82f6"
            emissiveIntensity={0}
            transparent
            opacity={0}
            roughness={0.3}
          />
        </mesh>
        <mesh ref={barcode} position={[0.1, -0.015, BOX_D / 2 + 0.004]} visible={false}>
          <planeGeometry args={[0.16, 0.035]} />
          <meshBasicMaterial color="#0f172a" transparent opacity={0.65} />
        </mesh>
      </group>

      <SpeedStreaks intensityRef={streakRef} shared={shared} />
      <PuffBurst kickRef={kickRef} />
    </group>
  );
}

function WarehouseBackdrop({ shared }: { shared: MutableRefObject<AnimShared> }) {
  const lamp = useRef<THREE.PointLight>(null);
  const wallMat = useRef<MeshStandardMaterial>(null);

  useFrame((state) => {
    const cycle = shared.current.cycle;
    const hueShift = (cycle % 3) * 0.045;
    if (lamp.current) {
      lamp.current.intensity = 0.3 + Math.sin(state.clock.elapsedTime * 1.1) * 0.05;
      lamp.current.color.setHSL(0.09 + hueShift, 0.42, 0.66);
    }
    if (wallMat.current) {
      wallMat.current.color.setHSL(0.58 + hueShift * 0.4, 0.22, 0.11 + (cycle % 3) * 0.012);
    }
  });

  return (
    <group>
      <mesh position={[0, 1.5, -2.5]} receiveShadow>
        <planeGeometry args={[14, 4.2]} />
        <meshStandardMaterial ref={wallMat} color="#132233" roughness={0.96} />
      </mesh>
      {[-2.4, -0.7, 1, 2.7].map((x, i) => (
        <mesh key={i} position={[x, 1.15, -2.45]}>
          <planeGeometry args={[0.035, 2.4]} />
          <meshStandardMaterial color="#1c3550" roughness={0.9} />
        </mesh>
      ))}
      {[-3, 3.1].map((x, i) => (
        <group key={i} position={[x, 0.95, -1.85]}>
          {[0, 0.55, 1.1].map((y, j) => (
            <mesh key={j} position={[0, y, 0]}>
              <boxGeometry args={[1.5, 0.04, 0.52]} />
              <meshStandardMaterial color="#243447" roughness={0.85} metalness={0.22} />
            </mesh>
          ))}
          <mesh position={[-0.7, 0.55, 0]}>
            <boxGeometry args={[0.06, 1.45, 0.52]} />
            <meshStandardMaterial color="#1c2b3c" roughness={0.85} metalness={0.25} />
          </mesh>
          <mesh position={[0.7, 0.55, 0]}>
            <boxGeometry args={[0.06, 1.45, 0.52]} />
            <meshStandardMaterial color="#1c2b3c" roughness={0.85} metalness={0.25} />
          </mesh>
          <RoundedBox args={[0.36, 0.28, 0.3]} position={[-0.2, 0.2, 0.05]} radius={0.015}>
            <meshStandardMaterial color={i === 0 ? "#6b4f3a" : "#5a6b7a"} roughness={0.9} />
          </RoundedBox>
          <RoundedBox args={[0.28, 0.22, 0.26]} position={[0.35, 0.72, 0]} radius={0.015}>
            <meshStandardMaterial color="#7a5c42" roughness={0.9} />
          </RoundedBox>
        </group>
      ))}
      <mesh position={[1.2, 0.02, 0.05]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2.4, 0.58]} />
        <meshStandardMaterial color="#16263c" roughness={0.88} metalness={0.08} />
      </mesh>
      <mesh position={[1.2, 0.025, 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.4, 0.028]} />
        <meshStandardMaterial color="#2563eb" emissive="#1d4ed8" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[1.2, 0.025, -0.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.4, 0.028]} />
        <meshStandardMaterial color="#2563eb" emissive="#1d4ed8" emissiveIntensity={0.4} />
      </mesh>
      <pointLight ref={lamp} position={[0, 2.3, 0.5]} intensity={0.32} color="#fde68a" distance={7} />
    </group>
  );
}

function Station() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow>
        <circleGeometry args={[0.66, 48]} />
        <meshStandardMaterial color="#1a3048" roughness={0.88} metalness={0.06} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <ringGeometry args={[0.61, 0.66, 48]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.42} />
      </mesh>
    </group>
  );
}

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[14, 10]} />
      <meshStandardMaterial color="#0a1420" roughness={0.98} />
    </mesh>
  );
}

function CameraSoft({
  compact,
  reduced,
  shipKickRef,
  shared,
}: {
  compact: boolean;
  reduced: boolean;
  shipKickRef: MutableRefObject<number>;
  shared: MutableRefObject<AnimShared>;
}) {
  const { camera } = useThree();
  const look = useMemo(() => new THREE.Vector3(0.08, 0.3, 0), []);
  const lastKick = useRef(0);
  const punch = useRef(0);
  const pos = useRef({ x: compact ? 1.5 : 1.35, y: compact ? 1.35 : 1.25, z: compact ? 2.4 : 2.15 });

  useFrame((state, dt) => {
    const { phase, u, cycle } = shared.current;
    const side = cycle % 2 === 0 ? 1 : -0.2;
    const heightBias = (cycle % 3) * 0.05;

    // Cámara por fase: más alta en fill para ver el interior
    let bx = (compact ? 1.5 : 1.35) * (0.94 + side * 0.07);
    let by = (compact ? 1.35 : 1.22) + heightBias;
    let bz = compact ? 2.4 : 2.15;
    look.set(0.06 + (cycle % 3) * 0.02, 0.28 + heightBias * 0.25, 0);

    if (phase === "fill") {
      by += 0.22;
      bz -= 0.18;
      look.y = 0.12;
      look.z = 0.05;
    } else if (phase === "pack") {
      by += 0.1;
      look.y = 0.22;
    } else if (phase === "seal") {
      bz += 0.12;
      by += 0.05;
    } else if (phase === "ship") {
      bx += u * 0.15;
      look.x += u * 0.35;
    }

    if (shipKickRef.current !== lastKick.current) {
      lastKick.current = shipKickRef.current;
      punch.current = 1;
    }
    punch.current = THREE.MathUtils.damp(punch.current, 0, 5.5, dt);
    bz += punch.current * 0.14;

    if (reduced) {
      camera.position.set(bx, by, bz);
      camera.lookAt(look);
      return;
    }

    const t = state.clock.elapsedTime;
    pos.current.x = THREE.MathUtils.damp(pos.current.x, bx + Math.sin(t * 0.11) * 0.04, 2.2, dt);
    pos.current.y = THREE.MathUtils.damp(pos.current.y, by + Math.sin(t * 0.16) * 0.02, 2.2, dt);
    pos.current.z = THREE.MathUtils.damp(pos.current.z, bz, 2.4, dt);
    camera.position.set(pos.current.x, pos.current.y, pos.current.z);
    camera.lookAt(look);
  });
  return null;
}

function Scene({ compact, reduced }: { compact: boolean; reduced: boolean }) {
  const shipKick = useRef(0);
  const shared = useRef<AnimShared>({
    phase: "arrive",
    u: 0,
    cycle: 0,
    fill: 0,
    spinDir: 1,
  });

  return (
    <>
      <RenderTune />
      <SoftShadows size={14} samples={8} focus={0.8} />
      <color attach="background" args={["#09131f"]} />
      <fog attach="fog" args={["#09131f", 5.2, 12.5]} />

      <ambientLight intensity={0.45} />
      <hemisphereLight args={["#cfe4ff", "#081018", 0.42]} />
      <directionalLight
        position={[2.6, 4.4, 2.4]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0002}
      />
      <pointLight position={[-0.3, 1.7, 1]} intensity={0.42} color="#fff7ed" />

      <Environment preset="warehouse" environmentIntensity={0.24} />

      <Floor />
      <WarehouseBackdrop shared={shared} />
      <Station />
      <PackBox reduced={reduced} shipKickRef={shipKick} shared={shared} />

      <ContactShadows position={[0, 0.004, 0]} opacity={0.52} scale={7} blur={2.5} far={3.5} />
      <CameraSoft compact={compact} reduced={reduced} shipKickRef={shipKick} shared={shared} />
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
          ? "relative h-full min-h-[9rem] w-full bg-[#09131f]"
          : "absolute inset-0 bg-[#09131f]"
      }
    >
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{
          position: compact ? [1.5, 1.35, 2.4] : [1.35, 1.25, 2.15],
          fov: compact ? 38 : 33,
          near: 0.1,
          far: 28,
        }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        <Scene compact={compact} reduced={reduced} />
      </Canvas>
    </div>
  );
}
