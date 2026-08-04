import { strFromU8, unzipSync } from 'fflate';
import { decompress } from 'fzstd';
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { archiveNameForMediaEntry, decodeAnkiMediaEntries, type AnkiMediaMapEntry } from './anki-media-map';
import { emptyImportBundle, type NormalizedImportBundle, type NormalizedImportCard, type NormalizedImportField } from './import-model';

let sqlPromise: Promise<SqlJsStatic> | undefined;
function loadSql(): Promise<SqlJsStatic> {
  sqlPromise ??= initSqlJs({ locateFile: () => sqlWasmUrl });
  return sqlPromise;
}

export interface ApkgSafetyLimits {
  maxArchiveBytes: number;
  maxCollectionEntryBytes: number;
  maxDecodedCollectionBytes: number;
  maxControlEntryBytes: number;
  maxMediaEntryBytes: number;
  maxTotalMediaBytes: number;
}

const MIB = 1024 * 1024;
export const DEFAULT_APKG_SAFETY_LIMITS: ApkgSafetyLimits = {
  maxArchiveBytes: 512 * MIB,
  maxCollectionEntryBytes: 256 * MIB,
  maxDecodedCollectionBytes: 768 * MIB,
  maxControlEntryBytes: 32 * MIB,
  maxMediaEntryBytes: 128 * MIB,
  maxTotalMediaBytes: 1024 * MIB,
};

export interface ApkgParseOptions {
  sql?: SqlJsStatic;
  decompressZstd?: (bytes: Uint8Array) => Uint8Array;
  safetyLimits?: Partial<ApkgSafetyLimits>;
}

type SqlValue = string | number | Uint8Array | null;
type Row = Record<string, SqlValue>;

const CONTROL_NAMES = new Set(['collection.anki2', 'collection.anki21', 'collection.anki21b', 'media', 'meta']);
const COLLECTION_NAMES = new Set(['collection.anki2', 'collection.anki21', 'collection.anki21b']);

function rows(db: Database, sql: string): Row[] {
  const result = db.exec(sql)[0];
  if (!result) return [];
  return result.values.map(values => Object.fromEntries(result.columns.map((column, index) => [column, values[index] as SqlValue])));
}

function stringValue(value: SqlValue | undefined): string {
  if (value === null || value === undefined || value instanceof Uint8Array) return '';
  return String(value);
}

function numberValue(value: SqlValue | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function tableNames(db: Database): Set<string> {
  return new Set(rows(db, "SELECT name FROM sqlite_master WHERE type='table'").map(row => stringValue(row.name)));
}

interface LegacyModelField { name?: string; ord?: number }
interface LegacyTemplate { name?: string; ord?: number; qfmt?: string; afmt?: string }
interface LegacyModel { name?: string; flds?: LegacyModelField[]; tmpls?: LegacyTemplate[] }
interface LegacyDeck { name?: string }

function parseJsonObject<T>(value: SqlValue | undefined): Record<string, T> {
  const text = stringValue(value);
  if (!text) return {};
  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, T> : {};
  } catch {
    return {};
  }
}

function parseLegacyMetadata(db: Database): {
  fields: Map<string, string[]>;
  noteTypes: Map<string, string>;
  templates: Map<string, Map<number, LegacyTemplate>>;
  decks: Map<string, string>;
} {
  const col = rows(db, 'SELECT models, decks FROM col LIMIT 1')[0] ?? {};
  const models = parseJsonObject<LegacyModel>(col.models);
  const decksJson = parseJsonObject<LegacyDeck>(col.decks);
  const fields = new Map<string, string[]>();
  const noteTypes = new Map<string, string>();
  const templates = new Map<string, Map<number, LegacyTemplate>>();
  const decks = new Map<string, string>();
  for (const [mid, model] of Object.entries(models)) {
    noteTypes.set(mid, model.name ?? `Notetype ${mid}`);
    const orderedFields = [...(model.flds ?? [])].sort((a, b) => (a.ord ?? 0) - (b.ord ?? 0));
    fields.set(mid, orderedFields.map((field, index) => field.name?.trim() || `Field ${index + 1}`));
    const byOrd = new Map<number, LegacyTemplate>();
    for (const template of model.tmpls ?? []) byOrd.set(template.ord ?? byOrd.size, template);
    templates.set(mid, byOrd);
  }
  for (const [did, deck] of Object.entries(decksJson)) decks.set(did, deck.name ?? `Deck ${did}`);
  return { fields, noteTypes, templates, decks };
}

function parseModernMetadata(db: Database): {
  fields: Map<string, string[]>;
  noteTypes: Map<string, string>;
  templateNames: Map<string, Map<number, string>>;
  decks: Map<string, string>;
} {
  const fields = new Map<string, string[]>();
  const noteTypes = new Map<string, string>();
  const templateNames = new Map<string, Map<number, string>>();
  const decks = new Map<string, string>();
  for (const row of rows(db, 'SELECT id, name FROM notetypes')) noteTypes.set(stringValue(row.id), stringValue(row.name));
  const fieldsByType = new Map<string, Array<{ ord: number; name: string }>>();
  for (const row of rows(db, 'SELECT ntid, ord, name FROM fields ORDER BY ntid, ord')) {
    const key = stringValue(row.ntid);
    const list = fieldsByType.get(key) ?? [];
    list.push({ ord: numberValue(row.ord), name: stringValue(row.name) });
    fieldsByType.set(key, list);
  }
  for (const [key, list] of fieldsByType) fields.set(key, list.sort((a, b) => a.ord - b.ord).map((field, index) => field.name || `Field ${index + 1}`));
  for (const row of rows(db, 'SELECT ntid, ord, name FROM templates ORDER BY ntid, ord')) {
    const key = stringValue(row.ntid);
    const map = templateNames.get(key) ?? new Map<number, string>();
    map.set(numberValue(row.ord), stringValue(row.name));
    templateNames.set(key, map);
  }
  for (const row of rows(db, 'SELECT id, name FROM decks')) decks.set(stringValue(row.id), stringValue(row.name));
  return { fields, noteTypes, templateNames, decks };
}

function fieldObjects(fieldNames: string[], flds: string): NormalizedImportField[] {
  const values = flds.split('\x1f');
  const count = Math.max(fieldNames.length, values.length);
  return Array.from({ length: count }, (_, ordinal) => ({
    name: fieldNames[ordinal] ?? `Field ${ordinal + 1}`,
    ordinal,
    value: values[ordinal] ?? '',
  }));
}

function tagsFromAnki(value: string): string[] {
  return [...new Set(value.trim().split(/\s+/).map(tag => tag.trim()).filter(Boolean))];
}

function deckPath(name: string): string[] {
  return name.split('::').map(part => part.trim()).filter(Boolean);
}

function containsCloze(fields: NormalizedImportField[]): boolean {
  return fields.some(field => /\{\{c\d+::[\s\S]+?\}\}/i.test(field.value));
}

function unzipControlEntries(
  bytes: Uint8Array,
  bundle: NormalizedImportBundle,
  limits: ApkgSafetyLimits,
): Record<string, Uint8Array> | undefined {
  const skipped: string[] = [];
  const entries = unzipSync(bytes, {
    filter: file => {
      if (!CONTROL_NAMES.has(file.name)) return false;
      const originalSize = Math.max(0, file.originalSize);
      const limit = COLLECTION_NAMES.has(file.name) ? limits.maxCollectionEntryBytes : limits.maxControlEntryBytes;
      if (originalSize > limit) {
        skipped.push(file.name);
        return false;
      }
      return true;
    },
  });
  const skippedCollection = skipped.find(name => COLLECTION_NAMES.has(name));
  if (skippedCollection) {
    bundle.warnings.push({
      code: 'ARCHIVE_LIMIT',
      message: `Die Anki-Sammlungsdatei ${skippedCollection} überschreitet das Sicherheitslimit und wurde nicht entpackt.`,
      sourceId: skippedCollection,
      blocking: true,
    });
    return undefined;
  }
  for (const name of skipped) {
    bundle.warnings.push({ code: 'ARCHIVE_LIMIT', message: `Kontrolldatei ${name} überschreitet das Sicherheitslimit und wurde übersprungen.`, sourceId: name });
  }
  return entries;
}

function unzipMediaEntries(
  bytes: Uint8Array,
  bundle: NormalizedImportBundle,
  limits: ApkgSafetyLimits,
): Record<string, Uint8Array> {
  let acceptedBytes = 0;
  let skippedCount = 0;
  const entries = unzipSync(bytes, {
    filter: file => {
      if (CONTROL_NAMES.has(file.name) || file.name.endsWith('/')) return false;
      const originalSize = Math.max(0, file.originalSize);
      if (originalSize > limits.maxMediaEntryBytes || acceptedBytes + originalSize > limits.maxTotalMediaBytes) {
        skippedCount++;
        return false;
      }
      acceptedBytes += originalSize;
      return true;
    },
  });
  if (skippedCount) {
    bundle.warnings.push({
      code: 'ARCHIVE_LIMIT',
      message: `${skippedCount} Mediendateien wurden bereits auf ZIP-Ebene wegen Einzeldatei- oder Gesamtgrößenlimit übersprungen.`,
    });
  }
  return entries;
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  for (let index = 0; index < left.byteLength; index++) if (left[index] !== right[index]) return false;
  return true;
}

async function sha1Matches(bytes: Uint8Array, expected: Uint8Array): Promise<boolean | undefined> {
  if (!expected.byteLength || !globalThis.crypto?.subtle) return undefined;
  try {
    const input = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-1', input));
    return bytesEqual(digest, expected);
  } catch {
    return undefined;
  }
}

function decodeModernMediaMap(
  mediaMapBytes: Uint8Array,
  decompressZstd: (bytes: Uint8Array) => Uint8Array,
  bundle: NormalizedImportBundle,
  limits: ApkgSafetyLimits,
): Map<string, AnkiMediaMapEntry> | undefined {
  try {
    const decoded = decompressZstd(mediaMapBytes);
    if (decoded.byteLength > limits.maxControlEntryBytes) {
      bundle.warnings.push({ code:'ARCHIVE_LIMIT', message:'Das dekodierte moderne Anki-Medienverzeichnis überschreitet das Sicherheitslimit.' });
      return undefined;
    }
    const entries = decodeAnkiMediaEntries(decoded);
    return new Map(entries.map((entry, index) => [archiveNameForMediaEntry(entry, index), entry]));
  } catch (error) {
    bundle.warnings.push({
      code: 'MODERN_MEDIA_MAP_UNRESOLVED',
      message: `Das moderne Anki-Medienverzeichnis konnte nicht dekodiert werden; komprimierte Medien werden aus Sicherheitsgründen nicht übernommen. (${String(error)})`,
    });
    return undefined;
  }
}

async function extractLegacyMedia(
  entries: Record<string, Uint8Array>,
  bundle: NormalizedImportBundle,
): Promise<void> {
  const mediaMapBytes = entries.media;
  let map: Record<string, string> = {};
  if (mediaMapBytes) {
    try {
      const text = strFromU8(mediaMapBytes).trim();
      if (text.startsWith('{')) map = JSON.parse(text) as Record<string, string>;
    } catch {
      // Legacy media can still be retained without a filename mapping.
    }
  }
  for (const [archiveName, mediaBytes] of Object.entries(entries)) {
    if (!CONTROL_NAMES.has(archiveName)) bundle.media.push({ archiveName, fileName: map[archiveName], bytes: mediaBytes });
  }
  const unresolvedCount = bundle.media.filter(media => !media.fileName).length;
  if (unresolvedCount && mediaMapBytes) bundle.warnings.push({ code: 'UNMAPPED_MEDIA', message: `${unresolvedCount} Medieneinträge haben keinen aufgelösten Originaldateinamen.` });
}

async function extractModernMedia(
  entries: Record<string, Uint8Array>,
  bundle: NormalizedImportBundle,
  decompressZstd: (bytes: Uint8Array) => Uint8Array,
  limits: ApkgSafetyLimits,
): Promise<void> {
  const mediaMapBytes = entries.media;
  if (!mediaMapBytes) {
    bundle.warnings.push({ code:'MODERN_MEDIA_MAP_UNRESOLVED', message:'Das moderne APKG enthält kein Medienverzeichnis; Medien werden nicht übernommen.' });
    return;
  }
  const map = decodeModernMediaMap(mediaMapBytes, decompressZstd, bundle, limits);
  if (!map) return;

  let acceptedBytes = 0;
  let missingMap = 0;
  for (const [archiveName, compressedBytes] of Object.entries(entries)) {
    if (CONTROL_NAMES.has(archiveName)) continue;
    const metadata = map.get(archiveName);
    if (!metadata) {
      missingMap++;
      continue;
    }
    if (metadata.size > limits.maxMediaEntryBytes || acceptedBytes + metadata.size > limits.maxTotalMediaBytes) {
      bundle.warnings.push({ code:'ARCHIVE_LIMIT', message:`Medium ${metadata.name} überschreitet das dekodierte Medienlimit und wurde übersprungen.`, sourceId:archiveName });
      continue;
    }

    let decoded: Uint8Array;
    try {
      decoded = decompressZstd(compressedBytes);
    } catch (error) {
      bundle.warnings.push({ code:'MEDIA_INTEGRITY', message:`Medium ${metadata.name} konnte nicht zstd-dekomprimiert werden: ${String(error)}`, sourceId:archiveName });
      continue;
    }
    if (decoded.byteLength !== metadata.size) {
      bundle.warnings.push({ code:'MEDIA_INTEGRITY', message:`Medium ${metadata.name} hat nach Dekompression ${decoded.byteLength} Byte statt der angekündigten ${metadata.size} Byte und wurde verworfen.`, sourceId:archiveName });
      continue;
    }
    const hashMatches = await sha1Matches(decoded, metadata.sha1);
    if (hashMatches === false) {
      bundle.warnings.push({ code:'MEDIA_INTEGRITY', message:`SHA-1-Prüfung für ${metadata.name} ist fehlgeschlagen; das Medium wurde verworfen.`, sourceId:archiveName });
      continue;
    }
    acceptedBytes += decoded.byteLength;
    bundle.media.push({ archiveName, fileName:metadata.name, bytes:decoded });
  }

  if (missingMap) bundle.warnings.push({ code:'UNMAPPED_MEDIA', message:`${missingMap} numerische Medieneinträge sind nicht im modernen Anki-Medienverzeichnis beschrieben und wurden nicht übernommen.` });
  const missingFiles = [...map.keys()].filter(archiveName => !entries[archiveName]).length;
  if (missingFiles) bundle.warnings.push({ code:'MEDIA_INTEGRITY', message:`${missingFiles} im Medienverzeichnis angekündigte Dateien fehlen im APKG.` });
}

async function extractMedia(
  entries: Record<string, Uint8Array>,
  bundle: NormalizedImportBundle,
  collectionName: 'collection.anki2' | 'collection.anki21' | 'collection.anki21b',
  decompressZstd: (bytes: Uint8Array) => Uint8Array,
  limits: ApkgSafetyLimits,
): Promise<void> {
  if (collectionName === 'collection.anki21b') {
    await extractModernMedia(entries, bundle, decompressZstd, limits);
  } else {
    await extractLegacyMedia(entries, bundle);
  }
}

function selectCollection(
  entries: Record<string, Uint8Array>,
  decompressZstd: (bytes: Uint8Array) => Uint8Array,
): { name: 'collection.anki2' | 'collection.anki21' | 'collection.anki21b'; bytes: Uint8Array } {
  if (entries['collection.anki21b']) {
    try {
      return { name: 'collection.anki21b', bytes: decompressZstd(entries['collection.anki21b']) };
    } catch (error) {
      throw new Error(`Moderne Anki-Sammlung (collection.anki21b) konnte nicht zstd-dekomprimiert werden: ${String(error)}`);
    }
  }
  if (entries['collection.anki21']) return { name: 'collection.anki21', bytes: entries['collection.anki21'] };
  if (entries['collection.anki2']) return { name: 'collection.anki2', bytes: entries['collection.anki2'] };
  throw new Error('Das APKG enthält keine unterstützte Anki-Sammlungsdatei.');
}

export async function parseApkgImport(bytes: Uint8Array, sourceName?: string, options: ApkgParseOptions = {}): Promise<NormalizedImportBundle> {
  const bundle = emptyImportBundle('apkg', sourceName);
  const limits: ApkgSafetyLimits = { ...DEFAULT_APKG_SAFETY_LIMITS, ...options.safetyLimits };
  if (bytes.byteLength > limits.maxArchiveBytes) {
    bundle.warnings.push({ code: 'ARCHIVE_LIMIT', message: `Das APKG überschreitet das Sicherheitslimit von ${Math.round(limits.maxArchiveBytes / MIB)} MiB.`, blocking: true });
    return bundle;
  }

  const controlEntries = unzipControlEntries(bytes, bundle, limits);
  if (!controlEntries) return bundle;
  const decompressZstd = options.decompressZstd ?? decompress;
  const collection = selectCollection(controlEntries, decompressZstd);
  if (collection.bytes.byteLength > limits.maxDecodedCollectionBytes) {
    bundle.warnings.push({
      code: 'ARCHIVE_LIMIT',
      message: `Die dekodierte Anki-Sammlung überschreitet das Sicherheitslimit von ${Math.round(limits.maxDecodedCollectionBytes / MIB)} MiB.`,
      sourceId: collection.name,
      blocking: true,
    });
    return bundle;
  }
  bundle.metadata.collectionFile = collection.name;
  const mediaEntries = unzipMediaEntries(bytes, bundle, limits);
  await extractMedia({ ...controlEntries, ...mediaEntries }, bundle, collection.name, decompressZstd, limits);

  const SQL = options.sql ?? await loadSql();
  const db = new SQL.Database(collection.bytes);
  try {
    const tables = tableNames(db);
    if (!tables.has('notes') || !tables.has('cards') || !tables.has('col')) {
      bundle.warnings.push({ code: 'UNSUPPORTED_ANKI_SCHEMA', message: 'Die entpackte Anki-Datenbank enthält nicht die erwarteten notes/cards/col-Tabellen.', blocking: true });
      return bundle;
    }
    const versionRow = rows(db, 'SELECT ver FROM col LIMIT 1')[0];
    bundle.metadata.ankiSchemaVersion = versionRow ? numberValue(versionRow.ver) : undefined;
    const modern = tables.has('notetypes') && tables.has('fields') && tables.has('templates') && tables.has('decks');
    bundle.metadata.modernSchema = modern;

    const legacy = modern ? undefined : parseLegacyMetadata(db);
    const modernMeta = modern ? parseModernMetadata(db) : undefined;
    const cardsByNote = new Map<string, NormalizedImportCard[]>();
    const noteTypeByNote = new Map<string, string>();
    for (const note of rows(db, 'SELECT id, mid FROM notes')) noteTypeByNote.set(stringValue(note.id), stringValue(note.mid));
    for (const card of rows(db, 'SELECT id, nid, did, ord FROM cards ORDER BY id')) {
      const noteId = stringValue(card.nid);
      const mid = noteTypeByNote.get(noteId) ?? '';
      const did = stringValue(card.did);
      const ord = numberValue(card.ord);
      const deckName = modernMeta?.decks.get(did) ?? legacy?.decks.get(did) ?? `Deck ${did}`;
      const templateName = modernMeta?.templateNames.get(mid)?.get(ord) ?? legacy?.templates.get(mid)?.get(ord)?.name;
      const legacyTemplate = legacy?.templates.get(mid)?.get(ord);
      const list = cardsByNote.get(noteId) ?? [];
      list.push({
        sourceCardId: stringValue(card.id),
        deckId: did,
        deckPath: deckPath(deckName),
        templateOrdinal: ord,
        templateName,
        rawFrontTemplate: legacyTemplate?.qfmt,
        rawBackTemplate: legacyTemplate?.afmt,
      });
      cardsByNote.set(noteId, list);
    }

    for (const note of rows(db, 'SELECT id, mid, flds, tags FROM notes ORDER BY id')) {
      const noteId = stringValue(note.id);
      const mid = stringValue(note.mid);
      const names = modernMeta?.fields.get(mid) ?? legacy?.fields.get(mid) ?? [];
      const fields = fieldObjects(names, stringValue(note.flds));
      bundle.notes.push({
        sourceNoteId: noteId,
        noteTypeId: mid,
        noteTypeName: modernMeta?.noteTypes.get(mid) ?? legacy?.noteTypes.get(mid),
        fields,
        tags: tagsFromAnki(stringValue(note.tags)),
        cards: cardsByNote.get(noteId) ?? [],
        clozeDetected: containsCloze(fields),
      });
    }

    if (legacy && [...legacy.templates.values()].some(templates => templates.size)) {
      bundle.warnings.push({ code: 'UNSAFE_TEMPLATE_IGNORED', message: 'Anki-Template-HTML wurde nur als nicht ausführbare Metadaten eingelesen. JavaScript, HTML und lokale Dateiverweise aus Templates werden niemals ausgeführt.' });
    } else if (modern) {
      bundle.warnings.push({ code: 'UNSAFE_TEMPLATE_IGNORED', message: 'Moderne Anki-Template-Namen wurden übernommen; binäre Template-Konfigurationen werden aus Sicherheitsgründen nicht ausgeführt oder als HTML gerendert.' });
    }
    return bundle;
  } finally {
    db.close();
  }
}
