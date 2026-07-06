export const FLAG_COOLDOWN_MS = 30_000;

const ALLOWED_FLAG_TYPES = new Set([
  'tab_switch',
  'fullscreen_exit',
  'face_not_visible',
  'looking_away',
  'multiple_faces',
]);

export function normalizeFlagType(type: unknown): string | null {
  if (typeof type !== 'string') return null;
  const normalized = type.trim().toLowerCase();
  return ALLOWED_FLAG_TYPES.has(normalized) ? normalized : null;
}

export function shouldThrottleFlag(lastDetectedAt: Date | string | null | undefined, now: Date = new Date()): boolean {
  if (!lastDetectedAt) return false;
  const last = lastDetectedAt instanceof Date ? lastDetectedAt : new Date(lastDetectedAt);
  if (Number.isNaN(last.getTime())) return false;
  return now.getTime() - last.getTime() < FLAG_COOLDOWN_MS;
}
