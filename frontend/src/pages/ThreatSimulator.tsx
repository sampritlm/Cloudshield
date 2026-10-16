import React, { useState } from 'react';
import {
  Zap,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowRight,
  RefreshCw,
  Terminal,
  Globe,
  Lock,
  Radio,
  FileCode,
  ShieldCheck,
  Fish
} from 'lucide-react';
import { api } from '../services/api';
import {
  SimulatorScenario,
  ThreatSimulatorResponse
} from '../types';
import { SeverityBadge } from '../components/SeverityBadge';

export const ThreatSimulator: React.FC<{ onNavigateToEvents?: () => void; onNavigateToIncidents?: () => void }> = ({
  onNavigateToEvents,
  onNavigateToIncidents,
}) => {
  const [activeScenario, setActiveScenario] = useState<SimulatorScenario>('FAILED_LOGIN');
  const [customUser, setCustomUser] = useState<string>('');
  const [customIp, setCustomIp] = useState<string>('');
  const [customResource, setCustomResource] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<ThreatSimulatorResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const scenarios = [
    {
      id: 'FAILED_LOGIN' as SimulatorScenario,
      title: '1. Repeated Failed Login',
      badge: 'Brute Force Detection',
      icon: Lock,
      severityHint: 'HIGH (40+ pts)',
      description:
        'Simulates 5 rapid authentication failures against a test user account within the configurable 300s window. Triggers RULE_01_FAILED_LOGIN and evaluates credential abuse.',
      defaultParams: {
        user: 'test.victim@corp.internal',
        ip: '198.51.100.45',
        resource: '/api/v1/auth/login',
      },
    },
    {
      id: 'UNUSUAL_IP' as SimulatorScenario,
      title: '2. Unusual IP Address',
      badge: 'Network Anomaly',
      icon: Globe,
      severityHint: 'LOW/MED (25 pts)',
      description:
        'Generates an API request from an unauthorized source IP outside the configured trusted test perimeter. Triggers RULE_02_UNUSUAL_IP.',
      defaultParams: {
        user: 'analyst.remote@corp.internal',
        ip: '203.0.113.89',
        resource: '/api/v1/dashboard/metrics',
      },
    },
    {
      id: 'UNAUTHORIZED_ACCESS' as SimulatorScenario,
      title: '3. Unauthorized Resource Access',
      badge: 'Privilege Escalation',
      icon: ShieldAlert,
      severityHint: 'MEDIUM (45 pts)',
      description:
        'Simulates an explicit unauthorized request targeting restricted cloud assets (e.g. /api/v1/iam/credentials or /admin/secrets). Triggers RULE_03_UNAUTHORIZED_RESOURCE.',
      defaultParams: {
        user: 'intern.guest@corp.internal',
        ip: '192.168.1.100',
        resource: '/api/v1/iam/credentials',
      },
    },
    {
      id: 'HIGH_REQUEST_FREQUENCY' as SimulatorScenario,
      title: '4. High Request Frequency Burst',
      badge: 'DoS / Scraping Alert',
      icon: Radio,
      severityHint: 'MEDIUM (35 pts)',
      description:
        'Simulates a burst of 35 requests within a 60-second window, exceeding normal baseline rate limits. Triggers RULE_04_REQUEST_BURST.',
      defaultParams: {
        user: 'bot.scraper@external.org',
        ip: '198.51.100.99',
        resource: '/api/v1/export/data',
      },
    },
    {
      id: 'COMBINED_SUSPICIOUS' as SimulatorScenario,
      title: '5. Combined Suspicious Activity',
      badge: 'Multi-Vector Threat',
      icon: Flame,
      severityHint: 'CRITICAL (100 pts)',
      description:
        'Simulates a multi-vector attack combining unusual foreign IP, repeated failed logins, and access to restricted root credentials. Triggers multi-signal correlation and caps risk score at 100.',
      defaultParams: {
        user: 'compromised.admin@corp.internal',
        ip: '185.220.101.5',
        resource: '/admin/secrets',
      },
    },
  ];

  const currentScenarioMeta = scenarios.find((s) => s.id === activeScenario)!;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const resp = await api.generateSimulatorEvent({
        scenario: activeScenario,
        test_user: customUser.trim() || undefined,
        source_ip: customIp.trim() || undefined,
        resource: customResource.trim() || undefined,
      });
      setLastResult(resp);
    } catch (err: any) {
      setErrorMsg(err.message || 'Simulation generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title & Instructions */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 text-brand-700 font-bold text-lg">
            <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
            <span>Interactive Threat Simulator</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 font-mono">
              Simulated/Test Data
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Generate safe, synthetic security events to test CloudShield’s rule-based detection engine,
            risk-scoring algorithms, and automated incident triage pipeline.
          </p>
        </div>

        <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Safe Synthetic Telemetry Only (Zero external impact)</span>
        </div>
      </div>

      {/* Cross-Link Banner to CanIPhish Simulator */}
      <div className="bg-sky-50 border border-sky-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-sky-900">
        <div className="flex items-center gap-2.5">
          <Fish className="w-4 h-4 text-sky-600 shrink-0" />
          <span>
            Looking for Phishing Simulations? Go to <strong>CanIPhish Integration</strong> to simulate <em>payload clicks, credential compromises, email reports, and delivery failures</em>.
          </span>
        </div>
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-100 text-sky-800 border border-sky-200 shrink-0">
          Source: CanIPhish Events
        </span>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 5 Scenario Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {scenarios.map((sc) => {
          const Icon = sc.icon;
          const isSelected = activeScenario === sc.id;
          return (
            <button
              key={sc.id}
              onClick={() => {
                setActiveScenario(sc.id);
                setCustomUser('');
                setCustomIp('');
                setCustomResource('');
              }}
              className={`p-4 rounded-xl text-left border transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-navy-900 text-white border-navy-900 shadow-md ring-2 ring-brand-500'
                  : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`p-2 rounded-lg ${
                      isSelected ? 'bg-white/10 text-sky-400' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {sc.severityHint}
                  </span>
                </div>
                <div className="font-semibold text-xs leading-snug">{sc.title}</div>
              </div>
              <div
                className={`text-[11px] font-mono mt-3 ${
                  isSelected ? 'text-sky-300' : 'text-slate-500'
                }`}
              >
                {sc.badge}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Scenario Configuration & Execution Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Scenario Parameters (7 Columns) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="font-bold text-slate-900 text-base">{currentScenarioMeta.title}</h2>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {currentScenarioMeta.description}
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Target Test User Account
              </label>
              <input
                type="text"
                placeholder={currentScenarioMeta.defaultParams.user}
                value={customUser}
                onChange={(e) => setCustomUser(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <span className="text-[11px] text-slate-600">
                Default: {currentScenarioMeta.defaultParams.user}
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Originating Source IP Address
              </label>
              <input
                type="text"
                placeholder={currentScenarioMeta.defaultParams.ip}
                value={customIp}
                onChange={(e) => setCustomIp(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <span className="text-[11px] text-slate-600">
                Default: {currentScenarioMeta.defaultParams.ip}
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Target API / Cloud Endpoint
              </label>
              <input
                type="text"
                placeholder={currentScenarioMeta.defaultParams.resource}
                value={customResource}
                onChange={(e) => setCustomResource(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <span className="text-[11px] text-slate-600">
                Default: {currentScenarioMeta.defaultParams.resource}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow transition-colors"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Ingesting Synthetic Event into Pipeline...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Execute {currentScenarioMeta.title}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Real-Time Detection Result Output (5 Columns) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="font-bold text-slate-900 text-sm">Detection Engine Output</span>
              {lastResult && (
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {lastResult.execution_mode}
                </span>
              )}
            </div>

            {!lastResult ? (
              <div className="py-16 text-center text-slate-600 flex flex-col items-center gap-3">
                <Terminal className="w-10 h-10 text-slate-400 stroke-1" />
                <p className="text-xs max-w-xs">
                  Select a threat scenario and click generate. Telemetry results, calculated risk
                  score, and incident actions will appear here in real time.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-4 text-xs">
                {/* Status Box */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-[11px] text-slate-500 uppercase font-mono">Generated Event ID</div>
                  <div className="font-mono text-sm font-bold text-slate-900">{lastResult.event_id}</div>
                </div>

                {/* Score & Severity */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-[11px] text-slate-500 uppercase font-mono">Assigned Severity</div>
                    <div className="mt-1">
                      <SeverityBadge severity={lastResult.severity} />
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-[11px] text-slate-500 uppercase font-mono">Calculated Risk Score</div>
                    <div className="text-base font-mono font-bold text-slate-900 mt-0.5">
                      {lastResult.risk_score} / 100
                    </div>
                  </div>
                </div>

                {/* Triggered Rules */}
                <div>
                  <div className="font-semibold text-slate-700 mb-1">Triggered Detection Rules:</div>
                  <div className="flex flex-wrap gap-1">
                    {lastResult.triggered_rules.map((rule, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-mono text-[11px] border border-slate-300"
                      >
                        {rule}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Reasons List */}
                <div>
                  <div className="font-semibold text-slate-700 mb-1">Reasons Flagged:</div>
                  <ul className="space-y-1">
                    {lastResult.detection_reasons.map((reason, idx) => (
                      <li key={idx} className="p-2 rounded bg-amber-50 text-slate-800 border border-amber-200/60 text-[11px]">
                        • {reason}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Incident Result Alert */}
                {lastResult.incident_created && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs">Security Incident Generated!</div>
                      <div className="font-mono text-[11px] text-rose-700">{lastResult.incident_id}</div>
                    </div>
                    {onNavigateToIncidents && (
                      <button
                        onClick={onNavigateToIncidents}
                        className="px-2.5 py-1 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded transition-colors"
                      >
                        View Incident
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {lastResult && onNavigateToEvents && (
            <div className="pt-4 border-t border-slate-100 mt-4">
              <button
                onClick={onNavigateToEvents}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg border border-brand-200 transition-colors"
              >
                <span>Inspect in Security Events Table</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
