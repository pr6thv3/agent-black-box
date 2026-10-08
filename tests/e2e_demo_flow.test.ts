import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { store } from '../src/lib/store';
import { verifyLedger } from '../src/lib/crypto';
import { DEMO_CASES } from '../src/lib/demoCases';
import { evaluateLLMRisk } from '../src/lib/policyEngine';

describe('End-to-End Live Hackathon Demo Flow (3-Minute Script)', () => {
  beforeEach(() => {
    store.resetAll();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, options: any) => {
      const body = options?.body ? JSON.parse(options.body) : {};
      const caseData = body.case || body;
      const llm = evaluateLLMRisk(caseData);
      return {
        ok: true,
        json: async () => ({
          risk_score: llm.risk_score,
          flags: llm.flags,
          reasoning: llm.reasoning,
          injection_attempt: llm.injection_attempt,
        }),
      } as Response;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('executes the full 4-stage demo flow flawlessly', async () => {
    // -------------------------------------------------------------
    // STAGE 1: Controlled Decision (Auto-Approval)
    // -------------------------------------------------------------
    const case1Res = await store.submitCase({
      ...DEMO_CASES[0],
      status: 'new',
      created_at: new Date().toISOString(),
    });

    expect(case1Res.ledgerEntry.seq).toBe(1);
    expect(case1Res.ledgerEntry.payload.final_action).toBe('APPROVE');
    expect(case1Res.ledgerEntry.entry_hash).toHaveLength(64);

    let audit = await verifyLedger(store.getLedger());
    expect(audit.isValid).toBe(true);
    expect(audit.totalEntries).toBe(1);

    // -------------------------------------------------------------
    // STAGE 2: Prompt Injection Attack Neutralization
    // -------------------------------------------------------------
    const case2Res = await store.submitCase({
      ...DEMO_CASES[1],
      status: 'new',
      created_at: new Date().toISOString(),
    });

    expect(case2Res.ledgerEntry.seq).toBe(2);
    expect(case2Res.ledgerEntry.payload.llm_output.injection_attempt).toBe(true);
    expect(case2Res.ledgerEntry.payload.final_action).toBe('BLOCK');
    expect(case2Res.ledgerEntry.payload.rule_hits.some(h => h.includes('R4'))).toBe(true);

    audit = await verifyLedger(store.getLedger());
    expect(audit.isValid).toBe(true);
    expect(audit.totalEntries).toBe(2);

    // -------------------------------------------------------------
    // STAGE 3: High-Value Claim Escalation + Human Override
    // -------------------------------------------------------------
    const case3Res = await store.submitCase({
      ...DEMO_CASES[2],
      status: 'new',
      created_at: new Date().toISOString(),
    });

    expect(case3Res.ledgerEntry.seq).toBe(3);
    expect(case3Res.ledgerEntry.payload.final_action).toBe('ESCALATE');
    expect(case3Res.caseRecord.status).toBe('escalated');

    // Supervisor reviews and authorizes exception
    const humanReviewEntry = await store.reviewCase(
      case3Res.caseRecord.case_ref,
      case3Res.ledgerEntry.seq,
      'APPROVE',
      'Verified customer security camera footage confirming non-delivery. Authorizing one-time exception.',
      'senior-supervisor-01'
    );

    expect(humanReviewEntry.seq).toBe(4);
    expect(humanReviewEntry.event_type).toBe('HUMAN_REVIEW');
    expect(humanReviewEntry.payload.decision_seq).toBe(3);
    expect(humanReviewEntry.payload.verdict).toBe('APPROVE');

    audit = await verifyLedger(store.getLedger());
    expect(audit.isValid).toBe(true);
    expect(audit.totalEntries).toBe(4);

    // -------------------------------------------------------------
    // STAGE 4: On-Chain Anchoring & Tamper Demonstration
    // -------------------------------------------------------------
    const headHashAtBlock4 = store.getHeadHash();
    const anchor = store.recordAnchor(
      'Ethereum Sepolia',
      '0x356A238A8367F47e6ff8B4f6fB2e95aD5Dea99e7',
      '0x8f7d9834e56b2319c80a2b0e74f192b3a123f8c47180291ba99d86348128ea02',
      'batch-1, entries 1-4'
    );

    expect(anchor.head_hash).toBe(headHashAtBlock4);
    expect(anchor.up_to_seq).toBe(4);

    // Verify against anchor passes initially
    const initialAnchorCheck = await store.verifyAgainstAnchor(anchor);
    expect(initialAnchorCheck.isMatch).toBe(true);

    // Naive Tamper: Modify Block #2 (the prompt injection case that was BLOCKED)
    const tampered = store.simulateNaiveTamper(2);
    expect(tampered).toBe(true);

    // Cryptographic audit must immediately detect the tampering at seq #2!
    audit = await verifyLedger(store.getLedger());
    expect(audit.isValid).toBe(false);
    expect(audit.brokenSeq).toBe(2);

    // Undo Tamper restores integrity
    const restored = await store.undoTamper();
    expect(restored).toBe(true);

    audit = await verifyLedger(store.getLedger());
    expect(audit.isValid).toBe(true);

    // Stealth Tamper (O2): Adversary rewrites Block #2 AND recalculates all subsequent hashes
    await store.simulateStealthTamper(2);

    // Internal check passes because hashes were recalculated
    const internalCheckAfterStealth = await verifyLedger(store.getLedger());
    expect(internalCheckAfterStealth.isValid).toBe(true);

    // BUT verification against on-chain anchor fails because Ethereum testnet has the original fingerprint!
    const stealthAnchorCheck = await store.verifyAgainstAnchor(anchor);
    expect(stealthAnchorCheck.isMatch).toBe(false);
    expect(stealthAnchorCheck.details).toContain('STEALTH TAMPER DETECTED');
  });
});
