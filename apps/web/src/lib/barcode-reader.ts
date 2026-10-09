/**
 * Lector barcode: BarcodeDetector nativo (con bbox → ROI) + ZXing cropeado al centro.
 * Emite candidatos en la zona de mira; no confirma captura (eso lo hace la UI).
 */
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

/**
 * Zona central (fracción del frame) donde se aceptan códigos.
 * Más ancha/alta que antes para EAN de producto, pero sigue ignorando bordes.
 */
export const SCAN_ROI = {
  x0: 0.12,
  x1: 0.88,
  y0: 0.28,
  y1: 0.72,
} as const;

/** Margen extra al cropear para ZXing / fallback nativo (mejor decode de EAN). */
const CROP_PAD = 0.06;

export type DetectedCode = {
  raw: string;
  /** Centro normalizado 0–1 en el frame de vídeo. */
  nx: number;
  ny: number;
};

export interface CodeReader {
  start(
    video: HTMLVideoElement,
    onCandidate: (code: DetectedCode | null) => void,
    stream?: MediaStream,
  ): Promise<void>;
  stop(): void;
}

const DEFAULT_FORMATS: BarcodeFormat[] = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.QR_CODE,
  BarcodeFormat.DATA_MATRIX,
];

const NATIVE_FORMATS = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
  "qr_code",
  "data_matrix",
] as const;

type NativeBarcode = {
  rawValue?: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
};

type NativeDetector = {
  detect: (source: CanvasImageSource) => Promise<NativeBarcode[]>;
};

function getNativeDetector(): NativeDetector | null {
  const BD = (window as unknown as { BarcodeDetector?: new (opts?: unknown) => NativeDetector })
    .BarcodeDetector;
  if (!BD) return null;
  try {
    return new BD({ formats: [...NATIVE_FORMATS] });
  } catch {
    try {
      return new BD();
    } catch {
      return null;
    }
  }
}

function inRoi(nx: number, ny: number): boolean {
  return (
    nx >= SCAN_ROI.x0 && nx <= SCAN_ROI.x1 && ny >= SCAN_ROI.y0 && ny <= SCAN_ROI.y1
  );
}

/** Elige el código dentro del ROI más cercano al centro del frame. */
function pickRoiCandidate(
  codes: Array<{ raw: string; nx: number; ny: number }>,
): DetectedCode | null {
  const inZone = codes.filter((c) => c.raw && inRoi(c.nx, c.ny));
  if (inZone.length === 0) return null;
  let best = inZone[0]!;
  let bestDist = (best.nx - 0.5) ** 2 + (best.ny - 0.5) ** 2;
  for (let i = 1; i < inZone.length; i++) {
    const c = inZone[i]!;
    const d = (c.nx - 0.5) ** 2 + (c.ny - 0.5) ** 2;
    if (d < bestDist) {
      best = c;
      bestDist = d;
    }
  }
  return best;
}

function cropRect(vw: number, vh: number) {
  const x0 = Math.max(0, SCAN_ROI.x0 - CROP_PAD);
  const y0 = Math.max(0, SCAN_ROI.y0 - CROP_PAD);
  const x1 = Math.min(1, SCAN_ROI.x1 + CROP_PAD);
  const y1 = Math.min(1, SCAN_ROI.y1 + CROP_PAD);
  const sx = Math.floor(vw * x0);
  const sy = Math.floor(vh * y0);
  const sw = Math.max(1, Math.floor(vw * (x1 - x0)));
  const sh = Math.max(1, Math.floor(vh * (y1 - y0)));
  return { sx, sy, sw, sh };
}

function invertCanvas(
  source: HTMLCanvasElement,
  dest: HTMLCanvasElement,
  destCtx: CanvasRenderingContext2D,
) {
  dest.width = source.width;
  dest.height = source.height;
  destCtx.drawImage(source, 0, 0);
  const img = destCtx.getImageData(0, 0, dest.width, dest.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = 255 - d[i]!;
    d[i + 1] = 255 - d[i + 1]!;
    d[i + 2] = 255 - d[i + 2]!;
  }
  destCtx.putImageData(img, 0, 0);
}

export function createBarcodeReader(): CodeReader {
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, DEFAULT_FORMATS);
  hints.set(DecodeHintType.TRY_HARDER, true);

  const reader = new BrowserMultiFormatReader(hints);
  let timer = 0;
  let stopped = false;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const auxCanvas = document.createElement("canvas");
  const auxCtx = auxCanvas.getContext("2d", { willReadFrequently: true });

  async function decodeCroppedZXing(): Promise<string | null> {
    if (!ctx || !auxCtx) return null;
    const tryDecode = async (c: HTMLCanvasElement) => {
      try {
        const result = await reader.decodeFromCanvas(c);
        return result?.getText()?.trim() || null;
      } catch {
        return null;
      }
    };

    // Escala 1:1
    let raw = await tryDecode(canvas);
    if (raw) return raw;

    // Escala ~1.5× (ayuda EAN pequeños / lejos)
    const scale = 1.5;
    auxCanvas.width = Math.max(1, Math.floor(canvas.width * scale));
    auxCanvas.height = Math.max(1, Math.floor(canvas.height * scale));
    auxCtx.imageSmoothingEnabled = false;
    auxCtx.drawImage(canvas, 0, 0, auxCanvas.width, auxCanvas.height);
    raw = await tryDecode(auxCanvas);
    if (raw) return raw;

    // Invertido (códigos claros sobre fondo oscuro / etiquetas raras)
    invertCanvas(canvas, auxCanvas, auxCtx);
    return tryDecode(auxCanvas);
  }

  return {
    async start(video, onCandidate) {
      stopped = false;
      const native = getNativeDetector();

      const tick = async () => {
        if (stopped) return;
        try {
          if (video.readyState >= 2 && video.videoWidth > 0 && ctx) {
            const vw = video.videoWidth;
            const vh = video.videoHeight;
            const { sx, sy, sw, sh } = cropRect(vw, vh);

            if (native) {
              const codes = await native.detect(video);
              const mapped = (codes ?? [])
                .filter((c) => c.rawValue)
                .map((c) => {
                  const box = c.boundingBox;
                  if (box && box.width > 0 && box.height > 0) {
                    return {
                      raw: c.rawValue!.trim(),
                      nx: (box.x + box.width / 2) / vw,
                      ny: (box.y + box.height / 2) / vh,
                    };
                  }
                  return { raw: c.rawValue!.trim(), nx: 0.5, ny: 0.5 };
                });
              const hasBoxes = (codes ?? []).some(
                (c) => c.boundingBox && c.boundingBox.width > 0,
              );
              if (hasBoxes) {
                onCandidate(pickRoiCandidate(mapped));
              } else {
                canvas.width = sw;
                canvas.height = sh;
                ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
                const cropped = await native.detect(canvas);
                const raw = cropped?.[0]?.rawValue?.trim();
                onCandidate(raw ? { raw, nx: 0.5, ny: 0.5 } : null);
              }
            } else {
              canvas.width = sw;
              canvas.height = sh;
              ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
              const raw = await decodeCroppedZXing();
              onCandidate(raw ? { raw, nx: 0.5, ny: 0.5 } : null);
            }
          }
        } catch {
          /* frame skip */
        }
        // ~8–10 fps: snappy sin saturar CPU en móviles
        if (!stopped) timer = window.setTimeout(tick, 110) as unknown as number;
      };

      void tick();
    },

    stop() {
      stopped = true;
      if (timer) {
        clearTimeout(timer);
        timer = 0;
      }
    },
  };
}
