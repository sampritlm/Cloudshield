import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  KeyRound,
  Bell,
  Sliders,
  CheckCircle2,
  AlertCircle,
  EyeOff,
  Radio,
  Server,
  Cloud,
  Save,
  RefreshCw
} from 'lucide-react';
import { api } from '../../services/api';
import { SecuritySettings } from '../../types';

export const AdminSettings: React.FC = () => {
  const [settingsData, setSettingsData] = useState<SecuritySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [snsTopicArn, setSnsTopicArn] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const data = await api.getSettings();
      setSettingsData(data);
      if (data?.aws_resources?.sns_topic_arn) {
        setSnsTopicArn(data.aws_resources.sns_topic_arn);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to load system settings' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await api.updateNotificationSettings({
        sns_topic_arn: snsTopicArn.trim()
      });
      setFeedback({ type: 'success', text: res.message || 'Notification settings saved successfully' });
      fetchSettings();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to save settings' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-slate-100 text-slate-700 rounded-lg">
              <Settings className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900">Security Settings & Integration Policies</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Notification channels, masked credential protection, scoring rule weights and detection window configurations
          </p>
        </div>

        <button
          onClick={fetchSettings}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 shadow-sm transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 text-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Masked Credentials Notice Alert */}
      <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl flex items-center justify-between gap-4 text-xs text-sky-900">
        <div className="flex items-center gap-3">
          <EyeOff className="w-5 h-5 text-sky-600 shrink-0" />
          <div>
            <div className="font-bold">Credential Obfuscation Active</div>
            <div className="text-[11px] text-sky-700 mt-0.5">
              In accordance with Cloud Security Compliance standards, all API keys, webhook secrets, and private signing keys are masked and never transmitted in cleartext.
            </div>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 font-mono text-[10px] font-bold">
          Zero-Leak Enforced
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CanIPhish Integration Configuration (Masked) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <KeyRound className="w-4 h-4 text-sky-600" />
            <h2 className="text-sm font-bold text-slate-900">CanIPhish API & Webhook Credentials</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-500 block text-[11px] mb-0.5 font-semibold">API Base URL</label>
              <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800">
                {settingsData?.caniphish?.api_base_url || 'https://api.caniphish.com/api/v3'}
              </div>
            </div>

            <div>
              <label className="text-slate-500 block text-[11px] mb-0.5 font-semibold">API Key (Masked)</label>
              <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-600 flex items-center justify-between">
                <span>{settingsData?.caniphish?.api_key_masked || '••••••••••••'}</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-semibold">
                  Secured
                </span>
              </div>
            </div>

            <div>
              <label className="text-slate-500 block text-[11px] mb-0.5 font-semibold">Webhook Secret Token (Masked)</label>
              <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-600 flex items-center justify-between">
                <span>{settingsData?.caniphish?.webhook_secret_masked || '••••••••••••'}</span>
                <span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded text-[10px] font-semibold">
                  Header Match
                </span>
              </div>
            </div>

            <div>
              <label className="text-slate-500 block text-[11px] mb-0.5 font-semibold">Tenant Identifier</label>
              <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-700">
                {settingsData?.caniphish?.tenant_id || 'Auto-negotiated on entitlement check'}
              </div>
            </div>
          </div>
        </div>

        {/* AWS Notification Preferences */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Bell className="w-4 h-4 text-rose-600" />
            <h2 className="text-sm font-bold text-slate-900">Notification Preferences & Amazon SNS</h2>
          </div>

          <form onSubmit={handleSaveNotifications} className="space-y-4 text-xs">
            <div>
              <label className="text-slate-700 block font-semibold mb-1">
                Amazon SNS Alert Topic ARN
              </label>
              <input
                type="text"
                value={snsTopicArn}
                onChange={(e) => setSnsTopicArn(e.target.value)}
                placeholder="arn:aws:sns:us-east-1:123456789012:cloudshield-alerts"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono text-xs"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Dispatches instant push alerts for High and Critical threat classifications.
              </span>
            </div>

            <div className="space-y-2 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded text-rose-600 focus:ring-rose-500" />
                <span className="text-slate-700">Dispatch alerts for Critical severity events</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded text-rose-600 focus:ring-rose-500" />
                <span className="text-slate-700">Dispatch alerts for High severity events</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded text-rose-600 focus:ring-rose-500" />
                <span className="text-slate-700">Route incidents to Amazon SQS dead-letter triage queue</span>
              </label>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Detection Engine Scoring Points & Baseline Policies */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Sliders className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-bold text-slate-900">Deterministic Threat Engine Rule Weight Policies</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Failed Login Rule:</span>
            <span className="text-sm font-bold text-slate-900">+40 Points</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Threshold: 5 attempts / 300s</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Unusual External IP:</span>
            <span className="text-sm font-bold text-slate-900">+25 Points</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Untrusted IP check</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Unauthorized Resource:</span>
            <span className="text-sm font-bold text-slate-900">+45 Points</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Restricted cloud assets</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-500 block text-[11px]">High Request Frequency:</span>
            <span className="text-sm font-bold text-slate-900">+35 Points</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Threshold: 20 reqs / 60s</span>
          </div>
        </div>
      </div>
    </div>
  );
};
