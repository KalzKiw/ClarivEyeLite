/** Pasa el File de ClarivScan → /entrenar sin serializar (misma sesión SPA). */
let pending: File | null = null;

export function setPendingTrainFile(file: File | null) {
  pending = file;
}

export function takePendingTrainFile(): File | null {
  const f = pending;
  pending = null;
  return f;
}

export function peekPendingTrainFile(): File | null {
  return pending;
}
