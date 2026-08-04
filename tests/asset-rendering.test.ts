import { describe, expect, it } from 'vitest';
import { assetRenderKind, formatAssetBytes, isAssetRoleVisible } from '../src/asset-rendering';

describe('asset rendering policy', () => {
  it('renders only the explicit raster-image and audio allowlist', () => {
    expect(assetRenderKind('image/png')).toBe('image');
    expect(assetRenderKind('image/webp')).toBe('image');
    expect(assetRenderKind('audio/mpeg')).toBe('audio');
    expect(assetRenderKind('audio/ogg')).toBe('audio');
    expect(assetRenderKind('image/svg+xml')).toBeUndefined();
    expect(assetRenderKind('text/html')).toBeUndefined();
    expect(assetRenderKind('application/pdf')).toBeUndefined();
    expect(assetRenderKind('application/octet-stream')).toBeUndefined();
  });

  it('keeps answer and reference media hidden until reveal', () => {
    expect(isAssetRoleVisible('prompt', false)).toBe(true);
    expect(isAssetRoleVisible('attachment', false)).toBe(true);
    expect(isAssetRoleVisible('answer', false)).toBe(false);
    expect(isAssetRoleVisible('reference', false)).toBe(false);
    expect(isAssetRoleVisible('answer', true)).toBe(true);
    expect(isAssetRoleVisible('reference', true)).toBe(true);
  });

  it('formats asset sizes without introducing decimal noise', () => {
    expect(formatAssetBytes(512)).toBe('512 B');
    expect(formatAssetBytes(2048)).toBe('2 KiB');
    expect(formatAssetBytes(1572864)).toBe('1.5 MiB');
  });
});
