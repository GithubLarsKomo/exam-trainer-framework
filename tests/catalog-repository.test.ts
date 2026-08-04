import { describe, expect, it } from 'vitest';
import { archiveCatalog, catalogExport, deleteCatalog, duplicateCatalog, parseCatalogExport, restoreCatalog } from '../src/catalog-repository';
import type { Catalog } from '../src/model';

const catalog=(id:string,archived=false):Catalog=>({catalogId:id,title:id,version:'1.0.0',createdAt:'2026-08-01T00:00:00.000Z',updatedAt:'2026-08-01T00:00:00.000Z',archived,cards:[]});

describe('catalog lifecycle',()=>{
  it('duplicates without reusing blueprint identity',()=>{const source={...catalog('a'),examBlueprint:{id:'a:primary',catalogId:'a',version:4,sections:[{topicId:'T',weight:1}]}};const copy=duplicateCatalog(source,new Date('2026-08-04T12:00:00Z'));expect(copy.catalogId).not.toBe(source.catalogId);expect(copy.examBlueprint).toMatchObject({catalogId:copy.catalogId,version:1});});
  it('archives active catalog and chooses another active catalog',()=>{const result=archiveCatalog([catalog('a'),catalog('b')],'a','a',new Date('2026-08-04T12:00:00Z'));expect(result.activeCatalogId).toBe('b');expect(result.catalogs.find(c=>c.catalogId==='a')?.archived).toBe(true);});
  it('requires archive before delete and never deletes the last catalog',()=>{expect(()=>deleteCatalog([catalog('a'),catalog('b')],'a','a')).toThrow(/archiviert/);const restored=restoreCatalog([catalog('a',true),catalog('b')],'a');expect(restored[0].archived).toBe(false);const result=deleteCatalog([catalog('a',true),catalog('b')],'a','b');expect(result.catalogs.map(c=>c.catalogId)).toEqual(['b']);expect(()=>deleteCatalog([catalog('a',true)],'a','a')).toThrow(/letzte/);});
  it('roundtrips the portable catalog format',()=>{const source={...catalog('a'),description:'Test'};expect(parseCatalogExport(catalogExport(source))).toEqual(source);});
});
