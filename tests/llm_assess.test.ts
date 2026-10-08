import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runAgentDecisionPipeline } from '../src/lib/policyEngine';
import { CaseRecord } from '../src/types';

describe('LLM Assess & Guardrail Verification (Requirement 5)', () => {
  const baseCase: CaseRecord = {
    case_ref: 'C-TEST-001',
    customer_name: 'Test Customer',
    order_id: 'ORD-999',
    amount: 500,
    days_since_delivery: 5,
    prior_refunds_90d: 0,
    account_age_days: 100,
    category: 'damaged',
    reason_text: 'Slight dent in packaging during courier shipment.',
    status: 'new',
    created_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // 1. R5: risk_score 31 escalates
  it('R5: risk_score 31 escalates', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        risk_score: 31,
        flags: ['moderate_risk'],
        reasoning: 'Borderline claim risk requires human review',
        injection_attempt: false,
      }),
    } as Response);

    const result = await runAgentDecisionPipeline(baseCase);
    expect(result.final_action).toBe('ESCALATE');
    expect(result.rule_hits.some(h => h.startsWith('R5'))).toBe(true);
    expect(result.llm_output.source).toBe('llm');
    expect(result.llm_output.risk_score).toBe(31);
  });

  // 2. R5: risk_score 30 does not escalate
  it('R5: risk_score 30 does not escalate', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        risk_score: 30,
        flags: [],
        reasoning: 'Safe claim within limit',
        injection_attempt: false,
      }),
    } as Response);

    const result = await runAgentDecisionPipeline(baseCase);
    expect(result.final_action).toBe('APPROVE');
    expect(result.rule_hits.some(h => h.startsWith('R5'))).toBe(false);
    expect(result.llm_output.source).toBe('llm');
    expect(result.llm_output.risk_score).toBe(30);
  });

  // 3. R6: invalid JSON twice escalates
  it('R6: invalid JSON twice escalates', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        // Invalid schema: missing flags, reasoning, injection_attempt
        malformed_field: true,
      }),
    } as Response);

    const result = await runAgentDecisionPipeline(baseCase);
    expect(fetchSpy).toHaveBeenCalledTimes(2); // Initial attempt + 1 retry
    expect(result.final_action).toBe('ESCALATE');
    expect(result.rule_hits.some(h => h.startsWith('R6'))).toBe(true);
    expect(result.llm_output.source).toBe('fallback');
    expect(result.llm_output.error).toBeDefined();
  });

  // 4. R6: timeout escalates
  it('R6: timeout escalates', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      const abortErr = new Error('The operation was aborted');
      abortErr.name = 'AbortError';
      return Promise.reject(abortErr);
    });

    const result = await runAgentDecisionPipeline(baseCase);
    expect(result.final_action).toBe('ESCALATE');
    expect(result.rule_hits.some(h => h.startsWith('R6'))).toBe(true);
    expect(result.llm_output.source).toBe('fallback');
    expect(result.llm_output.error).toContain('timed out');
  });

  // 5. LLM says APPROVE-level but R2 fires so the result is still ESCALATE
  it('LLM says APPROVE-level but R2 fires so the result is still ESCALATE', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        risk_score: 5,
        flags: [],
        reasoning: 'Extremely clean customer profile',
        injection_attempt: false,
      }),
    } as Response);

    // amount = 2500 (> 2000 INR limit) triggers R2
    const highAmountCase = { ...baseCase, amount: 2500 };
    const result = await runAgentDecisionPipeline(highAmountCase);

    expect(result.final_action).toBe('ESCALATE');
    expect(result.rule_hits.some(h => h.startsWith('R2'))).toBe(true);
    expect(result.llm_output.source).toBe('llm');
    expect(result.llm_output.risk_score).toBe(5);
  });

  // 6. LLM injection_attempt true gives BLOCK
  it('LLM injection_attempt true gives BLOCK', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        risk_score: 85,
        flags: ['jailbreak_detected'],
        reasoning: 'Adversarial instruction detected in customer input',
        injection_attempt: true,
      }),
    } as Response);

    // Normal customer reason so local detector does not flag it
    const normalReasonCase = { ...baseCase, reason_text: 'Item was received with a slight defect.' };
    const result = await runAgentDecisionPipeline(normalReasonCase);

    expect(result.final_action).toBe('BLOCK');
    expect(result.rule_hits.some(h => h.startsWith('R4'))).toBe(true);
    expect(result.llm_output.source).toBe('llm');
    expect(result.llm_output.injection_attempt).toBe(true);
  });
});
