import React, { useState, useEffect } from 'react';
import {
  Bell,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  RefreshCw,
  Filter,
  CheckCheck,
  UserCheck,
  Radio,
  ArrowRight,
  Info,
  Layers,
  Sparkles
} from 'lucide-react';
import { api } from '../../services/api';

export interface UserNotificationItem {
  id: string;
  type: 'AUTOMATED_THREAT_WARNING' | 'ADMIN_NOTIFICATION';
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: string;
  reason: string;
  rule_code?: string;
  risk_score?: number;
  incident_id?: string;
  admin_sender?: string;
  recommended_action: string;
  read: boolean;
}

export const UserNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<UserNotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'THREAT' | 'ADMIN' | 'UNREAD'>('ALL');
  const [markingId, setMarkingId] = useState<string | null>(null);

  const fetchNotifications = async (silent: boolean = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await api.getUserNotifications();
      setNotifications(data || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      if (!silent) setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // 1. Live real-time background polling every 2.5 seconds
    const interval = setInterval(() => {
      fetchNotifications(true);
    }, 2500);

    // 2. Immediate window event listener for local actions
    const handleUpdate = () => fetchNotifications(true);
    window.addEventListener('cloudshield:notification-update', handleUpdate);

    // 3. Cross-tab real-time BroadcastChannel sync
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('cloudshield_telemetry');
      bc.onmessage = () => fetchNotifications(true);
    } catch (e) {}

    return () => {
      clearInterval(interval);
      window.removeEventListener('cloudshield:notification-update', handleUpdate);
      if (bc) bc.close();
    };
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchNotifications(false);
  };

  const handleMarkAsRead = async (id: string) => {
    setMarkingId(id);
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark read:', err);
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const filtered = notifications.filter((n) => {
    if (activeTab === 'THREAT') return n.type === 'AUTOMATED_THREAT_WARNING';
    if (activeTab === 'ADMIN') return n.type === 'ADMIN_NOTIFICATION';
    if (activeTab === 'UNREAD') return !n.read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-300 font-bold';
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-800 border-amber-300 font-semibold';
      case 'LOW':
      default:
        return 'bg-sky-100 text-sky-800 border-sky-300 font-medium';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold font-mono">
              <Bell className="w-3.5 h-3.5 text-indigo-400" />
              <span>Personal Security Advisories &bull; Real-Time Alert Dispatch</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Threat Warnings &amp; Admin Notifications
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Real-time notices generated when CloudShield detects anomalous activity on your account, alongside official directives and policy guidance issued by your organization's SOC administrator.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/15 text-center">
              <div className="text-xl font-extrabold text-amber-400 font-mono">{unreadCount}</div>
              <div className="text-[10px] text-slate-300 font-medium uppercase tracking-wider">Unread Alerts</div>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="px-3.5 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold flex items-center gap-1.5 transition-all text-white"
              >
                <CheckCheck className="w-4 h-4 text-emerald-400" />
                <span>Mark All Read</span>
              </button>
            )}

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-xl border border-white/15 text-white transition-all disabled:opacity-50"
              title="Refresh Notifications"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Filter Tabs Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Notifications ({notifications.length})
          </button>
          <button
            onClick={() => setActiveTab('THREAT')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'THREAT'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
            <span>Automated Threat Warnings</span>
          </button>
          <button
            onClick={() => setActiveTab('ADMIN')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'ADMIN'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
            <span>Admin Notices</span>
          </button>
          <button
            onClick={() => setActiveTab('UNREAD')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'UNREAD'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Unread Only ({unreadCount})
          </button>
        </div>
      </div>

      {/* 3. Notifications List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-12 text-center space-y-3 bg-white rounded-2xl border border-slate-200">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="text-xs font-semibold text-slate-500 font-mono">Loading Notifications...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">No Notifications Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You are all caught up! There are no unread warnings or pending admin messages matching your filter.
            </p>
          </div>
        ) : (
          filtered.map((item) => {
            const isThreat = item.type === 'AUTOMATED_THREAT_WARNING';
            const isMarking = markingId === item.id;
            return (
              <div
                key={item.id}
                className={`p-5 rounded-2xl border transition-all space-y-3 ${
                  !item.read
                    ? isThreat
                      ? 'bg-rose-50/20 border-rose-300 ring-2 ring-rose-500/10 shadow-sm'
                      : 'bg-indigo-50/20 border-indigo-300 ring-2 ring-indigo-500/10 shadow-sm'
                    : 'bg-white border-slate-200 hover:shadow-xs'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                        isThreat
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-indigo-100 text-indigo-700'
                      }`}
                    >
                      {isThreat ? (
                        <ShieldAlert className="w-5 h-5 text-rose-600" />
                      ) : (
                        <UserCheck className="w-5 h-5 text-indigo-600" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            isThreat
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : 'bg-indigo-100 text-indigo-800 border-indigo-300'
                          }`}
                        >
                          {isThreat ? 'Automated Threat Warning' : 'Admin Notice'}
                        </span>

                        <span
                          className={`text-[10px] uppercase px-2 py-0.5 rounded-full border ${getSeverityBadge(
                            item.severity
                          )}`}
                        >
                          {item.severity}
                        </span>

                        {item.rule_code && (
                          <span className="text-[10px] font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {item.rule_code}
                          </span>
                        )}

                        <span className="text-xs text-slate-400 font-mono">
                          {item.timestamp.replace('T', ' ').substring(0, 16)} UTC
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 mt-1">{item.title}</h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!item.read ? (
                      <button
                        onClick={() => handleMarkAsRead(item.id)}
                        disabled={isMarking}
                        className="py-1 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
                      >
                        {isMarking ? (
                          <div className="w-3 h-3 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <CheckCheck className="w-3.5 h-3.5 text-slate-500" />
                        )}
                        <span>Mark as Read</span>
                      </button>
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>Read</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Reason & Rule Explanation */}
                <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1 border border-slate-100">
                  <span className="font-bold text-slate-800 block">
                    {isThreat ? 'Detection Rule Explanation:' : 'Administrative Directive:'}
                  </span>
                  <p className="text-slate-700 leading-relaxed">{item.reason}</p>
                  {item.admin_sender && (
                    <div className="text-[11px] text-slate-500 pt-0.5 font-mono">
                      Issued by: <strong className="text-slate-700">{item.admin_sender}</strong>
                    </div>
                  )}
                </div>

                {/* Recommended Corrective Action */}
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs flex items-start gap-2.5 text-emerald-950">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-900 mr-1.5">Recommended Corrective Action:</span>
                    <span>{item.recommended_action}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
