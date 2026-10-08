import { describe, it, expect, beforeEach } from 'vitest';
import { store } from '../src/lib/store';
import { PRE_RECORDED_ANCHOR } from '../src/lib/anchorConfig';

describe('Manual Anchoring & Real Verification (Requirement 1-4)', () => {
  beforeEach(async () => {
    await store.resetDemo();
  });

  it('PRE_RECORDED_ANCHOR has valid contract address and transaction hash', () => {
    const contractRegex = /^0x[0-9a-fA-F]{40}$/;
    const txRegex = /^0x[0-9a-fA-F]{64}$/;

    expect(contractRegex.test(PRE_RECORDED_ANCHOR.contractAddress)).toBe(true);
    expect(txRegex.test(PRE_RECORDED_ANCHOR.txHash)).toBe(true);
    expect(PRE_RECORDED_ANCHOR.network).toBe('Sepolia');
  });

  it('verifyAgainstAnchor returns GREEN "Matches the public anchor" for clean ledger', async () => {
    const headHash = store.getHeadHash();
    const anchor = store.recordAnchor(
      PRE_RECORDED_ANCHOR.network,
      PRE_RECORDED_ANCHOR.contractAddress,
      PRE_RECORDED_ANCHOR.txHash,
      PRE_RECORDED_ANCHOR.label
    );

    expect(anchor.head_hash).toBe(headHash);
    expect(anchor.up_to_seq).toBe(8);

    const verification = await store.verifyAgainstAnchor(anchor);
    expect(verification.isMatch).toBe(true);
    expect(verification.details).toContain('Matches the public anchor');
  });

  it('verifyAgainstAnchor returns RED "Ledger differs from the anchored history at or before entry #N" when payload is modified', async () => {
    const anchor = store.recordAnchor(
      PRE_RECORDED_ANCHOR.network,
      PRE_RECORDED_ANCHOR.contractAddress,
      PRE_RECORDED_ANCHOR.txHash,
      PRE_RECORDED_ANCHOR.label
    );

    // Tamper entry #2 payload
    store.simulateNaiveTamper(2);

    const verification = await store.verifyAgainstAnchor(anchor);
    expect(verification.isMatch).toBe(false);
    expect(verification.details).toContain('Ledger differs from the anchored history at or before entry #2');
    expect(verification.divergenceSeq).toBe(2);
  });

  it('verifyAgainstAnchor recomputes from payloads and catches stealth rehash tampering', async () => {
    const anchor = store.recordAnchor(
      PRE_RECORDED_ANCHOR.network,
      PRE_RECORDED_ANCHOR.contractAddress,
      PRE_RECORDED_ANCHOR.txHash,
      PRE_RECORDED_ANCHOR.label
    );

    // Stealth tamper entry #3 (rewrites payload and recomputes all subsequent stored hashes)
    await store.simulateStealthTamper(3);

    const verification = await store.verifyAgainstAnchor(anchor);
    expect(verification.isMatch).toBe(false);
    expect(verification.details).toContain('Ledger differs from the anchored history at or before entry #8');
  });
});
