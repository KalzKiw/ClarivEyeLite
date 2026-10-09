import { useEffect, useRef, useState } from "react";
import { createBarcodeReader, SCAN_ROI } from "@/lib/barcode-reader";
import {
  playScanBeep,
  unlockScanAudio,
  vibrateScanSuccess,
} from "@/lib/scan-feedback";
import { getScanMode, setScanMode, type ScanMode } from "@/lib/scan-mode";
import { Button, Field, TextInput } from "@/components/ui";

/** Tiempo que el código debe permanecer en la mira antes de auto-capturar (modo automático). */
const STABLE_MS = 240;
/** Tras capturar en automático: pausa antes de aceptar otro candidato. */
const COOLDOWN_AUTO_MS = 750;
/** Cooldown corto en modo pistola (flujo continuo). */
const COOLDOWN_GUN_MS = 420;
/** Máximo gap entre teclas para considerar entrada de pistola HID (keyboard wedge). */
const WEDGE_GAP_MS = 55;
const WEDGE_MIN_LEN = 3;

type TorchCapableTrack = MediaStreamTrack & {
  getCapabilities?: () => { torch?: boolean };
  applyConstraints?: (c: MediaTrackConstraints) => Promise<void>;
};

function cameraErrorMessage(err: unknown): string {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return "La cámara requiere HTTPS (o localhost). Abre la app desde un enlace seguro.";
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return "Este navegador no permite acceso a la cámara.";
  }
  const name =
    err && typeof err === "object" && "name" in err
      ? String((err as { name: string }).name)
      : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Permiso de cámara denegado. Actívalo en ajustes del navegador.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No se encontró ninguna cámara.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "La cámara está en uso por otra app.";
  }
  if (name === "OverconstrainedError") {
    return "No se pudo usar la cámara trasera.";
  }
  if (name === "SecurityError") {
    return "El navegador bloqueó la cámara. Usa HTTPS.";
  }
  return "No se pudo abrir la cámara.";
}

async function openCamera(): Promise<MediaStream> {
  const attempts: MediaStreamConstraints[] = [
    {
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    },
    {
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    },
    {
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    },
    { video: true, audio: false },
  ];

  let lastErr: unknown;
  for (const constraints of attempts) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const track = stream.getVideoTracks()[0] as TorchCapableTrack | undefined;
      if (track?.applyConstraints) {
        try {
          await track.applyConstraints({
            advanced: [{ focusMode: "continuous" }],
          } as unknown as MediaTrackConstraints);
        } catch {
          /* ignore */
        }
      }
      return stream;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error("camera");
}

function trackSupportsTorch(track: MediaStreamTrack | undefined): boolean {
  if (!track) return false;
  try {
    const caps = (track as TorchCapableTrack).getCapabilities?.();
    return Boolean(caps && "torch" in caps && caps.torch);
  } catch {
    return false;
  }
}

export function BarcodeScanner({
  onScan,
  onClose,
}: {
  onScan: (raw: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const candidateRef = useRef<string | null>(null);
  const stableSinceRef = useRef(0);
  const cooldownUntilRef = useRef(0);
  /** Tras un capture (automático), bloquear re-auto del mismo valor hasta que salga de la mira o cambie. */
  const blockSameUntilLeaveRef = useRef<string | null>(null);
  const autoFiredForRef = useRef<string | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const commitCaptureRef = useRef<(raw: string) => void>(() => {});
  const modeRef = useRef<ScanMode>("automatico");

  const [mode, setModeState] = useState<ScanMode>(() => getScanMode());
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [manual, setManual] = useState("");
  const [candidate, setCandidate] = useState<string | null>(null);
  const [stable, setStable] = useState(false);
  const [flash, setFlash] = useState(false);
  const [lastCaptured, setLastCaptured] = useState("");
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);

  modeRef.current = mode;

  function changeMode(next: ScanMode) {
    setModeState(next);
    setScanMode(next);
    candidateRef.current = null;
    stableSinceRef.current = 0;
    autoFiredForRef.current = null;
    blockSameUntilLeaveRef.current = null;
    setCandidate(null);
    setStable(false);
  }

  useEffect(() => {
    unlockScanAudio();
  }, []);

  // Keyboard-wedge (pistola HID): ráfaga de teclas + Enter
  useEffect(() => {
    if (mode !== "pistola") return;

    let buffer = "";
    let lastKeyAt = 0;

    function onKeyDown(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || el?.isContentEditable) return;

      const now = Date.now();

      if (e.key === "Enter") {
        const value = buffer.trim();
        buffer = "";
        if (value.length >= WEDGE_MIN_LEN) {
          e.preventDefault();
          e.stopPropagation();
          commitCaptureRef.current(value);
        }
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (now - lastKeyAt > WEDGE_GAP_MS) buffer = "";
        lastKeyAt = now;
        buffer += e.key;
        // Evitar que letras sueltas disparen atajos del navegador
        if (buffer.length >= 2) e.preventDefault();
      } else if (e.key !== "Shift") {
        buffer = "";
      }
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [mode]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const reader = createBarcodeReader();
    let stream: MediaStream | null = null;
    let cancelled = false;
    let stableTimer = 0;

    setError(null);
    setCandidate(null);
    setStable(false);
    setTorchOn(false);
    setTorchAvailable(false);
    candidateRef.current = null;
    stableSinceRef.current = 0;
    autoFiredForRef.current = null;
    trackRef.current = null;

    (async () => {
      try {
        if (!window.isSecureContext) {
          throw Object.assign(new Error("insecure"), { name: "SecurityError" });
        }
        if (!navigator.mediaDevices?.getUserMedia) {
          throw Object.assign(new Error("unsupported"), { name: "NotFoundError" });
        }
        stream = await openCamera();
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const track = stream.getVideoTracks()[0] ?? null;
        trackRef.current = track;
        setTorchAvailable(trackSupportsTorch(track ?? undefined));

        video.srcObject = stream;
        await video.play();
        await reader.start(video, (code) => {
          if (cancelled) return;
          const now = Date.now();
          const scanMode = modeRef.current;

          if (now < cooldownUntilRef.current) {
            if (candidateRef.current) {
              candidateRef.current = null;
              stableSinceRef.current = 0;
              autoFiredForRef.current = null;
              setCandidate(null);
              setStable(false);
            }
            return;
          }

          const raw = code?.raw?.trim() || null;
          if (!raw) {
            if (blockSameUntilLeaveRef.current) {
              blockSameUntilLeaveRef.current = null;
            }
            if (candidateRef.current) {
              candidateRef.current = null;
              stableSinceRef.current = 0;
              autoFiredForRef.current = null;
              setCandidate(null);
              setStable(false);
            }
            return;
          }

          // —— Modo pistola: commit inmediato al decodificar ——
          if (scanMode === "pistola") {
            setCandidate(raw);
            setStable(true);
            if (autoFiredForRef.current === raw) return;
            autoFiredForRef.current = raw;
            commitCaptureRef.current(raw);
            return;
          }

          // —— Modo automático: estabilizar en mira + anti-barrido ——
          if (
            blockSameUntilLeaveRef.current &&
            raw === blockSameUntilLeaveRef.current
          ) {
            if (candidateRef.current) {
              candidateRef.current = null;
              stableSinceRef.current = 0;
              autoFiredForRef.current = null;
              setCandidate(null);
              setStable(false);
            }
            return;
          }
          if (
            blockSameUntilLeaveRef.current &&
            raw !== blockSameUntilLeaveRef.current
          ) {
            blockSameUntilLeaveRef.current = null;
          }

          if (raw !== candidateRef.current) {
            candidateRef.current = raw;
            stableSinceRef.current = now;
            autoFiredForRef.current = null;
            setCandidate(raw);
            setStable(false);
            if (stableTimer) clearTimeout(stableTimer);
            stableTimer = window.setTimeout(() => {
              if (
                candidateRef.current === raw &&
                Date.now() >= stableSinceRef.current + STABLE_MS
              ) {
                setStable(true);
                if (autoFiredForRef.current !== raw) {
                  autoFiredForRef.current = raw;
                  commitCaptureRef.current(raw);
                }
              }
            }, STABLE_MS) as unknown as number;
            return;
          }

          if (now - stableSinceRef.current >= STABLE_MS) {
            setStable(true);
            if (autoFiredForRef.current !== raw) {
              autoFiredForRef.current = raw;
              commitCaptureRef.current(raw);
            }
          }
        });
      } catch (err) {
        if (!cancelled) setError(cameraErrorMessage(err));
      }
    })();

    return () => {
      cancelled = true;
      if (stableTimer) clearTimeout(stableTimer);
      reader.stop();
      stream?.getTracks().forEach((t) => t.stop());
      trackRef.current = null;
      if (video) video.srcObject = null;
    };
  }, [retryKey]);

  function commitCapture(raw: string) {
    const value = raw.trim();
    if (!value) return;

    unlockScanAudio();
    playScanBeep();
    vibrateScanSuccess();
    setFlash(true);
    window.setTimeout(() => setFlash(false), 420);

    setLastCaptured(value);
    candidateRef.current = null;
    stableSinceRef.current = 0;
    setCandidate(null);
    setStable(false);

    const gun = modeRef.current === "pistola";
    cooldownUntilRef.current = Date.now() + (gun ? COOLDOWN_GUN_MS : COOLDOWN_AUTO_MS);

    if (gun) {
      // Tras cooldown, permitir re-escanear el mismo código (otra unidad)
      autoFiredForRef.current = null;
      blockSameUntilLeaveRef.current = null;
    } else {
      autoFiredForRef.current = null;
      blockSameUntilLeaveRef.current = value;
    }

    onScanRef.current(value);
  }
  commitCaptureRef.current = commitCapture;

  function onConfirmCandidate() {
    if (!candidate || !stable) return;
    commitCapture(candidate);
  }

  async function toggleTorch() {
    const track = trackRef.current as TorchCapableTrack | null;
    if (!track?.applyConstraints || !torchAvailable) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: next }],
      } as unknown as MediaTrackConstraints);
      setTorchOn(next);
    } catch {
      try {
        await track.applyConstraints({
          torch: next,
        } as unknown as MediaTrackConstraints);
        setTorchOn(next);
      } catch {
        setTorchAvailable(false);
      }
    }
  }

  const roiLeft = `${SCAN_ROI.x0 * 100}%`;
  const roiTop = `${SCAN_ROI.y0 * 100}%`;
  const roiWidth = `${(SCAN_ROI.x1 - SCAN_ROI.x0) * 100}%`;
  const roiHeight = `${(SCAN_ROI.y1 - SCAN_ROI.y0) * 100}%`;
  const isGun = mode === "pistola";

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90"
      onPointerDown={() => unlockScanAudio()}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3 text-white">
        <p className="text-sm font-medium">Escanear barcode / QR</p>
        <div className="flex items-center gap-2">
          {torchAvailable ? (
            <Button
              type="button"
              variant="ghost"
              className={[
                "border-white/30 text-white",
                torchOn ? "bg-amber-400/25 text-amber-100" : "",
              ].join(" ")}
              onClick={() => void toggleTorch()}
              aria-pressed={torchOn}
            >
              {torchOn ? "Luz on" : "Linterna"}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            className="border-white/30 text-white"
            onClick={onClose}
          >
            Cerrar
          </Button>
        </div>
      </div>

      {/* Selector de modo */}
      <div className="mx-auto flex w-full max-w-lg px-4 pb-2">
        <div
          className="flex w-full rounded-lg border border-white/20 bg-zinc-900/80 p-0.5"
          role="group"
          aria-label="Modo de escaneo"
        >
          <button
            type="button"
            className={[
              "flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition",
              isGun ? "bg-white text-zinc-900" : "text-white/70",
            ].join(" ")}
            aria-pressed={isGun}
            onClick={() => changeMode("pistola")}
          >
            Pistola
          </button>
          <button
            type="button"
            className={[
              "flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition",
              !isGun ? "bg-white text-zinc-900" : "text-white/70",
            ].join(" ")}
            aria-pressed={!isGun}
            onClick={() => changeMode("automatico")}
          >
            Automático
          </button>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-lg flex-1 px-4 pb-8">
        {error ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 rounded-xl bg-zinc-900 px-6 text-center">
            <p className="text-sm leading-relaxed text-white/90">{error}</p>
            {isGun ? (
              <p className="text-xs text-white/55">
                Sin cámara puedes usar una pistola HID: apunta y pulsa el gatillo (Enter).
              </p>
            ) : null}
            <div className="w-full max-w-sm space-y-2 text-left">
              <Field label="Código a mano">
                <TextInput
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  placeholder="CEL1… o EAN"
                  className="bg-zinc-800 text-white"
                />
              </Field>
              <Button
                type="button"
                className="w-full"
                disabled={!manual.trim()}
                onClick={() => {
                  commitCapture(manual.trim());
                  onClose();
                }}
              >
                Usar código
              </Button>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button type="button" onClick={() => setRetryKey((k) => k + 1)}>
                Reintentar cámara
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="border-white/30 text-white"
                onClick={onClose}
              >
                Cerrar
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="relative overflow-hidden rounded-xl">
              <video
                ref={videoRef}
                className="aspect-[3/4] h-auto max-h-[55vh] w-full bg-black object-contain"
                playsInline
                muted
              />
              {/* Oscurece fuera de la mira */}
              <div className="pointer-events-none absolute inset-0">
                <div
                  className="absolute bg-black/45"
                  style={{ left: 0, top: 0, right: 0, height: roiTop }}
                />
                <div
                  className="absolute bg-black/45"
                  style={{ left: 0, bottom: 0, right: 0, height: `${(1 - SCAN_ROI.y1) * 100}%` }}
                />
                <div
                  className="absolute bg-black/45"
                  style={{
                    left: 0,
                    top: roiTop,
                    width: roiLeft,
                    height: roiHeight,
                  }}
                />
                <div
                  className="absolute bg-black/45"
                  style={{
                    right: 0,
                    top: roiTop,
                    width: `${(1 - SCAN_ROI.x1) * 100}%`,
                    height: roiHeight,
                  }}
                />
              </div>
              {/* Retícula / zona de mira */}
              <button
                type="button"
                aria-label={isGun ? "Zona de lectura" : "Capturar código en la mira"}
                disabled={isGun || !candidate || !stable}
                onClick={isGun ? undefined : onConfirmCandidate}
                className={[
                  "absolute z-10 -translate-x-0 -translate-y-0 rounded-xl border-[3px] transition-colors",
                  flash
                    ? "border-emerald-400 bg-emerald-400/25 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
                    : candidate
                      ? stable
                        ? "border-emerald-400 bg-emerald-400/10"
                        : "border-amber-300 bg-amber-300/10"
                      : "border-white/80 bg-transparent",
                  isGun ? "pointer-events-none" : "",
                ].join(" ")}
                style={{
                  left: roiLeft,
                  top: roiTop,
                  width: roiWidth,
                  height: roiHeight,
                }}
              >
                <span className="pointer-events-none absolute left-1.5 top-1.5 h-4 w-4 border-l-2 border-t-2 border-inherit" />
                <span className="pointer-events-none absolute right-1.5 top-1.5 h-4 w-4 border-r-2 border-t-2 border-inherit" />
                <span className="pointer-events-none absolute bottom-1.5 left-1.5 h-4 w-4 border-b-2 border-l-2 border-inherit" />
                <span className="pointer-events-none absolute bottom-1.5 right-1.5 h-4 w-4 border-b-2 border-r-2 border-inherit" />
                {flash ? (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-2xl font-bold text-emerald-200">
                    ✓
                  </span>
                ) : null}
              </button>
            </div>

            <p className="mt-3 text-center text-sm text-white/90">
              {isGun ? "Apunta y listo · sin pulsar Capturar" : "Centra el código en la mira"}
            </p>
            <p className="mt-0.5 text-center text-xs text-white/55">
              {isGun
                ? "Cámara continua o pistola HID (teclado + Enter)"
                : "Se captura al estabilizar · Capturar manual por si falla"}
            </p>

            {candidate ? (
              <div
                className={[
                  "mt-2 rounded-lg px-3 py-2 text-center text-sm font-medium",
                  stable
                    ? "bg-emerald-500/20 text-emerald-200"
                    : "bg-amber-500/15 text-amber-100",
                ].join(" ")}
              >
                {isGun ? "Leído · " : stable ? "Listo · " : "Detectado · "}
                <span className="break-all font-mono text-xs">{candidate}</span>
              </div>
            ) : lastCaptured ? (
              <p className="mt-2 text-center text-xs text-white/50">
                Último: {lastCaptured}
              </p>
            ) : null}

            {!isGun ? (
              <Button
                type="button"
                className="mt-3 h-12 w-full text-base font-semibold"
                disabled={!candidate || !stable}
                onClick={onConfirmCandidate}
              >
                Capturar
              </Button>
            ) : null}

            <div className="mt-4 space-y-2 rounded-xl bg-zinc-900/80 p-3">
              <Field label="O escribe el código">
                <TextInput
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  placeholder="CEL1… o referencia"
                  className="bg-zinc-800 text-white"
                />
              </Field>
              <Button
                type="button"
                className="w-full"
                disabled={!manual.trim()}
                onClick={() => {
                  commitCapture(manual.trim());
                  setManual("");
                }}
              >
                Confirmar código
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
