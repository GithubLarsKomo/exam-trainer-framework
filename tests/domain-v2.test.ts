import { describe, expect, it } from 'vitest';
import { cardVersionToKnowledgeItem, type CardVersion } from '../src/model';

function legacyCard(): CardVersion {
  return {
    id: 'ft-demo',
    version: 3,
    status: 'released',
    topicId: 'Grundlagen',
    examQuestion: '1a',
    title: 'Demo',
    prompt: 'Was ist Stoffschluss?',
    points: 2,
    difficulty: 2,
    tags: ['exam'],
    questionType: 'free_text',
    answer: { modelAnswer: 'Eine stoffschlüssige Verbindung.', requiredTerms: ['stoffschlüssig'] },
    source: 'script.pdf',
    sourcePage: '12',
    changeReason: 'Reviewed',
    changedAt: '2026-07-24T00:00:00.000Z',
  };
}

describe('KnowledgeItem legacy projection', () => {
  it('maps one legacy card losslessly to one knowledge item and one question variant', () => {
    const card = legacyCard();
    const item = cardVersionToKnowledgeItem(card);

    expect(item.id).toBe(card.id);
    expect(item.version).toBe(card.version);
    expect(item.topicId).toBe(card.topicId);
    expect(item.questionVariants).toHaveLength(1);
    expect(item.questionVariants[0]).toMatchObject({
      id: 'ft-demo:q1',
      knowledgeItemId: 'ft-demo',
      legacyCardId: 'ft-demo',
      prompt: card.prompt,
      questionType: card.questionType,
      points: card.points,
    });
    expect(item.questionVariants[0].answer).toEqual(card.answer);
  });

  it('does not alias mutable answer and tag structures from the legacy card', () => {
    const card = legacyCard();
    const item = cardVersionToKnowledgeItem(card);
    item.questionVariants[0].answer.modelAnswer = 'Changed';
    item.tags.push('new');

    expect(card.answer.modelAnswer).toBe('Eine stoffschlüssige Verbindung.');
    expect(card.tags).toEqual(['exam']);
  });
});
