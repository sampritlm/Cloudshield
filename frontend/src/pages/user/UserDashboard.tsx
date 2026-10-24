import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Award,
  AlertTriangle,
  Mail,
  ExternalLink,
  BookOpen,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  TrendingUp,
  Activity,
  RefreshCw,
  Info,
  KeyRound,
  Check,
  ChevronRight,
  Layers,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { api } from '../../services/api';
import { UserDashboardSummary } from '../../types';

interface Props {
  onNavigateTab?: (tab: string) => void;
}

export const UserDashboard: React.FC<Props> = ({ onNavigateTab }) => {
  const [data, setData] = useState<UserDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboard = async (silent: boolean = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await api.getUserDashboard();
      setData(res);
    } catch (err) {
      console.error('Failed to load user dashboard data:', err);
    } finally {
      if (!silent) setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();

    // Live background polling every 3 seconds
    const interval = setInterval(() => {
      fetchDashboard(true);
    }, 3000);

    const handleUpdate = () => fetchDashboard(true);
    window.addEventListener('cloudshield:notification-update', handleUpdate);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('cloudshield_telemetry');
      bc.onmessage = () => fetchDashboard(true);
    } catch (e) {}

    return () => {
      clearInterval(interval);
      window.removeEventListener('cloudshield:notification-update', handleUpdate);
      if (bc) bc.close();
    };
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchDashboard(false);
  };

  if (isLoading || !data) {
    return (
      <div className="p-8 min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-sky-600" />
        <span className="text-xs font-semibold text-slate-500 font-mono">
          Loading Personal Security Dashboard...
        </span>
      </div>
    );
  }

  const isHighAwareness = data.awareness_score >= 80;
  const isModerate = data.awareness_score >= 50 && data.awareness_score < 80;

  const performancePoints = data.performance_over_time || [
    {
      timestamp: new Date().toISOString(),
      date: 'Baseline',
      score: data.awareness_score,
      campaign: 'Baseline Evaluation',
      outcome: `${data.awareness_score} pts`
    }
  ];

  const latestSims = data.latest_simulations || [];
  const outcomeTips = data.outcome_based_tips || [];
  const trainingProgress = data.training_progress;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 1. Header Banner & Context */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
            <span>Employee Security Portal • Connected to CanIPhish & AWS</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            My Security Overview
          </h1>
          <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
            Welcome back, <strong className="text-slate-900 font-bold">{data.user_name}</strong>. Review your individual phishing simulation record, track your security awareness progress over time, and master vigilance tips tailored directly to your test outcomes.
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Score Gauge Card */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex items-center gap-4 shrink-0 shadow-sm">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-200"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={isHighAwareness ? 'text-emerald-500' : isModerate ? 'text-amber-500' : 'text-rose-500'}
                  strokeDasharray={`${data.awareness_score}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-xl font-black font-mono leading-none text-slate-900">{data.awareness_score}</span>
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold mt-0.5">/ 100</span>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Awareness Rating
              </div>
              <div className="text-sm font-black text-slate-900 mt-0.5">
                {data.risk_category_title}
              </div>
              <div className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-600" />
                <span>Deterministic scoring rules</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 shadow-sm transition-all self-start sm:self-center"
            title="Refresh Personal Security Telemetry"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Active Threat Penalty Notice (if user has active violations) */}
      {data.threat_risk_score && data.threat_risk_score > 0 ? (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 text-rose-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-rose-900">
                Security Policy Infractions Detected &bull; +{data.threat_risk_score} Risk Points Added
              </div>
              <div className="text-[11px] text-rose-700 mt-0.5">
                Unauthorized access to restricted cloud assets was detected on your account and forwarded to the SOC Administrator.
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab?.('notifications')}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors shrink-0"
          >
            View Threat Notifications
          </button>
        </div>
      ) : null}

      {/* Downloadable Security Resources Featured Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border border-indigo-900/50">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase text-indigo-300 font-bold tracking-wider">
              Downloadable File Library &bull; Certified Protocols
            </div>
            <div className="text-sm font-bold text-white mt-0.5">
              Access 12 Security Guides, Checklists, Policies &amp; Playbooks
            </div>
            <div className="text-[11px] text-slate-300">
              Download real PDF guides, DOCX checklists, PPTX training decks, and CSV audits for offline reference.
            </div>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab?.('resources')}
          className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-xs font-bold transition-all shadow flex items-center gap-1.5 self-start md:self-auto shrink-0"
        >
          <span>Open Resources Library</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Four Core Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Simulations Received */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Simulations Received</span>
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                <Mail className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black font-mono text-slate-900 mt-2">
              {data.simulations_received}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-100">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 font-mono">
              CanIPhish
            </span>
            <span>Assigned simulation tests</span>
          </div>
        </div>

        {/* Card 2: Links Clicked */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Links Clicked</span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black font-mono text-rose-600 mt-2">
              {data.links_clicked}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-100">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
              data.links_clicked === 0
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {data.links_clicked === 0 ? 'CLEAN' : '-25 PTS EA'}
            </span>
            <span>{data.links_clicked === 0 ? 'Zero unverified clicks' : 'Penalty applied to score'}</span>
          </div>
        </div>

        {/* Card 3: Emails Reported */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Emails Reported</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black font-mono text-emerald-600 mt-2">
              {data.emails_reported}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-100">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
              +15 PTS EA
            </span>
            <span>Sent to SOC via EventBridge</span>
          </div>
        </div>

        {/* Card 4: Awareness Progress */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Awareness Progress</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black font-mono text-indigo-600">{data.awareness_score}%</span>
              <span className="text-xs text-slate-500 font-semibold">{data.risk_category} RISK</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2.5">
              <div
                className={`h-full transition-all duration-500 ${
                  isHighAwareness ? 'bg-emerald-500' : isModerate ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${data.awareness_score}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-100">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
              GOAL: 80%+
            </span>
            <span>{isHighAwareness ? 'Exceeding target standard' : 'Training lessons will boost score'}</span>
          </div>
        </div>
      </div>

      {/* 3. Personal Performance Over Time Chart */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-600" />
              <h2 className="font-bold text-slate-900 text-sm">Personal Performance Over Time</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Historical security awareness score progression across personal simulation tests
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-sky-700">
              <span className="w-2.5 h-2.5 rounded-sm bg-sky-600" />
              Your Score Trajectory
            </span>
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="w-4 h-0 border-t-2 border-dashed border-emerald-500" />
              80 pts Target Threshold
            </span>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={performancePoints} margin={{ top: 12, right: 16, left: -20, bottom: 4 }}>
              <defs>
                <linearGradient id="userScoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                dy={4}
                tickFormatter={(val) => {
                  if (!val) return '';
                  if (typeof val === 'string' && val.toLowerCase().includes('base')) return 'Baseline';
                  try {
                    const d = new Date(val);
                    if (!isNaN(d.getTime())) {
                      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                    }
                  } catch {
                    // fallback
                  }
                  return val;
                }}
              />
              <YAxis
                domain={[0, 100]}
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                allowDecimals={false}
              />
              <ReferenceLine
                y={80}
                stroke="#10b981"
                strokeDasharray="4 4"
                strokeWidth={1.75}
                label={{
                  value: '80 pts Target Threshold',
                  fill: '#059669',
                  position: 'insideTopRight',
                  fontSize: 10,
                  fontWeight: 600,
                  offset: 8
                }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    const isTargetMet = item.score >= 80;
                    const dateDisplay = (() => {
                      try {
                        const d = new Date(item.timestamp || item.date);
                        if (!isNaN(d.getTime())) {
                          return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                        }
                      } catch {
                        // fallback
                      }
                      return item.date;
                    })();

                    return (
                      <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xl border border-slate-800 text-xs space-y-1.5 min-w-[240px]">
                        <div className="font-bold text-sky-400 text-sm leading-snug">{item.campaign}</div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                          <span>{dateDisplay}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isTargetMet ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}>
                            {isTargetMet ? 'Target Met (≥80)' : 'Below Target (<80)'}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                          <span className="text-slate-300">Awareness Score:</span>
                          <span className="font-mono font-black text-sm text-white">
                            {item.score} <span className="text-slate-400 text-xs font-normal">/ 100</span>
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 flex items-center justify-between pt-0.5">
                          <span className="text-slate-400">Simulation Outcome:</span>
                          <span className={`font-semibold ${
                            item.outcome && item.outcome.includes('+')
                              ? 'text-emerald-400'
                              : item.outcome && item.outcome.includes('-')
                              ? 'text-rose-400'
                              : 'text-sky-300'
                          }`}>
                            {item.outcome}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="score"
                name="Awareness Score"
                stroke="#0284c7"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#userScoreGrad)"
                dot={{
                  r: 4.5,
                  fill: '#ffffff',
                  stroke: '#0284c7',
                  strokeWidth: 2.5
                }}
                activeDot={{
                  r: 7,
                  fill: '#0284c7',
                  stroke: '#bae6fd',
                  strokeWidth: 3
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Latest Simulation Results & Training Progress Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latest Simulation Results Table (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-sky-600" />
                <h2 className="text-sm font-bold text-slate-900">Latest Simulation Results</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Actual CanIPhish campaigns delivered to your mailbox with recorded interactions
              </p>
            </div>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('simulations')}
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1 transition-colors"
              >
                <span>All Simulations</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Campaign Name</th>
                  <th className="py-3 px-4">Delivered</th>
                  <th className="py-3 px-4">Interaction</th>
                  <th className="py-3 px-4 text-center">Risk Score</th>
                  <th className="py-3 px-4">Outcome Explanation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {latestSims.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-500">
                      No simulations recorded for this account yet.
                    </td>
                  </tr>
                ) : (
                  latestSims.map((sim) => (
                    <tr key={sim.simulation_id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{sim.campaign_name}</div>
                        <div className="font-mono text-[10px] text-slate-400">{sim.simulation_id}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap font-mono text-[11px]">
                        {new Date(sim.received_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {sim.email_reported ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Reported (+15)
                          </span>
                        ) : sim.link_clicked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            Link Clicked (-25)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            Delivered
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                        {sim.risk_score}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-[280px]">
                        <div className="truncate" title={sim.explanation}>
                          {sim.explanation}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Training Progress Widget (1 Column) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-900">Training Progress</h2>
              </div>
              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab('learning')}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
                >
                  <span>All Lessons</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="mt-4 p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-indigo-950">Modules Completion</span>
                <span className="font-mono font-bold text-indigo-700">
                  {trainingProgress?.completed_count || 0} of {trainingProgress?.total_lessons || 4} Completed
                </span>
              </div>
              <div className="w-full bg-white h-2 rounded-full overflow-hidden border border-indigo-100">
                <div
                  className="bg-indigo-600 h-full transition-all duration-500 rounded-full"
                  style={{ width: `${trainingProgress?.completion_percentage || 0}%` }}
                />
              </div>
              <div className="text-[11px] text-indigo-700 text-right font-mono font-semibold">
                {trainingProgress?.completion_percentage || 0}% Complete
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Assigned Curriculum:
              </div>
              {trainingProgress?.modules?.map((mod) => (
                <div
                  key={mod.id}
                  className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] ${
                      mod.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {mod.completed ? <Check className="w-3 h-3" /> : '•'}
                    </span>
                    <span className={`truncate font-medium ${mod.completed ? 'text-slate-800 line-through' : 'text-slate-900'}`}>
                      {mod.title}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 shrink-0 ml-2">
                    {mod.duration}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('learning')}
              className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>
                {trainingProgress?.next_recommended ? `Continue: ${trainingProgress.next_recommended.title.slice(0, 22)}...` : 'Review Learning Modules'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* 5. Security Tips Based on Simulation Outcomes */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold text-slate-900">Security Tips Based on Simulation Outcomes</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Personalized guidance derived directly from your past phishing test responses
            </p>
          </div>
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('resources')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
            >
              <span>View Resources &amp; Guides</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {outcomeTips.map((tip) => (
            <div
              key={tip.id}
              className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 text-xs ${
                tip.severity === 'HIGH'
                  ? 'bg-rose-50/50 border-rose-200 text-slate-800'
                  : tip.severity === 'MEDIUM'
                  ? 'bg-amber-50/50 border-amber-200 text-slate-800'
                  : 'bg-emerald-50/40 border-emerald-200 text-slate-800'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md font-mono bg-white border border-slate-200 text-slate-700">
                    {tip.category}
                  </span>
                  {tip.severity === 'HIGH' && (
                    <span className="text-[10px] font-bold text-rose-600 font-mono">PRIORITY TIP</span>
                  )}
                </div>
                <div className="font-bold text-slate-900 text-xs pt-1">
                  {tip.title}
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {tip.tip}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200/60 flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                <Info className="w-3 h-3 text-sky-600" />
                <span>Generated from personal simulation results</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
