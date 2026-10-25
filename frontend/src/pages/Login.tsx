import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  AlertTriangle,
  Zap,
  Activity,
  CheckCircle2,
  Clock,
  Sparkles,
  Server
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSimulatingBurst, setIsSimulatingBurst] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ruleDetail, setRuleDetail] = useState<any | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email address and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setRuleDetail(null);

    try {
      await login(email.trim(), password);
    } catch (err: any) {
      const msg = err.message || 'Authentication failed. Please check credentials.';
      setErrorMessage(msg);
      if (err.data) {
        setRuleDetail(err.data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulateBruteForceBurst = async () => {
    const targetEmail = email.trim() || 'test.victim@corp.internal';
    setEmail(targetEmail);
    setIsSimulatingBurst(true);
    setErrorMessage(null);
    setRuleDetail(null);

    try {
      const res = await api.simulateFailedLoginBurst(targetEmail);
      setRuleDetail({
        message: `Simulated 5 consecutive failed login attempts for ${targetEmail}.`,
        failed_attempts: 5,
        threshold: 5,
        window_seconds: 300,
        rule_triggered: true,
        rule_code: 'RULE_01',
        rule_name: 'Repeated Failed Login',
        penalty: '+40 pts',
        risk_score: res.risk_score,
        severity: res.severity,
        incident_created: res.incident_created,
        incident_id: res.incident_id,
        event_id: res.event_id,
        reasons: res.detection_reasons
      });
      setErrorMessage(`RULE_01 Triggered: 5 failed authentications recorded within 300-second window.`);
    } catch (err: any) {
      setErrorMessage(`Simulation error: ${err.message}`);
    } finally {
      setIsSimulatingBurst(false);
    }
  };

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage(null);
    setRuleDetail(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-10 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Shield Header */}
        <div className="flex justify-center">
          <div className="w-14 h-14 bg-navy-900 rounded-2xl flex items-center justify-center shadow-lg border border-slate-700/50">
            <Shield className="w-8 h-8 text-sky-400" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          CloudShield Console
        </h2>
        <p className="mt-1 text-center text-xs text-slate-600 max-w-sm mx-auto">
          Intelligent Cloud Security Monitoring &amp; Automated Threat Detection System
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-md border border-slate-200 rounded-2xl sm:px-10 space-y-5">
          
          {/* RULE_01 DETECTION ALERT BOX */}
          {ruleDetail && ruleDetail.rule_triggered && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-rose-50 to-red-50 border-2 border-rose-400 text-rose-900 shadow-sm animate-in fade-in duration-300">
              <div className="flex items-center gap-2 font-bold text-rose-800 text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
                <span className="font-mono bg-rose-200/80 px-1.5 py-0.5 rounded text-[10px] text-rose-900">
                  {ruleDetail.rule_code} TRIGGERED
                </span>
                <span>{ruleDetail.rule_name} ({ruleDetail.penalty})</span>
              </div>
              
              <div className="mt-2 text-xs text-rose-800 space-y-1">
                <p className="leading-snug">
                  <strong>Threshold Reached:</strong> {ruleDetail.failed_attempts} failed login attempts recorded within the {ruleDetail.window_seconds || 300}s sliding window.
                </p>
                <div className="flex items-center gap-3 pt-1 text-[11px] font-mono">
                  <span>Risk Score: <strong>{ruleDetail.risk_score} / 100</strong></span>
                  <span>Severity: <strong className="uppercase">{ruleDetail.severity}</strong></span>
                </div>
                {ruleDetail.incident_created && (
                  <div className="pt-1 text-[11px] text-rose-900 font-semibold flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-rose-600" />
                    <span>Incident Enqueued to SQS: <code className="bg-white px-1 py-0.5 rounded border border-rose-300">{ruleDetail.incident_id}</code></span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Regular Warning Box (if 1 to 4 failed attempts) */}
          {errorMessage && (!ruleDetail || !ruleDetail.rule_triggered) && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
              {ruleDetail && ruleDetail.failed_attempts && (
                <div className="text-[11px] text-amber-700 pl-6 flex items-center gap-2">
                  <span>Failed Attempts in Window: <strong>{ruleDetail.failed_attempts} of {ruleDetail.threshold || 5}</strong></span>
                  <span className="text-amber-500">&bull;</span>
                  <span>RULE_01 activates at 5</span>
                </div>
              )}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Security Identity (Email or Username)
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="admin@cloudshield.internal or cloudshield-auditor"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-900 focus:border-navy-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-900 focus:border-navy-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || isSimulatingBurst}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold shadow transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy-900 disabled:opacity-50"
            >
              {isLoading ? (
                <span>Authenticating &amp; Checking Heuristics...</span>
              ) : (
                <>
                  <span>Sign In to CloudShield</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* 1-Click RULE_01 Simulation Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSimulateBruteForceBurst}
              disabled={isSimulatingBurst || isLoading}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-50 to-rose-50 border border-rose-200 hover:border-rose-300 text-rose-900 hover:text-rose-950 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              {isSimulatingBurst ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                  <span>Evaluating 5 Failed Logins...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-amber-600 fill-current" />
                  <span>⚡ Test RULE_01 Detector (Trigger 5x Failed Logins)</span>
                </>
              )}
            </button>
            <div className="text-[10px] text-slate-500 text-center mt-1">
              Sends 5 consecutive authentication failures to verify live RULE_01 detection &amp; incident creation (+40 pts)
            </div>
          </div>

          {/* Quick Demo Credentials Fill */}
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2">
              <KeyRound className="w-3.5 h-3.5 text-slate-500" />
              <span>Seminar Evaluation Roles (Click to Quick-Fill):</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickFill('admin@cloudshield.internal', 'Admin@CloudShield2026!')}
                className="p-2 text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
              >
                <div className="font-semibold text-slate-900">Administrator</div>
                <div className="text-[11px] text-slate-600 truncate">admin@cloudshield.internal</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('user@cloudshield.internal', 'User@CloudShield2026!')}
                className="p-2 text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
              >
                <div className="font-semibold text-slate-900">Normal User</div>
                <div className="text-[11px] text-slate-600 truncate">user@cloudshield.internal</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('auditor@cloudshield.internal', 'DemoUser@CloudShield2026!')}
                className="p-2 text-left bg-indigo-50/70 hover:bg-indigo-100/70 border border-indigo-200 rounded-lg transition-colors"
              >
                <div className="font-semibold text-indigo-950 flex items-center gap-1">
                  <span>IAM Auditor</span>
                  <span className="text-[9px] bg-indigo-200 text-indigo-800 px-1 rounded">S3 Audit</span>
                </div>
                <div className="text-[11px] text-indigo-700 truncate">auditor@cloudshield.internal</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('intern@cloudshield.internal', 'DemoUser@CloudShield2026!')}
                className="p-2 text-left bg-amber-50/70 hover:bg-amber-100/70 border border-amber-200 rounded-lg transition-colors"
              >
                <div className="font-semibold text-amber-950 flex items-center gap-1">
                  <span>IAM Intern</span>
                  <span className="text-[9px] bg-amber-200 text-amber-800 px-1 rounded">Public Only</span>
                </div>
                <div className="text-[11px] text-amber-700 truncate">intern@cloudshield.internal</div>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-slate-600">
          Advanced Cloud Computing — Cloud Security Architecture &amp; Threat Detection
        </div>
      </div>
    </div>
  );
};
