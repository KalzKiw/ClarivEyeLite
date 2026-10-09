import { ContactShadows, Environment, RoundedBox, SoftShadows } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import type { Group, Mesh, MeshStandardMaterial } from "three";
import * as THREE from "three";

/** Loop cartoon: llega → fill → pack → seal → whoosh + puff. */
const PERIOD = 6.2;

type Phase = "arrive" | "fill" | "pack" | "seal" | "ship" | "gap";

function ease(t: number) {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function easeBack(t: number) {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  const c1 = 1.7;
  const c3 = c1 + 1;
  return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;
}

function phaseAt(elapsed: number, reduced: boolean): { phase: Phase; u: number } {
  if (reduced) return { phase: "seal", u: 1 };
  const p = (elapsed % PERIOD) / PERIOD;
  if (p < 0.16) return { phase: "arrive", u: ease(p / 0.16) };
  if (p < 0.36) return { phase: "fill", u: (p - 0.16) / 0.2 };
  if (p < 0.48) return { phase: "pack", u: easeBack((p - 0.36) / 0.12) };
  if (p < 0.64) return { phase: "seal", u: ease((p - 0.48) / 0.16) };
  if (p < 0.86) return { phase: "ship", u: (p - 0.64) / 0.22 };
  return { phase: "gap", u: (p - 0.86) / 0.14 };
}

function RenderTune() {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.1;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl]);
  return null;
}

const ITEMS = [
  { color: "#3b82f6", size: [0.14, 0.2, 0.14] as const, x: -0.16, z: 0.05 },
  { color: "#14b8a6", size: [0.18, 0.12, 0.16] as const, x: 0.05, z: -0.08 },
  { color: "#f59e0b", size: [0.2, 0.06, 0.14] as const, x: 0.14, z: 0.1 },
] as const;

const FLOOR_Y = -0.02;

function ContentItems({
  fillRef,
  phaseRef,
}: {
  fillRef: MutableRefObject<number>;
  phaseRef: MutableRefObject<Phase>;
}) {
  const refs = useRef<(Group | null)[]>([null, null, null]);

  useFrame(() => {
    const fillU = fillRef.current;
    const phase = phaseRef.current;
    for (let i = 0; i < ITEMS.length; i++) {
      const g = refs.current[i];
      if (!g) continue;
      const stagger = i * 0.12;
      const local = THREE.MathUtils.clamp((fillU - stagger) / Math.max(0.45, 1 - stagger), 0, 1);
      const drop = ease(local);
      const bounce =
        local > 0.72 ? Math.sin(((local - 0.72) / 0.28) * Math.PI) * 0.05 * (1 - local) : 0;
      const startY = 0.52;
      const endY = FLOOR_Y + ITEMS[i].size[1] / 2;
      g.position.set(ITEMS[i].x, THREE.MathUtils.lerp(startY, endY, drop) + bounce, ITEMS[i].z);
      g.rotation.y = (1 - drop) * 0.7 * (i % 2 === 0 ? 1 : -1);
      const show = phase === "fill" || phase === "pack" || phase === "seal" || phase === "ship";
      g.visible = show && (phase !== "fill" || local > 0.02);
    }
  });

  return (
    <group>
      {ITEMS.map((it, i) => (
        <group
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
        >
          <RoundedBox args={[...it.size]} radius={0.018} castShadow>
            <meshStandardMaterial color={it.color} roughness={0.55} metalness={0.08} />
          </RoundedBox>
        </group>
      ))}
    </group>
  );
}

function TapeProgress({ get }: { get: () => number }) {
  const h = useRef<Mesh>(null);
  const v = useRef<Mesh>(null);
  useFrame(() => {
    const p = get();
    if (h.current) {
      h.current.scale.set(THREE.MathUtils.lerp(0.02, 0.72, p), 1, 1);
      h.current.visible = p > 0.02;
    }
    if (v.current) {
      v.current.scale.set(1, THREE.MathUtils.lerp(0.02, 0.42, p), 1);
      v.current.visible = p > 0.12;
    }
  });
  return (
    <group position={[0, 0.025, 0.275]}>
      <mesh ref={h} position={[0, 0, 0.002]}>
        <planeGeometry args={[1, 0.045]} />
        <meshStandardMaterial color="#e8dcc8" roughness={0.45} />
      </mesh>
      <mesh ref={v} position={[0, 0, 0.003]} rotation={[0, 0, Math.PI / 2]}>
        <planeGeometry args={[0.04, 1]} />
        <meshStandardMaterial color="#e8dcc8" roughness={0.45} />
      </mesh>
    </group>
  );
}

function SpeedStreaks({
  intensityRef,
  phaseRef,
}: {
  intensityRef: MutableRefObject<number>;
  phaseRef: MutableRefObject<Phase>;
}) {
  const refs = useRef<(Mesh | null)[]>([]);
  useFrame(() => {
    const intensity = intensityRef.current;
    const active = phaseRef.current === "ship" && intensity > 0.04;
    for (let i = 0; i < 3; i++) {
      const m = refs.current[i];
      if (!m) continue;
      m.visible = active;
      (m.material as THREE.MeshBasicMaterial).opacity = intensity * (0.4 - i * 0.1);
    }
  });
  return (
    <group position={[-0.55, 0, 0]}>
      {[0.11, 0, -0.11].map((y, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          position={[-0.12 - i * 0.07, y, 0.01]}
        >
          <planeGeometry args={[0.5 - i * 0.07, 0.022]} />
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
  const ages = useRef([0, 0, 0, 0, 0]);

  useFrame((_, dt) => {
    const trigger = kickRef.current;
    if (trigger !== born.current && trigger > 0) {
      born.current = trigger;
      ages.current = [0, 0, 0, 0, 0];
    }
    for (let i = 0; i < 5; i++) {
      const m = refs.current[i];
      if (!m) continue;
      if (born.current < 0) {
        m.visible = false;
        continue;
      }
      ages.current[i] += dt;
      const delay = i * 0.028;
      const age = ages.current[i] - delay;
      if (age < 0 || age > 0.42) {
        m.visible = false;
        continue;
      }
      m.visible = true;
      const t = age / 0.42;
      const ang = (i / 5) * Math.PI * 2 + 0.35;
      const dist = 0.12 + t * 0.5;
      m.position.set(
        Math.cos(ang) * dist * 0.4 - 0.25,
        0.04 + Math.sin(ang) * 0.1 + t * 0.12,
        Math.sin(ang) * dist * 0.22,
      );
      m.scale.setScalar(0.035 + t * 0.16);
      (m.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.5;
    }
  });

  return (
    <group>
      {Array.from({ length: 5 }).map((_, i) => (
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
}: {
  reduced: boolean;
  shipKickRef: MutableRefObject<number>;
}) {
  const root = useRef<Group>(null);
  const lid = useRef<Group>(null);
  const label = useRef<Mesh>(null);
  const labelMat = useRef<MeshStandardMaterial>(null);
  const tapeRef = useRef(0);
  const fillRef = useRef(0);
  const phaseRef = useRef<Phase>("arrive");
  const streakRef = useRef(0);
  const kickRef = useRef(0);

  const state = useRef({
    x: -1.55,
    lidOpen: 1,
    tape: 0,
    label: 0,
    y: 0.22,
    sx: 1,
    sy: 1,
    fillU: 0,
    wasShip: false,
    shipKick: 0,
  });

  useFrame((clk, dt) => {
    if (!root.current) return;
    const { phase, u } = phaseAt(clk.clock.elapsedTime, reduced);
    const s = state.current;
    phaseRef.current = phase;

    let targetX = 0;
    let targetLid = 0;
    let targetTape = 0;
    let targetLabel = 0;
    let targetY = 0.22;
    let targetSx = 1;
    let targetSy = 1;
    let fillU = 0;
    let streak = 0;

    if (phase === "arrive") {
      targetX = THREE.MathUtils.lerp(-1.55, 0, u);
      targetLid = 1;
      if (u < 0.08) {
        s.x = -1.55;
        s.lidOpen = 1;
        s.tape = 0;
        s.label = 0;
        s.sx = 1;
        s.sy = 1;
        s.wasShip = false;
        s.fillU = 0;
      }
    } else if (phase === "fill") {
      targetX = 0;
      targetLid = 1;
      fillU = u;
    } else if (phase === "pack") {
      targetX = 0;
      targetLid = Math.max(0, 1 - u);
      fillU = 1;
    } else if (phase === "seal") {
      targetX = 0;
      targetLid = 0;
      targetTape = Math.min(1, u * 1.3);
      const lp = ease(Math.max(0, (u - 0.28) / 0.72));
      targetLabel =
        lp < 0.65 ? lp * (1.15 / 0.65) : THREE.MathUtils.lerp(1.15, 1, (lp - 0.65) / 0.35);
      fillU = 1;
    } else if (phase === "ship") {
      if (!s.wasShip) {
        s.wasShip = true;
        s.shipKick += 1;
        shipKickRef.current = s.shipKick;
        kickRef.current = s.shipKick;
      }
      const accel = Math.pow(THREE.MathUtils.clamp(u, 0, 1), 0.45);
      targetX = THREE.MathUtils.lerp(0, 2.1, accel);
      targetLid = 0;
      targetTape = 1;
      targetLabel = 1;
      fillU = 1;
      if (u < 0.18) {
        const t = u / 0.18;
        targetSx = THREE.MathUtils.lerp(1, 1.22, t);
        targetSy = THREE.MathUtils.lerp(1, 0.82, t);
      } else if (u < 0.35) {
        const t = (u - 0.18) / 0.17;
        targetSx = THREE.MathUtils.lerp(1.22, 0.95, t);
        targetSy = THREE.MathUtils.lerp(0.82, 1.08, t);
      }
      targetY = 0.22 + Math.sin(Math.min(u, 1) * Math.PI) * 0.05;
      streak = u < 0.55 ? 1 - u / 0.55 : Math.max(0, 1.15 - u * 1.35);
    } else {
      targetX = 2.25;
      targetLid = 1;
      targetTape = 0;
      targetLabel = 0;
      fillU = 0;
      s.wasShip = false;
    }

    const k = phase === "ship" ? 14 : phase === "arrive" ? 9 : 11;
    s.x = THREE.MathUtils.damp(s.x, targetX, k, dt);
    s.lidOpen = THREE.MathUtils.damp(s.lidOpen, targetLid, phase === "pack" ? 14 : 10, dt);
    s.tape = THREE.MathUtils.damp(s.tape, targetTape, 12, dt);
    s.label = THREE.MathUtils.damp(s.label, targetLabel, 14, dt);
    s.y = THREE.MathUtils.damp(s.y, targetY, 10, dt);
    s.sx = THREE.MathUtils.damp(s.sx, targetSx, 12, dt);
    s.sy = THREE.MathUtils.damp(s.sy, targetSy, 12, dt);
    s.fillU = THREE.MathUtils.damp(s.fillU, fillU, 10, dt);
    streakRef.current = THREE.MathUtils.damp(streakRef.current, streak, 10, dt);
    tapeRef.current = s.tape;
    fillRef.current = s.fillU;

    root.current.position.set(s.x, s.y, 0);
    root.current.scale.set(s.sx, s.sy, 1);
    root.current.visible = !(phase === "gap" && u > 0.25);

    if (lid.current) lid.current.rotation.x = -s.lidOpen * 1.85;
    if (label.current) {
      label.current.scale.setScalar(Math.max(0.05, Math.min(s.label, 1.2)));
      label.current.visible = s.label > 0.04;
    }
    if (labelMat.current) {
      labelMat.current.opacity = Math.min(1, s.label);
      labelMat.current.emissiveIntensity = Math.min(1, s.label) * 0.4;
    }
  });

  return (
    <group ref={root} position={[-1.55, 0.22, 0]}>
      <group>
        <RoundedBox args={[0.78, 0.4, 0.55]} radius={0.02} smoothness={4} castShadow receiveShadow>
          <meshStandardMaterial color="#c9966c" roughness={0.78} />
        </RoundedBox>
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[0.7, 0.28, 0.48]} />
          <meshStandardMaterial color="#5c4030" roughness={0.95} />
        </mesh>
        <ContentItems fillRef={fillRef} phaseRef={phaseRef} />
      </group>

      <group ref={lid} position={[0, 0.2, -0.275]}>
        <RoundedBox args={[0.78, 0.04, 0.55]} radius={0.015} position={[0, 0, 0.275]} castShadow>
          <meshStandardMaterial color="#d2b48c" roughness={0.75} />
        </RoundedBox>
        <TapeProgress get={() => tapeRef.current} />
      </group>

      <mesh ref={label} position={[0.18, 0.02, 0.281]}>
        <planeGeometry args={[0.2, 0.12]} />
        <meshStandardMaterial
          ref={labelMat}
          color="#f8fafc"
          emissive="#3b82f6"
          emissiveIntensity={0}
          transparent
          opacity={0}
          roughness={0.35}
        />
      </mesh>

      <SpeedStreaks intensityRef={streakRef} phaseRef={phaseRef} />
      <PuffBurst kickRef={kickRef} />
    </group>
  );
}

function Station() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <circleGeometry args={[0.55, 48]} />
        <meshStandardMaterial color="#1a3048" roughness={0.9} metalness={0.05} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <ringGeometry args={[0.52, 0.55, 48]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.35} />
      </mesh>
      <mesh position={[0.95, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.1, 0.04]} />
        <meshStandardMaterial color="#2563eb" emissive="#1d4ed8" emissiveIntensity={0.25} />
      </mesh>
    </group>
  );
}

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[10, 8]} />
      <meshStandardMaterial color="#0f1c2e" roughness={0.98} />
    </mesh>
  );
}

function CameraSoft({
  compact,
  reduced,
  shipKickRef,
}: {
  compact: boolean;
  reduced: boolean;
  shipKickRef: MutableRefObject<number>;
}) {
  const { camera } = useThree();
  const look = useMemo(() => new THREE.Vector3(0.15, 0.25, 0), []);
  const lastKick = useRef(0);
  const punch = useRef(0);

  useFrame((state, dt) => {
    const bx = compact ? 1.6 : 1.45;
    const by = compact ? 1.15 : 1.05;
    const bz = compact ? 2.2 : 1.95;
    if (shipKickRef.current !== lastKick.current) {
      lastKick.current = shipKickRef.current;
      punch.current = 1;
    }
    punch.current = THREE.MathUtils.damp(punch.current, 0, 5, dt);

    if (reduced) {
      camera.position.set(bx, by, bz);
      camera.lookAt(look);
      return;
    }
    const t = state.clock.elapsedTime;
    camera.position.x = THREE.MathUtils.damp(
      camera.position.x,
      bx + Math.sin(t * 0.15) * 0.04,
      1.5,
      dt,
    );
    camera.position.y = THREE.MathUtils.damp(
      camera.position.y,
      by + Math.sin(t * 0.2) * 0.02,
      1.5,
      dt,
    );
    camera.position.z = THREE.MathUtils.damp(camera.position.z, bz + punch.current * 0.1, 2.2, dt);
    camera.lookAt(look);
  });
  return null;
}

function Scene({ compact, reduced }: { compact: boolean; reduced: boolean }) {
  const shipKick = useRef(0);

  return (
    <>
      <RenderTune />
      <SoftShadows size={12} samples={8} focus={0.85} />
      <color attach="background" args={["#0b1a2e"]} />
      <fog attach="fog" args={["#0b1a2e", 6, 14]} />

      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#dbeafe", "#0f172a", 0.35]} />
      <directionalLight
        position={[2.5, 4, 2]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0002}
      />
      <pointLight position={[0, 1.5, 0.8]} intensity={0.35} color="#fde68a" />

      <Environment preset="warehouse" environmentIntensity={0.18} />

      <Floor />
      <Station />
      <PackBox reduced={reduced} shipKickRef={shipKick} />

      <ContactShadows position={[0, 0.005, 0]} opacity={0.45} scale={6} blur={2.4} far={3} />
      <CameraSoft compact={compact} reduced={reduced} shipKickRef={shipKick} />
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
        dpr={[1, 1.75]}
        camera={{
          position: compact ? [1.6, 1.15, 2.2] : [1.45, 1.05, 1.95],
          fov: compact ? 42 : 36,
          near: 0.1,
          far: 25,
        }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        <Scene compact={compact} reduced={reduced} />
      </Canvas>
    </div>
  );
}
