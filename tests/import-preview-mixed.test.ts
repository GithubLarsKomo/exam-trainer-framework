import { describe, expect, it } from 'vitest';
import { createImportPreview } from '../src/import-preview';
import type { NormalizedImportBundle } from '../src/import-model';

const bundle: NormalizedImportBundle = {
  sourceKind: 'apkg',
  sourceName: 'mixed.apkg',
  media: [],
  warnings: [],
  metadata: { schedulingImported:false, collectionFile:'collection.anki21b', ankiSchemaVersion:18, modernSchema:true },
  notes: [
    {
      sourceNoteId:'1', noteTypeName:'Basic', tags:[], clozeDetected:false,
      fields:[{name:'Front',ordinal:0,value:'Basic question'},{name:'Back',ordinal:1,value:'Basic answer'}],
      cards:[{sourceCardId:'10',deckPath:['Deck','Basic']}],
    },
    {
      sourceNoteId:'2', noteTypeName:'Cloze', tags:[], clozeDetected:true,
      fields:[{name:'Text',ordinal:0,value:'Die {{c1::Mitose}} ist Zellteilung.'},{name:'Extra',ordinal:1,value:'Cloze extra'}],
      cards:[{sourceCardId:'20',deckPath:['Deck','Cloze']}],
    },
  ],
};

describe('mixed notetype import preview',()=>{
  it('uses warned ordinal fallback when mapped field names differ by notetype',()=>{
    const preview=createImportPreview(bundle,{
      questionField:'Front',answerField:'Back',topicFromDeck:true,defaultSource:'Anki Import',defaultTopic:'Import',
    });
    expect(preview.candidates).toHaveLength(2);
    expect(preview.candidates[0]).toMatchObject({prompt:'Basic question',modelAnswer:'Basic answer',topicId:'Deck / Basic'});
    expect(preview.candidates[1].questionType).toBe('cloze');
    expect(preview.candidates[1].prompt).toContain('[…]');
    expect(preview.candidates[1].modelAnswer).toContain('Mitose');
    expect(preview.warnings.filter(w=>w.code==='FIELD_ORDINAL_FALLBACK')).toHaveLength(2);
  });

  it('skips incomplete mapped content instead of committing malformed cards',()=>{
    const broken:NormalizedImportBundle={...bundle,notes:[{
      sourceNoteId:'3',noteTypeName:'Broken',tags:[],clozeDetected:false,
      fields:[{name:'Front',ordinal:0,value:'Question only'},{name:'Back',ordinal:1,value:''}],cards:[],
    }]};
    const preview=createImportPreview(broken,{questionField:'Front',answerField:'Back',defaultSource:'Import',defaultTopic:'Import'});
    expect(preview.candidates).toHaveLength(0);
    expect(preview.canCommit).toBe(false);
    expect(preview.warnings.some(w=>w.code==='MISSING_MAPPED_CONTENT')).toBe(true);
  });
});
