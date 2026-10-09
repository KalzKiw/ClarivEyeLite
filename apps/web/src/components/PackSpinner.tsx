import { RoundedBox } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, type MutableRefObject } from "react";
import type { Group, Mesh, MeshStandardMaterial } from "three";
import * as THREE from "three";
import { cn } from "@/lib/cn";

/**
 * Spinner transparente, loop fluido (~5 s):
 * llega → cajitas altas → cierra → gira + papel → hold → whoosh.
 */
const PERIOD = 5;

const BOX_W = 0.5;
const BOX_H = 0.34;
const BOX_D = 0.38;
const WALL = 0.024;
const FLOOR_T = 0.03;
const INNER_H = BOX_H - FLOOR_T - 0.012;
const INNER_Y0 = -BOX_H / 2 + FLOOR_T;

const ITEMS = [
  { color: "#c4a574", size: [0.2, INNER_H, 0.16] as const, x: -0.11, z: 0.02 },
  { color: "#b8956a", size: [0.18, INNER_H, 0.17] as const, x: 0.11, z: -0.03 },
] as const;

function clamp01(t: number) {
  return THREE.MathUtils.clamp(t, 0, 1);
}

function ease(t: number) {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

function easeInOut(t: number) {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

function easeOut(t: number) {
  const x = 1 - clamp01(t);
  return 1 - x * x * x;
}

function span(p: number, a: number, b: number) {
  return clamp01((p - a) / Math.max(1e-6, b - a));
}

function OuterCarton() {
  const o = "#c9966c";
  const inn = "#7a4e32";
  const h = BOX_H;
  const w = BOX_W;
  const d = BOX_D;
  const t = WALL;

  return (
    <group>
      <mesh position={[0, -h / 2 + FLOOR_T / 2, 0]}>
        <boxGeometry args={[w, FLOOR_T, d]} />
        <meshStandardMaterial color={o} roughness={0.85} />
      </mesh>
      <mesh position={[0, -h / 2 + FLOOR_T + 0.001, 0]}>
        <boxGeometry args={[w - t * 2, 0.002, d - t * 2]} />
        <meshStandardMaterial color={inn} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0, -d / 2 + t / 2]}>
        <boxGeometry args={[w, h, t]} />
        <meshStandardMaterial color={o} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0, d / 2 - t / 2]}>
        <boxGeometry args={[w, h, t]} />
        <meshStandardMaterial color={o} roughness={0.85} />
      </mesh>
      <mesh position={[-w / 2 + t / 2, 0, 0]}>
        <boxGeometry args={[t, h, d]} />
        <meshStandardMaterial color={o} roughness={0.85} />
      </mesh>
      <mesh position={[w / 2 - t / 2, 0, 0]}>
        <boxGeometry args={[t, h, d]} />
        <meshStandardMaterial color={o} roughness={0.85} />
      </mesh>
    </group>
  );
}

function FillItems({ fillRef }: { fillRef: MutableRefObject<number> }) {
  const refs = useRef<(Group | null)[]>([null, null]);
  const shown = useRef([0, 0]);

  useFrame((_, dt) => {
    const fillU = fillRef.current;
    for (let i = 0; i < ITEMS.length; i++) {
      const g = refs.current[i];
      if (!g) continue;
      const it = ITEMS[i];
      const local = clamp01((fillU - i * 0.22) / 0.62);
      shown.current[i] = THREE.MathUtils.damp(shown.current[i], local, 7, dt);
      const u = shown.current[i];
      const drop = easeOut(u);
      const bounce = u > 0.88 ? Math.sin(((u - 0.88) / 0.12) * Math.PI) * 0.014 * (1 - u) : 0;
      const startY = BOX_H / 2 + 0.4;
      const endY = INNER_Y0 + it.size[1] / 2 + 0.002;
      g.position.set(it.x, THREE.MathUtils.lerp(startY, endY, drop) + bounce, it.z);
      g.rotation.y = (1 - drop) * 0.28 * (i % 2 === 0 ? 1 : -1);
      g.visible = u > 0.015;
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
          visible={false}
        >
          <RoundedBox args={[...it.size]} radius={0.014} castShadow>
            <meshStandardMaterial color={it.color} roughness={0.72} />
          </RoundedBox>
          <mesh position={[0, it.size[1] / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[it.size[0] * 0.55, it.size[2] * 0.35]} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function WrapPaper({ wrapRef }: { wrapRef: MutableRefObject<number> }) {
  const shell = useRef<Group>(null);
  const sheet = useRef<Group>(null);
  const mats = useRef<MeshStandardMaterial[]>([]);
  const sheetMats = useRef<MeshStandardMaterial[]>([]);

  useFrame(() => {
    const w = wrapRef.current;
    const grow = easeInOut(w);

    if (shell.current) {
      shell.current.visible = grow > 0.04;
      const s = THREE.MathUtils.lerp(1.16, 1.032, grow);
      shell.current.scale.set(s, s, s);
      const shellOp = clamp01((grow - 0.12) / 0.55);
      for (const m of mats.current) {
        if (m) m.opacity = ease(shellOp);
      }
    }

    if (sheet.current) {
      const sheetIn = ease(clamp01(w / 0.4));
      const sheetOut = 1 - ease(clamp01((w - 0.28) / 0.4));
      const sheetOp = sheetIn * sheetOut;
      sheet.current.visible = sheetOp > 0.02;
      sheet.current.rotation.y = THREE.MathUtils.lerp(-1.05, -0.12, sheetIn);
      sheet.current.position.x = THREE.MathUtils.lerp(0.52, BOX_W / 2 + 0.015, sheetIn);
      for (const m of sheetMats.current) {
        if (m) m.opacity = sheetOp * 0.95;
      }
    }
  });

  const paper = "#e8c4a8";
  const stripe = "#c45c4a";

  return (
    <group>
      <group ref={sheet} position={[0.52, 0, 0]} visible={false}>
        <mesh>
          <planeGeometry args={[0.42, BOX_H * 1.15]} />
          <meshStandardMaterial
            ref={(el) => {
              if (el) sheetMats.current[0] = el;
            }}
            color={paper}
            roughness={0.65}
            transparent
            opacity={0}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0.02, 0.04, 0.001]}>
          <planeGeometry args={[0.08, BOX_H * 1.15]} />
          <meshStandardMaterial
            ref={(el) => {
              if (el) sheetMats.current[1] = el;
            }}
            color={stripe}
            roughness={0.55}
            transparent
            opacity={0}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      <group ref={shell} visible={false}>
        <RoundedBox args={[BOX_W + 0.02, BOX_H + 0.02, BOX_D + 0.02]} radius={0.02}>
          <meshStandardMaterial
            ref={(el) => {
              if (el) mats.current[0] = el;
            }}
            color={paper}
            roughness={0.7}
            transparent
            opacity={0}
          />
        </RoundedBox>
        <mesh position={[0, 0.02, BOX_D / 2 + 0.014]}>
          <planeGeometry args={[BOX_W + 0.01, 0.06]} />
          <meshStandardMaterial
            ref={(el) => {
              if (el) mats.current[1] = el;
            }}
            color={stripe}
            roughness={0.5}
            transparent
            opacity={0}
          />
        </mesh>
        <mesh position={[0, BOX_H / 2 + 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.07, BOX_D + 0.01]} />
          <meshStandardMaterial
            ref={(el) => {
              if (el) mats.current[2] = el;
            }}
            color={stripe}
            roughness={0.5}
            transparent
            opacity={0}
          />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Targets continuos por solape:
 * arrive 0–0.16 · fill 0.08–0.40 · pack 0.34–0.48 ·
 * spin+wrap 0.46–0.74 · hold 0.74–0.78 · ship 0.76–0.94 · gap 0.94–1
 */
function targetsAt(p: number) {
  const arrive = ease(span(p, 0, 0.16));
  const fill = ease(span(p, 0.08, 0.4));
  const pack = easeInOut(span(p, 0.34, 0.48));
  const spin = easeInOut(span(p, 0.46, 0.74));
  const ship = span(p, 0.76, 0.94);
  const gap = span(p, 0.94, 1);

  const tx =
    p < 0.16
      ? THREE.MathUtils.lerp(-1.15, 0, arrive)
      : p < 0.76
        ? 0
        : THREE.MathUtils.lerp(0, 1.55, Math.pow(ship, 0.48));

  const tLid = p < 0.34 ? 1 : Math.max(0, 1 - pack);
  const tFill = p >= 0.94 ? 0 : fill;
  const tYaw = Math.PI * 2 * spin;
  const tWrap = spin;
  const labelU = ease(clamp01((spin - 0.62) / 0.38));
  const tLabel =
    p >= 0.94
      ? 0
      : labelU < 0.55
        ? labelU * (1.12 / 0.55)
        : THREE.MathUtils.lerp(1.12, 1, (labelU - 0.55) / 0.45);

  let tsx = 1;
  let tsy = 1;
  let ty = BOX_H / 2;
  if (ship > 0 && ship < 1) {
    if (ship < 0.18) {
      const t = ease(ship / 0.18);
      tsx = THREE.MathUtils.lerp(1, 1.18, t);
      tsy = THREE.MathUtils.lerp(1, 0.82, t);
    } else if (ship < 0.36) {
      const t = ease((ship - 0.18) / 0.18);
      tsx = THREE.MathUtils.lerp(1.18, 0.97, t);
      tsy = THREE.MathUtils.lerp(0.82, 1.06, t);
    }
    ty = BOX_H / 2 + Math.sin(easeOut(ship) * Math.PI) * 0.045;
  }

  if (gap > 0) {
    return {
      tx: 1.65,
      tLid: 1,
      tFill: 0,
      tYaw: Math.PI * 2,
      tWrap: 0,
      tLabel: 0,
      tsx: 1,
      tsy: 1,
      ty: BOX_H / 2,
      visible: gap < 0.55,
    };
  }

  return {
    tx,
    tLid,
    tFill,
    tYaw,
    tWrap,
    tLabel,
    tsx,
    tsy,
    ty,
    visible: true,
  };
}

function PackLoop({ reduced }: { reduced: boolean }) {
  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const lid = useRef<Group>(null);
  const label = useRef<Mesh>(null);
  const labelMat = useRef<MeshStandardMaterial>(null);
  const fillRef = useRef(0);
  const wrapRef = useRef(0);
  const lastP = useRef(0);

  const s = useRef({
    x: -1.15,
    lid: 1,
    label: 0,
    wrap: 0,
    yaw: 0,
    sx: 1,
    sy: 1,
    y: BOX_H / 2,
    fill: 0,
  });

  useFrame((state, dt) => {
    if (!root.current || !body.current) return;
    const p = reduced ? 0.55 : (state.clock.elapsedTime % PERIOD) / PERIOD;

    if (p < lastP.current - 0.5) {
      Object.assign(s.current, {
        x: -1.15,
        lid: 1,
        label: 0,
        wrap: 0,
        yaw: 0,
        sx: 1,
        sy: 1,
        y: BOX_H / 2,
        fill: 0,
      });
    }
    lastP.current = p;

    const t = targetsAt(p);
    const st = s.current;
    const shipping = p >= 0.76 && p < 0.94;

    st.x = THREE.MathUtils.damp(st.x, t.tx, shipping ? 12 : 8, dt);
    st.lid = THREE.MathUtils.damp(st.lid, t.tLid, 9, dt);
    st.label = THREE.MathUtils.damp(st.label, t.tLabel, 10, dt);
    st.wrap = THREE.MathUtils.damp(st.wrap, t.tWrap, 8, dt);
    st.sx = THREE.MathUtils.damp(st.sx, t.tsx, 10, dt);
    st.sy = THREE.MathUtils.damp(st.sy, t.tsy, 10, dt);
    st.y = THREE.MathUtils.damp(st.y, t.ty, 9, dt);
    st.fill = THREE.MathUtils.damp(st.fill, t.tFill, 6, dt);
    const yawK = p >= 0.46 && p < 0.76 ? 11 : 7;
    st.yaw = THREE.MathUtils.damp(st.yaw, t.tYaw, yawK, dt);

    fillRef.current = st.fill;
    wrapRef.current = st.wrap;

    root.current.position.set(st.x, st.y, 0);
    root.current.scale.set(st.sx, st.sy, 1);
    root.current.visible = t.visible;
    body.current.rotation.y = st.yaw;
    if (lid.current) lid.current.rotation.x = -st.lid * 1.95;
    if (label.current) {
      label.current.scale.setScalar(Math.max(0.05, Math.min(st.label, 1.15)));
      label.current.visible = st.label > 0.04;
    }
    if (labelMat.current) {
      labelMat.current.opacity = Math.min(1, st.label);
      labelMat.current.emissiveIntensity = Math.min(1, st.label) * 0.45;
    }
  });

  return (
    <group ref={root} position={[-1.15, BOX_H / 2, 0]}>
      <group ref={body}>
        <OuterCarton />
        <FillItems fillRef={fillRef} />
        <group ref={lid} position={[0, BOX_H / 2, -BOX_D / 2]}>
          <RoundedBox
            args={[BOX_W, 0.03, BOX_D]}
            radius={0.01}
            position={[0, 0.008, BOX_D / 2]}
            castShadow
          >
            <meshStandardMaterial color="#d2b48c" roughness={0.78} />
          </RoundedBox>
        </group>
        <WrapPaper wrapRef={wrapRef} />
        <mesh ref={label} position={[0.08, 0.02, BOX_D / 2 + 0.022]}>
          <planeGeometry args={[0.15, 0.09]} />
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
      </group>
    </group>
  );
}

function Scene({ reduced }: { reduced: boolean }) {
  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[2, 3.5, 2]} intensity={1.2} castShadow />
      <directionalLight position={[-1.2, 2.5, 0.5]} intensity={0.4} />
      <PackLoop reduced={reduced} />
    </>
  );
}

type PackSpinnerProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  label?: string;
};

const SIZE_CLASS = {
  sm: "h-24 w-24",
  md: "h-36 w-36",
  lg: "h-52 w-52",
} as const;

export function PackSpinner({ className, size = "md", label }: PackSpinnerProps) {
  const reduced = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-3", className)}
      role="status"
      aria-live="polite"
      aria-label={label ?? "Cargando"}
    >
      <div className={cn("overflow-visible bg-transparent", SIZE_CLASS[size])}>
        <Canvas
          shadows
          dpr={[1, 1.5]}
          camera={{ position: [0.85, 1.25, 1.45], fov: 34, near: 0.1, far: 12 }}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          style={{ width: "100%", height: "100%", display: "block", background: "transparent" }}
          onCreated={({ gl, camera }) => {
            gl.setClearColor(0x000000, 0);
            camera.lookAt(0, 0.12, 0);
          }}
        >
          <Scene reduced={reduced} />
        </Canvas>
      </div>
      {label ? <p className="text-sm font-medium text-white/70">{label}</p> : null}
    </div>
  );
}

export function LoadingMark({
  className,
  label = "Cargando…",
  size = "md",
  fill = false,
}: {
  className?: string;
  label?: string;
  size?: "sm" | "md" | "lg";
  fill?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center",
        fill && "absolute inset-0 h-full w-full",
        className,
      )}
    >
      <PackSpinner size={size} label={label} />
    </div>
  );
}
