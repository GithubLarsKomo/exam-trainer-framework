import type { AssetRole } from './model';

export type AssetRenderKind = 'image' | 'audio';

const SAFE_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);
const SAFE_AUDIO_TYPES = new Set(['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/webm']);

export function assetRenderKind(mediaType: string): AssetRenderKind | undefined {
  const normalized = mediaType.trim().toLowerCase();
  if (SAFE_IMAGE_TYPES.has(normalized)) return 'image';
  if (SAFE_AUDIO_TYPES.has(normalized)) return 'audio';
  return undefined;
}

export function isAssetRoleVisible(role: AssetRole, revealed: boolean): boolean {
  if (role === 'prompt' || role === 'attachment') return true;
  return revealed;
}

export function formatAssetBytes(byteLength: number): string {
  if (!Number.isFinite(byteLength) || byteLength < 0) return '–';
  if (byteLength < 1024) return `${Math.round(byteLength)} B`;
  if (byteLength < 1024 * 1024) return `${Math.round(byteLength / 1024)} KiB`;
  return `${(byteLength / (1024 * 1024)).toFixed(1)} MiB`;
}
