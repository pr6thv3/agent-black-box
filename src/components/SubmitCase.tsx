import React, { useState } from 'react';
import { Send, Sparkles, AlertTriangle, ShieldCheck, CheckCircle2, Ban, Cpu, ArrowRight } from 'lucide-react';
import { CaseRecord, Category } from '../types';
import { DEMO_CASES } from '../lib/demoCases';
import { store } from '../lib/store';
import { evaluatePolicyRules, evaluateLLMRisk } from '../lib/policyEngine';

interface SubmitCaseProps {
  onCaseSubmitted: (caseRef: string) => void;
}

export const SubmitCase: React.FC<SubmitCaseProps> = ({ onCaseSubmitted }) => {
  const [formData, setFormData] = useState({
    case_ref: `C-${Math.floor(1000 + Math.random() * 9000)}`,
    customer_name: 'Priya Sharma',
    order_id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
    amount: 450,
    days_since_delivery: 4,
    prior_refunds_90d: 0,
    account_age_days: 410,
    category: 'damaged' as Category,
    reason_text: 'The outer retail box was torn during transit, but the item inside is largely intact. Requesting partial refund for damaged packaging.',
  });

  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const loadScenario = (index: number) => {
    const scenario = DEMO_CASES[index];
    setFormData({
      ...scenario,
      case_ref: `${scenario.case_ref}-${Math.floor(10 + Math.random() * 90)}`,
    });
    setLastResult(null);
  };

  // Preview evaluation
  const previewRules = evaluatePolicyRules({
    ...formData,
    status: 'new',
    created_at: new Date().toISOString(),
  });
  const previewLLM = evaluateLLMRisk({
    ...formData,
    status: 'new',
    created_at: new Date().toISOString(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const fullCase: CaseRecord = {
      ...formData,
      status: 'new',
      created_at: new Date().toISOString(),
    };

    try {
      const res = await store.submitCase(fullCase);
      setLastResult(res);
      onCaseSubmitted(res.caseRecord.case_ref);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header & Scenario Presets */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc' }}>
              Submit Refund Case
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
              Select a pre-configured hackathon demo scenario or test custom customer parameters.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Load Demo Presets:
            </span>
            <button type="button" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }} onClick={() => loadScenario(0)}>
              Case 1: Auto-Approve (₹450)
            </button>
            <button type="button" className="btn btn-danger" style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }} onClick={() => loadScenario(1)}>
              Case 2: Prompt Injection
            </button>
            <button type="button" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }} onClick={() => loadScenario(2)}>
              Case 3: Escalation (₹4,800)
            </button>
            <button type="button" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }} onClick={() => loadScenario(3)}>
              Case 4: Expired (&gt;30d)
            </button>
            <button type="button" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }} onClick={() => loadScenario(4)}>
              Case 5: Serial Abuse (4x)
            </button>
          </div>
        </div>
      </div>

      {/* Main Form and Live Guardrail Inspector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        
        {/* Input Form */}
        <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', borderBottom: '1px solid #1e293b', paddingBottom: '0.75rem' }}>
            Case Parameters
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="input-label">Case Reference</label>
              <input
                className="input font-mono"
                value={formData.case_ref}
                onChange={e => setFormData({ ...formData, case_ref: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="input-label">Order ID</label>
              <input
                className="input font-mono"
                value={formData.order_id}
                onChange={e => setFormData({ ...formData, order_id: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="input-label">Customer Name</label>
              <input
                className="input"
                value={formData.customer_name}
                onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="input-label">Refund Amount (INR)</label>
              <input
                type="number"
                className="input"
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            <div>
              <label className="input-label">Days Since Delivery</label>
              <input
                type="number"
                className="input"
                value={formData.days_since_delivery}
                onChange={e => setFormData({ ...formData, days_since_delivery: Number(e.target.value) })}
                required
              />
            </div>
            <div>
              <label className="input-label">Prior Refunds (90d)</label>
              <input
                type="number"
                className="input"
                value={formData.prior_refunds_90d}
                onChange={e => setFormData({ ...formData, prior_refunds_90d: Number(e.target.value) })}
                required
              />
            </div>
            <div>
              <label className="input-label">Account Age (Days)</label>
              <input
                type="number"
                className="input"
                value={formData.account_age_days}
                onChange={e => setFormData({ ...formData, account_age_days: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div>
            <label className="input-label">Category</label>
            <select
              className="select"
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value as Category })}
            >
              <option value="damaged">damaged</option>
              <option value="not_as_described">not_as_described</option>
              <option value="never_arrived">never_arrived</option>
              <option value="wrong_size">wrong_size</option>
              <option value="changed_mind">changed_mind</option>
            </select>
          </div>

          <div>
            <label className="input-label">
              Customer Reason Statement (Untrusted Input)
            </label>
            <textarea
              className="textarea"
              rows={4}
              value={formData.reason_text}
              onChange={e => setFormData({ ...formData, reason_text: e.target.value })}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '0.5rem' }}>
            <Cpu size={16} />
            <span>{loading ? 'Evaluating Agent Pipeline...' : 'Run Agent & Commit to Ledger'}</span>
          </button>
        </form>

        {/* Live Guardrail Inspector & Evaluation Output */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Pre-Execution Rule Guardrail Inspector */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={18} color="#06b6d4" />
              <span>Real-Time Policy Guardrail Preview</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ padding: '0.75rem', background: '#0d1527', borderRadius: '8px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>
                  Deterministic Hard Rules (R1–R3)
                </div>
                {previewRules.hits.length > 0 ? (
                  previewRules.hits.map((hit, idx) => (
                    <div key={idx} style={{ color: '#fb7185', fontSize: '0.8rem', fontWeight: 600 }}>
                      ⚠️ {hit}
                    </div>
                  ))
                ) : (
                  <div style={{ color: '#34d399', fontSize: '0.8rem' }}>
                    ✓ All deterministic policy criteria satisfied (within 30d, &lt;=₹2k, &lt;3 refunds)
                  </div>
                )}
              </div>

              <div style={{ padding: '0.75rem', background: '#0d1527', borderRadius: '8px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>
                  LLM AI Assessor Sandbox (R4–R6)
                </div>
                {previewLLM.injection_attempt ? (
                  <div style={{ color: '#f43f5e', fontSize: '0.8rem', fontWeight: 700 }}>
                    🚨 PROMPT INJECTION ATTACK DETECTED!
                    <div style={{ fontSize: '0.75rem', fontWeight: 400, color: '#fca5a5', marginTop: '0.25rem' }}>
                      {previewLLM.reasoning}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '0.8rem', color: previewLLM.risk_score > 30 ? '#fbbf24' : '#38bdf8' }}>
                      Estimated Risk Score: {previewLLM.risk_score}/100
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                      {previewLLM.reasoning}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ padding: '0.75rem', background: 'rgba(6, 182, 212, 0.08)', borderRadius: '8px', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Monotonicity Guardrail: The AI can only make the outcome <em>stricter</em> than policy, never looser.
                </span>
              </div>
            </div>
          </div>

          {/* Result Card after Submission */}
          {lastResult && (
            <div className="card card-glow" style={{ borderColor: '#06b6d4' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={18} color="#10b981" />
                  <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '1rem' }}>
                    Decision Recorded to Ledger
                  </span>
                </div>
                <span className="badge badge-purple">
                  Seq #{lastResult.ledgerEntry.seq}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Final Action:</span>
                <span
                  className={`badge ${
                    lastResult.ledgerEntry.payload.final_action === 'APPROVE'
                      ? 'badge-emerald'
                      : lastResult.ledgerEntry.payload.final_action === 'ESCALATE'
                      ? 'badge-amber'
                      : 'badge-rose'
                  }`}
                  style={{ fontSize: '0.85rem' }}
                >
                  {lastResult.ledgerEntry.payload.final_action}
                </span>
              </div>

              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                Cryptographic Fingerprint (SHA-256):
              </div>
              <div className="font-mono" style={{ fontSize: '0.75rem', background: '#090d16', padding: '0.4rem 0.6rem', borderRadius: '6px', color: '#38bdf8', wordBreak: 'break-all' }}>
                {lastResult.ledgerEntry.entry_hash}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
