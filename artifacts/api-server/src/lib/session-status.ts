export function normalizeSessionStatus(status?: string | null): string {
  if (!status) return 'pending';

  const normalized = status.trim().toLowerCase();

  switch (normalized) {
    case 'active':
    case 'in_progress':
      return 'active';
    case 'submitted':
    case 'completed':
      return 'submitted';
    case 'not_started':
    case 'pending':
      return 'pending';
    case 'abandoned':
      return 'abandoned';
    default:
      return normalized;
  }
}
