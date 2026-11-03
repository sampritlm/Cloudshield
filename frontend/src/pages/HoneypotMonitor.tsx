import React, { useState, useEffect } from 'react';
import {
  Target,
  ShieldAlert,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Play,
  Terminal,
  RefreshCw,
  ExternalLink,
  Lock,
  Globe,
  Radio,
  FileCode,
  Zap,
  Info,
  Activity,
  Layers,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { HoneypotStatusResponse, HoneypotDecoyInfo, SecurityEvent } from '../types';

export const HoneypotMonitor: React.FC<{ onNavigateToIncidents?: () => void }> = ({
  onNavigateToIncidents,
}) => {
  const [status, setStatus] = useState<HoneypotStatusResponse | null>(null);
  const [recentEvents, setRecentEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const [data, eventsRes] = await Promise.all([
        api.getHoneypotStatus(),
        api.getEvents({ limit: 50, event_type: 'HONEYPOT_TRIGGER' })
      ]);
      setStatus(data);
      const items = (eventsRes as any)?.items || (Array.isArray(eventsRes) ? eventsRes : []);
      setRecentEvents(items);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch honeypot telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleTriggerTest = async (decoyId: string) => {
    setTriggeringId(decoyId);
    setTestResult(null);
    try {
      const res = await api.triggerTestHoneypot({
        decoy_id: decoyId,
        source_ip: '198.51.100.77',
        simulated_scanner: 'AutomatedRecon/v4.2 (DarkNet Scanner)',
      });
      setTestResult(res);
      await fetchStatus();
    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setTriggeringId(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                Honeypot Deception Monitor
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                  MITRE D3FEND Active Defense
                </span>
              </h1>
              <p className="text-sm text-slate-600 mt-0.5">
                Real-time tracking of portal trap logins, canary lures, and attacker fingerprinting. 0% False Positive rate.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Telemetry
          </button>
          {onNavigateToIncidents && (
            <button
              onClick={onNavigateToIncidents}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition shadow-sm"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              View Incidents
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg border border-purple-100">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Decoy Traps</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              {status?.total_traps_active ?? 6}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Deception Perimeter
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-lg border border-rose-100">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Trap Attempts</div>
            <div className="text-2xl font-bold text-rose-600 mt-0.5">
              {status?.total_hits_recorded ?? 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Including Portal &amp; Lures</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Trapped Attacker IPs</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              {status?.trapped_ips_count ?? 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Fingerprinted &amp; Isolated</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Penalty Points</div>
            <div className="text-2xl font-bold text-emerald-700 mt-0.5">+85–90 Pts</div>
            <div className="text-[11px] text-purple-700 font-semibold mt-0.5">Instant CRITICAL Severity</div>
          </div>
        </div>
      </div>

      {/* Test Result Banner */}
      {testResult && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl flex items-start justify-between gap-3 animate-fadeIn">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-bold text-purple-900">
                Honeypot Trap Successfully Triggered &amp; Forensics Ingested!
              </div>
              <div className="text-xs text-purple-700 mt-0.5">
                Event: <span className="font-mono font-semibold">{testResult.event_id}</span> | Incident:{' '}
                <span className="font-mono font-semibold">{testResult.incident_id || 'Auto-Created'}</span> | Risk Score:{' '}
                <span className="font-bold text-rose-700">{testResult.risk_score} (CRITICAL)</span>
              </div>
            </div>
          </div>
          {onNavigateToIncidents && (
            <button
              onClick={onNavigateToIncidents}
              className="px-3 py-1 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 transition"
            >
              Investigate in Incident SOC →
            </button>
          )}
        </div>
      )}

      {/* Attacker IP Summary Table & Recent Attempts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attacker IP & Attempts Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-purple-600" />
              <h2 className="text-sm font-bold text-slate-800">
                Attacker IP Summary &amp; Targeted Decoy Paths
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {recentEvents.length} Recent Ingestions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Attacker IP</th>
                  <th className="py-2.5 px-4">Targeted Resource Path</th>
                  <th className="py-2.5 px-4">Action Captured</th>
                  <th className="py-2.5 px-4">Severity / Score</th>
                  <th className="py-2.5 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentEvents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No live honeypot probe captured yet. Try auto-filling the trap pass in the login portal or clicking a test button below!
                    </td>
                  </tr>
                ) : (
                  recentEvents.map((evt) => (
                    <tr key={evt.event_id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-rose-700">
                        {evt.source_ip}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-800 font-semibold max-w-[200px] truncate" title={evt.resource}>
                        {evt.resource}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-purple-100 text-purple-800 font-semibold border border-purple-200">
                          {evt.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-rose-600">
                        CRITICAL ({evt.risk_score} pts)
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500 font-mono text-[11px]">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Active Decoy Traps Catalog */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-purple-600" />
                Decoy Trap Tripwires
              </h3>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-bold">
                {status?.decoys?.length ?? 6} Active
              </span>
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {status?.decoys?.map((decoy) => (
                <div
                  key={decoy.id}
                  className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-purple-300 transition flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-xs text-slate-900 truncate">
                      {decoy.name}
                    </div>
                    <div className="font-mono text-[10px] text-purple-700 font-bold truncate">
                      {decoy.endpoint}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Hits: <strong className="text-slate-800">{decoy.total_hits}</strong>
                    </div>
                  </div>

                  <button
                    onClick={() => handleTriggerTest(decoy.id)}
                    disabled={triggeringId === decoy.id}
                    className="shrink-0 p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded text-[11px] font-bold flex items-center gap-1 transition"
                    title="Simulate decoy probe"
                  >
                    <Play className={`w-3 h-3 ${triggeringId === decoy.id ? 'animate-spin' : ''}`} />
                    Test
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="bg-purple-900 text-purple-100 p-4 rounded-xl text-xs space-y-2 shadow">
            <div className="font-bold flex items-center gap-1.5 text-purple-200">
              <Info className="w-4 h-4 text-purple-300" />
              Automated Route Deflection
            </div>
            <p className="text-[11px] text-purple-200/90 leading-relaxed">
              When an attacker logs in with <code className="bg-purple-950 px-1 py-0.5 rounded text-amber-300">admin-trap@cloudshield.internal</code>, they are diverted into the Decoy Sandbox Node (100% isolated), while the Real SOC receives the CRITICAL incident with attacker forensics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

