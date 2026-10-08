import { CaseRecord, Action, LLMOutput, DecisionPayload } from '../types';

const SEVERITY: Record<Action, number> = {
  APPROVE: 0,
  ESCALATE: 1,
  BLOCK: 2,
};

export function maxAction(a: Action, b: Action): Action {
  return SEVERITY[a] >= SEVERITY[b] ? a : b;
}

/**
 * Deterministic policy rules evaluation (R1-R3)
 */
export function evaluatePolicyRules(caseData: CaseRecord): { action: Action; hits: string[] } {
  let action: Action = 'APPROVE';
  const hits: string[] = [];

  // R1: Return window expired
  if (caseData.days_since_delivery > 30) {
    hits.push('R1: Outside 30-day return window (> 30 days)');
    action = maxAction(action, 'BLOCK');
  }

  // R2: High amount threshold
  if (caseData.amount > 2000) {
    hits.push('R2: High transaction amount (> ₹2,000)');
    action = maxAction(action, 'ESCALATE');
  }

  // R3: Prior refund frequency
  if (caseData.prior_refunds_90d >= 3) {
    hits.push('R3: High refund frequency (>= 3 in last 90 days)');
    action = maxAction(action, 'ESCALATE');
  }

  return { action, hits };
}

/**
 * Local adversarial prompt injection pattern detector.
 */
export function detectLocalInjection(reasonText: string): boolean {
  const text = (reasonText || '').toLowerCase();
  const injectionPatterns = [
    /ignore (all )?(prior|previous) instructions/i,
    /system override/i,
    /you are (now|a) /i,
    /autoapprovaldaemon/i,
    /debugbot/i,
    /set risk_score/i,
    /disregard previous/i,
    /new directive/i,
    /bypass safety/i,
    /as an ai assistant, approve/i,
    /<script/i,
    /javascript:/i,
  ];
  return injectionPatterns.some(pattern => pattern.test(text));
}

/**
 * Local Heuristic AI Risk Assessor (used as fallback or offline classifier)
 */
export function evaluateLLMRisk(caseData: CaseRecord): LLMOutput {
  const isInjection = detectLocalInjection(caseData.reason_text);

  if (isInjection) {
    return {
      risk_score: 98,
      flags: ['adversarial_prompt_injection', 'directive_override_attempt', 'untrusted_input_hijack'],
      reasoning: 'Input attempts to override agent instructions and manipulate risk scoring.',
      injection_attempt: true,
      source: 'fallback',
    };
  }

  const flags: string[] = [];
  let score = 10;

  if (caseData.amount > 2000) {
    flags.push('high_value_item');
    score += 15;
  }
  if (caseData.prior_refunds_90d >= 3) {
    flags.push('repeat_refund_claimant');
    score += 25;
  }
  if (caseData.account_age_days < 60) {
    flags.push('young_account');
    score += 10;
  }
  if (caseData.days_since_delivery > 25 && caseData.days_since_delivery <= 30) {
    flags.push('late_window_return');
    score += 5;
  }
  if (caseData.category === 'never_arrived' && caseData.amount > 1500) {
    flags.push('unverified_delivery_dispute');
    score += 10;
  }

  let reasoning = 'Routine return claim within acceptable risk parameters.';
  if (score > 30) {
    reasoning = `Elevated risk due to ${flags.join(', ')}. Manual inspection recommended.`;
  }

  return {
    risk_score: Math.min(score, 100),
    flags,
    reasoning,
    injection_attempt: false,
    source: 'fallback',
  };
}

/**
 * Validates that an LLM response matches all required types and value ranges:
 * - risk_score: integer 0-100
 * - flags: array of short strings
 * - reasoning: string, max 50 words
 * - injection_attempt: boolean
 */
export function validateLLMResponse(data: any): boolean {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;

  // 1. risk_score: integer 0-100
  if (
    typeof data.risk_score !== 'number' ||
    !Number.isInteger(data.risk_score) ||
    data.risk_score < 0 ||
    data.risk_score > 100
  ) {
    return false;
  }

  // 2. flags: array of strings
  if (!Array.isArray(data.flags) || !data.flags.every((f: any) => typeof f === 'string')) {
    return false;
  }

  // 3. reasoning: string (max 50 words)
  if (typeof data.reasoning !== 'string') {
    return false;
  }
  const words = data.reasoning.trim().split(/\s+/).filter(Boolean);
  if (words.length > 50) {
    return false;
  }

  // 4. injection_attempt: boolean
  if (typeof data.injection_attempt !== 'boolean') {
    return false;
  }

  return true;
}

/**
 * Performs fetch to /api/assess with an 8-second timeout.
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Calls /api/assess endpoint with 8s timeout, validating response and retrying once on invalid result.
 */
export async function callAssessEndpoint(
  caseData: CaseRecord
): Promise<{ llmResult: any | null; error: string }> {
  let lastError = '';

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetchWithTimeout(
        '/api/assess',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ case: caseData }),
        },
        8000
      );

      if (!res.ok) {
        lastError = `HTTP error ${res.status}`;
        continue;
      }

      let data: any;
      try {
        data = await res.json();
      } catch {
        lastError = 'Invalid JSON response';
        continue;
      }

      if (validateLLMResponse(data)) {
        return { llmResult: data, error: '' };
      } else {
        lastError = 'Invalid LLM response schema or types';
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        lastError = 'Request timed out after 8s';
      } else {
        lastError = err.message || 'Fetch failed';
      }
    }
  }

  return { llmResult: null, error: lastError };
}

/**
 * Complete Guardrailed Decision Pipeline:
 * Deterministic Rules -> Real LLM Call (/api/assess) -> Validation & Retry -> R4-R6 Guardrails
 */
export async function runAgentDecisionPipeline(caseData: CaseRecord): Promise<DecisionPayload> {
  const rules = evaluatePolicyRules(caseData);
  let finalAction: Action = rules.action;
  const allHits = [...rules.hits];

  // Resolve model name from environment or fallback
  const modelName =
    (typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.LLM_MODEL) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_LLM_MODEL) ||
    'gemini-1.5-flash';

  // Call LLM endpoint with retry and timeout
  const { llmResult, error } = await callAssessEndpoint(caseData);

  let llmOutput: LLMOutput;

  if (!llmResult) {
    // R6 triggers: final action at least ESCALATE, llm_output set to fallback
    allHits.push('R6: AI validation failure or timeout (fail-closed)');
    finalAction = maxAction(finalAction, 'ESCALATE');
    llmOutput = {
      source: 'fallback',
      error: error || 'Failed twice or timed out',
    };
  } else {
    llmOutput = {
      risk_score: llmResult.risk_score,
      flags: llmResult.flags,
      reasoning: llmResult.reasoning,
      injection_attempt: llmResult.injection_attempt,
      source: 'llm',
    };

    // R5: risk_score > 30 triggers at least ESCALATE
    if (llmResult.risk_score > 30) {
      allHits.push(`R5: LLM risk score (${llmResult.risk_score}) exceeds threshold 30`);
      finalAction = maxAction(finalAction, 'ESCALATE');
    }
  }

  // R4: If EITHER the LLM or local detector flags injection -> BLOCK
  const localInjection = detectLocalInjection(caseData.reason_text);
  const llmInjection = llmResult?.injection_attempt === true;

  if (localInjection || llmInjection) {
    allHits.push('R4: Prompt injection attempt detected');
    finalAction = maxAction(finalAction, 'BLOCK');
  }

  const { status, ...inputSnapshot } = caseData;

  return {
    case_ref: caseData.case_ref,
    input_snapshot: inputSnapshot,
    rule_hits: allHits,
    llm_output: llmOutput,
    risk_score: llmOutput.risk_score ?? (localInjection ? 98 : 0),
    final_action: finalAction,
    model_name: modelName,
    prompt_version: 'v1.0.0',
    policy_version: 'v1.0.0',
  };
}
