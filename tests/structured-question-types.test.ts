import { describe, expect, it } from 'vitest';
import { cardVersionToKnowledgeItem, type CardVersion, type Catalog } from '../src/model';
import {
  compareClozeAnswer,
  configureStructuredQuestion,
  parseCaseStudyLines,
  parseChoiceLines,
  parseClozeSource,
  parseMatchingLines,
  parseOrderingLines,
  shuffledIds,
  structuredSource,
} from '../src/structured-question-types';

function baseCard(): CardVersion {
  return {
    id:'q1', version:1, status:'draft', topicId:'T', examQuestion:'', prompt:'Frage', points:1, difficulty:2,
    tags:[], questionType:'free_text', answer:{modelAnswer:''}, source:'Test', changedAt:'2026-08-04T00:00:00.000Z',
  };
}

function catalog(): Catalog {
  const card=baseCard();
  return {catalogId:'c',title:'C',version:'1',createdAt:'2026-08-04T00:00:00.000Z',updatedAt:'2026-08-04T00:00:00.000Z',cards:[card],knowledgeItems:[cardVersionToKnowledgeItem(card)]};
}

describe('structured question parsing',()=>{
  it('requires exactly one correct option for single choice',()=>{
    expect(parseChoiceLines('A\n* B\nC',false).filter(choice=>choice.correct)).toHaveLength(1);
    expect(()=>parseChoiceLines('* A\n* B',false)).toThrow(/Genau eine/);
  });

  it('supports multiple correct choices',()=>{
    const choices=parseChoiceLines('* A\nB\n* C',true);
    expect(choices.filter(choice=>choice.correct).map(choice=>choice.text)).toEqual(['A','C']);
  });

  it('parses native and Anki-style cloze markers',()=>{
    const parsed=parseClozeSource('Die {{Mitose}} ist {{c2::Zellteilung}}.');
    expect(parsed.prompt).toBe('Die [[b1]] ist [[b2]].');
    expect(parsed.blanks.map(blank=>blank.answer)).toEqual(['Mitose','Zellteilung']);
    expect(compareClozeAnswer(' mitose ',parsed.blanks[0])).toBe(true);
  });

  it('parses matching, ordering and case-study sources',()=>{
    expect(parseMatchingLines('A => 1\nB => 2')).toHaveLength(2);
    expect(parseOrderingLines('Erster\nZweiter')).toMatchObject([{text:'Erster'},{text:'Zweiter'}]);
    expect(parseCaseStudyLines('Befund? => Ursache\nMaßnahme? => Kontrolle')).toHaveLength(2);
  });

  it('rejects ambiguous matching targets and duplicate ordering labels',()=>{
    expect(()=>parseMatchingLines('A => X\nB => X')).toThrow(/eindeutig/);
    expect(()=>parseOrderingLines('A\nA')).toThrow(/eindeutig/);
  });
});

describe('structured question catalog configuration',()=>{
  it('configures single choice and mirrors it into the KnowledgeItem variant',()=>{
    const cat=catalog();
    const card=configureStructuredQuestion(cat,'q1','single_choice','A\n* B\nC');
    expect(card.questionType).toBe('single_choice');
    expect(card.answer.modelAnswer).toBe('B');
    expect(cat.knowledgeItems?.[0].questionVariants[0]).toMatchObject({questionType:'single_choice',answer:{modelAnswer:'B'}});
    expect(structuredSource(card)).toBe('A\n* B\nC');
  });

  it('configures cloze by replacing authored blanks with stable prompt tokens',()=>{
    const cat=catalog();
    const card=configureStructuredQuestion(cat,'q1','cloze','Die {{Mitose}} ist eine Form der {{Zellteilung}}.');
    expect(card.prompt).toBe('Die [[b1]] ist eine Form der [[b2]].');
    expect(card.answer.modelAnswer).toContain('1. Mitose');
    expect(structuredSource(card)).toBe('Die {{Mitose}} ist eine Form der {{Zellteilung}}.');
  });

  it('configures all remaining structured types',()=>{
    const configs = [
      ['multiple_choice','* A\nB\n* C'],
      ['matching','A => 1\nB => 2'],
      ['ordering','A\nB\nC'],
      ['case_study','Was? => Das\nWarum? => Darum'],
    ] as const;
    for (const [type,source] of configs) {
      const cat=catalog();
      const card=configureStructuredQuestion(cat,'q1',type,source);
      expect(card.questionType).toBe(type);
      expect(card.answer.modelAnswer.length).toBeGreaterThan(0);
      expect(structuredSource(card)).toBe(source);
    }
  });
});

describe('deterministic ordering scramble',()=>{
  it('is stable for the same seed and not identical to source order',()=>{
    const source=['a','b','c','d'];
    const a=shuffledIds(source,'q1:ordering');
    const b=shuffledIds(source,'q1:ordering');
    expect(a).toEqual(b);
    expect(a).not.toEqual(source);
    expect([...a].sort()).toEqual([...source].sort());
  });
});
