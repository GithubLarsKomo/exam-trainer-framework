import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { parseApkgImport } from '../src/import-anki';
import { createImportPreview } from '../src/import-preview';

let sqlPromise: Promise<SqlJsStatic> | undefined;
function loadSql(){return sqlPromise ??= initSqlJs({locateFile:()=>sqlWasmUrl});}

function legacyDb(SQL: SqlJsStatic): Uint8Array {
  const db: Database = new SQL.Database();
  db.run('CREATE TABLE col (ver integer, models text, decks text)');
  const models = JSON.stringify({
    100:{name:'Basic',flds:[{name:'Front',ord:0},{name:'Back',ord:1},{name:'Extra',ord:2}],tmpls:[{name:'Card 1',ord:0,qfmt:'<div>{{Front}}</div><script>alert(1)</script>',afmt:'{{FrontSide}}<hr>{{Back}}'}]},
  });
  const decks = JSON.stringify({1:{name:'Demo::Kapitel A'}});
  db.run('INSERT INTO col VALUES (11, ?, ?)', [models, decks]);
  db.run('CREATE TABLE notes (id integer primary key, mid integer, flds text, tags text)');
  db.run('CREATE TABLE cards (id integer primary key, nid integer, did integer, ord integer)');
  db.run('CREATE TABLE revlog (id integer primary key, cid integer, ease integer, ivl integer)');
  db.run('INSERT INTO notes VALUES (1,100,?,?)', ['Was ist <b>ATP</b>?\x1fAdenosintriphosphat\x1fEnergieüberträger',' biochemie exam ']);
  db.run('INSERT INTO cards VALUES (10,1,1,0)');
  db.run('INSERT INTO revlog VALUES (99,10,4,9999)');
  const bytes = db.export(); db.close(); return bytes;
}

function modernDb(SQL: SqlJsStatic): Uint8Array {
  const db: Database = new SQL.Database();
  db.run('CREATE TABLE col (ver integer)');
  db.run('INSERT INTO col VALUES (18)');
  db.run('CREATE TABLE notes (id integer primary key, mid integer, flds text, tags text)');
  db.run('CREATE TABLE cards (id integer primary key, nid integer, did integer, ord integer)');
  db.run('CREATE TABLE notetypes (id integer primary key, name text, mtime_secs integer, usn integer, config blob)');
  db.run('CREATE TABLE fields (ntid integer, ord integer, name text, config blob, primary key(ntid,ord))');
  db.run('CREATE TABLE templates (ntid integer, ord integer, name text, mtime_secs integer, usn integer, config blob, primary key(ntid,ord))');
  db.run('CREATE TABLE decks (id integer primary key, name text, mtime_secs integer, usn integer, common blob, kind blob)');
  db.run("INSERT INTO notetypes VALUES (200,'Cloze',0,0,X'')");
  db.run("INSERT INTO fields VALUES (200,0,'Text',X'')");
  db.run("INSERT INTO fields VALUES (200,1,'Extra',X'')");
  db.run("INSERT INTO templates VALUES (200,0,'Cloze',0,0,X'')");
  db.run("INSERT INTO decks VALUES (2,'Demo::Kapitel B',0,0,X'',X'')");
  db.run('INSERT INTO notes VALUES (2,200,?,?)', ['Die {{c1::Mitose}} ist Zellteilung.\x1fMerksatz',' zellbiologie ']);
  db.run('INSERT INTO cards VALUES (20,2,2,0)');
  const bytes = db.export(); db.close(); return bytes;
}

describe('APKG import',()=>{
  it('reads legacy content, decks, fields, tags and media without scheduling history',async()=>{
    const SQL=await loadSql();
    const archive=zipSync({
      'collection.anki2':legacyDb(SQL),
      media:strToU8(JSON.stringify({'0':'atp.png'})),
      '0':new Uint8Array([1,2,3]),
    });
    const bundle=await parseApkgImport(archive,'legacy.apkg',{sql:SQL});
    expect(bundle.metadata).toMatchObject({collectionFile:'collection.anki2',ankiSchemaVersion:11,modernSchema:false,schedulingImported:false});
    expect(bundle.notes).toHaveLength(1);
    expect(bundle.notes[0].fields.map(field=>field.name)).toEqual(['Front','Back','Extra']);
    expect(bundle.notes[0].tags).toEqual(['biochemie','exam']);
    expect(bundle.notes[0].cards[0]).toMatchObject({deckPath:['Demo','Kapitel A'],templateName:'Card 1'});
    expect(bundle.notes[0].cards[0].rawFrontTemplate).toContain('<script>');
    expect(bundle.media[0]).toMatchObject({archiveName:'0',fileName:'atp.png'});
    expect(bundle.warnings.some(w=>w.code==='UNSAFE_TEMPLATE_IGNORED')).toBe(true);
    expect(JSON.stringify(bundle)).not.toContain('9999');

    const preview=createImportPreview(bundle);
    expect(preview.candidates[0]).toMatchObject({topicId:'Demo / Kapitel A',prompt:'Was ist ATP?',modelAnswer:'Adenosintriphosphat'});
  });

  it('reads schema 15+ metadata from normalized tables and handles anki21b selection',async()=>{
    const SQL=await loadSql();
    const sqlite=modernDb(SQL);
    const archive=zipSync({'collection.anki21b':sqlite});
    const bundle=await parseApkgImport(archive,'modern.apkg',{sql:SQL,decompressZstd:bytes=>bytes});
    expect(bundle.metadata).toMatchObject({collectionFile:'collection.anki21b',ankiSchemaVersion:18,modernSchema:true,schedulingImported:false});
    expect(bundle.notes[0]).toMatchObject({noteTypeName:'Cloze',clozeDetected:true,tags:['zellbiologie']});
    expect(bundle.notes[0].fields.map(field=>field.name)).toEqual(['Text','Extra']);
    expect(bundle.notes[0].cards[0]).toMatchObject({deckPath:['Demo','Kapitel B'],templateName:'Cloze'});

    const preview=createImportPreview(bundle,{questionField:'Text',answerField:'Extra',topicFromDeck:true,defaultSource:'Anki Import'});
    expect(preview.candidates[0].questionType).toBe('cloze');
    expect(preview.candidates[0].prompt).toContain('[…]');
    expect(preview.candidates[0].modelAnswer).toContain('Mitose');
  });

  it('returns a blocking warning for unknown SQLite schemas instead of guessing',async()=>{
    const SQL=await loadSql();
    const db=new SQL.Database();
    db.run('CREATE TABLE col (ver integer)'); db.run('INSERT INTO col VALUES (99)');
    const archive=zipSync({'collection.anki21':db.export()}); db.close();
    const bundle=await parseApkgImport(archive,'unknown.apkg',{sql:SQL});
    expect(bundle.notes).toHaveLength(0);
    expect(bundle.warnings).toContainEqual(expect.objectContaining({code:'UNSUPPORTED_ANKI_SCHEMA',blocking:true}));
  });
});
