import { describe, expect, it } from 'vitest';
import { estimateRemainingMinutes, formatStorageBytes, sessionDraftKey, storageUsageLabel } from '../src/ux-status';

describe('UX status helpers',()=>{
  it('builds catalog/card scoped session draft keys',()=>{
    expect(sessionDraftKey('catalog-a','card-1')).toBe('etf:draft:catalog-a:card-1');
  });

  it('estimates remaining time from the median valid response time',()=>{
    expect(estimateRemainingMinutes(2,5,[30_000,60_000,90_000])).toBe(4);
  });

  it('uses a conservative fallback without history',()=>{
    expect(estimateRemainingMinutes(1,4,[])).toBe(5);
  });

  it('formats browser storage usage',()=>{
    expect(formatStorageBytes(1536)).toBe('1.5 KiB');
    expect(storageUsageLabel(1024*1024,4*1024*1024)).toBe('1.0 MiB von 4.0 MiB lokal belegt');
  });
});
