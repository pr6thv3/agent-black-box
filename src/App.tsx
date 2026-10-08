import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { SubmitCase } from './components/SubmitCase';
import { ReviewQueue } from './components/ReviewQueue';
import { LedgerView } from './components/LedgerView';
import { IntegrityPanel } from './components/IntegrityPanel';
import { store } from './lib/store';
import { verifyLedger } from './lib/crypto';
import { VerificationResult } from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [currentRole, setCurrentRole] = useState<string>('Auditor');
  const [cases, setCases] = useState(store.getCases());
  const [ledger, setLedger] = useState(store.getLedger());
  const [anchors, setAnchors] = useState(store.getAnchors());
  const [auditResult, setAuditResult] = useState<VerificationResult>({
    isValid: true,
    totalEntries: 0,
  });

  const runAudit = async () => {
    const currentLedger = store.getLedger();
    const result = await verifyLedger(currentLedger);
    setAuditResult(result);
  };

  useEffect(() => {
    // Initialize initial synthetic cases if empty
    store.initSeed().then(() => {
      setCases(store.getCases());
      setLedger(store.getLedger());
      setAnchors(store.getAnchors());
      runAudit();
    });

    // Subscribe to store updates
    const unsubscribe = store.subscribe(() => {
      setCases(store.getCases());
      setLedger(store.getLedger());
      setAnchors(store.getAnchors());
      runAudit();
    });

    return unsubscribe;
  }, []);

  const reviewedCaseRefs = new Set(
    ledger.filter(e => e.event_type === 'HUMAN_REVIEW').map(e => e.case_ref)
  );
  const pendingReviewsCount = cases.filter(
    c => c.status === 'escalated' && !reviewedCaseRefs.has(c.case_ref)
  ).length;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#090d16' }}>
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        auditStatus={auditResult}
        pendingReviewsCount={pendingReviewsCount}
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
      />

      <main className="container" style={{ flex: 1, padding: '2rem 1.25rem' }}>
        {activeTab === 'dashboard' && (
          <Dashboard
            cases={cases}
            ledger={ledger}
            anchors={anchors}
            auditStatus={auditResult}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'submit' && (
          <SubmitCase
            onCaseSubmitted={() => {
              // Option to switch to ledger or review
            }}
          />
        )}

        {activeTab === 'review' && (
          <ReviewQueue
            cases={cases}
            ledger={ledger}
            currentRole={currentRole}
          />
        )}

        {activeTab === 'ledger' && (
          <LedgerView ledger={ledger} />
        )}

        {activeTab === 'integrity' && (
          <IntegrityPanel
            ledger={ledger}
            anchors={anchors}
            auditResult={auditResult}
            onAuditTriggered={runAudit}
          />
        )}
      </main>

      <footer style={{ borderTop: '1px solid #1e293b', padding: '1.25rem 0', background: '#090d16', marginTop: 'auto' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            AgentBlackBox // NEURALDAO 2.0 • AI/ML + Blockchain Flight Recorder
          </div>
          <div>
            SHA-256 Hash Chain Verified • Ethereum Testnet Anchor
          </div>
        </div>
      </footer>
    </div>
  );
};
