import React, { useState } from 'react';
import { X, AlertTriangle, ShieldCheck, Clock, User, Globe, MessageSquare } from 'lucide-react';
import { Incident, IncidentStatus } from '../types';
import { SeverityBadge } from './SeverityBadge';
import { StatusBadge } from './StatusBadge';
import { useAuth } from '../context/AuthContext';

interface Props {
  incident: Incident | null;
  onClose: () => void;
  onUpdateStatus: (incidentId: string, newStatus: IncidentStatus, note?: string) => Promise<void>;
}

export const IncidentDetailModal: React.FC<Props> = ({ incident, onClose, onUpdateStatus }) => {
  const { isAnalystOrAdmin } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState<IncidentStatus>(incident?.status || 'OPEN');
  const [auditNote, setAuditNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!incident) return null;

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAnalystOrAdmin) {
      setErrorMsg('Administrative or Analyst privileges required to update incident status.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onUpdateStatus(incident.incident_id, selectedStatus, auditNote);
      setAuditNote('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update status');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-900 text-white rounded-lg">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{incident.threat_type}</h3>
              <p className="text-xs font-mono text-slate-500">Incident ID: {incident.incident_id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Status & Severity Bar */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-xs font-mono uppercase text-slate-500">Current Incident Status</div>
              <div className="mt-1 flex items-center gap-2">
                <StatusBadge status={incident.status} />
                <SeverityBadge severity={incident.severity} />
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono uppercase text-slate-500">Risk Score</div>
              <span className="font-mono text-lg font-bold text-slate-900">{incident.risk_score} / 100</span>
            </div>
          </div>

          {/* Incident Context Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <User className="w-3.5 h-3.5" />
                <span>Test Identity</span>
              </div>
              <div className="font-medium text-slate-900 truncate">{incident.test_user}</div>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <Globe className="w-3.5 h-3.5" />
                <span>Source IP</span>
              </div>
              <div className="font-mono text-xs text-slate-900 font-semibold">{incident.source_ip}</div>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Detected At</span>
              </div>
              <div className="font-mono text-xs text-slate-700">
                {new Date(incident.detected_at).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Flagged Reasons */}
          <div>
            <div className="text-xs font-semibold text-slate-700 mb-2">Detection Reasons & Flags:</div>
            <ul className="space-y-1.5">
              {incident.reasons.map((reason, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-xs text-slate-700 bg-amber-50/70 border border-amber-200/80 p-2.5 rounded-lg"
                >
                  <span className="text-amber-600 font-bold">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Audit History Timeline */}
          <div>
            <div className="text-xs font-semibold text-slate-700 mb-2">Audit History & Lifecycle:</div>
            <div className="space-y-2 border-l-2 border-slate-200 pl-4 ml-1">
              {incident.status_history.map((hist, idx) => (
                <div key={idx} className="relative text-xs">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-brand-600 border border-white" />
                  <div className="font-medium text-slate-800">
                    Status transitioned: <span className="font-mono font-semibold">{hist.from_status}</span> →{' '}
                    <span className="font-mono font-semibold text-brand-700">{hist.to_status}</span>
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    by {hist.updated_by} at {new Date(hist.updated_at).toLocaleString()}
                  </div>
                  {hist.note && (
                    <div className="mt-1 p-2 bg-slate-50 rounded border border-slate-200 text-slate-600 italic">
                      "{hist.note}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Update Status Form (Admin / Analyst Role) */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-slate-900 text-xs">Triage Incident Status:</span>
              {!isAnalystOrAdmin && (
                <span className="text-[11px] text-amber-600 font-medium">Read-only (Role: User)</span>
              )}
            </div>

            {errorMsg && (
              <div className="p-2 mb-3 bg-red-50 text-red-700 border border-red-200 rounded text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleStatusSubmit} className="space-y-3">
              <div className="flex items-center gap-2">
                {(['OPEN', 'INVESTIGATING', 'RESOLVED'] as IncidentStatus[]).map((st) => (
                  <label
                    key={st}
                    className={`flex-1 flex items-center justify-center py-2 px-3 rounded-lg border text-xs font-mono font-medium cursor-pointer transition-all ${
                      selectedStatus === st
                        ? 'bg-navy-900 text-white border-navy-900 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    } ${!isAnalystOrAdmin ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={st}
                      checked={selectedStatus === st}
                      onChange={() => setSelectedStatus(st)}
                      disabled={!isAnalystOrAdmin}
                      className="sr-only"
                    />
                    {st}
                  </label>
                ))}
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Optional audit log note / mitigation summary..."
                  value={auditNote}
                  onChange={(e) => setAuditNote(e.target.value)}
                  disabled={!isAnalystOrAdmin}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!isAnalystOrAdmin || isSubmitting || selectedStatus === incident.status}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  {isSubmitting ? 'Updating...' : 'Persist Status Change'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
