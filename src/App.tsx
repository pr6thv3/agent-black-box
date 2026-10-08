import React, { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
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
  const [auditResult, setAuditResult] = useState<VerificationResult>({ isValid: true, totalEntries: 0 });

  const runAudit = async () => {
    setAuditResult(await verifyLedger(store.getLedger()));
  };

  useEffect(() => {
    store.initSeed().then(() => {
      setCases(store.getCases());
      setLedger(store.getLedger());
      setAnchors(store.getAnchors());
      runAudit();
    });

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
    <div className="app-shell">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        auditStatus={auditResult}
        pendingReviewsCount={pendingReviewsCount}
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
      />

      <div className="app-content">
        <main className="page-container">
          {activeTab === 'dashboard' && (
            <Dashboard cases={cases} ledger={ledger} anchors={anchors} auditStatus={auditResult} setActiveTab={setActiveTab} />
          )}
          {activeTab === 'submit' && <SubmitCase onCaseSubmitted={() => {}} />}
          {activeTab === 'review' && <ReviewQueue cases={cases} ledger={ledger} currentRole={currentRole} />}
          {activeTab === 'ledger' && <LedgerView ledger={ledger} />}
          {activeTab === 'integrity' && (
            <IntegrityPanel ledger={ledger} anchors={anchors} auditResult={auditResult} onAuditTriggered={runAudit} />
          )}
        </main>

        <footer className="app-footer">
          <div>AgentBlackBox • autonomous decision flight recorder</div>
          <div className="footer-proof">
            <ShieldCheck size={13} />
            SHA-256 chain <span>•</span> Ethereum Sepolia anchor
          </div>
        </footer>
      </div>
    </div>
  );
};
