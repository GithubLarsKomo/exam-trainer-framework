import { describe, expect, it } from 'vitest';
import { createCatalogFromImportPreview } from '../src/import-commit';
import type { ImportPreview } from '../src/import-model';

function preview(canCommit = true): ImportPreview {
  return {
    sourceKind: 'apkg',
    sourceName: 'demo.apkg',
    totalNotes: 1,
    warnings: [],
    canCommit,
    mapping: { questionField:'Front', answerField:'Back', defaultTopic:'Import', defaultSource:'Anki Import' },
    candidates: [{
      sourceNoteId: '42',
      id: 'import-42',
      topicId: 'Deck / Kapitel',
      prompt: 'Frage',
      modelAnswer: 'Antwort',
      explanation: 'Erklärung',
      source: 'Anki Import',
      tags: ['tag','tag'],
      questionType: 'free_text',
      variants: [{ sourceCardId:'100', deckPath:['Deck','Kapitel'], templateName:'Card 1' }],
    }],
  };
}

describe('import catalog commit',()=>{
  it('creates a new draft catalog and KnowledgeItem projection by default',()=>{
    const catalog=createCatalogFromImportPreview(preview(),{
      catalogId:'anki-demo',title:'Anki Demo',now:new Date('2026-08-04T08:00:00Z'),
    });
    expect(catalog).toMatchObject({catalogId:'anki-demo',title:'Anki Demo',version:'0.1.0'});
    expect(catalog.cards).toHaveLength(1);
    expect(catalog.cards[0]).toMatchObject({id:'import-42',status:'draft',topicId:'Deck / Kapitel',prompt:'Frage',source:'Anki Import'});
    expect(catalog.cards[0].tags).toEqual(['tag']);
    expect(catalog.cards[0].changeReason).toContain('sourceNoteId=42');
    expect(catalog.knowledgeItems?.[0]).toMatchObject({id:'import-42',canonicalContent:'Antwort',explanation:'Erklärung'});
    expect(catalog.description).toContain('Scheduling-Historie wurde nicht übernommen');
  });

  it('supports an explicit released commit after Preview approval',()=>{
    const catalog=createCatalogFromImportPreview(preview(),{catalogId:'released',title:'Released',status:'released'});
    expect(catalog.cards[0].status).toBe('released');
    expect(catalog.knowledgeItems?.[0].status).toBe('released');
  });

  it('rejects blocked previews',()=>{
    expect(()=>createCatalogFromImportPreview(preview(false),{catalogId:'blocked',title:'Blocked'})).toThrow(/blockierender Preview/);
  });
});
