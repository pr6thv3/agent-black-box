import React from 'react';
import {
  ShieldCheck,
  AlertOctagon,
  CheckCircle2,
  Clock,
  Ban,
  Lock,
  ArrowRight,
  TrendingUp,
  Cpu,
  Radio,
  FileCheck2,
} from 'lucide-react';
import { CaseRecord, LedgerEntry, AnchorRecord, VerificationResult } from '../types';

interface DashboardProps {
  cases: CaseRecord[];
  ledger: LedgerEntry[];
  anchors: AnchorRecord[];
  auditStatus: VerificationResult;
  setActiveTab: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  cases,
  ledger,
  anchors,
  auditStatus,
  setActiveTab,
}) => {
  const total = cases.length;
  const approved = cases.filter(c => c.status === 'approved').length;
  const escalated = cases.filter(c => c.status === 'escalated').length;
  const blocked = cases.filter(c => c.status === 'blocked').length;

  // Count prompt injections caught
  const injectionCount = ledger.filter(
    e => e.payload && e.payload.llm_output && e.payload.llm_output.injection_attempt
  ).length;

  const approvedPct = total ? Math.round((approved / total) * 100) : 0;
  const escalatedPct = total ? Math.round((escalated / total) * 100) : 0;
  const blockedPct = total ? Math.round((blocked / total) * 100) : 0;

  const headHash = ledger.length > 0 ? ledger[ledger.length - 1].entry_hash : '0'.repeat(64);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Top Banner: Flight Recorder Status */}
      <div
        className="card"
        style={{
          background: auditStatus.isValid
            ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.08), rgba(16, 185, 129, 0.05))'
            : 'linear-gradient(135deg, rgba(244, 63, 94, 0.15), rgba(15, 23, 42, 0.9))',
          borderColor: auditStatus.isValid ? 'rgba(6, 182, 212, 0.3)' : 'rgba(244, 63, 94, 0.5)',
          padding: '1.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.25rem 0.65rem',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                background: auditStatus.isValid ? '#065f46' : '#881337',
                color: auditStatus.isValid ? '#34d399' : '#fca5a5'
              }}>
                <Radio size={14} className={auditStatus.isValid ? '' : 'animate-pulse-glow'} />
                <span>{auditStatus.isValid ? 'AUDIT TRAIL SECURE' : 'INTEGRITY BREACH DETECTED'}</span>
              </div>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                Deterministic Guardrails + SHA-256 Hash Chain
              </span>
            </div>
            
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
              Autonomous Agent Decision Operations
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '48rem' }}>
              AgentBlackBox monitors real-time business actions, prevents adversarial prompt-injection hijacking, enforces human-in-the-loop governance, and provides mathematically verifiable proof on Ethereum testnets.
            </p>
          </div>

          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Ledger Head Fingerprint
            </div>
            <div className="font-mono" style={{ fontSize: '0.8rem', color: '#38bdf8', background: '#090d16', padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #1e293b' }}>
              {headHash.slice(0, 10)}...{headHash.slice(-8)}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }} onClick={() => setActiveTab('integrity')}>
                Verify Cryptography
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        
        {/* Total Cases */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Total Cases</span>
            <Cpu size={18} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc' }}>{total}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            All intake streams evaluated
          </div>
        </div>

        {/* Auto-Approved */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Auto-Approved</span>
            <CheckCircle2 size={18} color="#34d399" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#34d399' }}>
            {approved} <span style={{ fontSize: '0.9rem', color: '#64748b' }}>({approvedPct}%)</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Within low-risk thresholds
          </div>
        </div>

        {/* Escalated */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Human Escalations</span>
            <Clock size={18} color="#fbbf24" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fbbf24' }}>
            {escalated} <span style={{ fontSize: '0.9rem', color: '#64748b' }}>({escalatedPct}%)</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Awaiting supervisor review
          </div>
        </div>

        {/* Blocked */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Blocked Policy / AI</span>
            <Ban size={18} color="#fb7185" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fb7185' }}>
            {blocked} <span style={{ fontSize: '0.9rem', color: '#64748b' }}>({blockedPct}%)</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Policy violations & fraud
          </div>
        </div>

        {/* Prompt Injections */}
        <div className="card" style={{ borderColor: injectionCount > 0 ? 'rgba(244, 63, 94, 0.4)' : '#1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Injections Blocked</span>
            <AlertOctagon size={18} color="#f43f5e" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f43f5e' }}>{injectionCount}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Adversarial exploits neutralized
          </div>
        </div>

        {/* Anchors on Chain */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>On-Chain Anchors</span>
            <Lock size={18} color="#c084fc" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#c084fc' }}>{anchors.length}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Public testnet commitments
          </div>
        </div>

      </div>

      {/* Quick Launch & Rehearsal Flow */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        
        {/* Rehearsal Demo Guide */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem', color: '#f8fafc' }}>
              Live Hackathon Demo Flow (3 Minutes)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <span style={{ background: '#1e293b', width: '1.5rem', height: '1.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>1</span>
                <div>
                  <strong style={{ color: '#38bdf8' }}>Controlled Decision:</strong> Submit normal Case 1 (₹450). Watch agent auto-approve and write Block #1.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <span style={{ background: '#1e293b', width: '1.5rem', height: '1.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>2</span>
                <div>
                  <strong style={{ color: '#fb7185' }}>Prompt Injection Defense:</strong> Submit Case 2 (jailbreak attempt). Watch LLM flag exploit and trigger hard BLOCK.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <span style={{ background: '#1e293b', width: '1.5rem', height: '1.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>3</span>
                <div>
                  <strong style={{ color: '#fbbf24' }}>Human In The Loop:</strong> Submit Case 3 (₹4,800). Exceeds limit → Escalates → Supervisor approves in Review Queue.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <span style={{ background: '#1e293b', width: '1.5rem', height: '1.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>4</span>
                <div>
                  <strong style={{ color: '#34d399' }}>Tamper Proof & Anchor:</strong> Go to Integrity. Run naive tamper → Red alert! Undo → Green! Verify against on-chain testnet anchor.
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #1e293b' }}>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setActiveTab('submit')}>
              Start Live Demo Flow <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Recent Ledger Activity */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>Recent Audit Trail</h3>
            <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }} onClick={() => setActiveTab('ledger')}>
              View Full Ledger ({ledger.length})
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {ledger.slice(-4).reverse().map((entry) => (
              <div
                key={entry.seq}
                style={{
                  background: '#0d1527',
                  border: '1px solid #1e293b',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span className="font-mono" style={{ fontWeight: 700, color: '#38bdf8', fontSize: '0.85rem' }}>
                      #{entry.seq}
                    </span>
                    <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>
                      {entry.event_type}
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
                      {entry.case_ref}
                    </span>
                  </div>
                  <div className="font-mono" style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Hash: {entry.entry_hash.slice(0, 16)}...
                  </div>
                </div>

                <div>
                  {entry.event_type === 'DECISION' ? (
                    <span
                      className={`badge ${
                        entry.payload.final_action === 'APPROVE'
                          ? 'badge-emerald'
                          : entry.payload.final_action === 'ESCALATE'
                          ? 'badge-amber'
                          : 'badge-rose'
                      }`}
                    >
                      {entry.payload.final_action}
                    </span>
                  ) : (
                    <span className="badge badge-emerald">
                      HUMAN: {entry.payload.verdict}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
