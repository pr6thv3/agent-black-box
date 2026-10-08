import React, { useState } from 'react';
import { UserCheck, CheckCircle2, XCircle, AlertCircle, Clock, ShieldAlert, FileText } from 'lucide-react';
import { CaseRecord, LedgerEntry, HumanVerdict } from '../types';
import { store } from '../lib/store';

interface ReviewQueueProps {
  cases: CaseRecord[];
  ledger: LedgerEntry[];
  currentRole: string;
}

export const ReviewQueue: React.FC<ReviewQueueProps> = ({ cases, ledger, currentRole }) => {
  const [selectedCaseRef, setSelectedCaseRef] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<HumanVerdict>('APPROVE');
  const [note, setNote] = useState('');
  const [reviewer, setReviewer] = useState(currentRole === 'Reviewer' ? 'senior-reviewer-sarah' : 'agent-supervisor-01');
  const [submitting, setSubmitting] = useState(false);

  // Find escalated cases that do not have a corresponding HUMAN_REVIEW in the ledger
  const reviewedCaseRefs = new Set(
    ledger.filter(e => e.event_type === 'HUMAN_REVIEW').map(e => e.case_ref)
  );

  const pendingCases = cases.filter(
    c => c.status === 'escalated' && !reviewedCaseRefs.has(c.case_ref)
  );

  const selectedCase = pendingCases.find(c => c.case_ref === selectedCaseRef) || pendingCases[0];

  // Find original decision seq for selected case
  const decisionEntry = selectedCase
    ? ledger.find(e => e.event_type === 'DECISION' && e.case_ref === selectedCase.case_ref)
    : null;

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !decisionEntry) return;

    if (!note.trim()) {
      alert('A review note is required for human governance auditing.');
      return;
    }

    setSubmitting(true);
    try {
      await store.reviewCase(
        selectedCase.case_ref,
        decisionEntry.seq,
        verdict,
        note,
        reviewer
      );
      setNote('');
      setSelectedCaseRef(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc' }}>
                Human Review Queue
              </h2>
              <span className="badge badge-amber">
                {pendingCases.length} Pending Escalations
              </span>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
              High-value claims and elevated-risk cases escalated by the AI agent for mandatory human supervision.
            </p>
          </div>
        </div>
      </div>

      {pendingCases.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
          <CheckCircle2 size={42} color="#10b981" style={{ margin: '0 auto 1rem auto' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem' }}>
            Queue Clean & All Escalations Resolved
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', maxWidth: '28rem', margin: '0 auto' }}>
            No cases are currently waiting for human review. Submit a high-value case (&gt; ₹2,000) or repeat claimant to trigger an escalation.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(360px, 1.8fr)', gap: '1.5rem' }}>
          
          {/* Pending List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Awaiting Action ({pendingCases.length})
            </span>
            {pendingCases.map(c => {
              const isSelected = selectedCase?.case_ref === c.case_ref;
              return (
                <div
                  key={c.case_ref}
                  onClick={() => setSelectedCaseRef(c.case_ref)}
                  className="card"
                  style={{
                    cursor: 'pointer',
                    padding: '1rem',
                    background: isSelected ? '#182544' : '#0d1527',
                    borderColor: isSelected ? '#06b6d4' : '#1e293b',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span className="font-mono" style={{ fontWeight: 700, color: '#38bdf8', fontSize: '0.9rem' }}>
                      {c.case_ref}
                    </span>
                    <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.9rem' }}>
                      ₹{c.amount.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                    {c.customer_name} • {c.category}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={12} /> Escalated by Agent Policy
                  </div>
                </div>
              );
            })}
          </div>

          {/* Review Details & Verdict Action */}
          {selectedCase && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc' }}>
                    Case Review: {selectedCase.case_ref}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Order ID: {selectedCase.order_id} • Customer: {selectedCase.customer_name}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8' }}>
                    ₹{selectedCase.amount.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Delivery: {selectedCase.days_since_delivery}d ago
                  </div>
                </div>
              </div>

              {/* Agent's Context & Rule Hits */}
              <div style={{ padding: '0.875rem', background: '#0d1527', borderRadius: '8px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Agent BlackBox Audit Context
                </div>
                {decisionEntry?.payload?.rule_hits && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.75rem' }}>
                    {decisionEntry.payload.rule_hits.map((hit: string, i: number) => (
                      <div key={i} style={{ color: '#fbbf24', fontSize: '0.8rem', fontWeight: 600 }}>
                        ⚠️ {hit}
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ fontSize: '0.8rem', color: '#e2e8f0', background: '#131d36', padding: '0.6rem', borderRadius: '6px' }}>
                  <strong>AI Assessment:</strong> {decisionEntry?.payload?.llm_output?.reasoning || 'Elevated risk parameters.'}
                </div>
              </div>

              {/* Customer Reason Text */}
              <div>
                <label className="input-label">Customer Statement</label>
                <div style={{ fontSize: '0.85rem', color: '#cbd5e1', background: '#090d16', padding: '0.75rem', borderRadius: '8px', border: '1px solid #1e293b', fontStyle: 'italic' }}>
                  "{selectedCase.reason_text}"
                </div>
              </div>

              {/* Review Decision Form */}
              <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid #1e293b', paddingTop: '1rem' }}>
                <div>
                  <label className="input-label">Human Verdict</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <button
                      type="button"
                      className={`btn ${verdict === 'APPROVE' ? 'btn-success' : 'btn-secondary'}`}
                      onClick={() => setVerdict('APPROVE')}
                      style={{ padding: '0.75rem' }}
                    >
                      <CheckCircle2 size={18} />
                      <span>Approve Refund</span>
                    </button>
                    <button
                      type="button"
                      className={`btn ${verdict === 'DENY' ? 'btn-danger' : 'btn-secondary'}`}
                      onClick={() => setVerdict('DENY')}
                      style={{ padding: '0.75rem' }}
                    >
                      <XCircle size={18} />
                      <span>Deny Refund</span>
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="input-label">Reviewer Signature</label>
                    <input
                      className="input font-mono"
                      value={reviewer}
                      onChange={e => setReviewer(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="input-label">Linked Decision Block</label>
                    <input
                      className="input font-mono"
                      value={`Seq #${decisionEntry?.seq || 'N/A'}`}
                      disabled
                      style={{ opacity: 0.7 }}
                    />
                  </div>
                </div>

                <div>
                  <label className="input-label">
                    Mandatory Reviewer Audit Justification Note
                  </label>
                  <textarea
                    className="textarea"
                    rows={3}
                    placeholder="e.g. Verified customer provided unboxing photo showing transit crack. Authorizing refund under exception policy."
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  <UserCheck size={16} />
                  <span>{submitting ? 'Appending Verdict...' : 'Commit Human Review to Hash-Chained Ledger'}</span>
                </button>
              </form>

            </div>
          )}

        </div>
      )}

    </div>
  );
};
