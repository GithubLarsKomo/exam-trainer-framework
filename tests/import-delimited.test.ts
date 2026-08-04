import { describe, expect, it } from 'vitest';
import { parseDelimitedImport, parseDelimitedRows } from '../src/import-delimited';
import { createImportPreview } from '../src/import-preview';

describe('delimited import', () => {
  it('parses quoted commas, embedded newlines and unicode', () => {
    const text = 'Front,Back,Tags\n"Was, genau?","Zeile 1\nZeile 2","prüfung wichtig"\n"Größe α","Antwort äöü",wissen';
    const bundle = parseDelimitedImport(text, 'csv', 'demo.csv');
    expect(bundle.notes).toHaveLength(2);
    expect(bundle.notes[0].fields[0].value).toBe('Was, genau?');
    expect(bundle.notes[0].fields[1].value).toBe('Zeile 1\nZeile 2');
    expect(bundle.notes[0].tags).toEqual(['prüfung', 'wichtig']);
    expect(bundle.notes[1].fields[0].value).toBe('Größe α');
  });

  it('parses TSV and reports row length mismatches without losing valid fields', () => {
    const bundle = parseDelimitedImport('Question\tAnswer\tTopic\nQ1\tA1\tT1\nQ2\tA2', 'tsv');
    expect(bundle.metadata.delimiter).toBe('\t');
    expect(bundle.notes).toHaveLength(2);
    expect(bundle.notes[1].fields[2].value).toBe('');
    expect(bundle.warnings.some(warning => warning.code === 'ROW_LENGTH_MISMATCH')).toBe(true);
  });

  it('supports escaped double quotes', () => {
    expect(parseDelimitedRows('A,B\n"say ""hello""",ok', ',')[1]).toEqual(['say "hello"', 'ok']);
  });
});

describe('safe import preview', () => {
  it('suggests Front/Back mapping and strips executable markup', () => {
    const bundle = parseDelimitedImport('Front,Back,Source\n"<script>alert(1)</script><b>Frage</b>","<img src=x onerror=alert(2)>Antwort","Doc <b>1</b>"', 'csv', 'unsafe.csv');
    const preview = createImportPreview(bundle);
    expect(preview.canCommit).toBe(true);
    expect(preview.mapping.questionField).toBe('Front');
    expect(preview.mapping.answerField).toBe('Back');
    expect(preview.candidates[0].prompt).toBe('Frage');
    expect(preview.candidates[0].modelAnswer).toBe('Antwort');
    expect(preview.candidates[0].source).toBe('Doc 1');
    expect(preview.candidates[0].prompt).not.toContain('script');
  });

  it('preserves cloze semantics without executing imported HTML', () => {
    const bundle = parseDelimitedImport('Text,Extra\n"Die {{c1::Mitose}} ist <b>Zellteilung</b>.",Merksatz', 'csv');
    const preview = createImportPreview(bundle, { questionField:'Text', answerField:'Extra', defaultTopic:'Biologie', defaultSource:'Import' });
    expect(preview.candidates[0].questionType).toBe('cloze');
    expect(preview.candidates[0].prompt).toContain('[…]');
    expect(preview.candidates[0].modelAnswer).toContain('Mitose');
    expect(preview.candidates[0].prompt).not.toContain('<b>');
  });
});
