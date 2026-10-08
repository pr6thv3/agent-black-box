import { describe, it, expect, beforeEach } from 'vitest';
import { store } from '../src/lib/store';
import { verifyLedger } from '../src/lib/crypto';
import { PRE_RECORDED_ANCHOR } from '../src/lib/anchorConfig';

describe('Stealth Tamper Demonstration', () => {
  beforeEach(async () => {
    await store.resetDemo();
  });

  it('after stealth tamper, verifyLedger passes, anchor verification fails, and after undo, both pass', async () => {
    // 1. Record an anchor for the seed ledger
    const anchor = store.recordAnchor(
      PRE_RECORDED_ANCHOR.network,
      PRE_RECORDED_ANCHOR.contractAddress,
      PRE_RECORDED_ANCHOR.txHash,
      PRE_RECORDED_ANCHOR.label
    );

    // Initial baseline state: both ledger integrity and anchor verification pass
    const baselineLedger = await verifyLedger(store.getLedger());
    expect(baselineLedger.isValid).toBe(true);

    const baselineAnchor = await store.verifyAgainstAnchor(anchor);
    expect(baselineAnchor.isMatch).toBe(true);

    // 2. Perform stealth tamper (pick entry #2, mutate payload, and rehash subsequent blocks)
    const tampered = await store.simulateStealthTamper(2);
    expect(tampered).toBe(true);

    // Expected behavior:
    // "Verify Ledger Integrity" shows GREEN: internal chain check passes because hashes were recalculated
    const tamperedLedger = await verifyLedger(store.getLedger());
    expect(tamperedLedger.isValid).toBe(true);

    // "Verify Against Anchor" shows RED: recomputed hash at up_to_seq no longer matches public anchor
    const tamperedAnchor = await store.verifyAgainstAnchor(anchor);
    expect(tamperedAnchor.isMatch).toBe(false);

    // 3. Undo tamper: restores original payloads and hashes from tamper_backup
    const undone = await store.undoTamper();
    expect(undone).toBe(true);

    // Expected behavior:
    // Both checks go green again
    const restoredLedger = await verifyLedger(store.getLedger());
    expect(restoredLedger.isValid).toBe(true);

    const restoredAnchor = await store.verifyAgainstAnchor(anchor);
    expect(restoredAnchor.isMatch).toBe(true);
  });
});
