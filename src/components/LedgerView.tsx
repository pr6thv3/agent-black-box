import React, { useState } from 'react';
import { FileCheck2, Copy, Check, Eye, Link, Terminal, Shield, ArrowDown } from 'lucide-react';
import { LedgerEntry } from '../types';
import { canonicalJson } from '../lib/crypto';

interface LedgerViewProps {
  ledger: LedgerEntry[];
}

export const LedgerView: React.FC<LedgerViewProps> = ({ ledger }) => {
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const handleCopy = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc' }}>
                Cryptographic Audit Ledger
              </h2>
              <span className="badge badge-cyan">
                {ledger.length} Chained Blocks
              </span>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
              Append-only tamper-evident flight recorder. Every decision and human override is linked to the previous block via SHA-256.
            </p>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#0d1527', borderBottom: '1px solid #1e293b', color: '#64748b', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                <th style={{ padding: '0.875rem 1rem' }}>Seq</th>
                <th style={{ padding: '0.875rem 1rem' }}>Event Type</th>
                <th style={{ padding: '0.875rem 1rem' }}>Case Ref</th>
                <th style={{ padding: '0.875rem 1rem' }}>Action / Verdict</th>
                <th style={{ padding: '0.875rem 1rem' }}>Prev Hash Pointer</th>
                <th style={{ padding: '0.875rem 1rem' }}>Block SHA-256 Hash</th>
                <th style={{ padding: '0.875rem 1rem' }}>Timestamp</th>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>Payload</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((entry, idx) => {
                const isDecision = entry.event_type === 'DECISION';
                const action = isDecision ? entry.payload?.final_action : entry.payload?.verdict;
                return (
                  <tr
                    key={entry.seq}
                    style={{
                      borderBottom: '1px solid #1e293b',
                      background: idx % 2 === 0 ? 'transparent' : 'rgba(15, 23, 42, 0.4)',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    {/* Seq */}
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 700, color: '#38bdf8' }} className="font-mono">
                      #{entry.seq}
                    </td>

                    {/* Event Type */}
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span className={`badge ${isDecision ? 'badge-purple' : 'badge-amber'}`}>
                        {entry.event_type}
                      </span>
                    </td>

                    {/* Case Ref */}
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 600, color: '#f8fafc' }}>
                      {entry.case_ref}
                    </td>

                    {/* Action */}
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span
                        className={`badge ${
                          action === 'APPROVE'
                            ? 'badge-emerald'
                            : action === 'ESCALATE'
                            ? 'badge-amber'
                            : 'badge-rose'
                        }`}
                      >
                        {action}
                      </span>
                    </td>

                    {/* Prev Hash */}
                    <td style={{ padding: '0.875rem 1rem' }} className="font-mono">
                      <span style={{ color: '#64748b' }}>
                        {entry.prev_hash.slice(0, 8)}...{entry.prev_hash.slice(-4)}
                      </span>
                    </td>

                    {/* Entry Hash */}
                    <td style={{ padding: '0.875rem 1rem' }} className="font-mono">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                          {entry.entry_hash.slice(0, 10)}...{entry.entry_hash.slice(-6)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(entry.entry_hash)}
                          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}
                          title="Copy Full Hash"
                        >
                          {copiedHash === entry.entry_hash ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </td>

                    {/* Timestamp */}
                    <td style={{ padding: '0.875rem 1rem', color: '#94a3b8', fontSize: '0.75rem' }} className="font-mono">
                      {new Date(entry.created_at).toLocaleTimeString()}
                    </td>

                    {/* Action button */}
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                        onClick={() => setSelectedEntry(entry)}
                      >
                        <Eye size={13} />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Modal */}
      {selectedEntry && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(9, 13, 22, 0.85)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1.5rem',
        }}>
          <div className="card" style={{ maxWidth: '44rem', width: '100%', maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid #06b6d4' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Terminal size={18} color="#06b6d4" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                  Block #{selectedEntry.seq} Audit Inspection
                </h3>
              </div>
              <button
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                onClick={() => setSelectedEntry(null)}
              >
                Close
              </button>
            </div>

            {/* Cryptographic breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
              <div>
                <span style={{ color: '#64748b' }}>Event Type:</span>{' '}
                <strong style={{ color: '#f8fafc' }}>{selectedEntry.event_type}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Case Reference:</span>{' '}
                <strong style={{ color: '#f8fafc' }}>{selectedEntry.case_ref}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Created At (ISO):</span>{' '}
                <code className="font-mono" style={{ color: '#94a3b8' }}>{selectedEntry.created_at}</code>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Previous Hash Pointer:</span>
                <div className="font-mono" style={{ wordBreak: 'break-all', background: '#090d16', padding: '0.4rem', borderRadius: '4px', color: '#64748b', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                  {selectedEntry.prev_hash}
                </div>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Calculated Block Hash:</span>
                <div className="font-mono" style={{ wordBreak: 'break-all', background: '#090d16', padding: '0.4rem', borderRadius: '4px', color: '#38bdf8', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                  {selectedEntry.entry_hash}
                </div>
              </div>
            </div>

            {/* Canonical Form & Payload */}
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Canonical Payload (Sorted Keys)
              </div>
              <pre className="font-mono" style={{
                background: '#090d16',
                border: '1px solid #1e293b',
                padding: '0.75rem',
                borderRadius: '8px',
                color: '#34d399',
                fontSize: '0.75rem',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all'
              }}>
                {canonicalJson(selectedEntry.payload)}
              </pre>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Full JSON Payload
              </div>
              <pre className="font-mono" style={{
                background: '#090d16',
                border: '1px solid #1e293b',
                padding: '0.75rem',
                borderRadius: '8px',
                color: '#cbd5e1',
                fontSize: '0.75rem',
                overflowX: 'auto',
                maxHeight: '12rem',
              }}>
                {JSON.stringify(selectedEntry.payload, null, 2)}
              </pre>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
