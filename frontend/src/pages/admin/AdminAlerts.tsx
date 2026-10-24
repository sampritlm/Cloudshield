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
  Hash,
  Mail
} from 'lucide-react';
import { api } from '../../services/api';
import { AlertItem } from '../../types';
import { SeverityBadge } from '../../components/SeverityBadge';

export const AdminAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Gmail / SNS Subscribers state
  const [subscribersList, setSubscribersList] = useState<any[]>([]);
  const [subscribersInfo, setSubscribersInfo] = useState<any>(null);
  const [newEmailInput, setNewEmailInput] = useState('lmsampritbtech24@rvu.edu.in');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isDirectTesting, setIsDirectTesting] = useState<string | null>(null);

  const fetchAlerts = async (silent: boolean = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await api.getAlerts();
      setAlerts(data || []);
    } catch (err: any) {
      if (!silent) setMessage({ type: 'error', text: err.message || 'Failed to fetch alerts' });
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const fetchSubscribers = async () => {
    try {
      const data = await api.getAlertSubscribers();
      setSubscribersInfo(data);
      setSubscribersList(data?.subscribers || []);
    } catch (err) {
      console.error('Failed to fetch subscribers', err);
    }
  };

  useEffect(() => {
    fetchAlerts();
    fetchSubscribers();

    // 1. Live real-time background polling every 2.5 seconds
    const interval = setInterval(() => {
      fetchAlerts(true);
    }, 2500);

    // 2. Immediate window event listener for local actions
    const handleUpdate = () => fetchAlerts(true);
    window.addEventListener('cloudshield:notification-update', handleUpdate);

    // 3. Cross-tab real-time BroadcastChannel sync
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('cloudshield_telemetry');
      bc.onmessage = () => fetchAlerts(true);
    } catch (e) {}

    return () => {
      clearInterval(interval);
      window.removeEventListener('cloudshield:notification-update', handleUpdate);
      if (bc) bc.close();
    };
  }, []);

  const handleSubscribeEmail = async () => {
    if (!newEmailInput.trim()) return;
    setIsSubscribing(true);
    setMessage(null);
    try {
      const res = await api.subscribeEmailToAlerts(newEmailInput.trim());
      setMessage({
        type: 'success',
        text: res.message || `Subscribed ${newEmailInput} to Amazon SNS topic!`
      });
      fetchSubscribers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to subscribe email' });
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleUnsubscribeEmail = async (email: string) => {
    setMessage(null);
    try {
      await api.unsubscribeEmailFromAlerts(email);
      setMessage({ type: 'success', text: `Unsubscribed ${email} from threat alerts.` });
      fetchSubscribers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to unsubscribe' });
    }
  };

  const handleSendDirectTest = async (email: string) => {
    setIsDirectTesting(email);
    setMessage(null);
    try {
      const res = await api.sendDirectTestAlert(email);
      setMessage({
        type: 'success',
        text: `Urgent test alert sent to ${email}! Status: ${res.status || 'SENT'}`
      });
      fetchAlerts();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to dispatch test alert' });
    } finally {
      setIsDirectTesting(null);
    }
  };


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
            onClick={() => fetchAlerts(false)}
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

      {/* Connect Gmail to Amazon SNS Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-300">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2">
                Connect Gmail to Amazon SNS Alerts
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Live Email Push
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Automatically deliver High & Critical security incident alerts directly to your personal or corporate Gmail inbox
              </p>
            </div>
          </div>

          <div className="text-xs font-mono text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
            Topic: <span className="text-amber-300">{subscribersInfo?.topic_arn?.split(':').pop() || 'cloudshield-alerts'}</span>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                placeholder="Enter your Gmail address (e.g. yourname@gmail.com or lmsampritbtech24@rvu.edu.in)"
                value={newEmailInput}
                onChange={(e) => setNewEmailInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs text-slate-800 bg-slate-50/50"
              />
            </div>

            <button
              onClick={handleSubscribeEmail}
              disabled={isSubscribing || !newEmailInput.trim()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              <Send className={`w-3.5 h-3.5 ${isSubscribing ? 'animate-spin' : ''}`} />
              {isSubscribing ? 'Subscribing...' : 'Subscribe Gmail to Alerts'}
            </button>
          </div>

          {/* Subscribers List */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
            <div className="px-4 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Active Gmail & Email Subscribers ({subscribersList.length})</span>
              <span className="text-[11px] font-normal text-slate-500">AWS SNS Email Protocol</span>
            </div>

            {subscribersList.length > 0 ? (
              <div className="divide-y divide-slate-200">
                {subscribersList.map((sub: any, idx: number) => (
                  <div key={idx} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                          {sub.email}
                          {sub.status === 'CONFIRMED' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Confirmed
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Check Gmail to Confirm
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Subscribed: {sub.subscribed_at ? new Date(sub.subscribed_at).toLocaleString() : 'Active'} • {sub.mode || 'AWS SNS'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSendDirectTest(sub.email)}
                        disabled={isDirectTesting === sub.email}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all disabled:opacity-50"
                      >
                        <Send className={`w-3 h-3 ${isDirectTesting === sub.email ? 'animate-spin' : ''}`} />
                        {isDirectTesting === sub.email ? 'Sending...' : 'Send Test Alert'}
                      </button>

                      <button
                        onClick={() => handleUnsubscribeEmail(sub.email)}
                        className="px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-all"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500">
                No email subscribers registered yet. Add your Gmail above to receive instant threat alerts!
              </div>
            )}
          </div>

          {/* Helpful SNS Explanation Banner */}
          <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900 flex items-start gap-2.5">
            <ExternalLink className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">How AWS SNS Email Delivery Works: </span>
              When you enter your Gmail, Amazon SNS dispatches an email titled <em>"AWS Notification - Subscription Confirmation"</em>. 
              Open Gmail and click <strong>"Confirm subscription"</strong>. From that moment on, whenever CloudShield detects a High or Critical threat, an automated security incident alert will ping your phone and Gmail inbox!
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
