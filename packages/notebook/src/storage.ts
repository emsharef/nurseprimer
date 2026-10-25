// Browser storage that never throws. Private windows, blocked site data and thumbnail renderers can make
// localStorage missing or throwing; the book must still work, so every access is guarded and an in-memory
// map stands in when storage is unavailable.

const memory = new Map<string, string>();

function backend(): Storage | null {
  try {
    const s = globalThis.localStorage;
    if (!s) return null;
    const probe = '__primer_probe__';
    s.setItem(probe, probe);
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export function readJSON<T>(key: string, fallback: T): T {
  let raw: string | null | undefined;
  try {
    raw = backend()?.getItem(key);
  } catch {
    raw = null;
  }
  raw ??= memory.get(key) ?? null;
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  const raw = JSON.stringify(value);
  memory.set(key, raw);
  try {
    backend()?.setItem(key, raw);
  } catch {
    // quota or blocked storage: the in-memory copy keeps this visit working
  }
}

export function remove(key: string): void {
  memory.delete(key);
  try {
    backend()?.removeItem(key);
  } catch {}
}
