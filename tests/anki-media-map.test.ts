import { describe, expect, it } from 'vitest';
import { archiveNameForMediaEntry, decodeAnkiMediaEntries } from '../src/anki-media-map';

function varint(value: number): number[] {
  const bytes: number[] = [];
  let current = value;
  do {
    let byte = current % 128;
    current = Math.floor(current / 128);
    if (current) byte |= 0x80;
    bytes.push(byte);
  } while (current);
  return bytes;
}

function lengthField(field: number, bytes: number[]): number[] {
  return [...varint(field * 8 + 2), ...varint(bytes.length), ...bytes];
}

function uintField(field: number, value: number): number[] {
  return [...varint(field * 8), ...varint(value)];
}

function mediaEntry(name: string, size: number, sha1: number[] = [], legacyZipFilename?: number): number[] {
  const encoded = [
    ...lengthField(1, [...new TextEncoder().encode(name)]),
    ...uintField(2, size),
    ...(sha1.length ? lengthField(3, sha1) : []),
    ...(legacyZipFilename === undefined ? [] : uintField(255, legacyZipFilename)),
  ];
  return lengthField(1, encoded);
}

describe('modern Anki media map protobuf', () => {
  it('decodes MediaEntries using the import_export.proto field numbers', () => {
    const bytes = new Uint8Array([
      ...mediaEntry('diagram.png', 123, [1,2,3]),
      ...mediaEntry('audio.mp3', 456, [], 9),
    ]);
    const entries = decodeAnkiMediaEntries(bytes);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ name:'diagram.png', size:123 });
    expect(entries[0].sha1).toEqual(new Uint8Array([1,2,3]));
    expect(entries[1]).toMatchObject({ name:'audio.mp3', size:456, legacyZipFilename:9 });
    expect(archiveNameForMediaEntry(entries[0], 0)).toBe('0');
    expect(archiveNameForMediaEntry(entries[1], 1)).toBe('9');
  });

  it('rejects truncated protobuf messages instead of guessing', () => {
    expect(() => decodeAnkiMediaEntries(new Uint8Array([10, 5, 1, 2]))).toThrow();
  });
});
