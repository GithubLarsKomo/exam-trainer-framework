# Hosted Catalog Registry v1

## Purpose

The Hosted Catalog Registry is a read-only discovery contract for reusable ETF catalogs. It publishes application/content metadata only. Learner progress, ReviewEvents, sessions, scheduler state and other IndexedDB data remain local to the browser.

This first step intentionally implements the **trust and download core only**. Catalog-management UI and publication automation are separate follow-up changes.

## Registry contract

```json
{
  "schemaVersion": 1,
  "catalogs": [
    {
      "id": "skillz-wayfinder",
      "version": "1.0.0",
      "title": "Wayfinder practice",
      "catalogUrl": "./skillz-wayfinder.json",
      "contentHash": "sha256:<64 lowercase hex characters>",
      "status": "released",
      "description": "Optional description",
      "tags": ["skillz", "engineering"]
    }
  ]
}
```

Registry identity is `(id, version)` and must be unique.

## Download trust boundary

A registry entry is not sufficient to install a catalog. ETF performs all of the following before returning a downloaded catalog to the local-import layer:

1. resolve `catalogUrl` relative to the registry URL;
2. require HTTP(S) and reject embedded URL credentials;
3. reject HTTPS-to-HTTP downgrade;
4. fetch catalog bytes with `cache: no-store`;
5. calculate SHA-256 over the exact response bytes;
6. require equality with `contentHash`;
7. parse the bytes through ETF's canonical catalog parser;
8. require registry `id == catalog.catalogId`;
9. require registry `version == catalog.version`;
10. require all included legacy cards, KnowledgeItems and QuestionVariants to be `released`.

A local catalog with the same `catalogId` is never overwritten implicitly. Replacement requires an explicit caller decision.

## v1 asset limitation

Registry v1 supports JSON-only catalogs. A catalog containing `assetRefs` is rejected because a catalog hash cannot authenticate external binary assets by itself.

A later registry/bundle version may add an asset manifest containing, at minimum, immutable asset identifiers, content hashes, byte lengths and media types. Until that contract exists, silently downloading unverified asset URLs would weaken ETF's existing safe asset pipeline and is forbidden.

## Supported catalog envelopes

The canonical parser accepts ETF catalog JSON directly or an envelope containing a `catalog` property, including the existing Teach interoperability bundle. The downloaded catalog itself must still match the registry identity and release gates.

## Local persistence

The registry core does not write IndexedDB itself. It returns a verified `Catalog`; the caller may then use the local ETF state/repository path to install it.

This preserves the ownership boundary:

```text
Hosted server
  -> released catalog bytes
  -> registry hash verification
  -> ETF catalog validation
  -> explicit local import
  -> browser IndexedDB

Learner state never travels in the reverse direction.
```

## Publication

Registry v1 does not create or approve releases. Publication remains a separate controlled content-lifecycle concern. In particular, Teach-generated `personal-local-runtime` content is not automatically eligible for a reusable hosted registry merely because it can run locally.
