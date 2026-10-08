export type Category = 'damaged' | 'not_as_described' | 'never_arrived' | 'wrong_size' | 'changed_mind';
export type CaseStatus = 'new' | 'approved' | 'escalated' | 'blocked' | 'resolved';
export type Action = 'APPROVE' | 'ESCALATE' | 'BLOCK';
export type EventType = 'DECISION' | 'HUMAN_REVIEW';
export type HumanVerdict = 'APPROVE' | 'DENY';

export interface CaseRecord {
  case_ref: string;
  customer_name: string;
  order_id: string;
  amount: number; // in INR
  days_since_delivery: number;
  prior_refunds_90d: number;
  account_age_days: number;
  category: Category;
  reason_text: string;
  status: CaseStatus;
  created_at: string;
}

export interface LLMOutput {
  risk_score?: number;
  flags?: string[];
  reasoning?: string;
  injection_attempt?: boolean;
  source?: 'llm' | 'fallback';
  error?: string;
}

export interface DecisionPayload {
  case_ref: string;
  input_snapshot: Omit<CaseRecord, 'status'>;
  rule_hits: string[];
  llm_output: LLMOutput;
  risk_score: number;
  final_action: Action;
  model_name: string;
  prompt_version: string;
  policy_version: string;
}

export interface HumanReviewPayload {
  decision_seq: number;
  case_ref: string;
  reviewer: string;
  verdict: HumanVerdict;
  note: string;
}

export interface LedgerEntry {
  seq: number;
  event_type: EventType;
  case_ref: string;
  payload: DecisionPayload | HumanReviewPayload | any;
  prev_hash: string;
  entry_hash: string;
  created_at: string;
}

export interface AnchorRecord {
  id: number;
  head_hash: string;
  up_to_seq: number;
  network: string;
  contract_address: string;
  tx_hash: string;
  label: string;
  anchored_at: string;
}

export interface TamperBackup {
  seq: number;
  original_payload: any;
  original_entries?: LedgerEntry[];
  backed_up_at: string;
}

export interface VerificationResult {
  isValid: boolean;
  totalEntries: number;
  brokenSeq?: number;
  expectedHash?: string;
  actualHash?: string;
  reason?: string;
}
