export interface AnkiMediaMapEntry {
  name: string;
  size: number;
  sha1: Uint8Array;
  legacyZipFilename?: number;
}

interface Cursor {
  bytes: Uint8Array;
  offset: number;
}

function readVarint(cursor: Cursor): number {
  let value = 0;
  let shift = 0;
  for (let index = 0; index < 10; index++) {
    if (cursor.offset >= cursor.bytes.length) throw new Error('Unexpected end of protobuf varint.');
    const byte = cursor.bytes[cursor.offset++];
    value += (byte & 0x7f) * 2 ** shift;
    if ((byte & 0x80) === 0) {
      if (!Number.isSafeInteger(value)) throw new Error('Protobuf varint exceeds the safe integer range.');
      return value;
    }
    shift += 7;
  }
  throw new Error('Invalid protobuf varint.');
}

function readLengthDelimited(cursor: Cursor): Uint8Array {
  const length = readVarint(cursor);
  if (length < 0 || cursor.offset + length > cursor.bytes.length) throw new Error('Invalid protobuf length-delimited field.');
  const value = cursor.bytes.subarray(cursor.offset, cursor.offset + length);
  cursor.offset += length;
  return value;
}

function skipField(cursor: Cursor, wireType: number): void {
  if (wireType === 0) {
    readVarint(cursor);
    return;
  }
  if (wireType === 1) {
    cursor.offset += 8;
  } else if (wireType === 2) {
    readLengthDelimited(cursor);
    return;
  } else if (wireType === 5) {
    cursor.offset += 4;
  } else {
    throw new Error(`Unsupported protobuf wire type ${wireType}.`);
  }
  if (cursor.offset > cursor.bytes.length) throw new Error('Protobuf field extends past the input.');
}

function decodeEntry(bytes: Uint8Array): AnkiMediaMapEntry {
  const cursor: Cursor = { bytes, offset: 0 };
  let name = '';
  let size = 0;
  let sha1 = new Uint8Array();
  let legacyZipFilename: number | undefined;

  while (cursor.offset < bytes.length) {
    const tag = readVarint(cursor);
    const field = Math.floor(tag / 8);
    const wireType = tag & 7;
    if (field === 1 && wireType === 2) {
      name = new TextDecoder().decode(readLengthDelimited(cursor));
    } else if (field === 2 && wireType === 0) {
      size = readVarint(cursor);
    } else if (field === 3 && wireType === 2) {
      sha1 = new Uint8Array(readLengthDelimited(cursor));
    } else if (field === 255 && wireType === 0) {
      legacyZipFilename = readVarint(cursor);
    } else {
      skipField(cursor, wireType);
    }
  }

  if (!name) throw new Error('Anki MediaEntry has no filename.');
  return { name, size, sha1, legacyZipFilename };
}

/** Decode Anki's `MediaEntries` protobuf from import_export.proto. */
export function decodeAnkiMediaEntries(bytes: Uint8Array): AnkiMediaMapEntry[] {
  const cursor: Cursor = { bytes, offset: 0 };
  const entries: AnkiMediaMapEntry[] = [];
  while (cursor.offset < bytes.length) {
    const tag = readVarint(cursor);
    const field = Math.floor(tag / 8);
    const wireType = tag & 7;
    if (field === 1 && wireType === 2) {
      entries.push(decodeEntry(readLengthDelimited(cursor)));
    } else {
      skipField(cursor, wireType);
    }
  }
  return entries;
}

export function archiveNameForMediaEntry(entry: AnkiMediaMapEntry, index: number): string {
  return String(entry.legacyZipFilename ?? index);
}
