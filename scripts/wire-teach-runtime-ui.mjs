import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/v04.ts';
let source = readFileSync(path, 'utf8');

const replacements = [
  [
    "import { legacyQuestionVariantId, type AppState, type CardVersion, type Catalog, type ExamBlueprint, type Outcome, type Progress, type QuestionType, type QueueReasonCode } from './model';",
    "import { type AppState, type CardVersion, type Catalog, type ExamBlueprint, type Outcome, type Progress, type QuestionType, type QueueReasonCode } from './model';\nimport { runtimeQuestionsForCatalog, type RuntimeQuestion } from './knowledge-learning-runtime';",
  ],
  ["let queue:CardVersion[]=[];", "let queue:RuntimeQuestion[]=[];"],
  ["let current:CardVersion|undefined;", "let current:RuntimeQuestion|undefined;"],
  [
    "const activeCards=()=>activeCatalog().cards.filter(c=>c.status==='released');",
    "const activeCards=()=>runtimeQuestionsForCatalog(activeCatalog(),state.reviewEvents);",
  ],
  [
    ".filter((card):card is CardVersion=>Boolean(card));",
    ".filter((card):card is RuntimeQuestion=>Boolean(card));",
  ],
  [
    "applyReview(state,{knowledgeItemId:current.id,questionVariantId:legacyQuestionVariantId(current.id),cardVersion:current.version}",
    "applyReview(state,{knowledgeItemId:current.knowledgeItemId,questionVariantId:current.questionVariantId,cardVersion:current.version}",
  ],
];

for (const [before, after] of replacements) {
  const occurrences = source.split(before).length - 1;
  if (occurrences !== 1) {
    throw new Error(`Expected exactly one occurrence for patch anchor, found ${occurrences}: ${before}`);
  }
  source = source.replace(before, after);
}

writeFileSync(path, source);
