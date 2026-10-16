import React, { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  BookOpen,
  ShieldAlert,
  Info,
  CheckCircle2,
  Clock,
  RefreshCw,
  Filter
} from 'lucide-react';
import { api } from '../../services/api';
import { UserNotificationItem } from '../../types';

export const UserNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<UserNotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const data = await api.getUserNotifications();
      setNotifications(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const filtered = filterType === 'ALL'
    ? notifications
    : notifications.filter(n => n.type === filterType);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Bell className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900">Notifications & Activity Feed</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Personal alerts, phishing simulation outcomes, training assignment notices, and account timeline
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 shadow-sm"
          >
            <option value="ALL">All Notification Types</option>
            <option value="SIMULATION">Phishing Simulations</option>
            <option value="TRAINING">Training Reminders</option>
            <option value="SECURITY_ALERT">Security Advisories</option>
            <option value="INFO">General Information</option>
          </select>

          <button
            onClick={fetchNotifications}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 shadow-sm transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Notifications Timeline List */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-xl border bg-white shadow-sm flex items-start gap-3.5 transition-all ${
                !item.read ? 'border-sky-300 ring-1 ring-sky-100 bg-sky-50/20' : 'border-slate-200'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  item.type === 'SIMULATION'
                    ? 'bg-sky-100 text-sky-700'
                    : item.type === 'TRAINING'
                    ? 'bg-indigo-100 text-indigo-700'
                    : item.type === 'SECURITY_ALERT'
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {item.type === 'SIMULATION' && <Mail className="w-4 h-4" />}
                {item.type === 'TRAINING' && <BookOpen className="w-4 h-4" />}
                {item.type === 'SECURITY_ALERT' && <ShieldAlert className="w-4 h-4" />}
                {item.type === 'INFO' && <Info className="w-4 h-4" />}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900">{item.title}</span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(item.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{item.message}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm text-xs text-slate-400">
          No notifications in this category.
        </div>
      )}
    </div>
  );
};
