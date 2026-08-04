import { describe, expect, it } from 'vitest';
import { zipSync } from 'fflate';
import initSqlJs from 'sql.js/dist/sql-asm.js';
import type { Database, SqlJsStatic } from 'sql.js';
import { parseApkgImport } from '../src/import-anki';
import { createImportPreview } from '../src/import-preview';

let sqlPromise: Promise<SqlJsStatic> | undefined;
function loadSql(){ return sqlPromise ??= initSqlJs() as Promise<SqlJsStatic>; }

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

function mediaMap(name: string, size: number): Uint8Array {
  const entry = [
    ...lengthField(1, [...new TextEncoder().encode(name)]),
    ...uintField(2, size),
  ];
  return new Uint8Array(lengthField(1, entry));
}

function modernDb(SQL: SqlJsStatic): Uint8Array {
  const db: Database = new SQL.Database();
  db.run('CREATE TABLE col (ver integer)');
  db.run('INSERT INTO col VALUES (18)');
  db.run('CREATE TABLE notes (id integer primary key, mid integer, flds text, tags text)');
  db.run('CREATE TABLE cards (id integer primary key, nid integer, did integer, ord integer)');
  db.run('CREATE TABLE notetypes (id integer primary key, name text, mtime_secs integer, usn integer, config blob)');
  db.run('CREATE TABLE fields (ntid integer, ord integer, name text, config blob, primary key(ntid,ord))');
  db.run('CREATE TABLE templates (ntid integer, ord integer, name text, mtime_secs integer, usn integer, config blob, primary key(ntid,ord))');
  db.run('CREATE TABLE decks (id integer primary key, name text, mtime_secs integer, usn integer, common blob, kind blob)');
  db.run("INSERT INTO notetypes VALUES (200,'Basic',0,0,X'')");
  db.run("INSERT INTO fields VALUES (200,0,'Front',X'')");
  db.run("INSERT INTO fields VALUES (200,1,'Back',X'')");
  db.run("INSERT INTO templates VALUES (200,0,'Card 1',0,0,X'')");
  db.run("INSERT INTO decks VALUES (2,'Modern::Media',0,0,X'',X'')");
  db.run('INSERT INTO notes VALUES (2,200,?,?)', ['<img src="diagram.png"> Welche Struktur?\x1fSchweißnaht',' media ']);
  db.run('INSERT INTO cards VALUES (20,2,2,0)');
  const bytes = db.export();
  db.close();
  return bytes;
}

describe('modern APKG media', () => {
  it('decodes the protobuf media map and the zstd media payload before preview', async () => {
    const SQL = await loadSql();
    const payload = new Uint8Array([137,80,78,71]);
    const archive = zipSync({
      'collection.anki21b': modernDb(SQL),
      media: mediaMap('diagram.png', payload.byteLength),
      '0': payload,
    });
    const bundle = await parseApkgImport(archive, 'modern-media.apkg', { sql:SQL, decompressZstd:bytes => bytes });
    expect(bundle.media).toHaveLength(1);
    expect(bundle.media[0]).toMatchObject({ archiveName:'0', fileName:'diagram.png' });
    expect(bundle.media[0].bytes).toEqual(payload);
    expect(bundle.warnings.some(warning => warning.code === 'MODERN_MEDIA_MAP_UNRESOLVED')).toBe(false);

    const preview = createImportPreview(bundle, { questionField:'Front', answerField:'Back', topicFromDeck:true, defaultSource:'Anki' });
    expect(preview.candidates[0].mediaRefs).toEqual([{ fileName:'diagram.png', role:'prompt' }]);
  });

  it('rejects a decompressed media payload when its size differs from MediaEntry', async () => {
    const SQL = await loadSql();
    const payload = new Uint8Array([1,2,3]);
    const archive = zipSync({
      'collection.anki21b': modernDb(SQL),
      media: mediaMap('diagram.png', 99),
      '0': payload,
    });
    const bundle = await parseApkgImport(archive, 'corrupt-media.apkg', { sql:SQL, decompressZstd:bytes => bytes });
    expect(bundle.media).toHaveLength(0);
    expect(bundle.warnings).toContainEqual(expect.objectContaining({ code:'MEDIA_INTEGRITY', sourceId:'0' }));
  });

  it('does not decompress modern media when the protobuf map is malformed', async () => {
    const SQL = await loadSql();
    let decodeCalls = 0;
    const collection = modernDb(SQL);
    const malformedMap = new Uint8Array([10, 9, 1]);
    const payload = new Uint8Array([4,5,6]);
    const archive = zipSync({ 'collection.anki21b':collection, media:malformedMap, '0':payload });
    const bundle = await parseApkgImport(archive, 'bad-map.apkg', {
      sql:SQL,
      decompressZstd:bytes => {
        decodeCalls++;
        return bytes;
      },
    });
    expect(bundle.media).toHaveLength(0);
    expect(decodeCalls).toBe(2); // collection + media map; payload is never decoded
    expect(bundle.warnings).toContainEqual(expect.objectContaining({ code:'MODERN_MEDIA_MAP_UNRESOLVED' }));
  });
});
