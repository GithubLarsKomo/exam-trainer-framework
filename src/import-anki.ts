import { strFromU8, unzipSync } from 'fflate';
import { decompress } from 'fzstd';
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { emptyImportBundle, type NormalizedImportBundle, type NormalizedImportCard, type NormalizedImportField } from './import-model';

let sqlPromise: Promise<SqlJsStatic> | undefined;
function loadSql(): Promise<SqlJsStatic> {
  sqlPromise ??= initSqlJs({ locateFile: () => sqlWasmUrl });
  return sqlPromise;
}

export interface ApkgParseOptions {
  sql?: SqlJsStatic;
  decompressZstd?: (bytes: Uint8Array) => Uint8Array;
}

type SqlValue = string | number | Uint8Array | null;
type Row = Record<string, SqlValue>;

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

function extractMedia(entries: Record<string, Uint8Array>, bundle: NormalizedImportBundle): void {
  const control = new Set(['collection.anki2', 'collection.anki21', 'collection.anki21b', 'media', 'meta']);
  const mediaEntries = Object.entries(entries).filter(([name]) => !control.has(name));
  const mediaMapBytes = entries.media;
  let map: Record<string, string> = {};
  let unresolvedMap = false;
  if (mediaMapBytes) {
    try {
      const text = strFromU8(mediaMapBytes).trim();
      if (text.startsWith('{')) map = JSON.parse(text) as Record<string, string>;
      else unresolvedMap = true;
    } catch {
      unresolvedMap = true;
    }
  }
  for (const [archiveName, mediaBytes] of mediaEntries) bundle.media.push({ archiveName, fileName: map[archiveName], bytes: mediaBytes });
  if (unresolvedMap) bundle.warnings.push({ code: 'MODERN_MEDIA_MAP_UNRESOLVED', message: 'Das moderne binäre Anki-Medienverzeichnis wird noch nicht semantisch dekodiert. Mediendateien bleiben im Import-Bundle erhalten, aber ihre Originalnamen können fehlen.' });
  const unresolvedCount = bundle.media.filter(media => !media.fileName).length;
  if (unresolvedCount && mediaMapBytes) bundle.warnings.push({ code: 'UNMAPPED_MEDIA', message: `${unresolvedCount} Medieneinträge haben noch keinen aufgelösten Originaldateinamen.` });
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
  const entries = unzipSync(bytes);
  const collection = selectCollection(entries, options.decompressZstd ?? decompress);
  bundle.metadata.collectionFile = collection.name;
  extractMedia(entries, bundle);

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
