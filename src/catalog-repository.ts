import type { Catalog } from './model';

export interface CatalogLifecycleResult {
  catalogs: Catalog[];
  activeCatalogId: string;
}

export function createCatalog(title: string, now = new Date()): Catalog {
  const clean = title.trim();
  if (!clean) throw new Error('Katalogname darf nicht leer sein.');
  const at = now.toISOString();
  return { catalogId:`catalog-${crypto.randomUUID().slice(0,8)}`, title:clean, version:'0.1.0', createdAt:at, updatedAt:at, cards:[] };
}

export function duplicateCatalog(source: Catalog, now = new Date()): Catalog {
  const at=now.toISOString();
  const copy=structuredClone(source);
  copy.catalogId=`${source.catalogId}-copy-${now.getTime()}`;
  copy.title=`${source.title} – Kopie`;
  copy.version='0.1.0';
  copy.createdAt=at;
  copy.updatedAt=at;
  copy.archived=false;
  if(copy.examBlueprint){copy.examBlueprint.id=`${copy.catalogId}:primary`;copy.examBlueprint.catalogId=copy.catalogId;copy.examBlueprint.version=1;}
  return copy;
}

export function archiveCatalog(catalogs: Catalog[], catalogId: string, activeCatalogId: string, now = new Date()): CatalogLifecycleResult {
  const next=structuredClone(catalogs);
  const target=next.find(c=>c.catalogId===catalogId);
  if(!target) throw new Error('Katalog wurde nicht gefunden.');
  target.archived=true; target.updatedAt=now.toISOString();
  const available=next.filter(c=>!c.archived);
  if(!available.length) throw new Error('Mindestens ein aktiver Katalog muss erhalten bleiben.');
  return {catalogs:next,activeCatalogId:activeCatalogId===catalogId?available[0].catalogId:activeCatalogId};
}

export function restoreCatalog(catalogs: Catalog[], catalogId: string, now = new Date()): Catalog[] {
  const next=structuredClone(catalogs);
  const target=next.find(c=>c.catalogId===catalogId);
  if(!target) throw new Error('Katalog wurde nicht gefunden.');
  target.archived=false; target.updatedAt=now.toISOString();
  return next;
}

export function deleteCatalog(catalogs: Catalog[], catalogId: string, activeCatalogId: string): CatalogLifecycleResult {
  const target=catalogs.find(c=>c.catalogId===catalogId);
  if(!target) throw new Error('Katalog wurde nicht gefunden.');
  if(!target.archived) throw new Error('Ein Katalog muss vor dem endgültigen Löschen archiviert werden.');
  const next=catalogs.filter(c=>c.catalogId!==catalogId).map(c=>structuredClone(c));
  if(!next.length) throw new Error('Der letzte Katalog kann nicht gelöscht werden.');
  const active=next.find(c=>c.catalogId===activeCatalogId&&!c.archived)??next.find(c=>!c.archived)??next[0];
  return {catalogs:next,activeCatalogId:active.catalogId};
}

export function catalogExport(catalog: Catalog): string { return JSON.stringify({format:'etf-catalog',version:1,catalog},null,2); }

function isCatalog(value: unknown): value is Catalog {
  if(!value||typeof value!=='object')return false;
  const item=value as Partial<Catalog>;
  return typeof item.catalogId==='string'&&typeof item.title==='string'&&typeof item.version==='string'&&Array.isArray(item.cards);
}

export function parseCatalogExport(text: string): Catalog {
  const parsed=JSON.parse(text) as unknown;
  let candidate:unknown=parsed;
  if(parsed&&typeof parsed==='object'&&'catalog' in parsed) candidate=(parsed as {catalog?:unknown}).catalog;
  if(!isCatalog(candidate)) throw new Error('Ungültiges Katalogformat.');
  return structuredClone(candidate);
}
