export function sessionDraftKey(catalogId: string, cardId: string): string {
  return `etf:draft:${catalogId}:${cardId}`;
}

export function estimateRemainingMinutes(currentIndex: number, total: number, responseTimesMs: number[]): number {
  const remaining = Math.max(0, total - currentIndex + 1);
  if (!remaining) return 0;
  const valid = responseTimesMs.filter(value => Number.isFinite(value) && value >= 3_000 && value <= 15 * 60_000).sort((a,b)=>a-b);
  const typical = valid.length ? valid[Math.floor(valid.length / 2)] : 75_000;
  return Math.max(1, Math.ceil(remaining * typical / 60_000));
}

export function formatStorageBytes(bytes: number | undefined): string {
  if (!bytes || bytes <= 0) return '–';
  const units = ['B','KiB','MiB','GiB'];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) { value /= 1024; index++; }
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

export function storageUsageLabel(usage?: number, quota?: number): string {
  if (!usage || !quota) return 'Speicherbelegung unbekannt';
  return `${formatStorageBytes(usage)} von ${formatStorageBytes(quota)} lokal belegt`;
}
