/**
 * Lector barcode: BarcodeDetector nativo + ZXing (port ClarivScan).
 */
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType, type Result } from "@zxing/library";

export interface CodeReader {
  start(
    video: HTMLVideoElement,
    onResult: (raw: string) => void,
    stream?: MediaStream,
  ): Promise<void>;
  stop(): void;
}

const DEFAULT_FORMATS: BarcodeFormat[] = [
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.QR_CODE,
  BarcodeFormat.DATA_MATRIX,
];

const NATIVE_FORMATS = [
  "code_128",
  "code_39",
  "ean_13",
  "ean_8",
  "qr_code",
  "data_matrix",
] as const;

type NativeDetector = {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
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

export function createBarcodeReader(): CodeReader {
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, DEFAULT_FORMATS);
  hints.set(DecodeHintType.TRY_HARDER, true);

  const reader = new BrowserMultiFormatReader(hints, {
    delayBetweenScanAttempts: 180,
    delayBetweenScanSuccess: 800,
  });

  let controls: IScannerControls | null = null;
  let raf = 0;
  let stopped = false;
  let lastCode = "";
  let lastAt = 0;

  const emit = (text: string, onResult: (raw: string) => void) => {
    const now = Date.now();
    if (!text) return;
    if (text === lastCode && now - lastAt < 1200) return;
    lastCode = text;
    lastAt = now;
    onResult(text);
  };

  return {
    async start(video, onResult, stream) {
      stopped = false;
      const native = getNativeDetector();

      if (native) {
        const tick = async () => {
          if (stopped) return;
          try {
            if (video.readyState >= 2) {
              const codes = await native.detect(video);
              const value = codes?.[0]?.rawValue;
              if (value) emit(value, onResult);
            }
          } catch {
            /* frame skip */
          }
          if (!stopped) raf = window.setTimeout(tick, 220) as unknown as number;
        };
        void tick();
      }

      const callback = (result: Result | undefined) => {
        if (!result || stopped) return;
        emit(result.getText(), onResult);
      };

      try {
        if (stream) {
          controls = await reader.decodeFromStream(stream, video, callback);
        } else {
          controls = await reader.decodeFromVideoElement(video, callback);
        }
      } catch (err) {
        if (!native) throw err;
        console.warn("ZXing fallback skip", err);
      }
    },

    stop() {
      stopped = true;
      if (raf) {
        clearTimeout(raf);
        raf = 0;
      }
      try {
        controls?.stop();
      } catch {
        /* ignore */
      }
      controls = null;
      lastCode = "";
      lastAt = 0;
    },
  };
}
