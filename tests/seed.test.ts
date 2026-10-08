import { describe, it, expect } from 'vitest';
import { buildSeedLedger } from '../src/lib/seed';
import { verifyLedger } from '../src/lib/crypto';

describe('Deterministic Seed Ledger (Requirement 1 & 5)', () => {
  it('builds exactly 8 pre-built entries with 7 DECISION and 1 HUMAN_REVIEW', async () => {
    const { ledger, cases } = await buildSeedLedger();
    expect(ledger).toHaveLength(8);
    expect(cases).toHaveLength(7);

    const decisionCount = ledger.filter(e => e.event_type === 'DECISION').length;
    const humanReviewCount = ledger.filter(e => e.event_type === 'HUMAN_REVIEW').length;

    expect(decisionCount).toBe(7);
    expect(humanReviewCount).toBe(1);
  });

  it('builds the seed twice and asserts the head hashes are equal and verifyLedger passes', async () => {
    const seed1 = await buildSeedLedger();
    const seed2 = await buildSeedLedger();

    // Head hashes must be identical
    expect(seed1.headHash).toBe(seed2.headHash);
    expect(seed1.headHash).toHaveLength(64);

    // Every single entry hash must be equal
    for (let i = 0; i < 8; i++) {
      expect(seed1.ledger[i].entry_hash).toBe(seed2.ledger[i].entry_hash);
      expect(seed1.ledger[i].prev_hash).toBe(seed2.ledger[i].prev_hash);
      expect(seed1.ledger[i].seq).toBe(i + 1);
    }

    // verifyLedger must pass on both
    const audit1 = await verifyLedger(seed1.ledger);
    expect(audit1.isValid).toBe(true);
    expect(audit1.totalEntries).toBe(8);

    const audit2 = await verifyLedger(seed2.ledger);
    expect(audit2.isValid).toBe(true);
    expect(audit2.totalEntries).toBe(8);
  });
});
