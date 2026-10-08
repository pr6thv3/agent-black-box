import React from 'react';
import {
  ShieldCheck, AlertTriangle, Cpu, LayoutDashboard, FileInput,
  ClipboardCheck, FileCheck2, ScanSearch, ChevronRight, CircleDot,
  UserRound, Activity,
} from 'lucide-react';
import { VerificationResult } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  auditStatus: VerificationResult;
  pendingReviewsCount: number;
  currentRole: string;
  setCurrentRole: (role: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Overview', description: 'System health & activity', icon: LayoutDashboard },
  { id: 'submit', label: 'Case Intake', description: 'Run a new agent decision', icon: FileInput },
  { id: 'review', label: 'Review Queue', description: 'Human-in-the-loop actions', icon: ClipboardCheck },
  { id: 'ledger', label: 'Audit Ledger', description: 'Immutable decision history', icon: FileCheck2 },
  { id: 'integrity', label: 'Integrity', description: 'Hash chain & anchors', icon: ScanSearch },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeTab, setActiveTab, auditStatus, pendingReviewsCount, currentRole, setCurrentRole,
}) => {
  const activeLabel = (navItems.find((n) => n.id === activeTab) || navItems[0]).label;

  return (
    <>
      <aside className="app-sidebar">
        <button className="brand-block" onClick={() => setActiveTab('dashboard')} aria-label="Open AgentBlackBox overview">
          <span className="brand-mark"><Cpu size={19} /></span>
          <span className="brand-copy">
            <strong>AgentBlackBox</strong>
            <small>NEURALDAO 2.0</small>
          </span>
        </button>

        <div className="sidebar-section-label">CONTROL PLANE</div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={'sidebar-item ' + (active ? 'is-active' : '')}
                onClick={() => setActiveTab(item.id)}
              >
                <span className="sidebar-icon"><Icon size={16} /></span>
                <span className="sidebar-item-copy">
                  <span>{item.label}</span>
                  <small>{item.description}</small>
                </span>
                {item.id === 'review' && pendingReviewsCount > 0
                  ? <span className="sidebar-count">{pendingReviewsCount}</span>
                  : <ChevronRight size={14} className="sidebar-chevron" />}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-status-card">
          <div className="sidebar-status-top">
            <span className={'status-dot ' + (auditStatus.isValid ? 'ok' : 'bad')} />
            <span>{auditStatus.isValid ? 'Ledger verified' : 'Integrity alert'}</span>
          </div>
          <div className="font-mono sidebar-status-meta">
            {auditStatus.isValid ? 'HEAD #' + auditStatus.totalEntries : 'SEQ #' + (auditStatus.brokenSeq || '?')}
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-live">
            <Activity size={13} />
            <span>Agent runtime online</span>
            <span className="live-pulse" />
          </div>
          <span className="sidebar-version">v1.0.0 • demo mode</span>
        </div>
      </aside>

      <header className="topbar">
        <div className="topbar-mobile-brand">
          <span className="brand-mark"><Cpu size={17} /></span>
          <strong>AgentBlackBox</strong>
        </div>

        <div className="topbar-breadcrumb">
          <span className="topbar-kicker">AUTONOMOUS DECISION CONTROL</span>
          <span className="topbar-title">{activeLabel}</span>
        </div>

        <div className="topbar-actions">
          <button className="topbar-integrity" onClick={() => setActiveTab('integrity')}>
            {auditStatus.isValid ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
            <span>{auditStatus.isValid ? 'CHAIN SECURE' : 'TAMPER @ #' + auditStatus.brokenSeq}</span>
          </button>

          <div className="topbar-divider" />

          <div className="role-control">
            <UserRound size={14} />
            <select value={currentRole} onChange={(e) => setCurrentRole(e.target.value)} aria-label="Current role">
              <option value="Auditor">Auditor</option>
              <option value="Reviewer">Reviewer</option>
              <option value="Operator">Operator</option>
            </select>
          </div>
          <span className="role-online"><CircleDot size={12} /> LIVE</span>
        </div>
      </header>
    </>
  );
};
