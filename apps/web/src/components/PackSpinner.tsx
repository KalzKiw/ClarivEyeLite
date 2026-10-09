import { ContactShadows, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group, Mesh, MeshStandardMaterial } from "three";
import * as THREE from "three";
import { cn } from "@/lib/cn";

/** Loop corto: llega → cierra → etiqueta → whoosh. Spinner de carga ClarivEye Lite. */
const PERIOD = 3.6;

function ease(t: number) {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

function MiniBox({ reduced }: { reduced: boolean }) {
  const root = useRef<Group>(null);
  const lid = useRef<Group>(null);
  const label = useRef<Mesh>(null);
  const labelMat = useRef<MeshStandardMaterial>(null);

  const s = useRef({
    x: -1.1,
    lid: 1,
    label: 0,
    sx: 1,
    sy: 1,
    y: 0.16,
  });

  useFrame((state, dt) => {
    if (!root.current) return;
    const p = reduced ? 0.55 : (state.clock.elapsedTime % PERIOD) / PERIOD;

    let tx = 0;
    let tLid = 0;
    let tLabel = 0;
    let tsx = 1;
    let tsy = 1;
    let ty = 0.16;

    if (p < 0.18) {
      const u = ease(p / 0.18);
      tx = THREE.MathUtils.lerp(-1.1, 0, u);
      tLid = 1;
      if (u < 0.08) {
        s.current.x = -1.1;
        s.current.lid = 1;
        s.current.label = 0;
        s.current.sx = 1;
        s.current.sy = 1;
      }
    } else if (p < 0.38) {
      const u = ease((p - 0.18) / 0.2);
      tx = 0;
      tLid = 1 - u;
    } else if (p < 0.58) {
      const u = ease((p - 0.38) / 0.2);
      tx = 0;
      tLid = 0;
      tLabel = u < 0.65 ? u * (1.15 / 0.65) : THREE.MathUtils.lerp(1.15, 1, (u - 0.65) / 0.35);
    } else if (p < 0.88) {
      const u = (p - 0.58) / 0.3;
      const accel = Math.pow(u, 0.42);
      tx = THREE.MathUtils.lerp(0, 1.45, accel);
      tLid = 0;
      tLabel = 1;
      if (u < 0.2) {
        const t = u / 0.2;
        tsx = THREE.MathUtils.lerp(1, 1.25, t);
        tsy = THREE.MathUtils.lerp(1, 0.78, t);
      } else if (u < 0.4) {
        const t = (u - 0.2) / 0.2;
        tsx = THREE.MathUtils.lerp(1.25, 0.95, t);
        tsy = THREE.MathUtils.lerp(0.78, 1.08, t);
      }
      ty = 0.16 + Math.sin(Math.min(u, 1) * Math.PI) * 0.05;
    } else {
      tx = 1.55;
      tLid = 1;
      tLabel = 0;
    }

    const st = s.current;
    st.x = THREE.MathUtils.damp(st.x, tx, p > 0.58 && p < 0.88 ? 14 : 10, dt);
    st.lid = THREE.MathUtils.damp(st.lid, tLid, 12, dt);
    st.label = THREE.MathUtils.damp(st.label, tLabel, 14, dt);
    st.sx = THREE.MathUtils.damp(st.sx, tsx, 12, dt);
    st.sy = THREE.MathUtils.damp(st.sy, tsy, 12, dt);
    st.y = THREE.MathUtils.damp(st.y, ty, 10, dt);

    root.current.position.set(st.x, st.y, 0);
    root.current.scale.set(st.sx, st.sy, 1);
    root.current.visible = !(p > 0.92);
    if (lid.current) lid.current.rotation.x = -st.lid * 1.9;
    if (label.current) {
      label.current.scale.setScalar(Math.max(0.05, Math.min(st.label, 1.2)));
      label.current.visible = st.label > 0.04;
    }
    if (labelMat.current) {
      labelMat.current.opacity = Math.min(1, st.label);
      labelMat.current.emissiveIntensity = Math.min(1, st.label) * 0.45;
    }
  });

  return (
    <group ref={root} position={[-1.1, 0.16, 0]}>
      <RoundedBox args={[0.42, 0.28, 0.32]} radius={0.02} castShadow receiveShadow>
        <meshStandardMaterial color="#c9966c" roughness={0.8} />
      </RoundedBox>
      <group ref={lid} position={[0, 0.14, -0.16]}>
        <RoundedBox args={[0.42, 0.032, 0.32]} radius={0.012} position={[0, 0.008, 0.16]} castShadow>
          <meshStandardMaterial color="#d2b48c" roughness={0.75} />
        </RoundedBox>
      </group>
      <mesh ref={label} position={[0.08, 0.02, 0.165]}>
        <planeGeometry args={[0.14, 0.09]} />
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
  );
}

function Scene({ reduced }: { reduced: boolean }) {
  return (
    <>
      <color attach="background" args={["#0b1a2e"]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 3.5, 2]} intensity={1.15} castShadow />
      <pointLight position={[0, 1.2, 0.6]} intensity={0.25} color="#fde68a" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[0.55, 40]} />
        <meshStandardMaterial color="#152a42" roughness={0.92} />
      </mesh>
      <MiniBox reduced={reduced} />
      <ContactShadows position={[0, 0.002, 0]} opacity={0.4} scale={3.5} blur={2.2} far={2} />
    </>
  );
}

type PackSpinnerProps = {
  className?: string;
  /** Altura del canvas (default 9rem). */
  size?: "sm" | "md" | "lg";
  label?: string;
};

const SIZE_CLASS = {
  sm: "h-24 w-24",
  md: "h-36 w-36",
  lg: "h-52 w-52",
} as const;

/** Spinner 3D: caja que se embala y sale. Uso en estados de carga. */
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
      <div className={cn("overflow-hidden rounded-xl bg-[#0b1a2e]", SIZE_CLASS[size])}>
        <Canvas
          shadows
          dpr={[1, 1.5]}
          camera={{ position: [1.05, 0.85, 1.55], fov: 36, near: 0.1, far: 12 }}
          gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          <Scene reduced={reduced} />
        </Canvas>
      </div>
      {label ? <p className="text-sm font-medium text-white/70">{label}</p> : null}
    </div>
  );
}

/** Pantalla / bloque de carga a pantalla completa o en panel. */
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
        "flex items-center justify-center bg-[#0b1a2e]",
        fill && "absolute inset-0 h-full w-full",
        className,
      )}
    >
      <PackSpinner size={size} label={label} />
    </div>
  );
}
