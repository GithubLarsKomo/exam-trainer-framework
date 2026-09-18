# Enterprise Leadership N-1 — Hosted Release Source

Status: **approved hosted release source**  
Release: `enterprise-leadership-n1@0.3.0`  
Date: 2026-09-18

## Purpose

This file records provenance for the deterministic compressed source used by the ETF hosted-catalog build. The generated files under `public/catalogs/` remain build outputs and are not the source of truth.

## Source chain

- Original trainer bundle: `leadership-trainer-v0.2-bundle.zip`
  - SHA-256: `f90ee31d72ffb075bca0efe9c46d9663df59ebbd9169c089bb769fde43bbe40e`
- ETF integration candidate: `leadership-trainer-v0.3-integration-candidate.zip`
  - SHA-256: `25c3fd2d07db9194cb5d5adf7d1d048a50c07cf91df1f71629675bc0316af655`
- Released source JSON before gzip:
  - SHA-256: `a7b8a45f307be0024472b1fd85b62db9aea9b7fb363e029fbb3de24a0e9c26ee`
- Repository source file: `catalogs/sources/enterprise-leadership-n1-v0.3.0.json.gz`
  - deterministic gzip SHA-256: `22aa8af7b180aa251c7f4abc4d3c8262369e0c4f3a3cd3b1d686628ba1a1c747`

## Release transformation

The v0.2 semantic catalog was not rewritten. The controlled release transformation changes only:

- catalog version: `0.2.0 -> 0.3.0`;
- catalog description to correctly state twelve knowledge/competency objects;
- release timestamps;
- all 12 KnowledgeItems: `draft -> released`;
- all 36 QuestionVariants: `draft -> released`.

Stable KnowledgeItem IDs, QuestionVariant IDs, prompts, model answers, competency classes, source references and learning semantics are preserved.

## Structural release facts

- 12 KnowledgeItems.
- 36 QuestionVariants.
- 12 `knowledge` variants.
- 12 `application` variants.
- 12 `transfer` variants.
- No binary `assetRefs`.
- Catalog ID: `enterprise-leadership-n1`.

## Approval

The shared hosted release was explicitly requested on 2026-09-18 after the deep-link runtime and release boundaries were reviewed. Publication remains subject to ETF build validation and CI.

This is a pedagogical content release. It is not an HR qualification, QMS training authorization, regulatory certification or employment assessment.
