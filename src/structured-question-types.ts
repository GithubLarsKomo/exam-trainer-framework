import type {
  CardVersion,
  CaseStudyPart,
  Choice,
  ClozeBlank,
  MatchingPair,
  OrderingItem,
  QuestionType,
  Catalog,
} from './model';

export type StructuredQuestionType = Extract<QuestionType, 'single_choice'|'multiple_choice'|'cloze'|'matching'|'ordering'|'case_study'>;

const clean = (value: string) => value.trim();
const id = (prefix: string, index: number) => `${prefix}${index + 1}`;

function mirror(catalog: Catalog, card: CardVersion): void {
  const item = catalog.knowledgeItems?.find(entry => entry.id === card.id);
  if (!item) return;
  const variant = item.questionVariants.find(entry => entry.legacyCardId === card.id || entry.knowledgeItemId === card.id);
  if (!variant) return;
  variant.questionType = card.questionType;
  variant.prompt = card.prompt;
  variant.answer = structuredClone(card.answer);
  variant.changedAt = card.changedAt;
}

function cardFor(catalog: Catalog, cardId: string): CardVersion {
  const card = catalog.cards.find(entry => entry.id === cardId);
  if (!card) throw new Error('Zielkarte wurde nicht gefunden.');
  return card;
}

function touch(catalog: Catalog, card: CardVersion): void {
  const timestamp = new Date().toISOString();
  card.changedAt = timestamp;
  catalog.updatedAt = timestamp;
  mirror(catalog, card);
}

export function parseChoiceLines(text: string, multiple: boolean): Choice[] {
  const choices = text.split(/\r?\n/).map(clean).filter(Boolean).map((line, index) => {
    const correct = /^\*\s*/.test(line);
    return { id:id('o', index), text:line.replace(/^\*\s*/, '').trim(), correct };
  });
  if (choices.length < 2) throw new Error('Mindestens zwei Antwortoptionen sind erforderlich.');
  if (choices.some(choice => !choice.text)) throw new Error('Leere Antwortoptionen sind nicht zulässig.');
  const correctCount = choices.filter(choice => choice.correct).length;
  if (multiple ? correctCount < 1 : correctCount !== 1) {
    throw new Error(multiple ? 'Mindestens eine Option muss mit * als richtig markiert sein.' : 'Genau eine Option muss mit * als richtig markiert sein.');
  }
  return choices;
}

export function parseClozeSource(source: string): { prompt:string; blanks:ClozeBlank[] } {
  let index = 0;
  const blanks: ClozeBlank[] = [];
  const prompt = source.replace(/\{\{(?:c\d+::)?([^{}:]+)(?:::[^{}]+)?\}\}/gi, (_match, answer: string) => {
    const blank: ClozeBlank = { id:id('b', index++), answer:clean(answer) };
    blanks.push(blank);
    return `[[${blank.id}]]`;
  }).trim();
  if (!blanks.length) throw new Error('Der Lückentext benötigt mindestens eine {{Antwort}}-Lücke.');
  if (blanks.some(blank => !blank.answer)) throw new Error('Leere Lücken sind nicht zulässig.');
  return { prompt, blanks };
}

export function parseMatchingLines(text: string): MatchingPair[] {
  const pairs = text.split(/\r?\n/).map(clean).filter(Boolean).map((line, index) => {
    const split = line.split(/\s*=>\s*/);
    if (split.length !== 2 || !clean(split[0]) || !clean(split[1])) throw new Error(`Ungültige Zuordnung in Zeile ${index + 1}; Format: Links => Rechts`);
    return { id:id('m', index), left:clean(split[0]), right:clean(split[1]) };
  });
  if (pairs.length < 2) throw new Error('Mindestens zwei Zuordnungspaare sind erforderlich.');
  if (new Set(pairs.map(pair => pair.right.toLocaleLowerCase())).size !== pairs.length) throw new Error('Die rechten Zuordnungswerte müssen eindeutig sein.');
  return pairs;
}

export function parseOrderingLines(text: string): OrderingItem[] {
  const items = text.split(/\r?\n/).map(clean).filter(Boolean).map((line, index) => ({ id:id('r', index), text:line }));
  if (items.length < 2) throw new Error('Mindestens zwei Elemente sind für eine Reihenfolge erforderlich.');
  if (new Set(items.map(item => item.text.toLocaleLowerCase())).size !== items.length) throw new Error('Reihenfolge-Elemente müssen eindeutig sein.');
  return items;
}

export function parseCaseStudyLines(text: string): CaseStudyPart[] {
  const parts = text.split(/\r?\n/).map(clean).filter(Boolean).map((line, index) => {
    const separator = line.indexOf('=>');
    if (separator < 1) throw new Error(`Ungültige Teilfrage in Zeile ${index + 1}; Format: Teilfrage => Musterantwort`);
    const prompt = clean(line.slice(0, separator));
    const modelAnswer = clean(line.slice(separator + 2));
    if (!prompt || !modelAnswer) throw new Error(`Teilfrage ${index + 1} benötigt Frage und Musterantwort.`);
    return { id:id('c', index), prompt, modelAnswer };
  });
  if (!parts.length) throw new Error('Mindestens eine Fall-Teilfrage ist erforderlich.');
  return parts;
}

export function summarizeStructuredAnswer(card: CardVersion): string {
  switch (card.questionType) {
    case 'single_choice':
    case 'multiple_choice':
      return (card.answer.choices ?? []).filter(choice => choice.correct).map(choice => choice.text).join(' · ');
    case 'cloze':
      return (card.answer.clozeBlanks ?? []).map((blank, index) => `${index + 1}. ${blank.answer}`).join(' · ');
    case 'matching':
      return (card.answer.matchingPairs ?? []).map(pair => `${pair.left} → ${pair.right}`).join(' · ');
    case 'ordering':
      return (card.answer.orderingItems ?? []).map((item, index) => `${index + 1}. ${item.text}`).join(' · ');
    case 'case_study':
      return (card.answer.caseStudyParts ?? []).map((part, index) => `${index + 1}. ${part.modelAnswer}`).join(' · ');
    default:
      return card.answer.modelAnswer;
  }
}

export function configureStructuredQuestion(catalog: Catalog, cardId: string, type: StructuredQuestionType, source: string): CardVersion {
  const card = cardFor(catalog, cardId);
  card.questionType = type;
  card.answer.choices = undefined;
  card.answer.clozeBlanks = undefined;
  card.answer.matchingPairs = undefined;
  card.answer.orderingItems = undefined;
  card.answer.caseStudyParts = undefined;

  if (type === 'single_choice' || type === 'multiple_choice') {
    card.answer.choices = parseChoiceLines(source, type === 'multiple_choice');
  } else if (type === 'cloze') {
    const parsed = parseClozeSource(source);
    card.prompt = parsed.prompt;
    card.answer.clozeBlanks = parsed.blanks;
  } else if (type === 'matching') {
    card.answer.matchingPairs = parseMatchingLines(source);
  } else if (type === 'ordering') {
    card.answer.orderingItems = parseOrderingLines(source);
  } else if (type === 'case_study') {
    card.answer.caseStudyParts = parseCaseStudyLines(source);
  }
  card.answer.modelAnswer = summarizeStructuredAnswer(card);
  touch(catalog, card);
  return card;
}

export function structuredSource(card: CardVersion): string {
  switch (card.questionType) {
    case 'single_choice':
    case 'multiple_choice':
      return (card.answer.choices ?? []).map(choice => `${choice.correct ? '* ' : ''}${choice.text}`).join('\n');
    case 'cloze': {
      let source = card.prompt;
      for (const blank of card.answer.clozeBlanks ?? []) source = source.replace(`[[${blank.id}]]`, `{{${blank.answer}}}`);
      return source;
    }
    case 'matching':
      return (card.answer.matchingPairs ?? []).map(pair => `${pair.left} => ${pair.right}`).join('\n');
    case 'ordering':
      return (card.answer.orderingItems ?? []).map(item => item.text).join('\n');
    case 'case_study':
      return (card.answer.caseStudyParts ?? []).map(part => `${part.prompt} => ${part.modelAnswer}`).join('\n');
    default:
      return '';
  }
}

export function validateStructuredQuestion(card: CardVersion): string[] {
  const errors: string[] = [];
  try {
    switch (card.questionType) {
      case 'single_choice': parseChoiceLines(structuredSource(card), false); break;
      case 'multiple_choice': parseChoiceLines(structuredSource(card), true); break;
      case 'cloze': parseClozeSource(structuredSource(card)); break;
      case 'matching': parseMatchingLines(structuredSource(card)); break;
      case 'ordering': parseOrderingLines(structuredSource(card)); break;
      case 'case_study': parseCaseStudyLines(structuredSource(card)); break;
    }
  } catch (error) {
    errors.push(String(error instanceof Error ? error.message : error));
  }
  return errors;
}

export function normalizedAnswer(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[\s\p{P}]+/gu, ' ').trim();
}

export function compareClozeAnswer(answer: string, blank: ClozeBlank): boolean {
  const accepted = [blank.answer, ...(blank.aliases ?? [])].map(normalizedAnswer);
  return accepted.includes(normalizedAnswer(answer));
}

export function shuffledIds(ids: string[], seed: string): string[] {
  if (ids.length < 2) return [...ids];
  let hash = 2166136261;
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  const out = [...ids];
  for (let index = out.length - 1; index > 0; index--) {
    hash = (Math.imul(hash, 1664525) + 1013904223) >>> 0;
    const swap = hash % (index + 1);
    [out[index], out[swap]] = [out[swap], out[index]];
  }
  if (out.every((value, index) => value === ids[index])) [out[0], out[1]] = [out[1], out[0]];
  return out;
}
