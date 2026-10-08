import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  Lock,
  Flame,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { LedgerEntry, AnchorRecord, VerificationResult } from '../types';
import { store } from '../lib/store';
import { PRE_RECORDED_ANCHOR } from '../lib/anchorConfig';

interface IntegrityPanelProps {
  ledger: LedgerEntry[];
  anchors: AnchorRecord[];
  auditResult: VerificationResult;
  onAuditTriggered: () => void;
}

export const IntegrityPanel: React.FC<IntegrityPanelProps> = ({
  ledger,
  anchors,
  auditResult,
  onAuditTriggered,
}) => {
  const [copiedHead, setCopiedHead] = useState(false);
  const [tamperSeq, setTamperSeq] = useState<number>(ledger.length > 1 ? 2 : 1);
  const [anchorForm, setAnchorForm] = useState({
    network: 'Sepolia',
    contractAddress: PRE_RECORDED_ANCHOR.contractAddress,
    txHash: PRE_RECORDED_ANCHOR.txHash,
    label: `batch-1, entries 1-${ledger.length}`,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [lastRecordedAnchor, setLastRecordedAnchor] = useState<AnchorRecord | null>(null);
  const [anchorAuditResult, setAnchorAuditResult] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyingAnchor, setVerifyingAnchor] = useState(false);

  const headHash = store.getHeadHash();
  const tamperBackup = store.getTamperBackup();
  const latestAnchor = anchors.length > 0 ? anchors[0] : null;

  const handleCopyHead = () => {
    navigator.clipboard.writeText(`0x${headHash}`);
    setCopiedHead(true);
    setTimeout(() => setCopiedHead(false), 2000);
  };

  const handleRunVerify = async () => {
    setVerifying(true);
    await onAuditTriggered();
    setTimeout(() => setVerifying(false), 300);
  };

  const handleNaiveTamper = () => {
    store.simulateNaiveTamper(tamperSeq);
    onAuditTriggered();
    if (anchorAuditResult && latestAnchor) {
      handleVerifyAgainstAnchor(latestAnchor);
    }
  };

  const handleStealthTamper = async () => {
    await store.simulateStealthTamper(tamperSeq);
    onAuditTriggered();
    if (anchorAuditResult && latestAnchor) {
      handleVerifyAgainstAnchor(latestAnchor);
    }
  };

  const handleUndoTamper = async () => {
    await store.undoTamper();
    onAuditTriggered();
    if (anchorAuditResult && latestAnchor) {
      handleVerifyAgainstAnchor(latestAnchor);
    }
  };

  const handleLoadPreRecorded = () => {
    setFormError(null);
    setAnchorForm({
      network: PRE_RECORDED_ANCHOR.network,
      contractAddress: PRE_RECORDED_ANCHOR.contractAddress,
      txHash: PRE_RECORDED_ANCHOR.txHash,
      label: PRE_RECORDED_ANCHOR.label,
    });
  };

  const handleSaveAnchor = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const contractRegex = /^0x[0-9a-fA-F]{40}$/;
    if (!contractRegex.test(anchorForm.contractAddress.trim())) {
      setFormError('Contract address must be 0x followed by exactly 40 hex characters.');
      return;
    }

    const txRegex = /^0x[0-9a-fA-F]{64}$/;
    if (!txRegex.test(anchorForm.txHash.trim())) {
      setFormError('Transaction hash must be 0x followed by exactly 64 hex characters.');
      return;
    }

    const newAnchor = store.recordAnchor(
      anchorForm.network.trim() || 'Sepolia',
      anchorForm.contractAddress.trim(),
      anchorForm.txHash.trim(),
      anchorForm.label.trim()
    );

    setLastRecordedAnchor(newAnchor);
  };

  const handleVerifyAgainstAnchor = async (anchorToVerify?: AnchorRecord) => {
    const target = anchorToVerify || latestAnchor;
    if (!target) return;
    setVerifyingAnchor(true);
    const res = await store.verifyAgainstAnchor(target);
    setAnchorAuditResult({ anchorId: target.id, targetAnchor: target, ...res });
    setVerifyingAnchor(false);
  };

  const getExplorerUrl = (txHash: string) => {
    return `https://sepolia.etherscan.io/tx/${txHash}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc' }}>
                Ledger Integrity & Blockchain Anchoring
              </h2>
              <span className="badge badge-purple">M4 + M6 + M7</span>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
              Recompute the mathematical SHA-256 hash chain, simulate malicious operator database tampering, and verify against public Ethereum testnet anchors.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary"
              onClick={async () => {
                await store.resetDemo();
                await onAuditTriggered();
              }}
              style={{ fontSize: '0.8rem', padding: '0.5rem 0.85rem' }}
              title="Restore initial deterministic seed ledger"
            >
              <RotateCcw size={14} />
              <span>Reset demo</span>
            </button>

            {/* Existing internal Verify Ledger Integrity unchanged */}
            <button
              className="btn btn-primary"
              onClick={handleRunVerify}
              disabled={verifying}
              style={{ fontSize: '0.9rem', padding: '0.75rem 1.25rem' }}
            >
              <RefreshCw size={18} className={verifying ? 'animate-spin' : ''} />
              <span>Verify Ledger Integrity</span>
            </button>
          </div>
        </div>
      </div>

      {/* Internal Verification Status Card */}
      <div
        className="card"
        style={{
          background: auditResult.isValid ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.12)',
          borderColor: auditResult.isValid ? '#10b981' : '#f43f5e',
          padding: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          {auditResult.isValid ? (
            <ShieldCheck size={36} color="#10b981" style={{ flexShrink: 0 }} />
          ) : (
            <ShieldAlert size={36} color="#f43f5e" style={{ flexShrink: 0 }} className="animate-pulse-glow" />
          )}

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: auditResult.isValid ? '#34d399' : '#fb7185' }}>
                {auditResult.isValid
                  ? `Cryptographic Chain Verified (${auditResult.totalEntries} Blocks)`
                  : `TAMPERING DETECTED AT BLOCK #${auditResult.brokenSeq}!`}
              </h3>
            </div>

            <p style={{ fontSize: '0.875rem', color: '#cbd5e1', marginBottom: '0.75rem' }}>
              {auditResult.isValid
                ? 'Every ledger entry is mathematically chained from Genesis to Head. No data has been modified, omitted, or reordered.'
                : auditResult.reason}
            </p>

            {!auditResult.isValid && auditResult.expectedHash && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', background: '#090d16', padding: '0.75rem', borderRadius: '6px', fontSize: '0.75rem' }} className="font-mono">
                <div>
                  <span style={{ color: '#94a3b8' }}>Expected Hash from Payload: </span>
                  <span style={{ color: '#34d399' }}>{auditResult.expectedHash}</span>
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>Stored Database Hash: </span>
                  <span style={{ color: '#fb7185' }}>{auditResult.actualHash}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Two Column Layout: Tamper Lab & Public Anchors */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        
        {/* 1. Tamper Demonstration Lab (M6 & O2) */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ borderBottom: '1px solid #1e293b', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Flame size={18} color="#f43f5e" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                Tamper Demonstration Lab (The Wow Moment)
              </h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              Simulate a rogue database administrator attempting to alter records directly in SQL.
            </p>
          </div>

          <div>
            <label className="input-label">Select Target Block to Tamper</label>
            <select
              className="select font-mono"
              value={tamperSeq}
              onChange={e => setTamperSeq(Number(e.target.value))}
            >
              {ledger.map(entry => (
                <option key={entry.seq} value={entry.seq}>
                  Block #{entry.seq} - {entry.event_type} ({entry.case_ref})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleNaiveTamper}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <AlertTriangle size={16} />
                <span>Simulate Naive Tamper</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleStealthTamper}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <RotateCcw size={16} />
                <span>Simulate Stealth Tamper</span>
              </button>
            </div>

            {tamperBackup && (
              <button
                type="button"
                className="btn btn-success"
                onClick={handleUndoTamper}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <CheckCircle2 size={16} />
                <span>Undo Tamper</span>
              </button>
            )}

            <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', margin: '0.25rem 0' }}>
              Naive tamper is caught by the chain. Stealth tamper fools the database, but not the public anchor.
            </p>
          </div>

          <div style={{ padding: '0.75rem', background: '#0d1527', borderRadius: '8px', border: '1px solid #1e293b', fontSize: '0.8rem', color: '#94a3b8' }}>
            <strong>Demo Walkthrough:</strong>
            <ol style={{ paddingLeft: '1.25rem', marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <li>Notice ledger is currently 100% verified (Green).</li>
              <li>Click <em>Simulate Naive Tamper</em> → Internal chain breaks (Red).</li>
              <li>Click <em>Simulate Stealth Tamper</em> → Internal chain passes (Green), but On-Chain Anchor fails (Red)!</li>
              <li>Click <em>Undo Tamper</em> → Both checks pass (Green)!</li>
            </ol>
          </div>
        </div>

        {/* 2. Public Blockchain Anchor Panel (M7 & O1) */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ borderBottom: '1px solid #1e293b', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lock size={18} color="#06b6d4" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                On-Chain Blockchain Anchor Panel
              </h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              Commit the ledger head fingerprint onto an immutable Ethereum smart contract.
            </p>
          </div>

          {/* Prepare Anchor Section (Requirement 1) */}
          <div style={{ background: '#0d1527', border: '1px solid #1e293b', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                Prepare Anchor
              </span>
              <span className="badge badge-cyan" style={{ fontSize: '0.75rem' }}>
                Height: {ledger.length} entries (up_to_seq: {ledger.length})
              </span>
            </div>

            <div>
              <label className="input-label">32-Byte Head Hash (Bytes32)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  className="input font-mono"
                  value={`0x${headHash}`}
                  readOnly
                  style={{ color: '#38bdf8', fontSize: '0.8rem', background: '#090d16' }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCopyHead}
                  style={{ padding: '0.625rem' }}
                  title="Copy 0x + 64-char Head Hash"
                >
                  {copiedHead ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                </button>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                Hex formatted (0x + 64 characters) committing all {ledger.length} entries to testnet
              </span>
            </div>
          </div>

          {/* Record Anchor Form (Requirement 2 & 3) */}
          <form onSubmit={handleSaveAnchor} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                Record Anchor
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleLoadPreRecorded}
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                title="Populate form from anchorConfig.ts"
              >
                <Sparkles size={13} color="#22d3ee" />
                <span>Load pre-recorded anchor</span>
              </button>
            </div>

            {formError && (
              <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid #f43f5e', borderRadius: '6px', color: '#fb7185', fontSize: '0.75rem' }}>
                {formError}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <label className="input-label">Network</label>
                <input
                  className="input"
                  value={anchorForm.network}
                  onChange={e => setAnchorForm({ ...anchorForm, network: e.target.value })}
                  placeholder="Sepolia"
                  required
                />
              </div>
              <div>
                <label className="input-label">Batch Label</label>
                <input
                  className="input"
                  value={anchorForm.label}
                  onChange={e => setAnchorForm({ ...anchorForm, label: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="input-label">Contract Address (0x + 40 hex chars)</label>
              <input
                className="input font-mono"
                value={anchorForm.contractAddress}
                onChange={e => {
                  setAnchorForm({ ...anchorForm, contractAddress: e.target.value });
                  setFormError(null);
                }}
                placeholder="0x..."
                required
              />
            </div>

            <div>
              <label className="input-label">Transaction Hash (0x + 64 hex chars)</label>
              <input
                className="input font-mono"
                value={anchorForm.txHash}
                onChange={e => {
                  setAnchorForm({ ...anchorForm, txHash: e.target.value });
                  setFormError(null);
                }}
                placeholder="0x..."
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.25rem' }}>
              <Lock size={16} />
              <span>Record Public Testnet Anchor</span>
            </button>
          </form>

          {/* Submission Feedback Link */}
          {lastRecordedAnchor && (
            <div style={{ padding: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ color: '#34d399', fontWeight: 600 }}>
                ✓ Anchor successfully committed!
              </div>
              <a
                href={getExplorerUrl(lastRecordedAnchor.tx_hash)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#38bdf8', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <span>View on Sepolia Etherscan: {lastRecordedAnchor.tx_hash.slice(0, 18)}...</span>
                <ExternalLink size={13} />
              </a>
            </div>
          )}

        </div>

      </div>

      {/* Recorded Anchors Table & Verify Against Anchor (Requirement 4) */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
              Confirmed On-Chain Fingerprints ({anchors.length})
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Anchored fingerprints committed to Ethereum Sepolia testnet
            </span>
          </div>

          {latestAnchor && (
            <button
              className="btn btn-primary"
              onClick={() => handleVerifyAgainstAnchor(latestAnchor)}
              disabled={verifyingAnchor}
              style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
            >
              <ShieldCheck size={16} />
              <span>{verifyingAnchor ? 'Recomputing Chain...' : 'Verify Against Anchor'}</span>
            </button>
          )}
        </div>

        {/* Verification Against Anchor Banner Result */}
        {anchorAuditResult && (
          <div style={{
            marginBottom: '1rem',
            padding: '1rem',
            borderRadius: '8px',
            background: anchorAuditResult.isMatch ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.15)',
            border: `1px solid ${anchorAuditResult.isMatch ? '#10b981' : '#f43f5e'}`,
            fontSize: '0.9rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              {anchorAuditResult.isMatch ? (
                <CheckCircle2 size={20} color="#10b981" />
              ) : (
                <AlertTriangle size={20} color="#f43f5e" />
              )}
              <strong style={{ color: anchorAuditResult.isMatch ? '#34d399' : '#fb7185', fontSize: '1rem' }}>
                {anchorAuditResult.isMatch
                  ? 'Matches the public anchor'
                  : `Ledger differs from the anchored history at or before entry #${anchorAuditResult.divergenceSeq ?? anchorAuditResult.targetAnchor?.up_to_seq}`}
              </strong>
            </div>
            <div style={{ color: '#cbd5e1', fontSize: '0.8rem', marginTop: '0.35rem' }}>
              {anchorAuditResult.isMatch ? (
                <span>
                  Recomputed hash chain from payloads (1..{anchorAuditResult.targetAnchor?.up_to_seq}) matches on-chain head hash (<code className="font-mono" style={{ color: '#38bdf8' }}>{anchorAuditResult.onChainHeadHash.slice(0, 14)}...</code>).
                </span>
              ) : (
                <span>
                  Recomputed payload chain diverged from the immutable on-chain record in transaction{' '}
                  <a
                    href={getExplorerUrl(anchorAuditResult.targetAnchor?.tx_hash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#38bdf8', textDecoration: 'underline' }}
                  >
                    {anchorAuditResult.targetAnchor?.tx_hash?.slice(0, 14)}...
                  </a>
                </span>
              )}
            </div>
          </div>
        )}

        {anchors.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
            No blockchain anchors recorded yet. Copy the head hash and submit via Remix or use "Load pre-recorded anchor".
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1e293b', color: '#64748b', fontSize: '0.75rem' }}>
                  <th style={{ padding: '0.5rem 0.75rem' }}>Network</th>
                  <th style={{ padding: '0.5rem 0.75rem' }}>Height</th>
                  <th style={{ padding: '0.5rem 0.75rem' }}>Anchored Head Hash</th>
                  <th style={{ padding: '0.5rem 0.75rem' }}>Tx Hash (Explorer)</th>
                  <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>Audit</th>
                </tr>
              </thead>
              <tbody>
                {anchors.map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '0.75rem' }}>
                      <span className="badge badge-purple">{a.network}</span>
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: 600 }}>
                      Blocks 1–{a.up_to_seq}
                    </td>
                    <td style={{ padding: '0.75rem' }} className="font-mono">
                      <span style={{ color: '#38bdf8' }}>
                        {a.head_hash.slice(0, 10)}...{a.head_hash.slice(-8)}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }} className="font-mono">
                      <a
                        href={getExplorerUrl(a.tx_hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#38bdf8', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none' }}
                      >
                        <span>{a.tx_hash.slice(0, 12)}...</span>
                        <ExternalLink size={12} />
                      </a>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                        onClick={() => handleVerifyAgainstAnchor(a)}
                      >
                        Verify Against Anchor
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
