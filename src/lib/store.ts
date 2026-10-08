import {
  CaseRecord,
  LedgerEntry,
  AnchorRecord,
  TamperBackup,
  DecisionPayload,
  HumanReviewPayload,
  HumanVerdict,
  CaseStatus,
} from '../types';
import { entryHash, GENESIS_PREV_HASH, verifyLedger } from './crypto';
import { runAgentDecisionPipeline } from './policyEngine';
import { buildSeedLedger, SEED_CASES } from './seed';

type Listener = () => void;

class BlackBoxStore {
  private cases: CaseRecord[] = [];
  private ledger: LedgerEntry[] = [];
  private anchors: AnchorRecord[] = [];
  private tamperBackup: TamperBackup | null = null;
  private listeners: Set<Listener> = new Set();
  private initialized = false;

  constructor() {
    this.loadFromStorage();
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.saveToStorage();
    this.listeners.forEach(cb => cb());
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const savedCases = localStorage.getItem('abb_cases');
      const savedLedger = localStorage.getItem('abb_ledger');
      const savedAnchors = localStorage.getItem('abb_anchors');
      const savedTamper = localStorage.getItem('abb_tamper');

      if (savedCases) this.cases = JSON.parse(savedCases);
      if (savedLedger) this.ledger = JSON.parse(savedLedger);
      if (savedAnchors) this.anchors = JSON.parse(savedAnchors);
      if (savedTamper) this.tamperBackup = JSON.parse(savedTamper);

      if (this.ledger.length > 0) {
        this.initialized = true;
      }
    } catch (e) {
      console.error('Failed to load store from localStorage', e);
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('abb_cases', JSON.stringify(this.cases));
      localStorage.setItem('abb_ledger', JSON.stringify(this.ledger));
      localStorage.setItem('abb_anchors', JSON.stringify(this.anchors));
      if (this.tamperBackup) {
        localStorage.setItem('abb_tamper', JSON.stringify(this.tamperBackup));
      } else {
        localStorage.removeItem('abb_tamper');
      }
    } catch (e) {
      console.error('Failed to save store to localStorage', e);
    }
  }

  public async initSeed(): Promise<string> {
    const seed = await buildSeedLedger();
    console.log('[AgentBlackBox] Deterministic Seed Head Hash:', seed.headHash);

    if (this.initialized && this.ledger.length > 0) {
      return seed.headHash;
    }

    this.initialized = true;
    this.ledger = seed.ledger;
    this.cases = seed.cases;
    this.tamperBackup = null;
    this.notify();
    return seed.headHash;
  }

  public async resetDemo(): Promise<string> {
    const seed = await buildSeedLedger();
    this.initialized = true;
    this.ledger = seed.ledger;
    this.cases = seed.cases;
    this.tamperBackup = null;
    this.anchors = [];
    console.log('[AgentBlackBox] Reset Demo - Restored Seed Ledger. Head Hash:', seed.headHash);
    this.notify();
    return seed.headHash;
  }

  public getCases(): CaseRecord[] {
    return [...this.cases];
  }

  public getLedger(): LedgerEntry[] {
    return [...this.ledger];
  }

  public getAnchors(): AnchorRecord[] {
    return [...this.anchors];
  }

  public getTamperBackup(): TamperBackup | null {
    return this.tamperBackup;
  }

  public getHeadHash(): string {
    if (this.ledger.length === 0) return GENESIS_PREV_HASH;
    return this.ledger[this.ledger.length - 1].entry_hash;
  }

  public async submitCase(caseData: CaseRecord): Promise<{ caseRecord: CaseRecord; ledgerEntry: LedgerEntry }> {
    // 1. Run Decision Pipeline
    const decisionPayload = await runAgentDecisionPipeline(caseData);

    // Map decision to case status
    let newStatus: CaseStatus = 'approved';
    if (decisionPayload.final_action === 'ESCALATE') newStatus = 'escalated';
    if (decisionPayload.final_action === 'BLOCK') newStatus = 'blocked';

    const savedCase: CaseRecord = {
      ...caseData,
      status: newStatus,
    };

    // Check if case exists or append
    const existingIndex = this.cases.findIndex(c => c.case_ref === savedCase.case_ref);
    if (existingIndex >= 0) {
      this.cases[existingIndex] = savedCase;
    } else {
      this.cases.push(savedCase);
    }

    // 2. Build and Append Ledger Entry
    const seq = this.ledger.length + 1;
    const prevHash = this.getHeadHash();
    const createdAt = new Date().toISOString();

    const hash = await entryHash(
      prevHash,
      seq,
      'DECISION',
      decisionPayload,
      createdAt
    );

    const newLedgerEntry: LedgerEntry = {
      seq,
      event_type: 'DECISION',
      case_ref: savedCase.case_ref,
      payload: decisionPayload,
      prev_hash: prevHash,
      entry_hash: hash,
      created_at: createdAt,
    };

    this.ledger.push(newLedgerEntry);
    this.notify();

    return { caseRecord: savedCase, ledgerEntry: newLedgerEntry };
  }

  public async reviewCase(
    caseRef: string,
    decisionSeq: number,
    verdict: HumanVerdict,
    note: string,
    reviewer: string = 'agent-supervisor-01'
  ): Promise<LedgerEntry> {
    const targetCase = this.cases.find(c => c.case_ref === caseRef);
    if (targetCase) {
      targetCase.status = verdict === 'APPROVE' ? 'approved' : 'blocked';
    }

    const humanPayload: HumanReviewPayload = {
      decision_seq: decisionSeq,
      case_ref: caseRef,
      reviewer,
      verdict,
      note,
    };

    const seq = this.ledger.length + 1;
    const prevHash = this.getHeadHash();
    const createdAt = new Date().toISOString();

    const hash = await entryHash(
      prevHash,
      seq,
      'HUMAN_REVIEW',
      humanPayload,
      createdAt
    );

    const newLedgerEntry: LedgerEntry = {
      seq,
      event_type: 'HUMAN_REVIEW',
      case_ref: caseRef,
      payload: humanPayload,
      prev_hash: prevHash,
      entry_hash: hash,
      created_at: createdAt,
    };

    this.ledger.push(newLedgerEntry);
    this.notify();

    return newLedgerEntry;
  }

  /**
   * Naive Tamper: Modifies payload in database directly without updating cryptographic hashes.
   */
  public simulateNaiveTamper(targetSeq: number): boolean {
    const entry = this.ledger.find(e => e.seq === targetSeq);
    if (!entry) return false;

    // Save backup if not already backed up
    if (!this.tamperBackup) {
      this.tamperBackup = {
        seq: targetSeq,
        original_payload: JSON.parse(JSON.stringify(entry.payload)),
        original_entries: JSON.parse(JSON.stringify(this.ledger)),
        backed_up_at: new Date().toISOString(),
      };
    }

    // Tamper the payload: if DECISION, change BLOCK/ESCALATE to APPROVE; if already APPROVE, alter refund amount
    const modifiedPayload = JSON.parse(JSON.stringify(entry.payload));
    if (modifiedPayload.final_action) {
      modifiedPayload.final_action = modifiedPayload.final_action === 'APPROVE' ? 'BLOCK' : 'APPROVE';
      modifiedPayload.risk_score = 0;
    } else if (modifiedPayload.verdict) {
      modifiedPayload.verdict = modifiedPayload.verdict === 'APPROVE' ? 'DENY' : 'APPROVE';
    } else {
      modifiedPayload.tampered = true;
    }

    entry.payload = modifiedPayload;
    this.notify();
    return true;
  }

  /**
   * Stealth Tamper (O2): Modifies payload AND recalculates subsequent hashes.
   * Internal verification will pass, but comparison against previously recorded on-chain anchors will fail!
   */
  public async simulateStealthTamper(targetSeq: number = 2): Promise<boolean> {
    const entryIndex = this.ledger.findIndex(e => e.seq === targetSeq);
    if (entryIndex < 0) return false;

    if (!this.tamperBackup) {
      this.tamperBackup = {
        seq: targetSeq,
        original_payload: JSON.parse(JSON.stringify(this.ledger[entryIndex].payload)),
        original_entries: JSON.parse(JSON.stringify(this.ledger)),
        backed_up_at: new Date().toISOString(),
      };
    }

    // Mutate the target block payload (flip final_action to APPROVE and lower risk_score)
    const modified = JSON.parse(JSON.stringify(this.ledger[entryIndex].payload));
    if (modified.final_action) {
      modified.final_action = modified.final_action === 'APPROVE' ? 'BLOCK' : 'APPROVE';
      modified.risk_score = modified.final_action === 'APPROVE' ? 5 : 95;
    } else if (modified.verdict) {
      modified.verdict = modified.verdict === 'APPROVE' ? 'DENY' : 'APPROVE';
    } else {
      modified.tampered = true;
    }
    this.ledger[entryIndex].payload = modified;

    // Rehash all blocks from targetSeq to end of chain
    for (let i = entryIndex; i < this.ledger.length; i++) {
      const prev = i === 0 ? GENESIS_PREV_HASH : this.ledger[i - 1].entry_hash;
      this.ledger[i].prev_hash = prev;
      this.ledger[i].entry_hash = await entryHash(
        prev,
        this.ledger[i].seq,
        this.ledger[i].event_type,
        this.ledger[i].payload,
        this.ledger[i].created_at
      );
    }

    this.notify();
    return true;
  }

  /**
   * Restores original state (payloads and hashes) from backup
   */
  public async undoTamper(): Promise<boolean> {
    if (!this.tamperBackup) return false;

    if (this.tamperBackup.original_entries) {
      this.ledger = JSON.parse(JSON.stringify(this.tamperBackup.original_entries));
    } else {
      const entryIndex = this.ledger.findIndex(e => e.seq === this.tamperBackup!.seq);
      if (entryIndex >= 0) {
        this.ledger[entryIndex].payload = this.tamperBackup.original_payload;

        // Re-link properly in case stealth tamper was performed
        for (let i = entryIndex; i < this.ledger.length; i++) {
          const prev = i === 0 ? GENESIS_PREV_HASH : this.ledger[i - 1].entry_hash;
          this.ledger[i].prev_hash = prev;
          this.ledger[i].entry_hash = await entryHash(
            prev,
            this.ledger[i].seq,
            this.ledger[i].event_type,
            this.ledger[i].payload,
            this.ledger[i].created_at
          );
        }
      }
    }

    this.tamperBackup = null;
    this.notify();
    return true;
  }

  public recordAnchor(
    network: string,
    contractAddress: string,
    txHash: string,
    label: string
  ): AnchorRecord {
    const headHash = this.getHeadHash();
    const upToSeq = this.ledger.length;

    const newAnchor: AnchorRecord = {
      id: Date.now(),
      head_hash: headHash,
      up_to_seq: upToSeq,
      network,
      contract_address: contractAddress,
      tx_hash: txHash,
      label,
      anchored_at: new Date().toISOString(),
    };

    this.anchors.unshift(newAnchor);
    this.notify();
    return newAnchor;
  }

  public async verifyAgainstAnchor(anchor?: AnchorRecord): Promise<{
    isMatch: boolean;
    recomputedHeadHash: string;
    onChainHeadHash: string;
    details: string;
    divergenceSeq?: number;
  }> {
    const targetAnchor = anchor || this.anchors[0];
    if (!targetAnchor) {
      return {
        isMatch: false,
        recomputedHeadHash: '',
        onChainHeadHash: '',
        details: 'No anchor record found to verify against.',
      };
    }

    const upToSeq = targetAnchor.up_to_seq;
    const subEntries = this.ledger.slice(0, upToSeq);

    if (subEntries.length < upToSeq) {
      const divergenceSeq = subEntries.length + 1;
      return {
        isMatch: false,
        recomputedHeadHash: '',
        onChainHeadHash: targetAnchor.head_hash,
        details: `Ledger differs from the anchored history at or before entry #${divergenceSeq} (STEALTH TAMPER DETECTED)`,
        divergenceSeq,
      };
    }

    // Recompute the hash chain strictly from PAYLOADS (not stored hashes) from entry 1 to up_to_seq
    let currentPrev = GENESIS_PREV_HASH;
    let firstDivergenceSeq: number | null = null;
    let recomputedAtUpToSeq = '';

    for (let i = 0; i < upToSeq; i++) {
      const entry = subEntries[i];
      const recomputedHash = await entryHash(
        currentPrev,
        entry.seq,
        entry.event_type,
        entry.payload,
        entry.created_at
      );

      // Check if recomputed hash diverged from stored entry_hash
      if (firstDivergenceSeq === null && recomputedHash !== entry.entry_hash) {
        firstDivergenceSeq = entry.seq;
      }

      currentPrev = recomputedHash;
      if (entry.seq === upToSeq) {
        recomputedAtUpToSeq = recomputedHash;
      }
    }

    const cleanRecomputed = recomputedAtUpToSeq.toLowerCase().replace(/^0x/, '');
    const cleanAnchor = targetAnchor.head_hash.toLowerCase().replace(/^0x/, '');
    const isMatch = cleanRecomputed === cleanAnchor;

    const divergenceSeq = firstDivergenceSeq !== null ? firstDivergenceSeq : upToSeq;

    return {
      isMatch,
      recomputedHeadHash: recomputedAtUpToSeq,
      onChainHeadHash: targetAnchor.head_hash,
      details: isMatch
        ? 'Matches the public anchor'
        : `Ledger differs from the anchored history at or before entry #${divergenceSeq} (STEALTH TAMPER DETECTED)`,
      divergenceSeq: isMatch ? undefined : divergenceSeq,
    };
  }

  public resetAll() {
    this.cases = [];
    this.ledger = [];
    this.anchors = [];
    this.tamperBackup = null;
    this.initialized = false;
    if (typeof window !== 'undefined') {
      try {
        localStorage.clear();
      } catch (e) {
        console.error('Failed to clear localStorage', e);
      }
    }
    this.notify();
  }
}

export const store = new BlackBoxStore();
