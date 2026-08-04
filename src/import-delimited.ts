import { emptyImportBundle, type ImportSourceKind, type NormalizedImportBundle, type NormalizedImportField } from './import-model';

function detectDelimiter(text: string, requested?: ',' | '\t'): ',' | '\t' {
  if (requested) return requested;
  let comma = 0;
  let tab = 0;
  let quoted = false;
  for (let i = 0; i < Math.min(text.length, 10_000); i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') i++;
      else quoted = !quoted;
    } else if (!quoted && char === '\n') {
      break;
    } else if (!quoted && char === ',') comma++;
    else if (!quoted && char === '\t') tab++;
  }
  return tab > comma ? '\t' : ',';
}

export function parseDelimitedRows(text: string, delimiter: ',' | '\t'): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"' && field.length === 0) {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field.endsWith('\r') ? field.slice(0, -1) : field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (quoted) throw new Error('Unterminated quoted field in delimited import.');
  if (field.length || row.length) {
    row.push(field.endsWith('\r') ? field.slice(0, -1) : field);
    rows.push(row);
  }
  return rows;
}

function uniqueHeaders(raw: string[]): string[] {
  const counts = new Map<string, number>();
  return raw.map((value, index) => {
    const base = value.trim() || `Field ${index + 1}`;
    const count = (counts.get(base) ?? 0) + 1;
    counts.set(base, count);
    return count === 1 ? base : `${base} (${count})`;
  });
}

function parseTags(fields: NormalizedImportField[]): string[] {
  const tagField = fields.find(field => /^tags?$/i.test(field.name));
  if (!tagField) return [];
  return [...new Set(tagField.value.split(/[\s,;]+/).map(value => value.trim()).filter(Boolean))];
}

function containsCloze(fields: NormalizedImportField[]): boolean {
  return fields.some(field => /\{\{c\d+::[\s\S]+?\}\}/i.test(field.value));
}

export function parseDelimitedImport(
  text: string,
  sourceKind: Extract<ImportSourceKind, 'csv' | 'tsv'>,
  sourceName?: string,
): NormalizedImportBundle {
  const requested = sourceKind === 'tsv' ? '\t' : undefined;
  const delimiter = detectDelimiter(text.replace(/^\uFEFF/, ''), requested);
  const rows = parseDelimitedRows(text.replace(/^\uFEFF/, ''), delimiter);
  const bundle = emptyImportBundle(sourceKind, sourceName);
  bundle.metadata.delimiter = delimiter;

  if (!rows.length) {
    bundle.warnings.push({ code: 'MISSING_HEADER', message: 'Die Datei enthält keine Kopfzeile.', blocking: true });
    return bundle;
  }

  const headers = uniqueHeaders(rows[0]);
  bundle.metadata.headers = headers;
  if (!headers.some(header => header.trim())) {
    bundle.warnings.push({ code: 'MISSING_HEADER', message: 'Die Kopfzeile enthält keine Feldnamen.', blocking: true });
    return bundle;
  }

  for (let index = 1; index < rows.length; index++) {
    const values = rows[index];
    if (values.length === 1 && values[0].trim() === '') continue;
    if (values.length !== headers.length) {
      bundle.warnings.push({
        code: 'ROW_LENGTH_MISMATCH',
        message: `Zeile ${index + 1} enthält ${values.length} statt ${headers.length} Felder. Fehlende Felder werden leer ergänzt; zusätzliche Felder werden ignoriert.`,
        sourceId: `row:${index + 1}`,
      });
    }
    const fields = headers.map((name, ordinal) => ({ name, ordinal, value: values[ordinal] ?? '' }));
    if (!fields.some(field => field.value.trim())) {
      bundle.warnings.push({ code: 'EMPTY_NOTE', message: `Zeile ${index + 1} enthält keine Inhalte und wurde übersprungen.`, sourceId: `row:${index + 1}` });
      continue;
    }
    bundle.notes.push({
      sourceNoteId: `row:${index + 1}`,
      fields,
      tags: parseTags(fields),
      cards: [{ sourceCardId: `row:${index + 1}:card`, deckPath: [] }],
      clozeDetected: containsCloze(fields),
    });
  }
  return bundle;
}
