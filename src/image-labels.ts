import type { Catalog, ImageLabelHotspot } from './model';

export const MAX_IMAGE_LABEL_HOTSPOTS = 50;

export function normalizeImageLabelHotspots(hotspots: ImageLabelHotspot[]): ImageLabelHotspot[] {
  if (!hotspots.length) throw new Error('Mindestens ein Hotspot ist erforderlich.');
  if (hotspots.length > MAX_IMAGE_LABEL_HOTSPOTS) throw new Error(`Maximal ${MAX_IMAGE_LABEL_HOTSPOTS} Hotspots sind erlaubt.`);
  const ids = new Set<string>();
  return hotspots.map((hotspot, index) => {
    const id = hotspot.id.trim() || `h${index + 1}`;
    const label = hotspot.label.trim();
    if (!label) throw new Error(`Hotspot ${index + 1} benötigt eine Beschriftung.`);
    if (ids.has(id)) throw new Error(`Hotspot-ID ${id} ist doppelt.`);
    ids.add(id);
    if (!Number.isFinite(hotspot.x) || !Number.isFinite(hotspot.y) || hotspot.x < 0 || hotspot.x > 1 || hotspot.y < 0 || hotspot.y > 1) {
      throw new Error(`Hotspot ${id} liegt außerhalb des Bildes.`);
    }
    return { id, label, x:Math.round(hotspot.x * 10000) / 10000, y:Math.round(hotspot.y * 10000) / 10000 };
  });
}

export function configureImageLabelCard(catalog: Catalog, cardId: string, assetId: string, hotspots: ImageLabelHotspot[]): void {
  const asset = catalog.assets?.find(entry => entry.id === assetId);
  if (!asset || asset.kind !== 'image') throw new Error('Für Image Labels wird ein Bild-Asset benötigt.');
  const card = catalog.cards.find(entry => entry.id === cardId);
  if (!card) throw new Error('Zielkarte wurde nicht gefunden.');
  const normalized = normalizeImageLabelHotspots(hotspots);
  const refs = (card.assetRefs ?? []).filter(ref => !(ref.role === 'prompt' && ref.assetId !== assetId));
  if (!refs.some(ref => ref.assetId === assetId && ref.role === 'prompt')) {
    refs.push({ assetId, role:'prompt', sourceFileName:asset.fileName, altText:asset.altText });
  }
  card.assetRefs = refs;
  card.questionType = 'image_labels';
  card.answer.imageLabels = normalized;
  card.answer.modelAnswer = normalized.map((hotspot,index)=>`${index + 1}. ${hotspot.label}`).join('\n');
  card.changedAt = new Date().toISOString();
  catalog.updatedAt = new Date().toISOString();

  const item = catalog.knowledgeItems?.find(knowledge => knowledge.id === cardId);
  const variant = item?.questionVariants.find(question => question.legacyCardId === cardId || question.knowledgeItemId === cardId);
  if (variant) {
    variant.questionType = card.questionType;
    variant.answer = structuredClone(card.answer);
    variant.assetRefs = refs.map(ref => ({ ...ref }));
    variant.changedAt = card.changedAt;
  }
}

export function labelAnswers(hotspots: ImageLabelHotspot[], answers: Record<string,string>): Array<{id:string;expected:string;actual:string;matches:boolean}> {
  return hotspots.map(hotspot => {
    const actual = (answers[hotspot.id] ?? '').trim();
    const normalizedExpected = hotspot.label.trim().toLocaleLowerCase('de-DE');
    const normalizedActual = actual.toLocaleLowerCase('de-DE');
    return { id:hotspot.id, expected:hotspot.label, actual, matches:Boolean(actual) && normalizedActual === normalizedExpected };
  });
}
