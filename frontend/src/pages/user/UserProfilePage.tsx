import React, { useState } from 'react';
import {
  User,
  Mail,
  Shield,
  KeyRound,
  Bell,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Save,
  Lock,
  Calendar,
  Clock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export const UserProfilePage: React.FC = () => {
  const { user, logout } = useAuth();

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Preferences state
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [simSummaries, setSimSummaries] = useState(true);
  const [trainingReminders, setTrainingReminders] = useState(true);
  const [isSavingPref, setIsSavingPref] = useState(false);
  const [prefMessage, setPrefMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 8 characters' });
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await api.changeUserPassword(currentPassword, newPassword);
      setPasswordMessage({ type: 'success', text: res.message || 'Password changed successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMessage({ type: 'error', text: err.message || 'Failed to update password' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPref(true);
    setPrefMessage(null);
    try {
      await api.updateUserPreferences({
        email_alerts: emailAlerts,
        simulation_summaries: simSummaries,
        training_reminders: trainingReminders
      });
      setPrefMessage({ type: 'success', text: 'Notification preferences saved successfully' });
    } catch (err: any) {
      setPrefMessage({ type: 'error', text: err.message || 'Failed to save preferences' });
    } finally {
      setIsSavingPref(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-slate-100 text-slate-700 rounded-lg">
              <User className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900">My Profile & Account Preferences</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage your CloudShield account identity, update credentials, and set notification thresholds
          </p>
        </div>

        <button
          onClick={logout}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold shadow-sm transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out of Account
        </button>
      </div>

      {/* User Information Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-sky-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
            {user?.name?.slice(0, 2).toUpperCase() || 'US'}
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900">{user?.name}</h2>
            <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              {user?.email}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-sky-50 text-sky-700 border border-sky-200">
                {user?.role === 'admin' ? 'Administrator' : 'Normal User (Employee)'}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                ID: {user?.id}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs space-y-1 shrink-0">
          <div className="text-slate-500 text-[11px]">Authentication Protocol:</div>
          <div className="font-semibold text-slate-800">JWT Bearer (HS256)</div>
          <div className="text-slate-400 text-[10px] pt-1 font-mono">
            Password hashing: BCrypt
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Change Password Form */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Lock className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-900">Change Account Password</h3>
          </div>

          {passwordMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                passwordMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {passwordMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{passwordMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isChangingPassword}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold shadow transition-all disabled:opacity-50"
              >
                {isChangingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>

        {/* Notification Preferences */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Bell className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Notification Preferences</h3>
          </div>

          {prefMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                prefMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{prefMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleSavePreferences} className="space-y-4 text-xs">
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer">
                <div>
                  <span className="font-semibold text-slate-900 block">Simulation Result Summaries</span>
                  <span className="text-[11px] text-slate-500">Receive email breakdown after a phishing campaign</span>
                </div>
                <input
                  type="checkbox"
                  checked={simSummaries}
                  onChange={(e) => setSimSummaries(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer">
                <div>
                  <span className="font-semibold text-slate-900 block">Training Reminders</span>
                  <span className="text-[11px] text-slate-500">Periodic notices for assigned security lessons</span>
                </div>
                <input
                  type="checkbox"
                  checked={trainingReminders}
                  onChange={(e) => setTrainingReminders(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer">
                <div>
                  <span className="font-semibold text-slate-900 block">Security Advisories & Tips</span>
                  <span className="text-[11px] text-slate-500">Weekly threat intelligence bulletins</span>
                </div>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
              </label>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSavingPref}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                {isSavingPref ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
