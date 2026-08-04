import type {
  ImportCandidate,
  ImportMapping,
  ImportPreview,
  ImportWarning,
  NormalizedImportBundle,
  NormalizedImportNote,
} from './import-model';

function decodeEntities(value: string): string {
  const named: Record<string, string> = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  };
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_, entity: string) => {
    if (entity[0] === '#') {
      const hex = entity[1]?.toLowerCase() === 'x';
      const code = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    }
    return named[entity.toLowerCase()] ?? '';
  });
}

/** Converts untrusted imported HTML-like content to plain text. No imported markup is executed. */
export function importedContentToPlainText(value: string): string {
  return decodeEntities(value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:div|p|li|tr|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]*>/g, ' '))
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function fieldValue(note: NormalizedImportNote, fieldName?: string): string {
  if (!fieldName) return '';
  return note.fields.find(field => field.name === fieldName)?.value ?? '';
}

function mappedFieldValue(
  note: NormalizedImportNote,
  bundle: NormalizedImportBundle,
  fieldName: string | undefined,
  role: string,
  warnings: ImportWarning[],
): string {
  if (!fieldName) return '';
  const exact = note.fields.find(field => field.name === fieldName);
  if (exact) return exact.value;
  if (bundle.sourceKind !== 'apkg') return '';

  const reference = bundle.notes
    .flatMap(candidate => candidate.fields)
    .find(field => field.name === fieldName);
  if (!reference) return '';
  const fallback = note.fields.find(field => field.ordinal === reference.ordinal);
  if (!fallback) return '';

  warnings.push({
    code: 'FIELD_ORDINAL_FALLBACK',
    message: `${role} „${fieldName}“ fehlt im Notetype ${note.noteTypeName ?? note.noteTypeId ?? 'unbekannt'}; Feldposition ${reference.ordinal + 1} („${fallback.name}“) wird verwendet.`,
    sourceId: note.sourceNoteId,
  });
  return fallback.value;
}

function firstMatchingField(fieldNames: string[], patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const found = fieldNames.find(name => pattern.test(name));
    if (found) return found;
  }
  return undefined;
}

export function suggestImportMapping(bundle: NormalizedImportBundle): ImportMapping {
  const fieldNames = [...new Set(bundle.notes.flatMap(note => note.fields.map(field => field.name)))];
  const questionField = firstMatchingField(fieldNames, [/^front$/i, /^question$/i, /^frage$/i, /^prompt$/i, /^text$/i]) ?? fieldNames[0] ?? '';
  const answerField = firstMatchingField(fieldNames, [/^back$/i, /^answer$/i, /^antwort$/i, /^solution$/i, /^lösung$/i])
    ?? fieldNames.find(name => name !== questionField)
    ?? '';
  const explanationField = firstMatchingField(fieldNames, [/^explanation$/i, /^erklärung$/i, /^extra$/i, /^notes?$/i]);
  const sourceField = firstMatchingField(fieldNames, [/^source$/i, /^quelle$/i, /^reference$/i]);
  const topicField = firstMatchingField(fieldNames, [/^topic$/i, /^thema$/i, /^chapter$/i, /^kapitel$/i]);
  return {
    questionField,
    answerField,
    explanationField,
    sourceField,
    topicField,
    topicFromDeck: bundle.sourceKind === 'apkg',
    defaultTopic: 'Import',
    defaultSource: bundle.sourceName ? `Import: ${bundle.sourceName}` : 'Import',
    tagsAsTags: true,
  };
}

function clozePrompt(value: string): string {
  return value.replace(/\{\{c\d+::([\s\S]*?)(?:::[\s\S]*?)?\}\}/gi, ' […] ');
}

function clozeAnswer(value: string): string {
  return value.replace(/\{\{c\d+::([\s\S]*?)(?:::[\s\S]*?)?\}\}/gi, '$1');
}

function stableCandidateId(sourceNoteId: string): string {
  const normalized = sourceNoteId.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return `import-${normalized || 'note'}`;
}

function topicFor(note: NormalizedImportNote, mapping: ImportMapping): string {
  const explicit = importedContentToPlainText(fieldValue(note, mapping.topicField));
  if (explicit) return explicit;
  if (mapping.topicFromDeck) {
    const deck = note.cards.find(card => card.deckPath.length)?.deckPath;
    if (deck?.length) return deck.join(' / ');
  }
  return mapping.defaultTopic?.trim() || 'Import';
}

export function createImportPreview(bundle: NormalizedImportBundle, mapping: ImportMapping = suggestImportMapping(bundle)): ImportPreview {
  const warnings = [...bundle.warnings];
  if (!mapping.questionField || !mapping.answerField) {
    warnings.push({ code: 'MISSING_FIELD_MAPPING', message: 'Frage- und Antwortfeld müssen vor dem Import zugeordnet werden.', blocking: true });
  }

  const seenIds = new Set<string>();
  const candidates: ImportCandidate[] = [];
  for (const note of bundle.notes) {
    const questionRaw = mappedFieldValue(note, bundle, mapping.questionField, 'Fragefeld', warnings);
    const answerRaw = mappedFieldValue(note, bundle, mapping.answerField, 'Antwortfeld', warnings);
    const question = importedContentToPlainText(questionRaw);
    const answer = importedContentToPlainText(answerRaw);
    if (!question || !answer) {
      warnings.push({
        code: 'MISSING_MAPPED_CONTENT',
        message: 'Wissenseinheit ohne vollständig gemappte Frage und Musterantwort wurde übersprungen.',
        sourceId: note.sourceNoteId,
      });
      continue;
    }
    let id = stableCandidateId(note.sourceNoteId);
    if (seenIds.has(id)) {
      warnings.push({ code: 'DUPLICATE_SOURCE_ID', message: `Doppelte Import-ID ${id}; ID wurde erweitert.`, sourceId: note.sourceNoteId });
      let suffix = 2;
      while (seenIds.has(`${id}-${suffix}`)) suffix++;
      id = `${id}-${suffix}`;
    }
    seenIds.add(id);

    const source = importedContentToPlainText(mappedFieldValue(note, bundle, mapping.sourceField, 'Quellenfeld', warnings)) || mapping.defaultSource?.trim() || 'Import';
    const explanation = importedContentToPlainText(mappedFieldValue(note, bundle, mapping.explanationField, 'Erklärungsfeld', warnings)) || undefined;
    const isCloze = note.clozeDetected && /\{\{c\d+::/i.test(questionRaw);
    candidates.push({
      sourceNoteId: note.sourceNoteId,
      id,
      topicId: topicFor(note, mapping),
      prompt: isCloze ? importedContentToPlainText(clozePrompt(questionRaw)) : question,
      modelAnswer: isCloze ? importedContentToPlainText(clozeAnswer(questionRaw)) : answer,
      explanation,
      source,
      tags: mapping.tagsAsTags === false ? [] : [...note.tags],
      questionType: isCloze ? 'cloze' : 'free_text',
      variants: note.cards.map(card => ({
        sourceCardId: card.sourceCardId,
        deckPath: [...card.deckPath],
        templateName: card.templateName,
      })),
    });
  }

  return {
    sourceKind: bundle.sourceKind,
    sourceName: bundle.sourceName,
    totalNotes: bundle.notes.length,
    candidates,
    warnings,
    mapping,
    canCommit: candidates.length > 0 && !warnings.some(warning => warning.blocking),
  };
}
