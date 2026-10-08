import React from 'react';
import { ShieldCheck, AlertTriangle, Cpu, Layers, FileCheck, CheckCircle2, UserCheck, Terminal } from 'lucide-react';
import { VerificationResult } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  auditStatus: VerificationResult;
  pendingReviewsCount: number;
  currentRole: string;
  setCurrentRole: (role: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  auditStatus,
  pendingReviewsCount,
  currentRole,
  setCurrentRole,
}) => {
  return (
    <header style={{ borderBottom: '1px solid #1e293b', background: '#090d16', position: 'sticky', top: 0, zIndex: 50 }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '4.25rem', gap: '1rem' }}>
        
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', cursor: 'pointer' }} onClick={() => setActiveTab('dashboard')}>
          <div style={{
            width: '2.5rem',
            height: '2.5rem',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(6, 182, 212, 0.4)'
          }}>
            <Cpu size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 800, fontSize: '1.125rem', letterSpacing: '-0.02em', color: '#f8fafc' }}>
                AgentBlackBox
              </span>
              <span className="badge badge-cyan" style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}>
                NEURALDAO 2.0
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              AI Flight Recorder & On-Chain Anchor
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Layers },
            { id: 'submit', label: 'Submit Case', icon: Terminal },
            { id: 'review', label: 'Review Queue', icon: UserCheck, count: pendingReviewsCount },
            { id: 'ledger', label: 'Audit Ledger', icon: FileCheck },
            { id: 'integrity', label: 'Integrity & Anchors', icon: ShieldCheck },
          ].map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.875rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: isActive ? '#1e293b' : 'transparent',
                  color: isActive ? '#38bdf8' : '#94a3b8',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
              >
                <Icon size={16} />
                <span>{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span style={{
                    background: '#f59e0b',
                    color: '#000',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.1rem 0.4rem',
                    borderRadius: '999px',
                    marginLeft: '0.1rem'
                  }}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Status Pill & Role Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Integrity Pill */}
          <div
            onClick={() => setActiveTab('integrity')}
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: auditStatus.isValid ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.15)',
              border: `1px solid ${auditStatus.isValid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.4)'}`,
              color: auditStatus.isValid ? '#34d399' : '#fb7185',
            }}
          >
            {auditStatus.isValid ? (
              <>
                <CheckCircle2 size={14} />
                <span>VERIFIED ({auditStatus.totalEntries})</span>
              </>
            ) : (
              <>
                <AlertTriangle size={14} className="animate-pulse-glow" />
                <span>TAMPER SEQ #{auditStatus.brokenSeq}</span>
              </>
            )}
          </div>

          {/* Role selector */}
          <select
            className="select"
            value={currentRole}
            onChange={(e) => setCurrentRole(e.target.value)}
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem', width: 'auto', background: '#131d36' }}
          >
            <option value="Auditor">Role: Auditor</option>
            <option value="Reviewer">Role: Reviewer</option>
            <option value="Operator">Role: Operator</option>
          </select>
        </div>

      </div>
    </header>
  );
};
