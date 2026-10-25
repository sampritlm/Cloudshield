import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email address and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await login(email.trim(), password);
    } catch (err: any) {
      const msg = err.message || 'Authentication failed. Please check credentials.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };


  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage(null);
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
          
          {/* Clean Error Message */}
          {errorMessage && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMessage.split('.')[0] || 'Invalid credentials. Please verify your email and password.'}</span>
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
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-900 focus:border-navy-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
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
