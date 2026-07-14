import { describe, it, expect } from 'vitest';
import { newId, newSlug, newOgId, hashSlug } from '../src/lib/tokens';

const BASE62 = /^[0-9A-Za-z]+$/;

describe('tokens', () => {
  it('generates ids/slugs of the right length and charset', () => {
    expect(newId()).toMatch(BASE62);
    expect(newId()).toHaveLength(12);
    expect(newSlug()).toMatch(BASE62);
    expect(newSlug()).toHaveLength(24);
    expect(newOgId()).toHaveLength(10);
  });

  it('generates unique slugs', () => {
    const seen = new Set(Array.from({ length: 1000 }, () => newSlug()));
    expect(seen.size).toBe(1000);
  });

  it('hashSlug is deterministic and pepper-sensitive', async () => {
    const a = await hashSlug('abc', 'pepper1');
    const b = await hashSlug('abc', 'pepper1');
    const c = await hashSlug('abc', 'pepper2');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});
