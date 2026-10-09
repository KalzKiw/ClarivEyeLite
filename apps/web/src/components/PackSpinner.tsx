import { RoundedBox } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, type MutableRefObject } from "react";
import type { Group, Mesh, MeshStandardMaterial } from "three";
import * as THREE from "three";
import { cn } from "@/lib/cn";

/**
 * Spinner transparente:
 * llega abierta → cajitas altas caen (se ven desde arriba) → cierra →
 * gira mientras el papel la envuelve → whoosh.
 */
const PERIOD = 4.6;

const BOX_W = 0.5;
const BOX_H = 0.34;
const BOX_D = 0.38;
const WALL = 0.024;
const FLOOR_T = 0.03;
const INNER_H = BOX_H - FLOOR_T - 0.012;
const INNER_Y0 = -BOX_H / 2 + FLOOR_T;

/** Cajitas a la altura del contenedor — desde arriba se lee que llenan. */
const ITEMS = [
  { color: "#c4a574", size: [0.2, INNER_H, 0.16] as const, x: -0.11, z: 0.02 },
  { color: "#b8956a", size: [0.18, INNER_H, 0.17] as const, x: 0.11, z: -0.03 },
] as const;

function ease(t: number) {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

function easeOut(t: number) {
  const x = 1 - THREE.MathUtils.clamp(t, 0, 1);
  return 1 - x * x;
}

/** Caja con 4 paredes altas: sin labio abierto; interior solo se ve desde arriba. */
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
      {/* 4 paredes completas */}
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

  useFrame(() => {
    const fillU = fillRef.current;
    for (let i = 0; i < ITEMS.length; i++) {
      const g = refs.current[i];
      if (!g) continue;
      const it = ITEMS[i];
      const local = THREE.MathUtils.clamp((fillU - i * 0.28) / 0.55, 0, 1);
      const drop = easeOut(local);
      const bounce =
        local > 0.85 ? Math.sin(((local - 0.85) / 0.15) * Math.PI) * 0.02 * (1 - local) : 0;
      const startY = BOX_H / 2 + 0.42;
      const endY = INNER_Y0 + it.size[1] / 2 + 0.002;
      g.position.set(it.x, THREE.MathUtils.lerp(startY, endY, drop) + bounce, it.z);
      g.rotation.y = (1 - drop) * 0.35 * (i % 2 === 0 ? 1 : -1);
      g.visible = local > 0.02;
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
          {/* Etiqueta arriba para leer el relleno desde la cámara alta */}
          <mesh position={[0, it.size[1] / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[it.size[0] * 0.55, it.size[2] * 0.35]} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Papel de regalo: aparece y se ciñe a la caja mientras gira. */
function WrapPaper({ wrapRef }: { wrapRef: MutableRefObject<number> }) {
  const shell = useRef<Group>(null);
  const sheet = useRef<Group>(null);
  const mats = useRef<MeshStandardMaterial[]>([]);

  useFrame(() => {
    const w = wrapRef.current;
    if (shell.current) {
      shell.current.visible = w > 0.02;
      const grow = ease(Math.min(1, w * 1.15));
      // De suelto a ceñido
      const s = THREE.MathUtils.lerp(1.18, 1.035, grow);
      shell.current.scale.set(s, s, s);
      const op = Math.min(1, grow * 1.2);
      for (const m of mats.current) {
        if (m) m.opacity = op;
      }
    }
    if (sheet.current) {
      // Hoja que entra desde el lado al empezar a envolver
      const u = THREE.MathUtils.clamp(w / 0.35, 0, 1);
      sheet.current.visible = w > 0.01 && w < 0.55;
      sheet.current.rotation.y = THREE.MathUtils.lerp(-1.1, -0.15, ease(u));
      sheet.current.position.x = THREE.MathUtils.lerp(0.55, BOX_W / 2 + 0.02, ease(u));
      const sm = sheet.current.children[0] as Mesh | undefined;
      if (sm && sm.material) {
        (sm.material as MeshStandardMaterial).opacity = (1 - Math.max(0, (w - 0.35) / 0.2)) * 0.95;
      }
    }
  });

  const paper = "#e8c4a8";
  const stripe = "#c45c4a";

  return (
    <group>
      {/* Hoja suelta al inicio del wrap */}
      <group ref={sheet} position={[0.55, 0, 0]} visible={false}>
        <mesh>
          <planeGeometry args={[0.42, BOX_H * 1.15]} />
          <meshStandardMaterial
            color={paper}
            roughness={0.65}
            transparent
            opacity={0.95}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0.02, 0.04, 0.001]}>
          <planeGeometry args={[0.08, BOX_H * 1.15]} />
          <meshStandardMaterial
            color={stripe}
            roughness={0.55}
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* Cáscara de papel ceñida */}
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
        {/* Franja decorativa */}
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

function PackLoop({ reduced }: { reduced: boolean }) {
  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const lid = useRef<Group>(null);
  const label = useRef<Mesh>(null);
  const labelMat = useRef<MeshStandardMaterial>(null);
  const fillRef = useRef(0);
  const wrapRef = useRef(0);

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

    let tx = 0;
    let tLid = 0;
    let tLabel = 0;
    let tWrap = 0;
    let tYaw = 0;
    let tsx = 1;
    let tsy = 1;
    let ty = BOX_H / 2;
    let tFill = 0;
    let lockYaw = false;

    if (p < 0.12) {
      const u = ease(p / 0.12);
      tx = THREE.MathUtils.lerp(-1.15, 0, u);
      tLid = 1;
      if (u < 0.06) {
        Object.assign(s.current, {
          x: -1.15,
          lid: 1,
          label: 0,
          wrap: 0,
          yaw: 0,
          sx: 1,
          sy: 1,
          fill: 0,
        });
      }
    } else if (p < 0.36) {
      tx = 0;
      tLid = 1;
      tFill = (p - 0.12) / 0.24;
    } else if (p < 0.46) {
      const u = ease((p - 0.36) / 0.1);
      tx = 0;
      tLid = 1 - u;
      tFill = 1;
    } else if (p < 0.72) {
      // Giro + papel envolviendo
      const u = ease((p - 0.46) / 0.26);
      tx = 0;
      tLid = 0;
      tFill = 1;
      lockYaw = true;
      tYaw = Math.PI * 2 * u;
      s.current.yaw = tYaw;
      tWrap = Math.min(1, u * 1.25);
      const lp = Math.max(0, (u - 0.65) / 0.35);
      tLabel =
        lp < 0.55 ? lp * (1.15 / 0.55) : THREE.MathUtils.lerp(1.15, 1, (lp - 0.55) / 0.45);
    } else if (p < 0.92) {
      const u = (p - 0.72) / 0.2;
      const accel = Math.pow(u, 0.4);
      tx = THREE.MathUtils.lerp(0, 1.55, accel);
      tLid = 0;
      tFill = 1;
      tWrap = 1;
      tLabel = 1;
      lockYaw = true;
      tYaw = Math.PI * 2;
      s.current.yaw = tYaw;
      if (u < 0.22) {
        const t = u / 0.22;
        tsx = THREE.MathUtils.lerp(1, 1.28, t);
        tsy = THREE.MathUtils.lerp(1, 0.75, t);
      } else if (u < 0.4) {
        const t = (u - 0.22) / 0.18;
        tsx = THREE.MathUtils.lerp(1.28, 0.95, t);
        tsy = THREE.MathUtils.lerp(0.75, 1.1, t);
      }
      ty = BOX_H / 2 + Math.sin(Math.min(u, 1) * Math.PI) * 0.06;
    } else {
      tx = 1.7;
      tLid = 1;
      tFill = 0;
      tWrap = 0;
      tLabel = 0;
      lockYaw = true;
      tYaw = Math.PI * 2;
      s.current.yaw = tYaw;
    }

    const st = s.current;
    const kShip = p >= 0.72 && p < 0.92;
    st.x = THREE.MathUtils.damp(st.x, tx, kShip ? 15 : 10, dt);
    st.lid = THREE.MathUtils.damp(st.lid, tLid, 13, dt);
    st.label = THREE.MathUtils.damp(st.label, tLabel, 14, dt);
    st.wrap = THREE.MathUtils.damp(st.wrap, tWrap, 10, dt);
    st.sx = THREE.MathUtils.damp(st.sx, tsx, 13, dt);
    st.sy = THREE.MathUtils.damp(st.sy, tsy, 13, dt);
    st.y = THREE.MathUtils.damp(st.y, ty, 11, dt);
    st.fill = THREE.MathUtils.damp(st.fill, tFill, 9, dt);
    if (!lockYaw) st.yaw = THREE.MathUtils.damp(st.yaw, tYaw, 8, dt);
    fillRef.current = st.fill;
    wrapRef.current = st.wrap;

    root.current.position.set(st.x, st.y, 0);
    root.current.scale.set(st.sx, st.sy, 1);
    root.current.visible = p < 0.94;
    body.current.rotation.y = st.yaw;
    if (lid.current) lid.current.rotation.x = -st.lid * 1.95;
    if (label.current) {
      label.current.scale.setScalar(Math.max(0.05, Math.min(st.label, 1.2)));
      label.current.visible = st.label > 0.04;
    }
    if (labelMat.current) {
      labelMat.current.opacity = Math.min(1, st.label);
      labelMat.current.emissiveIntensity = Math.min(1, st.label) * 0.5;
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

/** Spinner 3D transparente: solo la caja en loop. */
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
          // Cámara más alta: se ve el interior desde arriba al llenar
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
