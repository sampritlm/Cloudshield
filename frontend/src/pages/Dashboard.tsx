import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Flame,
  CheckCircle2,
  FolderOpen,
  Activity,
  Clock,
  ArrowUpRight,
  RefreshCw,
  Database,
  Cloud,
  Server,
  Cpu,
  Layers,
  Zap,
  Inbox,
  Bell,
  FileText,
  Radio,
  ExternalLink
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LabelList
} from 'recharts';
import { api } from '../services/api';
import {
  DashboardSummary,
  TimeSeriesPoint,
  DistributionItem,
  SecurityEvent,
  Incident
} from '../types';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { EventDetailModal } from '../components/EventDetailModal';
import { IncidentDetailModal } from '../components/IncidentDetailModal';

interface DashboardProps {
  onNavigateTab?: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateTab }) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([]);
  const [riskDist, setRiskDist] = useState<DistributionItem[]>([]);
  const [threatDist, setThreatDist] = useState<DistributionItem[]>([]);
  const [recentEvents, setRecentEvents] = useState<SecurityEvent[]>([]);
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([]);
  const [caniphishStatus, setCaniphishStatus] = useState<any>(null);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [systemServices, setSystemServices] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const [isLiveActive, setIsLiveActive] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  const fetchDashboardData = async (isBackground: boolean = false) => {
    if (!isBackground) {
      // only show spinner on explicit user refresh if initial load already done
    }
    try {
      const [sumData, tsData, rData, tData, evData, incData, cData, aData, hData] = await Promise.allSettled([
        api.getDashboardSummary(),
        api.getActivityTimeseries(),
        api.getRiskDistribution(),
        api.getThreatDistribution(),
        api.getRecentEvents(),
        api.getRecentIncidents(),
        api.getCanIPhishStatus(),
        api.getAlerts(),
        api.getSystemHealth(),
      ]);

      if (sumData.status === 'fulfilled') setSummary(sumData.value);
      if (tsData.status === 'fulfilled') setTimeSeries(tsData.value);
      if (rData.status === 'fulfilled') setRiskDist(rData.value);
      if (tData.status === 'fulfilled') setThreatDist(tData.value);
      if (evData.status === 'fulfilled') setRecentEvents(evData.value);
      if (incData.status === 'fulfilled') setRecentIncidents(incData.value);
      if (cData.status === 'fulfilled') setCaniphishStatus(cData.value);
      if (aData.status === 'fulfilled') setRecentAlerts(aData.value || []);
      if (hData.status === 'fulfilled') setSystemServices(hData.value?.services || []);
      setLastSyncTime(new Date());
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(false);
  }, []);

  // Real-time telemetry continuous polling
  useEffect(() => {
    if (!isLiveActive) return;
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 2500);
    return () => clearInterval(interval);
  }, [isLiveActive]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchDashboardData(false);
  };

  const handleStatusUpdate = async (incidentId: string, newStatus: any, note?: string) => {
    await api.updateIncidentStatus(incidentId, newStatus, note);
    fetchDashboardData(true);
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-sky-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Aggregating Cloud Security Telemetry...</p>
        </div>
      </div>
    );
  }

  const highCriticalCount = (summary?.high_risk_incidents || 0) + (summary?.critical_incidents || 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Security Operations Center (SOC) Overview
          </h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-600">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-700">Active Storage:</span>
            <span className="font-mono text-sky-700 font-medium">{summary?.storage_type}</span>
            <span className="text-slate-300">•</span>
            {summary?.last_alert_time ? (
              <span className="flex items-center gap-1 text-amber-600">
                <Clock className="w-3.5 h-3.5" />
                <span>Last Critical Alert: {new Date(summary.last_alert_time).toLocaleTimeString()}</span>
              </span>
            ) : (
              <span className="text-slate-600">Continuous telemetry monitoring active</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* 4 Primary Operational Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Security Events */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Security Events</span>
            <Activity className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-3xl font-black font-mono text-slate-900">{summary?.total_events ?? 0}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-2">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 font-mono">
              DynamoDB
            </span>
            <span>Live event stream</span>
          </div>
        </div>

        {/* 2. High/Critical Events */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">High / Critical Events</span>
            <Flame className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-3xl font-black font-mono text-rose-600">{highCriticalCount}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-2">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 font-mono">
              AWS Lambda
            </span>
            <span>Risk score &gt; 60 pts</span>
          </div>
        </div>

        {/* 3. Open Incidents */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Open Incidents</span>
            <FolderOpen className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-black font-mono text-amber-600">{summary?.open_incidents ?? 0}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-2">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 font-mono">
              Amazon SQS
            </span>
            <span>Priority triage queue</span>
          </div>
        </div>

        {/* 4. CanIPhish Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">CanIPhish Status</span>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1 truncate">
            {caniphishStatus?.connection_status || 'CONNECTED'}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-2">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
              Webhook
            </span>
            <span>API v3 synchronization</span>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Threat Activity Over Time (2 Columns) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-slate-900 text-sm">Security Events & Threat Activity Over Time</h2>
              <p className="text-xs text-slate-600">Hourly event volume compared with flagged threats</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-brand-700">
                <span className="w-2.5 h-2.5 rounded-sm bg-brand-600" />
                Events
              </span>
              <span className="flex items-center gap-1.5 text-rose-600">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                Threats
              </span>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2665a5" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2665a5" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorThreats" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="timestamp"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => val.slice(-5)}
                />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="events_count"
                  name="Total Events"
                  stroke="#2665a5"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorEvents)"
                />
                <Area
                  type="monotone"
                  dataKey="threats_count"
                  name="Detected Threats"
                  stroke="#dc2626"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorThreats)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk-Level Distribution (1 Column) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="font-semibold text-slate-900 text-sm">Risk-Level Distribution</h2>
            <p className="text-xs text-slate-600">Events categorized by threat severity tier</p>
          </div>

          <div className="h-52 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskDist}
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {riskDist.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
            {riskDist.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-600 font-medium">{item.name}:</span>
                <span className="font-mono font-bold text-slate-900 ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Threat-Type Distribution Horizontal Bar Chart */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-slate-900 text-sm">Threat-Type Distribution</h2>
            <p className="text-xs text-slate-600">Incidents broken down by detection classification</p>
          </div>
          <span className="text-xs font-mono text-slate-500 font-medium">Incident Counts</span>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={threatDist}
              margin={{ top: 10, right: 40, left: 20, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis
                type="number"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#334155"
                fontSize={12}
                fontWeight={500}
                tickLine={false}
                width={270}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="value" name="Incidents" radius={[0, 6, 6, 0]} barSize={22}>
                {threatDist.map((entry, index) => (
                  <Cell key={`bar-${index}`} fill={entry.color || '#1e3e62'} />
                ))}
                <LabelList
                  dataKey="value"
                  position="right"
                  fill="#0f172a"
                  fontSize={12}
                  fontWeight={700}
                  offset={10}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Dual Tables Row: Recent Incidents & Recent Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Incidents Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900 text-sm">Recent Security Incidents</h2>
              <p className="text-xs text-slate-600">Active threats flagged by detection engine</p>
            </div>
            <span className="text-xs font-mono text-slate-600">{recentIncidents.length} shown</span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Incident / Threat</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">User & IP</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-600">
                      No security incidents generated yet.
                    </td>
                  </tr>
                ) : (
                  recentIncidents.map((inc) => (
                    <tr key={inc.incident_id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 truncate max-w-[180px]">{inc.threat_type}</div>
                        <div className="font-mono text-[11px] text-slate-600">{inc.incident_id}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <SeverityBadge severity={inc.severity} size="sm" />
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="truncate max-w-[140px] text-slate-800">{inc.test_user}</div>
                        <div className="font-mono text-[11px] text-slate-600">{inc.source_ip}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={inc.status} size="sm" />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => setSelectedIncident(inc)}
                          className="px-2.5 py-1 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded border border-brand-200"
                        >
                          Triage
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Security Events Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900 text-sm">Recent Ingested Security Events</h2>
              <p className="text-xs text-slate-600">Live stream processed by EventBridge & Detection Engine</p>
            </div>
            <span className="text-xs font-mono text-slate-600">{recentEvents.length} shown</span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Event ID</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Score</th>
                  <th className="py-2.5 px-3 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentEvents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-600">
                      No security events recorded yet.
                    </td>
                  </tr>
                ) : (
                  recentEvents.map((evt) => (
                    <tr key={evt.event_id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">
                        {evt.event_id}
                        <div className="text-[10px] text-slate-600">{new Date(evt.timestamp).toLocaleTimeString()}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-900 truncate max-w-[160px]">{evt.action}</div>
                        <div className="text-[11px] text-slate-600 truncate max-w-[160px]">{evt.resource}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <SeverityBadge severity={evt.severity} size="sm" />
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                        {evt.risk_score}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => setSelectedEvent(evt)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* AWS Processing Health and Recent Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AWS Processing Health (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-sky-600" />
                <h2 className="text-sm font-bold text-slate-900">AWS Processing Health Pipeline</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Connected service responsibilities mapped to CloudShield architecture
              </p>
            </div>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('system')}
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1 transition-colors"
              >
                <span>Full AWS Monitoring</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* EC2 */}
            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Cpu className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-900">Amazon EC2</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Web Application & SOC Admin Dashboard host</div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                ACTIVE
              </span>
            </div>

            {/* DynamoDB */}
            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Database className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-900">Amazon DynamoDB</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Security events & incident persistence tables</div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                OPERATIONAL
              </span>
            </div>

            {/* Lambda */}
            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Zap className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-900">AWS Lambda</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Deterministic threat detection & risk scoring</div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                OPERATIONAL
              </span>
            </div>

            {/* EventBridge */}
            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Layers className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-900">Amazon EventBridge</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Real-time security event routing & bus dispatch</div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                CONNECTED
              </span>
            </div>

            {/* SQS */}
            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Inbox className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-900">Amazon SQS</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">High/Critical incident prioritization & triage queue</div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                OPERATIONAL
              </span>
            </div>

            {/* SNS */}
            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Bell className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-900">Amazon SNS</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Administrator urgent alert notification topic</div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                SUBSCRIBED
              </span>
            </div>

            {/* S3 */}
            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <FileText className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-900">Amazon S3</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Security compliance report artifact store & archives</div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                READY
              </span>
            </div>

            {/* CloudWatch & CloudTrail */}
            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-900">CloudWatch & CloudTrail</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">System health telemetry metrics & audit logging</div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                LOGGING
              </span>
            </div>
          </div>
        </div>

        {/* Recent Alerts (Dispatched through SNS) (1 Column) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-rose-600" />
                <h2 className="text-sm font-bold text-slate-900">Recent Administrator Alerts</h2>
              </div>
              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab('alerts')}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors"
                >
                  <span>All Alerts</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 mb-3">
              Real-time threat notifications dispatched via Amazon SNS
            </p>

            <div className="space-y-2.5">
              {recentAlerts.length > 0 ? (
                recentAlerts.slice(0, 3).map((alert: any) => (
                  <div
                    key={alert.alert_id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-slate-900 truncate max-w-[200px]">
                        {alert.subject || alert.title || 'SOC Notification'}
                      </div>
                      <SeverityBadge severity={alert.severity || 'HIGH'} size="sm" />
                    </div>
                    <div className="text-[11px] text-slate-600 line-clamp-2">
                      {alert.message}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between pt-1">
                      <span>{new Date(alert.dispatched_at || alert.timestamp).toLocaleTimeString()}</span>
                      <span className="truncate max-w-[140px] text-slate-500">{alert.topic_arn ? 'Amazon SNS' : 'SNS Simulator'}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                  <Bell className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                  No active urgent alerts. System telemetry normal.
                </div>
              )}
            </div>
          </div>

          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('alerts')}
              className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Manage Notification Subscriptions</span>
            </button>
          )}
        </div>
      </div>

      {/* Detail Modals */}
      <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      <IncidentDetailModal
        incident={selectedIncident}
        onClose={() => setSelectedIncident(null)}
        onUpdateStatus={handleStatusUpdate}
      />
    </div>
  );
};
