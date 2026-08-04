import { describe, expect, it } from 'vitest';
import { cardVersionToKnowledgeItem, type AssetManifestEntry, type CardVersion, type Catalog } from '../src/model';
import { configureImageLabelCard, labelAnswers, normalizeImageLabelHotspots } from '../src/image-labels';

function fixture(): Catalog {
  const asset: AssetManifestEntry = {
    id:`asset:${'a'.repeat(64)}`, fileName:'diagram.png', mediaType:'image/png', kind:'image', byteLength:123, sha256:'a'.repeat(64), source:'local', createdAt:'2026-08-04T08:00:00Z', altText:'Diagramm',
  };
  const card: CardVersion = {
    id:'card-1', version:1, status:'released', topicId:'Demo', examQuestion:'', prompt:'Beschrifte das Bild', points:3, difficulty:2,
    tags:[], questionType:'free_text', answer:{modelAnswer:'Alt'}, source:'Test', changedAt:'2026-08-04T08:00:00Z',
  };
  return { catalogId:'demo', title:'Demo', version:'1.0.0', createdAt:'2026-08-04T08:00:00Z', updatedAt:'2026-08-04T08:00:00Z', assets:[asset], cards:[card], knowledgeItems:[cardVersionToKnowledgeItem(card)] };
}

describe('image label hotspots', () => {
  it('normalizes responsive coordinates and rejects invalid points', () => {
    expect(normalizeImageLabelHotspots([{id:'h1',label:' Naht ',x:0.123456,y:0.987654}])).toEqual([{id:'h1',label:'Naht',x:0.1235,y:0.9877}]);
    expect(() => normalizeImageLabelHotspots([{id:'h1',label:'X',x:-0.1,y:0.5}])).toThrow(/außerhalb/);
    expect(() => normalizeImageLabelHotspots([{id:'h1',label:' ',x:0.5,y:0.5}])).toThrow(/Beschriftung/);
  });

  it('configures the card, prompt image and KnowledgeItem variant together', () => {
    const catalog=fixture();
    const assetId=catalog.assets![0].id;
    configureImageLabelCard(catalog,'card-1',assetId,[
      {id:'h1',label:'Wurzel',x:0.25,y:0.4},
      {id:'h2',label:'Krone',x:0.75,y:0.2},
    ]);
    const card=catalog.cards[0];
    expect(card.questionType).toBe('image_labels');
    expect(card.assetRefs).toEqual([{assetId,role:'prompt',sourceFileName:'diagram.png',altText:'Diagramm'}]);
    expect(card.answer.modelAnswer).toBe('1. Wurzel\n2. Krone');
    expect(card.answer.imageLabels).toHaveLength(2);
    const variant=catalog.knowledgeItems![0].questionVariants[0];
    expect(variant.questionType).toBe('image_labels');
    expect(variant.answer.imageLabels).toEqual(card.answer.imageLabels);
    expect(variant.assetRefs).toEqual(card.assetRefs);
  });

  it('provides transparent exact-match comparison without auto-grading the review', () => {
    const result=labelAnswers([
      {id:'a',label:'Mitose',x:0.1,y:0.1},
      {id:'b',label:'Spindel',x:0.2,y:0.2},
    ],{a:'mitose',b:'Spindelapparat'});
    expect(result).toEqual([
      {id:'a',expected:'Mitose',actual:'mitose',matches:true},
      {id:'b',expected:'Spindel',actual:'Spindelapparat',matches:false},
    ]);
  });
});
