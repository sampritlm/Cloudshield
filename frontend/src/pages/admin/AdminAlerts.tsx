import React, { useState, useEffect } from 'react';
import {
  Bell,
  AlertTriangle,
  Radio,
  Send,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldAlert,
  Server,
  RefreshCw,
  Hash
} from 'lucide-react';
import { api } from '../../services/api';
import { AlertItem } from '../../types';
import { SeverityBadge } from '../../components/SeverityBadge';

export const AdminAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAlerts();
      setAlerts(data || []);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to fetch alerts' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleTestSns = async () => {
    setIsSendingTest(true);
    setMessage(null);
    try {
      const res = await api.triggerTestSnsAlert('CloudShield Administrator Verification Alert', 'Test alert dispatched from Admin Console.');
      setMessage({
        type: 'success',
        text: `SNS Notification Test Dispatched! Status: ${res.status || 'PUBLISHED'} (Topic: ${res.topic_arn || 'Configured SNS Topic'})`
      });
      fetchAlerts();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to trigger test alert' });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <Bell className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900">Alerts & Notification Feeds</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time high and critical severity incident alerts, Amazon SNS distribution pipeline, and notification audit logs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAlerts}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 shadow-sm transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleTestSns}
            disabled={isSendingTest}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            <Radio className={`w-3.5 h-3.5 ${isSendingTest ? 'animate-spin' : ''}`} />
            {isSendingTest ? 'Dispatching...' : 'Dispatch Test SNS Alert'}
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 text-xs ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              High / Critical Threat Alerts
            </div>
            <div className="text-xl font-bold text-slate-900">{alerts.length}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center text-sky-600 shrink-0">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              SNS Notification Channel
            </div>
            <div className="text-sm font-bold text-emerald-600 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Active & Operational
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Priority Escalation Mode
            </div>
            <div className="text-sm font-bold text-slate-900">
              Immediate SQS & SNS Push
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-slate-600" />
            <h2 className="text-sm font-bold text-slate-900">Dispatched Incident Alerts</h2>
          </div>
          <span className="text-xs text-slate-500">
            {alerts.length} high priority threat events
          </span>
        </div>

        {alerts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-mono text-[11px]">
                <tr>
                  <th className="py-3 px-4">Alert ID</th>
                  <th className="py-3 px-4">Threat Type</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Associated Target</th>
                  <th className="py-3 px-4">Detected Timestamp</th>
                  <th className="py-3 px-4">Amazon SNS Status</th>
                  <th className="py-3 px-4">Incident State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alerts.map((alt) => (
                  <tr key={alt.alert_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {alt.alert_id}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div>{alt.threat_type}</div>
                      <div className="text-[11px] text-slate-500 font-mono">Risk: {alt.risk_score} / 100</div>
                    </td>
                    <td className="py-3 px-4">
                      <SeverityBadge severity={alt.severity} />
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div className="font-medium text-slate-900">{alt.test_user}</div>
                      <div className="text-[11px] text-slate-400 font-mono">IP: {alt.source_ip}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono">
                      {new Date(alt.detected_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            alt.sns_status === 'PUBLISHED' || alt.sns_status === 'SENT_SIMULATED'
                              ? 'bg-emerald-500'
                              : 'bg-amber-500'
                          }`}
                        />
                        <span className="font-bold text-[11px] text-slate-700">
                          {alt.sns_status}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]">
                        {alt.topic_arn}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {alt.incident_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 text-xs">
            No active High/Critical alerts recorded yet.
          </div>
        )}
      </div>
    </div>
  );
};
