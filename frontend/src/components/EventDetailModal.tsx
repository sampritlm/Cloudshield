import React from 'react';
import { X, ShieldAlert, CheckCircle2, Clock, Terminal, Globe, User, Server } from 'lucide-react';
import { SecurityEvent } from '../types';
import { SeverityBadge } from './SeverityBadge';

interface Props {
  event: SecurityEvent | null;
  onClose: () => void;
}

export const EventDetailModal: React.FC<Props> = ({ event, onClose }) => {
  if (!event) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-navy-900 text-white rounded-lg">
              <ShieldAlert className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Security Event Telemetry</h3>
              <p className="text-xs font-mono text-slate-500">{event.event_id}</p>
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
          {/* Risk Score & Severity Summary */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-xs font-mono uppercase text-slate-500">Classification Severity</div>
              <div className="mt-1 flex items-center gap-2">
                <SeverityBadge severity={event.severity} />
                <span className="font-mono text-sm font-semibold text-slate-800">
                  Risk Score: {event.risk_score}/100
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono uppercase text-slate-500">Processing Pipeline</div>
              <span className="inline-block mt-1 font-mono text-xs px-2.5 py-1 rounded-md bg-white border border-slate-300 text-slate-700">
                {event.processed_by}
              </span>
            </div>
          </div>

          {/* Key Identifiers Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <User className="w-3.5 h-3.5" />
                <span>Test User</span>
              </div>
              <div className="font-medium text-slate-900 truncate" title={event.test_user}>
                {event.test_user}
              </div>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <Globe className="w-3.5 h-3.5" />
                <span>Source IP</span>
              </div>
              <div className="font-mono text-xs text-slate-900 font-semibold">{event.source_ip}</div>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <Server className="w-3.5 h-3.5" />
                <span>Action</span>
              </div>
              <div className="font-mono text-xs text-slate-900 truncate" title={event.action}>
                {event.action}
              </div>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Timestamp</span>
              </div>
              <div className="font-mono text-xs text-slate-700 truncate" title={event.timestamp}>
                {new Date(event.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>

          {/* Target Resource */}
          <div>
            <div className="text-xs font-semibold text-slate-700 mb-1">Target Cloud Resource:</div>
            <div className="p-2.5 bg-slate-100 rounded-md font-mono text-xs text-slate-800 break-all border border-slate-200">
              {event.resource}
            </div>
          </div>

          {/* Detection Reasons */}
          <div>
            <div className="text-xs font-semibold text-slate-700 mb-2">Detection Engine Findings:</div>
            <ul className="space-y-1.5">
              {event.detection_reasons.map((reason, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-xs text-slate-700 bg-amber-50/60 border border-amber-200/80 p-2.5 rounded-lg"
                >
                  <span className="text-amber-600 font-bold mt-0.5">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Triggered Rule Codes */}
          {event.triggered_rules.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-700 mb-2">Triggered Rule Codes:</div>
              <div className="flex flex-wrap gap-1.5">
                {event.triggered_rules.map((rule, idx) => (
                  <span
                    key={idx}
                    className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-800"
                  >
                    {rule}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Raw Payload JSON */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2">
              <Terminal className="w-3.5 h-3.5 text-slate-500" />
              <span>Raw Ingested Payload Telemetry</span>
            </div>
            <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg text-xs font-mono overflow-x-auto max-h-48">
              {JSON.stringify(event.raw_payload, null, 2)}
            </pre>
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
